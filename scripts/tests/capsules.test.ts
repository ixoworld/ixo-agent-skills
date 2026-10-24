import assert from 'node:assert/strict';
import { gunzipSync, gzipSync } from 'node:zlib';
import { after, before, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { createArchive, extractArchive, computeCapsuleCID, sha256, type CapsuleFile } from '../lib/archive.js';
import { buildCapsule, changedSkills, readCommitFiles } from '../lib/build.js';
import { publishCapsule } from '../lib/publish.js';
import { parseCapsuleContract } from '../lib/skill-contract.js';
import { readSkillDirectory, validateFiles } from '../lib/validate.js';

const contract = {
  schemaVersion: 1, skillName: 'example', runtime: 'qiforge-workers', audiences: ['private'], effects: ['read'],
  requiredTools: [{ name: 'sandbox_run', effect: 'write' }], requiredCapabilities: [], requiredServices: [],
};
const files: CapsuleFile[] = [
  { path: 'example/SKILL.md', content: Buffer.from('---\nname: example\ndescription: Test the capsule\n---\n# Example\n'), mode: 0o644 },
  { path: 'example/skill-contract.json', content: Buffer.from(JSON.stringify(contract)), mode: 0o644 },
  { path: 'example/run.sh', content: Buffer.from('#!/bin/sh\ntrue\n'), mode: 0o755 },
  { path: 'example/empty', content: Buffer.alloc(0), mode: 0o644 },
];
let root: string;
let repo: string;
let output: string;
let commit: string;
const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'capsule-tests-'));
  repo = join(root, 'repo');
  output = join(root, 'receipts');
  await mkdir(join(repo, 'skills/example'), { recursive: true });
  git('init', '-q');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'user.name', 'Capsule fixture');
  for (const file of files) {
    const path = join(repo, 'skills', file.path);
    await writeFile(path, file.content);
    await chmod(path, file.mode);
  }
  git('add', 'skills');
  git('commit', '-qm', 'Fixture source');
  commit = git('rev-parse', 'HEAD');
});
after(async () => { await rm(root, { recursive: true, force: true }); });

const build = () => buildCapsule({ repo, commit, repository: 'https://example.invalid/fixture', skillName: 'example', output });

test('declaration states reject malformed and mismatched contracts without granting authority', () => {
  assert.deepEqual(parseCapsuleContract(undefined, 'example'), { status: 'legacy' });
  assert.deepEqual(parseCapsuleContract('{"schemaVersion":2}', 'example'), { status: 'unsupported' });
  assert.equal(parseCapsuleContract(JSON.stringify(contract), 'example').status, 'validated');
  for (const invalid of [
    { ...contract, runtime: 'made-up' }, { ...contract, skillName: 'other' }, { ...contract, secret: 'no' },
    { ...contract, requiredTools: [{ name: 'sandbox_run', effect: 'read', version: '1' }] },
    { ...contract, effects: ['read', 'read'] }, { ...contract, requiredCapabilities: [{ resource: '*', action: '*' }] },
  ]) assert.throws(() => parseCapsuleContract(JSON.stringify(invalid), 'example'));
  assert.equal(parseCapsuleContract(JSON.stringify({ ...contract, runtime: 'external' }), 'example').status, 'validated');
});

test('deterministic archive preserves file bytes, executable modes, and empty files', () => {
  const archive = createArchive(files);
  assert.deepEqual(createArchive([...files].reverse()), archive);
  assert.deepEqual(extractArchive(archive), [...files].sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path))));
  assert.equal(extractArchive(archive).find(file => file.path.endsWith('run.sh'))?.mode, 0o755);
});

test('canonical CID excludes registry metadata and historical zero-byte files', async () => {
  const cid = await computeCapsuleCID(files);
  assert.equal(await computeCapsuleCID(files.filter(file => file.content.length)), cid);
  assert.equal(await computeCapsuleCID(files.filter(file => !file.path.endsWith('skill-contract.json'))), 'QmZKskZC9Fmw7YePp2joHF5KPz44uFZj8Rob838irKFhc2');
  assert.equal(await computeCapsuleCID([...files, { path: 'example/._mac', content: Buffer.from('metadata'), mode: 0o644 }]), cid);
  assert.notEqual(await computeCapsuleCID(files.map(file => file.path.endsWith('run.sh') ? { ...file, content: Buffer.from('changed') } : file)), cid);
});

