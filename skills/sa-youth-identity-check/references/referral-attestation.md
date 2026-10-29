# Referral attestation

An optional step: the youth may share the WhatsApp contact card of the friend who told them about the programme. If that friend has already passed this check on the same channel and confirms from their own phone, the verdict carries one `confirmed` entry in `attestations[]`. The verdict's `status` never depends on it.

## Why a stored contact card

People store contacts for people they know. A youth who has a friend saved, and whose friend has already passed this check on this number, is less likely to be a bulk sign-up and more likely to sit inside a real social graph. That is a cheap web-of-trust signal: no document, no extra data about the youth, and a question the youth can answer with one tap.

It is one data point in `attestations[]`, never a gate. First users have nobody to name, isolated youth exist, and a missing referral says nothing bad about anyone. A `pending`, `expired`, `not_registered`, `not_credentialed` or `refused` attestation never changes `status`, `reason` or `escalation`; the calling flow decides what, if anything, to make of it.

## Why two-way, and why the referrer starts it

A shared card proves only that the youth has the friend saved. It does not prove the friend knows the youth, so the friend must confirm.

The system cannot ask the friend. Every outbound WhatsApp send goes through the recipient's own Durable Object outbox and is held beyond their 24-hour window, and the gateway has no template send path for business-initiated messages. So the friend opens their own window by sending `CONFIRM <code>` to the same number. The code ties the friend's confirmation to this youth's check without either side's number crossing sessions.

## The handshake, step by step

1. Offer the step only when `contacts` is listed in `_SKILL_CONTEXT_CHANNEL_FEATURES` and both `_ORACLE_SECRET_REFERRAL_REGISTRY_URL` and `_ORACLE_SECRET_REFERRAL_REGISTRY_KEY` exist. Ask once: "Did a friend who already joined through this number tell you about it? If yes, share their contact card from your phone. If not, just reply NO."
2. The youth shares the card. The gateway reduces it to `{ "ref": "<opaque>", "registered": true|false, "credentialed": true|false|null }` in `_SKILL_CONTEXT_SHARED_CONTACTS`, for this turn only. The card's name and number never reach the oracle, and the placeholder `message` text carries nothing from the card.
3. Run `node scripts/referral-registry.js` with `ACTION=create`. It reads `_SKILL_CONTEXT_SHARED_CONTACTS` and `_SKILL_CONTEXT_USER_DID`, registers a pending attestation and writes `referral-attestation.json` with the `code` and `expires_at`. If the contact is not registered or not credentialed, it writes that status and no code.
4. Tell the youth in one bubble: "Thanks. Ask your friend to send the words CONFIRM <code> to this number within 7 days. When they do, they get a small reward from Yoma." Then go on to the verdict; do not wait for the friend.
5. The friend sends `CONFIRM <code>` in their own session (the referrer entry point in SKILL.md). Run `referral-registry.js` with `ACTION=confirm`, `CODE`, and that session's `_SKILL_CONTEXT_USER_DID`.
6. The registry records `confirmed` only if the confirming session is the subject the card named (`confirmed_by_ref` equals `referrer_ref`) and the code is unexpired. Anything else (unknown code, wrong sender, second confirmation, expired) is `refused`, and the reply is neutral: "That code doesn't match anything I'm waiting for."
7. On `confirmed`, thank the friend in one bubble: "Thanks for confirming you know them. Yoma will send your reward." The skill never tells the friend who the youth is, not a name, not a date, not a hint. The youth's identity is not the friend's to learn from this system.

The youth's verdict is written at step 4 with the attestation `pending`. The calling flow checks later with `ACTION=status` and `CODE`; the registry, not the file, is the source of truth.

## Statuses and what the youth hears

