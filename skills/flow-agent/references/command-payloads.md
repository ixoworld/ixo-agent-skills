# Command Payloads

Use this reference when constructing or validating `FlowAgentCommand` payloads. Payloads should be as narrow as possible and must not carry authority beyond the required UCAN scope.

## Common Fields

Every command should have:

- `type`
- `flowId`
- `flowUri`
- `nodeId`
- `actorDid`
- `capability`
- `idempotencyKey`
- `reason`
- `payload`

## Command Payload Expectations

### diagnose_blocker

Payload should identify the blocker cause, observations, and bounded next step. It must not execute an unblock action by itself.

### assign_actor

Payload should include target actor DID, reason for selection, required capability, and notification preference.

### notify_actor

Payload should include recipients, message purpose, escalation window, and dedupe key.

### execute_action

Payload should include action type, validated inputs, upstream references, and execution idempotency key.

### validate_external_state

Payload must include `validator`. The validator should state the read-back source, expected state, timeout, and mismatch handling.

### submit_claim

Payload should include claim collection, claimant, evidence references, and idempotency key.

### watch_udid

Payload should include claim reference, polling or subscription strategy, timeout, and notification target for timeout.

### archive_flow

Payload should include archive reason, final state summary, memory references, and repeat-cycle decision.

### propose_config_change

Payload must include `proposal`. The proposal should include the problem, proposed change, affected nodes, risk, and required approver. It must not directly change the template.

## Rejection Conditions

Reject commands that:

- Use an unsupported command type.
- Lack a required capability.
- Omit idempotency for external effects.
- Attempt direct config mutation instead of `propose_config_change`.
- Attempt external mutation without read-back validation.
- Assign to an actor without matching capability evidence.
- Retry a non-idempotent side effect after uncertain execution.

