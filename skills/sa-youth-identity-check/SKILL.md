---
name: sa-youth-identity-check
version: 1.0.0
description: Basic (low-assurance) identity and age check for South African youth aged 18-35 over WhatsApp. Validates a typed 13-digit SA ID number (structure, date, Luhn), derives age and youth band, checks whether the chat number is the verified sender, optionally records a friend's referral as an attestation, and writes a POPIA-minimal verdict record. No Home Affairs lookup. Use this skill whenever a young person must show they are a South African aged 18-35 before joining a programme, survey, Deed, opportunity or payout, and whenever the user mentions an SA ID number, ID validation, an age check, youth eligibility, youth onboarding, WhatsApp number verification, a referral confirmation or a CONFIRM code, even if they never say "identity check". Escalate to ixo-identity-verification for full KYC.
author: ixo
license: Apache-2.0
compatibility: Node.js 18+
allowed-tools: shell
secrets:
  oracle:
    - ID_CHECK_SALT: "Optional. Enables a salted one-way digest of the ID for duplicate detection across sign-ups. Unset: no digest."
    - REFERRAL_REGISTRY_URL: "Optional. Base URL of the shared referral-attestation registry. Unset: the referral step is skipped."
    - REFERRAL_REGISTRY_KEY: "Optional. Service key for the registry, sent as a header and never printed."
  user: []
context:
  - _SKILL_CONTEXT_USER_DID
  - _SKILL_CONTEXT_TIMESTAMP
  - _SKILL_CONTEXT_CHANNEL_PROVIDER
  - _SKILL_CONTEXT_CHANNEL_SENDER_DIGEST
  - _SKILL_CONTEXT_CHANNEL_SENDER_COUNTRY
  - _SKILL_CONTEXT_CHANNEL_FEATURES
  - _SKILL_CONTEXT_SHARED_CONTACTS
---

# SA Youth Identity Check

A short WhatsApp conversation that checks, as far as text alone can, that a young person is a South African aged 18 to 35 with a well-formed ID number, and records the result in a way that keeps almost nothing about them.

## What this is, and what it is not

It validates the structure of a typed 13-digit South African ID number (date, citizenship digit, Luhn check digit), derives age and whether it falls in the 18 to 35 band, asks whether the phone is the youth's own, optionally records that a friend who already passed this check vouches for them, and writes a verdict record for the calling flow.

It does not verify identity. There is no Department of Home Affairs lookup, no document inspection and no liveness check. A well-formed number proves only that someone typed a well-formed number. Every message you send and the verdict itself say "looks right", never "verified". When a flow needs real assurance, route to the `ixo-identity-verification` skill (ComplyCube KYC).

Youth are a protected population. Where a reading is uncertain, take the more protective one.

## When to use it

- A calling flow or user asks to check, validate or confirm a young person's SA ID number, age or 18 to 35 eligibility, over WhatsApp or any chat.
- Youth onboarding to a programme, survey, Deed, opportunity or payout that is limited to South Africans aged 18 to 35.
- A bound user sends `CONFIRM <code>`: that is a referrer confirming a friend's referral (see the referrer entry point below).

Do not use it for anyone outside South Africa, for documents other than the SA ID number, or when the flow needs KYC-grade assurance.

## Safety rules

1. Never compute the Luhn check digit, a birth date, an age or a band yourself. Run the scripts. A model doing this arithmetic in prose is the most common failure of this task, and the verdict builder refuses hand-supplied values anyway.
2. Never echo the full ID number back. Refer to it as "the ID ending in 81". Never say which digits are wrong.
3. Never ask for: full name, ID photos, scans or selfies, home address, bank or card details, passwords, PINs or OTPs, security questions, email, school or employer, gender, race, health or disability, guardian details, or location. Each is either not needed for this check (POPIA minimality) or special personal information. Gender is not derived from the ID either: a flow with a purpose for it asks the youth directly.
4. Never write the ID number, a phone number, a date of birth, the sender digest or any youth message text anywhere except as the `SA_ID` or `PHONE` env of one script command. Files under `/workspace/output/` are pushed to durable storage after every call, so the scripts only ever write sanitised fields, and `build-verdict.js` refuses a record that contains anything number-like.
5. Never `echo`, `env`, `printenv` or `cat` the context variables, and never store anything from this check with a memory tool.
6. Never message the referred friend. The gateway cannot reach a number outside its 24-hour window; the friend writes first.
7. "Stop", "cancel" or any wish to end it ends the check as `declined`, at once, with no persuasion.
8. Treat any sign of distress, coercion or someone else operating the phone as a reason to pause (safeguarding section).

