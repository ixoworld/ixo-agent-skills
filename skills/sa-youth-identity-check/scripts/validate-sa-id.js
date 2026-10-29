#!/usr/bin/env node
'use strict';
/**
 * Structural validation of a South African ID number, plus the derived facts
 * the check needs (age, youth band, citizenship class, masked id).
 *
 * Usage:
 *   SA_ID="950720 5123 081" STATED_BIRTH_YEAR=1995 node scripts/validate-sa-id.js
 *   node scripts/validate-sa-id.js --self-test
 *
 * Env:  SA_ID (required), STATED_BIRTH_YEAR (optional), AS_OF (optional, YYYY-MM-DD),
 *       OUTPUT_DIR (optional), _ORACLE_SECRET_ID_CHECK_SALT (optional),
 *       _SKILL_CONTEXT_TIMESTAMP (optional)
 * Writes: <OUTPUT_DIR>/sa-id-check.json and prints the same JSON.
 *
 * Never outputs the raw ID, the day or month of birth, or anything derived
 * from the gender or race digits.
 */
const lib = require('./_lib');

function evaluate(options = {}) {
  const raw = options.saId !== undefined ? options.saId : lib.env('SA_ID');
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { success: false, error: 'SA_ID is required' };
  }
  const today = lib.asOf(options);
  const statedRaw = options.statedBirthYear !== undefined ? options.statedBirthYear : lib.env('STATED_BIRTH_YEAR');
  const statedYear = lib.parseYear(statedRaw, today.year);
  const salt = options.salt !== undefined ? options.salt : lib.env('_ORACLE_SECRET_ID_CHECK_SALT');

  const id = String(raw).replace(/[\s-]/g, '');
  const reasons = [];
  const checks = { structure: null, date: null, citizenship_digit: null, luhn: null };
  const base = { success: true, band: lib.YOUTH_BAND.label, as_of: today.iso };

  if (!/^\d{13}$/.test(id)) {
    reasons.push(/^\d+$/.test(id) ? 'length' : 'non_digit');
    checks.structure = false;
    return { ...base, valid: false, reasons, checks, masked_id: null, age: null, in_band: null, citizenship_class: null, stated_year_consistent: null };
  }
  checks.structure = true;

  const yy = +id.slice(0, 2);
  const month = +id.slice(2, 4);
  const day = +id.slice(4, 6);
  const year = lib.centuryYear(yy, today.year);
  let dob = null;
  if (!lib.isRealDate(year, month, day)) {
    checks.date = false;
    reasons.push('date');
  } else if (year > today.year || (year === today.year && (month > today.month || (month === today.month && day > today.day)))) {
    checks.date = false;
    reasons.push('date');
  } else {
    checks.date = true;
    dob = { year, month, day };
  }

  const citizenshipDigit = +id[10];
  let citizenshipClass = null;
  if (citizenshipDigit === 0) citizenshipClass = 'citizen';
  else if (citizenshipDigit === 1) citizenshipClass = 'permanent_resident';
  checks.citizenship_digit = citizenshipClass !== null;
  if (!checks.citizenship_digit) reasons.push('citizenship_digit');

  checks.luhn = lib.luhnCheckDigit(id.slice(0, 12)) === +id[12];
  if (!checks.luhn) reasons.push('luhn');

  const valid = reasons.length === 0;
  const age = dob ? lib.ageOn(dob, today) : null;
  const inBand = age === null ? null : age >= lib.YOUTH_BAND.min && age <= lib.YOUTH_BAND.max;
  const statedYearConsistent = statedYear === null || dob === null ? null : statedYear === dob.year;

  const result = {
    ...base,
    valid,
    reasons,
    checks,
    masked_id: lib.maskId(id),
    age,
    in_band: inBand,
    citizenship_class: citizenshipClass,
    stated_year_consistent: statedYearConsistent,
  };
  if (valid && salt) result.id_digest = `sha256:${lib.hmacHex(salt, id)}`;
  return result;
}

async function main(options = {}) {
  const result = evaluate(options);
  if (result.success) lib.writeOutput('sa-id-check.json', result, options);
  return result;
}

