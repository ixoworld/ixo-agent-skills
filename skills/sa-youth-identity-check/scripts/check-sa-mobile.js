#!/usr/bin/env node
'use strict';
/**
 * Phone checks without the agent ever handling a number: is there a verified
 * sender, does a typed number look like a South African mobile, does it match
 * the verified sender, and what did the youth say about owning the phone.
 *
 * Usage:
 *   OWNERSHIP=yes node scripts/check-sa-mobile.js
 *   PHONE="082 123 4567" OWNERSHIP=no node scripts/check-sa-mobile.js
 *   node scripts/check-sa-mobile.js --self-test
 *
 * Env:  PHONE (optional), OWNERSHIP=yes|no|both|unknown (optional),
 *       _SKILL_CONTEXT_CHANNEL_PROVIDER (default whatsapp),
 *       _SKILL_CONTEXT_CHANNEL_SENDER_DIGEST (hex sha256(provider + "\0" + E.164 digits)),
 *       _SKILL_CONTEXT_CHANNEL_SENDER_COUNTRY (ISO alpha-2),
 *       _SKILL_CONTEXT_CHANNEL_SENDER_E164 (accepted and hashed at load; never printed),
 *       OUTPUT_DIR (optional)
 * Writes: <OUTPUT_DIR>/sa-mobile-check.json and prints the same JSON.
 *
 * Prints no number and no digest.
 */
const lib = require('./_lib');

const DIALLING = [
  ['27', 'ZA'], ['263', 'ZW'], ['258', 'MZ'], ['266', 'LS'], ['268', 'SZ'],
  ['267', 'BW'], ['264', 'NA'], ['265', 'MW'], ['260', 'ZM'],
];
// 06x, 071-079, 081-084 are mobile ranges; 080/086/087 are toll-free, shared-cost and VoIP.
const ZA_MOBILE = /^27(6\d|7[1-9]|8[1-4])\d{7}$/;

function countryOf(digits) {
  for (const [code, country] of DIALLING) if (digits.startsWith(code)) return country;
  return 'other';
}

