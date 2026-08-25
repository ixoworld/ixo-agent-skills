# Workflow control

Use this reference before creating a specialist task, committing a state transition, resuming a
run, or presenting run totals. It separates agent proposals from the host operation that makes a
transition durable.

## Authority boundary

A specialist may create a candidate artifact and preflight evidence. That output remains an
uncommitted draft until the Portal host invokes the gate and selects an
`outcome.transition-commit.v1` record that validates against
`schemas/workflow-control.schema.json`.

The transition commit selected by host-owned state is the committed record. `state.json` and the
operator snapshot are derived projections. A file in `work/`, a specialist recommendation, a
green schema check, or an unregistered findings file does not advance state.

Unkeyed hashes and a manifest stored beside the records provide corruption detection, not an
authorization boundary against a process with the same filesystem permissions. Production hosts
must mediate transition invocation and protect the manifest/commit selection from generic agent
writes, or sign and externally verify it. If that host boundary is absent, keep outputs as
uncommitted drafts and do not describe local committed state as authoritative.

If the host cannot provide content-addressed writes and a compare-and-swap update of the manifest
pointer, keep the candidate under `work/`, label it `uncommitted draft`, and block the transition.
Do not imitate atomicity with a sequence of unrelated writes.

## Run record

Use this layout:

```text
runs/<workflow_id>/
  manifest.json
  state.json
  snapshot.json
  artifacts/
  commits/
  revisions/
  tasks/
  work/
```

- `manifest.json` is an `outcome.manifest-pointer.v1` projection of the host-selected revision. It
  points to the latest immutable transition commit and carries its integrity digest.
- `commits/` contains append-only transition commits.
- `artifacts/` contains canonical, content-addressed artifacts registered by a commit.
- `tasks/` contains gate plans, task contracts, result contracts, verification envelopes, and
  immutable check outputs.
- `revisions/` contains append-only supersession events. Never edit an old content-addressed
  artifact to add a forward pointer.
- `work/` contains draft outputs. Drafts never appear in committed counters or accepted artifact
  references.
- `state.json` and `snapshot.json` are caches derived from the commit selected by the manifest.
  A host must verify their recorded digests before displaying or acting on them.

## Named gate plans

Create an `outcome.gate-plan.v1` before invoking a specialist. Put only criterion IDs from that
plan in `TaskContract.success_criteria`, `ResultContract.claims_made`, and the corresponding
verification checks. Free-form completion claims do not participate in a transition.

Use `outcome.task-contract.v2`, `outcome.result-contract.v2`, and
`outcome.verification-envelope.v2` from `schemas/contracts.v2.schema.json` for every new task.
Existing v1 records remain immutable history. They may supply provenance on resume but cannot
authorize a new transition commit.

Each required criterion names its validation dimension, exact inputs, executor, version, expected
output schema, and blocking statuses. If a required executor is unavailable, the criterion is not
`not_applicable`; it blocks the transition.

These criterion IDs are required where the named transition uses them:

| Criterion ID | Dimension | Required use | Executor |
|---|---|---|---|
| `artifact_schema_valid` | schema | Every candidate artifact | Schema validator over the exact candidate bytes |
| `legal_state_transition` | governance | Every transition | State-machine validator over the committed state and candidate state |
| `source_provenance_integrity` | provenance | `SOURCE_ACCEPTED` to `TOC_PARSED` | Resolver over source hashes and extraction source spans |
| `toc_role_semantics_reviewed` | semantics | `SOURCE_ACCEPTED` to `TOC_PARSED` and `TOC_PARSED` to `CLAIMS_STRUCTURED` | `outcome.toc-semantic-review.v1`; agent judgment or human review, never schema validation |
| `toc_proposition_node_coverage` | provenance | `CLAIMS_STRUCTURED` to `CAUSAL_GRAPH_DRAFTED` | Cross-artifact validator over the frozen extraction and candidate graph |
| `intervention_to_claimable_node_reachability` | structure | `CLAIMS_STRUCTURED` to `CAUSAL_GRAPH_DRAFTED` | Deterministic graph validator with a missing-path witness |
| `acyclicity` | structure | `CLAIMS_STRUCTURED` to `CAUSAL_GRAPH_DRAFTED` | `scripts/check-graph.mjs`, `DAG-01` |
| `edge_validation_status_policy` | governance | `CLAIMS_STRUCTURED` to `CAUSAL_GRAPH_DRAFTED` | Validator that rejects unsupported promotions and missing issuance-critical flags |
| `provenance_reference_integrity` | provenance | Every graph or evidence transition | Cross-artifact resolver over registered, non-superseded inputs |
| `validation_pass_completeness` | structure | `VALIDATION_RUNNING` to a decision state | Report assembler that verifies required check coverage and recomputes totals |
| `attainable_tier_policy` | identification | `VALIDATION_RUNNING` to a decision state | Deterministic tier policy over findings, edge statuses, and gaps |
| `issuance_policy` | governance | `VALIDATED` to `ISSUANCE_ELIGIBLE` | Deterministic check that the decision is issuable, thresholds are met, checks are resolved, and lower-tier wording is consistent |
| `certificate_proof` | governance | `ISSUANCE_ELIGIBLE` to `CERTIFICATE_ISSUED` | Deterministic check for a complete issuer proof and supported external receipt references |
| `governance_authority` | governance | Human review and issuance transitions | Host signature verification over `outcome.review-decision.v1` or `outcome.issuance-authorization.v1` |
| `artifact_registration_integrity` | provenance | Every transition | Canonical digest and manifest registration check |
| `supersession_lineage_integrity` | provenance | Every transition; substantive when `supersedes` is non-null | Content-addressed predecessor/successor event validation and revision registration |
| `manifest_compare_and_swap` | governance | Every transition | Host commit operation over the expected manifest revision |
| `snapshot_reconciliation` | schema | Before presenting totals or resuming | Projection digests and counters against the selected transition commit |

