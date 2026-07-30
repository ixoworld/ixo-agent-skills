---
name: email-craft
description: Draft, polish, or reply to emails with the right tone for the audience and the situation. Use when a user pastes an email thread and asks for a reply, asks to soften or sharpen a draft, needs to say no without burning a bridge, has to deliver bad news, follow up on silence, chase an overdue commitment, escalate cleanly, or write something tricky (resignation, salary ask, refund request, intro to a stranger). Reads the full thread for context, picks the right register, drafts 2-3 variants when the choice matters, and flags landmines the sender did not notice.
metadata:
  short-description: Draft and polish emails with the right tone
  author: IXO World
  version: "1.0.0"
  category: productivity
---

# Email Craft

Use this skill to write the email the user wishes they had time to write themselves: clear, appropriately warm, calibrated to the audience, and free of the mistakes that make recipients angry or confused.

## Operating Standard

- Read the full thread before drafting. Reply tone must match the most recent message from the recipient, adjusted one notch in the user's preferred direction.
- Never invent facts, commitments, dates, names, or prior conversation. If the user references something not in the thread, ask once.
- A good email has a clear ask (or a clear "no ask, FYI only"). If the user has not told you the ask, surface it before drafting.
- Length matches purpose. A scheduling reply is two lines. A bad-news email is four paragraphs. A cold intro is one screen. Do not pad.
- Subject lines are not throwaway. Rewrite them when the existing subject no longer fits.
- Flag landmines before sending: ambiguous pronouns, missing names in CC, implied commitments, tone mismatches, anything that reads worse than the user intended.
- Never write something the user did not ask for. No "I went ahead and also drafted X" surprises.

## Invocation Modes

Pick the lightest mode that fits:

1. **Reply draft** - User pastes a thread and asks for a reply. Default mode. Produce one tight reply, plus 1-2 variants only if tone is genuinely ambiguous (e.g., friendly vs firm).
2. **Polish** - User has a draft and wants it cleaner / shorter / warmer / firmer. Return the rewritten version with a one-line diff summary ("shortened by 40%, softened opening, kept the ask intact").
3. **From scratch** - User describes the situation and the ask, no prior thread. Ask for the recipient relationship and the desired outcome first if not given. Then draft.
4. **Hard email** - User flags this is hard (firing, resigning, asking for money, breaking news, escalating). Slow down. Draft once, then walk the user through the choices made and offer one alternative.

Do not gate the output with "would you like me to draft this now". Draft it.

## Workflow

### 1. Read the thread

Extract:

- **Latest sender** and their tone (formal/warm/curt/anxious/cold)
- **Their explicit ask** (if any) and **implicit ask** (what they actually need)
- **Power dynamic** (peer / report / manager / client / vendor / stranger)
- **History** (first contact, ongoing relationship, escalating dispute, repair attempt)
- **Unanswered questions** still hanging in the thread

### 2. Lock the user's ask

What does the user want the recipient to **do, know, or feel** after reading this?

- **Do**: take a specific action (sign, reply, decide, send X).
- **Know**: be informed without action needed.
- **Feel**: confident / reassured / put on notice / apologised to / let down gently.

If the user has not said, infer the most likely from context and state it in one line at the top of your response so they can correct you before the draft.

### 3. Choose the register

| Recipient | Default register |
|---|---|
| Manager, board, regulator | Formal, decision-led, no preamble |
| Client, customer | Warm-formal, commitment-led |
| Peer, teammate | Warm-informal, short |
| Direct report | Warm, specific, action-led |
| Vendor, supplier | Neutral, clear-spec, no fluff |
| Cold intro to stranger | Brief, value-up-front, one ask |

Adjust one notch in the user's stated direction (warmer / firmer / shorter).

### 4. Draft

Structure that works for almost every reply:

```text
[Opening: acknowledge or thank, one line max]

[Substance: the actual content, shortest path to clarity]

[Ask or close: what happens next, by when]

[Sign-off matching the relationship]
```

For hard emails, add a fourth element: an offered out or next step that lets the recipient save face or respond constructively.

### 5. Subject line check

Rewrite the subject if:

- The current subject is "Re: Re: Fwd: Re:" chain
- The thread has shifted topic
- The reply needs a specific response by a date (put the date in the subject: "Decision needed by Thu - vendor proposal")

### 6. Landmine sweep

Before returning, check the draft for:

- **Ambiguous pronouns** ("they said it was fine" - who? what?)
- **Implied commitments** ("happy to look into it" reads as "I'll do it")
- **Missing context** for anyone CC'd late
- **Tone drift** (started warm, ended curt)
- **Buried ask** (the request is in paragraph 3, recipient won't read past 2)
- **Apology inflation** ("so sorry / really apologise / again I apologise" - one apology, then move on)
- **Hedging that obscures the message** ("might possibly perhaps") - cut or commit

Surface anything found in a "Watch-outs" block under the draft.

## Response Shape

Return, in this order:

1. **Inferred ask** (one line, only if the user did not state it explicitly). E.g., "Inferred: you want them to confirm the date by Friday."
2. **Subject line** (in a code block).
3. **Draft email** (in a code block, ready to paste).
4. **Watch-outs** (if any landmines found, listed briefly).
5. **Variants** (only when tone is genuinely a coin-flip - max 2 alternates, each labeled with their tone).

Do not include "I hope this helps!" or any meta-commentary the user did not ask for.

## Hard Emails: Slow Down

For resignations, firings, salary asks, refund refusals, escalations, breaking commitments, or repairing a damaged relationship:

1. Draft once at the user's stated tone.
2. Below the draft, name 2-3 deliberate choices you made (e.g., "Led with thanks before the bad news; kept the reason to one sentence; did not offer to reconsider, which would invite negotiation").
3. Offer **one** alternate framing (e.g., "If you want this firmer, swap the second paragraph for X").
4. If the email crosses a line you can see and the user might not (legal, HR, public reputation), flag it once, then defer to them.

## Edge Cases

- **User wrote the original message you are now replying to**: do not "agree" with them in the reply. Reply as the recipient.
- **Thread in a language other than English**: match the source language unless the user specifies otherwise.
- **No relationship context given**: ask once, with a default ("I'll assume a professional peer unless you say otherwise").
- **Recipient was rude**: do not mirror it. Hold the line, stay calm, name the issue if it matters, move forward. Offer a firmer variant if the user wants it.
- **Group thread with mixed recipients**: write to the highest-stakes recipient; the rest will read it correctly.

## References

- `references/registers.md` - tone calibration guide with side-by-side examples.
- `references/hard-emails.md` - patterns for the seven hardest email situations.
