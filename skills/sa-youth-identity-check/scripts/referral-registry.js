#!/usr/bin/env node
'use strict';
/**
 * Referral attestations: register a shared contact card as a pending
 * attestation, confirm one from the referrer's own session, or read its status.
 * The registry (not this script) is the source of truth.
 *
 * Usage:
 *   ACTION=create  node scripts/referral-registry.js      (youth's session; reads _SKILL_CONTEXT_SHARED_CONTACTS)
 *   ACTION=confirm CODE=7K3PQ node scripts/referral-registry.js   (referrer's session)
 *   ACTION=status  CODE=7K3PQ node scripts/referral-registry.js
 *   node scripts/referral-registry.js --self-test
 *
 * Env:  ACTION, CODE, _SKILL_CONTEXT_USER_DID, _SKILL_CONTEXT_CHANNEL_FEATURES,
 *       _SKILL_CONTEXT_SHARED_CONTACTS (JSON [{ref, registered, credentialed}]),
 *       _ORACLE_SECRET_REFERRAL_REGISTRY_URL, _ORACLE_SECRET_REFERRAL_REGISTRY_KEY,
 *       REFERRAL_REGISTRY_MOCK=<path to a JSON file> (evals and local runs),
 *       OUTPUT_DIR, _SKILL_CONTEXT_TIMESTAMP
 * Writes: referral-attestation.json (create), referral-confirm.json (confirm),
 *         referral-status.json (status). Prints `{ enabled: false, reason }` and
 *         writes nothing when the step is not available.
 *
 * Prints no name, no number and no digest; the only identifiers are the
 * gateway's opaque referrer reference and the short confirmation code.
 */
const fs = require('fs');
const crypto = require('crypto');
const lib = require('./_lib');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, no 0/O/1/I
const CODE_LENGTH = 5;
const EXPIRY_DAYS = 7;

function makeCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return code;
}

function normaliseCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/0/g, 'O').replace(/1/g, 'I');
}

function publicView(row) {
  if (!row) return null;
  const view = {
    referrer_ref: row.referrer_ref,
    registered: row.registered,
    credentialed: row.credentialed,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
    confirmed_at: row.confirmed_at || null,
  };
  if (row.status === 'pending') view.code = row.code;
  return view;
}

function configure(options = {}) {
  const features = String(options.features !== undefined ? options.features : lib.env('_SKILL_CONTEXT_CHANNEL_FEATURES', ''))
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const mock = options.mock !== undefined ? options.mock : lib.env('REFERRAL_REGISTRY_MOCK');
  const url = options.registryUrl !== undefined ? options.registryUrl : lib.env('_ORACLE_SECRET_REFERRAL_REGISTRY_URL');
  const key = options.registryKey !== undefined ? options.registryKey : lib.env('_ORACLE_SECRET_REFERRAL_REGISTRY_KEY');
  let backend = null;
  if (mock) backend = 'mock';
  else if (url && key) backend = 'http';
  return { hasContacts: features.includes('contacts'), backend, mock, url, key };
}

/* ---------- mock backend: a JSON file { subjects: { did: ref }, attestations: [] } ---------- */

function mockLoad(file) {
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  if (!data.subjects) data.subjects = {};
  if (!Array.isArray(data.attestations)) data.attestations = [];
  return data;
}

