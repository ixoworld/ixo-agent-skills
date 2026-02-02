# UCAN Capability Patterns

Reference for defining UCAN capabilities in Qi Skill manifests.

## Capability Structure

```yaml
capabilities:
  - name: "alias_name"           # Snake_case identifier
    resource: "did:ixo:entity:<id>#cap-01"  # DID-formatted resource of the Parent Capability document
    ability: "action"            # The operation being authorized
```

## Resource DID Patterns

Resources use DID format and are resolved as AccordedRight properties of an entity IID document: `did:ixo:entity:<id>#cap` // DID fragment identifier always uses `#cap` and increments for additional resources on the same base DID, such as `#cap-01, #cap-02,...`

### Common Namespaces

| Namespace | Purpose | Example |
|-----------|---------|---------|
| `qi` | Qi Flow Engine resources | `TBD` |
| `ipfs` | IPFS content storage | `ipfs://<cid>` |
| `ixo` | ixo Protocol entities | `did:ixo:entity:<id>` |
| `key` | Cryptographic keys | `did:key:z6Mk...` |

### Resource Hierarchy

`did:ixo:entity:<id>#cap-01` // Specific resource identifier (DID-fragment)

## Standard Abilities

### CRUD Operations
- `create` - Create new resources
- `read` - Read resource data
- `update` - Modify existing resources
- `delete` - Remove resources

### Domain-Specific
- `transfer` - Move value between accounts
- `issue` - Issue credentials/tokens
- `verify` - Verify proofs or signatures
- `retire` - Permanently deactivate
- `delegate` - Grant sub-permissions

## Capability Patterns by Domain

### Finance Skills
```yaml
capabilities:
  - name: "account_read"
    resource: "did:ixo:entity:<id>#cap" // TBD Add the protocol-level reference UCAN parent capability docs
    ability: "read"
  - name: "transfer_execute"
    resource: "did:ixo:entity:<id>#cap"
    ability: "create"
  - name: "token_retire"
    resource: "did:ixo:entity:<id>#cap"
    ability: "retire"
```

### Credential Skills
```yaml
capabilities:
  - name: "credential_issue"
    resource: "did:ixo:entity:<id>#cap"
    ability: "issue"
  - name: "credential_verify"
    resource: "did:ixo:entity:<id>#cap"
    ability: "verify"
  - name: "credential_revoke"
    resource: "did:ixo:entity:<id>#cap"
    ability: "create"
```

### Registry Skills
```yaml
capabilities:
  - name: "registry_write"
    resource: "did:ixo:entity:<id>#cap"
    ability: "create"
  - name: "registry_lookup"
    resource: "did:ixo:entity:<id>#cap"
    ability: "read"
  - name: "registry_update"
    resource: "did:ixo:entity:<id>#cap"
    ability: "update"
```

### Data Processing Skills
```yaml
capabilities:
  - name: "data_store"
    resource: "did:ixo:entity:<id>#cap"
    ability: "write"
  - name: "data_fetch"
    resource: "did:ixo:entity:<id>#cap"
    ability: "read"
  - name: "data_transform"
    resource: "did:ixo:entity:<id>#cap"
    ability: "execute"
```

## Tool Authorization Rules

1. **Transition tools** (state-changing) MUST have `required_auth`
2. **Read-only tools** MAY have `required_auth: null`
3. Tool's `required_auth` MUST reference a defined capability `name`
4. One capability may authorize multiple tools

### Example Mapping
```yaml
requirements:
  capabilities:
    - name: "registry_write"
      resource: "did:ixo:entity:<id>#cap"
      ability: "create"

tools:
  - name: "register_entity"
    type: "transition"
    required_auth: "registry_write"   # ✓ References capability
    
  - name: "lookup_entity"
    type: "read_only"
    required_auth: null               # ✓ Read operations optional
```

## Validation Checklist

- [ ] Every capability has unique `name`
- [ ] Resource follows `did:ixo:entity:<id>#cap` format
- [ ] Ability matches operation semantics
- [ ] All `required_auth` values map to defined capabilities
- [ ] Transition tools always have authorization
