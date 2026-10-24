---
name: software-review-agent-review
description: Author specialist review asks for observable agent tool trajectories, privacy, safety and authority boundaries on explicitly authorised test targets.
license: Apache-2.0
metadata:
  namespace: software-review
  author: IXO
  version: "1.0.0"
  provenance-kind: original-ixo-adapter
---

# Agent trajectory and boundary review asks

This original IXO adapter uses Microsoft's tool/boundary scenarios and
LangChain's trajectory matcher distinctions as source material. It installs no
framework and does not run a security test.

Read [the ask contract](references/ask-contract.md) and complete it for this
review. If target ownership/authorisation, build, task, evidence or terms are
missing, return a draft marked `needs-input`. Ask for exact authorised test
targets and permitted actions before planning executable probes.

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

Read [PROVENANCE.json](PROVENANCE.json) for exact source paths and MIT notices.
