import { z } from "zod";

// ============================================================================
// Core Types
// ============================================================================

export const DIDSchema = z.string().regex(/^did:[a-z]+:[a-zA-Z0-9.:%-]+(?:#[a-zA-Z0-9-]+)?$/);
export type DID = z.infer<typeof DIDSchema>;

export const CIDSchema = z.string().regex(/^(Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+)$/);
export type CID = z.infer<typeof CIDSchema>;

export const CapabilityFragmentSchema = z.string().regex(/^#cap-\d{2}$/);
export type CapabilityFragment = z.infer<typeof CapabilityFragmentSchema>;

// ============================================================================
// Qi Flow Engine Standard Types
// ============================================================================

export interface ToolResult {
  data: Record<string, any>;
  evidence_cid?: string;
  summary: string;
}

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
  };
}

// ============================================================================
// Primitive Types (from qi-capability-api)
// ============================================================================

export const PrimitiveTypeSchema = z.enum([
  "observe",
  "read_state", 
  "propose_action",
  "verify_evidence",
  "settle"
]);
export type PrimitiveType = z.infer<typeof PrimitiveTypeSchema>;

export const AdapterTypeSchema = z.enum(["matrix", "crdt", "chain", "external"]);
export type AdapterType = z.infer<typeof AdapterTypeSchema>;

export const AuthModeSchema = z.enum(["none", "ucan", "assignment"]);
export type AuthMode = z.infer<typeof AuthModeSchema>;

export const ActionTypeSchema = z.enum([
  "claim", "transaction", "message", "eval", "dispute", "batch"
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const SettlementTypeSchema = z.enum([
  "claim", "eval", "dispute", "transfer", "batch"
]);
export type SettlementType = z.infer<typeof SettlementTypeSchema>;

export const EvidenceTypeSchema = z.enum([
  "signature", "receipt", "schema", "merkle", "ucan", "custom"
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

// ============================================================================
// Workflow Step Definition
// ============================================================================

export const WorkflowStepSchema = z.object({
  primitive: PrimitiveTypeSchema,
  
  // Primitive-specific config
  config: z.object({
    // For read_state / observe
    source: AdapterTypeSchema.optional(),
    query_path: z.string().optional(),
    
    // For propose_action
    action_type: ActionTypeSchema.optional(),
    auth_mode: AuthModeSchema.optional(),
    
    // For verify_evidence
    evidence_type: EvidenceTypeSchema.optional(),
    verifier_method: z.string().optional(),
    
    // For settle
    settlement_type: SettlementTypeSchema.optional(),
    capability_fragment: CapabilityFragmentSchema.optional(),
  }).optional(),
  
  // Input mapping from previous steps
  input_mapping: z.record(z.string()).optional(),
  
  // Output key for this step
  output_key: z.string().optional(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// ============================================================================
// Workflow Definition
// ============================================================================

export const WorkflowDefinitionSchema = z.object({
  name: z.string().regex(/^[a-z_]+$/),
  description: z.string(),
  steps: z.array(WorkflowStepSchema),
  
  // Auth requirements for the entire workflow
  auth: z.object({
    mode: AuthModeSchema,
    capability_fragment: CapabilityFragmentSchema.optional(),
  }).optional(),
  
  // Input schema for the workflow
  input_schema: z.record(z.object({
    type: z.string(),
    description: z.string(),
    required: z.boolean().default(true),
  })),
  
  // Output schema
  output_schema: z.record(z.object({
    type: z.string(),
    description: z.string(),
  })),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// ============================================================================
// Capability Mapping
// ============================================================================

export const CapabilityMappingSchema = z.object({
  fragment: CapabilityFragmentSchema,
  ability: z.enum(["observe", "read", "propose", "settle", "admin"]),
  scope: z.string().optional(),
  description: z.string().optional(),
});

export type CapabilityMapping = z.infer<typeof CapabilityMappingSchema>;

// ============================================================================
// Verifier Configuration
// ============================================================================

export const VerifierConfigSchema = z.object({
  name: z.string(),
  service_did: DIDSchema,
  methods: z.array(z.string()),
  description: z.string().optional(),
});

export type VerifierConfig = z.infer<typeof VerifierConfigSchema>;

// ============================================================================
// Skill Configuration (Generated Output)
// ============================================================================

export const SkillConfigSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  domain: z.string(),
  description: z.string(),
  resource_pattern: z.string(),
  
  capabilities: z.record(CapabilityFragmentSchema),
  
  adapters: z.object({
    primary: AdapterTypeSchema,
    realtime: AdapterTypeSchema.optional(),
    fallback: AdapterTypeSchema.optional(),
  }),
  
  verifiers: z.record(DIDSchema).optional(),
  
  workflows: z.array(WorkflowDefinitionSchema),
});

export type SkillConfig = z.infer<typeof SkillConfigSchema>;

// ============================================================================
// analyze_skill_intent Arguments
// ============================================================================

export const AnalyzeSkillIntentArgsSchema = z.object({
  user_description: z.string()
    .min(20)
    .describe("Natural language description of the skill"),
  
  domain_hints: z.array(z.string()).optional()
    .describe("Optional domain hints (e.g., 'claims', 'credentials', 'finance')"),
  
  example_workflows: z.array(z.string()).optional()
    .describe("Example workflow descriptions"),
});

export type AnalyzeSkillIntentArgs = z.infer<typeof AnalyzeSkillIntentArgsSchema>;

// ============================================================================
// Skill Intent (Analysis Result)
// ============================================================================

export const SkillIntentSchema = z.object({
  skill_name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  skill_description: z.string(),
  domain: z.string(),
  
  // Primitives this skill needs
  primitives_needed: z.array(PrimitiveTypeSchema),
  
  // Derived workflows
  workflows: z.array(z.object({
    name: z.string(),
    description: z.string(),
    intent_pattern: z.string(),
    steps: z.array(PrimitiveTypeSchema),
  })),
  
  // Required capabilities
  capabilities: z.array(CapabilityMappingSchema),
  
  // Suggested verifiers
  verifiers: z.array(VerifierConfigSchema),
  
  // Complexity assessment
  complexity: z.enum(["simple", "moderate", "complex"]),
});

export type SkillIntent = z.infer<typeof SkillIntentSchema>;

// ============================================================================
// scaffold_skill Arguments
// ============================================================================

export const ScaffoldSkillArgsSchema = z.object({
  intent: SkillIntentSchema,
  output_path: z.string().optional(),
  include_tests: z.boolean().default(false),
});

export type ScaffoldSkillArgs = z.infer<typeof ScaffoldSkillArgsSchema>;

// ============================================================================
// Scaffold Result
// ============================================================================

export const SkillScaffoldSchema = z.object({
  path: z.string(),
  files: z.record(z.string()),
  structure: z.array(z.string()),
});

export type SkillScaffold = z.infer<typeof SkillScaffoldSchema>;

// ============================================================================
// validate_skill Arguments
// ============================================================================

export const ValidateSkillArgsSchema = z.object({
  skill_files: z.record(z.string()),
  strict: z.boolean().default(true),
});

export type ValidateSkillArgs = z.infer<typeof ValidateSkillArgsSchema>;

// ============================================================================
// Validation Result
// ============================================================================

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    file: z.string(),
    message: z.string(),
    severity: z.enum(["error", "warning"]),
  })),
  warnings: z.array(z.object({
    file: z.string(),
    message: z.string(),
  })),
  checks_passed: z.array(z.string()),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ============================================================================
// build_complete_skill Arguments
// ============================================================================

export const BuildCompleteSkillArgsSchema = z.object({
  user_description: z.string().min(20),
  domain_hints: z.array(z.string()).optional(),
  example_workflows: z.array(z.string()).optional(),
  strict_validation: z.boolean().default(true),
});

export type BuildCompleteSkillArgs = z.infer<typeof BuildCompleteSkillArgsSchema>;

// ============================================================================
// Build Result
// ============================================================================

export const BuildResultSchema = z.object({
  intent: SkillIntentSchema,
  config: SkillConfigSchema,
  files: z.record(z.string()),
  validation: ValidationResultSchema,
  build_stages: z.array(z.object({
    stage: z.string(),
    status: z.enum(["success", "failed", "skipped"]),
    duration_ms: z.number(),
  })),
});

export type BuildResult = z.infer<typeof BuildResultSchema>;
