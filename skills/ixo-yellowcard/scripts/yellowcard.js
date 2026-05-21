#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Worker URL
// ---------------------------------------------------------------------------
// Default base URL baked into the skill. The flow can override this by
// setting `workerBaseUrl` on the payment block — the oracle then forwards
// it to the skill via the `--worker-url=<url>` flag (works on every command).
//
// Resolution order: --worker-url flag > DEFAULT_WORKER_BASE_URL.

const DEFAULT_WORKER_BASE_URL =
  'https://yellowcard-worker-testnet.ixo-api.workers.dev';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// Skill-scoped path so the token can't collide with another skill's token
// in the same sandbox. Hosts must write the freshly-minted invocation here
// before each protected call.
const UCAN_TOKEN_PATH = '/workspace/data/ixo-yellowcard/ucan_token';

function getUcanToken() {
  try {
    const token = fs.readFileSync(UCAN_TOKEN_PATH, 'utf8').trim();
    if (token) return token;
  } catch {
    // fall through to fatal
  }
  fatal(
    `Missing UCAN token at ${UCAN_TOKEN_PATH} — ` +
      'the oracle must write the freshly-minted UCAN invocation (Base64 CAR) to this file before running this command. ' +
      'Run `mkdir -p /workspace/data/ixo-yellowcard` once first if the directory does not exist.'
  );
}

// ---------------------------------------------------------------------------
// HTTP Client
// ---------------------------------------------------------------------------

function resolveWorkerBaseUrl() {
  const flag = parseArgs()['worker-url'];
  const raw =
    (typeof flag === 'string' && flag.trim()) || DEFAULT_WORKER_BASE_URL;
  return raw.replace(/\/+$/, '');
}

async function workerRequest(method, urlPath, body) {
  const url = `${resolveWorkerBaseUrl()}${urlPath}`;
  const headers = { Accept: 'application/json' };
  const isProtected = requiresAuth(urlPath);

  // Add auth for protected endpoints
  if (isProtected) {
    const token = getUcanToken();
    headers['Authorization'] = `Bearer ${token}`;
    // Stderr-only diagnostic (never log token contents).
    process.stderr.write(
      `[yellowcard.js] ${method.toUpperCase()} ${url} — Bearer token attached (length=${token.length})\n`
    );
  } else {
    process.stderr.write(`[yellowcard.js] ${method.toUpperCase()} ${url}\n`);
  }

  if (body) headers['Content-Type'] = 'application/json';

  const opts = { method: method.toUpperCase(), headers };
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    process.stderr.write(
      `[yellowcard.js] fetch failed for ${url}: ${err && err.message ? err.message : err}\n`
    );
    fatal(
      `Could not reach worker at ${url}: ${err && err.message ? err.message : err}`
    );
  }

  process.stderr.write(
    `[yellowcard.js] ${url} → ${res.status} ${res.statusText}\n`
  );

  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }

  if (!res.ok) {
    process.stderr.write(
      `[yellowcard.js] non-OK body: ${typeof data === 'string' ? data : JSON.stringify(data)}\n`
    );
    fatal(
      (data && data.message) ||
        `Worker returned ${res.status}: ${JSON.stringify(data)}`
    );
  }

  return data;
}

