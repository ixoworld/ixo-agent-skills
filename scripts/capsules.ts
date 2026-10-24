import { z } from 'zod';
import { parseArgs } from 'node:util';
import { basename, resolve } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { allSkills, buildCapsule, changedSkills, readCommitFiles } from './lib/build.js';
import { readSkillDirectory, validateFiles } from './lib/validate.js';
import { publishCapsule } from './lib/publish.js';

export async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  const { values } = parseArgs({ args: rest, options: {
    repo: { type: 'string', default: '.' }, commit: { type: 'string' }, base: { type: 'string' },
    repository: { type: 'string' }, skill: { type: 'string', multiple: true },
    output: { type: 'string', default: '.capsule-build' }, receipt: { type: 'string' },
    registry: { type: 'string' }, directory: { type: 'string' }, 'include-contracts': { type: 'boolean', default: false }, private: { type: 'boolean', default: false },
  } });
  const repo = resolve(values.repo);
  if (command === 'validate') {
    if (values.directory) {
      const directory = resolve(values.directory);
      const declaration = validateFiles(await readSkillDirectory(directory), basename(directory));
      process.stdout.write(`${basename(directory)}: ${declaration.status}\n`);
      return;
    }
    const names = values.skill ?? (await readdir(resolve(repo, 'skills'), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);
    for (const name of names) {
      const declaration = validateFiles(await readSkillDirectory(resolve(repo, 'skills', name)), name);
      process.stdout.write(`${name}: ${declaration.status}\n`);
    }
  } else if (command === 'build') {
    if (!values.commit || !values.repository) throw new Error('build requires --commit <full SHA> and --repository <URL>');
    const changed = values.skill ?? (values.base ? changedSkills(repo, values.base, values.commit) : allSkills(repo, values.commit));
    const configured: unknown = values['include-contracts'] ? JSON.parse(await readFile(resolve(repo, 'scripts/contract-skills.json'), 'utf8')) : [];
    const names = [...new Set([...changed, ...z.array(z.string()).parse(configured)])].sort();
    for (const name of names) {
      if (readCommitFiles(repo, values.commit, name).length === 0) {
        process.stdout.write(`${name}: deleted, skipped\n`);
        continue;
      }
      const receipt = await buildCapsule({ repo, commit: values.commit, repository: values.repository, skillName: name, output: resolve(values.output) });
      process.stdout.write(`${name}: unpublished ${receipt.expectedCid}\n`);
    }
  } else if (command === 'publish') {
    if (!values.receipt || !values.registry) throw new Error('publish requires --receipt and --registry');
    await publishCapsule({ receiptPath: resolve(values.receipt), registry: values.registry, privateRegistry: values.private,
      uploadKey: process.env.SKILLS_API_KEY, readKey: process.env.SKILLS_READ_API_KEY });
    process.stdout.write('Archive retrieval verified.\n');
  } else throw new Error('Usage: capsules.ts validate|build|publish [options]');
}

main(process.argv.slice(2)).catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Capsule command failed'}\n`);
  process.exitCode = 1;
});
