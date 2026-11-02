import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

test('every specialized validator workflow installs its locked Node dependencies', async () => {
  for (const name of ['compose-topic', 'ixo-jev-search', 'ixo-reporter', 'mcda']) {
    const text = await readFile(`.github/workflows/${name}.yml`, 'utf8');
    const workflow = parse(text);
    const steps = workflow.jobs['offline-checks'].steps;
    const install = steps.findIndex((step: {run?: string}) => step.run === 'npm ci --ignore-scripts');
    const validate = steps.findIndex((step: {run?: string}) => step.run?.startsWith('bash scripts/validate-skill.sh'));
    assert.ok(install >= 0 && install < validate, name);
    assert.ok(workflow.on.pull_request.paths.includes('scripts/**'), name);
    assert.ok(workflow.on.pull_request.paths.includes('package-lock.json'), name);
  }
});

