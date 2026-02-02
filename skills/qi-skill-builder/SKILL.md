---
name: qi-skill-builder
description: |
  Meta Agent Skill for building Qi Skills that run on the Qi Flow Engine.
  Creates complete skill modules with SKILL.md (containing YAML frontmatter), TypeScript handlers (src/handlers.ts),
  and Zod type definitions (src/types.ts). Use when: (1) User wants to create a new Qi Skill,
  (2) User provides skill specifications or descriptions, (3) User needs to scaffold UCAN-authorized
  tools for Qi Flows, (4) User describes agentic oracle capabilities they need to implement,
  (5) User asks to generate skill code from natural language.
---

# Qi Skill Builder

Meta-skill that builds Qi Skills conforming to the **Agent Skills standard**. Transforms natural language descriptions into complete, validated skill modules with proper UCAN capability mappings.

## Agent Skills Standard

### Required Structure

```
skill-name/
├── SKILL.md              # REQUIRED: Markdown with YAML frontmatter
├── scripts/              # Optional: Executable code
│   ├── handlers.ts       # TypeScript tool implementations  
│   └── types.ts          # Zod schemas for arguments
├── references/           # Optional: Documentation loaded as needed
└── assets/               # Optional: Files used in output
```

### SKILL.md Format

```markdown
---
name: skill-name
description: |
  What the skill does and WHEN to use it. Include trigger patterns.
  This description determines when the skill activates.
---

# Skill Title

Instructions and guidance for using the skill.

## Tool Reference
[Document each tool with inputs/outputs]

## Qi Flow Engine Integration
[UCAN capabilities, evidence requirements, etc.]
```

## Qi Flow Engine Principles

Every generated skill must adhere to:

1. **The Harness is Sovereign**: Tools cannot run unless explicitly authorized via UCAN capabilities
2. **Intent is Authority**: Permissions derived from UCAN token in the skill's capability requirements
3. **State is Immutable**: Handlers must be stateless and return deterministic outputs
4. **Evidence is Required**: Transition tools must return proofs (CIDs, hashes) via `evidence_cid`

## Build Pipeline

1. **Analyze Intent** → Extract tools, capabilities, and schemas from description
2. **Scaffold Structure** → Generate SKILL.md + scripts/ directory
3. **Validate Conformance** → Check frontmatter, capability mappings, type compliance
4. **Package & Store** → Bundle files and push to the Github Skills Repo as a PR, return CID as evidence

## Tool Reference

### analyze_skill_intent
Parses natural language to extract skill structure. No authorization required.

```typescript
// Input
{ user_description: "Create a skill that issues verifiable credentials..." }

// Output
{
  skill_name: "issue_verifiable_credentials",
  tools: [{ name: "issue_credential", type: "transition", ... }],
  capabilities: [{ name: "credential_issue", resource: "did:qi:credentials:item", ability: "create" }]
}
```

### scaffold_skill
Creates complete file structure with SKILL.md (YAML frontmatter) and scripts. Requires `skill_scaffold` capability.

### validate_skill
Checks conformance against Agent Skills standard:
- SKILL.md exists with valid YAML frontmatter
- `name` and `description` fields present in frontmatter
- Handler-to-capability mapping correctness
- ToolResult interface compliance

### build_complete_skill
Single-step convenience tool that runs the full pipeline.

## Handler Requirements

All handlers in `scripts/handlers.ts` must:

1. Accept `(args: unknown, context: QiContext)` signature
2. Validate args with Zod schema: `const validated = Schema.parse(args)`
3. Return `ToolResult` interface:

```typescript
interface ToolResult {
  data: Record<string, any>;      // Raw JSON result
  evidence_cid?: string;          // IPFS hash for transitions
  summary: string;                // One-line human readable
}
```

4. Be stateless—no side effects except via `context.ipfs.save()`
5. Transition tools MUST store evidence and return CID

## Capability Mapping Rules

Document capabilities in SKILL.md under a "## Capabilities" or "## Qi Flow Integration" section:

- Every `transition` tool must reference a defined capability
- `read_only` tools may have no capability requirement
- Capability `resource` must be a valid DID: `did:namespace:path`
- Capability `ability` matches the operation: `create`, `read`, `update`, `delete`, `transfer`

## Domain Classification

The analyzer classifies skills into domains for appropriate capability DIDs:

| Domain | Keywords | Example Resource |
|--------|----------|------------------|
| finance | payment, credit, transfer, token | `https://github.com/ixoworld/qi-agent-skills/tree/main/examples/invoice-creator` |
| credentials | credential, verify, issue, claim | |
| identity | did, authenticate, kyc | |
| registry | register, lookup, resolve | |
| data | query, fetch, store, process | |

## Example Generated Skill

For a credential issuance skill, the builder generates:

```
credential-issuer/
├── SKILL.md
├── scripts/
│   ├── handlers.ts
│   └── types.ts
└── references/
    └── vc-schema.md
```

**SKILL.md contents:**
```markdown
---
name: credential-issuer
description: |
  Issue W3C Verifiable Credentials with IPFS evidence anchoring.
  Use when users need to: (1) Create new credentials, (2) Issue certificates,
  (3) Generate verifiable attestations.
---

# Credential Issuer

Issue verifiable credentials with cryptographic proofs and IPFS evidence storage.

## Tools

### issue_credential
Issues a new verifiable credential.

**Type**: transition (requires `credential_issue` capability)

**Inputs**:
- `subject_did` (string): DID of the credential subject
- `claims` (object): Claims to include in the credential
- `expiration` (string, optional): ISO date for credential expiry

**Outputs**:
- `credential` (object): The issued VC
- `evidence_cid` (string): IPFS CID of the credential

## Capabilities

| Name | Resource | Ability |
|------|----------|---------|
| credential_issue | did:qi:credentials:item | create |

## Qi Flow Integration

This skill requires UCAN authorization with `credential_issue` capability.
All issued credentials are stored to IPFS with CID returned as evidence.
```
