# Ralph Loop Runbook

Use this reference when maintaining an active Ralph Loop.

## Loop Invariant

The Flow Agent loops while the flow is not done. On every tick, inspect node snapshots, queue only bounded commands, execute only authorized leased commands, confirm outcomes, validate read-back state, and record ledger events.

## Node Handling

### Pending

- If inputs and conditions are valid, queue `execute_action`.
- If action condition is unmet but the Flow Agent can resolve it, queue `diagnose_blocker` or an allowed unblock action.
- If the Flow Agent lacks authority, queue `assign_actor` or `notify_actor` for an actor with the needed UCAN.
- If there is no assignee, assign a UCAN-capable human or agent and notify them.

### Blocked

Classify the blocker cause:

- `missing_input`
- `failed_upstream`
- `missing_ucan`
- `stale_config`
- `service_error`
- `external_confirmation_pending`
- `validation_mismatch`
- `unknown`

Then choose exactly one bounded next step:

- Diagnose and record the blocker.
- Execute an allowed unblock command.
- Notify the responsible actor.
- Propose a config change when stale config is the root cause.
- Escalate if repeated diagnosis would create a loop.

### Overdue

- Notify assigned actors once per escalation window.
- Escalate to configured owners after threshold expiry.
- Do not spam notifications for the same overdue state.
- If overdue because an external confirmation is pending, validate state before retrying.

### Done

- Skip node execution.
- Include the node in flow completion checks.
- Do not re-open a done node unless policy and a human-approved config change explicitly require it.

## Flow Completion

When all nodes are done:

1. Execute external mutations only if `flow/mutation/execute` is authorized.
2. For chain transactions, await confirmation hash and read chain state back.
3. For database updates, await API confirmation and read database state back.
4. For webhook triggers, await API confirmation and validate expected remote state or receipt.
5. Submit the claim if `flow/claim/submit` is authorized.
6. Watch for UDID/evaluation result.
7. If UDID times out, notify responsible actors and record blocked or overdue state.
8. Write memory and observability records from the UDID result.
9. Archive the flow if `flow/archive` is authorized.
10. Restart the loop cycle only when the configured repeat condition is met.

## Bounded Unhappy Paths

- Missing assignment: assign a UCAN-capable actor.
- Missing condition: diagnose, resolve if allowed, otherwise notify.
- Failed external mutation: retry only with idempotency; otherwise escalate.
- No UDID: watch until timeout, notify, and record state.
- Config problem: propose a change; never directly edit the template.