test('unsafe, ambiguous, duplicate, and oversized paths fail before packaging', () => {
  const first = files[0];
  assert.ok(first);
  for (const path of ['example/../escape', '/example/file', 'example//file', `example/${'a'.repeat(100)}`, 'example/file\0x']) {
    assert.throws(() => createArchive([{ ...first, path }]));
  }
  assert.throws(() => validateFiles([...files, first], 'example'), /Duplicate/);
  const archive = createArchive(files);
  archive[20] = (archive[20] ?? 0) ^ 1;
  assert.throws(() => extractArchive(archive));
});

test('frontmatter and sidecar must agree and allowed-tools must be a string', () => {
  assert.equal(validateFiles(files, 'example').status, 'validated');
  for (const content of [
    '---\nname: other\ndescription: Test\n---\n',
    '---\nname: example\ndescription: Test\nallowed-tools: [shell]\n---\n',
    '---\nname: example\nname: duplicate\ndescription: Test\n---\n',
  ]) assert.throws(() => validateFiles(files.map(file => file.path.endsWith('SKILL.md') ? { ...file, content: Buffer.from(content) } : file), 'example'));
  assert.throws(() => validateFiles(files.map(file => file.path.endsWith('skill-contract.json') ? { ...file, content: Buffer.from('{"schemaVersion":2}') } : file), 'example'), /Unsupported/);
});

test('build uses exact Git commit bytes despite dirty working files and writes receipts outside capsules', async () => {
  await writeFile(join(repo, 'skills/example/run.sh'), 'dirty working contents');
  const first = await build();
  const archive = await readFile(join(output, first.archiveFile));
  const second = await build();
  assert.equal(first.archiveSha256, second.archiveSha256);
  assert.deepEqual(extractArchive(archive).find(file => file.path.endsWith('run.sh'))?.content, files[2]?.content);
  assert.equal(first.status, 'unpublished');
  assert.equal(first.sourceClaim, 'workflow-reported');
  assert.equal(first.commit, commit);
  assert.equal(first.expectedCid, await computeCapsuleCID(extractArchive(archive)));
  assert.equal('serverCid' in first, false);
  assert.throws(() => readCommitFiles(repo, 'HEAD', 'example'), /full exact/);
  await assert.rejects(buildCapsule({ repo, commit, repository: 'https://example.invalid', skillName: 'example', output: join(repo, 'skills/example') }), /outside/);
});

test('Git symlinks and whitespace skill paths are rejected instead of skipped', async () => {
  git('update-index', '--add', '--cacheinfo', `120000,${git('rev-parse', `${commit}:skills/example/run.sh`)},skills/example/link`);
  const tree = git('write-tree');
  const linked = execFileSync('git', ['-C', repo, 'commit-tree', tree, '-p', commit, '-m', 'Symlink fixture'], { encoding: 'utf8' }).trim();
  assert.throws(() => readCommitFiles(repo, linked, 'example'), /symlinks/);
  git('reset', '-q', commit);
  await mkdir(join(repo, 'skills/bad name'), { recursive: true });
  await writeFile(join(repo, 'skills/bad name/SKILL.md'), 'bad');
  git('add', 'skills/bad name');
  const badTree = git('write-tree');
  const bad = execFileSync('git', ['-C', repo, 'commit-tree', badTree, '-p', commit, '-m', 'Whitespace fixture'], { encoding: 'utf8' }).trim();
  assert.deepEqual(changedSkills(repo, commit, bad), ['bad name']);
  assert.throws(() => readCommitFiles(repo, bad, 'bad name'), /Invalid skill/);
});

test('private publishing checks distinct read credentials before any network request', async () => {
  let calls = 0;
  const request: typeof fetch = async () => { calls++; throw new Error('unexpected network'); };
  for (const readKey of [undefined, '', 'upload', ' upload ']) {
    await assert.rejects(publishCapsule({ receiptPath: 'absent', registry: 'https://private.example.invalid', privateRegistry: true, uploadKey: 'upload', readKey, request }), /distinct/);
  }
  await assert.rejects(publishCapsule({ receiptPath: 'absent', registry: 'https://private.capsules.skills.ixo.earth', privateRegistry: false, uploadKey: 'upload', request }), /distinct/);
  assert.equal(calls, 0);
});

