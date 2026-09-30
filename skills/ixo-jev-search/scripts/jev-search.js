#!/usr/bin/env node
/**
 * Jev-enabled search against the IXO Search Gateway from the capsule sandbox.
 *
 * Usage:
 *   node jev-search.js prepare --query "<need>" [--categories domains,files] [--mode hybrid]
 *                              [--limit 10] [--output-level metadata|snippets]
 *                              [--strategy jev|federated|none] [--min-relevance 0.25]
 *                              [--facets category,source] [--gateway-url <url>]
 *   node jev-search.js search
 *   node jev-search.js follow-up --from <saved.json> [--index 0]
 *   node jev-search.js render --file <saved.json>
 *   node jev-search.js status [--gateway-url <url>]
 *
 * Every command prints exactly one JSON envelope on stdout
 * ({ success: true, ... } or { success: false, errorType, error }) and exits
 * 0 or 1. The UCAN authorization is minted by the host between `prepare` and
 * `search` and written to the authorization file; this script never mints,
 * prints, or logs it.
 */

const { readFile, writeFile, rm } = require('node:fs/promises');
const { join } = require('node:path');
const {
  buildSearchRequest,
  computeRequestDigest,
} = require('./lib/request.js');
const {
  dataDir,
  outputDir,
  requestPath,
  authorizationPath,
  ensureDir,
  SkillError,
  success,
  failure,
} = require('./lib/runtime.js');

const DEFAULT_GATEWAY_URL = 'https://search.ixo.earth';
const DID_TIMEOUT_MS = 10_000;
const SEARCH_TIMEOUT_MS = 30_000;
const SUMMARY_CHARS = 200;

function gatewayUrlFrom(options) {
  const raw = options.gatewayUrl || process.env.IXO_SEARCH_GATEWAY_URL || DEFAULT_GATEWAY_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new SkillError('INVALID_REQUEST', 'gateway-url is not a valid URL');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new SkillError('INVALID_REQUEST', 'gateway-url must use https');
  }
  return url.origin;
}

async function fetchJson(url, init, timeoutMs) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new SkillError(
      timedOut ? 'TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      timedOut ? `${url} did not answer in ${timeoutMs} ms` : `Could not reach ${url}`,
    );
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

/**
 * The only DID a gateway at this origin can legitimately hold: did:web binds the
 * identifier to the host (a port is encoded as %3A), exactly as the gateway
 * derives its own. Anything else means the origin is claiming another
 * service's identity, so an authorization minted for that DID must never be
 * sent there.
 */
function expectedGatewayDid(gatewayUrl) {
  return `did:web:${new URL(gatewayUrl).host.replace(/:/g, '%3A')}`;
}

/** The gateway DID is the UCAN audience; it comes from the published did:web document. */
async function resolveGatewayDid(gatewayUrl) {
  const { status, body } = await fetchJson(`${gatewayUrl}/.well-known/did.json`, {}, DID_TIMEOUT_MS);
  if (status !== 200 || !body || typeof body.id !== 'string' || !body.id.startsWith('did:')) {
    throw new SkillError('UPSTREAM_UNAVAILABLE', 'Gateway did:web document is unavailable');
  }
  if (body.id !== expectedGatewayDid(gatewayUrl)) {
    throw new SkillError(
      'UNTRUSTED_GATEWAY',
      `Gateway at ${gatewayUrl} claims ${body.id}, but its origin can only be ${expectedGatewayDid(gatewayUrl)}`,
    );
  }
  return body.id;
}

