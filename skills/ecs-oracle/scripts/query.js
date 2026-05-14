#!/usr/bin/env node
/**
 * query.js — Run a SQL query against an already-vaulted ECS dataset.
 *
 * Usage:
 *   node scripts/query.js <artifactPath> "<sql>"
 *
 * Where:
 *   <artifactPath>  The `artifact.path` field from a prior `fetch.js` call,
 *                   e.g. /workspace/data/output/ecs-oracle/customers-….json
 *   <sql>           A DuckDB SELECT (or WITH ... SELECT) statement. The SQL
 *                   may reference the dataset with the literal placeholder
 *                   `{table}` OR with the table name `rows`. Both are
 *                   rewritten to the same in-memory view over the JSON
 *                   artifact.
 *
 * Output (stdout, single line of JSON):
 *   {
 *     "success": true,
 *     "artifact": {"path": "..."},
 *     "rowCount": <number of result rows>,
 *     "rows": [...]
 *   }
 * Output is hard-capped at 100 KB so the agent's context window stays safe.
 * If the result would exceed the budget the script returns
 *   { "success": false, "errorType": "RESULT_TOO_LARGE", ... }
 * with recovery guidance.
 *
 * Examples (agent-facing):
 *   node scripts/query.js <path> "SELECT count(*) AS n FROM {table}"
 *   node scripts/query.js <path> "SELECT country, count(*) AS n FROM {table} \
 *                                 GROUP BY country ORDER BY n DESC LIMIT 20"
 *   node scripts/query.js <path> "SELECT customer_id, full_name FROM {table} \
 *                                 WHERE cx_status = 'active' LIMIT 50"
 */

const { DuckDBInstance } = require('@duckdb/node-api');
const { emitFailure, safeStat } = require('./lib/runtime');

const MAX_OUTPUT_BYTES = 100_000;
const TABLE_NAME = 'rows';

/* ------------------------------------------------------------------------ */
/* SQL safety                                                                */
/* ------------------------------------------------------------------------ */

// Allow read-only SQL only. DuckDB happily executes destructive statements
// (CREATE / INSERT / DELETE / ATTACH / INSTALL / LOAD …) so we must filter
// up-front rather than rely on the engine. We also block multi-statement
// payloads — DuckDB's API can execute a sequence of statements separated
// by semicolons, which would let an attacker append an INSERT after the
// SELECT. A single trailing semicolon is fine and stripped.
const ALLOWED_PREFIX = /^(SELECT|WITH)\b/i;

const FORBIDDEN_PATTERNS = [
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bDROP\b/i,
  /\bCREATE\b/i,
  /\bALTER\b/i,
  /\bTRUNCATE\b/i,
  /\bATTACH\b/i,
  /\bDETACH\b/i,
  /\bCOPY\b/i,
  /\bEXPORT\b/i,
  /\bIMPORT\b/i,
  /\bINSTALL\b/i,
  /\bLOAD\b/i,
  /\bPRAGMA\b/i,
  /\bSET\b/i,
];

function validateSql(sql) {
  const trimmed = sql.trim().replace(/;\s*$/, '');

  if (!ALLOWED_PREFIX.test(trimmed)) {
    throw typedError(
      'BAD_QUERY',
      'Only SELECT or WITH...SELECT statements are allowed.',
    );
  }

  // Reject anything with embedded semicolons (multi-statement attack vector).
  if (/;/.test(trimmed)) {
    throw typedError(
      'BAD_QUERY',
      'Multiple statements not allowed — submit a single SELECT.',
    );
  }

  for (const pat of FORBIDDEN_PATTERNS) {
    if (pat.test(trimmed)) {
      throw typedError(
        'BAD_QUERY',
        `Forbidden keyword in query (${pat.source}). Only read-only SELECTs are permitted.`,
      );
    }
  }

  return trimmed;
}

/**
 * Replace the agent-facing `{table}` placeholder with the actual DuckDB
 * view name. Idempotent — if the agent already wrote `FROM rows` directly,
 * we leave that alone.
 */
function applyTablePlaceholder(sql) {
  return sql.replace(/\{table\}/gi, TABLE_NAME);
}

/* ------------------------------------------------------------------------ */
/* DuckDB                                                                    */
/* ------------------------------------------------------------------------ */