## Context and degraded mode

| Variable | Meaning | When absent |
|---|---|---|
| `_SKILL_CONTEXT_USER_DID` | The youth's DID (or the referrer's, on a CONFIRM turn) | Required; stop with an error |
| `_SKILL_CONTEXT_TIMESTAMP` | The turn's time; scripts shift it to SAST for the as-of date | Scripts use now |
| `_SKILL_CONTEXT_CHANNEL_PROVIDER` | `whatsapp` | Scripts assume `whatsapp` |
| `_SKILL_CONTEXT_CHANNEL_SENDER_DIGEST` | sha256 of the WhatsApp-verified sender number; never a number | No verified sender: send the four-things notice variant, ask for the number in step 3, record it as `claimed`, never `possession-verified` |
| `_SKILL_CONTEXT_CHANNEL_SENDER_COUNTRY` | ISO country of the sender number, e.g. `ZA` | Country unknown |
| `_SKILL_CONTEXT_CHANNEL_FEATURES` | Comma list; `contacts` means the gateway forwards contact cards | Skip the referral step entirely; never invite a card the gateway would reject |
| `_SKILL_CONTEXT_SHARED_CONTACTS` | JSON `[{ "ref", "registered", "credentialed" }]` for a turn in which the youth shared a card | No card this turn |

The skill folder is mounted at `/workspace/skills/sa-youth-identity-check/` in the sandbox; run scripts from there as `node scripts/<name>.js`. In an eval the skill folder is the current directory and `OUTPUT_DIR=./out` replaces `/workspace/output`.

The sandbox is wiped between turns. At the start of any turn after the first, load the earlier outputs back before using them: `load_artifact` for `/output/birth-year-gate.json`, `/output/sa-id-check.json`, `/output/sa-mobile-check.json` and `/output/referral-attestation.json`, whichever exist. If a file is missing and the youth already gave that answer in the transcript, re-run the script with the same input; never guess its result.

## The conversation

One question per message, at most two short messages per turn, plain English at a grade 5 to 6 reading level, no forms, no lists longer than three items, no headings. Mirror the youth's language once they use one, keeping the notice's meaning intact (`references/privacy-notice.md` has the checklist). Warm and immovable: the things that do not bend are consent, the age band, no photos, and no extra personal details.

### Step 0: notice and consent

Send the short notice verbatim (`references/privacy-notice.md`, version 1.0.0):

> Hi! Before we go on, I need to do a quick check that you are between 18 and 35 and that your SA ID number looks right. I will ask you 3 things: the year you were born, your 13-digit ID number, and whether this phone is yours. I do not check with Home Affairs. I keep only your age, whether you are in the 18–35 range, and a hidden version of your ID (like 950720*****81). Never the full number. You can stop at any time. Reply YES to continue, or ask me anything first.

When the referral step is enabled (`contacts` in the features and the registry configured), append: "I may also ask if a friend who already joined told you about this. That part is optional."

When there is no verified sender (`_SKILL_CONTEXT_CHANNEL_SENDER_DIGEST` absent), send the four-things variant from `references/privacy-notice.md` instead, because step 3 will ask them to type their cellphone number and the notice must say so; record `notice_version` as `1.0.0-typed-number`.