| Status | Meaning | Wording (kind, no blame) |
| --- | --- | --- |
| `pending` | Registered; waiting for the friend | To the youth: "Thanks. Ask your friend to send the words CONFIRM <code> to this number within 7 days. When they do, they get a small reward from Yoma." |
| `confirmed` | The named friend confirmed in time | To the friend: "Thanks for confirming you know them. Yoma will send your reward." The youth is not messaged; the flow may tell them later. |
| `not_registered` | That number is not bound on this channel | To the youth: "That friend hasn't joined yet, that's fine. Let's carry on." |
| `not_credentialed` | Bound, but has not passed this check | To the youth: "That friend hasn't joined yet, that's fine. Let's carry on." Same words on purpose: the youth should not learn the friend's status in detail. |
| `expired` | 7 days passed without confirmation | Nothing is sent to the youth; the flow sees it through `status`. |
| `refused` | Confirmation from the wrong session, a second time, or with an unknown code | To the sender: "That code doesn't match anything I'm waiting for." Nothing to the youth. |

Never say "your friend did not confirm" to the youth. A friend's choice is theirs, and the youth's check is complete either way.

## What the registry holds

The registry is the only state shared between two users' sessions; each user otherwise has their own sandbox, R2 prefix and Matrix room. One row per attestation:

| Field | Content |
| --- | --- |
| `code` | 5 characters from an alphabet without 0, O, 1 or I |
| `youth_did` | The youth's `_SKILL_CONTEXT_USER_DID` |
| `referrer_ref` | Opaque keyed reference for the shared number, made by the gateway with a referral-specific prefix |
| `registered` | Whether the number is bound on this channel account |
| `credentialed` | Whether that subject has a `passed` verdict from this skill |
| `status` | One of the six statuses above |
| `created_at`, `expires_at` | ISO timestamps; `expires_at` is `created_at` plus 7 days |
| `confirmed_at`, `confirmed_by_ref` | Set on confirmation; `confirmed_by_ref` must equal `referrer_ref` |

It never holds names, phone numbers, the youth's masked ID or any message text. `referrer_ref` is deliberately not the gateway's Durable Object name and not the Auth Hub binding HMAC: a reference equal to either would let anyone holding the registry walk into the binding store. The referral-specific prefix keeps the keyed reference useless outside the registry.

Proposed home: the Auth Hub, which already keys bindings by number HMAC and holds consent fields. The script reaches it through `_ORACLE_SECRET_REFERRAL_REGISTRY_URL` and `_ORACLE_SECRET_REFERRAL_REGISTRY_KEY` (sent as a header, never printed). For evals, `REFERRAL_REGISTRY_MOCK=<file>` points the script at a local JSON file that plays the registry with the same create, confirm and status semantics.

## Anti-farming

The data supports the calling flow's policy; the skill records and never enforces. What the row makes checkable:

- Attestations per `referrer_ref` per 30 days: count rows by `referrer_ref` and `created_at`.
- One attestation per youth check: one row per `youth_did` per check.
- Confirmation only from the named subject: `confirmed_by_ref` equals `referrer_ref`.
- Expiry after 7 days, so stale codes cannot be collected later.
- A 5-character code from an alphabet without 0/O/1/I, so it survives being read aloud or retyped and cannot be guessed in a handful of tries.
- The reward only after the youth's own verdict is `passed` and the attestation is `confirmed`. Neither alone pays.

Yoma's referral programme already has matching rules: no self-referral, the referee must finish onboarding, a claim window, and one programme per referee. So the flow hands a confirmed attestation plus a `passed` verdict to Yoma rather than running a second reward ledger. Per-referrer caps belong there too.

## Degraded mode

Without `contacts` in `_SKILL_CONTEXT_CHANNEL_FEATURES`, or without either registry secret, `referral-registry.js` prints `{ "enabled": false }` and the step is skipped silently: no referral question, no add-on sentence in the privacy notice, and `attestations` is `[]` in the verdict.

Do not invite a contact card the gateway would reject. A gateway without the contacts feature answers a shared card with "I can read text messages here", which makes the agent look as if it asked for something it cannot receive, and leaves the youth wondering where their friend's number went. If in doubt, skip the step.
