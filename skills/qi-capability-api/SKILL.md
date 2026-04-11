---
name: qi-capability-api
description: |
  Foundational API providing five canonical primitives for Qi Flow Engine operations:
  observe (real-time state), read_state (snapshots), propose_action (draft intents),
  verify_evidence (external validation), and settle (on-chain commits).
  Use when: (1) Building skills that interact with CRDT/Matrix/chain state,
  (2) Implementing UCAN-authorized workflows, (3) Creating propose→verify→settle pipelines,
  (4) Integrating external verification services, (5) Working with batch settlements,
  (6) Subscribing to real-time state changes.
---

# Qi Capability API

Five canonical primitives that wrap all Qi Flow Engine operations. Every skill should compose these primitives rather than implementing custom state interactions.

## Primitives Overview

| Primitive | Purpose | Auth | Side Effects |
|-----------|---------|------|--------------|
| `observe` | Real-time state subscription | Flow-defined | None (reactive) |
| `read_state` | Point-in-time snapshot | `read` ability | None |
| `propose_action` | Draft intent | Flow-defined | IPFS storage |
| `verify_evidence` | External validation | None | External call |
| `settle` | On-chain commit | `settle` ability | Chain tx |

## Capability DID Pattern

Capabilities use DID fragment paths:
```
did:ixo:entity:<entity-id>#cap-<nn>

Examples:
did:ixo:entity:abc123#cap-01  → observe rights
did:ixo:entity:abc123#cap-02  → read rights  
did:ixo:entity:abc123#cap-03  → propose rights
did:ixo:entity:abc123#cap-04  → settle rights
```

## Flow-Level Authorization

Auth requirements are set per flow block, not per primitive:

```yaml
flow_blocks:
  - id: "public-feedback"
    primitive: propose
    auth_mode: none           # Open to all
    
  - id: "submit-claim"
    primitive: propose
    auth_mode: ucan           # Requires UCAN
    capability_did: "did:ixo:entity:project#cap-03"
    
  - id: "assigned-review"
    primitive: propose
    auth_mode: assignment     # Controller assigns
```

## Primitive Reference

### observe

Subscribe to real-time state changes.

```typescript
const subscription = await observe({
  resource: "did:ixo:entity:project123",
  source: "matrix",
  filter: { event_types: ["claim.created", "claim.updated"] }
});

for await (const event of subscription.stream) {
  console.log(event.event_type, event.delta);
}
```

See `references/observe-patterns.md` for adapter-specific examples.

### read_state

Query current or historical state.

```typescript
const state = await read_state({
  resource: "did:ixo:entity:project123",
  source: "chain",
  query: { path: "claims", filter: { status: "pending" } },
  at_block: 12345678  // Optional historical read
});
```

### propose_action

Draft an intent for later settlement. Auth mode injected by flow engine.

```typescript
// Single proposal
const proposal = await propose_action({
  action_type: "claim",
  resource: "did:ixo:entity:project123",
  payload: { claimant: "did:ixo:entity:alice", amount: 1000 }
});

// Batch proposal
const batch = await propose_action({
  action_type: "batch",
  resource: "did:ixo:entity:project123",
  payload: [claim1, claim2, claim3]
});
```

### verify_evidence

Validate proofs via external verification service.

```typescript
const verification = await verify_evidence({
  evidence_type: "schema",
  evidence_cid: proposal.proposal_cid,
  verifier: {
    service_did: "did:ixo:entity:schema-validator",
    method: "validateClaim"
  },
  expected: { schema: "ixo:claim:v2" }
});
```

See `references/verifier-services.md` for available verifiers.

### settle

Commit proposals on-chain. Requires UCAN with `settle` ability.

```typescript
// Single settlement
const result = await settle({
  proposal_cid: proposal.proposal_cid,
  verification_cid: verification.attestation_cid,
  settlement_type: "claim",
  capability_did: "did:ixo:entity:project123#cap-04",
  chain_config: { target: "ixo" }
});

// Batch settlement (atomic)
const batchResult = await settle({
  proposal_cid: [p1.proposal_cid, p2.proposal_cid],
  settlement_type: "batch",
  capability_did: "did:ixo:entity:project123#cap-04",
  chain_config: { target: "ixo" }
});
```

## Standard Workflow

```
observe ──┐
          │
read_state ──→ propose_action ──→ verify_evidence ──→ settle
                    │                    │
                    │   (optional)       │
                    └────────────────────┘
```

1. **Observe/Read**: Get current state
2. **Propose**: Draft action (auth per flow block)
3. **Verify**: External validation (optional but recommended)
4. **Settle**: Commit on-chain (requires UCAN)

## Batch Settlement Pattern

Multiple proposals settle atomically:

```typescript
// 1. Propose batch
const proposals = await Promise.all(
  claims.map(c => propose_action({ action_type: "claim", payload: c }))
);

// 2. Verify batch
const verification = await verify_evidence({
  evidence_type: "schema",
  evidence_cid: proposals.map(p => p.proposal_cid),
  verifier: { service_did: "did:ixo:entity:batch-validator", method: "validateBatch" }
});

// 3. Settle batch (single tx)
const settlement = await settle({
  proposal_cid: proposals.map(p => p.proposal_cid),
  verification_cid: verification.attestation_cid,
  settlement_type: "batch",
  capability_did: "did:ixo:entity:project#cap-04",
  chain_config: { target: "ixo" }
});
```

## Adapters

State sources are abstracted via adapters:

| Adapter | Source | Use Case |
|---------|--------|----------|
| `matrix` | Matrix rooms | Real-time collaboration |
| `crdt` | Automerge/Yjs | Offline-first sync |
| `chain` | IXO/Cosmos | On-chain state |
| `external` | HTTP APIs | Third-party systems |

See `references/adapters.md` for configuration.

## Error Handling

All primitives return structured errors:

```typescript
interface QiError {
  code: "AUTH_FAILED" | "INVALID_STATE" | "VERIFY_FAILED" | "SETTLE_FAILED";
  message: string;
  capability_did?: string;
  evidence_cid?: string;
}
```

## References

- `references/types.md` — Complete TypeScript interfaces
- `references/adapters.md` — Adapter configuration
- `references/verifier-services.md` — External verifier registry
- `references/observe-patterns.md` — Subscription patterns
- `references/ucan-capabilities.md` — Capability DID patterns