function selfTest() {
  const AS_OF = '2026-10-29';
  const run = (saId, extra = {}) => evaluate({ saId, asOf: AS_OF, ...extra });
  const fixtures = [
    // [id, valid, age, in_band, citizenship_class, reasons]
    ['8001015009087', true, 46, false, 'citizen', []],
    ['9507205123081', true, 31, true, 'citizen', []],
    ['0103150045088', true, 25, true, 'citizen', []],
    ['9908124567186', true, 27, true, 'permanent_resident', []],
    ['0810295002085', true, 18, true, 'citizen', []],
    ['9110290101086', true, 35, true, 'citizen', []],
    ['0811055001085', true, 17, false, 'citizen', []],
    ['9010280004086', true, 36, false, 'citizen', []],
    ['8501015009086', true, 41, false, 'citizen', []],
    ['0103150045089', false, 25, true, 'citizen', ['luhn']],
    ['0102300045089', false, null, null, 'citizen', ['date']],
    ['0113150045087', false, null, null, 'citizen', ['date']],
    ['0103150045286', false, 25, true, null, ['citizenship_digit']],
  ];
  const cases = fixtures.map(([id, valid, age, inBand, cls, reasons]) => ({
    name: `${lib.maskId(id)} -> valid=${valid} age=${age} in_band=${inBand} ${cls} ${JSON.stringify(reasons)}`,
    fn: () => {
      const r = run(id);
      lib.assert(r.success, 'success');
      lib.assert(r.valid === valid, `valid ${r.valid}`);
      lib.assert(r.age === age, `age ${r.age}`);
      lib.assert(r.in_band === inBand, `in_band ${r.in_band}`);
      lib.assert(r.citizenship_class === cls, `citizenship ${r.citizenship_class}`);
      lib.assert(JSON.stringify(r.reasons) === JSON.stringify(reasons), `reasons ${JSON.stringify(r.reasons)}`);
      lib.assert(!JSON.stringify(r).includes(id), 'raw id leaked into output');
    },
  }));
  cases.push({
    name: 'luhn: 800101500908 sums to 33 -> check digit 7 (standard parity)',
    fn: () => lib.assert(lib.luhnCheckDigit('800101500908') === 7, `got ${lib.luhnCheckDigit('800101500908')}`),
  });
  cases.push({
    name: 'luhn: a parity-flipped implementation (doubling indices 0,2,..,10) would return 3, not 7',
    fn: () => {
      const flipped = (p) => {
        let sum = 0;
        for (let i = 0; i < 12; i += 1) {
          let n = +p[i];
          if ((12 - i) % 2 === 0) {
            n *= 2;
            if (n > 9) n -= 9;
          }
          sum += n;
        }
        return (10 - (sum % 10)) % 10;
      };
      lib.assert(flipped('800101500908') === 3, `flipped gave ${flipped('800101500908')}`);
      lib.assert(flipped('800101500908') !== lib.luhnCheckDigit('800101500908'), 'flipped must differ');
    },
  });
  cases.push({
    name: 'spaces and dashes are stripped; stated year consistency is reported',
    fn: () => {
      const r = run('950720 5123-081', { statedBirthYear: '1995' });
      lib.assert(r.valid === true && r.stated_year_consistent === true, JSON.stringify(r));
      const r2 = run('9507205123081', { statedBirthYear: "'94" });
      lib.assert(r2.stated_year_consistent === false, 'mismatch expected');
      const r3 = run('9507205123081');
      lib.assert(r3.stated_year_consistent === null, 'null without stated year');
    },
  });
  cases.push({
    name: 'leap day 29 Feb 2004 is a real date; month 13 is not',
    fn: () => {
      lib.assert(lib.isRealDate(2004, 2, 29) === true, '2004-02-29');
      lib.assert(lib.isRealDate(2003, 2, 29) === false, '2003-02-29');
      lib.assert(lib.isRealDate(2001, 13, 15) === false, 'month 13');
    },
  });
  cases.push({
    name: 'century pivot: 26 -> 2026, 27 -> 1927 (as of 2026)',
    fn: () => {
      lib.assert(lib.centuryYear(26, 2026) === 2026, '26');
      lib.assert(lib.centuryYear(27, 2026) === 1927, '27');
      lib.assert(lib.centuryYear(0, 2026) === 2000, '00');
    },
  });
  cases.push({
    name: 'a birth date after the as-of date is rejected',
    fn: () => {
      const r = run('2612015080087', { asOf: '2026-10-29' });
      lib.assert(r.reasons.includes('date'), JSON.stringify(r.reasons));
    },
  });
  cases.push({
    name: 'id_digest only with a salt, and it is not the raw id',
    fn: () => {
      const r = run('9507205123081', { salt: 'test-salt' });
      lib.assert(typeof r.id_digest === 'string' && r.id_digest.startsWith('sha256:'), 'digest');
      lib.assert(!r.id_digest.includes('9507205123081'), 'digest leaks id');
      const r2 = run('9507205123081', { salt: '' });
      lib.assert(r2.id_digest === undefined, 'no digest without salt');
    },
  });
  cases.push({
    name: 'wrong length and non-digits fail structure without touching other checks',
    fn: () => {
      const r = run('95072051230');
      lib.assert(r.valid === false && r.reasons[0] === 'length' && r.checks.luhn === null, JSON.stringify(r));
      const r2 = run('95072051230AB');
      lib.assert(r2.reasons[0] === 'non_digit', JSON.stringify(r2));
    },
  });
  lib.runSelfTest(cases);
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

module.exports = { main, evaluate };
