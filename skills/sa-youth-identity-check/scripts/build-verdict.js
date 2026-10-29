#!/usr/bin/env node
'use strict';
/**
 * Assemble the verdict record from the sanitised outputs of the other scripts
 * plus what the agent recorded (consent, classifier, retries, flags). The
 * status is derived from script facts; STATUS_HINT only selects a terminal
 * branch that has no script facts (declined, paused_safeguarding, not_applicable).
 *
 * Usage:
 *   CONSENT='{"given":true,"language":"en","at":"2026-10-29T08:01:00Z"}' node scripts/build-verdict.js
 *   STATUS_HINT=declined REASON_HINT=consent_declined node scripts/build-verdict.js
 *   node scripts/build-verdict.js --self-test
 *
 * Reads from OUTPUT_DIR: birth-year-gate.json, sa-id-check.json, sa-mobile-check.json,
 *   referral-attestation.json (optional). Earlier turns' files must be loaded back
 *   with load_artifact first; a missing required file is an error, never a guess.
 * Env:  _SKILL_CONTEXT_USER_DID (required), _SKILL_CONTEXT_CHANNEL_PROVIDER, CONSENT (JSON),
 *       STATUS_HINT, REASON_HINT, CLASSIFIER=decision_tool|agent_rubric, DECISION_PROVIDER,
 *       RETRIES_USED, FLAGS (comma list), RETENTION_DAYS (default 90), STARTED_AT,
 *       AS_OF, OUTPUT_DIR, _SKILL_CONTEXT_TIMESTAMP, _SKILL_CONTEXT_CHANNEL_SENDER_DIGEST
 * Writes: <OUTPUT_DIR>/verdict.json and prints it. Refuses to write a record that
 *   fails the schema or contains anything that looks like an ID or phone number.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lib = require('./_lib');

const SKILL_VERSION = '1.0.0';
const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'references', 'verdict.schema.json'), 'utf8'));
const ASSURANCE_STATEMENT =
  'Structural and self-attested checks only. No Department of Home Affairs lookup, document inspection or liveness check was performed. This record is evidence for a calling flow, not an authorisation.';

/* ---------- a small JSON-schema (draft-07 subset) validator ---------- */

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function validate(schema, value, at, errors) {
  if (schema.const !== undefined && value !== schema.const) errors.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((e) => e === value)) errors.push(`${at}: not one of ${JSON.stringify(schema.enum)}`);
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const t = typeOf(value);
    const ok = allowed.some((a) => a === t || (a === 'number' && t === 'integer'));
    if (!ok) errors.push(`${at}: expected ${allowed.join('|')}, got ${t}`);
  }
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${at}: does not match ${schema.pattern}`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: below ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: above ${schema.maximum}`);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required || []) if (!(k in value)) errors.push(`${at}: missing ${k}`);
    for (const [k, v] of Object.entries(value)) {
      const sub = schema.properties && schema.properties[k];
      if (sub) validate(sub, v, `${at}.${k}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${at}: unexpected property ${k}`);
    }
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => validate(schema.items, v, `${at}[${i}]`, errors));
  return errors;
}

/* ---------- the builder ---------- */

function readJson(name, options) {
  return lib.readOutput(name, options);
}

function parseConsent(raw) {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    return {
      given: c.given === true,
      notice_version: typeof c.notice_version === 'string' ? c.notice_version : '1.0.0',
      language: typeof c.language === 'string' && c.language ? c.language : 'en',
      at: typeof c.at === 'string' ? c.at : null,
    };
  } catch (e) {
    return { error: 'CONSENT is not valid JSON' };
  }
}

