# Observability and Replay

Use this reference when investigating Flow Agent behavior, crashes, stuck commands, or duplicate-risk incidents.

## Ledger Event Types

- `agent.decision`: why a command was selected or skipped.
- `agent.command`: command queued, leased, running, confirmed, failed, or skipped.
- `agent.validation`: external state confirmation and read-back results.
- `agent.escalation`: notification or escalation events.
- `agent.memory`: durable lesson from UDID/evaluation result or runtime outcome.

## Replay Rules

- Rebuild intent from the ledger and current Yjs state.
- Skip already-confirmed command IDs.
- Re-acquire expired leases before executing queued work.
- Reject zombie writes when lease epoch or owner no longer matches.
- Treat unknown post-effect state as dangerous: validate before retrying.
- Retry external effects only when idempotency and command policy allow.

## Incident Triage

For a stuck node:

1. Read the current node snapshot.
2. Read queued commands for the node.
3. Check leases and expiry.
4. Check ledger events for the command ID.
5. Check UCAN policy decisions and proof expiry.
6. Check executor result and validation output.
7. Choose one bounded next command or escalate.

For duplicate-risk incidents:

1. Compare idempotency keys.
2. Check confirmed command IDs.
3. Confirm external read-back state.
4. Mark duplicate commands skipped if the intended effect already exists.
5. Record an `agent.validation` or `agent.escalation` event.

For no-UDID incidents:

1. Confirm claim submission result.
2. Watch until configured timeout.
3. Notify responsible actors.
4. Record timeout state.
5. Continue watching only if policy allows and the loop has not been archived.

