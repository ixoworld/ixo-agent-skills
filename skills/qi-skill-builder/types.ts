import { z } from "zod";

// ============================================================================
// Core Qi Flow Engine Types
// ============================================================================

/**
 * Standard result interface that ALL tool functions must return.
 * The Qi Flow Engine expects this exact structure.
 */
export const ToolResultSchema = z.object({
  data: z.record(z.any()).describe("The raw JSON data returned by the tool"),
  evidence_cid: z.string().optional().describe("IPFS CID of heavy artifacts (PDF, Image, etc.)"),
  summary: z.string().describe("One-line human-readable summary of the operation"),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

/**
 * UCAN Capability definition for the manifest
 */
export const CapabilitySchema = z.object({
  name: z.string().regex(/^[a-z_]+$/).describe("Capability alias in snake_case"),
  resource: z.string().regex(/^did:[a-z]+:.+$/).describe("DID-formatted resource identifier"),
  ability: z.string().describe("The action being authorized (read, write, create, etc.)"),
  description: z.string().optional().describe("Human-readable description of the capability"),
});

export type Capability = z.infer<typeof CapabilitySchema>;

/**
 * Tool definition for the manifest
 */
export const ToolDefinitionSchema = z.object({
  name: z.string().regex(/^[a-z_]+$/).describe("Tool name in snake_case"),
  description: z.string().min(10).describe("What the tool does"),
  handler: z.string().regex(/^scripts\/handlers\.ts#[a-zA-Z_][a-zA-Z0-9_]*$/).describe("Handler reference"),
  type: z.enum(["transition", "read_only"]).describe("Whether tool mutates state"),
  required_auth: z.string().nullable().describe("Capability alias or null for public"),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ============================================================================
// analyze_skill_intent Arguments
// ============================================================================

export const AnalyzeSkillIntentArgsSchema = z.object({
  user_description: z.string()
    .min(20)
    .describe("Natural language description of the skill the user wants to create"),
  
  domain_hints: z.array(z.string()).optional()
    .describe("Optional domain hints (e.g., 'finance', 'credentials', 'data-processing')"),
  
  example_inputs: z.array(z.record(z.any())).optional()
    .describe("Optional example inputs the tools might receive"),
  
  example_outputs: z.array(z.record(z.any())).optional()
    .describe("Optional example outputs the tools should produce"),
});

export type AnalyzeSkillIntentArgs = z.infer<typeof AnalyzeSkillIntentArgsSchema>;

/**
 * Result of intent analysis
 * Note: skill_name uses kebab-case per Agent Skills standard
 */
export const SkillIntentSchema = z.object({
  skill_name: z.string().regex(/^[a-z][a-z0-9-]*$/).describe("Derived skill name in kebab-case (Agent Skills standard)"),
  skill_description: z.string().describe("Comprehensive skill description"),
  
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(["transition", "read_only"]),
    inputs: z.record(z.object({
      type: z.string(),
      description: z.string(),
      required: z.boolean(),
      validation: z.string().optional(),
    })),
    outputs: z.record(z.object({
      type: z.string(),
      description: z.string(),
    })),
    capability_needed: z.string().nullable(),
  })),
  
  capabilities: z.array(CapabilitySchema),
  
  domain: z.string().describe("Primary domain classification"),
  complexity: z.enum(["simple", "moderate", "complex"]),
});

export type SkillIntent = z.infer<typeof SkillIntentSchema>;

// ============================================================================
// scaffold_skill Arguments
// ============================================================================

export const ScaffoldSkillArgsSchema = z.object({
  intent: SkillIntentSchema.describe("Analyzed skill intent from analyze_skill_intent"),
  
  output_path: z.string().optional()
    .describe("Optional base path for skill output (defaults to skill_name)"),
  
  include_tests: z.boolean().default(false)
    .describe("Whether to include test stubs"),
});

export type ScaffoldSkillArgs = z.infer<typeof ScaffoldSkillArgsSchema>;

/**
 * Scaffolded skill structure
 * Note: Always generates SKILL.md (not skill.yaml) per Agent Skills standard
 */
export const SkillScaffoldSchema = z.object({
  path: z.string(),
  files: z.record(z.string()).describe("Map of relative path to file contents (includes SKILL.md)"),
  structure: z.array(z.string()).describe("List of all paths in the skill"),
});

export type SkillScaffold = z.infer<typeof SkillScaffoldSchema>;

// ============================================================================
// generate_manifest Arguments
// ============================================================================

export const GenerateManifestArgsSchema = z.object({
  intent: SkillIntentSchema.describe("Analyzed skill intent"),
  
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0")
    .describe("Semantic version for the skill"),
  
  schema_version: z.string().default("1.0")
    .describe("Qi skill schema version"),
});

export type GenerateManifestArgs = z.infer<typeof GenerateManifestArgsSchema>;

// ============================================================================
// generate_handlers Arguments
// ============================================================================

export const GenerateHandlersArgsSchema = z.object({
  intent: SkillIntentSchema.describe("Analyzed skill intent"),
  
  implementation_hints: z.record(z.string()).optional()
    .describe("Optional per-tool implementation hints"),
  
  use_async: z.boolean().default(true)
    .describe("Whether to generate async handlers"),
  
  include_logging: z.boolean().default(true)
    .describe("Whether to include logging statements"),
});

export type GenerateHandlersArgs = z.infer<typeof GenerateHandlersArgsSchema>;

// ============================================================================
// generate_schemas Arguments
// ============================================================================

export const GenerateSchemasArgsSchema = z.object({
  intent: SkillIntentSchema.describe("Analyzed skill intent"),
  
  strict_mode: z.boolean().default(true)
    .describe("Whether to use strict Zod validation"),
  
  include_examples: z.boolean().default(true)
    .describe("Whether to include .describe() with examples"),
});

export type GenerateSchemasArgs = z.infer<typeof GenerateSchemasArgsSchema>;

// ============================================================================
// validate_skill Arguments
// ============================================================================

export const ValidateSkillArgsSchema = z.object({
  skill_files: z.record(z.string())
    .describe("Map of file paths to their contents"),
  
  strict: z.boolean().default(true)
    .describe("Whether to fail on warnings"),
});

export type ValidateSkillArgs = z.infer<typeof ValidateSkillArgsSchema>;

/**
 * Validation result
 */
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    file: z.string(),
    line: z.number().optional(),
    message: z.string(),
    severity: z.enum(["error", "warning"]),
  })),
  warnings: z.array(z.object({
    file: z.string(),
    line: z.number().optional(),
    message: z.string(),
  })),
  checks_passed: z.array(z.string()),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ============================================================================
