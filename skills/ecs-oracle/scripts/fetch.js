#!/usr/bin/env node
/**
 * fetch.js — Fetch an ECS dataset over the REST API and offload it to the
 * sandbox's R2 vault as a gzipped JSON artifact.
 *
 * Usage:
 *   node scripts/fetch.js <dataset>
 *
 * Datasets:
 *   customers  → GET ${ECS_BASE_URL}/data/customers
 *   claims     → GET ${ECS_BASE_URL}/data/thousand-day-household-claims
 *
 * The ECS server runs Express's `compression()` middleware, so JSON responses
 * are gzipped on the wire — Node's built-in fetch decodes transparently. The
 * artifact we then write to disk is itself gzipped (`.json.gz`) so the R2
 * upload, the eventual front-end download, AND the storage footprint all
 * benefit. DuckDB's `read_json_auto` handles `.json.gz` natively.
 *
 * Writes:
 *   /workspace/data/output/ecs-oracle/<dataset>-<isoTs>.json.gz
 *
 * Prints:
 *   A small JSON envelope (success | failure) — see SKILL.md for the shape.
 *   stdout is the agent's contract; stderr is for human-readable timing logs.
 */

const { createWriteStream } = require('node:fs');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');
const { createGzip } = require('node:zlib');

const {
  buildArtifactPath,
  basename,
  ensureDir,
  emitFailure,
  emitSuccess,
  oracleSecret,
} = require('./lib/runtime');

/* ------------------------------------------------------------------------ */
/* dataset definitions                                                       */
/* ------------------------------------------------------------------------ */

/**
 * Map dataset slug → REST endpoint spec.
 *
 *   path     : URL path on the ECS server (relative to ECS_BASE_URL)
 *   rowsAt   : the key inside the JSON response that holds the row array
 *   totalAt  : the key holding the total count (informational)
 *   query    : optional default query string (e.g. `?limit=…`)
 */
const DATASETS = {
  customers: {
    path: '/data/customers',
    rowsAt: 'customers',
    totalAt: 'total',
    query: '',
  },
  claims: {
    path: '/data/thousand-day-household-claims',
    rowsAt: 'claims',
    totalAt: 'total',
    query: '',
  },
};

/* ------------------------------------------------------------------------ */
/* main                                                                      */
/* ------------------------------------------------------------------------ */