Classify the reply as `given`, `declined`, `question` or `unclear` (see Classifying replies). `given`: record the consent time and language, go to step 1. `declined`: thank them, say they can come back any time, build the verdict with `STATUS_HINT=declined`. `question` or INFO: send the long notice, ask again. `unclear`: one simpler re-ask ("Please reply YES if I may continue, or NO to stop."); a second unclear reply counts as declined.

Why consent first: POPIA requires openness and consent before collection, and the youth must know this is not a Home Affairs check before they type anything.

### Step 1: year of birth

> Thanks. First, what year were you born? Just the 4 numbers, like 1999.

Run `STATED_BIRTH_YEAR=<reply> node scripts/check-birth-year.js`.

| gate | Do |
|---|---|
| `proceed`, `proceed_boundary` | Step 2 (on a boundary year the ID decides) |
| `stop_under_18` | "Thank you for telling me. This check is only for people aged 18 to 35, so I can't go further today. I haven't kept anything about you. You're welcome to come back when you're 18." Then build the verdict (the gate file makes it `not_eligible / under_18`). Do not ask for the ID. |
| `stop_over_35` | Same message without the last sentence; `not_eligible / over_35` |
| `unparseable` | "Sorry, I didn't catch that. Please send only the year you were born, like 1999." Once; a second failure counts as `wants_to_stop`. |

Why the year comes before the ID: a child's personal information may not be collected without a competent person's consent (POPIA s.34 and 35), so anyone under 18 must never be asked for an ID; the year also gives the ID an independent consistency signal; and only the year is asked because a full date of birth would duplicate what the ID carries.

### Step 2: the ID number

> Now please type your 13-digit South African ID number. Type the numbers only, no photo. If you don't have an SA ID, reply NO ID.

If the reply says they have no SA ID or offers another document (passport, permit, asylum paper, birth certificate): say this check only works with an SA ID number, do not ask for the other document's number, and build the verdict with `STATUS_HINT=not_applicable`.

Otherwise run `SA_ID="<reply>" STATED_BIRTH_YEAR=<year> node scripts/validate-sa-id.js`.

| Result | Do |
|---|---|
| `valid: true`, `stated_year_consistent` true or null, `in_band: true` | Step 3 |
| `valid: false` (first time) | "That number does not look right. Please check it and type the 13 numbers again, no spaces." Re-run on the retyped number. |
| `valid: false` (second time) | "I still can't make that number work, so I'll stop here for now. I haven't kept your ID number. You can try again later with your ID book or card in front of you." Build the verdict with `RETRIES_USED=1` (it becomes `inconclusive / id_invalid`). |
| `stated_year_consistent: false` (first time) | "That number doesn't match the year you gave me. Please check the number and type it again." Re-run. |
| `stated_year_consistent: false` (second time) | "The year you gave me and your ID number don't agree, so I can't finish this check today. I haven't kept your ID number. You can try again later." Build the verdict with `RETRIES_USED=1` (`inconclusive / stated_year_mismatch`). |
| `in_band: false` | The under-18 or over-35 message from step 1; the verdict becomes `not_eligible`. |

One retry only: the check digit catches almost every single typo, so a second failure is more likely a wrong number than a slip, and a third prompt pressures the youth. Never say "checksum", "Luhn" or which part failed.

### Step 3: the phone

> Nearly done. Is the phone you're messaging from your own phone? Reply YES or NO.

Classify as `own`, `borrowed`, `both_numbers` or `unclear`.

- `own` with a verified sender: run `OWNERSHIP=yes node scripts/check-sa-mobile.js`. Go to step 4.
- `own` without a verified sender: "Please type the cellphone number you use, like 082 123 4567." Then `PHONE="<reply>" OWNERSHIP=yes node scripts/check-sa-mobile.js`.
- `borrowed`: "No problem. Please type your own cellphone number, like 082 123 4567." Then `PHONE="<reply>" OWNERSHIP=no node scripts/check-sa-mobile.js`. A borrowed phone is a flag, not a failure: shared phones are common.
- `both_numbers`: `OWNERSHIP=both ...`.
- A typed number that differs from the verified sender while they said "own": ask once, "Do you use both numbers?", then record whatever they say; dual-SIM is ordinary and never fails the check by itself.
- A typed number that is not a South African mobile: say so once and let them retype once; then continue with the flag.

