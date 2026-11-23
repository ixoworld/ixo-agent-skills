# Validation levels and protocol handoff

## Evidence ladder

1. **Structural validity:** manifests, path confinement, schemas and valid/invalid fixtures. Proves contract shape, not evaluation semantics.
2. **Deterministic conformance:** pinned adapter/engine maps declared inputs to expected decisions, including missing facts, tampering, wrong versions and conflicts. Synthetic cases prove specified behavior, not real-world accuracy.
3. **Judge calibration:** independent qualified labels, retained disagreement/adjudication, family-level sealed holdout and prespecified error/coverage/stability criteria. Repeated runs estimate stability; paraphrases and retests are not independent reports. Report critical false approvals separately from overall agreement and retain UNKNOWN in coverage accounting.
4. **Runtime integration:** actual source envelope, authorization, private access, all expected facts, deployed versions, bounded retries and error propagation verified. Local transport fixtures do not replace an authorized live check.
5. **Signed decision verification:** verify signer/issuer, claim, protocol, oracle and exact content binding using the supported verifier; retrieve the persisted result independently. HTTP 200, a receipt CID or a mainnet service URL alone proves none of these.
6. **Operational activation:** independent calibration plus explicit governance/release authority, monitoring and suspension. Settlement is a further independently authorized event.

These are separate evidence dimensions; integration success cannot compensate for absent calibration. A recorded pilot may demonstrate levels 4–5 for one case while remaining experimental.

## Repository commands

Run from the evaluation-kits repository root, using its current instructions:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check:structure
# Requires private upstream access; separate from the engine-free check:
bun run setup:engine
bun run check
```

Use `bun test ./test` or explicit `./test/` paths to avoid archived source tests. A generated `adapter: none` draft can pass structure but full evaluation must refuse with `SEMANTICS_UNAVAILABLE`. A missing engine is an unmet dependency, not a passing check. Do not modify frozen imports to make validation green. Run new inference only in a new benchmark version with authorized data processing and cost.

For calibration, use the selected kit's current plan and choose domain-appropriate sample sizes and tolerances. The report kit's planning count and Alpha's proposed count are not universal minimums. Freeze acceptance targets before viewing holdout results. A failed target requires revision and a new holdout or an explicit restricted/human-reviewed deployment design; it is not fixed by renaming failures or repeating inference until approval.

## Compile a concrete handoff

| Contract | Record and verify |
|---|---|
| Ask and participation | Brief revision/digest, audience/criteria, respondent identity, participation proof, any qualification policy, reviewer roles and reward terms |
| Kit | Exact id/version, schemas, evidence methods, adapter, model/prompt configuration, policy and engine pins, calibration status |
| Protocol | Actual network, owning entity and version; published claim form/rubric references and artifact digests; supported lifecycle/status values |
| Facts | Complete typed fact names, units/status meanings, source registration, handler routing and override behavior; captured valid and invalid runtime envelopes |
| Private evidence | Access scopes, authorized processors, retention, redaction and audit access; public projection without private grants or tokens |
| Oracle | Identity, authorization/delegation, endpoint/configuration, signing key policy, scope and conflict controls |
| Operations | Existing billing/credit entitlement, permitted spend and attempt limits, idempotency key, timeout reconciliation, retry rules and deployment/rollback versions |
| Result | Submitted content digest, raw assessment provenance, deterministic fact trace, decision, limitations, signed receipt verification and retrieval |
| Finalization | Required human approval, forecast resolution if relevant, report finalization and settlement conditions as separate events |

Inspect the current target SDK/MCP and repository contracts before filling this table. Exact provider tool names, API envelopes, DIDs and hard-coded runtime SQL from one pilot are not portable protocol requirements. Use the protocol/oracle registration integration for those operations; an Ask-creation tool is not automatically a protocol publisher.

If live work is authorized, first prepare a reviewable immutable package and confirm that authorization covers the network, identity, billing, signatures and attempt budget. Use authority already granted in the conversation. Do not silently broaden it. After ambiguous timeouts, query existing operation state before retrying. Preserve held/failed decisions; changed bytes or terms require a new bound evaluation.

## Replay and audit

Retain byte hashes and access-controlled source snapshots; acquisition timestamps and the basis for historical availability; exact extraction recipes, executable/versioned method, normalizations, formulas and units; model/provider revision limitations, prompt/input/output digests and raw output; adapter/policy/engine versions; signatures, authorization context and evaluation time; decision and operational attempt ledger.

Distinguish replaying deterministic facts from rerunning a stochastic model. A recipe manifest is not proof it executed. Verify replay from retained bytes in a constrained environment and state which values were exact captures versus anchored interpretations. Reproduction does not prove independent source truth or that a later-fetched page was identical at the original cutoff.
