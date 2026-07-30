# UCAN Guardrails

Use this reference before authorizing or executing any Flow Agent command.

## Capability Mapping

| Command type | Required capability |
| --- | --- |
| `diagnose_blocker` | `flow/observe` |
| `assign_actor` | `flow/node/assign` |
| `notify_actor` | `flow/notify` |
| `execute_action` | `flow/node/execute` |
| `validate_external_state` | `flow/mutation/execute` |
| `submit_claim` | `flow/claim/submit` |
| `watch_udid` | `flow/observe` |
| `archive_flow` | `flow/archive` |
| `propose_config_change` | `flow/config/propose` |

## Authorization Rules

- Deny by default.
- A valid UCAN is required for every command.
- UCAN authority is necessary but not sufficient; runtime transition policy must also allow the command.
- Reject expired, missing, insufficient, audience-mismatched, resource-mismatched, or proof-missing delegations.
- Reject prompt-derived arguments that exceed the delegated resource, actor, node, flow, or action scope.
- Lease ownership is required for execution, even when UCAN authorization passes.
- External mutations require idempotency keys and post-action validators.

## Scoped Server Signer

The Flow Agent should operate with a scoped server signer DID and short-lived UCAN delegations. The signer must not grant broad authority across unrelated rooms, flows, nodes, actors, claims, or mutation surfaces.

## Assignment Guardrail

When assigning work to another actor:

- Match required capability to the actor's UCAN.
- Prefer the currently assigned actor if still authorized and reachable.
- Prefer human approval for governance-sensitive changes.
- Write assignment and notification records as runtime commands, not template edits.

## Config Guardrail

The Flow Agent may propose config changes through `propose_config_change`. A human or separately authorized governance action must accept the proposal before the flow template changes.

