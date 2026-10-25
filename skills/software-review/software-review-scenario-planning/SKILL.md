---
name: software-review-scenario-planning
description: "Draft a request (an ask) for a qualified human specialist to review software or an AI agent through IXO Expert Reviews: pick the smallest useful set of test scenarios, success and failure criteria, evidence, permissions, payment and follow-up terms, and turn existing expert findings into regression cases and a bounded retest. Use when someone wants to commission an expert or third-party review, plan what a reviewer should test before a release, or follow up on review findings for a new build, even if they never say ask. For agent tool-call, permission or safety boundaries use software-review-agent-review; for accessibility, usability or localisation use software-review-accessibility-review; for speed or running cost use software-review-performance-review. Not for doing the review yourself, running tests, posting the ask or approving payment."
license: Apache-2.0
metadata:
  namespace: software-review
  author: IXO
  version: "1.0.0"
  provenance-kind: original-ixo-adapter
---

# Scenario planning for specialist review

An ask is a request, posted through IXO Expert Reviews, for a qualified human
specialist to review a named build. This skill drafts the ask and stops there: the
owner approves and posts it, the specialist reviews, and payment is a separate
decision. Keep those steps apart, because a draft that reads like a verdict or an
approval can be mistaken for one.

1. Read [the ask contract](references/ask-contract.md) and start from the blank
   draft that `scripts/check_ask.py --template` prints (see below). Fill in what
   the user supplied. For anything missing, keep the value null, add a focused
   question to `missing_inputs` and leave `status` as `needs-input`. Draft the
   known sections anyway: precise questions on a partial draft move the owner
   forward faster than a refusal.
2. Start from the intended user's task. Select the smallest scenario set that
   exposes the relevant risk: an ordinary path, a realistic failure/recovery,
   and a boundary case when the agent can act. Explain each selection; omit
   dimensions unrelated to this product.
3. Pair business outcomes with capability evidence. A correct final answer does
   not show whether the right source, tool arguments or permission were used.
   For each scenario record setup/inputs, bounded steps, expected success,
   observable failure, evidence, method and responsible reviewer. Preserve the
   upstream path/revision and scenario section when reusing a scenario; label
   original cases `IXO-original`.
4. Separate capability checks from safety/authority boundaries. Let the owner
   agree risk-based acceptance criteria. Do not copy example pass rates,
   commercial figures or launch recommendations from upstream. Plan validation
   of any judge against expert-labelled clear and borderline cases before its
   scores support interpretation. A judge score is not an authoritative decision.
5. Choose diagnostic evidence: outputs for task outcomes; redacted tool calls,
   arguments and state changes for actions; task observation for usability;
   controlled repeated measurements for performance. Identify human expertise
   needed to interpret the evidence. Keep controlled baseline and fresh holdout
   cases distinct from material used to optimise the agent.
6. Check the draft, fix what the checker reports, then show the user the ask and
   any open questions. No posting, tool execution or payment follows from this
   skill. Say so in the reply, and for a follow-up say that a passing retest
   authorises no payment or release: the template's pending decisions are easy
   to miss inside the JSON.

Use [findings to regression](references/findings-to-regression.md) when expert
findings already exist or follow-up is requested. It defines a finite follow-up
rather than adding another overlapping review skill.

## Checking the draft

`scripts/check_ask.py`, in this skill's folder, checks a JSON ask offline against
the contract, this skill's pinned source identity and the draft-only decisions.
Call it by its full path, since the working directory is usually the user's
project:

```bash
python3 /path/to/software-review-scenario-planning/scripts/check_ask.py --template > ask.json
python3 /path/to/software-review-scenario-planning/scripts/check_ask.py ask.json
```

It prints `ready-for-approval` (exit 0) or `needs-input` with the failing fields
(exit 1). It makes no network calls and runs no tests, so passing is a structural
check, not evidence that the ask is truthful or the agent behaves correctly.

Original IXO adapter of Microsoft's scenario library and evaluation guidance; it
implements no evaluator. Sources and MIT notices: [PROVENANCE.json](PROVENANCE.json).
