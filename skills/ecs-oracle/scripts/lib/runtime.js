/**
 * Shared runtime helpers for the ECS Oracle skill.
 *
 * Centralises:
 *   - reading injected oracle/user secrets from process.env
 *   - resolving output paths under /workspace/data/output/ecs-oracle/
 *   - small print-and-exit helpers so both fetch.js and query.js produce
 *     consistent JSON envelopes the agent can parse without surprises
 */

const { mkdir, stat } = require('node:fs/promises');
const { dirname, join, basename } = require('node:path');

/** Where artifacts go. R2 picks them up via FUSE mount automatically. */
const OUTPUT_ROOT = '/workspace/data/output/ecs-oracle';

/**
 * Read an oracle-scoped secret (injected via `x-os-{NAME}` headers when the
 * agent calls `sandbox_run` with this skill's CID). Returns `undefined` if
 * the secret isn't set — callers decide whether that's fatal.
 */
function oracleSecret(name) {
  return process.env[`_ORACLE_SECRET_${name.toUpperCase()}`];
}

/** Read a user-scoped secret (rare for this skill). */
function userSecret(name) {
  return process.env[`_USER_SECRET_${name.toUpperCase()}`];
}

/**
 * Read a skill-context value the sandbox injects automatically:
 *   - _SKILL_CONTEXT_USER_DID
 *   - _SKILL_CONTEXT_SANDBOX_ID
 *   - _SKILL_CONTEXT_TIMESTAMP
 */
function skillContext(name) {
  return process.env[`_SKILL_CONTEXT_${name.toUpperCase()}`];
}

/**
 * Build a deterministic artifact filename:
 *   `<dataset>-<isoTimestamp>.json.gz`
 *
 * The `.gz` suffix is the source of truth: every layer that touches the
 * artifact (DuckDB in `query.js`, the front-end `data-vault-fetch.ts`) keys
 * its decompression on the extension. Changing this also requires updating
 * those consumers.
 */
function buildArtifactPath(dataset) {
  const safeDataset = dataset.replace(/[^a-z0-9_-]/gi, '_');
  // Filesystem-safe ISO: replace colons (illegal on some filesystems / URLs)
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return join(OUTPUT_ROOT, `${safeDataset}-${ts}.json.gz`);
}

/** Ensure the parent directory exists before a write. */
async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

/** Print a structured success envelope and exit 0. */
function emitSuccess(payload) {
  process.stdout.write(`${JSON.stringify({ success: true, ...payload })}\n`);
  process.exit(0);
}

/**
 * Print a structured failure envelope and exit 1. The agent inspects
 * `errorType` to decide whether to retry, surface to the user, or pivot.
 */
function emitFailure(errorType, message, extra = {}) {
  const payload = {
    success: false,
    errorType,
    error: message,
    ...extra,
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(1);
}

/**
 * Stat a file safely. Returns null if it doesn't exist, throws on other
 * errors so we don't mask permission problems.
 */
async function safeStat(path) {
  try {
    return await stat(path);
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

module.exports = {
  OUTPUT_ROOT,
  oracleSecret,
  userSecret,
  skillContext,
  buildArtifactPath,
  ensureDir,
  emitSuccess,
  emitFailure,
  safeStat,
  basename,
};
