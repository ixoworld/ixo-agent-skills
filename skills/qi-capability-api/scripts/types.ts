import { z } from "zod";

// ============================================================================
// Core Types
// ============================================================================

export const DIDSchema = z.string().regex(/^did:[a-z]+:[a-zA-Z0-9.:%-]+(?:#[a-zA-Z0-9-]+)?$/);
export type DID = z.infer<typeof DIDSchema>;

export const CIDSchema = z.string().regex(/^(Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+)$/);
export type CID = z.infer<typeof CIDSchema>;

export const CapabilityDIDSchema = z.string().regex(/^did:ixo:entity:[a-zA-Z0-9]+#cap-\d{2}$/);
export type CapabilityDID = z.infer<typeof CapabilityDIDSchema>;

// ============================================================================
// Tool Result (Qi Flow Engine Standard)
// ============================================================================

export interface ToolResult {
  data: Record<string, any>;
  evidence_cid?: string;
  summary: string;
}

// ============================================================================
// Qi Context (Injected by Flow Engine)
// ============================================================================

export interface QiContext {
  ipfs: {
    save: (data: string | Buffer) => Promise<string>;
    get: (cid: string) => Promise<Buffer>;
  };
  log: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  ucan: {
    capabilities: string[];
    issuer: string;
    audience: string;
    validate: (capabilityDid: string, ability: string) => Promise<boolean>;
  };
  adapters: {
    matrix: MatrixAdapter;
    crdt: CRDTAdapter;
    chain: ChainAdapter;
    external: ExternalAdapter;
  };
  verifiers: {
    call: (serviceDid: string, method: string, params: any) => Promise<any>;
  };
}

// ============================================================================
// Adapter Interfaces
// ============================================================================

export interface MatrixAdapter {
  subscribe(roomId: string, filter?: EventFilter): AsyncIterable<StateEvent>;
  getState(roomId: string, stateKey?: string): Promise<any>;
  sendEvent(roomId: string, eventType: string, content: any): Promise<string>;
}

export interface CRDTAdapter {
  subscribe(docId: string): AsyncIterable<StateEvent>;
  getDoc(docId: string): Promise<any>;
  applyChange(docId: string, change: any): Promise<string>;
}

export interface ChainAdapter {
  query(path: string, params?: any): Promise<any>;
  queryAtHeight(path: string, height: number, params?: any): Promise<any>;
  broadcast(msgs: any[], memo?: string): Promise<TxResult>;
}

export interface ExternalAdapter {
  fetch(endpoint: string, options?: RequestInit): Promise<any>;
  subscribe(endpoint: string, options?: any): AsyncIterable<any>;
}

export interface TxResult {
  tx_hash: string;
  block_height: number;
  gas_used: number;
  logs: any[];
}

// ============================================================================
// State Event (Common across adapters)
// ============================================================================

export const StateEventSchema = z.object({
  event_type: z.enum(["create", "update", "delete", "signal"]),
  resource: DIDSchema,
  delta: z.any(),
  timestamp: z.string().datetime(),
  source_cid: CIDSchema.optional(),
});

export type StateEvent = z.infer<typeof StateEventSchema>;

export const EventFilterSchema = z.object({
  event_types: z.array(z.string()).optional(),
  resource_pattern: z.string().optional(),
  since: z.string().datetime().optional(),
});

export type EventFilter = z.infer<typeof EventFilterSchema>;

// ============================================================================
// 1. OBSERVE
// ============================================================================

export const ObserveArgsSchema = z.object({
  resource: DIDSchema.describe("Resource DID to observe"),
  source: z.enum(["matrix", "crdt", "chain", "external"]),
  filter: EventFilterSchema.optional(),
  
  // External source config
  external_config: z.object({
    endpoint: z.string().url(),
    auth_header: z.string().optional(),
  }).optional(),
});

export type ObserveArgs = z.infer<typeof ObserveArgsSchema>;

export const ObserveResultSchema = z.object({
  subscription_id: z.string(),
  resource: DIDSchema,
  source: z.string(),
});

export type ObserveResult = z.infer<typeof ObserveResultSchema>;

// ============================================================================
// 2. READ_STATE
// ============================================================================

export const StateQuerySchema = z.object({
  path: z.string().optional(),
  filter: z.record(z.any()).optional(),
  projection: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type StateQuery = z.infer<typeof StateQuerySchema>;

export const ReadStateArgsSchema = z.object({
  resource: DIDSchema.describe("Resource DID to read"),
  source: z.enum(["matrix", "crdt", "chain", "external"]),
  query: StateQuerySchema.optional(),
  at_block: z.number().int().positive().optional().describe("Historical block height"),
  
  // External source config
  external_config: z.object({
    endpoint: z.string().url(),
    method: z.enum(["GET", "POST"]).default("GET"),
    auth_header: z.string().optional(),
  }).optional(),
});

export type ReadStateArgs = z.infer<typeof ReadStateArgsSchema>;

export const ReadStateResultSchema = z.object({
  data: z.any(),
  snapshot_cid: CIDSchema,
  block_height: z.number().int().optional(),
  timestamp: z.string().datetime(),
});

export type ReadStateResult = z.infer<typeof ReadStateResultSchema>;

// ============================================================================
// 3. PROPOSE_ACTION
// ============================================================================

export const AuthModeSchema = z.enum(["none", "ucan", "assignment"]);
export type AuthMode = z.infer<typeof AuthModeSchema>;

export const AuthContextSchema = z.object({
  mode: AuthModeSchema,
  ucan_cid: CIDSchema.optional().describe("UCAN token CID if mode=ucan"),
  assignment_proof: CIDSchema.optional().describe("Assignment proof if mode=assignment"),
  assignee_did: DIDSchema.optional(),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

export const ProposeActionArgsSchema = z.object({
  action_type: z.enum(["claim", "transaction", "message", "eval", "dispute", "batch"]),
  resource: DIDSchema.describe("Target resource DID"),
  payload: z.any().describe("Single payload or array for batch"),
  dependencies: z.array(CIDSchema).optional().describe("Prior state CIDs this depends on"),
  
  // Auth context (injected by flow engine based on block config)
  auth_context: AuthContextSchema.optional(),
  
  // Expiry
  ttl_seconds: z.number().int().positive().optional(),
});

export type ProposeActionArgs = z.infer<typeof ProposeActionArgsSchema>;

export const CapabilityRefSchema = z.object({
  capability_did: CapabilityDIDSchema,
  ability: z.string(),
  scope: z.string().optional(),
});

export type CapabilityRef = z.infer<typeof CapabilityRefSchema>;

export const ProposeActionResultSchema = z.object({
  proposal_cid: CIDSchema,
  draft: z.any(),
  batch_size: z.number().int().optional(),
  required_capabilities: z.array(CapabilityRefSchema),
  review_required: z.boolean(),
  expiry: z.string().datetime().optional(),
});

export type ProposeActionResult = z.infer<typeof ProposeActionResultSchema>;

// ============================================================================
// 4. VERIFY_EVIDENCE
// ============================================================================

export const VerifierConfigSchema = z.object({
  service_did: DIDSchema.describe("Verifier service DID"),
  endpoint: z.string().url().optional().describe("Override service endpoint"),
  method: z.string().describe("Verification method to call"),
});

export type VerifierConfig = z.infer<typeof VerifierConfigSchema>;

export const VerifyEvidenceArgsSchema = z.object({
  evidence_type: z.enum(["signature", "receipt", "schema", "merkle", "ucan", "custom"]),
  evidence_cid: z.union([CIDSchema, z.array(CIDSchema)]).describe("Evidence CID(s) to verify"),
  
  verifier: VerifierConfigSchema,
  
  expected: z.object({
    issuer: DIDSchema.optional(),
    schema: z.string().optional(),
    capability_did: CapabilityDIDSchema.optional(),
    merkle_root: CIDSchema.optional(),
  }).optional(),
  
  // Custom params for custom verifier methods
  custom_params: z.record(z.any()).optional(),
});

export type VerifyEvidenceArgs = z.infer<typeof VerifyEvidenceArgsSchema>;

export const VerifyEvidenceResultSchema = z.object({
  valid: z.boolean(),
  checks_passed: z.array(z.string()),
  checks_failed: z.array(z.string()).optional(),
  attestation_cid: CIDSchema,
  verifier_did: DIDSchema,
  verification_timestamp: z.string().datetime(),
});

export type VerifyEvidenceResult = z.infer<typeof VerifyEvidenceResultSchema>;

// ============================================================================
// 5. SETTLE
// ============================================================================

export const ChainConfigSchema = z.object({
  target: z.enum(["ixo", "cosmos-hub", "osmosis", "neutron"]),
  gas_limit: z.number().int().positive().optional(),
  gas_price: z.string().optional(),
  memo: z.string().max(256).optional(),
});

export type ChainConfig = z.infer<typeof ChainConfigSchema>;

export const SettleArgsSchema = z.object({
  proposal_cid: z.union([CIDSchema, z.array(CIDSchema)]).describe("Proposal CID(s) to settle"),
  verification_cid: CIDSchema.optional().describe("Verification attestation CID"),
  
  settlement_type: z.enum(["claim", "eval", "dispute", "transfer", "batch"]),
  
  capability_did: CapabilityDIDSchema.describe("Capability DID with settle ability"),
  
  chain_config: ChainConfigSchema,
});

export type SettleArgs = z.infer<typeof SettleArgsSchema>;

export const SettleResultSchema = z.object({
  tx_hash: z.string(),
  block_height: z.number().int(),
  evidence_cid: CIDSchema,
  
  // Batch results
  settled_count: z.number().int().optional(),
  settled_cids: z.array(CIDSchema).optional(),
  
  finality: z.enum(["pending", "confirmed", "finalized"]),
  
  gas_used: z.number().int(),
});

export type SettleResult = z.infer<typeof SettleResultSchema>;

// ============================================================================
// Error Types
// ============================================================================

export const QiErrorCodeSchema = z.enum([
  "AUTH_FAILED",
  "INVALID_STATE", 
  "VERIFY_FAILED",
  "SETTLE_FAILED",
  "ADAPTER_ERROR",
  "INVALID_CAPABILITY",
  "EXPIRED_PROPOSAL",
]);

export type QiErrorCode = z.infer<typeof QiErrorCodeSchema>;

export class QiError extends Error {
  constructor(
    public code: QiErrorCode,
    message: string,
    public capability_did?: string,
    public evidence_cid?: string,
  ) {
    super(message);
    this.name = "QiError";
  }
}
