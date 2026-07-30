import { z } from "zod";

const FiniteNumberSchema = z
  .number()
  .refine(Number.isFinite, "Must be a finite number");
const WeightSchema = z
  .number()
  .min(0)
  .max(1)
  .refine(Number.isFinite, "Must be a finite number");
const NonNegativeNumberSchema = z
  .number()
  .min(0)
  .refine(Number.isFinite, "Must be a finite number");
const SensitivityDeltaSchema = z
  .number()
  .min(-0.99)
  .max(0.99)
  .refine(Number.isFinite, "Must be a finite number");

const OptionalMetadataSchema = z.record(z.string(), z.unknown()).default({});

export const ToolResultSchema = z.object({
  data: z.record(z.unknown()),
  evidence_cid: z.string().optional(),
  summary: z.string().min(1),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

export interface QiContext {
  ipfs?: {
    save: (data: string | Buffer) => Promise<string>;
    get?: (cid: string) => Promise<Buffer>;
  };
  log?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string) => void;
  };
  ucan?: {
    capabilities?: string[];
    issuer?: string;
    audience?: string;
  };
  requestTime?: string;
}

export const CriterionTypeEnum = z.enum(["benefit", "cost"]);
export const NormalizationMethodEnum = z.enum([
  "min-max",
  "z-score",
  "vector",
  "target-based",
]);
export const AggregationMethodEnum = z.enum([
  "weighted-sum",
  "weighted-product",
  "topsis",
]);

export const OptionSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    values: z.record(z.string(), FiniteNumberSchema),
    metadata: OptionalMetadataSchema.optional(),
  })
  .strict();

export type Option = z.infer<typeof OptionSchema>;

export const CriterionSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    weight: WeightSchema,
    type: CriterionTypeEnum,
    target: FiniteNumberSchema.optional(),
  })
  .strict();

export type Criterion = z.infer<typeof CriterionSchema>;

export const ScenarioSchema = z
  .object({
    name: z.string().trim().min(1).max(256),
    weight_overrides: z
      .record(z.string(), NonNegativeNumberSchema)
      .optional(),
    value_overrides: z
      .record(z.string(), z.record(z.string(), FiniteNumberSchema))
      .optional(),
  })
  .strict();

export type Scenario = z.infer<typeof ScenarioSchema>;

function duplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }

  return [...duplicates].sort();
}

export const MCDAConfigSchema = z
  .object({
    options: z.array(OptionSchema).min(1, "At least one option is required"),
    criteria: z.array(CriterionSchema).min(1, "At least one criterion is required"),
    normalization: NormalizationMethodEnum.default("min-max"),
    aggregation: AggregationMethodEnum.default("weighted-sum"),
    run_sensitivity: z.boolean().default(false),
    scenarios: z.array(ScenarioSchema).default([]),
  })
  .strict()
  .superRefine((config, ctx) => {
    const optionIds = config.options.map((option) => option.id);
    const criterionIds = config.criteria.map((criterion) => criterion.id);
    const optionDuplicates = duplicateIds(optionIds);
    const criterionDuplicates = duplicateIds(criterionIds);

    if (optionDuplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: `Duplicate option IDs: ${optionDuplicates.join(", ")}`,
      });
    }

    if (criterionDuplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["criteria"],
        message: `Duplicate criterion IDs: ${criterionDuplicates.join(", ")}`,
      });
    }

    const weightSum = config.criteria.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    );
    if (Math.abs(weightSum - 1) > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["criteria"],
        message: `Criterion weights sum to ${weightSum}, must equal 1.0`,
      });
    }

    const criterionIdSet = new Set(criterionIds);
    for (const [optionIndex, option] of config.options.entries()) {
      const valueIds = Object.keys(option.values);
      const valueIdSet = new Set(valueIds);
      const missing = criterionIds.filter((id) => !valueIdSet.has(id));
      const extra = valueIds.filter((id) => !criterionIdSet.has(id));

      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", optionIndex, "values"],
          message: `Option '${option.name}' missing values for: ${missing.join(", ")}`,
        });
      }

      if (extra.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", optionIndex, "values"],
          message: `Option '${option.name}' has values for unknown criteria: ${extra.join(", ")}`,
        });
      }
    }

    if (config.normalization === "target-based") {
      const missingTargets = config.criteria
        .filter((criterion) => criterion.target === undefined)
        .map((criterion) => criterion.id);

      if (missingTargets.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["criteria"],
          message: `Target-based normalization requires target values for: ${missingTargets.join(", ")}`,
        });
      }
    }

    for (const [scenarioIndex, scenario] of config.scenarios.entries()) {
      const overrideCriterionIds = Object.keys(scenario.weight_overrides ?? {});
      const unknownWeights = overrideCriterionIds.filter(
        (id) => !criterionIdSet.has(id),
      );
      if (unknownWeights.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scenarios", scenarioIndex, "weight_overrides"],
          message: `Scenario '${scenario.name}' has unknown weight criteria: ${unknownWeights.join(", ")}`,
        });
      }

      for (const [optionId, values] of Object.entries(
        scenario.value_overrides ?? {},
      )) {
        if (!optionIds.includes(optionId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scenarios", scenarioIndex, "value_overrides", optionId],
            message: `Scenario '${scenario.name}' references unknown option: ${optionId}`,
          });
          continue;
        }

        const unknownValueIds = Object.keys(values).filter(
          (id) => !criterionIdSet.has(id),
        );
        if (unknownValueIds.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scenarios", scenarioIndex, "value_overrides", optionId],
            message: `Scenario '${scenario.name}' has unknown value criteria for ${optionId}: ${unknownValueIds.join(", ")}`,
          });
        }
      }
    }
  });