async function main() {
  const datasetSlug = process.argv[2];
  if (!datasetSlug || !DATASETS[datasetSlug]) {
    emitFailure(
      'BAD_INPUT',
      `Unknown dataset "${datasetSlug ?? '(missing)'}". Supported: ${Object.keys(DATASETS).join(', ')}`,
    );
  }

  // Secrets are injected by the oracle as x-os-* headers when sandbox_run is
  // invoked with this skill's CID. Without them, exit cleanly so the agent
  // sees a deterministic error instead of a network failure.
  //
  // The env var is still named `ECS_MCP_URL` for deployment back-compat —
  // production already has it set. The deployed value points at the MCP
  // endpoint (`https://…/mcp`); we strip that suffix before building REST
  // URLs so the same env var works for both the old MCP path and the new
  // REST path. `ECS_BASE_URL` is accepted as an alias for cleaner local dev.
  const rawBaseUrl =
    oracleSecret('ECS_BASE_URL') ?? oracleSecret('ECS_MCP_URL');
  const authToken =
    oracleSecret('ECS_API_TOKEN') ?? oracleSecret('ECS_MCP_AUTH_TOKEN');

  if (!rawBaseUrl || !authToken) {
    emitFailure(
      'MISSING_SECRET',
      "Required secrets not in environment. Oracle must inject ECS_MCP_URL and ECS_MCP_AUTH_TOKEN via x-os-* headers. Check that the agent is calling sandbox_run WITH this skill's cid.",
      {
        have_ECS_MCP_URL: Boolean(rawBaseUrl),
        have_ECS_MCP_AUTH_TOKEN: Boolean(authToken),
      },
    );
  }

  // Normalise: trim trailing slashes, then strip a trailing `/mcp` segment
  // so the env var can keep pointing at the legacy MCP endpoint while we
  // talk to the REST endpoints under the same host.
  const baseUrl = rawBaseUrl
    .replace(/\/+$/, '')
    .replace(/\/mcp$/i, '');

  const spec = DATASETS[datasetSlug];
  const url = `${baseUrl}${spec.path}${spec.query}`;

  // -- HTTP fetch --------------------------------------------------------
  // Node's built-in fetch sends Accept-Encoding: gzip,deflate by default and
  // transparently decodes the response body, so we get plain JSON in memory
  // even though the wire payload is gzipped (~5-8× smaller for this shape).
  let payload;
  try {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 120_000);

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(deadline);
    }

    if (!response.ok) {
      const status = response.status;
      const bodyText = await response.text().catch(() => '');
      emitFailure(
        status === 401 || status === 403
          ? 'AUTH_FAILED'
          : status === 404
            ? 'NOT_FOUND'
            : 'UPSTREAM_UNAVAILABLE',
        `ECS REST ${spec.path} returned HTTP ${status}`,
        {
          status,
          body: bodyText.slice(0, 500),
        },
      );
    }

    payload = await response.json();
  } catch (err) {
    if (err && err.name === 'AbortError') {
      emitFailure('TIMEOUT', `ECS REST call timed out after 120s for ${spec.path}`);
    }
    emitFailure(
      'UPSTREAM_UNAVAILABLE',
      err instanceof Error ? err.message : String(err),
    );
  }

  // -- shape check -------------------------------------------------------
  const rows = payload?.[spec.rowsAt];
  if (!Array.isArray(rows)) {
    emitFailure(
      'UNEXPECTED_SHAPE',
      `ECS endpoint ${spec.path} returned an unexpected response — expected an array at result.${spec.rowsAt} but got ${rows === undefined ? 'undefined' : typeof rows}`,
      {
        topLevelKeys:
          payload && typeof payload === 'object' ? Object.keys(payload) : [],
      },
    );
  }

  // -- serialise rows ----------------------------------------------------
  // Stringify once, separately from the gzip step, so we can compute the
  // describeRows summary without round-tripping through gunzip later.
  let serializedRows;
  try {
    serializedRows = JSON.stringify(rows);
  } catch (err) {
    emitFailure('SERIALIZE_FAILED', `Failed to stringify rows: ${err.message}`);
  }

  const uncompressedBytes = Buffer.byteLength(serializedRows, 'utf8');

  // -- gzip + write to R2 FUSE mount ------------------------------------
  // pipeline streams the JSON string through createGzip into the file in
  // one pass, so we never materialise the gzipped buffer in memory.
  const artifactPath = buildArtifactPath(datasetSlug);
  try {
    await ensureDir(artifactPath);
    await pipeline(
      Readable.from([serializedRows]),
      createGzip(),
      createWriteStream(artifactPath),
    );
  } catch (err) {
    emitFailure(
      'WRITE_FAILED',
      `Failed to write artifact to ${artifactPath}: ${err.message}`,
    );
  }

  // -- describe (schema + samples + stats) -------------------------------
  const { schema, sampleRows, columnStats } = describeRows(rows);

  // Free the giant string for V8 before we serialize the envelope.
  serializedRows = null;

  emitSuccess({
    dataset: datasetSlug,
    artifact: {
      path: artifactPath,
      filename: basename(artifactPath),
      compression: 'gzip',
      uncompressedBytes,
    },
    rowCount: rows.length,
    upstreamReportedTotal:
      payload && typeof payload[spec.totalAt] === 'number'
        ? payload[spec.totalAt]
        : null,
    schema,
    sampleRows,
    columnStats,
    fetchedAt: new Date().toISOString(),
  });
}

main().catch((err) => {
  // Last-resort guard — emitFailure should already have fired for known
  // errors. This catches genuine unexpected throws.
  emitFailure(
    'UNEXPECTED_ERROR',
    err instanceof Error ? err.message : String(err),
  );
});

/* ------------------------------------------------------------------------ */
/* describeRows — schema, samples, and cheap column stats                    */
/* ------------------------------------------------------------------------ */

/**
 * Produce a small description of a tabular dataset suitable for the agent:
 *   - `schema`        — column names + inferred types
 *   - `sampleRows`    — five evenly-spaced rows (first, mid, last, plus two)
 *   - `columnStats`   — for string-typed columns, the top-5 values + uniques;
 *                       for numeric columns, min/max/sum/avg (approx).
 *
 * All cheap, single-pass over the rows. We deliberately do not materialise
 * extra arrays — everything is accumulated into typed scalar slots so peak
 * extra heap stays small relative to the dataset itself.
 */