function mockSave(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function mockCreate(file, input, now) {
  const data = mockLoad(file);
  const existing = data.attestations.find((a) => a.youth_did === input.youth_did && ['pending', 'confirmed'].includes(a.status));
  if (existing) return existing; // one attestation per youth check
  let status = 'pending';
  if (!input.registered) status = 'not_registered';
  else if (input.credentialed !== true) status = 'not_credentialed';
  const row = {
    code: status === 'pending' ? makeCode() : null,
    youth_did: input.youth_did,
    referrer_ref: input.ref,
    registered: Boolean(input.registered),
    credentialed: input.credentialed === true,
    status,
    created_at: now,
    expires_at: new Date(Date.parse(now) + EXPIRY_DAYS * 86400000).toISOString(),
    confirmed_at: null,
    confirmed_by_ref: null,
  };
  if (row.code) while (data.attestations.some((a) => a.code === row.code)) row.code = makeCode();
  data.attestations.push(row);
  mockSave(file, data);
  return row;
}

function mockConfirm(file, code, confirmerDid, now) {
  const data = mockLoad(file);
  const row = data.attestations.find((a) => a.code === code);
  if (!row) return { status: 'refused', reason: 'unknown_code' };
  if (row.status === 'confirmed') return { ...publicView(row), status: 'refused', reason: 'already_confirmed' };
  if (row.status !== 'pending') return { ...publicView(row), status: 'refused', reason: `attestation_${row.status}` };
  if (Date.parse(now) > Date.parse(row.expires_at)) {
    row.status = 'expired';
    mockSave(file, data);
    return publicView(row);
  }
  const confirmerRef = data.subjects[confirmerDid];
  if (!confirmerRef) return { ...publicView(row), status: 'refused', reason: 'confirmer_not_registered' };
  if (confirmerRef !== row.referrer_ref) return { ...publicView(row), status: 'refused', reason: 'not_the_named_subject' };
  row.status = 'confirmed';
  row.confirmed_at = now;
  row.confirmed_by_ref = confirmerRef;
  mockSave(file, data);
  return publicView(row);
}

function mockStatus(file, code) {
  const data = mockLoad(file);
  const row = data.attestations.find((a) => a.code === code);
  return row ? publicView(row) : { status: 'refused', reason: 'unknown_code' };
}

/* ---------- HTTP backend (proposed contract; the registry decides everything) ---------- */

async function http(cfg, method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-registry-key': cfg.key },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) return { error: `registry responded ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: `registry unreachable: ${e.name}` };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- actions ---------- */

async function evaluate(options = {}) {
  const action = String(options.action !== undefined ? options.action : lib.env('ACTION', '')).toLowerCase();
  const cfg = configure(options);
  const now = lib.nowIso(options);
  const userDid = options.userDid !== undefined ? options.userDid : lib.env('_SKILL_CONTEXT_USER_DID');
  if (!['create', 'confirm', 'status'].includes(action)) return { success: false, error: 'ACTION must be create, confirm or status' };
  if (!cfg.backend) return { success: true, enabled: false, reason: 'registry_not_configured', action };
  if (action === 'create' && !cfg.hasContacts) return { success: true, enabled: false, reason: 'feature_not_available', action };
  if (!userDid && action !== 'status') return { success: false, error: '_SKILL_CONTEXT_USER_DID is required' };

  if (action === 'create') {
    const raw = options.sharedContacts !== undefined ? options.sharedContacts : lib.env('_SKILL_CONTEXT_SHARED_CONTACTS');
    let contacts;
    try {
      contacts = JSON.parse(raw || '[]');
    } catch (e) {
      return { success: false, error: '_SKILL_CONTEXT_SHARED_CONTACTS is not valid JSON' };
    }
    if (!Array.isArray(contacts) || contacts.length === 0) return { success: false, error: 'no shared contact in this turn' };
    const c = contacts[0];
    if (!c || typeof c.ref !== 'string' || !c.ref) return { success: false, error: 'shared contact has no ref' };
    const input = { youth_did: userDid, ref: c.ref, registered: c.registered === true, credentialed: c.credentialed === true ? true : c.credentialed === false ? false : null };
    let row;
    if (cfg.backend === 'mock') row = mockCreate(cfg.mock, input, now);
    else {
      const res = await http(cfg, 'POST', '/referral-attestations', input);
      if (res.error) return { success: false, error: res.error };
      row = res.attestation || res;
    }
    return { success: true, enabled: true, action, attestation: publicView(row) };
  }

  const code = normaliseCode(options.code !== undefined ? options.code : lib.env('CODE'));
  if (code.length !== CODE_LENGTH) return { success: false, error: `CODE must be ${CODE_LENGTH} characters` };

  if (action === 'confirm') {
    let result;
    if (cfg.backend === 'mock') result = mockConfirm(cfg.mock, code, userDid, now);
    else {
      const res = await http(cfg, 'POST', `/referral-attestations/${code}/confirm`, { confirmer_did: userDid });
      if (res.error) return { success: false, error: res.error };
      result = res.attestation || res;
    }
    const { code: _omit, referrer_ref: _omit2, ...rest } = result; // the referrer sees neither
    return { success: true, enabled: true, action, attestation: rest };
  }

  let result;
  if (cfg.backend === 'mock') result = mockStatus(cfg.mock, code);
  else {
    const res = await http(cfg, 'GET', `/referral-attestations/${code}`);
    if (res.error) return { success: false, error: res.error };
    result = res.attestation || res;
  }
  return { success: true, enabled: true, action, attestation: result };
}

async function main(options = {}) {
  const result = await evaluate(options);
  if (result.success && result.enabled) {
    const name = { create: 'referral-attestation.json', confirm: 'referral-confirm.json', status: 'referral-status.json' }[result.action];
    lib.writeOutput(name, result, options);
  }
  return result;
}

function selfTest() {
  const os = require('os');
  const path = require('path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'referral-'));
  const mock = path.join(tmp, 'registry.json');
  fs.writeFileSync(mock, JSON.stringify({ subjects: { 'did:ixo:test:referrer1': 'r_abc123', 'did:ixo:test:other': 'r_zzz999' }, attestations: [] }));
  const T0 = '2026-10-29T08:00:00.000Z';
  const base = { mock, features: 'contacts', timestamp: T0, outputDir: tmp };
  const card = JSON.stringify([{ ref: 'r_abc123', registered: true, credentialed: true }]);
  const run = (o) => evaluate({ ...base, ...o });
  const cases = [];
  let code = null;
  cases.push({
    name: 'disabled without the contacts feature or without a registry',
    fn: async () => {
      const a = await run({ action: 'create', features: '', userDid: 'did:ixo:test:youth1', sharedContacts: card });
      lib.assert(a.enabled === false && a.reason === 'feature_not_available', JSON.stringify(a));
      const b = await run({ action: 'create', mock: '', registryUrl: '', registryKey: '', userDid: 'did:ixo:test:youth1', sharedContacts: card });
      lib.assert(b.enabled === false && b.reason === 'registry_not_configured', JSON.stringify(b));
    },
  });
  cases.push({
    name: 'create -> pending with a 5-character code; idempotent for the same youth',
    fn: async () => {
      const a = await run({ action: 'create', userDid: 'did:ixo:test:youth1', sharedContacts: card });
      lib.assert(a.enabled && a.attestation.status === 'pending', JSON.stringify(a));
      lib.assert(/^[A-HJ-NP-Z2-9]{5}$/.test(a.attestation.code), `code ${a.attestation.code}`);
      lib.assert(a.attestation.expires_at === '2026-11-05T08:00:00.000Z', a.attestation.expires_at);
      code = a.attestation.code;
      const b = await run({ action: 'create', userDid: 'did:ixo:test:youth1', sharedContacts: card });
      lib.assert(b.attestation.code === code, 'second create must reuse the pending attestation');
      lib.assert(!JSON.stringify(a).includes('youth1'), 'youth did must not be in the public view');
    },
  });
  cases.push({
    name: 'not registered / not credentialed -> no code',
    fn: async () => {
      const a = await run({ action: 'create', userDid: 'did:ixo:test:youth2', sharedContacts: JSON.stringify([{ ref: 'r_new', registered: false }]) });
      lib.assert(a.attestation.status === 'not_registered' && a.attestation.code === undefined, JSON.stringify(a));
      const b = await run({ action: 'create', userDid: 'did:ixo:test:youth3', sharedContacts: JSON.stringify([{ ref: 'r_x', registered: true, credentialed: false }]) });
      lib.assert(b.attestation.status === 'not_credentialed' && b.attestation.code === undefined, JSON.stringify(b));
      const c = await run({ action: 'create', userDid: 'did:ixo:test:youth4', sharedContacts: JSON.stringify([{ ref: 'r_y', registered: true, credentialed: null }]) });
      lib.assert(c.attestation.status === 'not_credentialed', JSON.stringify(c));
    },
  });
  cases.push({
    name: 'confirm is refused from the wrong subject, an unknown code, and after confirmation',
    fn: async () => {
      const wrong = await run({ action: 'confirm', userDid: 'did:ixo:test:other', code });
      lib.assert(wrong.attestation.status === 'refused' && wrong.attestation.reason === 'not_the_named_subject', JSON.stringify(wrong));
      const unknown = await run({ action: 'confirm', userDid: 'did:ixo:test:referrer1', code: 'ZZZZZ' });
      lib.assert(unknown.attestation.status === 'refused' && unknown.attestation.reason === 'unknown_code', JSON.stringify(unknown));
      const stranger = await run({ action: 'confirm', userDid: 'did:ixo:test:nobody', code });
      lib.assert(stranger.attestation.reason === 'confirmer_not_registered', JSON.stringify(stranger));
      const ok = await run({ action: 'confirm', userDid: 'did:ixo:test:referrer1', code: code.toLowerCase() });
      lib.assert(ok.attestation.status === 'confirmed' && ok.attestation.confirmed_at === T0, JSON.stringify(ok));
      lib.assert(ok.attestation.code === undefined && ok.attestation.referrer_ref === undefined, 'referrer view must omit code and ref');
      const again = await run({ action: 'confirm', userDid: 'did:ixo:test:referrer1', code });
      lib.assert(again.attestation.reason === 'already_confirmed', JSON.stringify(again));
      const st = await run({ action: 'status', code });
      lib.assert(st.attestation.status === 'confirmed', JSON.stringify(st));
    },
  });
  cases.push({
    name: 'a code sent after 7 days is expired',
    fn: async () => {
      const a = await run({ action: 'create', userDid: 'did:ixo:test:youth5', sharedContacts: card });
      const late = await run({ action: 'confirm', userDid: 'did:ixo:test:referrer1', code: a.attestation.code, timestamp: '2026-11-06T08:00:01.000Z' });
      lib.assert(late.attestation.status === 'expired', JSON.stringify(late));
    },
  });
  cases.push({
    name: 'output files are written only when enabled, and contain no numbers',
    fn: async () => {
      await main({ ...base, action: 'create', userDid: 'did:ixo:test:youth6', sharedContacts: card });
      const written = fs.readFileSync(path.join(tmp, 'referral-attestation.json'), 'utf8');
      lib.assert(!/\d{9,}/.test(written), 'number-like run in output');
      lib.assert(lib.findSensitive(JSON.parse(written)) === null, 'sensitive content in output');
    },
  });
  (async () => {
    let failed = 0;
    for (const c of cases) {
      try {
        await c.fn();
        process.stdout.write(`ok   ${c.name}\n`);
      } catch (e) {
        failed += 1;
        process.stdout.write(`FAIL ${c.name}: ${e.message}\n`);
      }
    }
    process.stdout.write(`${cases.length - failed}/${cases.length} passed\n`);
    process.exit(failed ? 1 : 0);
  })();
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) {
    selfTest();
  } else {
    main()
      .then((r) => {
        lib.emit(r);
        if (!r.success) process.exit(1);
      })
      .catch((e) => lib.fail(e.message));
  }
}

module.exports = { main, evaluate, normaliseCode };
