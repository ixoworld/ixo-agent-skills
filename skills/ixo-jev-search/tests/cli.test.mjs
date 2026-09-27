import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { computeRequestDigest } = require('../scripts/lib/request.js');

const GATEWAY_DID = 'did:web:gateway.test';
const DOMAIN_DID = 'did:ixo:entity:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2';
const BEARER = 'aW52b2NhdGlvbg==.ZGVsZWdhdGlvbg==';

let server;
let gatewayUrl;
let received = [];
let nextStatus = 200;

function searchResponse(body) {
  return {
    schemaVersion: 'ixo.search.v1',
    requestId: body.requestId,
    queryId: `search_query_${'a'.repeat(64)}`,
    status: 'complete',
    results: [
      {
        disclosure: 'metadata',
        resultId: `search_result_${'b'.repeat(64)}`,
        resultRef: 'sr1.payload.signature',
        category: 'domains',
        objectType: 'domain',
        title: 'Clean Cooking Mini-Grid Program',
        summary: null,
        source: { name: 'domain-indexer', sourceDid: 'did:web:indexer.test', contractVersion: '1' },
        identity: { did: DOMAIN_DID },
        metadata: {},
        ranking: { score: 0.7, relevanceScore: 0.93, relevanceTier: 'relevant', matchedFields: [] },
        provenance: {},
        actions: [],
        authorization: {},
      },
      {
        disclosure: 'metadata',
        resultId: `search_result_${'c'.repeat(64)}`,
        resultRef: 'sr1.payload2.signature2',
        category: 'domains',
        objectType: 'domain',
        title: 'Cookstove Carbon Registry',
        summary: 'Registry summary.',
        source: { name: 'domain-indexer', sourceDid: 'did:web:indexer.test', contractVersion: '1' },
        identity: { did: 'did:ixo:entity:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3' },
        metadata: {},
        ranking: { score: 0.2, relevanceScore: 0.4, relevanceTier: 'lead', matchedFields: [] },
        provenance: {},
        actions: [],
        authorization: {},
      },
    ],
    facets: [],
    page: { limit: body.page.limit, hasMore: false },
    connectorOutcomes: [{ connector: 'domains', status: 'ok' }],
    relevance: {
      strategy: 'jev',
      status: 'complete',
      followUps: [
        {
          fromResultId: `search_result_${'b'.repeat(64)}`,
          query: { text: DOMAIN_DID, mode: 'keyword' },
          categories: ['transactions', 'claims', 'messages'],
        },
      ],
    },
    receiptId: `search_receipt_${'d'.repeat(64)}`,
  };
}