test('publish uploads exact built bytes and verifies authorized retrieval independently', async () => {
  const receipt = await build();
  const archive = await readFile(join(output, receipt.archiveFile));
  const calls: string[] = [];
  const request: typeof fetch = async (url, init) => {
    calls.push(String(url));
    if (init?.method === 'POST') {
      assert.deepEqual(Buffer.from(await new Response(init.body).arrayBuffer()), archive);
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer upload');
      return Response.json({ cid: receipt.expectedCid });
    }
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer read');
    return new Response(Uint8Array.from(archive).buffer);
  };
  await publishCapsule({ receiptPath: join(output, 'example.build.json'), registry: 'https://private.example.invalid', privateRegistry: true, uploadKey: 'upload', readKey: 'read', request });
  assert.equal(calls.length, 2);
  const release = JSON.parse(await readFile(join(output, 'example.release.json'), 'utf8'));
  assert.equal(release.status, 'retrieval-verified');
  assert.equal(release.serverCid, receipt.expectedCid);
  assert.equal(release.retrievedArchiveSha256, sha256(archive));
});

test('accepted upload is retained when server CID, retrieval access, or retrieved bytes fail verification', async () => {
  const receipt = await build();
  for (const failure of ['cid', 'denied', 'bytes']) {
    await rm(join(output, 'example.release.json'), { force: true });
    const request: typeof fetch = async (_url, init) => {
      if (init?.method === 'POST') return Response.json({ cid: failure === 'cid' ? 'Qm' + 'a'.repeat(44) : receipt.expectedCid });
      if (failure === 'denied') return new Response('', { status: 403 });
      return new Response(Uint8Array.from(createArchive(files.map(file => ({ ...file, mode: 0o644 })))).buffer);
    };
    await assert.rejects(publishCapsule({ receiptPath: join(output, 'example.build.json'), registry: 'https://registry.example.invalid', privateRegistry: false, uploadKey: 'upload', request }));
    assert.equal(JSON.parse(await readFile(join(output, 'example.upload-accepted.json'), 'utf8')).status, 'upload-accepted');
    await assert.rejects(readFile(join(output, 'example.release.json')), /ENOENT/);
  }
});

test('different gzip encoding preserves verified complete contents and records both transport hashes', async () => {
  const receipt = await build();
  const archive = await readFile(join(output, receipt.archiveFile));
  const fetched = gzipSync(gunzipSync(archive), {level: 0});
  const request: typeof fetch = async (_url, init) => init?.method === 'POST'
    ? Response.json({cid: receipt.expectedCid}) : new Response(Uint8Array.from(fetched).buffer);
  await publishCapsule({receiptPath: join(output, 'example.build.json'), registry: 'https://registry.example.invalid', privateRegistry: false, uploadKey: 'upload', request});
  const release = JSON.parse(await readFile(join(output, 'example.release.json'), 'utf8'));
  assert.equal(release.retrievalVerified, true);
  assert.equal(release.contentIdentityVerified, true);
  assert.equal(release.completeContentsMatch, true);
  assert.equal(release.transportBytesMatch, false);
  assert.equal(release.archiveSha256, sha256(archive));
  assert.equal(release.retrievedArchiveSha256, sha256(fetched));
});

test('CID-excluded empty files and modes cannot pass complete package verification', async () => {
  const receipt = await build();
  await rm(join(output, 'example.release.json'), {force: true});
  const fetched = createArchive(files.filter(file => file.content.length > 0));
  const request: typeof fetch = async (_url, init) => init?.method === 'POST'
    ? Response.json({cid: receipt.expectedCid}) : new Response(Uint8Array.from(fetched).buffer);
  await assert.rejects(publishCapsule({receiptPath: join(output, 'example.build.json'), registry: 'https://registry.example.invalid', privateRegistry: false, uploadKey: 'upload', request}), /complete file/);
  const retrieval = JSON.parse(await readFile(join(output, 'example.retrieval.json'), 'utf8'));
  assert.equal(retrieval.contentIdentityVerified, true);
  assert.equal(retrieval.completeContentsMatch, false);
  assert.equal(retrieval.retrievedArchiveSha256, sha256(fetched));
  await assert.rejects(readFile(join(output, 'example.release.json')), /ENOENT/);
});

