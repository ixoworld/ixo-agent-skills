# Primitive Mapping Reference

Rules for mapping user intent to primitive sequences.

## Intent Patterns

| Pattern | Keywords | Primitives | Notes |
|---------|----------|------------|-------|
| Submit | submit, create, add, register, issue | read → propose | Draft without settlement |
| Evaluate | evaluate, review, approve, reject | read → verify → propose → settle | Full settlement flow |
| Dispute | dispute, challenge, contest | read → propose → settle | Uses #cap-05 |
| Transfer | transfer, send, pay | read → propose → verify → settle | Financial operations |
| Query | query, get, fetch, list | read | Read-only |
| Monitor | monitor, watch, subscribe | observe | Real-time |
| Verify | verify, validate, check | read → verify | Verification without settlement |

## Primitive Selection Rules

### When to use `observe`
- User wants real-time updates
- Keywords: "monitor", "watch", "subscribe", "track", "live"
- Always paired with an adapter that supports streaming

### When to use `read_state`
- User needs current or historical state
- Keywords: "get", "fetch", "query", "show", "list"
- Nearly always the first step in any workflow

### When to use `propose_action`
- User wants to draft a change
- Keywords: "create", "submit", "draft", "add"
- Auth mode determined by flow configuration

### When to use `verify_evidence`
- User needs external validation
- Keywords: "verify", "validate", "check", "confirm"
- Always calls an external verifier service

### When to use `settle`
- User wants on-chain finality
- Keywords: "approve", "commit", "finalize", "execute"
- Always requires UCAN with settle ability

## Workflow Patterns

### Simple Query
```
read_state
```

### Submit Draft
```
read_state → propose_action
```

### Full Settlement
```
read_state → propose_action → verify_evidence → settle
```

### Real-time + Action
```
observe → read_state → propose_action → settle
```

## Domain-Specific Mappings

### Claims Domain
- "submit claim" → read → propose(claim)
- "evaluate claim" → read → verify → propose(eval) → settle(eval)
- "dispute claim" → read → propose(dispute) → settle(dispute)

### Credentials Domain
- "issue credential" → read → propose(claim) → verify → settle
- "verify credential" → read → verify
- "revoke credential" → read → propose(claim) → settle

### Finance Domain
- "transfer tokens" → read → propose(transaction) → verify → settle(transfer)
- "check balance" → read
- "distribute payments" → read → propose(batch) → settle(batch)
