import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { z } from 'zod';
import { createArchive, computeCapsuleCID, extractArchive, sha256, type CapsuleFile } from './archive.js';
import { capsuleContractSchema } from './skill-contract.js';
import { validateFiles } from './validate.js';

export const buildReceiptSchema = z.strictObject({
  schemaVersion: z.literal(1),
  status: z.literal('unpublished'),
  sourceClaim: z.literal('workflow-reported'),
  repository: z.string().url(),
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  skillPath: z.string().regex(/^skills\/[a-z0-9]+(?:-[a-z0-9]+)*$/),
  skillName: z.string(),
  declaration: capsuleContractSchema,
  archiveFile: z.string(),
  archiveSha256: z.string().regex(/^[0-9a-f]{64}$/),
  archiveSize: z.number().int().positive(),
  expectedCid: z.string().startsWith('Qm'),
  cidAlgorithm: z.literal('registry-unixfs-v0-empty-files-excluded'),
});
export type BuildReceipt = z.infer<typeof buildReceiptSchema>;

export function git(repo: string, args: string[]): Buffer {
  return execFileSync('git', ['-C', repo, ...args], { maxBuffer: 120 * 1024 * 1024 });
}

export function exactCommit(repo: string, commit: string): string {
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('Supply the full exact Git commit SHA, not HEAD or a branch');
  const resolved = git(repo, ['rev-parse', '--verify', `${commit}^{commit}`]).toString().trim();
  if (resolved !== commit) throw new Error('Commit did not resolve exactly');
  return resolved;
}

export function readCommitFiles(repo: string, commit: string, skillName: string): CapsuleFile[] {
  exactCommit(repo, commit);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName)) throw new Error('Invalid skill name');
  const records = new TextDecoder('utf-8', { fatal: true }).decode(git(repo, ['ls-tree', '-r', '-z', commit, '--', `skills/${skillName}/`])).split('\0').filter(Boolean);
  return records.map(record => {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(skills\/.+)$/.exec(record);
    if (!match?.[2] || !match[3]) throw new Error('Only regular Git blobs are supported; symlinks and submodules are rejected');
    return { path: match[3].slice('skills/'.length), content: git(repo, ['cat-file', 'blob', match[2]]), mode: match[1] === '100755' ? 0o755 : 0o644 };
  });
}

export function changedSkills(repo: string, base: string, commit: string): string[] {
  exactCommit(repo, base);
  exactCommit(repo, commit);
  const paths = new TextDecoder('utf-8', { fatal: true }).decode(git(repo, ['diff', '--name-only', '-z', base, commit, '--', 'skills/'])).split('\0').filter(Boolean);
  return [...new Set(paths.map(path => path.split('/')[1]).filter((name): name is string => name !== undefined))].sort();
}

export function allSkills(repo: string, commit: string): string[] {
  exactCommit(repo, commit);
  return git(repo, ['ls-tree', '-z', '--name-only', `${commit}:skills`]).toString('utf8').split('\0').filter(Boolean).sort();
}

export async function buildCapsule(options: { repo: string; commit: string; repository: string; skillName: string; output: string }): Promise<BuildReceipt> {
  const { repo, commit, repository, skillName, output } = options;
  const outputRelative = relative(resolve(repo, 'skills'), resolve(output));
  if (!outputRelative.startsWith('..') && !outputRelative.startsWith('/')) throw new Error('Receipts and archives must be outside skills/');
  const files = readCommitFiles(repo, commit, skillName);
  const declaration = validateFiles(files, skillName);
  const archive = createArchive(files);
  const extracted = extractArchive(archive);
  validateFiles(extracted, skillName);
  const receipt = buildReceiptSchema.parse({
    schemaVersion: 1, status: 'unpublished', sourceClaim: 'workflow-reported', repository, commit,
    skillPath: `skills/${skillName}`, skillName, declaration, archiveFile: `${skillName}.tar.gz`,
    archiveSha256: sha256(archive), archiveSize: archive.length,
    expectedCid: await computeCapsuleCID(extracted), cidAlgorithm: 'registry-unixfs-v0-empty-files-excluded',
  });
  await mkdir(output, { recursive: true });
  await writeFile(join(output, receipt.archiveFile), archive);
  await writeFile(join(output, `${skillName}.build.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}
