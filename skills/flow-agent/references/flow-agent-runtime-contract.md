# Flow Agent Runtime Contract

Use this reference when inspecting or operating the `@ixo/editor` Flow Agent runtime.

## Canonical Boundary

- Matrix/Yjs is canonical workflow state.
- Host applications own Matrix login, room joins, Y.Doc sync, server signer setup, and executor adapters.
- `FlowAgentService` owns deterministic Ralph Loop ticks and command execution against a live Y.Doc/editor snapshot.
- AI output is advisory until converted into a validated `FlowAgentCommand`.

## Core API Surface

Current editor exports include:

- `FlowAgentService`
- `tickFlowAgent`
- `planRalphLoopCommands`
- `executeQueuedAgentCommands`
- `createFlowAgentCommand`
- `validateFlowAgentCommand`
- `getFlowAgentMaps`
- `readQueuedAgentCommands`
- `readAgentLedgerEvents`
- `appendAgentLedgerEvent`
- `acquireFlowAgentLease`
- `isFlowAgentLeaseCurrent`
- `resolveFlowAgentPolicyDecision`
- `getFlowAgentCommandCapability`
- `snapshotFlowAgentNodes`

## Public Node State

- `Pending`: not done and not currently blocked or overdue.
- `Blocked`: cannot safely progress without diagnosis, unblocking, assignment, or external confirmation.
- `Overdue`: due time has passed and the node is not done.
- `Done`: runtime state is complete.

## Internal Run Phase

- `Running`: active orchestration.
- `Validating`: external mutation or claim result is being confirmed.
- `Failed`: deterministic runtime cannot continue without intervention.
- `Archived`: loop cycle is complete and preserved.

## Command Model

Every command includes:

- `id`: deterministic command identifier.
- `type`: one supported command type.
- `flowId` and `flowUri`.
- `nodeId`.
- `actorDid`.
- `status`.
- `capability`.
- `idempotencyKey`.
- `reason`.
- `payload`.
- Optional `lease` and `error`.

The command ID should be stable for `flowId:nodeId:intentHash` so replay can skip already-confirmed effects.

## Outbox, Leases, and Ledger

- `agentOutbox` is the deterministic command queue.
- `agentLeases` prevents multiple agents from executing the same command concurrently.
- `auditTrail` records decisions, commands, validations, escalations, and memory.
- Confirmed command IDs must be skipped during replay.
- External effects must not be repeated unless the command is explicitly idempotent and policy permits retry.

## Executor Boundary

Executor callbacks may include:

- `executeAction`
- `assignActor`
- `notifyActor`
- `validateExternalState`
- `submitClaim`
- `watchUdid`
- `archiveFlow`
- `proposeConfigChange`
- `diagnoseBlocker`

Do not bypass these callbacks with prompt-derived direct writes. If the host has no executor for a command, escalate or propose the missing adapter.