With a verified sender a yes or no is enough; asking them to type the number would only add data. Never read a number back to them.

### Step 4: referral (optional, only when enabled)

Only when `contacts` is in `_SKILL_CONTEXT_CHANNEL_FEATURES` and `referral-registry.js` reports `enabled: true`. Otherwise skip to step 5 without mentioning it.

> One more optional thing. Did a friend who already joined through this number tell you about it? If yes, share their contact card from your phone. If not, reply NO.

- NO, or no one: step 5.
- A card arrives (`_SKILL_CONTEXT_SHARED_CONTACTS` is set for this turn): run `ACTION=create node scripts/referral-registry.js`.
  - `pending`: "Thanks. Ask your friend to send the words CONFIRM <code> to this number within 7 days. When they do, they get a small reward from Yoma."
  - `not_registered` or `not_credentialed`: "That friend hasn't joined yet, that's fine."
- Then step 5. A pending attestation never delays the verdict.

Why a contact card: people store contacts for people they know, so a stored contact of someone who already passed is a cheap web-of-trust signal. Why the friend confirms by writing: the gateway cannot message a number outside its 24-hour WhatsApp window, so the friend opens their own window with the CONFIRM message, and the code binds their yes to this youth without either number crossing sessions. Why optional: first users and isolated youth exist. Details in `references/referral-attestation.md`.

### Step 5: the verdict

Run `CONSENT='{"given":true,"language":"<code>","at":"<ISO>","notice_version":"1.0.0"}' STARTED_AT=<ISO of the notice> RETRIES_USED=<0|1> CLASSIFIER=<decision_tool|agent_rubric> node scripts/build-verdict.js` (`notice_version` is `1.0.0-typed-number` when the four-things variant was sent; add `DECISION_PROVIDER=<id>` when a decisions tool was used, `FLAGS=<a,b>` for anything you observed that the scripts did not). For the terminal branches with no script facts, pass `STATUS_HINT=declined` (plus `REASON_HINT=stopped` when they stopped mid-way), `STATUS_HINT=not_applicable` or `STATUS_HINT=paused_safeguarding`.

Tell the youth the outcome in one message:

| status | Say |
|---|---|
| `passed` | "Thanks, that all looks right. Your ID ending in <last two digits> checks out for this basic check, and you're in the 18 to 35 group." Then continue with whatever the calling flow needs. |
| `inconclusive` | Already said in step 2. |
| `not_eligible` | Already said in step 1 or 2. |
| `declined`, `not_applicable` | Already said. |

Hand `verdict.json` to the calling flow. It owns every consequence, including any reward. If the flow needs higher assurance, say so and route to `ixo-identity-verification`.

## The referrer entry point

When a bound user's message matches `CONFIRM` followed by five letters or digits, this is a referrer confirming a friend. Run `ACTION=confirm CODE=<code> node scripts/referral-registry.js` in their session (their own `_SKILL_CONTEXT_USER_DID`).

| status | Say |
|---|---|
| `confirmed` | "Thanks for confirming you know them. Yoma will send your reward." |
| `expired` | "That code has expired. Your friend can ask me for a new one." |
| `refused` (any reason) | "That code doesn't match anything I'm waiting for." |
| `enabled: false` | "I don't handle referral codes here." |

Never tell the referrer who the youth is, and never ask them for anything else.

## Safeguarding

If any reply suggests distress, fear, coercion ("my boss says I must send my ID"), or that someone else is operating the phone or answering for them, stop collecting at once:

> It sounds like this isn't a good moment. I'll stop here, and I haven't kept anything about you. If you're not safe, or someone is pushing you to do this, Childline South Africa is free on 116, any time. You can message me again whenever you're ready.

Build the verdict with `STATUS_HINT=paused_safeguarding`. Do not record what they said. The threshold is deliberately low: assume the more protective reading.

