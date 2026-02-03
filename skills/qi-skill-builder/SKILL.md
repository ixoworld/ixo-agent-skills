---
name: qi-skill-builder
description: |
  Meta Agent Skill for building Qi Skills that compose the five canonical primitives
  (observe, read_state, propose_action, verify_evidence, settle) from the Qi Capability API.
  Generates thin domain-specific wrappers rather than standalone tools.
  Use when: (1) User wants to create a new Qi Skill, (2) User provides skill specifications,
  (3) User needs UCAN-authorized workflows, (4) User describes agentic oracle capabilities,
  (5) User asks to generate skill code from natural language.
---

# Qi Skill Builder

Generates Qi Skills that compose the five canonical primitives from `qi-capability-api`. Skills are thin domain-specific wrappers, not standalone implementations.

## Core Principle: Primitive Composition

**DO NOT** generate custom state/chain interactions. Instead, compose:

| Primitive | Use For |
|-----------|---------|
| `observe` | Real-time subscriptions |
| `read_state` | Querying current state |
| `propose_action` | Drafting intents |
| `verify_evidence` | External validation |
| `settle` | On-chain commits |

## Generated Skill Structure

```
skill-name/
├── SKILL.md                    # Skill documentation
├── scripts/
│   ├── config.ts               # Domain configuration
│   ├── templates.ts            # Primitive call templates
│   └── types.ts                # Domain-specific types
└── references/
    └── workflows.md            # Domain workflows
```

## Build Pipeline

1. **Analyze Intent** → Classify into primitives needed
2. **Generate Config** → Domain resource patterns, capability mappings
3. **Generate Templates** → Pre-configured primitive calls
4. **Validate** → Check primitive composition correctness
5. **Package** → Bundle as skill

## Tool Reference

### analyze_skill_intent

Extracts primitive requirements from description.

```typescript
// Input
{ user_description: "Create a skill for submitting and evaluating carbon credit claims" }

// Output
{
  skill_name: "carbon-claims",
  domain: "claims",
  primitives_needed: ["read_state", "propose_action", "verify_evidence", "settle"],
  workflows: [
    { name: "submit_claim", steps: ["read_state", "propose_action"] },
    { name: "evaluate_claim", steps: ["read_state", "verify_evidence", "propose_action", "settle"] }
  ],
  capabilities: [
    { did_fragment: "#cap-02", ability: "read" },
    { did_fragment: "#cap-04", ability: "settle" }
  ]
}
```

### scaffold_skill

Generates skill files composing primitives.

### build_complete_skill

End-to-end build pipeline.

## Generated Config Pattern

```typescript
// scripts/config.ts
export const skillConfig = {
  name: "carbon-claims",
  domain: "claims",
  resource_pattern: "did:ixo:entity:{project_id}",
  
  capabilities: {
    read: "#cap-02",
    settle_claim: "#cap-04",
    settle_dispute: "#cap-05",
  },
  
  adapters: {
    primary: "chain",
    realtime: "matrix",
  },
  
  verifiers: {
    schema: "did:ixo:entity:schema-validator",
    signature: "did:ixo:entity:sig-verifier",
  },
};
```

## Generated Template Pattern

```typescript
// scripts/templates.ts
import { observe, read_state, propose_action, verify_evidence, settle } from "qi-capability-api";
import { skillConfig } from "./config";

export async function submitClaim(projectId: string, claimData: ClaimInput) {
  // 1. Read current state
  const state = await read_state({
    resource: `did:ixo:entity:${projectId}`,
    source: "chain",
    query: { path: "claims" }
  });
  
  // 2. Propose the claim
  const proposal = await propose_action({
    action_type: "claim",
    resource: `did:ixo:entity:${projectId}`,
    payload: claimData,
    dependencies: [state.snapshot_cid]
  });
  
  return proposal;
}

export async function evaluateAndSettle(projectId: string, claimId: string, evaluation: EvalInput) {
  // 1. Verify claim data
  const verification = await verify_evidence({
    evidence_type: "schema",
    evidence_cid: claimId,
    verifier: {
      service_did: skillConfig.verifiers.schema,
      method: "validateClaim"
    }
  });
  
  // 2. Propose evaluation
  const proposal = await propose_action({
    action_type: "eval",
    resource: `did:ixo:entity:${projectId}`,
    payload: { claim_id: claimId, ...evaluation }
  });
  
  // 3. Settle on-chain
  const result = await settle({
    proposal_cid: proposal.proposal_cid,
    verification_cid: verification.attestation_cid,
    settlement_type: "eval",
    capability_did: `did:ixo:entity:${projectId}${skillConfig.capabilities.settle_claim}`,
    chain_config: { target: "ixo" }
  });
  
  return result;
}
```

## Workflow Classification

The analyzer maps user intent to primitive sequences:

| Intent Pattern | Workflow | Primitives |
|----------------|----------|------------|
| "submit/create X" | Create | read → propose |
| "evaluate/review X" | Evaluate | read → verify → propose → settle |
| "dispute X" | Dispute | read → propose → settle |
| "monitor/watch X" | Monitor | observe |
| "query/get X" | Query | read |
| "transfer/send X" | Transfer | read → propose → verify → settle |

## Auth Mode Configuration

Generated configs specify auth per workflow:

```typescript
export const workflowAuth = {
  submit_claim: {
    propose: { mode: "ucan", capability: "#cap-03" }
  },
  evaluate_claim: {
    propose: { mode: "assignment" },
    settle: { mode: "ucan", capability: "#cap-04" }
  },
  public_query: {
    read: { mode: "none" }
  }
};
```

## References

- `references/primitive-mapping.md` — Intent to primitive mapping rules
- `references/config-patterns.md` — Domain configuration examples
- `references/workflow-examples.md` — Complete workflow implementations