function describeRows(rows) {
  if (rows.length === 0) {
    return { schema: [], sampleRows: [], columnStats: {} };
  }

  // 1. Pick representative sample indices — first, last, and ~25/50/75%.
  const sampleIdx = uniqIndices(
    [
      0,
      Math.floor(rows.length * 0.25),
      Math.floor(rows.length * 0.5),
      Math.floor(rows.length * 0.75),
      rows.length - 1,
    ],
    rows.length,
  );

  const sampleRows = sampleIdx.map((i) => rows[i]);

  // 2. Infer schema from the first row's keys, refined by scanning subsequent
  //    rows for non-null values (to upgrade `null` placeholders to real types).
  const inferredTypes = new Map();
  const allKeys = new Set();
  for (const k of Object.keys(rows[0])) allKeys.add(k);

  // Scan all rows to discover any keys not present in row 0, and to upgrade
  // types away from "null" when a real value shows up. Single pass.
  for (const row of rows) {
    if (!row) continue;
    for (const k of Object.keys(row)) {
      allKeys.add(k);
      const prev = inferredTypes.get(k);
      if (prev && prev !== 'null') continue; // already resolved
      inferredTypes.set(k, jsType(row[k]));
    }
  }

  const schema = Array.from(allKeys).map((key) => ({
    key,
    type: inferredTypes.get(key) ?? 'null',
  }));

  // 3. Column stats — only for low-cardinality string columns and numeric
  //    columns, capped to keep this routine O(rows × columns) but constant
  //    extra memory per column. Skip arrays/objects (cardinality unbounded).
  const stats = {};
  for (const col of schema) {
    if (col.type === 'string') {
      stats[col.key] = { uniqueCounter: new Map() };
    } else if (col.type === 'number') {
      stats[col.key] = {
        kind: 'number',
        min: Infinity,
        max: -Infinity,
        sum: 0,
        count: 0,
      };
    }
  }

  const STRING_TOP_K = 5;
  const STRING_MAX_UNIQUE_TRACKED = 1000;

  for (const row of rows) {
    if (!row) continue;
    for (const col of schema) {
      const v = row[col.key];
      if (v === null || v === undefined) continue;
      const s = stats[col.key];
      if (!s) continue;

      if (s.kind === 'number') {
        if (typeof v === 'number') {
          if (v < s.min) s.min = v;
          if (v > s.max) s.max = v;
          s.sum += v;
          s.count += 1;
        }
        continue;
      }

      // string column
      if (s.uniqueCounter && typeof v === 'string') {
        if (s.uniqueCounter.size < STRING_MAX_UNIQUE_TRACKED) {
          s.uniqueCounter.set(v, (s.uniqueCounter.get(v) ?? 0) + 1);
        } else if (s.uniqueCounter.has(v)) {
          s.uniqueCounter.set(v, s.uniqueCounter.get(v) + 1);
        }
      }
    }
  }

  // 4. Reduce per-column accumulators to a small JSON-safe shape.
  const columnStats = {};
  for (const [col, s] of Object.entries(stats)) {
    if (s.kind === 'number') {
      if (s.count === 0) continue;
      columnStats[col] = {
        kind: 'number',
        min: s.min,
        max: s.max,
        sum: s.sum,
        avg: s.sum / s.count,
        count: s.count,
      };
    } else {
      const unique = s.uniqueCounter.size;
      if (unique === 0) continue;
      const top = Array.from(s.uniqueCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, STRING_TOP_K)
        .map(([value, count]) => ({ value, count }));
      columnStats[col] = { kind: 'string', unique, top };
    }
  }

  return { schema, sampleRows, columnStats };
}

function jsType(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'object') return 'object';
  return typeof v; // "string" | "number" | "boolean"
}

function uniqIndices(idxs, length) {
  const seen = new Set();
  const out = [];
  for (const i of idxs) {
    const clamped = Math.max(0, Math.min(length - 1, i));
    if (!seen.has(clamped)) {
      seen.add(clamped);
      out.push(clamped);
    }
  }
  return out.sort((a, b) => a - b);
}
