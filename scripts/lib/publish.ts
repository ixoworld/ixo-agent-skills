import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { z } from 'zod';
import { buildReceiptSchema } from './build.js';
import { computeCapsuleCID, extractArchive, maxArchiveBytes, sha256 } from './archive.js';
import { validateFiles } from './validate.js';

const responseSchema = z.object({ cid: z.string().regex(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/) });

async function readResponse(response: Response, limit: number): Promise<Buffer> {
  if (Number(response.headers.get('Content-Length')) > limit) throw new Error('Response exceeds allowed size');
  if (!response.body) throw new Error('Response has no body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return Buffer.concat(chunks);
      size += chunk.value.length;
      if (size > limit) throw new Error('Response exceeds allowed size');
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
}

export async function publishCapsule(options: {
  receiptPath: string; registry: string; privateRegistry: boolean;
  uploadKey: string | undefined; readKey?: string; request?: typeof fetch;
}): Promise<void> {
  const { receiptPath } = options;
  const uploadKey = options.uploadKey?.trim();
  const readKey = options.readKey?.trim();
  const origin = new URL(options.registry);
  const privateRegistry = options.privateRegistry || origin.hostname === 'private.capsules.skills.ixo.earth';
  if (!uploadKey?.trim()) throw new Error('SKILLS_API_KEY is required before upload');
  if (privateRegistry && (!readKey?.trim() || readKey === uploadKey)) {
    throw new Error('Private publishing requires a distinct SKILLS_READ_API_KEY before upload');
  }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new Error('Registry must be an HTTPS origin without credentials or a path');
  }
  const receipt = buildReceiptSchema.parse(JSON.parse(await readFile(receiptPath, 'utf8')));
  if (receipt.archiveFile !== basename(receipt.archiveFile)) throw new Error('Invalid receipt archive path');
  const archive = await readFile(join(dirname(receiptPath), receipt.archiveFile));
  if (archive.length !== receipt.archiveSize || sha256(archive) !== receipt.archiveSha256) throw new Error('Archive does not match build receipt');
  const files = extractArchive(archive);
  const declaration = validateFiles(files, receipt.skillName);
  if (JSON.stringify(declaration) !== JSON.stringify(receipt.declaration)) throw new Error('Archive declaration does not match receipt');
  if (await computeCapsuleCID(files) !== receipt.expectedCid) throw new Error('Archive CID does not match build receipt');
  const request = options.request ?? fetch;
  const upload = await request(new URL('/capsules', origin), {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${uploadKey}`, 'Content-Type': 'application/gzip' }, body: Uint8Array.from(archive).buffer,
  });
  if (!upload.ok) throw new Error(`Upload failed with HTTP ${upload.status}`);
  const acceptedPath = join(dirname(receiptPath), `${receipt.skillName}.upload-accepted.json`);
  const accepted = { ...receipt, status: 'upload-accepted', registry: origin.origin, uploadedAt: new Date().toISOString(), retrievalVerified: false };
  await writeFile(acceptedPath, `${JSON.stringify(accepted, null, 2)}\n`);
  const { cid } = responseSchema.parse(JSON.parse((await readResponse(upload, 64 * 1024)).toString('utf8')));
  const acceptedWithCid = { ...accepted, serverCid: cid };
  await writeFile(acceptedPath, `${JSON.stringify(acceptedWithCid, null, 2)}\n`);
  if (cid !== receipt.expectedCid) throw new Error('Server CID differs from the uploaded archive CID; upload acceptance is retained');
  const download = await request(new URL(`/capsules/${encodeURIComponent(cid)}`, origin), {
    redirect: 'error', signal: AbortSignal.timeout(60_000),
    headers: readKey ? { Authorization: `Bearer ${readKey}` } : {},
  });
  if (!download.ok) throw new Error(`Upload accepted but retrieval failed with HTTP ${download.status}`);
  const fetched = await readResponse(download, maxArchiveBytes);
  const downloadedFiles = extractArchive(fetched);
  validateFiles(downloadedFiles, receipt.skillName);
  const downloadedCid = await computeCapsuleCID(downloadedFiles);
  const uploadedFiles = new Map(files.map(file => [file.path, file]));
  const completeContentsMatch = downloadedFiles.length === uploadedFiles.size && downloadedFiles.every(file => {
    const uploaded = uploadedFiles.get(file.path);
    return uploaded !== undefined && uploaded.mode === file.mode && uploaded.content.equals(file.content);
  });
  const retrieval = {
    ...acceptedWithCid, status: 'retrieved', retrievalVerified: false,
    retrievedAt: new Date().toISOString(), retrievedArchiveSha256: sha256(fetched), retrievedArchiveSize: fetched.length,
    retrievedCid: downloadedCid, contentIdentityVerified: downloadedCid === cid, completeContentsMatch,
    transportBytesMatch: sha256(fetched) === receipt.archiveSha256 && fetched.length === receipt.archiveSize,
  };
  await writeFile(join(dirname(receiptPath), `${receipt.skillName}.retrieval.json`), `${JSON.stringify(retrieval, null, 2)}\n`);
  if (downloadedCid !== cid || !completeContentsMatch) {
    throw new Error('Upload accepted but retrieved CID or complete file contents and modes differ');
  }
  await writeFile(join(dirname(receiptPath), `${receipt.skillName}.release.json`), `${JSON.stringify({
    ...retrieval, status: 'retrieval-verified', retrievalVerified: true,
  }, null, 2)}\n`);
}
