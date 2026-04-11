import {
  ToolResult,
  QiContext,
  QiError,
  ObserveArgs,
  ObserveArgsSchema,
  ObserveResult,
  ReadStateArgs,
  ReadStateArgsSchema,
  ReadStateResult,
  ProposeActionArgs,
  ProposeActionArgsSchema,
  ProposeActionResult,
  CapabilityRef,
  VerifyEvidenceArgs,
  VerifyEvidenceArgsSchema,
  VerifyEvidenceResult,
  SettleArgs,
  SettleArgsSchema,
  SettleResult,
  StateEvent,
} from "./types";

// ============================================================================
// Helper Functions
// ============================================================================

function extractEntityId(did: string): string {
  const match = did.match(/did:ixo:entity:([a-zA-Z0-9]+)/);
  return match ? match[1] : did;
}

function parseCapabilityDid(capDid: string): { entityId: string; capIndex: string } {
  const match = capDid.match(/did:ixo:entity:([a-zA-Z0-9]+)#cap-(\d{2})/);
  if (!match) throw new QiError("INVALID_CAPABILITY", `Invalid capability DID: ${capDid}`);
  return { entityId: match[1], capIndex: match[2] };
}

function isBatch(payload: any): payload is any[] {
  return Array.isArray(payload);
}

// ============================================================================
// 1. OBSERVE - Real-time state subscription
// ============================================================================

export async function observe(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = ObserveArgsSchema.parse(args);
  
  context.log.info(`Starting observation on ${validated.resource} via ${validated.source}`);
  
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  let stream: AsyncIterable<StateEvent>;
  
  switch (validated.source) {
    case "matrix": {
      const roomId = extractEntityId(validated.resource);
      stream = context.adapters.matrix.subscribe(roomId, validated.filter);
      break;
    }
    case "crdt": {
      const docId = extractEntityId(validated.resource);
      stream = context.adapters.crdt.subscribe(docId);
      break;
    }
    case "chain": {
      // Chain subscriptions via websocket
      stream = subscribeToChainEvents(context, validated.resource, validated.filter);
      break;
    }
    case "external": {
      if (!validated.external_config) {
        throw new QiError("ADAPTER_ERROR", "external_config required for external source");
      }
      stream = context.adapters.external.subscribe(
        validated.external_config.endpoint,
        { headers: validated.external_config.auth_header ? { Authorization: validated.external_config.auth_header } : {} }
      );
      break;
    }
  }
  
  // Store subscription metadata
  const subscriptionMeta = {
    subscription_id: subscriptionId,
    resource: validated.resource,
    source: validated.source,
    filter: validated.filter,
    created_at: new Date().toISOString(),
  };
  
  const metaCid = await context.ipfs.save(JSON.stringify(subscriptionMeta));
  
  const result: ObserveResult = {
    subscription_id: subscriptionId,
    resource: validated.resource,
    source: validated.source,
  };
  
  return {
    data: { ...result, stream_handle: subscriptionId },
    evidence_cid: metaCid,
    summary: `Subscribed to ${validated.resource} via ${validated.source}`,
  };
}

async function* subscribeToChainEvents(
  context: QiContext,
  resource: string,
  filter?: any
): AsyncIterable<StateEvent> {
  // Chain event subscription implementation
  // This would connect to Tendermint websocket
  const entityId = extractEntityId(resource);
  
  // Placeholder - actual implementation would use chain adapter
  while (true) {
    const state = await context.adapters.chain.query(`/ixo/entity/${entityId}/events`);
    if (state.events?.length) {
      for (const event of state.events) {
        yield {
          event_type: event.type,
          resource,
          delta: event.data,
          timestamp: new Date().toISOString(),
          source_cid: event.cid,
        };
      }
    }
    // Poll interval
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// ============================================================================
// 2. READ_STATE - Point-in-time snapshot
// ============================================================================

export async function read_state(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = ReadStateArgsSchema.parse(args);
  
  context.log.info(`Reading state from ${validated.resource} via ${validated.source}`);
  
  let data: any;
  let blockHeight: number | undefined;
  
  switch (validated.source) {
    case "matrix": {
      const roomId = extractEntityId(validated.resource);
      data = await context.adapters.matrix.getState(roomId, validated.query?.path);
      break;
    }
    case "crdt": {
      const docId = extractEntityId(validated.resource);
      data = await context.adapters.crdt.getDoc(docId);
      break;
    }
    case "chain": {
      const entityId = extractEntityId(validated.resource);
      const path = validated.query?.path || "";
      
      if (validated.at_block) {
        data = await context.adapters.chain.queryAtHeight(
          `/ixo/entity/${entityId}/${path}`,
          validated.at_block
        );
        blockHeight = validated.at_block;
      } else {
        const result = await context.adapters.chain.query(`/ixo/entity/${entityId}/${path}`);
        data = result.data;
        blockHeight = result.block_height;
      }
      break;
    }
    case "external": {
      if (!validated.external_config) {
        throw new QiError("ADAPTER_ERROR", "external_config required for external source");
      }
      data = await context.adapters.external.fetch(validated.external_config.endpoint, {
        method: validated.external_config.method,
        headers: validated.external_config.auth_header 
          ? { Authorization: validated.external_config.auth_header } 
          : {},
      });
      break;
    }
  }
  
  // Apply query filters/projections
  if (validated.query) {
    if (validated.query.filter && typeof data === "object") {
      data = applyFilter(data, validated.query.filter);
    }
    if (validated.query.projection && typeof data === "object") {
      data = applyProjection(data, validated.query.projection);
    }
    if (validated.query.limit && Array.isArray(data)) {
      const offset = validated.query.offset || 0;
      data = data.slice(offset, offset + validated.query.limit);
    }
  }
  
  // Store snapshot
  const snapshot = {
    resource: validated.resource,
    source: validated.source,
    data,
    block_height: blockHeight,
    timestamp: new Date().toISOString(),
  };
  
  const snapshotCid = await context.ipfs.save(JSON.stringify(snapshot));
  
  const result: ReadStateResult = {
    data,
    snapshot_cid: snapshotCid,
    block_height: blockHeight,
    timestamp: snapshot.timestamp,
  };
  
  return {
    data: result,
    summary: `Read state from ${validated.resource}${blockHeight ? ` at block ${blockHeight}` : ""}`,
  };
}

function applyFilter(data: any, filter: Record<string, any>): any {
  if (Array.isArray(data)) {
    return data.filter(item => {
      return Object.entries(filter).every(([key, value]) => item[key] === value);
    });
  }
  return data;
}

function applyProjection(data: any, projection: string[]): any {
  if (Array.isArray(data)) {
    return data.map(item => {
      const projected: Record<string, any> = {};
      projection.forEach(key => {
        if (key in item) projected[key] = item[key];
      });
      return projected;
    });
  }
  if (typeof data === "object") {
    const projected: Record<string, any> = {};
    projection.forEach(key => {
      if (key in data) projected[key] = data[key];
    });
    return projected;
  }
  return data;
}

// ============================================================================
// 3. PROPOSE_ACTION - Draft intent
// ============================================================================

export async function propose_action(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = ProposeActionArgsSchema.parse(args);
  
  context.log.info(`Proposing ${validated.action_type} on ${validated.resource}`);
  
  // Validate auth context if provided
  if (validated.auth_context) {
    const authValid = await validateAuthContext(validated.auth_context, context);
    if (!authValid) {
      throw new QiError(
        "AUTH_FAILED",
        `Authorization failed for mode: ${validated.auth_context.mode}`
      );
    }
  }
  
  // Determine if batch
  const isBatchProposal = validated.action_type === "batch" || isBatch(validated.payload);
  const payloads = isBatchProposal ? validated.payload : [validated.payload];
  
  // Build proposal document
  const proposal = {
    action_type: validated.action_type,
    resource: validated.resource,
    payload: validated.payload,
    dependencies: validated.dependencies || [],
    auth_context: validated.auth_context,
    created_at: new Date().toISOString(),
    expires_at: validated.ttl_seconds 
      ? new Date(Date.now() + validated.ttl_seconds * 1000).toISOString()
      : undefined,
  };
  
  // Store proposal to IPFS
  const proposalCid = await context.ipfs.save(JSON.stringify(proposal));
  
  // Determine required capabilities for settlement
  const requiredCapabilities = determineRequiredCapabilities(
    validated.action_type,
    validated.resource
  );
  
  // Check if review is required (configurable per flow)
  const reviewRequired = requiresReview(validated.action_type);
  
  const result: ProposeActionResult = {
    proposal_cid: proposalCid,
    draft: proposal,
    batch_size: isBatchProposal ? payloads.length : undefined,
    required_capabilities: requiredCapabilities,
    review_required: reviewRequired,
    expiry: proposal.expires_at,
  };
  
  return {
    data: result,
    evidence_cid: proposalCid,
    summary: `Proposed ${validated.action_type}${isBatchProposal ? ` (batch of ${payloads.length})` : ""} on ${validated.resource}`,
  };
}

async function validateAuthContext(
  authContext: ProposeActionArgs["auth_context"],
  context: QiContext
): Promise<boolean> {
  if (!authContext) return true;
  
  switch (authContext.mode) {
    case "none":
      return true;
      
    case "ucan":
      if (!authContext.ucan_cid) return false;
      // Validate UCAN token
      const ucanData = await context.ipfs.get(authContext.ucan_cid);
      // TODO: Actual UCAN validation
      return ucanData !== null;
      
    case "assignment":
      if (!authContext.assignment_proof) return false;
      // Validate assignment proof
      const proofData = await context.ipfs.get(authContext.assignment_proof);
      // TODO: Verify assignment chain
      return proofData !== null;
      
    default:
      return false;
  }
}

function determineRequiredCapabilities(
  actionType: string,
  resource: string
): CapabilityRef[] {
  const entityId = extractEntityId(resource);
  
  // Map action types to required capabilities
  const capabilityMap: Record<string, { ability: string; capIndex: string }> = {
    claim: { ability: "settle", capIndex: "04" },
    eval: { ability: "settle", capIndex: "04" },
    dispute: { ability: "settle", capIndex: "05" },
    transfer: { ability: "settle", capIndex: "04" },
    transaction: { ability: "settle", capIndex: "04" },
    message: { ability: "settle", capIndex: "03" },
    batch: { ability: "settle", capIndex: "04" },
  };
  
  const mapping = capabilityMap[actionType] || { ability: "settle", capIndex: "04" };
  
  return [{
    capability_did: `did:ixo:entity:${entityId}#cap-${mapping.capIndex}`,
    ability: mapping.ability,
    scope: `${actionType}:*`,
  }];
}

function requiresReview(actionType: string): boolean {
  // High-value actions require review
  return ["dispute", "transfer"].includes(actionType);
}

// ============================================================================
// 4. VERIFY_EVIDENCE - External validation
// ============================================================================

export async function verify_evidence(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = VerifyEvidenceArgsSchema.parse(args);
  
  context.log.info(`Verifying ${validated.evidence_type} via ${validated.verifier.service_did}`);
  
  // Prepare verification request
  const evidenceCids = Array.isArray(validated.evidence_cid) 
    ? validated.evidence_cid 
    : [validated.evidence_cid];
  
  // Fetch evidence data
  const evidenceData = await Promise.all(
    evidenceCids.map(async cid => {
      const data = await context.ipfs.get(cid);
      return JSON.parse(data.toString());
    })
  );
  
  // Call external verifier service
  const verificationRequest = {
    evidence_type: validated.evidence_type,
    evidence_cids: evidenceCids,
    evidence_data: evidenceData,
    expected: validated.expected,
    custom_params: validated.custom_params,
  };
  
  let verificationResponse: any;
  try {
    verificationResponse = await context.verifiers.call(
      validated.verifier.service_did,
      validated.verifier.method,
      verificationRequest
    );
  } catch (error) {
    throw new QiError(
      "VERIFY_FAILED",
      `Verifier service call failed: ${error}`,
      undefined,
      evidenceCids[0]
    );
  }
  
  // Build attestation
  const attestation = {
    verifier_did: validated.verifier.service_did,
    evidence_type: validated.evidence_type,
    evidence_cids: evidenceCids,
    valid: verificationResponse.valid,
    checks_passed: verificationResponse.checks_passed || [],
    checks_failed: verificationResponse.checks_failed || [],
    expected: validated.expected,
    verification_timestamp: new Date().toISOString(),
    verifier_signature: verificationResponse.signature,
  };
  
  // Store attestation
  const attestationCid = await context.ipfs.save(JSON.stringify(attestation));
  
  const result: VerifyEvidenceResult = {
    valid: verificationResponse.valid,
    checks_passed: attestation.checks_passed,
    checks_failed: attestation.checks_failed.length > 0 ? attestation.checks_failed : undefined,
    attestation_cid: attestationCid,
    verifier_did: validated.verifier.service_did,
    verification_timestamp: attestation.verification_timestamp,
  };
  
  return {
    data: result,
    evidence_cid: attestationCid,
    summary: `Verification ${result.valid ? "passed" : "failed"}: ${result.checks_passed.length} passed, ${result.checks_failed?.length || 0} failed`,
  };
}

// ============================================================================
// 5. SETTLE - On-chain commit
// ============================================================================

export async function settle(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = SettleArgsSchema.parse(args);
  
  context.log.info(`Settling ${validated.settlement_type} on ${validated.chain_config.target}`);
  
  // Validate UCAN capability
  const { entityId, capIndex } = parseCapabilityDid(validated.capability_did);
  const hasCapability = await context.ucan.validate(validated.capability_did, "settle");
  
  if (!hasCapability) {
    throw new QiError(
      "AUTH_FAILED",
      `Missing settle capability: ${validated.capability_did}`,
      validated.capability_did
    );
  }
  
  // Fetch proposals
  const proposalCids = Array.isArray(validated.proposal_cid)
    ? validated.proposal_cid
    : [validated.proposal_cid];
  
  const proposals = await Promise.all(
    proposalCids.map(async cid => {
      const data = await context.ipfs.get(cid);
      return { cid, proposal: JSON.parse(data.toString()) };
    })
  );
  
  // Check proposal expiry
  for (const { cid, proposal } of proposals) {
    if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
      throw new QiError("EXPIRED_PROPOSAL", `Proposal expired: ${cid}`, undefined, cid);
    }
  }
  
  // Build chain messages
  const msgs = proposals.map(({ proposal }) => buildChainMessage(
    validated.settlement_type,
    proposal,
    validated.capability_did
  ));
  
  // Broadcast to chain
  const txResult = await context.adapters.chain.broadcast(
    msgs,
    validated.chain_config.memo
  );
  
  // Build evidence
  const evidence = {
    settlement_type: validated.settlement_type,
    proposal_cids: proposalCids,
    verification_cid: validated.verification_cid,
    capability_did: validated.capability_did,
    tx_hash: txResult.tx_hash,
    block_height: txResult.block_height,
    gas_used: txResult.gas_used,
    settled_at: new Date().toISOString(),
  };
  
  const evidenceCid = await context.ipfs.save(JSON.stringify(evidence));
  
  const result: SettleResult = {
    tx_hash: txResult.tx_hash,
    block_height: txResult.block_height,
    evidence_cid: evidenceCid,
    settled_count: proposalCids.length > 1 ? proposalCids.length : undefined,
    settled_cids: proposalCids.length > 1 ? proposalCids : undefined,
    finality: "pending",
    gas_used: txResult.gas_used,
  };
  
  return {
    data: result,
    evidence_cid: evidenceCid,
    summary: `Settled ${proposalCids.length} proposal(s): tx ${txResult.tx_hash.slice(0, 16)}...`,
  };
}

function buildChainMessage(
  settlementType: string,
  proposal: any,
  capabilityDid: string
): any {
  const { entityId } = parseCapabilityDid(capabilityDid);
  
  // Build IXO-specific message based on settlement type
  switch (settlementType) {
    case "claim":
      return {
        typeUrl: "/ixo.claims.v1beta1.MsgSubmitClaim",
        value: {
          claimId: proposal.payload.claim_id || `claim_${Date.now()}`,
          collectionId: entityId,
          agentDid: proposal.auth_context?.assignee_did || proposal.payload.claimant,
          agentAddress: proposal.payload.agent_address,
          claimData: proposal.payload,
        },
      };
      
    case "eval":
      return {
        typeUrl: "/ixo.claims.v1beta1.MsgEvaluateClaim",
        value: {
          claimId: proposal.payload.claim_id,
          collectionId: entityId,
          agentDid: proposal.payload.evaluator,
          status: proposal.payload.status,
          reason: proposal.payload.reason,
        },
      };
      
    case "dispute":
      return {
        typeUrl: "/ixo.claims.v1beta1.MsgDisputeClaim",
        value: {
          claimId: proposal.payload.claim_id,
          collectionId: entityId,
          agentDid: proposal.payload.disputant,
          reason: proposal.payload.reason,
          evidence: proposal.payload.evidence_cids,
        },
      };
      
    case "transfer":
      return {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: proposal.payload.from,
          toAddress: proposal.payload.to,
          amount: proposal.payload.amount,
        },
      };
      
    case "batch":
      // Batch messages are handled by the caller
      return {
        typeUrl: "/ixo.claims.v1beta1.MsgSubmitClaim",
        value: proposal.payload,
      };
      
    default:
      throw new QiError("SETTLE_FAILED", `Unknown settlement type: ${settlementType}`);
  }
}