async function runQuery(artifactPath, sql) {
  const instance = await DuckDBInstance.create(':memory:');
  let connection;
  try {
    connection = await instance.connect();

    // Wire the artifact in as a view named `rows`. DuckDB's `read_json_auto`
    // detects the schema from the JSON itself; it streams the file once
    // per query so memory stays bounded even for large artifacts. We pass
    // `compression='gzip'` explicitly when the path ends in `.gz` so DuckDB
    // doesn't have to rely on extension sniffing — and so old uncompressed
    // `.json` artifacts (from before the gzip switch) still work.
    const safeLiteral = escapeSqlLiteral(artifactPath);
    const isGzipped = artifactPath.toLowerCase().endsWith('.gz');
    const compressionArg = isGzipped ? `, compression='gzip'` : '';
    await connection.run(
      `CREATE OR REPLACE VIEW ${TABLE_NAME} AS SELECT * FROM read_json_auto('${safeLiteral}'${compressionArg})`,
    );

    const reader = await connection.runAndReadAll(sql);
    const resultRows = reader.getRowObjects();
    return resultRows;
  } finally {
    try {
      if (connection && typeof connection.closeSync === 'function') {
        connection.closeSync();
      }
    } catch {
      /* best-effort */
    }
    try {
      if (typeof instance.closeSync === 'function') instance.closeSync();
    } catch {
      /* best-effort */
    }
  }
}

/** Escape a single-quoted SQL literal — covers paths with embedded quotes. */
function escapeSqlLiteral(s) {
  return String(s).replace(/'/g, "''");
}

/* ------------------------------------------------------------------------ */
/* JSON serialization (handle BigInt etc.)                                   */
/* ------------------------------------------------------------------------ */

/**
 * JSON.stringify replacer that:
 *   - converts BigInt → number if it fits in Number.MAX_SAFE_INTEGER,
 *     else stringifies it (preserving the digits losslessly).
 *   - converts Date → ISO string.
 *   - leaves typed arrays / Buffers as-is (DuckDB doesn't surface them
 *     for read_json_auto on row data, but be defensive).
 */
function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') {
    if (
      value <= BigInt(Number.MAX_SAFE_INTEGER) &&
      value >= BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      return Number(value);
    }
    return value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

/* ------------------------------------------------------------------------ */
/* entry point                                                               */
/* ------------------------------------------------------------------------ */

async function main() {
  const artifactPath = process.argv[2];
  const sqlArg = process.argv[3];

  if (!artifactPath) {
    emitFailure(
      'BAD_INPUT',
      'Missing <artifactPath>. Usage: node scripts/query.js <artifactPath> "<sql>"',
    );
  }
  if (!sqlArg) {
    emitFailure(
      'BAD_INPUT',
      'Missing <sql>. Pass a single DuckDB SELECT statement as the second argument.',
    );
  }

  const stats = await safeStat(artifactPath);
  if (!stats) {
    emitFailure(
      'ARTIFACT_NOT_FOUND',
      `No artifact at ${artifactPath} on the R2-backed mount. Re-run fetch.js to repopulate it, then retry.`,
    );
  }

  let sql;
  try {
    sql = validateSql(applyTablePlaceholder(sqlArg));
  } catch (err) {
    emitFailure(
      err.errorType ?? 'BAD_QUERY',
      err.message ?? 'Query validation failed',
    );
  }

  let resultRows;
  try {
    resultRows = await runQuery(artifactPath, sql);
  } catch (err) {
    emitFailure(
      'QUERY_FAILED',
      `DuckDB rejected the query: ${err && err.message ? err.message : String(err)}`,
    );
  }

  // Build the response envelope and apply the byte-budget guard before
  // writing anything to stdout. This is the same 100 KB cap the old custom
  // engine enforced — its only purpose is to stop a runaway SELECT from
  // flooding the agent's context window.
  const envelope = {
    artifact: { path: artifactPath },
    rowCount: resultRows.length,
    rows: resultRows,
  };

  let serialized;
  try {
    serialized = JSON.stringify({ success: true, ...envelope }, jsonReplacer);
  } catch (err) {
    emitFailure(
      'SERIALIZE_FAILED',
      `Failed to serialize result: ${err.message}`,
    );
  }

  if (serialized.length > MAX_OUTPUT_BYTES) {
    emitFailure(
      'RESULT_TOO_LARGE',
      `Result is ${Math.round(serialized.length / 1024)} KB, exceeds the ${Math.round(MAX_OUTPUT_BYTES / 1024)} KB budget. The query returned ${resultRows.length} rows.`,
      {
        byteSize: serialized.length,
        byteLimit: MAX_OUTPUT_BYTES,
        rowCount: resultRows.length,
        _recovery: `Tighten the query so it returns less data. Options:
1. Aggregate instead of projecting: SELECT count(*), SELECT avg(...), GROUP BY ...
2. Add or tighten a WHERE clause to filter rows.
3. Project fewer columns — drop ones you don't need.
4. Use LIMIT to cap the row count when you only need samples.
5. If the user wants to *see* the data, render an AG-UI table instead — the frontend's DuckDB-WASM can handle arbitrarily large results client-side.`,
      },
    );
  }

  process.stdout.write(serialized + '\n');
  process.exit(0);
}

main().catch((err) => {
  emitFailure(
    'UNEXPECTED_ERROR',
    err instanceof Error ? err.message : String(err),
  );
});

/* ------------------------------------------------------------------------ */
/* utils                                                                     */
/* ------------------------------------------------------------------------ */

function typedError(errorType, message) {
  const err = new Error(message);
  err.errorType = errorType;
  return err;
}
