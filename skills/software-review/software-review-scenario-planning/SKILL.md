---
name: software-review-scenario-planning
description: Author bounded specialist software or agent review asks by selecting scenarios and translating expert findings into regression and follow-up plans.
license: Apache-2.0
metadata:
  namespace: software-review
  author: IXO
  version: "1.0.0"
  provenance-kind: original-ixo-adapter
---

# Scenario planning for specialist review

Create a bounded specialist review ask, not an evaluation verdict. This is an
original IXO adapter from Microsoft's scenario library and evaluation guidance;
it does not import their workbook workflow or implement an evaluator.

1. Read [the ask contract](references/ask-contract.md). Extract supplied inputs
   and return `needs-input` with concrete questions for omissions. Draft useful
   known sections while leaving unknowns null.
2. Start from the intended user's task. Select the smallest scenario set that
   exposes the relevant risk: an ordinary path, a realistic failure/recovery,
   and a boundary case when the agent can act. Explain each selection; omit
   dimensions unrelated to this product.
3. Pair business outcomes with capability evidence. A correct final answer does
   not show whether the right source, tool arguments or permission were used.
   For each scenario record setup/inputs, bounded steps, expected success,
   observable failure, evidence, method and responsible reviewer. Preserve the
   upstream path/revision and scenario section when reusing a scenario; label
   original cases IXO-original.
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
6. Include the complete ask contract and source identities in the final draft.
   Stop at reviewable authoring; no posting, tool execution or payment follows
   from this skill.

Use [findings to regression](references/findings-to-regression.md) when expert
findings already exist or follow-up is requested. It defines a finite follow-up
rather than adding another overlapping review skill.

## Offline contract check

`scripts/check_ask.py` checks a JSON ask for contract completeness, source identity
and draft-only decision state. It prints `ready-for-approval` or `needs-input`
with field errors, returns the result from `main(**kwargs)`, and exits 0 or 1.
It performs no network access or test execution. Passing is a structural check,
not evidence that the ask is truthful or the agent behaves correctly.

```bash
python3 scripts/check_ask.py /path/to/ask.json
```

Maintainers can run the pack checks from the repository root with
`python3 -m unittest discover -s skills/software-review/software-review-scenario-planning/tests -v`.
The synthetic candidate and behavior fixtures are in `evals/`; behavior cases
require a separate human/model assessment and are not run by the checker.

See [PROVENANCE.json](PROVENANCE.json) and the bundled upstream license texts.
