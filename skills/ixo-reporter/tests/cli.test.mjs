// Offline smoke tests for the ixo-reporter capsule. Run from the skill folder: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../scripts/reporter.mjs', import.meta.url));
function run(args) {
  try { return { code: 0, out: JSON.parse(execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH ?? '' } })) }; }
  catch (error) { return { code: error.status, out: JSON.parse(error.stdout) }; }
}

test('the command line is the one the source lock names', () => {
  const lock = JSON.parse(readFileSync(new URL('../references/source-lock.json', import.meta.url), 'utf8'));
  assert.equal(createHash('sha256').update(readFileSync(CLI)).digest('hex'), lock.cli.sha256);
});

test('synthetic examples verify offline, are labelled, and follow the gate', () => {
  const out = mkdtempSync(path.join(tmpdir(), 'ixo-reporter-'));
  const valid = run(['example', 'valid', '--out', out]);
  assert.equal(valid.code, 0);
  assert.equal(valid.out.result, 'Verified');
  assert.equal(valid.out.synthetic, true);
  assert.equal(valid.out.outputsAllowed, true);
  const tampered = run(['example', 'tampered', '--out', out]);
  assert.equal(tampered.out.outputsAllowed, false);
  assert.deepEqual(tampered.out.facts, []);
  assert.match(run(['example', 'revoked', '--out', out]).out.lead, /^Withdrawn since it was issued/);
});

test('a grounded draft renders and passes check; invented figures are refused', () => {
  const out = mkdtempSync(path.join(tmpdir(), 'ixo-reporter-'));
  const { bundle } = run(['example', 'valid', '--out', out]).out;
  const digest = JSON.parse(readFileSync(bundle, 'utf8')).digest;
  const draft = (text) => ({ format: 'narrative', variant: 'briefing', bundleDigest: digest, audience: 'funder', language: 'English', length: 'short', title: 'Briefing',
    sections: [{ heading: 'Result', statements: [{ text: 'IXO Reporter checked this certificate on {CHECKED}.', basis: 'check', refs: ['standing'] }, { text, basis: 'signed', refs: ['F1'] }] }] });
  writeFileSync(path.join(out, 'bad.json'), JSON.stringify(draft('It reached 5000 people.')));
  const refused = run(['render', bundle, path.join(out, 'bad.json')]);
  assert.equal(refused.code, 4);
  assert.match(refused.out.issues.join(' '), /no digits/);
  writeFileSync(path.join(out, 'good.json'), JSON.stringify(draft('It records {F1} and {F2}.')));
  const rendered = run(['render', bundle, path.join(out, 'good.json')]);
  assert.equal(rendered.code, 0);
  assert.deepEqual(readdirSync(rendered.out.folder).sort(), ['draft.json', 'report.md', 'seal.svg']);
  assert.equal(run(['check', bundle, path.join(rendered.out.folder, 'report.md')]).code, 0);
});
