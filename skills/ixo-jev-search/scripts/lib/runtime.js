/**
 * Shared runtime helpers for the ixo-jev-search skill (capsule sandbox).
 *
 *   - skill-scoped data paths (overridable for tests)
 *   - skill-context readers injected by the sandbox
 *   - one-line JSON success/failure envelopes on stdout
 */

const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');

/** Request + authorization hand-off files (host writes the authorization file). */
function dataDir() {
  return process.env.IXO_JEV_SEARCH_DATA_DIR || '/workspace/data/ixo-jev-search';
}

/** Saved responses; the R2-backed mount persists them across sandboxes. */
function outputDir() {
  return process.env.IXO_JEV_SEARCH_OUTPUT_DIR || '/workspace/data/output/ixo-jev-search';
}

function requestPath() {
  return join(dataDir(), 'request.json');
}

function authorizationPath() {
  return join(dataDir(), 'authorization');
}

/** Values the sandbox injects automatically (declared under `context:`). */
function skillContext(name) {
  return process.env[`_SKILL_CONTEXT_${name.toUpperCase()}`];
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

class SkillError extends Error {
  constructor(errorType, message, extra = {}) {
    super(message);
    this.name = 'SkillError';
    this.errorType = errorType;
    this.extra = extra;
  }
}

function success(payload) {
  return { success: true, ...payload };
}

function failure(error) {
  if (error instanceof SkillError) {
    return { success: false, errorType: error.errorType, error: error.message, ...error.extra };
  }
  if (error && error.name === 'RequestError') {
    return { success: false, errorType: 'INVALID_REQUEST', error: error.message };
  }
  return {
    success: false,
    errorType: 'UNEXPECTED',
    error: error instanceof Error ? error.message : String(error),
  };
}

module.exports = {
  dataDir,
  outputDir,
  requestPath,
  authorizationPath,
  skillContext,
  ensureDir,
  SkillError,
  success,
  failure,
};
