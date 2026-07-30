# UDID Learning Loop

Use this reference when turning UDID outcomes and runtime observations into governed flow improvement proposals.

## Purpose

The Flow Improvement Agent reviews many flow instances to learn how a flow design and runtime actually perform. It does not operate one live instance and does not directly patch templates or engine code.

## Ralph Loop Learning Cycle

1. Gather UDID results and runtime evidence across a cohort.
2. Classify outcomes by success, failure, blocked state, overdue state, validation mismatch, actor/capability friction, and data-lane anomalies.
3. Compare patterns across data lanes, actors, cohorts, and time windows.
4. Identify recurring design or runtime causes.
5. Produce proposal-only patches.
6. Route proposals to the correct owner.
7. After approval and implementation, run regression watch to verify improvement.

## Scheduled Evaluation Jobs

- Daily scan: detect recent failures, slow paths, blocked nodes, overdue nodes, and validation mismatches.
- Weekly synthesis: identify recurring design defects, runtime engine defects, actor assignment failures, UCAN friction, and weak observability.
- Post-cycle review: evaluate completed Ralph Loop cycles after archive.
- Regression watch: compare outcomes after an approved patch against the prior baseline.

## Evidence Rules

- Require UDID or runtime evidence before proposing improvements.
- Distinguish one-off incidents from repeated patterns.
- Include cohort size and time window.
- Record uncertainty when evidence is incomplete.
- Prefer bounded proposals over broad rewrites.

