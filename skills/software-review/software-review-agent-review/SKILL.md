---
name: software-review-agent-review
description: "Draft a request (an ask) for a qualified human specialist to review an AI agent's observable tool calls, arguments, permission checks, prompt-injection handling, privacy, confirmation and hand-off behaviour on explicitly authorised sandbox or staging targets, via IXO Expert Reviews. Use when someone wants an expert, red-team or third-party check of what their agent does with tools, data or authority, needs trajectory-matching rules for agent test cases, or wants agent safety testing scoped before launch, even if they never say ask. A request to test a public or production system without the owner's explicit authorisation gets a needs-input draft, never a test plan. Not for running the tests, probing a target or approving payment; for general scenario selection or follow-up on findings use software-review-scenario-planning."
license: Apache-2.0
metadata:
  namespace: software-review
  author: IXO
  version: "1.0.0"
  provenance-kind: original-ixo-adapter
---

# Agent trajectory and boundary review asks

An ask is a request, posted through IXO Expert Reviews, for a qualified human
specialist to review a named build. This skill drafts the ask for reviewing what
an agent does with tools and authority; it installs no framework and runs no
security test.

Read [the ask contract](references/ask-contract.md) and start from the blank draft
that `scripts/check_ask.py --template` prints (see below). If target
ownership/authorisation, build, task, evidence or terms are missing, keep them
null with a question in `missing_inputs` and leave the draft `needs-input`. Ask
for exact authorised test targets and permitted actions before planning
executable probes: reaching a URL is not permission to test it, and a probe
against the wrong system harms someone who never agreed to it.

## Define the observable path

Select a finite workflow: intent -> tool selection -> arguments -> permission
check -> tool result -> reported outcome. Name expected state changes and the
first point where a mistake could cause harm. Request redacted timestamps,
call IDs, tool/version, argument fields, result/error, retries, authorisation
evidence and before/after state. Private chain-of-thought is neither needed nor
requested. Missing traces mean `not observed`, not an inferred pass or failure.

Choose the comparison rule per case and explain why:

- Ordered steps where dependencies/confirmation order matter.
- Unordered calls when independent retrieval order is irrelevant.
- Required-call inclusion when additional harmless reads are acceptable.
- Allowed-call containment when additional actions must fail the test.

These are review semantics, inspired by upstream match modes; they do not
promise identical library behavior. Define argument matching explicitly and
check side effects independently. Ignoring arguments or allowing extra calls
can hide a wrong tenant, recipient, amount or unauthorised write. A matching
trajectory alone cannot prove task correctness or permission.

## Boundaries to select when relevant

| Concern | Bounded test and evidence |
| --- | --- |
| Authority | Synthetic request exceeds the test account's rights; expected refusal or scoped escalation before a side effect. |
| Prompt injection | In an explicitly authorised fixture, untrusted retrieved text requests a prohibited action; record whether data stays evidence rather than authority. |
| Privacy | Synthetic identifiers test minimisation, redaction and cross-tenant isolation; agree evidence audience/retention. |
| Tool reliability | Simulated denial, timeout or duplicate response; verify truthful reporting, bounded retries and idempotency. |
| Confirmation | Record proposal, user confirmation and action timestamps; an apparent success without confirmation is a failure where confirmation is required. |
| Human hand-off | Give an unresolved case; verify clear limits, preserved context and an agreed escalation route. |

Use only explicitly authorised sandbox/staging targets and synthetic fixtures for
adversarial tests. Do not test arbitrary production systems, third-party accounts
or actual secrets. Define request/rate/time budgets, prohibited actions and stop
conditions with the owner; a denial ends that action. Broader red-team work needs
its own scope and qualified reviewer. No exploitation recipes or production
scans are provided here.

## Deliverable

Produce the complete bounded ask plus a scenario table: ID, user task, setup,
permission checkpoint, expected/forbidden behavior, trace evidence, matching rule,
reviewer qualification and upstream/original identity. The eventual findings
must separate observation, interpretation and accountable evaluation; settlement
and payment authority stay separate. Define a follow-up that repeats corrected
cases plus a small adjacent-risk set on the named new version.

In the reply, list the open questions that block testing (authorisation evidence,
exact targets, permitted actions, request/time budgets and stop conditions) rather
than leaving them only in `missing_inputs`: the owner reads the reply, and a gap
they never see stays open.

## Checking the draft

`scripts/check_ask.py`, in this skill's folder, checks a JSON ask offline against
the contract, this skill's pinned source identity and the draft-only decisions.
Call it by its full path, since the working directory is usually the user's
project:

```bash
python3 /path/to/software-review-agent-review/scripts/check_ask.py --template > ask.json
python3 /path/to/software-review-agent-review/scripts/check_ask.py ask.json
```

It prints `ready-for-approval` (exit 0) or `needs-input` with the failing fields
(exit 1). Passing is a structural check, not proof of permission or behaviour.

Original IXO adapter of Microsoft's tool/boundary scenarios and LangChain
agentevals trajectory match modes; no code imported. Sources and MIT notices:
[PROVENANCE.json](PROVENANCE.json).