async function writePrepared({ gatewayUrl, audienceDid, searchRequest, followUpOf }) {
  const requestDigest = computeRequestDigest(audienceDid, searchRequest);
  await ensureDir(dataDir());
  // A stale authorization from an earlier prepare can never match a new digest.
  await rm(authorizationPath(), { force: true });
  await writeFile(
    requestPath(),
    `${JSON.stringify(
      {
        gatewayUrl,
        audienceDid,
        requestDigest,
        preparedAt: new Date().toISOString(),
        ...(followUpOf ? { followUpOf } : {}),
        searchRequest,
      },
      null,
      2,
    )}\n`,
  );
  return success({
    command: 'prepare',
    requestId: searchRequest.requestId,
    requestDigest,
    audienceDid,
    gatewayUrl,
    ...(followUpOf ? { followUpOf } : {}),
    query: searchRequest.query,
    categories: searchRequest.categories,
    ranking: searchRequest.ranking ?? null,
    mint: {
      note: 'Host mints one fresh invocation for this exact request, then writes the full Bearer value to authorizationFile.',
      audience: audienceDid,
      capability: { can: 'search/authenticate', with: 'ixo:search' },
      facts: { rd: requestDigest },
      authorizationFile: authorizationPath(),
    },
    next: 'Mint and write the authorization, then run: node scripts/jev-search.js search',
  });
}

async function prepare(options) {
  const gatewayUrl = gatewayUrlFrom(options);
  const searchRequest = buildSearchRequest({
    query: options.query,
    mode: options.mode,
    categories: options.categories,
    limit: options.limit,
    outputLevel: options.outputLevel,
    facets: options.facets,
    explanations: options.explanations,
    strategy: options.strategy,
    minRelevance: options.minRelevance,
    requestId: options.requestId,
  });
  const audienceDid = await resolveGatewayDid(gatewayUrl);
  return writePrepared({ gatewayUrl, audienceDid, searchRequest });
}

async function readPrepared() {
  let prepared;
  try {
    prepared = JSON.parse(await readFile(requestPath(), 'utf8'));
  } catch {
    throw new SkillError('NOT_PREPARED', 'No prepared request; run prepare first');
  }
  // Re-derive the digest so a hand-edited request can never be sent under a
  // stale authorization.
  if (computeRequestDigest(prepared.audienceDid, prepared.searchRequest) !== prepared.requestDigest) {
    throw new SkillError('NOT_PREPARED', 'Prepared request was modified; run prepare again');
  }
  // The credential is minted for audienceDid; it may only travel to that DID's origin.
  if (
    gatewayUrlFrom({ gatewayUrl: prepared.gatewayUrl }) !== prepared.gatewayUrl ||
    prepared.audienceDid !== expectedGatewayDid(prepared.gatewayUrl)
  ) {
    throw new SkillError('UNTRUSTED_GATEWAY', 'Prepared gateway URL does not match its DID; run prepare again');
  }
  return prepared;
}

async function readAuthorization() {
  let raw;
  try {
    raw = await readFile(authorizationPath(), 'utf8');
  } catch {
    throw new SkillError(
      'MISSING_AUTHORIZATION',
      `No authorization at ${authorizationPath()}; the host must mint it after prepare`,
    );
  }
  const value = raw.trim().replace(/^Bearer\s+/i, '');
  if (!/^[A-Za-z0-9+/=_-]+(\.[A-Za-z0-9+/=_-]+){1,20}$/.test(value)) {
    throw new SkillError(
      'MISSING_AUTHORIZATION',
      'Authorization file must hold <invocation>.<delegation>[.<delegation>...]',
    );
  }
  return value;
}

const STATUS_ERRORS = {
  400: ['INVALID_REQUEST', 'The gateway rejected the request body'],
  401: ['AUTH_FAILED', 'Authentication failed: re-run prepare and have the host mint a fresh invocation for the new rd'],
  403: ['FORBIDDEN', 'Not authorized: the grants do not cover this request, or the invocation was already used'],
  413: ['INVALID_REQUEST', 'Request too large'],
  429: ['RATE_LIMITED', 'Rate limited; wait before retrying'],
  503: ['UPSTREAM_UNAVAILABLE', 'Search temporarily unavailable; prepare and retry'],
};

