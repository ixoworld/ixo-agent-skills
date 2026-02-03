# Verifier Services Reference

External verification services callable via `verify_evidence`.

## Service Registry

| Service DID | Methods | Purpose |
|-------------|---------|---------|
| `did:ixo:entity:schema-validator` | `validateClaim`, `validateBatch` | JSON Schema validation |
| `did:ixo:entity:sig-verifier` | `verifyEd25519`, `verifySecp256k1` | Signature verification |
| `did:ixo:entity:merkle-verifier` | `verifyInclusion`, `verifyRoot` | Merkle proof validation |
| `did:ixo:entity:ucan-verifier` | `validateUCAN`, `checkCapability` | UCAN token validation |
| `did:ixo:entity:receipt-verifier` | `verifyReceipt`, `verifyChain` | Transaction receipt validation |

## Schema Validator

Validates payloads against JSON schemas.

**Methods:**

### validateClaim
```typescript
await verify_evidence({
  evidence_type: "schema",
  evidence_cid: proposalCid,
  verifier: {
    service_did: "did:ixo:entity:schema-validator",
    method: "validateClaim"
  },
  expected: {
    schema: "ixo:claim:v2"
  }
});
```

### validateBatch
```typescript
await verify_evidence({
  evidence_type: "schema",
  evidence_cid: [cid1, cid2, cid3],
  verifier: {
    service_did: "did:ixo:entity:schema-validator",
    method: "validateBatch"
  },
  expected: {
    schema: "ixo:claim:v2"
  }
});
```

**Supported Schemas:**
- `ixo:claim:v2` — Standard claim format
- `ixo:credential:v1` — Verifiable credential
- `ixo:entity:v1` — Entity document
- `ixo:project:v1` — Project configuration

## Signature Verifier

Validates cryptographic signatures.

**Methods:**

### verifyEd25519
```typescript
await verify_evidence({
  evidence_type: "signature",
  evidence_cid: signedDocCid,
  verifier: {
    service_did: "did:ixo:entity:sig-verifier",
    method: "verifyEd25519"
  },
  expected: {
    issuer: "did:ixo:entity:issuer123"
  }
});
```

### verifySecp256k1
```typescript
await verify_evidence({
  evidence_type: "signature",
  evidence_cid: signedDocCid,
  verifier: {
    service_did: "did:ixo:entity:sig-verifier",
    method: "verifySecp256k1"
  },
  expected: {
    issuer: "did:ixo:entity:issuer456"
  }
});
```

## Merkle Verifier

Validates Merkle tree proofs.

**Methods:**

### verifyInclusion
```typescript
await verify_evidence({
  evidence_type: "merkle",
  evidence_cid: proofCid,
  verifier: {
    service_did: "did:ixo:entity:merkle-verifier",
    method: "verifyInclusion"
  },
  expected: {
    merkle_root: "QmRootHash..."
  },
  custom_params: {
    leaf_index: 42
  }
});
```

### verifyRoot
```typescript
await verify_evidence({
  evidence_type: "merkle",
  evidence_cid: [leaf1, leaf2, leaf3],
  verifier: {
    service_did: "did:ixo:entity:merkle-verifier",
    method: "verifyRoot"
  },
  expected: {
    merkle_root: "QmRootHash..."
  }
});
```

## UCAN Verifier

Validates UCAN authorization tokens.

**Methods:**

### validateUCAN
```typescript
await verify_evidence({
  evidence_type: "ucan",
  evidence_cid: ucanCid,
  verifier: {
    service_did: "did:ixo:entity:ucan-verifier",
    method: "validateUCAN"
  },
  expected: {
    issuer: "did:ixo:entity:root-authority"
  }
});
```

### checkCapability
```typescript
await verify_evidence({
  evidence_type: "ucan",
  evidence_cid: ucanCid,
  verifier: {
    service_did: "did:ixo:entity:ucan-verifier",
    method: "checkCapability"
  },
  expected: {
    capability_did: "did:ixo:entity:project123#cap-04"
  },
  custom_params: {
    required_ability: "settle"
  }
});
```

## Receipt Verifier

Validates transaction receipts.

**Methods:**

### verifyReceipt
```typescript
await verify_evidence({
  evidence_type: "receipt",
  evidence_cid: receiptCid,
  verifier: {
    service_did: "did:ixo:entity:receipt-verifier",
    method: "verifyReceipt"
  },
  custom_params: {
    chain_id: "ixo-5",
    expected_tx_hash: "ABC123..."
  }
});
```

### verifyChain
```typescript
// Verify a chain of receipts (multi-hop)
await verify_evidence({
  evidence_type: "receipt",
  evidence_cid: [receipt1, receipt2, receipt3],
  verifier: {
    service_did: "did:ixo:entity:receipt-verifier",
    method: "verifyChain"
  }
});
```

## Custom Verifiers

Register custom verification services:

```typescript
// Custom oracle verifier
await verify_evidence({
  evidence_type: "custom",
  evidence_cid: dataCid,
  verifier: {
    service_did: "did:ixo:entity:weather-oracle",
    endpoint: "https://oracle.weather.com/verify",
    method: "verifyWeatherData"
  },
  custom_params: {
    location: "nairobi",
    date: "2024-01-15",
    expected_condition: "rain"
  }
});
```

## Response Format

All verifiers return:

```typescript
interface VerifierResponse {
  valid: boolean;
  checks_passed: string[];
  checks_failed: string[];
  signature: string;  // Verifier's attestation signature
  metadata?: Record<string, any>;
}
```

## Error Handling

Verifier failures throw `QiError` with code `VERIFY_FAILED`:

```typescript
try {
  const result = await verify_evidence({ ... });
} catch (error) {
  if (error.code === "VERIFY_FAILED") {
    console.log("Verification failed:", error.message);
    console.log("Evidence CID:", error.evidence_cid);
  }
}
```
