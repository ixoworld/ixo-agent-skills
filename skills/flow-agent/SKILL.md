---
name: flow-agent
description: >
  Runtime orchestration skill for the Qi Flow Agent and Ralph Loops. Use when operating
  FlowAgentService, coordinating actors, maintaining node states, diagnosing blocked or
  overdue actions, checking UCAN guardrails, reviewing leases, outbox, ledger, claims, UDID
  monitoring, archive/restart cycles, or producing proposal-only config changes. Do not use
  for BaseUcanFlow authoring or direct template edits; route those to manage-flow.
license: Apache-2.0
compatibility: codex
metadata:
  author: ixo
  version: "1.0.0"
  category: runtime-orchestration
---

# Flow Agent

Use this skill to operate the Qi Flow Agent runtime for Ralph Loops. The Flow Agent is a deterministic runtime operator: it may reason over ambiguous or unhappy paths, but runtime effects must be represented as typed `AgentCommand`s and pass UCAN, policy, lease, schema, and replay checks before execution.

## Scope

Use `$flow-agent` for:

- Running or reviewing `FlowAgentService` behavior.
- Maintaining Ralph Loop lifecycle state across `Pending`, `Blocked`, `Overdue`, and `Done` nodes.
- Coordinating human or agent actors by assignment, notification, escalation, and UCAN capability fit.
- Diagnosing blocked nodes and producing bounded unblock actions.
- Reviewing `agentOutbox`, `agentLeases`, and `auditTrail` records.
- Submitting claims, watching UDID/evaluation results, writing memory records, and archiving/restarting loop cycles.
- Proposing flow config changes through `propose_config_change` only.

Do not use this skill for BaseUcanFlow creation, editing, deleting, or rebuilding. Use `$manage-flow` for those authoring tasks. If a runtime issue requires a template change, emit a `propose_config_change` command and explain the governance approval needed.

## Load Order

Read references only as needed:

- `references/flow-agent-runtime-contract.md` for API names, exported types, outbox, leases, ledger, and host adapter responsibilities.
- `references/ralph-loop-runbook.md` for node-state handling and full loop maintenance.
- `references/ucan-guardrails.md` before authorizing, assigning, notifying, mutating, claiming, or archiving.
- `references/command-payloads.md` when constructing or validating `AgentCommand` payloads.
- `references/observability-and-replay.md` when investigating stuck commands, duplicate-risk incidents, crashes, or replay.

## Runtime Rules

- Treat Matrix/Yjs as canonical workflow state.
- Never write AI reasoning directly into runtime state.
- Convert decisions into one of the supported command types: `diagnose_blocker`, `assign_actor`, `notify_actor`, `execute_action`, `validate_external_state`, `submit_claim`, `watch_udid`, `archive_flow`, or `propose_config_change`.
- Before any command executes, verify schema validity, UCAN capability, transition policy, current lease ownership, and replay/idempotency status.
- External mutations must follow plan, authorize, lease, execute, confirm, validate read-back, commit, and ledger.
- Deny by default. "UCAN can" is required but not sufficient; command policy and runtime state must also allow the action.
- Config mutation is proposal-only unless a separately authorized governance actor accepts it outside this skill.

## Operating Loop

1. Inspect the active `FlowAgentContext`, available `FlowAgentService`, and synchronized Yjs state.
2. Snapshot each action node and classify public state as `Pending`, `Blocked`, `Overdue`, or `Done`.
3. For each non-done node, choose the narrowest valid command:
   - `Pending`: execute if authorized and inputs are valid; otherwise assign to a UCAN-capable actor or diagnose missing conditions.
   - `Blocked`: classify cause, then emit a bounded unblock command or notify/escalate.
   - `Overdue`: notify assigned actors once per escalation window and escalate according to policy.
   - Unassigned: assign the best actor with matching UCAN; notify them.
4. Acquire a lease before execution and reject zombie writes when lease fencing fails.
5. Execute through the existing action registry or executor callback. Do not invent ad hoc tool surfaces.
6. Confirm the effect and validate read-back state before marking the command confirmed.
7. Continue until all flow nodes are done, then run allowed mutation, claim, UDID, memory, archive, and restart steps.

## Output Expectations

When asked to operate or diagnose a flow, provide:

- The current node/flow status you observed.
- The command(s) you intend to queue or execute, with command type, target node, reason, required capability, and idempotency key.
- Any UCAN, lease, validation, or replay blockers.
- The ledger/audit records that should exist after execution.
- Any human/governance approval needed for proposal-only config changes.

## Scripts

### validate_flow_agent_package.py

Validates this skill package layout and documentation.

```bash
python3 skills/flow-agent/scripts/validate_flow_agent_package.py skills/flow-agent
```

### validate_command_templates.py

Validates Flow Agent command examples and checklist templates.

```bash
python3 skills/flow-agent/scripts/validate_command_templates.py skills/flow-agent/templates/agent-command-examples.json
```

