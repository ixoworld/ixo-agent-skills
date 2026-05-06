---
name: flow-improvement-agent
description: >
  Meta-skill for fleet-level Qi Flow improvement. Use when evaluating UDID results,
  runtime logs, audit trails, blocked/overdue patterns, actor/UCAN friction, validation
  mismatches, or Ralph Loop outcomes across many instances of the same flow. Produces
  proposal-only flow design and runtime engine patch recommendations from evidence. Do not
  use to operate one live flow instance, call FlowAgentService commands, call setup_flow,
  edit BaseUcanFlow templates directly, or patch runtime code directly.
license: Apache-2.0
compatibility: codex
metadata:
  author: ixo
  version: "1.0.0"
  category: fleet-learning
---

# Flow Improvement Agent

Use `$flow-improvement-agent` to evaluate outcomes across many running or completed instances of the same flow. This skill sits above `$manage-flow` and `$flow-agent`: it learns from UDID results and runtime evidence, then proposes governed improvements. It does not apply those improvements.

## Skill Boundary

| Intent | Use |
|---|---|
| Author or apply approved BaseUcanFlow template changes | `$manage-flow` |
| Operate one live Ralph Loop instance, node, outbox, lease, ledger, command, claim, or UDID watch | `$flow-agent` |
| Evaluate aggregate UDID/runtime outcomes across flow instances and propose improvements | `$flow-improvement-agent` |

Do not call `read_flow`, `setup_flow`, or FlowAgentService executor commands from this skill. Do not emit `AgentCommand`s. Do not edit templates, create PR patches, or modify runtime engine code directly. Output proposal-only patches for review by humans, governance, `$manage-flow`, `$flow-agent`, or runtime engineers.

## When To Use

Use this skill for:

- Daily or weekly cron-style reviews of UDID logs and runtime telemetry.
- Comparing outcomes across flow instances, data lanes, actors, cohorts, or time windows.
- Detecting recurring blocked, overdue, failed, slow, validation mismatch, or actor capability patterns.
- Identifying flow design defects such as missing inputs, weak conditions, bad triggers, unclear actor roles, or poor assignment defaults.
- Identifying runtime execution defects such as lease, replay, validator, outbox, command policy, observability, or executor-adapter gaps.
- Producing structured improvement proposals with evidence, risk, owner, approval path, and handoff target.

Route single-instance runtime operations to `$flow-agent`. Route approved template edits to `$manage-flow`.

## Load Order

Read references only as needed:

- `references/udid-learning-loop.md` for Ralph Loop learning mechanics and cron-style review cycles.
- `references/fleet-evaluation-method.md` for cohort selection, evidence quality, and pattern analysis.
- `references/patch-proposal-policy.md` before producing any improvement proposal.
- `templates/cron-evaluation-jobs.json` when defining scheduled evaluation work.
- `templates/udid-evaluation-report.json` when producing aggregate findings.
- `templates/flow-design-patch-proposal.json` for template-level proposals.
- `templates/runtime-engine-patch-proposal.json` for runtime/service proposals.
- `templates/skill-routing-smoke-tests.json` when checking skill selection boundaries.

## Operating Rules

- Treat UDIDs, runtime logs, audit trail events, outbox/ledger summaries, claim outcomes, and validation reports as evidence inputs.
- Separate single-instance incidents from cohort-level patterns.
- Do not infer design or engine improvements without evidence.
- Every recommendation must be proposal-only and include the observed pattern, supporting evidence, affected surface, expected benefit, risk, approval requirement, and handoff target.
- Flow design proposals route to human/governance approval and then `$manage-flow`.
- Runtime engine proposals route to engineering review, not `$flow-agent`.
- Runtime operating-rule proposals route to `$flow-agent` skill/runtime contract review.
- Regression-watch recommendations must compare post-patch UDID/runtime results against a prior baseline.

## Cron-Style Evaluation Loop

1. Select the job template: daily scan, weekly synthesis, post-cycle review, or regression watch.
2. Define the cohort: flow ID, data lanes, time window, instance count, actor groups, and UDID availability.
3. Check evidence sufficiency before making conclusions.
4. Classify findings into flow design, runtime engine, actor/capability, data-lane, or observability categories.
5. Produce an aggregate UDID evaluation report.
6. Produce proposal-only patches for recurring, evidence-backed issues.
7. Route proposals to the correct owner and schedule a regression watch after approval and implementation.

## Output Expectations

For every evaluation, provide:

- Cohort window and evidence sources.
- UDID count and runtime instance count.
- Success patterns and failure patterns.
- Blocked, overdue, actor, UCAN, validation, and data-lane findings.
- Recommended proposals, each marked `proposalOnly`.
- Handoff target: `$manage-flow`, `$flow-agent`, runtime engineering, or governance.

## Scripts

### validate_flow_improvement_agent_package.py

Validates this skill package layout and documentation.

```bash
python3 skills/flow-improvement-agent/scripts/validate_flow_improvement_agent_package.py skills/flow-improvement-agent
```

### validate_meta_skill_templates.py

Validates cron jobs, UDID report templates, proposal templates, and routing smoke tests.

```bash
python3 skills/flow-improvement-agent/scripts/validate_meta_skill_templates.py skills/flow-improvement-agent/templates
```

