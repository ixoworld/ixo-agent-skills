---
name: meeting-companion
description: Turn raw meeting notes, transcripts, or recordings into a structured brief - decisions made, action items with named owners and due dates, open questions, risks, and a ready-to-send follow-up message. Use when a user has just left a meeting, pastes in a transcript or rough notes, asks "what did we agree", "who owns what", "send the recap", or wants the next meeting prepared from prior context. Works without recording access - the user supplies whatever they have (notes, agenda, partial transcript) and the skill extracts structure, flags gaps, and drafts the follow-up.
metadata:
  short-description: Turn meetings into decisions, owners, and follow-ups
  author: IXO World
  version: "1.0.0"
  category: productivity
---

# Meeting Companion

Use this skill to turn whatever the user captured from a meeting into something a busy person can act on in under two minutes: what was decided, who owns the next step, and what to send back to the room.

## Operating Standard

- Work only from what the user gave you. Do not invent attendees, decisions, deadlines, or action items.
- Every action item needs an owner, a verb, and a due date. If any of those three is missing from the source, mark it `OWNER?`, `DATE?`, or `SCOPE?` rather than guessing.
- Distinguish four things and never collapse them: **Decision** (a choice the group made), **Action** (something someone will do), **Open question** (unresolved), **FYI** (context only).
- Quote disputed or sensitive lines verbatim. Paraphrase everything else.
- The follow-up message must be sendable as-is. No placeholders the user has to fill in unless flagged.
- If the input is a raw transcript, do not return the cleaned transcript - return only the brief. The user has the transcript already.

## Invocation Modes

Pick the lightest mode that fits the user's ask:

1. **Quick recap** - User pastes notes or transcript and wants the brief. Default mode. Produce the full structured brief plus a follow-up message draft. No questions.
2. **Action chase** - User asks "who owns what" or "what's overdue from last week". Produce only the action items table, grouped by owner, with status.
3. **Next-meeting prep** - User asks to prepare for the next session. Combine prior brief with new agenda, surface unresolved opens, and propose 3-5 agenda items with timeboxes.
4. **Stakeholder-specific recap** - User asks for a recap "for my manager" or "for the client". Re-cut the brief from that audience's perspective: what they need to know, what they need to decide, what to ask of them.

Do not gate the output behind "shall I proceed" prompts. Produce the brief. Ask one clarifying question only if the source is so ambiguous that the recap would mislead.

## Workflow

### 1. Read and classify

Read the full input once. Tag each substantive line as **Decision**, **Action**, **Open**, or **FYI**. Drop pleasantries, scheduling chatter, and tool noise.

### 2. Identify the room

Extract attendees from the source. If unclear, list participants as "Speaker A / Speaker B" and ask the user to map them only if it changes who owns an action.

### 3. Extract actions with the three-part rule

For every Action, capture:

```text
[ ] [Owner] will [verb + object] by [due date]
    context: [one line of why, if not obvious]
    blocker: [if any]
```

If owner, verb, or date is missing from the source, write `OWNER?`, `VERB?`, or `DATE?` in that slot. Do not fabricate.

### 4. Lock the decisions

For each Decision, capture:

```text
- Decided: [what was chosen]
  rationale: [the one-line reason given]
  reversibility: [easy to change | hard to change | one-way door]
```

Flag any decision where the rationale was not stated.

### 5. Surface what's still open

List open questions with who needs to resolve them and by when. If the room punted, say so: "Deferred to next meeting, no owner assigned."

### 6. Draft the follow-up message

Default: a short email or Slack message that the meeting host could send within ten minutes. Tone matches the source register (formal/informal). Structure:

```text
Subject: [Meeting name] - recap and actions

Hi all,

Quick recap from [date]:

Decisions:
- [decision 1]
- [decision 2]

Actions:
- [Owner]: [action] by [date]
- [Owner]: [action] by [date]

Open questions for [next meeting / async resolution]:
- [question 1]

Let me know if I missed anything.

[sender]
```

Adapt length and tone if the user named an audience.

## Response Shape

Return, in this order:

1. **One-line summary** of the meeting purpose and outcome.
2. **Decisions** (bulleted, with rationale and reversibility).
3. **Actions** (checklist, grouped by owner, with due dates).
4. **Open questions** (with proposed resolver and deadline).
5. **Risks or watch-outs** (only if the source surfaces any - do not invent).
6. **Follow-up draft** (in a code block, ready to paste).
7. **Gaps flagged** (the `OWNER?` / `DATE?` slots the user must fill, listed explicitly).

If the user asked for a different mode (action chase, next-meeting prep, stakeholder recap), produce only the sections that mode needs.

## Edge Cases

- **No clear owner ever named**: ask once: "I see three actions without a named owner. Default them to you, the meeting host?"
- **Conflicting versions of a decision** (e.g., two speakers say opposite things): surface both verbatim and ask which is the final position.
- **Recurring meeting**: ask if the user wants this brief layered onto a running log of prior decisions/actions, or stand-alone.
- **Sensitive content** (personal, legal, HR): do not summarize. Reflect back: "This looks like a sensitive conversation - want me to extract only the action items and skip the discussion summary?"

## References

- `references/templates.md` - email and Slack follow-up templates by audience (team / manager / client / board).
- `references/action-item-patterns.md` - common phrasings that disguise actions (e.g., "we should look into..." = unowned action).