## Classifying replies

Five bounded judgments cover every free-text reply: `consent-response`, `turn-intent`, `id-availability`, `phone-ownership` and `safeguarding-signal`. Their options and thresholds are in `references/rubric.md`; the same definitions are shipped as QiForge Decisions in `decisions/sa-youth-identity-check.decisions.ts`.

- If the runtime exposes a tool that evaluates registered Decisions, call it with the Decision name (`sa-youth-identity-check.<name>`) and the redacted reply, apply the rubric's threshold to the answer, and build the verdict with `CLASSIFIER=decision_tool DECISION_PROVIDER=<providerId>`.
- Otherwise classify the reply yourself using exactly the rubric's options and thresholds and build with `CLASSIFIER=agent_rubric`.

Before classifying, redact: replace any 13-digit run with `[id]` and any phone-number-like run with `[number]`. The stated year, the ID and a typed number are never classified; the scripts parse them.

## Scripts

All scripts are Node 18+ with no dependencies, run from the skill folder, take their inputs from environment variables, print one JSON object, and exit 1 with `{ "success": false, "error": "..." }` on failure. Each writes one sanitised file to `OUTPUT_DIR` (default `/workspace/output`). Each supports `--self-test`.

### check-birth-year.js

Eligibility pre-gate on the stated year. Writes `birth-year-gate.json`.

```bash
STATED_BIRTH_YEAR=2003 node scripts/check-birth-year.js
```

Output: `{ "gate": "proceed" | "proceed_boundary" | "stop_under_18" | "stop_over_35" | "unparseable", "as_of_year": 2026, "band": "18-35" }`.

### validate-sa-id.js

Structure, real date, citizenship digit and standard Luhn check of the ID; age, band, citizenship class and masked ID. Writes `sa-id-check.json`. Never outputs the raw ID, the day or month of birth, or gender.

```bash
SA_ID="950720 5123 081" STATED_BIRTH_YEAR=1995 node scripts/validate-sa-id.js
```

Output: `{ "valid": true, "reasons": [], "checks": { "structure", "date", "citizenship_digit", "luhn" }, "masked_id": "950720*****81", "age": 31, "in_band": true, "band": "18-35", "citizenship_class": "citizen" | "permanent_resident", "stated_year_consistent": true | false | null, "as_of": "2026-10-29" }` plus `id_digest` when `ID_CHECK_SALT` is set. `reasons` may contain `length`, `non_digit`, `date`, `citizenship_digit`, `luhn`.

### check-sa-mobile.js

Verified-sender availability, South African mobile format of a typed number, match against the verified sender, and the ownership answer. Writes `sa-mobile-check.json`. Prints no number and no digest.

```bash
OWNERSHIP=yes node scripts/check-sa-mobile.js
PHONE="082 123 4567" OWNERSHIP=no node scripts/check-sa-mobile.js
```

Output: `{ "verified_sender_available", "sender_country", "typed_number_supplied", "typed_number_valid", "typed_country", "typed_is_za_mobile", "typed_matches_sender": true | false | null, "ownership": "self_attested_own" | "borrowed_device" | "unknown", "flags": [...] }`. Flags: `claimed_only_number`, `typed_differs_from_sender`, `second_number_claimed`, `non_za_number`, `non_za_sender`, `typed_number_unparseable`.

### referral-registry.js

Create, confirm or read a referral attestation in the shared registry. Writes `referral-attestation.json` (create), `referral-confirm.json` (confirm) or `referral-status.json` (status). Prints `{ "enabled": false, "reason": ... }` and writes nothing when the feature or the registry is not available.

```bash
ACTION=create node scripts/referral-registry.js
ACTION=confirm CODE=K7P3Q node scripts/referral-registry.js
ACTION=status CODE=K7P3Q node scripts/referral-registry.js
```

