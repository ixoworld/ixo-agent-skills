# POPIA minimality for sa-youth-identity-check

POPIA is the Protection of Personal Information Act 4 of 2013. The skill processes personal information (an ID number, an age) of a protected population, so every rule here is a floor, not a preference. This document maps the design to the Act's conditions so the agent and a human reviewer can see why each rule exists and what breaks if it is bent.

## How the design meets each condition

| Condition | Section | What the skill does and why |
| --- | --- | --- |
| Accountability | s.8 | The operator named in the privacy notice is the responsible party. The verdict's `provenance` block (skill, version, classifier, decision provider) lets that operator account for how the record was produced. |
| Processing limitation: lawfulness, consent, minimality | s.9 to s.12 | Nothing is collected before the notice and an explicit affirmative (s.11(1)(a)). "Stop" or "cancel" ends collection at once, because consent can be withdrawn (s.11(2)). Only what the purpose needs is asked (s.10): a year, a number and a yes/no. |
| Purpose specification | s.13 | The notice states the purpose: confirm the youth is 18 to 35 and the SA ID number looks right, for programme eligibility. `retention.basis` in the verdict repeats it. |
| Further processing limitation | s.15 | The verdict is evidence for the calling flow's stated purpose. `assurance.statement` says it is not an authorisation, and the masked ID must not be used to rebuild the full number or to look the person up elsewhere. |
| Information quality | s.16 | The ID is validated structurally and cross-checked against the stated birth year. A mismatch is `inconclusive`; the agent never "corrects" a digit or guesses which one is wrong. |
| Openness and notification | s.18 | The short notice precedes collection; the long notice gives who, why, what, how long and rights. `consent.notice_version` records which text was shown. |
| Security safeguards | s.19 | Raw ID and phone numbers never touch disk. Every script output is sanitised, and `build-verdict.js` refuses to write a record whose strings contain a 13-digit run or a phone pattern. Secrets arrive as headers and are never printed. |
| Data subject participation | s.23 to s.25 | The youth may ask what is held, and have it corrected or deleted. See "Retention and deletion requests" below. |
| Children | s.34 to s.35 | Processing a child's personal information is prohibited without a competent person's consent. The year-of-birth gate runs before any ID is requested, so a youth under 18 never hands an ID number to this skill. |
| Special personal information | s.26 | Race and health are special personal information. The ID's digit A (historically a race classification) is never decoded, and health or disability is never asked. |

## Ask only this

Each item has a purpose the notice names. Nothing else is needed for an 18 to 35 structural check.

- The year of birth, four digits. Why: it gates children out before an ID is requested and gives the ID an independent consistency signal.
- The 13-digit SA ID number, typed. Why: it is the only document the check covers; typing keeps photos and scans out.
- Whether this phone is the youth's own, yes or no. Why: with a verified sender a yes/no is all the ownership signal needs.
- Optionally, a friend's contact card, when the referral step is enabled. Why: a stored contact of someone who passed the same check is a cheap web-of-trust signal. The card goes to the gateway, never to the oracle.
- The typed phone number only when there is no verified sender or the phone is borrowed. Why: with a verified sender the number adds nothing but data.

## Never ask

| Item | Why not |
| --- | --- |
| Full name | The check compares names to nothing; a name would only sit in the transcript. |
| ID photos, scans or selfies | Inbound media never reaches the oracle, and an image is far more data than a number. |
| Address | Not needed for age or ID structure. |
| Bank or card details | Payouts belong to the calling flow, never to an identity check. |
| Passwords, PINs or OTPs | An agent asking for these teaches the youth to hand them to anyone who asks. |
| Security questions | Same reason, and the answers are personal information in their own right. |
| Email | The channel is WhatsApp; a second contact route is extra surface. |
| School or employer | Profiling data with no bearing on the check. |
| Gender | Not required for eligibility. A flow with a real need asks the youth directly; it is never inferred from SSSS. |
| Race | Special personal information (s.26); never asked and never decoded from digit A. |
| Health or disability | Special personal information (s.26). |
| Guardian details | The youth is 18 or over by the time an ID is requested; under 18 the check stops. |
| Location | Not needed; the sender country already comes from the gateway when available. |

## Never keep

Never in the verdict, in any `/workspace/output/` file, or in the agent's prose:

- The raw 13-digit ID. The masked form is enough for recognisability.
- The full date of birth. Only the age and the in-band flag are needed.
- Any phone number, typed or derived.
- The sender digest. It is an unkeyed hash of a phone number, so it is brute-forceable; it lives in process env for one script call and nowhere else.
- The youth's message text. Classifications and timestamps are the audit trail.
- Gender, however derived.
- The decoded race digit.

Why the masked ID `YYMMDD*****AZ` is still personal information: it shows the full birth date, the citizenship digit and the check digit, and hides only the four-digit sequence and digit A. Once the check digit is fixed, roughly 500 candidate IDs remain for each mask. That is a strong identifier, not anonymised data. It is kept for recognisability ("the ID ending in 81"), and a calling flow that does not need it should drop it.

## Transcript residue

The typed ID number is in the WhatsApp transcript, the user's Matrix room mirror and the model provider's request logs regardless of what this skill does. The skill cannot remove those copies; it avoids making more:

- Never echo the ID back, in full or in part beyond "the ID ending in 81".
- Never store it with a memory tool or write it to any file other than the sanitised script outputs.
- Never run `echo` or `env` on context variables; sandbox output is captured and kept.

The operator's retention policy must cover the transcript, the Matrix mirror and the provider logs. Say so in the hand-off notes: a 90-day verdict beside an indefinite transcript is not minimal.

## Retention and deletion requests

Default retention is 90 days from `timestamps.completed_at`. `build-verdict.js` writes it as `retention.delete_after`; the calling flow may pass `RETENTION_DAYS` to set another period, and the long notice tells the youth 90 days unless the programme states otherwise.

When the youth says "delete my data", "remove my ID" or anything like it, at any point including mid-check:

- Acknowledge in one bubble and do not argue or explain why they might not want to: "OK. I have asked for your information from this check to be deleted. I will not ask you anything else."
- Stop collecting. If the check was in progress, end it as `declined` with `reason: stopped`.
- Hand the request to the operator's deletion process (the calling flow's route, or the operator contact in the long notice). The agent cannot delete the Matrix history, the transcript or the provider logs itself, so never say that it has.
- Never ask the youth to prove who they are before passing the request on; the request is tied to the session that made it.

## Third-party data in the referral step

The friend named by a contact card is a data subject too, and took no part in this conversation.

- The friend's name and number never reach the oracle. The gateway reduces the card to an opaque `ref` plus `registered` and `credentialed` booleans before the turn is built. The skill never sees, stores or asks for the number.
- The friend is informed and consents by acting: they send `CONFIRM <code>` from their own phone in their own session. The system sends nothing to the friend first.
- The youth is told, before sharing a card, that the friend will be asked to confirm, so the youth can choose not to share.
- The skill never tells the friend who the youth is. The code is the only link, and it is meaningless outside the registry.

See `referral-attestation.md` for the handshake and what the registry holds.
