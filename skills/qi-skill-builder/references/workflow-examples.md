# Workflow Examples Reference

Complete workflow implementations using primitive composition.

## Claim Submission Workflow

```typescript
import { read_state, propose_action } from "qi-capability-api";
import { skillConfig } from "./config";

export interface SubmitClaimInput {
  claimant_did: string;
  claim_type: string;
  data: Record<string, any>;
  evidence_cids?: string[];
}

export async function submitClaim(
  projectId: string,
  input: SubmitClaimInput
) {
  // 1. Read current project state
  const state = await read_state({
    resource: `did:ixo:entity:${projectId}`,
    source: "chain",
    query: { path: "claims/pending" },
  });
  
  // 2. Propose the claim
  const proposal = await propose_action({
    action_type: "claim",
    resource: `did:ixo:entity:${projectId}`,
    payload: {
      claimant: input.claimant_did,
      type: input.claim_type,
      data: input.data,
      evidence: input.evidence_cids || [],
    },
    dependencies: [state.snapshot_cid],
  });
  
  return {
    proposal_cid: proposal.proposal_cid,
    required_capabilities: proposal.required_capabilities,
    expiry: proposal.expiry,
  };
}
```

## Claim Evaluation Workflow

```typescript
import { read_state, verify_evidence, propose_action, settle } from "qi-capability-api";
import { skillConfig } from "./config";

export interface EvaluateClaimInput {
  claim_id: string;
  evaluator_did: string;
  status: "approved" | "rejected";
  reason?: string;
  amount?: string;
}

export async function evaluateClaim(
  projectId: string,
  input: EvaluateClaimInput
) {
  // 1. Read the claim
  const state = await read_state({
    resource: `did:ixo:entity:${projectId}`,
    source: "chain",
    query: { path: `claims/${input.claim_id}` },
  });
  
  // 2. Verify claim data
  const verification = await verify_evidence({
    evidence_type: "schema",
    evidence_cid: state.snapshot_cid,
    verifier: {
      service_did: skillConfig.verifiers.schema,
      method: "validateClaim",
    },
    expected: {
      schema: "ixo:claim:v2",
    },
  });
  
  if (!verification.valid) {
    throw new Error(`Claim validation failed: ${verification.checks_failed?.join(", ")}`);
  }
  
  // 3. Propose evaluation
  const proposal = await propose_action({
    action_type: "eval",
    resource: `did:ixo:entity:${projectId}`,
    payload: {
      claim_id: input.claim_id,
      evaluator: input.evaluator_did,
      status: input.status,
      reason: input.reason,
      amount: input.amount,
    },
    dependencies: [state.snapshot_cid, verification.attestation_cid],
  });
  
  // 4. Settle on-chain
  const result = await settle({
    proposal_cid: proposal.proposal_cid,
    verification_cid: verification.attestation_cid,
    settlement_type: "eval",
    capability_did: `did:ixo:entity:${projectId}${skillConfig.capabilities.settle_claim}`,
    chain_config: skillConfig.chain,
  });
  
  return {
    tx_hash: result.tx_hash,
    evidence_cid: result.evidence_cid,
    finality: result.finality,
  };
}
```

## Batch Settlement Workflow

```typescript
import { read_state, propose_action, verify_evidence, settle } from "qi-capability-api";
import { skillConfig } from "./config";

export interface BatchSettleInput {
  claim_ids: string[];
  evaluator_did: string;
  status: "approved" | "rejected";
}

export async function batchSettle(
  projectId: string,
  input: BatchSettleInput
) {
  // 1. Read all claims
  const state = await read_state({
    resource: `did:ixo:entity:${projectId}`,
    source: "chain",
    query: { 
      path: "claims",
      filter: { id: { $in: input.claim_ids } },
    },
  });
  
  // 2. Propose batch
  const proposals = await Promise.all(
    input.claim_ids.map(claimId =>
      propose_action({
        action_type: "eval",
        resource: `did:ixo:entity:${projectId}`,
        payload: {
          claim_id: claimId,
          evaluator: input.evaluator_did,
          status: input.status,
        },
        dependencies: [state.snapshot_cid],
      })
    )
  );
  
  // 3. Batch verify
  const verification = await verify_evidence({
    evidence_type: "schema",
    evidence_cid: proposals.map(p => p.proposal_cid),
    verifier: {
      service_did: skillConfig.verifiers.schema,
      method: "validateBatch",
    },
  });
  
  // 4. Batch settle (single transaction)
  const result = await settle({
    proposal_cid: proposals.map(p => p.proposal_cid),
    verification_cid: verification.attestation_cid,
    settlement_type: "batch",
    capability_did: `did:ixo:entity:${projectId}${skillConfig.capabilities.settle_claim}`,
    chain_config: skillConfig.chain,
  });
  
  return {
    tx_hash: result.tx_hash,
    settled_count: result.settled_count,
    evidence_cid: result.evidence_cid,
  };
}
```

