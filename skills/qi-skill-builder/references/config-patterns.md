# Config Patterns Reference

Domain configuration examples for generated skills.

## Basic Config Structure

```typescript
export const skillConfig = {
  name: "skill-name",           // kebab-case
  domain: "domain",             // claims, credentials, finance, etc.
  description: "...",
  resource_pattern: "did:ixo:entity:{entity_id}",
  
  capabilities: {
    read: "#cap-02",
    settle: "#cap-04",
  },
  
  adapters: {
    primary: "chain",
    realtime: "matrix",
  },
  
  verifiers: {
    schema: "did:ixo:entity:schema-validator",
  },
  
  chain: {
    target: "ixo",
    gas_limit: 200000,
  },
};
```

## Claims Domain

```typescript
export const skillConfig = {
  name: "carbon-claims",
  domain: "claims",
  resource_pattern: "did:ixo:entity:{project_id}",
  
  capabilities: {
    observe: "#cap-01",
    read: "#cap-02",
    propose: "#cap-03",
    settle_claim: "#cap-04",
    settle_dispute: "#cap-05",
  },
  
  adapters: {
    primary: "chain",
    realtime: "matrix",
  },
  
  verifiers: {
    schema: "did:ixo:entity:schema-validator",
    measurement: "did:ixo:entity:measurement-oracle",
  },
  
  chain: {
    target: "ixo",
    gas_limit: 300000,
  },
};
```

## Credentials Domain

```typescript
export const skillConfig = {
  name: "credential-issuer",
  domain: "credentials",
  resource_pattern: "did:ixo:entity:{issuer_id}",
  
  capabilities: {
    read: "#cap-02",
    issue: "#cap-04",
    revoke: "#cap-05",
  },
  
  adapters: {
    primary: "chain",
  },
  
  verifiers: {
    schema: "did:ixo:entity:schema-validator",
    signature: "did:ixo:entity:sig-verifier",
  },
  
  chain: {
    target: "ixo",
    gas_limit: 250000,
  },
};
```

## Finance Domain

```typescript
export const skillConfig = {
  name: "payment-processor",
  domain: "finance",
  resource_pattern: "did:ixo:entity:{treasury_id}",
  
  capabilities: {
    read: "#cap-02",
    transfer: "#cap-04",
  },
  
  adapters: {
    primary: "chain",
  },
  
  verifiers: {
    signature: "did:ixo:entity:sig-verifier",
    receipt: "did:ixo:entity:receipt-verifier",
  },
  
  chain: {
    target: "ixo",
    gas_limit: 150000,
    gas_price: "0.025uixo",
  },
};
```

## Multi-Adapter Config

```typescript
export const skillConfig = {
  name: "collaborative-claims",
  domain: "claims",
  resource_pattern: "did:ixo:entity:{project_id}",
  
  adapters: {
    primary: "chain",       // Authoritative state
    realtime: "matrix",     // Real-time collaboration
    offline: "crdt",        // Offline-first sync
  },
  
  adapter_routing: {
    observe: "matrix",      // Real-time from Matrix
    read_state: "chain",    // Authoritative from chain
    propose_action: "crdt", // Draft locally
    settle: "chain",        // Always settle on-chain
  },
};
```

## Auth Mode Config

```typescript
export const workflowAuth = {
  // Public read
  query_claims: {
    read_state: { mode: "none" },
  },
  
  // UCAN required
  submit_claim: {
    propose_action: { mode: "ucan", capability: "#cap-03" },
  },
  
  // Assignment required
  evaluate_claim: {
    propose_action: { mode: "assignment" },
    settle: { mode: "ucan", capability: "#cap-04" },
  },
};
```

## Environment-Specific Config

```typescript
const baseConfig = {
  name: "my-skill",
  domain: "claims",
  // ... common config
};

export const skillConfig = {
  ...baseConfig,
  chain: {
    target: process.env.CHAIN_TARGET || "ixo",
    gas_limit: parseInt(process.env.GAS_LIMIT || "200000"),
  },
  verifiers: {
    schema: process.env.SCHEMA_VERIFIER || "did:ixo:entity:schema-validator",
  },
};
```