export type MCDAConfig = z.infer<typeof MCDAConfigSchema>;

export const ValidateConfigArgsSchema = z
  .object({
    config: z.unknown(),
  })
  .strict();

export type ValidateConfigArgs = z.infer<typeof ValidateConfigArgsSchema>;

export const RunAnalysisArgsSchema = z
  .object({
    config: MCDAConfigSchema,
    timestamp: z.string().datetime().optional(),
  })
  .strict();

export type RunAnalysisArgs = z.infer<typeof RunAnalysisArgsSchema>;

export const RunSensitivityArgsSchema = z
  .object({
    config: MCDAConfigSchema,
    weight_deltas: z
      .array(SensitivityDeltaSchema)
      .min(1)
      .max(20)
      .default([-0.2, -0.1, -0.05, 0.05, 0.1, 0.2]),
  })
  .strict();

export type RunSensitivityArgs = z.infer<typeof RunSensitivityArgsSchema>;

export const RunScenariosArgsSchema = z
  .object({
    config: MCDAConfigSchema,
    scenarios: z.array(ScenarioSchema).min(1).max(50),
  })
  .strict();

export type RunScenariosArgs = z.infer<typeof RunScenariosArgsSchema>;

export const CompareMethodsArgsSchema = z
  .object({
    config: MCDAConfigSchema,
    normalizations: z
      .array(NormalizationMethodEnum)
      .min(1)
      .max(4)
      .default(["min-max", "z-score", "vector"]),
    aggregations: z
      .array(AggregationMethodEnum)
      .min(1)
      .max(3)
      .default(["weighted-sum", "weighted-product", "topsis"]),
  })
  .strict();

export type CompareMethodsArgs = z.infer<typeof CompareMethodsArgsSchema>;

export const GenerateReportArgsSchema = z
  .object({
    governance: z.record(z.unknown()),
    format: z.enum(["markdown", "json"]).default("markdown"),
  })
  .strict();

export type GenerateReportArgs = z.infer<typeof GenerateReportArgsSchema>;

export interface RankedOption {
  rank: number;
  option_id: string;
  option_name: string;
  raw_score: number;
  normalized_score: number;
  criterion_contributions: Record<string, number>;
  metadata: Record<string, unknown>;
}

export interface SensitivityResult {
  criterion_id: string;
  weight_change: number;
  adjusted_weight: number;
  new_rankings: Array<[string, number]>;
  rank_changes: Record<string, number>;
}

export interface GovernanceArtifact {
  analysis_id: string;
  timestamp: string;
  input_hash: string;
  method_config: Record<string, unknown>;
  options_snapshot: Option[];
  criteria_snapshot: Criterion[];
  normalization_method: z.infer<typeof NormalizationMethodEnum>;
  aggregation_method: z.infer<typeof AggregationMethodEnum>;
  results: RankedOption[];
  sensitivity_analysis?: Record<string, SensitivityResult[]>;
  what_if_scenarios?: Record<string, RankedOption[]>;
}