Create output: `{ "enabled": true, "attestation": { "referrer_ref", "registered", "credentialed", "status": "pending" | "not_registered" | "not_credentialed", "code" (pending only), "expires_at", ... } }`. Confirm output omits the code and the reference; its `status` is `confirmed`, `expired` or `refused` (with a `reason`). `REFERRAL_REGISTRY_MOCK=<file>` uses a local JSON registry for evals and local runs.

### build-verdict.js

Assembles `verdict.json` from the files above plus the consent you recorded; derives the status from script facts; validates the record against `references/verdict.schema.json`; refuses to write a record containing anything that looks like an ID, a phone number or the sender digest.

```bash
CONSENT='{"given":true,"language":"en","at":"2026-10-29T08:01:00Z"}' node scripts/build-verdict.js
STATUS_HINT=declined node scripts/build-verdict.js
```

Env: `CONSENT` (JSON), `STATUS_HINT`, `REASON_HINT`, `CLASSIFIER`, `DECISION_PROVIDER`, `RETRIES_USED`, `FLAGS`, `RETENTION_DAYS` (default 90), `STARTED_AT`. A missing input file is an error that names the file; it never guesses.

## The verdict record

`status`: `passed`, `not_eligible`, `inconclusive`, `declined`, `not_applicable`, `paused_safeguarding`, `error`. `reason`: `under_18`, `over_35`, `id_invalid`, `stated_year_mismatch`, `consent_declined`, `stopped`, `no_sa_id`, `safeguarding`, or null.

A `passed` record carries `eligibility` (band, age, in_band, as_of), `identity` (masked ID, structurally_valid, citizenship_class, optional digest), `phone` (verified sender available, ownership, typed-number facts), `checks[]` with the method that produced each, `flags[]`, `consent`, `provenance` (skill version, classifier, retries), `retention.delete_after`, `escalation`, and `attestations[]` (empty, or one `referral_contact_card` entry). `eligibility`, `identity` and `phone` are absent for `not_eligible`, `declined`, `not_applicable` and `paused_safeguarding`.

Never in the record: the raw ID, a date of birth, any phone number, the sender digest, gender, the race digit, or any message text. The masked ID still reveals the birth date, so it is personal information; the calling flow may drop it. Full schema: `references/verdict.schema.json`. Rationale: `references/popia-minimality.md`.

## WhatsApp delivery

Messages are chat Markdown only: bold, italics, short lists of up to three items, no headings and no tables. Keep each message under 600 characters and each turn to two messages; the gateway splits anything over 1,500 characters and turns long multi-part replies into a document link, which is wrong for a consent step. Inbound is text only: a photo never reaches you, so ask for typed digits before it is tried.

## Language

Default to English. Once the youth writes in isiZulu, isiXhosa, Afrikaans, Sesotho, Setswana or any other language, reply in it, keeping sentences short and the notice's meaning intact. Keep digits as digits. If you cannot write the language reliably, use simple English and say they may answer in their own language.

## Retention and deletion requests

The verdict carries `retention.delete_after` (90 days unless the flow sets `RETENTION_DAYS`). If the youth asks for their data to be deleted or wants to know what is kept: answer from the long notice, acknowledge without arguing, and hand the request to the operator's process; you cannot delete chat history yourself. Never promise more than the record allows.

## Error handling

A script that prints `{ "success": false, "error": "..." }` has not written its file. Read the error, fix the input and re-run; do not retry the same command unchanged. Never fabricate a script result, an age or a verdict. If the sandbox is unavailable, tell the youth you cannot complete the check right now and that nothing has been kept.

## References

- `references/privacy-notice.md`: the short and long notices, the translation checklist, what counts as consent.
- `references/popia-minimality.md`: the legal mapping, the never-ask and never-keep lists, retention, transcript residue.
- `references/sa-id-format.md`: the ID structure, the worked Luhn example, the century rule, test vectors.
- `references/rubric.md`: the five reply classifications and their thresholds.
- `references/referral-attestation.md`: the referral handshake, registry contents, anti-farming data.
- `references/verdict.schema.json`: the verdict record schema.