function truncate(value, max) {
  if (typeof value !== 'string') return value ?? null;
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function identityLabel(identity = {}) {
  return (
    identity.did ||
    (identity.txHash ? `${identity.chainId ? `${identity.chainId}:` : ''}${identity.txHash}` : null) ||
    identity.claimId ||
    identity.cid ||
    (identity.namespaceId && identity.fileId ? `${identity.namespaceId}/${identity.fileId}` : null) ||
    identity.uid ||
    null
  );
}

/** Summary first, then results, so the head of the output is useful alone. */
function summarize(saved) {
  const response = saved.response;
  const results = Array.isArray(response.results) ? response.results : [];
  const tiers = { relevant: 0, lead: 0, unscored: 0 };
  const sources = {};
  for (const result of results) {
    const tier = result.ranking && result.ranking.relevanceTier;
    if (tier) tiers[tier] += 1;
    const source = (result.source && result.source.name) || 'redacted';
    sources[source] = (sources[source] || 0) + 1;
  }
  const relevance = response.relevance || null;
  const followUps = (relevance && relevance.followUps) || [];
  const failed = (response.connectorOutcomes || []).filter((outcome) => outcome.status === 'failed');
  const parts = [
    `${results.length} result${results.length === 1 ? '' : 's'}`,
    !relevance
      ? 'federated ranking'
      : relevance.status === 'fallback'
        ? 'relevance fallback (classifier unavailable; federated ranking)'
        : `relevance ${relevance.status} (${tiers.relevant} relevant, ${tiers.lead} lead, ${tiers.unscored} unscored)`,
    Object.keys(sources).length > 0
      ? `from ${Object.entries(sources).map(([name, count]) => `${name}×${count}`).join(', ')}`
      : null,
    response.status === 'partial' ? `PARTIAL: ${failed.map((outcome) => outcome.connector).join(', ')} failed` : null,
    followUps.length > 0 && !saved.followUpOf ? `${followUps.length} follow-up${followUps.length === 1 ? '' : 's'} available` : null,
  ].filter(Boolean);
  return {
    summary: parts.join('; '),
    status: response.status,
    relevance: relevance ? { strategy: relevance.strategy, status: relevance.status } : null,
    results: results.map((result, index) => ({
      rank: index + 1,
      ...(result.disclosure === 'redacted'
        ? { disclosure: 'redacted' }
        : {
            tier: (result.ranking && result.ranking.relevanceTier) || null,
            relevance: result.ranking && result.ranking.relevanceScore !== undefined
              ? result.ranking.relevanceScore
              : null,
            score: result.ranking ? result.ranking.score : null,
            title: truncate(result.title, SUMMARY_CHARS),
            category: result.category,
            source: result.source && result.source.name,
            id: identityLabel(result.identity),
            summary: truncate(result.summary, SUMMARY_CHARS),
            ...(Array.isArray(result.snippets) && result.snippets[0]
              ? { snippet: truncate(result.snippets[0].text, SUMMARY_CHARS) }
              : {}),
            resultRef: result.resultRef,
          }),
    })),
    followUps: saved.followUpOf
      ? []
      : followUps.map((followUp, index) => ({
          index,
          query: followUp.query,
          categories: followUp.categories,
          fromResultId: followUp.fromResultId,
        })),
    queryId: response.queryId,
    receiptId: response.receiptId,
    ...(saved.followUpOf ? { followUpOf: saved.followUpOf } : {}),
  };
}

async function search() {
  const prepared = await readPrepared();
  const authorization = await readAuthorization();
  let result;
  try {
    result = await fetchJson(
      `${prepared.gatewayUrl}/search`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authorization}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(prepared.searchRequest),
      },
      SEARCH_TIMEOUT_MS,
    );
  } finally {
    // Invocations are single-use: never leave a spent credential behind.
    await rm(authorizationPath(), { force: true });
  }
  if (result.status !== 200 || !result.body || !Array.isArray(result.body.results)) {
    const [errorType, message] = STATUS_ERRORS[result.status] || [
      'UPSTREAM_ERROR',
      `Gateway returned HTTP ${result.status}`,
    ];
    const code = result.body && result.body.error && result.body.error.code;
    throw new SkillError(errorType, message, {
      httpStatus: result.status,
      ...(code ? { gatewayCode: code } : {}),
      retryable: result.status === 503 || result.status === 429,
    });
  }
  const saved = {
    savedAt: new Date().toISOString(),
    gatewayUrl: prepared.gatewayUrl,
    ...(prepared.followUpOf ? { followUpOf: prepared.followUpOf } : {}),
    request: prepared.searchRequest,
    response: result.body,
  };
  await ensureDir(outputDir());
  // Only a well-formed gateway query id may name the file; anything else (e.g.
  // path traversal from a hostile gateway) falls back to the locally
  // validated request id.
  const fileStem = /^search_query_[0-9a-f]{64}$/.test(String(result.body.queryId))
    ? result.body.queryId
    : prepared.searchRequest.requestId;
  const savedTo = join(outputDir(), `${fileStem}.json`);
  await writeFile(savedTo, `${JSON.stringify(saved, null, 2)}\n`);
  return success({ command: 'search', ...summarize(saved), savedTo });
}