function evaluate(options = {}) {
  const get = (key, envName, fallback) => (options[key] !== undefined ? options[key] : lib.env(envName, fallback));
  const today = lib.asOf(options);
  const now = lib.nowIso(options);
  const userDid = get('userDid', '_SKILL_CONTEXT_USER_DID');
  if (!userDid) return { success: false, error: '_SKILL_CONTEXT_USER_DID is required' };
  const provider = get('provider', '_SKILL_CONTEXT_CHANNEL_PROVIDER', 'whatsapp');
  const senderDigest = get('senderDigest', '_SKILL_CONTEXT_CHANNEL_SENDER_DIGEST', null);
  const hint = get('statusHint', 'STATUS_HINT', null);
  const reasonHint = get('reasonHint', 'REASON_HINT', null);
  const classifier = get('classifier', 'CLASSIFIER', 'agent_rubric');
  const decisionProvider = get('decisionProvider', 'DECISION_PROVIDER', null);
  const retries = Number(get('retriesUsed', 'RETRIES_USED', '0')) || 0;
  const extraFlags = String(get('flags', 'FLAGS', '')).split(',').map((s) => s.trim()).filter(Boolean);
  const retentionDays = Number(get('retentionDays', 'RETENTION_DAYS', '90')) || 90;
  const startedAt = get('startedAt', 'STARTED_AT', now);
  const consent = parseConsent(get('consent', 'CONSENT', null));
  if (consent && consent.error) return { success: false, error: consent.error };

  const classifierTag = classifier === 'decision_tool' ? 'decision' : 'rubric';
  const checks = [];
  const flags = new Set(extraFlags);
  let status = null;
  let reason = null;
  let eligibility;
  let identity;
  let phone;

  checks.push({ id: 'consent', result: consent && consent.given ? 'pass' : 'fail', method: `${classifierTag}:sa-youth-identity-check.consent-response@1.0.0` });

  if (hint === 'declined') {
    status = 'declined';
    reason = reasonHint === 'stopped' ? 'stopped' : 'consent_declined';
  } else if (hint === 'paused_safeguarding') {
    status = 'paused_safeguarding';
    reason = 'safeguarding';
  } else if (hint === 'not_applicable') {
    status = 'not_applicable';
    reason = 'no_sa_id';
  } else if (hint && hint !== 'passed') {
    return { success: false, error: `STATUS_HINT must be declined, paused_safeguarding or not_applicable (got ${hint})` };
  } else {
    if (!consent || !consent.given) return { success: false, error: 'consent is not recorded: pass CONSENT JSON with given=true, or STATUS_HINT=declined' };

    const gate = readJson('birth-year-gate.json', options);
    if (gate) {
      const stop = gate.gate === 'stop_under_18' || gate.gate === 'stop_over_35';
      checks.push({ id: 'age_gate', result: stop ? 'fail' : gate.gate === 'unparseable' ? 'not_applicable' : 'pass', method: 'script:check-birth-year@1.0.0' });
      if (gate.gate === 'stop_under_18') {
        status = 'not_eligible';
        reason = 'under_18';
      } else if (gate.gate === 'stop_over_35') {
        status = 'not_eligible';
        reason = 'over_35';
      }
    }

    if (!status) {
      const idc = readJson('sa-id-check.json', options);
      if (!idc) return { success: false, error: 'missing sa-id-check.json in the output folder: run validate-sa-id.js, or load_artifact /output/sa-id-check.json from the earlier turn' };
      const structureOk = idc.checks && idc.checks.structure && idc.checks.date && idc.checks.citizenship_digit;
      checks.push({ id: 'id_structure', result: structureOk ? 'pass' : 'fail', method: 'script:validate-sa-id@1.0.0' });
      checks.push({ id: 'id_luhn', result: idc.checks && idc.checks.luhn ? 'pass' : idc.checks && idc.checks.luhn === null ? 'not_applicable' : 'fail', method: 'script:validate-sa-id@1.0.0' });
      checks.push({ id: 'stated_year_consistent', result: idc.stated_year_consistent === null ? 'not_applicable' : idc.stated_year_consistent ? 'pass' : 'fail', method: 'script:validate-sa-id@1.0.0' });

      if (!idc.valid) {
        status = 'inconclusive';
        reason = 'id_invalid';
        if (idc.masked_id) identity = { document_type: 'za_id_number', masked_id: idc.masked_id, structurally_valid: false };
      } else if (idc.stated_year_consistent === false) {
        status = 'inconclusive';
        reason = 'stated_year_mismatch';
        identity = { document_type: 'za_id_number', masked_id: idc.masked_id, structurally_valid: true };
      } else if (!idc.in_band) {
        status = 'not_eligible';
        reason = idc.age < lib.YOUTH_BAND.min ? 'under_18' : 'over_35';
      } else {
        const mob = readJson('sa-mobile-check.json', options);
        if (!mob) return { success: false, error: 'missing sa-mobile-check.json in the output folder: run check-sa-mobile.js (OWNERSHIP=yes|no|both|unknown), or load_artifact /output/sa-mobile-check.json' };
        checks.push({ id: 'sender_match', result: mob.typed_matches_sender === null ? 'not_applicable' : mob.typed_matches_sender ? 'pass' : 'fail', method: 'script:check-sa-mobile@1.0.0' });
        for (const f of mob.flags || []) flags.add(f);
        status = 'passed';
        eligibility = { band: lib.YOUTH_BAND.label, age_at_check: idc.age, in_band: true, as_of: idc.as_of || today.iso };
        identity = { document_type: 'za_id_number', masked_id: idc.masked_id, structurally_valid: true, citizenship_class: idc.citizenship_class };
        if (idc.id_digest) identity.id_digest = idc.id_digest;
        phone = {
          verified_sender_available: Boolean(mob.verified_sender_available),
          sender_country: mob.sender_country || null,
          ownership: mob.ownership || 'unknown',
          typed_number_supplied: Boolean(mob.typed_number_supplied),
          typed_is_za_mobile: mob.typed_is_za_mobile === undefined ? null : mob.typed_is_za_mobile,
          typed_matches_sender: mob.typed_matches_sender === undefined ? null : mob.typed_matches_sender,
        };
      }
    }
  }

  const attestations = [];
  const ref = readJson('referral-attestation.json', options);
  if (ref && ref.enabled && ref.attestation && status === 'passed') {
    const a = ref.attestation;
    const entry = {
      type: 'referral_contact_card',
      referrer_ref: a.referrer_ref,
      referrer_registered: Boolean(a.registered),
      referrer_credentialed: Boolean(a.credentialed),
      status: a.status,
      expires_at: a.expires_at || null,
      confirmed_at: a.confirmed_at || null,
      reward: 'owned by the calling flow',
    };
    if (a.status === 'pending' && a.code) entry.code = a.code;
    attestations.push(entry);
  }

  const deleteAfter = new Date(Date.UTC(today.year, today.month - 1, today.day + retentionDays)).toISOString().slice(0, 10);
  const record = {
    schema: 'ixo.sa-youth-identity-check/verdict',
    schema_version: '1.0.0',
    check_id: crypto.randomUUID(),
    status,
    reason,
    assurance: { level: 'basic', statement: ASSURANCE_STATEMENT, dha_verified: false, document_verified: false, liveness_verified: false },
    subject: { user_did: userDid, channel: provider },
  };
  if (eligibility) record.eligibility = eligibility;
  if (identity) record.identity = identity;
  if (phone) record.phone = phone;
  record.checks = checks;
  record.flags = [...flags].sort();
  record.consent = consent || { given: false, notice_version: '1.0.0', language: 'en', at: null };
  record.provenance = { skill: 'sa-youth-identity-check', skill_version: SKILL_VERSION, classifier, decision_provider: decisionProvider || null, retries_used: retries };
  record.timestamps = { started_at: startedAt, completed_at: now };
  record.retention = { delete_after: deleteAfter, basis: `programme eligibility; ${retentionDays} days unless the calling flow sets another` };
  record.escalation = {
    recommended: status === 'not_applicable',
    skill: 'ixo-identity-verification',
    reason: status === 'not_applicable' ? 'no SA ID number; a document-based check may apply' : null,
  };
  record.attestations = attestations;

  const errors = validate(SCHEMA, record, 'verdict', []);
  if (errors.length) return { success: false, error: `verdict failed schema validation: ${errors.slice(0, 5).join('; ')}` };
  const leak = lib.findSensitive(record, senderDigest || undefined);
  if (leak) return { success: false, error: `refusing to write verdict: ${leak.kind} found at ${leak.at}` };
  return { success: true, verdict: record };
}