## Real-time Monitoring Workflow

```typescript
import { observe, read_state, propose_action } from "qi-capability-api";
import { skillConfig } from "./config";

export async function monitorAndAutoEvaluate(
  projectId: string,
  autoApproveThreshold: number
) {
  // 1. Subscribe to claim events
  const subscription = await observe({
    resource: `did:ixo:entity:${projectId}`,
    source: "matrix",
    filter: {
      event_types: ["ixo.claim.created"],
    },
  });
  
  // 2. Process events
  for await (const event of subscription.stream) {
    if (event.event_type === "create") {
      const claimData = event.delta;
      
      // Auto-evaluate if meets threshold
      if (claimData.amount <= autoApproveThreshold) {
        // Read full claim state
        const state = await read_state({
          resource: `did:ixo:entity:${projectId}`,
          source: "chain",
          query: { path: `claims/${claimData.id}` },
        });
        
        // Propose auto-approval
        await propose_action({
          action_type: "eval",
          resource: `did:ixo:entity:${projectId}`,
          payload: {
            claim_id: claimData.id,
            status: "approved",
            reason: "Auto-approved: below threshold",
          },
          dependencies: [state.snapshot_cid],
        });
      }
    }
  }
}
```

## Dispute Workflow

```typescript
import { read_state, propose_action, settle } from "qi-capability-api";
import { skillConfig } from "./config";

export interface DisputeInput {
  claim_id: string;
  disputant_did: string;
  reason: string;
  evidence_cids: string[];
}

export async function disputeClaim(
  projectId: string,
  input: DisputeInput
) {
  // 1. Read claim and evaluation
  const state = await read_state({
    resource: `did:ixo:entity:${projectId}`,
    source: "chain",
    query: { path: `claims/${input.claim_id}` },
  });
  
  // 2. Propose dispute
  const proposal = await propose_action({
    action_type: "dispute",
    resource: `did:ixo:entity:${projectId}`,
    payload: {
      claim_id: input.claim_id,
      disputant: input.disputant_did,
      reason: input.reason,
      evidence: input.evidence_cids,
    },
    dependencies: [state.snapshot_cid],
  });
  
  // 3. Settle dispute (uses separate capability)
  const result = await settle({
    proposal_cid: proposal.proposal_cid,
    settlement_type: "dispute",
    capability_did: `did:ixo:entity:${projectId}${skillConfig.capabilities.settle_dispute}`,
    chain_config: skillConfig.chain,
  });
  
  return {
    tx_hash: result.tx_hash,
    evidence_cid: result.evidence_cid,
  };
}
```

## Query-Only Workflow

```typescript
import { read_state } from "qi-capability-api";
import { skillConfig } from "./config";

export interface QueryClaimsInput {
  status?: "pending" | "approved" | "rejected" | "disputed";
  claimant?: string;
  limit?: number;
}

export async function queryClaims(
  projectId: string,
  input: QueryClaimsInput
) {
  const state = await read_state({
    resource: `did:ixo:entity:${projectId}`,
    source: "chain",
    query: {
      path: "claims",
      filter: {
        ...(input.status && { status: input.status }),
        ...(input.claimant && { claimant: input.claimant }),
      },
      limit: input.limit || 100,
    },
  });
  
  return {
    claims: state.data,
    snapshot_cid: state.snapshot_cid,
    timestamp: state.timestamp,
  };
}
```