function requiresAuth(urlPath) {
  return urlPath.startsWith('/balance') || urlPath.startsWith('/payouts');
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function fatal(message) {
  console.log(JSON.stringify({ error: true, message }, null, 2));
  process.exit(1);
}

const OUTPUT_DIR = '/workspace/output';
const COMMAND_OUTPUT_FILES = {
  discover: 'discover.json',
  rates: 'rates.json',
  balance: 'balance.json',
  'propose-payout': 'proposal.json',
  'execute-payout': 'execute-result.json',
  'check-payout': 'check-result.json',
};

function output(data) {
  const json = JSON.stringify(data, null, 2);
  console.log(json);

  const command = process.argv[2];
  const filename = COMMAND_OUTPUT_FILES[command];
  if (filename) {
    try {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), json);
    } catch {
      // Silently ignore file write errors (may not be in sandbox)
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(3);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const stripped = arg.slice(2);

    // `--key=value` form (single arg with `=`).
    const eqIdx = stripped.indexOf('=');
    if (eqIdx !== -1) {
      const key = stripped.slice(0, eqIdx);
      const value = stripped.slice(eqIdx + 1);
      parsed[key] = value;
      continue;
    }

    // `--key value` form (two args).
    if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
      parsed[stripped] = args[i + 1];
      i++;
      continue;
    }

    // Bare flag.
    parsed[stripped] = true;
  }
  return parsed;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      const trimmed = data.trim();
      if (!trimmed) {
        resolve(null); // empty stdin
        return;
      }
      try {
        resolve(JSON.parse(trimmed));
      } catch (e) {
        reject(new Error(`Invalid JSON on stdin: ${e.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------
//
// The worker is batch-only — every request body wraps an array. These
// helpers normalize the caller's input into the expected shape so the
// oracle (or a manual CLI user) doesn't have to know whether they're
// passing a single item or many.
//
// Acceptable inputs for an `items`-style command (propose / execute):
//   - { items: [...] }       → passed through
//   - [...]                  → wrapped as { items: [...] }
//   - { ... } single object  → wrapped as { items: [{...}] }
//
// Acceptable inputs for an `ids`-style command (status):
//   - { ids: [...] }         → passed through
//   - [...]                  → wrapped as { ids: [...] }
//   - string                 → wrapped as { ids: [string] }
//
// Similarly for `countries` (discover) and `currencies` (rates), but those
// also accept a comma-separated `--countries=NG,KE` / `--currencies=NGN,KES`
// flag for ergonomic CLI use.

function normaliseBatchWrapper(input, key) {
  if (input == null) return null;
  if (Array.isArray(input)) return { [key]: input };
  if (typeof input === 'object') {
    if (Array.isArray(input[key])) return { [key]: input[key] };
    // Treat a single object as a 1-item batch.
    return { [key]: [input] };
  }
  return null;
}

function parseCommaList(value) {
  if (typeof value !== 'string') return null;
  const parts = value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdDiscover() {
  const args = parseArgs();
  let countries = null;

  // Highest priority: stdin (the oracle constructs the batch programmatically).
  let stdinInput = null;
  if (!process.stdin.isTTY) {
    try {
      stdinInput = await readStdin();
    } catch (e) {
      fatal(e.message);
    }
  }
  if (stdinInput) {
    const wrapped = normaliseBatchWrapper(stdinInput, 'countries');
    if (wrapped) countries = wrapped.countries;
  }

  // CLI fallbacks: --countries=NG,KE or legacy --country=NG.
  if (!countries) {
    const flagList =
      parseCommaList(args.countries) ||
      (typeof args.country === 'string' ? [args.country] : null);
    if (flagList) countries = flagList;
  }

  if (!countries || countries.length === 0) {
    fatal(
      'No countries provided. Pipe JSON `{"countries":["NG","KE"]}` to stdin OR pass --countries=NG,KE'
    );
  }

  const data = await workerRequest('POST', '/channels', { countries });
  output(data);
}

async function cmdRates() {
  const args = parseArgs();
  let currencies = null;

  let stdinInput = null;
  if (!process.stdin.isTTY) {
    try {
      stdinInput = await readStdin();
    } catch (e) {
      fatal(e.message);
    }
  }
  if (stdinInput) {
    const wrapped = normaliseBatchWrapper(stdinInput, 'currencies');
    if (wrapped) currencies = wrapped.currencies;
  }

  if (!currencies) {
    const flagList =
      parseCommaList(args.currencies) ||
      (typeof args.currency === 'string' ? [args.currency] : null);
    if (flagList) currencies = flagList;
  }

  if (!currencies || currencies.length === 0) {
    fatal(
      'No currencies provided. Pipe JSON `{"currencies":["NGN","KES"]}` to stdin OR pass --currencies=NGN,KES'
    );
  }

  const data = await workerRequest('POST', '/rates', { currencies });
  output(data);
}

async function cmdBalance() {
  // Balance is not yet batched — it's a single org-level fetch that doesn't
  // benefit from batching. Kept as a plain GET.
  const data = await workerRequest('GET', '/balance');
  output(data);
}

async function cmdProposePayout() {
  let stdinInput;
  try {
    stdinInput = await readStdin();
  } catch (e) {
    fatal(e.message);
  }
  const wrapped = normaliseBatchWrapper(stdinInput, 'items');
  if (!wrapped || !Array.isArray(wrapped.items) || wrapped.items.length === 0) {
    fatal(
      'No items provided. Pipe JSON `{"items":[{...},{...}]}` (or a bare array, or a single object) to stdin.'
    );
  }
  const data = await workerRequest('POST', '/payouts/propose', wrapped);
  output(data);
}

async function cmdExecutePayout() {
  let stdinInput;
  try {
    stdinInput = await readStdin();
  } catch (e) {
    fatal(e.message);
  }

  // Each item must carry the trio `{ proposal_id, requester_did, transfer_payload }`.
  // Allow callers to pipe the full propose-response items array directly — we
  // strip to the trio for the executor.
  const normaliseItem = item => {
    if (!item || typeof item !== 'object') return null;
    const { proposal_id, requester_did, transfer_payload } = item;
    if (!proposal_id || !requester_did || !transfer_payload) return null;
    return { proposal_id, requester_did, transfer_payload };
  };

  let items;
  if (Array.isArray(stdinInput)) {
    items = stdinInput.map(normaliseItem).filter(Boolean);
  } else if (stdinInput && Array.isArray(stdinInput.items)) {
    items = stdinInput.items.map(normaliseItem).filter(Boolean);
  } else if (stdinInput && typeof stdinInput === 'object') {
    const single = normaliseItem(stdinInput);
    items = single ? [single] : [];
  } else {
    items = [];
  }

  if (items.length === 0) {
    fatal(
      'No executable items found on stdin. Each item needs { proposal_id, requester_did, transfer_payload }.'
    );
  }

  const data = await workerRequest('POST', '/payouts/execute', { items });
  output(data);
}

async function cmdCheckPayout() {
  const args = parseArgs();
  let ids = null;

  let stdinInput = null;
  if (!process.stdin.isTTY) {
    try {
      stdinInput = await readStdin();
    } catch (e) {
      fatal(e.message);
    }
  }
  if (stdinInput) {
    if (Array.isArray(stdinInput)) {
      ids = stdinInput.filter(s => typeof s === 'string' && s.length > 0);
    } else if (stdinInput && Array.isArray(stdinInput.ids)) {
      ids = stdinInput.ids.filter(s => typeof s === 'string' && s.length > 0);
    }
  }

  if (!ids) {
    const flagList =
      parseCommaList(args.ids) ||
      (typeof args.id === 'string' ? [args.id] : null);
    if (flagList) ids = flagList;
  }

  if (!ids || ids.length === 0) {
    fatal(
      'No payment ids provided. Pipe JSON `{"ids":["..."]}` (or a bare array) to stdin OR pass --ids=id1,id2 (or --id=<single>).'
    );
  }

  const data = await workerRequest('POST', '/payouts/status', { ids });
  output(data);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const command = process.argv[2];

  if (!command) {
    fatal(
      'Usage: node scripts/yellowcard.js <command> [options]\n' +
        'Commands: discover, rates, balance, propose-payout, execute-payout, check-payout\n' +
        'All commands (except balance) are batch — pipe an items/ids/countries/currencies array via stdin, or use CLI fallbacks.'
    );
  }

  switch (command) {
    case 'discover':
      return cmdDiscover();
    case 'rates':
      return cmdRates();
    case 'balance':
      return cmdBalance();
    case 'propose-payout':
      return cmdProposePayout();
    case 'execute-payout':
      return cmdExecutePayout();
    case 'check-payout':
      return cmdCheckPayout();
    default:
      fatal(
        `Unknown command: ${command}. Valid commands: discover, rates, balance, propose-payout, execute-payout, check-payout`
      );
  }
}

main().catch(err => fatal(err.message));
