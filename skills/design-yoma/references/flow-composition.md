# Flow Composition

Governs control C13. The flow is what actually runs the Deed.

**Route the authoring to `manage-flow`.** This reference describes the shape to ask for and the
constraints to hold it to — not a format to write by hand.

## The canonical Deed flow

```
qi/eval.engine          once, human       rubric preflight → register → publish
       │
bid/submit              youth             nb: { collectionId, role: "service_agent" }
       │
bid/evaluate            controller        → decision
       │
       ├── decision == "approve"  ──►  claim/submit      youth    nb: { collectionId }
       │                                     │
       │                               claim/evaluate    tiered   → emits approved | rejected
       │                                     │
       │                    ┌────────────────┴────────────────┐
       │                    │                                 │
       │              approved                          rejected
       │                    │                                 │
       │         payment/execute                    reason returned to youth
       │         credential/store                   reapply path stated
       │
       └── decision == "reject"  ──►  reason returned to applicant, reapply path stated
```

## The non-negotiable edge

> `claim/submit` must be unreachable without an approved `bid/evaluate`.

```json
{ "sourceId": "evaluate-bid", "field": "decision", "operator": "eq", "value": "approve" }
```

This is not a convenience or a UX nicety. Bid approval is what grants `SubmitClaimAuthorization`. A
flow that routes a youth to `claim/submit` without it sends them to do work whose proof will be
rejected on chain for lack of authority — after they have already done it.

Verify this edge explicitly at control C13. It is the single check most worth doing twice.

## Plan-time versus runtime

Actions declare fields in two categories, and confusing them is the most common flow defect.

| | Goes in `nb` | Filled at runtime |
|---|---|---|
| `bid/submit` | `collectionId`, `role` | `surveyAnswers`, `deedDid` |
| `bid/evaluate` | `decision: ""`, `reason: ""` | `bidId`, `collectionId`, `deedDid`, `role`, `applicantDid`, `applicantAddress`, `adminAddress` |
| `claim/submit` | `collectionId` | `deedDid`, `adminAddress`, `surveyAnswers`, `pin` |
| `claim/evaluate` | `decision: ""` | `claimId`, `collectionId`, `deedDid`, `adminAddress`, `verificationProof`, `amount`, `granteeAddress` |
| `payment/execute` | `paymentConfig: {}` | provider-dependent |

Two rules:

- **Never write a runtime field into `nb`.** It will be overwritten or will fail.
- **Never write concrete DIDs, addresses, blueprint DIDs, contract addresses, or token configs at
  plan time.** These are runtime picker inputs. Use `""` or `{}` for anything configured later in the
  editor.

## Events and triggers

`claim/evaluate` emits events you can wire downstream work to:

| Event | Payload |
|---|---|
| `approved` | `claimId`, `collectionId`, `deedDid`, `evaluatedByDid`, `evaluatedAt`, `verificationProof` |
| `rejected` | `claimId`, `collectionId`, `deedDid`, `evaluatedByDid`, `evaluatedAt` |

**Only a small set of action types may be event listeners.** Setting a `block.event` trigger on an
ineligible action is a compile error. Confirm eligibility with `manage-flow` rather than assuming — the
eligible set is narrow and changes.

For "notify the youth after every approval", prefer an event listener over a condition: the listener
fires once per emission with a frozen payload, which is the correct model for per-claim follow-up.

## Confirmations

Every side-effecting step carries a confirmation requirement. **Never strip one.** Steps that require
confirmation include `bid/submit`, `bid/evaluate`, `claim/submit`, `claim/evaluate`,
`payment/execute`, `credential/store`, and anything that signs.

A flow that removes confirmations to "reduce friction" removes the human control that makes staging
safe.

## Actor assignment

Every step needs an `aud`. Check against authority, not job title:

| Step | `aud` must be |
|---|---|
| `bid/evaluate` | In the controller set |
| `claim/evaluate` | Holder of `EvaluateClaimAuthorization`, per the control C17 tier |
| `qi/eval.engine` | A human controller — this action is `executionOwner: human` |
| `payment/execute` | Whoever may release treasury funds, per control C2 |

## Branch completeness

Every branch must terminate somewhere a young person understands.

- Bid rejected → reason returned, reapply path stated
- Bid waitlisted → told they are waitlisted, and what happens next
- Claim rejected → reason code returned, dispute path available
- Claim in review → told it is in review, and by when
- Budget exhausted mid-flow → the control C16 exhaustion behaviour actually executes

**A branch that silently ends is a young person left waiting.** Control C13 fails on any unterminated
branch.

## A known gap: `qi/eval.engine`

Every action in the canonical flow appears in `manage-flow`'s published catalog **except
`qi/eval.engine`**. That action exists in the editor's own action registry, but it is not among the
action types `manage-flow` documents itself as able to author.

Verify this at control C13 rather than assuming either way. If `manage-flow` cannot place the step:

- Author the rest of the flow through `manage-flow` as normal.
- Stage the `qi/eval.engine` configuration separately for a human controller to add through the
  Portal — it is `executionOwner: human` and `cardinality: once` regardless, so it was always going to
  be a human act.
- Say so plainly in the controller checklist. Do not describe the flow as complete when a step is
  missing from it.

## The handoff to `manage-flow`

```yaml
handoff:
  to: manage-flow
  from_gate: deed_flow
  purpose: Compose the Deed flow for <deed name>
  decisions:
    steps: []              # ordered: { intent, action, actor_role, condition }
    bid_edge: claim/submit gated on evaluate-bid decision == approve
    determination_model: <from control C17>
    settlement: <from control C16>
    notifications: []      # which events notify the youth
  constraints:
    - claim/submit must be unreachable without an approved bid
    - no runtime-only fields in nb
    - no concrete DIDs, addresses, or token configs at plan time
    - preserve every confirmation requirement
    - every branch terminates with something the youth is told
  open_questions: []
  do_not:
    - execute or broadcast anything
  return_to_gate: rubric_publication
```

## Flow templates at instantiation

Flows reach a new domain by being **cloned from the protocol** at domain creation: protocol resources
of type `Template` are imported into the new domain's flow space. Design the Deed flow as a template
on the protocol, not as a one-off in the domain.

Note the dependency: a flow with an agent step needs the domain to have a **linked oracle**, or the
step is dead on arrival (`BLOCKED_NO_ORACLE_LINKED`). Check this at control C2, not at control C13.

## Control C13 fails when

- `claim/submit` is reachable without an approved bid
- Any branch does not terminate with something the youth is told
- A runtime-only field appears in `nb`
- Concrete DIDs, addresses, or token configs appear at plan time
- A confirmation requirement has been stripped
- An `aud` lacks the authority its step needs
- An event trigger is set on an ineligible action type
