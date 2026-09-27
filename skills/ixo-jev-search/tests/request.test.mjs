import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildSearchRequest,
  computeRequestDigest,
  RequestError,
} = require('../scripts/lib/request.js');

// Published by ixo-search-gateway (test/fixtures/request-digest-vectors.json);
// the gateway's own suite pins the same values.
const { vectors } = JSON.parse(
  readFileSync(new URL('./fixtures/request-digest-vectors.json', import.meta.url), 'utf8'),
);

for (const vector of vectors) {
  test(`digest matches gateway vector: ${vector.name}`, () => {
    assert.equal(computeRequestDigest(vector.audienceDid, vector.searchRequest), vector.requestDigest);
  });
}

test('buildSearchRequest reproduces the vector bodies exactly', () => {
  const vector = vectors.find((entry) => entry.name === 'explicit-jev-domains');
  const built = buildSearchRequest({
    query: '  clean cooking mini-grid ',
    categories: 'domains',
    limit: 10,
    strategy: 'jev',
    requestId: 'req_vector_1',
  });
  assert.deepEqual(built, vector.searchRequest);
  assert.equal(computeRequestDigest(vector.audienceDid, built), vector.requestDigest);
});

test('buildSearchRequest omits ranking for strategy none', () => {
  const built = buildSearchRequest({ query: 'solar', strategy: 'none', requestId: 'req_x' });
  assert.equal('ranking' in built, false);
});

test('buildSearchRequest validates inputs', () => {
  const bad = [
    { query: '' },
    { query: 'a\u0007b' },
    { query: 'solar', mode: 'fuzzy' },
    { query: 'solar', categories: 'domains,domains' },
    { query: 'solar', categories: 'nope' },
    { query: 'solar', limit: 21 },
    { query: 'solar', outputLevel: 'full' },
    { query: 'solar', minRelevance: 0.9 },
    { query: 'solar', requestId: '-bad' },
    { query: 'solar', facets: 'color' },
  ];
  for (const options of bad) {
    assert.throws(() => buildSearchRequest(options), RequestError, JSON.stringify(options));
  }
});
