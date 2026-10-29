# Reply classification rubric (version 1.0.0)

This file mirrors `decisions/sa-youth-identity-check.decisions.ts` option for
option and threshold for threshold. When the runtime exposes a decisions tool,
evaluate the named Decision and apply the policy below to its answer. When it
does not, classify the reply yourself using the same options, then apply the
same policy. Either way the verdict records which one you used
(`provenance.classifier`: `decision_tool` or `agent_rubric`).

Why the two must stay identical: the threshold is a policy artefact. If the
rubric drifts from the Decision, the same reply would be treated differently
depending on which oracle happened to have a provider configured, and the
record would no longer mean one thing.

Before classifying, redact the reply the way the Decisions do: replace any
13-digit run with `[id]` and any phone-number-like run with `[number]`. Never
pass an ID or a number to a provider. An empty reply is never classified; ask
again.

## consent-response (after the privacy notice)

| Option | Means |
|---|---|
| `given` | An explicit affirmative in any language: YES, yes please, ja, ewe, yebo, ok yes, go ahead |
| `declined` | They do not want to continue or do not want to share their ID |
| `question` | They ask what, why, who, how long, what happens to the data, or reply INFO |
| `unclear` | Anything else, including "ok?", a greeting, or silence |

Policy: `given` with confidence at least 0.75 proceeds to the year of birth.
`declined` with confidence at least 0.5 stops the check (fail toward not
processing). `question` sends the long notice and asks again. `unclear` gets
one simpler re-ask ("Please reply YES if I may continue, or NO to stop."); a
second `unclear` counts as declined.

## turn-intent (every other answer the youth gives)

State: the answer you expected (`year`, `id`, `yes_no`, `number`, `contact_card`) and the reply.

| Option | Means |
|---|---|
| `answering` | The reply is an attempt at the expected answer, even if malformed |
| `wants_to_stop` | stop, cancel, leave me, I don't want to, not now |
| `has_question` | They ask something instead of answering |
| `off_topic` | Unrelated to the check |

Policy: `wants_to_stop` with confidence at least 0.6 ends the check as
`declined` with reason `stopped`, no persuasion. `has_question` with confidence
at least 0.6: answer briefly from the references, then ask the same step again.
`off_topic`: one gentle redirect back to the step, then treat a second
off-topic reply as `wants_to_stop`. `answering`: hand the text to the step's
script; the script, not you, decides whether it is valid.

## id-availability (when the youth is asked for the ID number)

| Option | Means |
|---|---|
| `has_sa_id` | They give or try to give a 13-digit SA ID number |
| `no_sa_id` | They say they have no SA ID, lost it, or never had one |
| `other_document` | They offer a passport, asylum or permit number, or a birth certificate |
| `unclear` | Anything else |

Policy: `no_sa_id` or `other_document` with confidence at least 0.6 ends the
check as `not_applicable` and marks escalation; never ask for the other
document's number. `unclear`: one re-ask.

## phone-ownership (after "Is this phone your own?")

| Option | Means |
|---|---|
| `own` | Yes, it is mine |
| `borrowed` | It belongs to a parent, friend, cousin, employer, or it is shared and not theirs |
| `both_numbers` | They have more than one number or SIM and this is one of them |
| `unclear` | Anything else |

Policy: `own` with confidence at least 0.75 records `self_attested_own`.
`borrowed` with confidence at least 0.5 records `borrowed_device` and asks them
to type their own number (claimed only). `both_numbers` records
`self_attested_own` with the flag `second_number_claimed`. `unclear`: one
re-ask.

## safeguarding-signal (every youth message, in the background)

State: the last three youth messages, redacted.

| Question | Means |
|---|---|
| `atRisk` (true/false) | True when the messages show distress, coercion, fear, or that someone else is pressuring them or doing this for them. False for ordinary frustration, confusion or impatience |
| `signalType` | `none`, `distress`, `coercion`, `third_party_control` |

Policy: `atRisk` with probability at least 0.4 pauses the check: stop
collecting, reply with care, name Childline South Africa (116, free), say they
can continue another time, and record `paused_safeguarding`. The threshold is
deliberately low: assume the more protective reading. `signalType` only shapes
the wording; it never changes the decision to pause.

## What is never a classification

The stated year, the ID number and the typed phone number are parsed and
validated by the scripts, never judged. A structurally valid ID is a script
fact, not an opinion. `CONFIRM <code>` from a referrer is matched by the
pattern `CONFIRM` followed by five characters, then handed to
`referral-registry.js confirm`; the registry decides.