function normalise(raw) {
  let s = String(raw).replace(/[\s().-]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  else if (s.startsWith('00')) s = s.slice(2);
  if (/^0\d{9}$/.test(s)) s = `27${s.slice(1)}`;
  return /^\d{8,15}$/.test(s) ? s : null;
}

function evaluate(options = {}) {
  const provider = options.provider !== undefined ? options.provider : lib.env('_SKILL_CONTEXT_CHANNEL_PROVIDER', 'whatsapp');
  let senderDigest = options.senderDigest !== undefined ? options.senderDigest : lib.env('_SKILL_CONTEXT_CHANNEL_SENDER_DIGEST');
  const senderE164 = options.senderE164 !== undefined ? options.senderE164 : lib.env('_SKILL_CONTEXT_CHANNEL_SENDER_E164');
  let senderCountry = options.senderCountry !== undefined ? options.senderCountry : lib.env('_SKILL_CONTEXT_CHANNEL_SENDER_COUNTRY');
  if (senderE164) {
    const d = String(senderE164).replace(/\D/g, '');
    if (!senderDigest) senderDigest = lib.sha256hex(`${provider}\0${d}`);
    if (!senderCountry) senderCountry = countryOf(d);
  }
  const verified = Boolean(senderDigest);

  const ownershipRaw = String(options.ownership !== undefined ? options.ownership : lib.env('OWNERSHIP', 'unknown')).trim().toLowerCase();
  let ownership = 'unknown';
  if (['yes', 'own', 'mine'].includes(ownershipRaw) || ownershipRaw === 'both') ownership = 'self_attested_own';
  else if (['no', 'borrowed'].includes(ownershipRaw)) ownership = 'borrowed_device';

  const phoneRaw = options.phone !== undefined ? options.phone : lib.env('PHONE');
  const flags = new Set();
  let typedSupplied = false;
  let typedValid = null;
  let typedCountry = null;
  let typedIsZaMobile = null;
  let typedMatches = null;
  if (phoneRaw !== undefined && phoneRaw !== null && String(phoneRaw).trim() !== '') {
    typedSupplied = true;
    const d = normalise(phoneRaw);
    if (!d) {
      typedValid = false;
      flags.add('typed_number_unparseable');
    } else {
      typedValid = true;
      typedCountry = countryOf(d);
      typedIsZaMobile = ZA_MOBILE.test(d);
      if (typedCountry !== 'ZA') flags.add('non_za_number');
      if (verified) {
        typedMatches = lib.safeEqualHex(lib.sha256hex(`${provider}\0${d}`), String(senderDigest).toLowerCase());
        if (!typedMatches) flags.add('typed_differs_from_sender');
      }
    }
  }
  if (!verified) flags.add('claimed_only_number');
  if (ownership === 'borrowed_device') flags.add('claimed_only_number');
  if (ownershipRaw === 'both') flags.add('second_number_claimed');
  if (senderCountry && senderCountry !== 'ZA') flags.add('non_za_sender');

  return {
    success: true,
    verified_sender_available: verified,
    sender_country: senderCountry || null,
    typed_number_supplied: typedSupplied,
    typed_number_valid: typedValid,
    typed_country: typedCountry,
    typed_is_za_mobile: typedIsZaMobile,
    typed_matches_sender: typedMatches,
    ownership,
    flags: [...flags],
  };
}

async function main(options = {}) {
  const result = evaluate(options);
  if (result.success) lib.writeOutput('sa-mobile-check.json', result, options);
  return result;
}

function selfTest() {
  const SENDER = '+27 82 123 4567';
  const DIGEST = lib.sha256hex('whatsapp\u000027821234567');
  const base = { senderDigest: DIGEST, senderCountry: 'ZA', senderE164: '', provider: 'whatsapp' };
  const noNumbers = (r) => {
    const s = JSON.stringify(r);
    lib.assert(!/\d{9,}/.test(s), 'a number leaked into the output');
    lib.assert(!s.includes(DIGEST), 'the digest leaked into the output');
  };
  lib.runSelfTest([
    {
      name: 'verified sender, own phone, nothing typed -> no flags',
      fn: () => {
        const r = evaluate({ ...base, ownership: 'yes', phone: '' });
        lib.assert(r.verified_sender_available === true && r.ownership === 'self_attested_own', JSON.stringify(r));
        lib.assert(r.flags.length === 0 && r.typed_matches_sender === null, JSON.stringify(r.flags));
        noNumbers(r);
      },
    },
    {
      name: 'typed number matches the verified sender in local format',
      fn: () => {
        const r = evaluate({ ...base, ownership: 'yes', phone: '082 123 4567' });
        lib.assert(r.typed_matches_sender === true && r.typed_is_za_mobile === true && r.typed_country === 'ZA', JSON.stringify(r));
        noNumbers(r);
      },
    },
    {
      name: 'typed number in +27 / 0027 / 27 formats all match',
      fn: () => {
        for (const p of ['+27821234567', '0027 82 123 4567', '27-82-123-4567', SENDER]) {
          lib.assert(evaluate({ ...base, phone: p }).typed_matches_sender === true, p);
        }
      },
    },
    {
      name: 'a different typed number is flagged, never failed',
      fn: () => {
        const r = evaluate({ ...base, ownership: 'yes', phone: '073 111 2222' });
        lib.assert(r.typed_matches_sender === false && r.flags.includes('typed_differs_from_sender'), JSON.stringify(r));
        lib.assert(r.success === true, 'still success');
        noNumbers(r);
      },
    },
    {
      name: 'E.164 sender variable is hashed at load and gives the same match',
      fn: () => {
        const r = evaluate({ senderDigest: '', senderCountry: '', senderE164: SENDER, phone: '0821234567' });
        lib.assert(r.typed_matches_sender === true && r.sender_country === 'ZA', JSON.stringify(r));
        noNumbers(r);
      },
    },
    {
      name: 'no verified sender -> claimed_only_number, match is null',
      fn: () => {
        const r = evaluate({ senderDigest: '', senderCountry: '', senderE164: '', phone: '082 123 4567' });
        lib.assert(r.verified_sender_available === false && r.typed_matches_sender === null, JSON.stringify(r));
        lib.assert(r.flags.includes('claimed_only_number'), JSON.stringify(r.flags));
        noNumbers(r);
      },
    },
    {
      name: 'borrowed phone -> borrowed_device + claimed_only_number; both -> second_number_claimed',
      fn: () => {
        const r = evaluate({ ...base, ownership: 'no', phone: '' });
        lib.assert(r.ownership === 'borrowed_device' && r.flags.includes('claimed_only_number'), JSON.stringify(r));
        const r2 = evaluate({ ...base, ownership: 'both', phone: '' });
        lib.assert(r2.ownership === 'self_attested_own' && r2.flags.includes('second_number_claimed'), JSON.stringify(r2));
      },
    },
    {
      name: 'foreign numbers: Zimbabwe typed -> non_za_number; foreign sender -> non_za_sender',
      fn: () => {
        const r = evaluate({ ...base, phone: '+263 77 123 4567' });
        lib.assert(r.typed_country === 'ZW' && r.typed_is_za_mobile === false && r.flags.includes('non_za_number'), JSON.stringify(r));
        const r2 = evaluate({ ...base, senderCountry: 'ZW', phone: '' });
        lib.assert(r2.flags.includes('non_za_sender'), JSON.stringify(r2));
      },
    },
    {
      name: 'landline, toll-free and junk are not SA mobiles',
      fn: () => {
        lib.assert(evaluate({ ...base, phone: '011 123 4567' }).typed_is_za_mobile === false, '011');
        lib.assert(evaluate({ ...base, phone: '0861234567' }).typed_is_za_mobile === false, '086');
        const r = evaluate({ ...base, phone: 'call me' });
        lib.assert(r.typed_number_valid === false && r.flags.includes('typed_number_unparseable'), JSON.stringify(r));
      },
    },
  ]);
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

module.exports = { main, evaluate, normalise, countryOf };
