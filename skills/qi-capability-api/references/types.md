# Qi Capability API Types Reference

Complete TypeScript interfaces for all five primitives.

## Core Types

```typescript
// DID formats
type DID = string;           // did:ixo:entity:abc123
type CapabilityDID = string; // did:ixo:entity:abc123#cap-01
type CID = string;           // Qm... or bafy...

// Standard tool result
interface ToolResult {
  data: Record<string, any>;
  evidence_cid?: string;
  summary: string;
}
```

## Observe

```typescript
interface ObserveArgs {
  resource: DID;
  source: "matrix" | "crdt" | "chain" | "external";
  filter?: {
    event_types?: string[];
    resource_pattern?: string;
    since?: string;  // ISO datetime
  };
  external_config?: {
    endpoint: string;
    auth_header?: string;
  };
}

interface ObserveResult {
  subscription_id: string;
  resource: DID;
  source: string;
}

interface StateEvent {
  event_type: "create" | "update" | "delete" | "signal";
  resource: DID;
  delta: any;
  timestamp: string;
  source_cid?: CID;
}
```

## Read State

```typescript
interface ReadStateArgs {
  resource: DID;
  source: "matrix" | "crdt" | "chain" | "external";
  query?: {
    path?: string;
    filter?: Record<string, any>;
    projection?: string[];
    limit?: number;
    offset?: number;
  };
  at_block?: number;
  external_config?: {
    endpoint: string;
    method?: "GET" | "POST";
    auth_header?: string;
  };
}

interface ReadStateResult {
  data: any;
  snapshot_cid: CID;
  block_height?: number;
  timestamp: string;
}
```

## Propose Action

```typescript
type AuthMode = "none" | "ucan" | "assignment";

interface AuthContext {
  mode: AuthMode;
  ucan_cid?: CID;
  assignment_proof?: CID;
  assignee_did?: DID;
}

interface ProposeActionArgs {
  action_type: "claim" | "transaction" | "message" | "eval" | "dispute" | "batch";
  resource: DID;
  payload: any | any[];
  dependencies?: CID[];
  auth_context?: AuthContext;
  ttl_seconds?: number;
}

interface ProposeActionResult {
  proposal_cid: CID;
  draft: any;
  batch_size?: number;
  required_capabilities: CapabilityRef[];
  review_required: boolean;
  expiry?: string;
}

interface CapabilityRef {
  capability_did: CapabilityDID;
  ability: string;
  scope?: string;
}
```

## Verify Evidence

```typescript
interface VerifierConfig {
  service_did: DID;
  endpoint?: string;
  method: string;
}

interface VerifyEvidenceArgs {
  evidence_type: "signature" | "receipt" | "schema" | "merkle" | "ucan" | "custom";
  evidence_cid: CID | CID[];
  verifier: VerifierConfig;
  expected?: {
    issuer?: DID;
    schema?: string;
    capability_did?: CapabilityDID;
    merkle_root?: CID;
  };
  custom_params?: Record<string, any>;
}

interface VerifyEvidenceResult {
  valid: boolean;
  checks_passed: string[];
  checks_failed?: string[];
  attestation_cid: CID;
  verifier_did: DID;
  verification_timestamp: string;
}
```

## Settle

```typescript
interface ChainConfig {
  target: "ixo" | "cosmos-hub" | "osmosis" | "neutron";
  gas_limit?: number;
  gas_price?: string;
  memo?: string;
}

interface SettleArgs {
  proposal_cid: CID | CID[];
  verification_cid?: CID;
  settlement_type: "claim" | "eval" | "dispute" | "transfer" | "batch";
  capability_did: CapabilityDID;
  chain_config: ChainConfig;
}

interface SettleResult {
  tx_hash: string;
  block_height: number;
  evidence_cid: CID;
  settled_count?: number;
  settled_cids?: CID[];
  finality: "pending" | "confirmed" | "finalized";
  gas_used: number;
}
```

## Error Types

```typescript
type QiErrorCode = 
  | "AUTH_FAILED"
  | "INVALID_STATE"
  | "VERIFY_FAILED"
  | "SETTLE_FAILED"
  | "ADAPTER_ERROR"
  | "INVALID_CAPABILITY"
  | "EXPIRED_PROPOSAL";

class QiError extends Error {
  code: QiErrorCode;
  capability_did?: string;
  evidence_cid?: string;
}
```