async function readSaved(path) {
  if (!path) throw new SkillError('INVALID_REQUEST', '--file/--from <saved.json> is required');
  try {
    const saved = JSON.parse(await readFile(path, 'utf8'));
    if (!saved || !saved.response || !saved.request) throw new Error('shape');
    return saved;
  } catch {
    throw new SkillError('NOT_FOUND', `No saved search response at ${path}`);
  }
}

/** jevgrep's single anchored re-pass: at most one follow-up round. */
async function followUp(options) {
  const saved = await readSaved(options.from);
  if (saved.followUpOf) {
    throw new SkillError('FOLLOW_UP_LIMIT', 'Follow-ups are one round only; this response is already a follow-up');
  }
  const followUps = (saved.response.relevance && saved.response.relevance.followUps) || [];
  const index = options.index === undefined ? 0 : Number(options.index);
  const selected = followUps[index];
  if (!Number.isInteger(index) || !selected) {
    throw new SkillError('NOT_FOUND', `No follow-up at index ${options.index ?? 0} (have ${followUps.length})`);
  }
  const gatewayUrl = gatewayUrlFrom({ gatewayUrl: options.gatewayUrl || saved.gatewayUrl });
  const ranking = saved.request.ranking;
  const searchRequest = buildSearchRequest({
    query: selected.query.text,
    mode: selected.query.mode,
    categories: selected.categories,
    limit: options.limit ?? saved.request.page.limit,
    outputLevel: 'metadata',
    strategy: ranking ? ranking.strategy : 'jev',
    ...(ranking && ranking.minRelevance !== undefined ? { minRelevance: ranking.minRelevance } : {}),
  });
  const audienceDid = await resolveGatewayDid(gatewayUrl);
  return writePrepared({
    gatewayUrl,
    audienceDid,
    searchRequest,
    followUpOf: saved.response.queryId || saved.request.requestId,
  });
}

async function render(options) {
  const saved = await readSaved(options.file);
  return success({ command: 'render', ...summarize(saved), savedTo: options.file });
}

async function status(options) {
  const gatewayUrl = gatewayUrlFrom(options);
  const { status: httpStatus, body } = await fetchJson(`${gatewayUrl}/ready`, {}, DID_TIMEOUT_MS);
  return success({ command: 'status', gatewayUrl, ready: httpStatus === 200, readiness: body });
}

const COMMANDS = { prepare, search, 'follow-up': followUp, render, status };

async function main(options = {}) {
  const command = COMMANDS[options.command];
  if (!command) {
    return failure(
      new SkillError('INVALID_REQUEST', `Unknown command; use one of ${Object.keys(COMMANDS).join(', ')}`),
    );
  }
  try {
    return await command(options);
  } catch (error) {
    return failure(error);
  }
}

/** `--key value` / `--key=value` → camelCase options. */
function parseArgs(argv) {
  const options = { command: argv[0] };
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [rawKey, inline] = token.slice(2).split(/=(.*)/s, 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (inline !== undefined) options[key] = inline;
    else if (argv[index + 1] !== undefined && !argv[index + 1].startsWith('--')) {
      options[key] = argv[index + 1];
      index += 1;
    } else options[key] = 'true';
  }
  return options;
}

module.exports = { main, parseArgs, summarize };

if (require.main === module) {
  if (process.argv.length < 3) {
    process.stdout.write(
      `${JSON.stringify(failure(new SkillError('INVALID_REQUEST', 'Usage: node jev-search.js <prepare|search|follow-up|render|status> [--options]')))}\n`,
    );
    process.exit(1);
  }
  main(parseArgs(process.argv.slice(2))).then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exit(result.success ? 0 : 1);
  });
}
