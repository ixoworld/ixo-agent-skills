# Authorised execution and recovery

## Establish the boundary before dispatch

Read the exact frozen proposal, resolution, Flow, inputs, manifest, chain decision and mandate. Verify the intended actor, resource, gateway and effect executor. Resolve the current enforcement implementation, not only the tool's capability name.

Apply [DAO DAO compatibility](daodao-v271.md): approval-queue review is not the final decision, a veto timelock is not generic executable approval, a paused core has a separate gate, and a multiple-choice grant must match only the authoritative winner. DAO voting delegation never substitutes for UCAN authority.

A conforming GRS execution needs:

- final authoritative decision and the approved activation condition;
- issuer DID and pre-existing mandate/resource authority, distinct from the DAO contract address;
- signed UCAN delegation and selected proof path, with trusted signatures, audience, time and attenuation checks;
- both Flow-node `flow/block/execute` and actual effect authority with the critical `nb.gov` caveat;
- exact resolution/decision bindings, fixed inputs and condition-evidence verification;
- fresh revocation checks, and atomic shared budgets across retries, runs and descendants;
- provider-specific authority and scope where relevant, plus durable dispatch/reconciliation receipts.

Read the bundled specification and conformance guide for full requirements. Unknown caveats, stale evidence, mismatched actors/recipients/amounts, unavailable revocation or missing enforcement fail closed at the dependent effect. The skill cannot make a generic connector conformant by describing caveats in a prompt. Do not use a legacy Flow bypass, standalone provider API, bare credentials, or a fabricated UCAN to proceed.

## Prepare the action handoff

Use [the handoff worksheet](../assets/action-handoff-template.md). Separate proposed unsigned issuance options from the actual signed token returned by an authorised issuer. Pass token/proof references through the harness's protected channels; never paste live tokens or secrets into public VFS/Topic prose. An agent must not derive a private key from a DAO address or self-issue authority because a vote passed.

Ask the real runtime to execute only the approved node and pinned inputs. A delegated Flow action can affect off-chain systems only through its enforcing executor and scoped provider connection. Prerequisites, dependencies and expected effects must match the approved plan. Notifications, claim submission, evaluation, compensation and payments are distinct effects requiring their own coverage.

The host must use the invocation and operation identifiers according to its exact contract, retaining the shared budget key `(resolutionCid, grant.id)`. Do not fabricate successful lease or replay checks; require runtime evidence. Neither a new token nor a new Flow run resets the authorised budget.

## Record what actually happened

Read back the affected state and retain authentic execution receipts: decision/resolution, grant/node, inputs, invocation/proofs, actor/executor, operation ID, time, provider/chain evidence, result and receipt verification. Store permitted receipt/evidence references in append-only implementation updates. Report each node independently when the Flow is partially complete.

An invocation acknowledgement means accepted for processing, not completed. A transaction pending finality or asynchronous provider job remains pending. Observed provider state without an attributable receipt may support an outcome observation but not prove this actor executed under this grant.

## Failures, retries and recovery

| Observation | Response |
| --- | --- |
| Definitely not dispatched | Fix only within approved inputs/authority, then use the runtime's supported retry policy. |
| Timeout or connection loss after possible dispatch | Mark execution uncertain; keep the existing operation/budget reservation. Reconcile by the same operation/provider reference before any retry. |
| Partial Flow effect | Preserve successful-node receipts; do not rerun them. Diagnose the remaining node and dependencies. |
| Expired/revoked authority or changed condition | Pause affected dispatch. Resolve via the issuer/governance process; never extend the grant locally. |
| Reconciliation cannot establish result | Escalate to the accountable actor with evidence and retain uncertainty. Do not reset budgets or duplicate effects. |
| Rollback/compensation requested | Verify a separately authorised compensating action and its inputs/conditions. Approval of the original action is not automatic rollback authority. |
| Inputs, recipients, limits, permissions or Flow need material change | Return to a revised resolution/proposal and new submission under the rules. |

## Handoff to claims

Execution receipts support assertions about what was authorised and done. Collect actual cost, timing, deviations, failures and mitigations. Load claims guidance to assess compliance and intended outcomes separately. Partial failure is reportable evidence; do not suppress it to produce a successful claim. Keep approved-but-failed, rejected, revoked and superseded records distinguishable.
