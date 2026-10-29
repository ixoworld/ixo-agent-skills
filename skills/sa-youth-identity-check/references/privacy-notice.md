# Privacy notice for sa-youth-identity-check

The notice is the first thing the youth sees and the only basis for consent (POPIA s.18 openness, s.11 consent). Send it before asking for anything. The text is versioned: `consent.notice_version` in the verdict must name the version that was actually sent, so the operator can later show exactly what the youth agreed to.

## Short notice (version 1.0.0)

Send this as one WhatsApp bubble, verbatim, before anything is collected. It is 469 characters, under the 600-character bubble target. No heading, no bullet list, no Markdown table: WhatsApp renders none of them.

```text
Hi! Before we go on, I need to do a quick check that you are between 18 and 35 and that your SA ID number looks right. I will ask you 3 things: the year you were born, your 13-digit ID number, and whether this phone is yours. I do not check with Home Affairs. I keep only your age, whether you are in the 18–35 range, and a hidden version of your ID (like 950720*****81). Never the full number. You can stop at any time. Reply YES to continue, or ask me anything first.
```

Why one bubble: the youth must be able to read the whole notice before replying, and a split notice invites a reply to the first half. Why this wording: grade 5 to 6 reading level, one idea per sentence, and it names the three things asked, the one thing not done (Home Affairs), what is kept, and how to stop. Do not paraphrase it in English; the version number is only meaningful if the text is fixed.

## Short notice when there is no verified sender (version 1.0.0-typed-number)

Use this variant instead of the standard short notice when `_SKILL_CONTEXT_CHANNEL_SENDER_DIGEST` is absent (and no `_SKILL_CONTEXT_CHANNEL_SENDER_E164` either). In that mode step 3 asks the youth to type their cellphone number, so the notice must say so: a notice that promises three things and then asks a fourth is not the notice the youth agreed to. Record `consent.notice_version` as `1.0.0-typed-number`. It is 524 characters. The referral add-on sentence may be appended to this variant in the same way.

```text
Hi! Before we go on, I need to do a quick check that you are between 18 and 35 and that your SA ID number looks right. I will ask you 4 things: the year you were born, your 13-digit ID number, your cellphone number, and whether this phone is yours. I do not check with Home Affairs. I keep only your age, whether you are in the 18–35 range, and a hidden version of your ID (like 950720*****81). Never the full ID number, and never your phone number. You can stop at any time. Reply YES to continue, or ask me anything first.
```

The meaning checklist below applies with "four things" in place of "three things".

## Referral add-on sentence

Append this sentence to the short notice, inside the same bubble, only when the referral step is enabled (`contacts` listed in `_SKILL_CONTEXT_CHANNEL_FEATURES` and both `_ORACLE_SECRET_REFERRAL_REGISTRY_URL` and `_ORACLE_SECRET_REFERRAL_REGISTRY_KEY` present). Never send it otherwise: a notice that promises an optional step the agent then skips is inaccurate, and a youth may wait for a question that never comes.

```text
I may also ask if a friend who already joined told you about this. That part is optional.
```

With the add-on the bubble is 559 characters, still under the 600 target. The `notice_version` stays `1.0.0` either way; the add-on is part of version 1.0.0.

## Long notice

Send the long notice when the youth replies INFO, asks any question about the check, or the consent classifier returns `question`. It is two or three bubbles, each under 600 characters, sent together before waiting for a reply. `<operator name>` is a placeholder: the oracle configuration supplies the responsible party's name. If the configuration does not supply one, write "the organisation running this programme" and report the gap to the operator; never invent a name. End with the re-ask so the youth knows what to do next.

Bubble 1, who is responsible and why (322 characters):

```text
This check is run by <operator name>, who is responsible for your information. The purpose is to confirm you are between 18 and 35 and that your SA ID number looks right, so you can join the programme. This is not a Home Affairs check. I only look at the shape of the number you type, and I never say an ID belongs to you.
```

Bubble 2, what is collected and what is kept (552 characters):

```text
I collect 3 things: the year you were born, your 13-digit ID number, and whether this phone is yours. If a friend referred you and you share their contact, I keep a short code for that. What I keep: your age, whether you are in the 18 to 35 range, a hidden version of your ID (like 950720*****81), your answer about the phone, and the referral code if there is one. What I never keep: your full ID number, your phone number, your full date of birth, or your gender. Your record is deleted after 90 days, unless the programme tells you a different time.
```

Bubble 3, rights and how to stop (318 characters):

```text
Under POPIA you can ask <operator name> to show you what they hold about you, to correct it, to delete it, or to stop using it. You can also complain to the Information Regulator of South Africa. To stop this check, reply STOP at any time. Nothing more is collected, and you can come back later. Reply YES to continue.
```

Why the long notice carries the referral code and the phone answer while the short one does not: the short notice lists what the youth would most want to know in one breath; the long notice is the complete inventory, and it must match `popia-minimality.md` exactly. If the inventory changes, bump the notice version.

## Meaning checklist for translation

When the youth writes in another language, mirror it, but the notice's meaning is fixed. These six meanings must survive in any translation or simplification:

- The check is for ages 18 to 35.
- Three things will be asked: the year of birth, the 13-digit ID number, and whether this phone is the youth's own (plus the optional friend question when the add-on is enabled).
- This is not a Home Affairs check.
- What is kept (age, whether in the 18 to 35 range, a hidden version of the ID) and what is never kept (the full number).
- The youth can stop at any time.
- Which reply counts as consent (YES, or its equivalent in the language used).

A translation that drops any of them is not the notice. Do not shorten a translation to fit the 600-character target; if the language runs longer, split into two bubbles and send both before waiting for a reply. Record `consent.language` as the language the notice was actually sent in, not the language the youth later switches to.

## What counts as consent

- Consent is an explicit affirmative in any language: YES, ja, ewe, yebo, "ok yes", "yes I agree", "go ahead". Classify as `given` and move to step 1.
- "ok?", "hmm", a single emoji, silence, or a reply that answers a different question is `unclear`. Send one simpler re-ask: "Is it OK to continue with the check? Please reply YES or NO." Why only one: a second unclear reply more likely means the youth is not ready, and a third ask is pressure on a protected population.
- A second unclear reply counts as declined. End the check as `declined` with `reason: consent_declined`, say they can come back any time, and do not persuade.
- A clear no, "stop", "cancel", "I don't want to share my ID" or a question that turns out to be a refusal is `declined`. Same ending, no persuasion.
- A question goes to the long notice, then the re-ask. One question is normal; it is not an unclear reply.
- Consent given for version 1.0.0 is not consent for a later version. If the notice text changes, the version changes, and a returning youth sees the new notice.

Record in the verdict's `consent` block: `given: true`, `notice_version` ("1.0.0"), `language` (ISO 639-1 code of the notice as sent, for example `en`, `zu`, `xh`, `af`), `at` (ISO timestamp of the affirmative reply, taken from `_SKILL_CONTEXT_TIMESTAMP`). Never record the reply text itself; the classification and the timestamp are the audit trail.