before(async () => {
  server = createServer((request, response) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
    });
    request.on('end', () => {
      received.push({ method: request.method, url: request.url, headers: request.headers, body: raw });
      response.setHeader('content-type', 'application/json');
      if (request.url === '/.well-known/did.json') {
        response.end(JSON.stringify({ id: GATEWAY_DID }));
      } else if (request.url === '/ready') {
        response.end(JSON.stringify({ status: 'ready' }));
      } else if (request.url === '/search' && request.method === 'POST') {
        response.statusCode = nextStatus;
        const body = JSON.parse(raw);
        response.end(
          JSON.stringify(
            nextStatus === 200
              ? searchResponse(body)
              : { error: { code: 'unauthenticated', message: 'Authentication required', retryable: false } },
          ),
        );
      } else {
        response.statusCode = 404;
        response.end('{}');
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  gatewayUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

let dataDir;
let outputDir;
beforeEach(() => {
  received = [];
  nextStatus = 200;
  const root = mkdtempSync(join(tmpdir(), 'ixo-jev-search-'));
  dataDir = join(root, 'data');
  outputDir = join(root, 'output');
  process.env.IXO_JEV_SEARCH_DATA_DIR = dataDir;
  process.env.IXO_JEV_SEARCH_OUTPUT_DIR = outputDir;
});

const { main, parseArgs } = require('../scripts/jev-search.js');

test('parseArgs handles both flag styles', () => {
  assert.deepEqual(parseArgs(['prepare', '--query', 'clean cooking', '--min-relevance=0.3', '--flag']), {
    command: 'prepare',
    query: 'clean cooking',
    minRelevance: '0.3',
    flag: 'true',
  });
});

test('prepare → search → follow-up round trip', async () => {
  const prepared = await main({
    command: 'prepare',
    query: 'clean cooking mini-grid',
    categories: 'domains',
    limit: '5',
    gatewayUrl,
  });
  assert.equal(prepared.success, true, JSON.stringify(prepared));
  assert.equal(prepared.audienceDid, GATEWAY_DID);
  assert.deepEqual(prepared.mint.capability, { can: 'search/authenticate', with: 'ixo:search' });
  const stored = JSON.parse(readFileSync(join(dataDir, 'request.json'), 'utf8'));
  assert.equal(prepared.requestDigest, computeRequestDigest(GATEWAY_DID, stored.searchRequest));
  assert.deepEqual(stored.searchRequest.ranking, { strategy: 'jev' });

  // Search without an authorization is refused locally, before any network call.
  const missing = await main({ command: 'search' });
  assert.equal(missing.errorType, 'MISSING_AUTHORIZATION');

  writeFileSync(join(dataDir, 'authorization'), `Bearer ${BEARER}\n`);
  const searched = await main({ command: 'search' });
  assert.equal(searched.success, true, JSON.stringify(searched));
  const post = received.find((entry) => entry.url === '/search');
  assert.equal(post.headers.authorization, `Bearer ${BEARER}`);
  assert.deepEqual(JSON.parse(post.body), stored.searchRequest);
  // The spent credential is removed; the output never echoes it.
  assert.equal(existsSync(join(dataDir, 'authorization')), false);
  assert.equal(JSON.stringify(searched).includes(BEARER), false);

  assert.match(searched.summary, /^2 results; relevance complete \(1 relevant, 1 lead, 0 unscored\)/);
  assert.match(searched.summary, /1 follow-up available/);
  assert.deepEqual(
    searched.results.map((result) => [result.rank, result.tier, result.id]),
    [
      [1, 'relevant', DOMAIN_DID],
      [2, 'lead', 'did:ixo:entity:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3'],
    ],
  );
  assert.equal(existsSync(searched.savedTo), true);

  const rendered = await main({ command: 'render', file: searched.savedTo });
  assert.equal(rendered.summary, searched.summary);

  const followUp = await main({ command: 'follow-up', from: searched.savedTo });
  assert.equal(followUp.success, true, JSON.stringify(followUp));
  assert.deepEqual(followUp.query, { text: DOMAIN_DID, mode: 'keyword' });
  assert.deepEqual(followUp.categories, ['transactions', 'claims', 'messages']);
  assert.equal(followUp.followUpOf, searched.queryId);

  // One follow-up round only.
  writeFileSync(join(dataDir, 'authorization'), BEARER);
  const second = await main({ command: 'search' });
  assert.equal(second.success, true);
  assert.deepEqual(second.followUps, []);
  const again = await main({ command: 'follow-up', from: second.savedTo });
  assert.equal(again.errorType, 'FOLLOW_UP_LIMIT');
});

test('maps gateway denials and still discards the credential', async () => {
  await main({ command: 'prepare', query: 'solar', gatewayUrl });
  writeFileSync(join(dataDir, 'authorization'), BEARER);
  nextStatus = 401;
  const denied = await main({ command: 'search' });
  assert.equal(denied.success, false);
  assert.equal(denied.errorType, 'AUTH_FAILED');
  assert.equal(denied.httpStatus, 401);
  assert.equal(denied.gatewayCode, 'unauthenticated');
  assert.equal(existsSync(join(dataDir, 'authorization')), false);
});

test('refuses a hand-edited prepared request', async () => {
  await main({ command: 'prepare', query: 'solar', gatewayUrl });
  const path = join(dataDir, 'request.json');
  const stored = JSON.parse(readFileSync(path, 'utf8'));
  stored.searchRequest.query.text = 'something else';
  writeFileSync(path, JSON.stringify(stored));
  writeFileSync(join(dataDir, 'authorization'), BEARER);
  const result = await main({ command: 'search' });
  assert.equal(result.errorType, 'NOT_PREPARED');
  assert.equal(received.some((entry) => entry.url === '/search'), false);
});

test('rejects non-https gateways and reports readiness', async () => {
  const insecure = await main({ command: 'status', gatewayUrl: 'http://gateway.example' });
  assert.equal(insecure.errorType, 'INVALID_REQUEST');
  const status = await main({ command: 'status', gatewayUrl });
  assert.equal(status.ready, true);
});

test('unknown commands fail with a structured envelope', async () => {
  const result = await main({ command: 'nope' });
  assert.equal(result.success, false);
  assert.equal(result.errorType, 'INVALID_REQUEST');
  rmSync(dataDir, { recursive: true, force: true });
});