// package_skill Arguments
// ============================================================================

export const PackageSkillArgsSchema = z.object({
  skill_files: z.record(z.string())
    .describe("Map of file paths to their contents"),
  
  skill_name: z.string()
    .describe("Name of the skill for the package"),
  
  include_source_maps: z.boolean().default(false)
    .describe("Whether to include source maps"),
});

export type PackageSkillArgs = z.infer<typeof PackageSkillArgsSchema>;

/**
 * Package result
 */
export const PackageResultSchema = z.object({
  cid: z.string().describe("IPFS CID of the packaged skill"),
  size_bytes: z.number(),
  file_count: z.number(),
  manifest_hash: z.string().describe("SHA-256 hash of the SKILL.md file"),
});

export type PackageResult = z.infer<typeof PackageResultSchema>;

// ============================================================================
// build_complete_skill Arguments
// ============================================================================

export const BuildCompleteSkillArgsSchema = z.object({
  user_description: z.string()
    .min(20)
    .describe("Natural language description of the skill"),
  
  domain_hints: z.array(z.string()).optional()
    .describe("Optional domain hints"),
  
  example_inputs: z.array(z.record(z.any())).optional()
    .describe("Optional example inputs"),
  
  example_outputs: z.array(z.record(z.any())).optional()
    .describe("Optional example outputs"),
  
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0")
    .describe("Semantic version"),
  
  strict_validation: z.boolean().default(true)
    .describe("Whether to use strict validation"),
});

export type BuildCompleteSkillArgs = z.infer<typeof BuildCompleteSkillArgsSchema>;

/**
 * Complete build result
 */
export const BuildResultSchema = z.object({
  intent: SkillIntentSchema,
  files: z.record(z.string()),
  validation: ValidationResultSchema,
  package: PackageResultSchema.optional(),
  build_stages: z.array(z.object({
    stage: z.string(),
    status: z.enum(["success", "failed", "skipped"]),
    duration_ms: z.number(),
  })),
});

export type BuildResult = z.infer<typeof BuildResultSchema>;

// ============================================================================
// Context Interface (provided by Qi Flow Engine)
// ============================================================================

export interface QiContext {
  /** Store data to IPFS and return CID */
  ipfs: {
    save: (data: string | Buffer) => Promise<string>;
    get: (cid: string) => Promise<Buffer>;
  };
  
  /** Logging interface */
  log: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  
  /** UCAN token for authorization verification */
  ucan: {
    capabilities: string[];
    issuer: string;
    audience: string;
  };
}
