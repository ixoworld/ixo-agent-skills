# UCAN Capabilities Reference

Capability DID patterns and authorization model.

## Capability DID Format

```
did:ixo:entity:<entity-id>#cap-<nn>

Components:
- did:ixo:entity: — IXO entity DID scheme
- <entity-id>     — Unique entity identifier
- #cap-<nn>       — Fragment identifying specific capability (01-99)
```

**Examples:**
```
did:ixo:entity:abc123#cap-01  → First accordedRight
did:ixo:entity:abc123#cap-02  → Second accordedRight
did:ixo:entity:project456#cap-04  → Fourth capability on project
```

## Standard Capability Indices

| Index | Ability | Typical Use |
|-------|---------|-------------|
| `#cap-01` | `observe` | Real-time state subscription |
| `#cap-02` | `read` | State queries |
| `#cap-03` | `propose` | Draft actions (when auth required) |
| `#cap-04` | `settle` | On-chain commits (claims, evals) |
| `#cap-05` | `settle` | Disputes (separate from claims) |
| `#cap-06` | `admin` | Entity administration |

## Entity Document Structure

Capabilities are defined in the entity's `accordedRight` array:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:ixo:entity:abc123",
  "accordedRight": [
    {
      "id": "did:ixo:entity:abc123#cap-01",
      "type": "Capability",
      "ability": "observe",
      "scope": "state:*",
      "conditions": {
        "auth_modes": ["none"]
      }
    },
    {
      "id": "did:ixo:entity:abc123#cap-02",
      "type": "Capability",
      "ability": "read",
      "scope": "state:*",
      "conditions": {
        "auth_modes": ["ucan"]
      }
    },
    {
      "id": "did:ixo:entity:abc123#cap-04",
      "type": "Capability",
      "ability": "settle",
      "scope": "claims:*",
      "conditions": {
        "auth_modes": ["ucan"],
        "requires_verification": true
      }
    }
  ]
}
```

## UCAN Token Structure

```json
{
  "iss": "did:ixo:entity:issuer789",
  "aud": "did:ixo:entity:agent456",
  "exp": 1735689600,
  "att": [
    {
      "with": "did:ixo:entity:abc123#cap-04",
      "can": "settle"
    }
  ],
  "prf": ["QmParentUCAN..."],
  "sig": "..."
}
```

## Flow-Level Auth Modes

### Mode: none
No authorization required. Anyone can invoke.

```yaml
flow_block:
  primitive: propose
  auth_mode: none
```

### Mode: ucan
Requires valid UCAN token with matching capability.

```yaml
flow_block:
  primitive: propose
  auth_mode: ucan
  capability_did: "did:ixo:entity:abc123#cap-03"
```

### Mode: assignment
Controller must explicitly assign the invoker.

```yaml
flow_block:
  primitive: propose
  auth_mode: assignment
  assignee_did: "did:ixo:entity:reviewer789"
```

## Capability Delegation

UCAN tokens can delegate capabilities:

```
Root Authority
    │
    ├── did:ixo:entity:abc123#cap-04 (settle)
    │       │
    │       └── Delegated to Project Admin
    │               │
    │               └── Delegated to Claim Agent
    │                       │
    │                       └── [Cannot delegate further]
```

**Delegation Rules:**
- Cannot delegate abilities you don't have
- Cannot extend scope beyond parent
- Cannot extend expiry beyond parent
- Proof chain must be valid

## Validation Flow

```typescript
// In settle handler
const hasCapability = await context.ucan.validate(
  "did:ixo:entity:abc123#cap-04",  // Required capability
  "settle"                          // Required ability
);

if (!hasCapability) {
  throw new QiError("AUTH_FAILED", "Missing settle capability");
}
```

## Capability Scopes

Scopes restrict what the capability applies to:

```json
{
  "id": "did:ixo:entity:abc123#cap-04",
  "ability": "settle",
  "scope": "claims:pending"  // Only pending claims
}
```

**Scope Patterns:**
- `*` — All resources
- `claims:*` — All claims
- `claims:pending` — Only pending claims
- `claims:{id}` — Specific claim

## Capability Conditions

Additional constraints on capability use:

```json
{
  "id": "did:ixo:entity:abc123#cap-04",
  "ability": "settle",
  "conditions": {
    "auth_modes": ["ucan"],
    "requires_verification": true,
    "max_amount": "1000000uixo",
    "time_window": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "UTC"
    }
  }
}
```

## Mapping Primitives to Capabilities

| Primitive | Default Ability | Capability Index |
|-----------|-----------------|------------------|
| `observe` | `observe` | `#cap-01` |
| `read_state` | `read` | `#cap-02` |
| `propose_action` | varies | `#cap-03` (if required) |
| `verify_evidence` | none | N/A |
| `settle` | `settle` | `#cap-04` or `#cap-05` |

## Error Handling

```typescript
try {
  await settle({
    capability_did: "did:ixo:entity:abc123#cap-04",
    ...
  });
} catch (error) {
  if (error.code === "AUTH_FAILED") {
    console.log("Missing capability:", error.capability_did);
  }
  if (error.code === "INVALID_CAPABILITY") {
    console.log("Malformed capability DID");
  }
}
```
