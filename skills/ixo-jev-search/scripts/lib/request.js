/**
 * Builds IXO Search Gateway requests and computes the request digest (`rd`)
 * that the per-request UCAN invocation must carry.
 *
 * The digest MUST be byte-identical to the gateway's
 * `createAuthorizationVerificationRequest(...).requestDigest`: sha256 over the
 * canonical JSON of the authorization verification request (requestDigest
 * omitted). The gateway publishes test vectors for this; see
 * tests/fixtures/request-digest-vectors.json.
 *
 * Every request is built fully explicit (no field left to a server default),
 * so the gateway's schema parse is the identity and both sides hash the same
 * object.
 */

const { createHash, randomUUID } = require('node:crypto');

const SEARCH_SCHEMA_VERSION = 'ixo.search.v1';
const AUTHORIZATION_SCHEMA_VERSION = 'ixo.search.authorization.v1';

/** Gateway PUBLIC_SEARCH_CATEGORIES: what `"all"` expands to in the digest. */
const PUBLIC_SEARCH_CATEGORIES = [
  'domains', 'files', 'people', 'agents', 'flows', 'actions', 'tasks',
  'transactions', 'claims', 'events', 'messages', 'memory', 'notifications', 'web',
];
const CATEGORY_SELECTORS = new Set([
  ...PUBLIC_SEARCH_CATEGORIES, 'capabilities', 'traces', 'all',
]);
const MODES = new Set(['keyword', 'semantic', 'hybrid']);
const FACET_KEYS = new Set([
  'category', 'objectType', 'source', 'labels', 'domainType', 'status', 'owner',
  'mimeType', 'visibility', 'freshness', 'sensitivity',
]);
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

class RequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RequestError';
  }
}

function hasControlCharacters(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint <= 31 || codePoint === 127;
  });
}

function uniqueList(value, allowed, field, { min = 0, max = 16 } = {}) {
  const list = Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
  if (list.length < min || list.length > max) {
    throw new RequestError(`${field} must have ${min}..${max} entries`);
  }
  if (new Set(list).size !== list.length) {
    throw new RequestError(`${field} entries must be unique`);
  }
  for (const item of list) {
    if (!allowed.has(item)) throw new RequestError(`Unknown ${field} value: ${item}`);
  }
  return list;
}

/**
 * Builds a fully explicit `ixo.search.v1` search request.
 *
 * @param {object} options
 * @param {string} options.query          natural-language need or exact identifier
 * @param {string} [options.mode]         keyword | semantic | hybrid (default hybrid)
 * @param {string|string[]} [options.categories] default "domains"
 * @param {number} [options.limit]        1..20 (default 10)
 * @param {string} [options.outputLevel]  metadata | snippets (default metadata)
 * @param {string|string[]} [options.facets]
 * @param {boolean} [options.explanations] default true
 * @param {string} [options.strategy]     jev | federated | none (default jev)
 * @param {number} [options.minRelevance] 0..0.5 (jev only)
 * @param {string} [options.requestId]
 */
function buildSearchRequest(options) {
  const text = String(options.query ?? '').trim();
  if (text.length < 1 || text.length > 4096) {
    throw new RequestError('query must be 1..4096 characters');
  }
  if (hasControlCharacters(text)) {
    throw new RequestError('query cannot contain control characters');
  }
  const mode = options.mode ?? 'hybrid';
  if (!MODES.has(mode)) throw new RequestError('mode must be keyword, semantic, or hybrid');
  const categories = uniqueList(options.categories ?? 'domains', CATEGORY_SELECTORS, 'categories', {
    min: 1,
  });
  const limit = options.limit === undefined ? 10 : Number(options.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new RequestError('limit must be an integer 1..20');
  }
  const outputLevel = options.outputLevel ?? 'metadata';
  if (outputLevel !== 'metadata' && outputLevel !== 'snippets') {
    throw new RequestError('outputLevel must be metadata or snippets');
  }
  const facets = uniqueList(options.facets ?? [], FACET_KEYS, 'facets', { max: 10 });
  const explanations =
    options.explanations === undefined ? true : String(options.explanations) !== 'false';
  const strategy = options.strategy ?? 'jev';
  if (!['jev', 'federated', 'none'].includes(strategy)) {
    throw new RequestError('strategy must be jev, federated, or none');
  }
  let ranking;
  if (strategy !== 'none') {
    ranking = { strategy };
    if (options.minRelevance !== undefined) {
      const minRelevance = Number(options.minRelevance);
      if (!Number.isFinite(minRelevance) || minRelevance < 0 || minRelevance > 0.5) {
        throw new RequestError('minRelevance must be a number 0..0.5');
      }
      ranking.minRelevance = minRelevance;
    }
  }
  const requestId = options.requestId ?? `req_jev_${randomUUID().replace(/-/g, '')}`;
  if (requestId.length > 128 || !REQUEST_ID_PATTERN.test(requestId)) {
    throw new RequestError('requestId must match ^[A-Za-z0-9][A-Za-z0-9._:-]*$ (max 128)');
  }
  return {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    requestId,
    query: { text, mode },
    categories,
    scope: { kind: 'actor_default' },
    include: { outputLevel, facets, explanations },
    page: { limit },
    ...(ranking ? { ranking } : {}),
  };
}

/** The gateway's canonical JSON: sorted keys, undefined object members dropped. */
function canonicalJson(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return `{${entries
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(',')}}`;
}

/**
 * Computes the request digest the invocation's `rd` fact must carry.
 * `searchRequest` must be fully explicit (as built by buildSearchRequest).
 */
function computeRequestDigest(audienceDid, searchRequest) {
  const categories = searchRequest.categories.includes('all')
    ? [...PUBLIC_SEARCH_CATEGORIES]
    : searchRequest.categories;
  const binding = {
    schemaVersion: AUTHORIZATION_SCHEMA_VERSION,
    requestId: searchRequest.requestId,
    audienceDid,
    operation: 'search',
    searchRequest,
    requestedScope: searchRequest.scope,
    categories,
    mode: searchRequest.query.mode,
    outputLevel: searchRequest.include.outputLevel,
    limit: searchRequest.page.limit,
    facets: searchRequest.include.facets,
  };
  return createHash('sha256').update(canonicalJson(binding), 'utf8').digest('hex');
}

module.exports = {
  SEARCH_SCHEMA_VERSION,
  AUTHORIZATION_SCHEMA_VERSION,
  PUBLIC_SEARCH_CATEGORIES,
  RequestError,
  buildSearchRequest,
  canonicalJson,
  computeRequestDigest,
};
