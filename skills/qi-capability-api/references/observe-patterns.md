# Observe Patterns Reference

Subscription patterns for real-time state observation.

## Basic Subscription

```typescript
const subscription = await observe({
  resource: "did:ixo:entity:project123",
  source: "matrix"
});

// Process events
for await (const event of subscription.stream) {
  switch (event.event_type) {
    case "create":
      console.log("New item:", event.delta);
      break;
    case "update":
      console.log("Updated:", event.delta);
      break;
    case "delete":
      console.log("Deleted:", event.resource);
      break;
  }
}
```

## Filtered Subscription

```typescript
// Only claim events
const claimSubscription = await observe({
  resource: "did:ixo:entity:project123",
  source: "matrix",
  filter: {
    event_types: ["ixo.claim.created", "ixo.claim.evaluated"]
  }
});

// Events since timestamp
const recentSubscription = await observe({
  resource: "did:ixo:entity:project123",
  source: "chain",
  filter: {
    since: "2024-01-01T00:00:00Z"
  }
});

// Pattern matching
const patternSubscription = await observe({
  resource: "did:ixo:entity:project123",
  source: "crdt",
  filter: {
    resource_pattern: "claims/*"
  }
});
```

## Matrix Patterns

### Room Events
```typescript
const roomSub = await observe({
  resource: "did:ixo:entity:project123",
  source: "matrix",
  filter: {
    event_types: ["m.room.message", "m.room.member"]
  }
});
```

### Custom State Events
```typescript
const stateSub = await observe({
  resource: "did:ixo:entity:project123",
  source: "matrix",
  filter: {
    event_types: ["ixo.project.state", "ixo.claim.status"]
  }
});
```

## CRDT Patterns

### Document Changes
```typescript
const docSub = await observe({
  resource: "did:ixo:entity:project123",
  source: "crdt"
});

for await (const event of docSub.stream) {
  // event.delta contains Automerge/Yjs change
  const { patches, newHeads } = event.delta;
  applyPatches(localDoc, patches);
}
```

### Selective Sync
```typescript
// Only observe specific paths
const pathSub = await observe({
  resource: "did:ixo:entity:project123",
  source: "crdt",
  filter: {
    resource_pattern: "claims.pending.*"
  }
});
```

## Chain Patterns

### Block Events
```typescript
const blockSub = await observe({
  resource: "did:ixo:entity:project123",
  source: "chain",
  filter: {
    event_types: ["tx.claim_submitted", "tx.claim_evaluated"]
  }
});
```

### Entity State Changes
```typescript
const entitySub = await observe({
  resource: "did:ixo:entity:project123",
  source: "chain",
  filter: {
    event_types: ["wasm.entity_updated"]
  }
});
```

## External Patterns

### WebSocket
```typescript
const wsSub = await observe({
  resource: "did:ixo:entity:oracle123",
  source: "external",
  external_config: {
    endpoint: "wss://oracle.ixo.world/stream",
    auth_header: "Bearer ${TOKEN}"
  }
});
```

### Server-Sent Events
```typescript
const sseSub = await observe({
  resource: "did:ixo:entity:api123",
  source: "external",
  external_config: {
    endpoint: "https://api.example.com/events"
  }
});
```

## Combining with Other Primitives

### Observe → Propose
```typescript
// Watch for triggers, then propose action
const sub = await observe({
  resource: "did:ixo:entity:project123",
  source: "matrix"
});

for await (const event of sub.stream) {
  if (event.event_type === "signal" && event.delta.type === "claim_ready") {
    await propose_action({
      action_type: "claim",
      resource: event.resource,
      payload: event.delta.claim_data
    });
  }
}
```

### Observe → Read → Propose
```typescript
// React to events with full context
const sub = await observe({
  resource: "did:ixo:entity:project123",
  source: "chain"
});

for await (const event of sub.stream) {
  if (event.event_type === "update") {
    // Get full state
    const state = await read_state({
      resource: event.resource,
      source: "chain"
    });
    
    // Propose based on state
    if (state.data.status === "pending_evaluation") {
      await propose_action({
        action_type: "eval",
        resource: event.resource,
        payload: { status: "approved" },
        dependencies: [state.snapshot_cid]
      });
    }
  }
}
```

## Error Handling

```typescript
const sub = await observe({
  resource: "did:ixo:entity:project123",
  source: "matrix"
});

try {
  for await (const event of sub.stream) {
    processEvent(event);
  }
} catch (error) {
  if (error.code === "ADAPTER_ERROR") {
    // Reconnect logic
    console.log("Connection lost, reconnecting...");
    await reconnect(sub.subscription_id);
  }
}
```

## Subscription Lifecycle

```typescript
// Start subscription
const sub = await observe({ ... });

// Process events
const processor = processEvents(sub.stream);

// Clean up (implementation-specific)
await unsubscribe(sub.subscription_id);
```
