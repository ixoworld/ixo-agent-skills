# Fleet Evaluation Method

Use this reference when evaluating flow behavior across many instances, data lanes, or actor groups.

## Cohort Definition

Every evaluation should state:

- Flow ID or template family.
- Time window.
- Data lanes included.
- Number of instances and UDIDs.
- Runtime evidence sources.
- Known exclusions or missing data.

## Pattern Categories

- Flow design: missing inputs, weak conditions, bad triggers, poor assignment defaults, unclear actor roles, or brittle template assumptions.
- Runtime execution: lease handling, replay behavior, validator coverage, outbox behavior, command policy, executor adapters, or external confirmation handling.
- Actor and UCAN: missing delegation, expired proof, wrong assignee, capability mismatch, or notification failure.
- Data lane: lane-specific failure rate, slow confirmations, malformed evidence, or inconsistent external responses.
- Observability: missing audit events, insufficient ledger details, unclear memory records, or incomplete UDID linkage.

## Analysis Discipline

- Do not collapse a single incident into a fleet-wide conclusion.
- Compare success and failure cohorts before proposing changes.
- Prefer patchable root causes over symptoms.
- Separate template-level fixes from runtime engine fixes.
- Include a regression metric for every proposal.

## Recommendation Thresholds

- One incident: report as observation unless severity is critical.
- Repeated incidents in one lane: propose lane-specific investigation or guarded patch.
- Repeated incidents across lanes: propose flow design or runtime engine patch.
- Repeated post-patch regression: propose rollback or design review.