async function main(options = {}) {
  const result = evaluate(options);
  if (result.success) lib.writeOutput('verdict.json', result.verdict, options);
  return result;
}

/* ---------- self-test ---------- */

function selfTest() {
  const os = require('os');
  const validateId = require('./validate-sa-id');
  const birthYear = require('./check-birth-year');
  const mobile = require('./check-sa-mobile');
  const AS_OF = '2026-10-29';
  const T0 = '2026-10-29T08:00:00.000Z';
  const DIGEST = lib.sha256hex('whatsapp\u000027821234567');
  const consentOk = JSON.stringify({ given: true, language: 'en', at: T0 });
  const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const common = (dir, extra = {}) => ({ outputDir: dir, asOf: AS_OF, timestamp: T0, userDid: 'did:ixo:test:youth1', consent: consentOk, senderDigest: DIGEST, ...extra });
  const prep = async (dir, { year = '1995', id = '9507205123081', ownership = 'yes', phone = '' } = {}) => {
    await birthYear.main({ outputDir: dir, asOf: AS_OF, statedBirthYear: year });
    if (id) await validateId.main({ outputDir: dir, asOf: AS_OF, saId: id, statedBirthYear: year });
    await mobile.main({ outputDir: dir, senderDigest: DIGEST, senderCountry: 'ZA', senderE164: '', ownership, phone });
  };
  const cases = [];
  cases.push({
    name: 'passed: eligibility, identity, phone present; six checks; no flags; schema-valid',
    fn: async () => {
      const dir = fresh();
      await prep(dir);
      const r = await main(common(dir));
      lib.assert(r.success, r.error);
      const v = r.verdict;
      lib.assert(v.status === 'passed' && v.reason === null, JSON.stringify(v.status));
      lib.assert(v.eligibility.age_at_check === 31 && v.eligibility.in_band === true, JSON.stringify(v.eligibility));
      lib.assert(v.identity.masked_id === '950720*****81' && v.identity.citizenship_class === 'citizen', JSON.stringify(v.identity));
      lib.assert(v.phone.verified_sender_available === true && v.phone.ownership === 'self_attested_own', JSON.stringify(v.phone));
      lib.assert(v.checks.map((c) => c.id).join(',') === 'consent,age_gate,id_structure,id_luhn,stated_year_consistent,sender_match', v.checks.map((c) => c.id).join(','));
      lib.assert(v.checks.every((c) => c.result !== 'fail'), 'no failed checks');
      lib.assert(v.flags.length === 0 && v.attestations.length === 0, 'flags/attestations');
      lib.assert(v.retention.delete_after === '2027-01-27', v.retention.delete_after);
      lib.assert(fs.existsSync(path.join(dir, 'verdict.json')), 'verdict.json written');
      lib.assert(!JSON.stringify(v).includes('9507205123081'), 'raw id in verdict');
    },
  });
  cases.push({
    name: 'declined by hint: no eligibility, identity or phone; consent fail',
    fn: async () => {
      const dir = fresh();
      const r = await main(common(dir, { consent: JSON.stringify({ given: false }), statusHint: 'declined' }));
      lib.assert(r.success, r.error);
      const v = r.verdict;
      lib.assert(v.status === 'declined' && v.reason === 'consent_declined', JSON.stringify([v.status, v.reason]));
      lib.assert(!('eligibility' in v) && !('identity' in v) && !('phone' in v), 'blocks must be absent');
      lib.assert(v.checks[0].result === 'fail', 'consent check');
      const r2 = await main(common(dir, { statusHint: 'declined', reasonHint: 'stopped' }));
      lib.assert(r2.verdict.reason === 'stopped', 'stopped');
    },
  });
  cases.push({
    name: 'paused_safeguarding and not_applicable hints; escalation only for not_applicable',
    fn: async () => {
      const dir = fresh();
      const a = await main(common(dir, { statusHint: 'paused_safeguarding' }));
      lib.assert(a.verdict.status === 'paused_safeguarding' && a.verdict.reason === 'safeguarding' && a.verdict.escalation.recommended === false, JSON.stringify(a.verdict.status));
      const b = await main(common(dir, { statusHint: 'not_applicable' }));
      lib.assert(b.verdict.status === 'not_applicable' && b.verdict.reason === 'no_sa_id' && b.verdict.escalation.recommended === true, JSON.stringify(b.verdict.status));
    },
  });
  cases.push({
    name: 'under 18 by the year gate: not_eligible, no identity, id file never read',
    fn: async () => {
      const dir = fresh();
      await birthYear.main({ outputDir: dir, asOf: AS_OF, statedBirthYear: '2010' });
      const r = await main(common(dir));
      lib.assert(r.success, r.error);
      lib.assert(r.verdict.status === 'not_eligible' && r.verdict.reason === 'under_18', JSON.stringify(r.verdict.status));
      lib.assert(!('identity' in r.verdict) && !('eligibility' in r.verdict), 'blocks absent');
    },
  });
  cases.push({
    name: 'over 35 by the ID after a boundary year: not_eligible / over_35, no identity',
    fn: async () => {
      const dir = fresh();
      await prep(dir, { year: '1990', id: '9010280004086' });
      const r = await main(common(dir));
      lib.assert(r.success, r.error);
      lib.assert(r.verdict.status === 'not_eligible' && r.verdict.reason === 'over_35' && !('identity' in r.verdict), JSON.stringify(r.verdict));
    },
  });
  cases.push({
    name: 'invalid ID: inconclusive / id_invalid with masked id and structurally_valid=false',
    fn: async () => {
      const dir = fresh();
      await prep(dir, { year: '2001', id: '0103150045089' });
      const r = await main(common(dir, { retriesUsed: '1' }));
      lib.assert(r.success, r.error);
      const v = r.verdict;
      lib.assert(v.status === 'inconclusive' && v.reason === 'id_invalid', JSON.stringify([v.status, v.reason]));
      lib.assert(v.identity.structurally_valid === false && v.identity.masked_id === '010315*****89', JSON.stringify(v.identity));
      lib.assert(!('eligibility' in v) && v.provenance.retries_used === 1, 'eligibility absent, retries recorded');
    },
  });
  cases.push({
    name: 'stated year mismatch: inconclusive / stated_year_mismatch',
    fn: async () => {
      const dir = fresh();
      await prep(dir, { year: '1994' });
      const r = await main(common(dir));
      lib.assert(r.success && r.verdict.status === 'inconclusive' && r.verdict.reason === 'stated_year_mismatch', JSON.stringify(r));
    },
  });
  cases.push({
    name: 'degraded sender: flags carried from the mobile check; typed number never written',
    fn: async () => {
      const dir = fresh();
      await birthYear.main({ outputDir: dir, asOf: AS_OF, statedBirthYear: '2008' });
      await validateId.main({ outputDir: dir, asOf: AS_OF, saId: '0810295002085', statedBirthYear: '2008' });
      await mobile.main({ outputDir: dir, senderDigest: '', senderCountry: '', senderE164: '', ownership: 'yes', phone: '082 123 4567' });
      const r = await main(common(dir, { senderDigest: '' }));
      lib.assert(r.success, r.error);
      const v = r.verdict;
      lib.assert(v.status === 'passed' && v.eligibility.age_at_check === 18, JSON.stringify(v.eligibility));
      lib.assert(v.flags.includes('claimed_only_number') && v.phone.verified_sender_available === false && v.phone.typed_is_za_mobile === true, JSON.stringify(v.phone));
      lib.assert(!/0821234567|27821234567/.test(JSON.stringify(v)), 'number leaked');
    },
  });
  cases.push({
    name: 'referral attestation is copied into attestations[] with its code',
    fn: async () => {
      const dir = fresh();
      await prep(dir);
      lib.writeOutput('referral-attestation.json', { success: true, enabled: true, action: 'create', attestation: { referrer_ref: 'r_abc123', registered: true, credentialed: true, status: 'pending', code: 'K7P3Q', created_at: T0, expires_at: '2026-11-05T08:00:00.000Z', confirmed_at: null } }, { outputDir: dir });
      const r = await main(common(dir));
      lib.assert(r.success, r.error);
      lib.assert(r.verdict.attestations.length === 1 && r.verdict.attestations[0].code === 'K7P3Q' && r.verdict.attestations[0].status === 'pending', JSON.stringify(r.verdict.attestations));
    },
  });
  cases.push({
    name: 'missing inputs are errors that name the file; missing consent is an error',
    fn: async () => {
      const dir = fresh();
      const r = await main(common(dir));
      lib.assert(!r.success && /sa-id-check\.json/.test(r.error), r.error);
      await birthYear.main({ outputDir: dir, asOf: AS_OF, statedBirthYear: '1995' });
      await validateId.main({ outputDir: dir, asOf: AS_OF, saId: '9507205123081', statedBirthYear: '1995' });
      const r2 = await main(common(dir));
      lib.assert(!r2.success && /sa-mobile-check\.json/.test(r2.error), r2.error);
      const r3 = await main(common(dir, { consent: '' }));
      lib.assert(!r3.success && /consent/.test(r3.error), r3.error);
      lib.assert(!fs.existsSync(path.join(dir, 'verdict.json')), 'no verdict written on error');
    },
  });
  cases.push({
    name: 'a salted ID digest whose hex contains a 13-digit run does not block the verdict (Codex review finding)',
    fn: async () => {
      const dir = fresh();
      await birthYear.main({ outputDir: dir, asOf: AS_OF, statedBirthYear: '1995' });
      // salt3 + 9507205123081 yields a digest containing the run 9146371620373
      const idc = await validateId.main({ outputDir: dir, asOf: AS_OF, saId: '9507205123081', statedBirthYear: '1995', salt: 'salt3' });
      lib.assert(/\d{13}/.test(idc.id_digest), `expected a 13-digit run inside ${idc.id_digest}`);
      await mobile.main({ outputDir: dir, senderDigest: DIGEST, senderCountry: 'ZA', senderE164: '', ownership: 'yes', phone: '' });
      const r = await main(common(dir));
      lib.assert(r.success, r.error);
      lib.assert(r.verdict.identity.id_digest === idc.id_digest && r.verdict.status === 'passed', JSON.stringify(r.verdict.identity));
      // the exemption is for that one field only: the same string elsewhere is still refused
      const leak = lib.findSensitive({ identity: { id_digest: idc.id_digest }, checks: [{ method: idc.id_digest }] });
      lib.assert(leak && leak.at === 'checks[0].method' && leak.kind === 'id_number', JSON.stringify(leak));
      // and a digest field that is not strictly sha256:<64 hex> gets no exemption
      const leak2 = lib.findSensitive({ identity: { id_digest: `sha256:${idc.id_digest.slice(7)}0` } });
      lib.assert(leak2 && leak2.at === 'identity.id_digest', JSON.stringify(leak2));
      // and the sender digest is still caught even inside that field
      const leak3 = lib.findSensitive({ identity: { id_digest: `sha256:${DIGEST}` } }, DIGEST);
      lib.assert(leak3 && leak3.kind === 'sender_digest', JSON.stringify(leak3));
    },
  });
  cases.push({
    name: 'refuses to write anything that looks like an ID, a phone number or the sender digest',
    fn: async () => {
      const dir = fresh();
      await prep(dir);
      const a = await main(common(dir, { flags: 'note_9507205123081' }));
      lib.assert(!a.success && /schema validation|id_number/.test(a.error), a.error);
      const b = await main(common(dir, { consent: JSON.stringify({ given: true, language: 'call 082 123 4567', at: T0 }) }));
      lib.assert(!b.success && /phone_number/.test(b.error), b.error);
      const c = await main(common(dir, { consent: JSON.stringify({ given: true, language: DIGEST, at: T0 }) }));
      lib.assert(!c.success && /sender_digest/.test(c.error), c.error);
      lib.assert(!fs.existsSync(path.join(dir, 'verdict.json')), 'no verdict written after refusal');
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

module.exports = { main, evaluate, validate };
