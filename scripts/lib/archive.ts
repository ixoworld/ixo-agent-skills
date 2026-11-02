import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { importer } from 'ipfs-unixfs-importer';
import { MemoryBlockstore } from 'blockstore-core/memory';

export type CapsuleFile = { path: string; content: Buffer; mode: 0o644 | 0o755 };
export const maxArchiveBytes = 10 * 1024 * 1024;
const maxBytes = 100 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
export const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export function validateArchivePath(path: string): void {
  if (Buffer.byteLength(path) > 100 || path.includes('..') || path.startsWith('/') ||
      /[\\\x00-\x1f\x7f]/.test(path) || path.split('/').some(part => !part || part === '.')) {
    throw new Error(`Unsupported archive path: ${JSON.stringify(path)}`);
  }
}

export function isMetadataFile(path: string): boolean {
  return path.split('/').some(part => part.startsWith('._') || part === 'PaxHeader' ||
    part.startsWith('@PaxHeader') || part.startsWith('@LongLink'));
}

export function createArchive(files: readonly CapsuleFile[]): Buffer {
  const chunks: Buffer[] = [];
  for (const file of [...files].sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)))) {
    validateArchivePath(file.path);
    const header = Buffer.alloc(512);
    header.write(file.path, 0, 100, 'utf8');
    const octal = (offset: number, width: number, value: number) => {
      const encoded = value.toString(8).padStart(width - 1, '0');
      if (encoded.length >= width) throw new Error('Tar number exceeds supported field size');
      header.write(`${encoded}\0`, offset, width, 'ascii');
    };
    octal(100, 8, file.mode);
    octal(108, 8, 0);
    octal(116, 8, 0);
    octal(124, 12, file.content.length);
    octal(136, 12, 0);
    header.fill(32, 148, 156);
    header[156] = 48;
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    const checksum = header.reduce((sum, value) => sum + value, 0);
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
    chunks.push(header, file.content, Buffer.alloc((512 - file.content.length % 512) % 512));
  }
  chunks.push(Buffer.alloc(1024));
  const tar = Buffer.concat(chunks);
  if (tar.length > maxBytes) throw new Error('Archive exceeds registry decompressed size limit');
  const gzip = gzipSync(tar, { level: 9 });
  gzip[9] = 3;
  if (gzip.length > maxArchiveBytes) throw new Error('Archive exceeds registry compressed size limit');
  if (tar.length / gzip.length > 50) throw new Error('Archive exceeds registry compression ratio limit');
  return gzip;
}

export function extractArchive(gzip: Uint8Array): CapsuleFile[] {
  if (gzip.length > maxArchiveBytes) throw new Error('Archive exceeds registry compressed size limit');
  const tar = gunzipSync(gzip, { maxOutputLength: maxBytes });
  if (tar.length / gzip.length > 50) throw new Error('Archive exceeds registry compression ratio limit');
  const files: CapsuleFile[] = [];
  const seen = new Set<string>();
  let offset = 0;
  const field = (header: Buffer, start: number, length: number) => {
    const bytes = header.subarray(start, start + length);
    const nul = bytes.indexOf(0);
    return decoder.decode(nul < 0 ? bytes : bytes.subarray(0, nul));
  };
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(value => value === 0)) {
      if (tar.length - offset < 1024 || !tar.subarray(offset).every(value => value === 0)) {
        throw new Error('Invalid tar end marker');
      }
      return files;
    }
    const path = field(header, 0, 100);
    validateArchivePath(path);
    if (seen.has(path)) throw new Error('Duplicate archive path');
    seen.add(path);
    if (header[156] !== 48 && header[156] !== 0) throw new Error('Only regular tar files are supported');
    if (field(header, 345, 155)) throw new Error('Tar prefix is unsupported by the registry');
    const checksum = Number.parseInt(field(header, 148, 8).trim(), 8);
    const computed = header.reduce((sum, value, index) => sum + (index >= 148 && index < 156 ? 32 : value), 0);
    if (checksum !== computed) throw new Error('Invalid tar checksum');
    const sizeText = field(header, 124, 12).trim();
    if (!/^[0-7]+$/.test(sizeText)) throw new Error('Invalid tar size');
    const size = Number.parseInt(sizeText, 8);
    const mode = Number.parseInt(field(header, 100, 8).trim(), 8);
    if (mode !== 0o644 && mode !== 0o755) throw new Error('Unsupported regular file mode');
    offset += 512;
    if (offset + size > tar.length) throw new Error('Truncated tar content');
    files.push({ path, content: tar.subarray(offset, offset + size), mode });
    offset += Math.ceil(size / 512) * 512;
  }
  throw new Error('Missing tar end marker');
}

export async function computeCapsuleCID(files: readonly CapsuleFile[]): Promise<string> {
  const blockstore = new MemoryBlockstore();
  const candidates = files.filter(file => !isMetadataFile(file.path) && file.content.length > 0)
    .map(file => ({ path: file.path, content: file.content }));
  let root: string | undefined;
  for await (const entry of importer(candidates, blockstore, {
    cidVersion: 0, rawLeaves: false, wrapWithDirectory: false,
  })) {
    if (entry.path && !entry.path.includes('/')) root = entry.cid.toString();
  }
  if (!root) throw new Error('Archive has no capsule root');
  return root;
}
