# South African ID number format

A South African identity number is 13 digits. This skill checks its structure and nothing else: no Home Affairs lookup, no document, no photo. Every rule here is implemented in `scripts/validate-sa-id.js`; the agent never computes an age or a check digit in prose, because a wrong figure in a WhatsApp bubble is a wrong verdict with no audit trail.

## Structure: YYMMDD SSSS C A Z

| Positions | Digits | Meaning | What the skill does |
| --- | --- | --- | --- |
| 1 to 2 | YY | Year of birth, two digits | Used for age only, after the century rule below. |
| 3 to 4 | MM | Month of birth | Used for age only. Must be 01 to 12. |
| 5 to 6 | DD | Day of birth | Used for age only. Must be a real day for that month and year. |
| 7 to 10 | SSSS | Sequence number; by convention 0000 to 4999 female, 5000 to 9999 male | Ignored entirely. Never decoded for gender; a flow that needs gender asks the youth. |
| 11 | C | Citizenship | 0 is a South African citizen, 1 is a permanent resident. Anything else is invalid. |
| 12 | A | Historically a race classification digit; usually 8 on current IDs | Ignored entirely. Never decoded (POPIA s.26). |
| 13 | Z | Luhn check digit over the first 12 | Recomputed with standard Luhn and compared. |

Outputs: `masked_id` keeps YYMMDD, hides SSSS and A, and shows C and Z, so `9507205123081` becomes `950720*****81`. `age`, `in_band` and `citizenship_class` are derived from the digits; the day, month, gender and raw number are never written.

## Luhn check digit, worked example

The check digit is standard Luhn over the 12-digit payload. Reference ID `8001015009087`, payload `800101500908`, expected check digit 7.

Rule: start from the rightmost payload digit (index 11) and move left, doubling every second digit (indices 11, 9, 7, 5, 3, 1). If a doubled digit exceeds 9, subtract 9. Sum all twelve values.

| Index | Digit | Doubled | After doubling | Contributes |
| --- | --- | --- | --- | --- |
| 0 | 8 | no | 8 | 8 |
| 1 | 0 | yes | 0 | 0 |
| 2 | 0 | no | 0 | 0 |
| 3 | 1 | yes | 2 | 2 |
| 4 | 0 | no | 0 | 0 |
| 5 | 1 | yes | 2 | 2 |
| 6 | 5 | no | 5 | 5 |
| 7 | 0 | yes | 0 | 0 |
| 8 | 0 | no | 0 | 0 |
| 9 | 9 | yes | 18, minus 9 = 9 | 9 |
| 10 | 0 | no | 0 | 0 |
| 11 | 8 | yes | 16, minus 9 = 7 | 7 |

Sum = 33. Check digit = `(10 - 33 % 10) % 10` = `(10 - 3) % 10` = 7. It matches the 13th digit, so `8001015009087` is well formed.

### Common mistake

An implementation that doubles indices 0, 2, 4, 6, 8, 10 instead (parity anchored on the left) gives 7, 0, 0, 1, 0, 0 for those positions, a sum of 27, and returns 3 for this payload. It rejects the reference ID and most other valid IDs, and the two parities agree only by coincidence (they happen to for `0103150045088`), so a flipped routine is not caught by a single lucky fixture. This is the bug in the routine pasted during design. `node scripts/validate-sa-id.js --self-test` contains a parity-flipped copy of the Luhn function and asserts that it returns 3 for `800101500908` while the real function returns 7. If someone "fixes" the parity, the self-test fails. Do not remove that guard.

## Century rule

The two-digit year is ambiguous. The script resolves it against the as-of date: if YY is less than or equal to the current two-digit year, the birth year is 20YY, otherwise 19YY. As of 2026, `26...` is 2026 and `27...` is 1927.

This is harmless for an 18 to 35 band: anyone in band was born between 1991 and 2008, far from either edge of the pivot. It does depend on the as-of date, which is `AS_OF` (YYYY-MM-DD) in evals and `_SKILL_CONTEXT_TIMESTAMP` converted to South African Standard Time in production, with the current clock as a last resort. Run every script in one check with the same as-of date, or a youth can be 18 in one file and 17 in another.

## Date rules

- YYMMDD must be a real calendar date, including leap years: 29 February 2004 is valid, 29 February 2001 is not, 30 February never is, and month 13 never is. A failure is reported as `reasons: ["date"]`.
- The date must not be after the as-of date. A future birth date is a typo and fails the same `date` rule.
- Age is full years completed on the as-of date. A youth born on 2008-10-29 is exactly 18 on 2026-10-29 and in band; one born on 2008-11-05 is 17 and under band.

## Test vectors

Standard Luhn, as of 2026-10-29. `validate-sa-id.js --self-test` asserts every row; re-run it before trusting this table on another date, because the ages move.

| ID | Expected | Notes |
| --- | --- | --- |
| `8001015009087` | valid, age 46, over band | Public known-valid reference; Luhn sum 33, check 7 |
| `9507205123081` | valid, age 31, in band | Male citizen born 1995-07-20; the happy-path fixture, mask `950720*****81` |
| `0103150045088` | valid, age 25, in band | Female citizen born 2001-03-15 |
| `9908124567186` | valid, age 27, in band | Permanent resident (C = 1) born 1999-08-12 |
| `0810295002085` | valid, age 18, in band | Born 2008-10-29; turns 18 on the as-of date, boundary pass |
| `9110290101086` | valid, age 35, in band | Born 1991-10-29; exactly 35, boundary pass |
| `0811055001085` | valid, age 17, under band | Born 2008-11-05 |
| `9010280004086` | valid, age 36, over band | Born 1990-10-28 |
| `8501015009086` | valid, age 41, over band | Born 1985-01-01 |
| `0103150045089` | invalid: `luhn` | Check digit broken (standard Luhn gives 8) |
| `0102300045089` | invalid: `date` | 30 February does not exist; its Luhn digit is correct, so only the date fails |
| `0113150045087` | invalid: `date` | Month 13; Luhn digit correct |
| `0103150045286` | invalid: `citizenship_digit` | C = 2; Luhn digit correct |

Each invalid fixture fails exactly one rule, so a regression in one check cannot hide behind another. The gender labels on two rows describe the fixture for reviewers only; the script never outputs them and the agent never mentions them.

## What validity does and does not mean

A well-formed number means the youth typed thirteen digits that form a plausible SA ID: a real birth date, an allowed citizenship digit and a matching check digit. It does not mean the number was issued, was issued to this person, or belongs to the phone it was typed from. Anyone can type a well-formed number, and a Luhn digit catches typos, not lies.

So the record and every message say "looks right", never "verified". `identity.structurally_valid: true` beside `assurance.dha_verified: false` is the whole claim. When a calling flow needs proof of identity, it escalates to `ixo-identity-verification`; this skill never upgrades its own wording.
