# Preserve evidence across turns and actors

Use the [checkpoint worksheet](../assets/checkpoint-template.md) for portable continuity. It is a local coordination record, not a new Topic protocol schema or authoritative state machine. Save through a permitted host persistence tool; if none exists, return it to the person as an unsaved handoff. Never claim saved state without a receipt.

## Keep independent records

| Record | Authority and evidence |
| --- | --- |
| Draft and deliberation | Accepted document edits, Topic revision and attributed discussion; suggestions remain proposed |
| Submitted proposal | Frozen VFS artifact CIDs plus exact chain/module/proposal/transaction binding |
| Decision | Authoritative chain/module status and applicable finality/mandate |
| Delegation and revocation | Verified issuer mandate, signed capability/proof path, current status source |
| Execution | Authentic invocation, dispatch, reconciliation and effect receipts per action |
| Claim | Real claim service/chain record and exact collection/content/evidence binding |
| Evaluation | Governed rubric/version, authorised evaluator's signed record and actual decision evidence |
| Outcome | Accepted criteria and attributable observations; evaluation and empirical achievement are separately reported |
| Topic completion | The current Topic contract/Shape's valid completion transition |

Do not compress these into `done`. Preserve raw service statuses with sources and observed times. Human labels in the checkpoint are interpretations. Unknown, unavailable, uncertain, partial, failed, rejected, revoked, disputed and superseded are useful distinctions; use only those supported by evidence.

## Resume procedure

1. Verify the current user/oracle, network, entity, room/audience and desired proposal. A new caller or audience cannot inherit the previous caller's private data or authority.
2. Load the most recent authorised checkpoint and referenced records. Confirm stable proposal reference and specific submission; multiple revisions may be active or superseded.
3. Refresh chain, delegation/revocation, Flow, claim and evaluation evidence relevant to the next action. Never reuse stale authorisation checks. Inspect current Topic revision before a write and recompute a stale edit rather than overwriting newer work.
4. Reconcile any uncertain submission or execution with its original operation/transaction. Preserve consumed/reserved budgets. Do not create duplicate Topics, claims, proposals or provider effects to escape uncertainty.
5. Reuse scoped user instructions still applicable to the same version and action. A changed recipient, amount, condition, artifact or audience requires re-evaluation of authority; elapsed time alone is not approval.
6. Continue at the earliest unresolved dependency for the requested action. Parallel evidence gathering or drafting may continue independently; do not restart the entire interview.

## Store only the necessary scope

Keep private reasoning/drafts and sensitive source facts in the user's authorised private context. Shared Topic records should contain accepted coordination facts and permitted links, never hidden personal context. Entity `/governance` records carry published governance artifacts and append-only updates. Claims use their collection's protected content/evidence plane. Record access requirements without secrets or bearer tokens.

No new event types or schemas are implied. Map checkpoint fields into the actual host's supported record/metadata format; if that loses binding or privacy guarantees, keep a permitted document reference instead and report the unavailable integration.