test('archive tamper is rejected before upload', async () => {
  const receipt = await build();
  await writeFile(join(output, receipt.archiveFile), 'tampered');
  let calls = 0;
  const request: typeof fetch = async () => { calls++; throw new Error('unexpected network'); };
  await assert.rejects(publishCapsule({ receiptPath: join(output, 'example.build.json'), registry: 'https://registry.example.invalid', privateRegistry: false, uploadKey: 'upload', request }), /does not match/);
  assert.equal(calls, 0);
});

test('declared skills validate and their actual source archives include their sidecars', async () => {
  const names: string[] = JSON.parse(await readFile('scripts/contract-skills.json', 'utf8'));
  for (const name of names) {
    const actual = await readSkillDirectory(resolve('skills', name));
    const archive = createArchive(actual);
    assert.equal(validateFiles(extractArchive(archive), name).status, 'validated', name);
    assert.ok(extractArchive(archive).some(file => file.path.endsWith('/skill-contract.json')), name);
    assert.ok((await computeCapsuleCID(extractArchive(archive))).startsWith('Qm'), name);
  }
});

test('CI validates archive code, real packages, and relevant workflow changes with finite retention', async () => {
  const validation = await readFile('.github/workflows/validate-skill.yml', 'utf8');
  const publish = await readFile('.github/workflows/publish-skill.yml', 'utf8');
  assert.doesNotThrow(() => parse(validation));
  assert.doesNotThrow(() => parse(publish));
  for (const path of ['scripts/**', 'package-lock.json', '.github/workflows/**']) assert.ok(validation.includes(path));
  for (const command of ['npm test', 'npm run check', 'npm run build:capsules']) assert.ok(validation.includes(command));
  assert.ok(validation.includes('--include-contracts'));
  assert.ok(publish.includes('github.event.before'));
  assert.ok(publish.includes('npm run publish:capsules'));
  assert.ok(publish.includes('retention-days: 90'));
  assert.ok(publish.includes('if: always()'));
});

test('workflow effects preserve Library writes, Topic scope, payment scope, and unsupported external runtimes', async () => {
  const names: string[] = JSON.parse(await readFile('scripts/contract-skills.json', 'utf8'));
  for (const name of names) {
    const declaration = parseCapsuleContract(await readFile(`skills/${name}/skill-contract.json`, 'utf8'), name);
    assert.equal(declaration.status, 'validated');
    if (declaration.status !== 'validated') throw new Error('Expected validated contract');
    const item = declaration.contract;
    if (name === 'qi-library') {
      assert.ok(item.effects.includes('write'));
      for (const name of ['vfs_write', 'vfs_delete', 'sandbox_to_vfs']) assert.ok(item.requiredTools.some(tool => tool.name === name && tool.effect === 'write'));
    } else if (name === 'ixo-jev-search') {
      for (const name of ['search_gateway_authorize', 'sandbox_write_blob']) assert.ok(item.requiredTools.some(tool => tool.name === name && tool.effect === 'write'));
      assert.ok(item.requiredServices.some(service => service.profile === 'delegated-search-v1'));
      assert.ok(item.effects.includes('payment'));
    } else if (name === 'ixo-yellowcard') {
      assert.equal(item.runtime, 'external');
      assert.ok(item.effects.includes('payment'));
      assert.ok(item.requiredCapabilities.some(capability => capability.resource === 'ixo:yellowcard' && capability.action === 'yellowcard/payouts'));
    } else if (name === 'compose-topic' || name === 'facilitate-topic') {
      assert.ok(item.effects.includes('stage'));
      assert.deepEqual(item.audiences, ['private', 'shared']);
    } else if (name === 'error-resolver') {
      assert.deepEqual(item.effects, ['read']);
      assert.deepEqual(item.requiredCapabilities, []);
    } else {
      assert.equal(item.runtime, 'external');
      assert.deepEqual(item.audiences, ['private']);
    }
  }
});

test('copied tooling matches its recorded source hashes', async () => {
  const manifest = JSON.parse(await readFile('scripts/tooling-source.json', 'utf8'));
  for (const [path, expected] of Object.entries(manifest.files)) {
    assert.equal(sha256(await readFile(path)), expected, path);
  }
});
