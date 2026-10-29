'use strict';
/**
 * Shared helpers for the sa-youth-identity-check scripts.
 *
 * Not a CLI. Imported by the other scripts in this folder.
 * Everything here is deliberately dependency-free (Node 18+ built-ins only).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000; // Africa/Johannesburg, UTC+2, no DST
const DEFAULT_OUTPUT_DIR = '/workspace/output';
const YOUTH_BAND = { min: 18, max: 35, label: '18-35' };

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * The date the check is "as of": AS_OF=YYYY-MM-DD wins; otherwise
 * _SKILL_CONTEXT_TIMESTAMP shifted to SAST; otherwise now (SAST).
 */
function asOf(options = {}) {
  const explicit = options.asOf || env('AS_OF');
  if (explicit) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(explicit).trim());
    if (!m) throw new Error('AS_OF must be YYYY-MM-DD');
    return { year: +m[1], month: +m[2], day: +m[3], iso: `${m[1]}-${m[2]}-${m[3]}`, source: 'AS_OF' };
  }
  let base = Date.now();
  let source = 'now';
  const ts = options.timestamp || env('_SKILL_CONTEXT_TIMESTAMP');
  if (ts) {
    const parsed = Date.parse(ts);
    if (Number.isFinite(parsed)) {
      base = parsed;
      source = '_SKILL_CONTEXT_TIMESTAMP';
    }
  }
  const d = new Date(base + SAST_OFFSET_MS);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return { year, month, day, iso: `${year}-${pad2(month)}-${pad2(day)}`, source };
}

/** ISO timestamp for "now" in the run (the context timestamp when given). */
function nowIso(options = {}) {
  const ts = options.timestamp || env('_SKILL_CONTEXT_TIMESTAMP');
  if (ts && Number.isFinite(Date.parse(ts))) return new Date(Date.parse(ts)).toISOString();
  return new Date().toISOString();
}

/** Two-digit year -> four-digit year with the SA ID pivot: yy <= current yy -> 20yy, else 19yy. */
function centuryYear(yy, asOfYear) {
  const cur = asOfYear % 100;
  return (yy <= cur ? 2000 : 1900) + yy;
}

/** Parse a stated year: "2003", "03", "'03", "1995". Returns a four-digit year or null. */
function parseYear(raw, asOfYear) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().replace(/^['’]/, '');
  if (/^\d{4}$/.test(s)) return +s;
  if (/^\d{2}$/.test(s)) return centuryYear(+s, asOfYear);
  return null;
}

/** Whole years between a birth date and the as-of date. */
function ageOn(dob, today) {
  let age = today.year - dob.year;
  const beforeBirthday = today.month < dob.month || (today.month === dob.month && today.day < dob.day);
  if (beforeBirthday) age -= 1;
  return age;
}

function isRealDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Standard Luhn check digit over a 12-digit payload. The rightmost payload
 * digit (index 11) is doubled, because in the full 13-digit number the check
 * digit occupies the undoubled slot. Known-valid: 8001015009087 (sum 33 -> 7).
 */
function luhnCheckDigit(payload12) {
  let sum = 0;
  let dbl = true;
  for (let i = 11; i >= 0; i -= 1, dbl = !dbl) {
    let n = payload12.charCodeAt(i) - 48;
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return (10 - (sum % 10)) % 10;
}

function maskId(id13) {
  return `${id13.slice(0, 6)}*****${id13.slice(11)}`;
}

function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function hmacHex(key, s) {
  return crypto.createHmac('sha256', key).update(s, 'utf8').digest('hex');
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function outputDir(options = {}) {
  const dir = options.outputDir || env('OUTPUT_DIR', DEFAULT_OUTPUT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeOutput(name, data, options = {}) {
  const file = path.join(outputDir(options), name);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

function readOutput(name, options = {}) {
  const file = path.join(outputDir(options), name);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Scan every string in an object for things that must never be persisted:
 * a 13-digit run (an ID number), a phone-number-like run, or the verified
 * sender digest. Dates, timestamps and UUIDs are stripped before the scan so
 * that they do not count as phone numbers. Returns the first finding or null.
 */
function findSensitive(value, senderDigest) {
  const hits = [];
  const strip = (s) =>
    s
      .replace(/\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?/g, ' ')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ' ');
  const visit = (v, at) => {
    if (typeof v === 'string') {
      if (/\d{13}/.test(v)) hits.push({ at, kind: 'id_number' });
      if (senderDigest && v.includes(senderDigest)) hits.push({ at, kind: 'sender_digest' });
      const s = strip(v);
      const m = /\+?\d[\d\s().-]{7,}\d/.exec(s);
      if (m && (m[0].match(/\d/g) || []).length >= 9) hits.push({ at, kind: 'phone_number' });
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => visit(x, `${at}[${i}]`));
    } else if (v && typeof v === 'object') {
      Object.entries(v).forEach(([k, x]) => visit(x, at ? `${at}.${k}` : k));
    }
  };
  visit(value, '');
  return hits.length ? hits[0] : null;
}

function emit(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function fail(message) {
  emit({ success: false, error: message });
  process.exit(1);
}

/** Run a list of {name, fn} self-test cases; print one line each; exit non-zero on failure. */
function runSelfTest(cases) {
  let failed = 0;
  for (const c of cases) {
    try {
      c.fn();
      process.stdout.write(`ok   ${c.name}\n`);
    } catch (e) {
      failed += 1;
      process.stdout.write(`FAIL ${c.name}: ${e.message}\n`);
    }
  }
  process.stdout.write(`${cases.length - failed}/${cases.length} passed\n`);
  process.exit(failed ? 1 : 0);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

module.exports = {
  YOUTH_BAND,
  env,
  pad2,
  asOf,
  nowIso,
  centuryYear,
  parseYear,
  ageOn,
  isRealDate,
  luhnCheckDigit,
  maskId,
  sha256hex,
  hmacHex,
  safeEqualHex,
  outputDir,
  writeOutput,
  readOutput,
  findSensitive,
  emit,
  fail,
  runSelfTest,
  assert,
};