A run may add task-specific criterion IDs, but every added ID needs the same executor contract.
Do not rename an existing check to make a task pass.

## Proposition-role semantic review

Schema validity only proves that `kind` is in the vocabulary. Before accepting an extraction,
write `outcome.toc-semantic-review.v1` against every proposition.

Use these distinctions:

| Kind | Classification test |
|---|---|
| `intervention` | A bounded program action or exposure intended to cause change. |
| `activity` | Work performed to deliver the intervention. |
| `output` | A directly produced and observable deliverable or service state. |
| `mechanism` | The process through which exposure is expected to produce a changed state. |
| `contextual_factor` | An enabling, constraining, or environmental condition not controlled as program work. |
| `outcome` | An observable changed state following outputs or mechanisms. |
| `impact` | A distal changed state at the end of the claimed causal path. |

`input` is not a kind in `outcome.toc-extraction.v1`. If a source uses that label, classify the
actual proposition as intervention, activity, or contextual factor and record
`taxonomy_mismatch`. Do not let a host-specific `input` value pass as if it belonged to the
current schema.

Record alternative kinds and a short rationale. Use `review_required` when the source supports
materially different roles or when the classification confidence is below the run's declared
policy threshold. Causal-process language such as "through", "enables", or "supports" is a
review trigger, not a deterministic verdict.

## Modeler preflight and independent verification

The causal modeler runs preflight before returning a result contract. The orchestrator then runs
the required criteria again against the frozen candidate bytes. Keep the two outputs separate.
Modeler preflight catches avoidable drafting errors. Independent verification supplies transition
evidence.

`scripts/check-graph.mjs` currently covers only its published `DAG-*`, `ID-02`, and `EDGE-04`
checks. It does not prove ToC coverage, all spine-node reachability, provenance-pointer integrity,
or workflow reconciliation. Do not claim those criteria passed from a `check-graph` exit code.

## Commit protocol

The host performs this sequence as one compare-and-swap operation against the expected manifest
revision. It, rather than the proposal agent, owns command invocation and durable commit
selection:

1. Freeze the candidate artifact bytes under `work/` and run every required criterion in the gate
   plan.
2. Write the result contract, then invoke the host's `run.mjs verify` command to execute the
   frozen criteria and materialize the verification envelope with exact executor versions,
   canonical byte digests, immutable check refs, and all six derived dimension verdicts. Never
   hand-author host metadata or insert `approve_transition` as evidence for itself.
3. Register canonical artifacts and findings. If a candidate repairs an earlier artifact, require
   the same `--supersession-event` file during `plan` and `advance`. Verify its content-addressed
   ID, workflow and artifact kind, exact predecessor/successor refs and digests, failed checks,
   patch summary, actor, rerun evidence, and predecessor disposition. Every rerun evidence ref
   must resolve to the registered v2 verification envelope for this transition, and each failed
   criterion must now have both a candidate-bound passing envelope check and a passing host gate
   result. Persist the event under `revisions/`, register it, and include its ref in the
   transition commit.
4. Build the next state and snapshot projections. The snapshot separates committed and
   uncommitted counters and records the manifest revision used.
5. Write one immutable transition commit containing the registration records, gate results, and
   projection digests.
6. Advance `manifest.json` only when its current revision matches `expected_manifest_revision`.
   The new pointer makes the transition committed.

If any required gate fails, write no transition commit and do not advance the manifest. Retain the
candidate and evidence as an uncommitted draft. A projection write that fails after a manifest
advance is stale cache, not ambiguous authority; readers load the committed record through the
manifest and regenerate the projections before continuing.

## Resume and reconciliation

On resume, read `manifest.json` first, verify the selected transition commit and registered
artifact digests, and regenerate or compare `state.json` and `snapshot.json`. Block new
transitions on a mismatch. Report the committed state and uncommitted work separately.

For `REVIEW_REQUIRED → VALIDATED`, accept only a schema-valid
`outcome.review-decision.v1` whose Ed25519 signature verifies against the host-injected key and
whose signed payload binds the controller DID, workflow ID, manifest revision, source/target
states, packet ref, and exact candidate digest. A `--reviewer <did>` string is an identity claim,
not authorization.

For both issuance transitions, accept only a schema-valid
`outcome.issuance-authorization.v1` whose Ed25519 signature verifies against the host-injected
key and whose payload binds the workflow ID, manifest revision, source/target states, exact
candidate digest, purpose, issuer, tier, and controller. A certificate-commit authorization also
binds the external signing receipt the host verified. The request decision, a caller DID, and a
certificate's embedded proof are inputs to the decision; none is transition authority.

Never show an unqualified zero when draft graph artifacts or findings exist. Use
`committed.nodes`, `committed.edges`, and `committed.failures` for state-authoritative totals. Show
draft totals under `uncommitted` and set `includes_uncommitted_work: true`.

## Repair diagnostics

For a failed criterion, report the criterion ID, affected proposition/node/edge IDs, a path or
cycle witness where available, the smallest proposed patch, whether automatic repair is safe, and
the state consequence. A repaired candidate remains a new immutable artifact. Its supersession
event explains the repair; the predecessor never changes.
