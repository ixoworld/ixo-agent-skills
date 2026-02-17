import { z } from "zod";

// ============================================================================
// Core Qi Flow Engine Types
// ============================================================================

/**
 * Standard result interface that ALL Qi tool handlers must return.
 */
export const ToolResultSchema = z.object({
  data: z.record(z.any()).describe("JSON-serializable result data"),
  evidence_cid: z.string().optional().describe("IPFS CID for transition tool evidence"),
  summary: z.string().describe("One-line human-readable summary"),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

/**
 * Qi Flow Engine context provided to all handlers.
 */
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
  /** ISO timestamp of the request — use for deterministic output */
  requestTime: string;
}

// ============================================================================
// MCDA Domain Types
// ============================================================================

/**
 * Criterion type: benefit (higher is better) or cost (lower is better).
 */
export const CriterionTypeEnum = z.enum(["benefit", "cost"]);

/**
 * Normalization method for scaling raw values.
 */
export const NormalizationMethodEnum = z.enum([
  "min-max",
  "z-score",
  "vector",
  "target-based",
]);

/**
 * Aggregation method for combining normalized scores.
 */
export const AggregationMethodEnum = z.enum([
  "weighted-sum",
  "weighted-product",
  "topsis",
]);

/**
 * A decision option to evaluate.
 */
export const OptionSchema = z.object({
  id: z.string().min(1).describe("Unique option identifier"),
  name: z.string().min(1).describe("Human-readable option name"),
  values: z.record(z.number()).describe("Map of criterion_id → numeric value"),
  metadata: z.record(z.any()).optional().describe("Optional context data"),
});

export type Option = z.infer<typeof OptionSchema>;

/**
 * A decision criterion with weight and direction.
 */
export const CriterionSchema = z.object({
  id: z.string().min(1).describe("Unique criterion identifier"),
  name: z.string().min(1).describe("Human-readable criterion name"),
  weight: z
    .number()
    .min(0)
    .max(1)
    .describe("Importance weight (0–1, all weights must sum to 1.0)"),
  type: CriterionTypeEnum.describe("'benefit' (higher is better) or 'cost' (lower is better)"),
  target: z.number().optional().describe("Target value for target-based normalization"),
});

export type Criterion = z.infer<typeof CriterionSchema>;

/**
 * Complete MCDA configuration — the input contract for analysis.
 */
export const MCDAConfigSchema = z.object({
  options: z
    .array(OptionSchema)
    .min(1, "At least one option is required")
    .describe("Alternatives to evaluate"),
  criteria: z
    .array(CriterionSchema)
    .min(1, "At least one criterion is required")
    .describe("Decision factors with weights"),
  normalization: NormalizationMethodEnum.default("min-max").describe(
    "Value scaling method"
  ),
  aggregation: AggregationMethodEnum.default("weighted-sum").describe(
    "Score combination method"
  ),
  run_sensitivity: z.boolean().default(false).describe("Enable sensitivity analysis"),
  scenarios: z
    .array(
      z.object({
        name: z.string().describe("Scenario name"),
        weight_overrides: z
          .record(z.number())
          .optional()
          .describe("criterion_id → new weight"),
        value_overrides: z
          .record(z.record(z.number()))
          .optional()
          .describe("option_id → { criterion_id → new value }"),
      })
    )
    .optional()
    .describe("What-if scenario configurations"),
});

export type MCDAConfig = z.infer<typeof MCDAConfigSchema>;

// ============================================================================
// Tool Argument Schemas
// ============================================================================

/**
 * validate_config: Validate an MCDA configuration without executing.
 */
export const ValidateConfigArgsSchema = z.object({
  config: MCDAConfigSchema.describe("MCDA configuration to validate"),
});

export type ValidateConfigArgs = z.infer<typeof ValidateConfigArgsSchema>;

/**
 * run_analysis: Execute full MCDA analysis with governance evidence.
 */
export const RunAnalysisArgsSchema = z.object({
  config: MCDAConfigSchema.describe("MCDA configuration to analyze"),
  timestamp: z
    .string()
    .datetime()
    .optional()
    .describe("ISO timestamp — defaults to context.requestTime for determinism"),
});

export type RunAnalysisArgs = z.infer<typeof RunAnalysisArgsSchema>;

/**
 * run_sensitivity: Sensitivity analysis with configurable weight deltas.
 */
export const RunSensitivityArgsSchema = z.object({
  config: MCDAConfigSchema.describe("Base MCDA configuration"),
  weight_deltas: z
    .array(z.number().min(-1).max(1))
    .default([-0.2, -0.1, -0.05, 0.05, 0.1, 0.2])
    .describe("Weight perturbations to test"),
});

export type RunSensitivityArgs = z.infer<typeof RunSensitivityArgsSchema>;

/**
 * run_scenarios: What-if scenario analysis.
 */
export const RunScenariosArgsSchema = z.object({
  config: MCDAConfigSchema.describe("Base MCDA configuration"),
  scenarios: z
    .array(
      z.object({
        name: z.string().describe("Scenario name"),
        weight_overrides: z.record(z.number()).optional(),
        value_overrides: z.record(z.record(z.number())).optional(),
      })
    )
    .min(1, "At least one scenario is required")
    .describe("Scenario configurations to test"),
});

export type RunScenariosArgs = z.infer<typeof RunScenariosArgsSchema>;

/**
 * compare_methods: Cross-method comparison.
 */
export const CompareMethodsArgsSchema = z.object({
  config: MCDAConfigSchema.describe("Base MCDA configuration"),
  normalizations: z
    .array(NormalizationMethodEnum)
    .default(["min-max", "z-score", "vector"])
    .describe("Normalization methods to compare"),
  aggregations: z
    .array(AggregationMethodEnum)
    .default(["weighted-sum", "weighted-product", "topsis"])
    .describe("Aggregation methods to compare"),
});

export type CompareMethodsArgs = z.infer<typeof CompareMethodsArgsSchema>;

/**
 * generate_report: Generate a decision report from governance artifacts.
 */
export const GenerateReportArgsSchema = z.object({
  governance: z.record(z.any()).describe("GovernanceArtifact from run_analysis"),
  format: z
    .enum(["markdown", "json"])
    .default("markdown")
    .describe("Report output format"),
});

export type GenerateReportArgs = z.infer<typeof GenerateReportArgsSchema>;

// ============================================================================
// Result Schemas (for output validation)
// ============================================================================

/**
 * A single ranked option in the analysis results.
 */
export const RankedOptionSchema = z.object({
  rank: z.number().int().positive(),
  option_id: z.string(),
  option_name: z.string(),
  raw_score: z.number(),
  normalized_score: z.number().min(0).max(1),
  criterion_contributions: z.record(z.number()),
});

export type RankedOption = z.infer<typeof RankedOptionSchema>;

/**
 * Confidence level based on score range differentiation.
 */
export const ConfidenceLevelEnum = z.enum(["high", "medium", "low"]);

/**
 * Stability assessment for sensitivity analysis.
 */
export const StabilityAssessmentEnum = z.enum(["stable", "sensitive", "fragile"]);
