#!/usr/bin/env node
'use strict';
/**
 * Eligibility pre-gate on the stated year of birth, before any ID is asked for.
 *
 * Usage:
 *   STATED_BIRTH_YEAR=2003 node scripts/check-birth-year.js
 *   node scripts/check-birth-year.js --self-test
 *
 * Env:  STATED_BIRTH_YEAR (required; "2003", "03", "'03"), AS_OF (optional), OUTPUT_DIR (optional)
 * Writes: <OUTPUT_DIR>/birth-year-gate.json and prints the same JSON.
 *
 * gate: proceed | proceed_boundary | stop_under_18 | stop_over_35 | unparseable
 * For as-of year Y the band 18-35 means Y-36 <= year <= Y-18; equality at either
 * end is "proceed_boundary" because only the full date in the ID can decide it.
 */
const lib = require('./_lib');

function evaluate(options = {}) {
  const raw = options.statedBirthYear !== undefined ? options.statedBirthYear : lib.env('STATED_BIRTH_YEAR');
  const today = lib.asOf(options);
  const year = lib.parseYear(raw, today.year);
  const base = { success: true, band: lib.YOUTH_BAND.label, as_of_year: today.year };
  if (year === null) return { ...base, gate: 'unparseable' };
  const lo = today.year - (lib.YOUTH_BAND.max + 1);
  const hi = today.year - lib.YOUTH_BAND.min;
  let gate;
  if (year < lo) gate = 'stop_over_35';
  else if (year > hi) gate = 'stop_under_18';
  else if (year === lo || year === hi) gate = 'proceed_boundary';
  else gate = 'proceed';
  return { ...base, gate };
}

async function main(options = {}) {
  const result = evaluate(options);
  if (result.success) lib.writeOutput('birth-year-gate.json', result, options);
  return result;
}

function selfTest() {
  const AS_OF = '2026-10-29';
  const t = (input, gate) => ({
    name: `${JSON.stringify(input)} -> ${gate}`,
    fn: () => {
      const r = evaluate({ statedBirthYear: input, asOf: AS_OF });
      lib.assert(r.gate === gate, `got ${r.gate}`);
    },
  });
  lib.runSelfTest([
    t('2003', 'proceed'),
    t('1995', 'proceed'),
    t('03', 'proceed'),
    t("'95", 'proceed'),
    t(' 2001 ', 'proceed'),
    t('1990', 'proceed_boundary'),
    t('2008', 'proceed_boundary'),
    t('1989', 'stop_over_35'),
    t('1985', 'stop_over_35'),
    t('2009', 'stop_under_18'),
    t('2010', 'stop_under_18'),
    t('26', 'stop_under_18'),
    t('abc', 'unparseable'),
    t('19955', 'unparseable'),
    t('', 'unparseable'),
    t(undefined, 'unparseable'),
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

module.exports = { main, evaluate };
