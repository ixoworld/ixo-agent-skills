# Adapter Configuration Reference

Adapters abstract state sources for the five primitives.

## Matrix Adapter

Real-time collaboration via Matrix protocol.

```typescript
interface MatrixAdapter {
  subscribe(roomId: string, filter?: EventFilter): AsyncIterable<StateEvent>;
  getState(roomId: string, stateKey?: string): Promise<any>;
  sendEvent(roomId: string, eventType: string, content: any): Promise<string>;
}
```

**Configuration:**
```yaml
adapters:
  matrix:
    homeserver: "https://matrix.ixo.world"
    access_token: "${MATRIX_TOKEN}"
    room_mapping:
      "did:ixo:entity:project123": "!abc123:ixo.world"
```

**Event Types:**
- `m.room.message` — General messages
- `ixo.claim.created` — Claim submissions
- `ixo.claim.evaluated` — Evaluation results
- `ixo.state.update` — State changes

## CRDT Adapter

Offline-first sync via Automerge/Yjs.

```typescript
interface CRDTAdapter {
  subscribe(docId: string): AsyncIterable<StateEvent>;
  getDoc(docId: string): Promise<any>;
  applyChange(docId: string, change: any): Promise<string>;
}
```

**Configuration:**
```yaml
adapters:
  crdt:
    provider: "automerge"  # or "yjs"
    sync_server: "wss://sync.ixo.world"
    doc_mapping:
      "did:ixo:entity:project123": "doc_abc123"
```

**Sync Patterns:**
- **Eager sync**: Push changes immediately
- **Lazy sync**: Batch changes on intervals
- **On-demand**: Sync only when settling

## Chain Adapter

On-chain state via IXO/Cosmos.

```typescript
interface ChainAdapter {
  query(path: string, params?: any): Promise<any>;
  queryAtHeight(path: string, height: number, params?: any): Promise<any>;
  broadcast(msgs: any[], memo?: string): Promise<TxResult>;
}
```

**Configuration:**
```yaml
adapters:
  chain:
    rpc_endpoint: "https://rpc.ixo.world"
    rest_endpoint: "https://api.ixo.world"
    chain_id: "ixo-5"
    gas_prices: "0.025uixo"
    signing_mode: "direct"  # or "amino"
```

**Query Paths:**
```
/ixo/entity/{id}                    # Entity state
/ixo/entity/{id}/claims             # Claims collection
/ixo/entity/{id}/claims/{claim_id}  # Single claim
/cosmos/bank/v1beta1/balances/{addr} # Token balances
```

**Historical Queries:**
```typescript
// Query state at specific block
const state = await chain.queryAtHeight(
  `/ixo/entity/${entityId}/claims`,
  12345678
);
```

## External Adapter

HTTP APIs for third-party systems.

```typescript
interface ExternalAdapter {
  fetch(endpoint: string, options?: RequestInit): Promise<any>;
  subscribe(endpoint: string, options?: any): AsyncIterable<any>;
}
```

**Configuration:**
```yaml
adapters:
  external:
    timeout_ms: 30000
    retry_attempts: 3
    rate_limit:
      requests_per_second: 10
    services:
      oracle_api:
        base_url: "https://oracle.ixo.world"
        auth_type: "bearer"
        token: "${ORACLE_TOKEN}"
      weather_api:
        base_url: "https://api.weather.com"
        auth_type: "api_key"
        key_header: "X-API-Key"
```

**Subscription Methods:**
- **WebSocket**: Real-time bidirectional
- **SSE**: Server-sent events
- **Polling**: Interval-based fetch

```typescript
// WebSocket subscription
const stream = external.subscribe("wss://oracle.ixo.world/events", {
  type: "websocket",
  reconnect: true
});

// SSE subscription
const stream = external.subscribe("https://api.example.com/events", {
  type: "sse"
});

// Polling subscription
const stream = external.subscribe("https://api.example.com/state", {
  type: "poll",
  interval_ms: 5000
});
```

## Adapter Selection

| Source | Use When |
|--------|----------|
| `matrix` | Real-time collaboration, chat-like interactions |
| `crdt` | Offline-first, conflict-free local editing |
| `chain` | Authoritative on-chain state, settlements |
| `external` | Third-party data, oracles, legacy systems |

## Error Handling

All adapters throw `QiError` with code `ADAPTER_ERROR`:

```typescript
try {
  const state = await chain.query("/invalid/path");
} catch (error) {
  if (error instanceof QiError && error.code === "ADAPTER_ERROR") {
    console.log("Adapter failed:", error.message);
  }
}
```
