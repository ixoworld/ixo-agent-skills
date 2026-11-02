import { basename, join } from 'node:path';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { parseCapsuleContract, type CapsuleContract } from './skill-contract.js';
import { type CapsuleFile, validateArchivePath } from './archive.js';

const frontmatterSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(1024),
  'allowed-tools': z.string().trim().min(1).optional(),
});

export function validateFiles(files: readonly CapsuleFile[], skillName: string): CapsuleContract {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName) || skillName.length > 64) throw new Error('Invalid skill folder name');
  const paths = new Set<string>();
  for (const file of files) {
    validateArchivePath(file.path);
    if (!file.path.startsWith(`${skillName}/`)) throw new Error('Archive must contain one named skill root');
    if (paths.has(file.path)) throw new Error('Duplicate archive path');
    paths.add(file.path);
  }
  const skill = files.find(file => file.path === `${skillName}/SKILL.md`);
  if (!skill) throw new Error('Missing SKILL.md');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(skill.content);
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match?.[1]) throw new Error('Missing YAML frontmatter');
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) throw new Error(`Invalid YAML: ${document.errors[0]?.message}`);
  const frontmatter = frontmatterSchema.parse(document.toJS());
  if (frontmatter.name !== skillName) throw new Error('Frontmatter name does not match folder');
  const sidecar = files.find(file => file.path === `${skillName}/skill-contract.json`);
  const declaration = parseCapsuleContract(sidecar ? new TextDecoder('utf-8', { fatal: true }).decode(sidecar.content) : undefined, skillName);
  if (declaration.status === 'unsupported') throw new Error('Unsupported present skill contract version');
  return declaration;
}

export async function readSkillDirectory(directory: string): Promise<CapsuleFile[]> {
  const files: CapsuleFile[] = [];
  const skillName = basename(directory);
  async function visit(path: string, archivePath: string): Promise<void> {
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Symlinks are unsupported: ${archivePath}`);
    if (info.isDirectory()) {
      for (const name of await readdir(path)) await visit(join(path, name), `${archivePath}/${name}`);
    } else if (info.isFile()) {
      files.push({ path: archivePath, content: await readFile(path), mode: info.mode & 0o111 ? 0o755 : 0o644 });
    } else throw new Error(`Unsupported file type: ${archivePath}`);
  }
  await visit(directory, skillName);
  return files;
}
