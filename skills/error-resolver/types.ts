import { z } from "zod";

// ============================================================================
// Core Types
// ============================================================================

/**
 * Standard result interface for Qi Flow Engine
 */
export const ToolResultSchema = z.object({
  data: z.record(z.any()).describe("The raw JSON data returned by the tool"),
  evidence_cid: z.string().optional().describe("IPFS CID for stored artifacts"),
  summary: z.string().describe("One-line human-readable summary"),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

/**
 * User expertise levels for tailored explanations
 */
export const ExpertiseLevelSchema = z.enum([
  "beginner",    // Non-technical users, wallet users
  "developer",   // Software developers, SDK users
  "validator",   // Node operators, validators
]).describe("User expertise level for tailored explanations");

export type ExpertiseLevel = z.infer<typeof ExpertiseLevelSchema>;

/**
 * Error source categories
 */
export const ErrorSourceSchema = z.enum([
  "chain",         // On-chain transaction errors
  "cli",           // ixod CLI errors
  "sdk",           // Cosmos SDK errors
  "consensus",     // CometBFT/Tendermint errors
  "ibc",           // Inter-blockchain communication errors
  "module",        // IXO-specific module errors
  "unknown",       // Unable to determine source
]).describe("Source category of the error");

export type ErrorSource = z.infer<typeof ErrorSourceSchema>;

// ============================================================================
// resolve_error Arguments
// ============================================================================

export const ResolveErrorArgsSchema = z.object({
  /**
   * The error input - can be code, message, tx hash, or raw logs
   */
  error_input: z.string()
    .min(1)
    .describe("Error code, message, transaction hash, or raw CLI/log output"),

  /**
   * Optional error code for precise lookup
   */
  error_code: z.number().int().optional()
    .describe("Numeric error code (e.g., 11 for 'out of gas')"),

  /**
   * Optional codespace for module-specific errors
   */
  codespace: z.string().optional()
    .describe("Error codespace (e.g., 'sdk', 'bank', 'staking', 'iid', 'entity', 'claims', 'bonds')"),

  /**
   * Known source of the error
   */
  source: ErrorSourceSchema.optional()
    .describe("Where the error originated from"),

  /**
   * User's expertise level for tailored responses
   */
  expertise_level: ExpertiseLevelSchema.default("beginner")
    .describe("User expertise level - affects explanation depth and terminology"),

  /**
   * Additional context about what the user was trying to do
   */
  context: z.string().optional()
    .describe("What the user was trying to accomplish when the error occurred"),

  /**
   * Transaction hash for lookup
   */
  tx_hash: z.string().regex(/^[A-Fa-f0-9]{64}$/).optional()
    .describe("Transaction hash (64 hex characters) for error lookup"),
});

export type ResolveErrorArgs = z.infer<typeof ResolveErrorArgsSchema>;

// ============================================================================
// Error Database Types
// ============================================================================

/**
 * Structured error entry from the database
 */
export const ErrorEntrySchema = z.object({
  code: z.number().int().describe("Numeric error code"),
  codespace: z.string().describe("Module codespace (e.g., 'sdk', 'bank')"),
  message: z.string().describe("Short error message"),
  explanation: z.string().describe("Plain English explanation"),
  causes: z.array(z.string()).describe("Possible causes of the error"),
  resolution: z.string().describe("How to resolve the error"),
  severity: z.enum(["info", "warning", "error", "critical"]).describe("Error severity"),
  category: z.string().describe("Error category for grouping"),
  documentation_url: z.string().url().optional().describe("Link to relevant docs"),
  related_errors: z.array(z.number()).optional().describe("Related error codes"),
});

export type ErrorEntry = z.infer<typeof ErrorEntrySchema>;

/**
 * Resolution response structure
 */
export const ErrorResolutionSchema = z.object({
  // Identification
  error_code: z.number().int().optional(),
  codespace: z.string().optional(),
  error_message: z.string(),
  
  // Explanation
  explanation: z.string().describe("Plain English explanation tailored to expertise level"),
  what_happened: z.string().describe("Clear description of what went wrong"),
  
  // Causes
  possible_causes: z.array(z.string()).describe("List of possible causes"),
  most_likely_cause: z.string().optional().describe("Most probable cause given context"),
  
  // Resolution
  resolution_steps: z.array(z.string()).describe("Step-by-step resolution guidance"),
  commands: z.array(z.object({
    description: z.string(),
    command: z.string(),
    note: z.string().optional(),
  })).optional().describe("Relevant CLI commands with explanations"),
  
  // Additional help
  documentation_links: z.array(z.object({
    title: z.string(),
    url: z.string(),
  })).optional().describe("Links to relevant documentation"),
  
  // Clarification needed
  needs_clarification: z.boolean().default(false),
  clarifying_questions: z.array(z.string()).optional()
    .describe("Questions to ask if error is ambiguous"),
  
  // Metadata
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence in the diagnosis"),
  category: z.string().describe("Error category"),
});

export type ErrorResolution = z.infer<typeof ErrorResolutionSchema>;

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
  
  /** UCAN token context */
  ucan: {
    capabilities: string[];
    issuer: string;
    audience: string;
  };
}
