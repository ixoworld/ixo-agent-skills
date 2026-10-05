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

const ProbabilitySchema = z
  .number()
  .min(0)
  .max(1)
  .refine(Number.isFinite, "Must be a finite probability");

export const ProbabilisticCriterionSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    weight: WeightSchema,
    utilities: z.record(z.string(), FiniteNumberSchema),
  })
  .strict();

export const CriterionAssessmentSchema = z
  .object({
    distribution: z.record(z.string(), ProbabilitySchema),
    confidence: z
      .object({
        value: ProbabilitySchema,
        semantics: z.enum([
          "distribution-concentration",
          "jev-score-distribution-concentration",
        ]),
      })
      .strict()
      .optional(),
    provenance: z
      .object({
        provider: z.string().trim().min(1).optional(),
        model: z.string().trim().min(1).optional(),
        decision_version: z.string().trim().min(1).optional(),
        calibration_profile_ref: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const ProbabilisticOptionSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    criteria: z.record(z.string(), CriterionAssessmentSchema),
    metadata: OptionalMetadataSchema.optional(),
  })
  .strict();

export const AutonomyPolicySchema = z
  .object({
    min_probability_best: ProbabilitySchema.optional(),
    min_criterion_confidence: ProbabilitySchema.optional(),
    critical_weight_threshold: WeightSchema.default(0),
  })
  .strict();

export const ProbabilisticMCDAConfigSchema = z
  .object({
    options: z.array(ProbabilisticOptionSchema).min(2),
    criteria: z.array(ProbabilisticCriterionSchema).min(1),
    simulations: z.number().int().min(100).max(100000).default(10000),
    seed: z.string().trim().min(1).max(256).optional(),
    autonomy_policy: AutonomyPolicySchema.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    const criterionIds = config.criteria.map((criterion) => criterion.id);
    const optionIds = config.options.map((option) => option.id);
    for (const duplicate of duplicateIds(criterionIds)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["criteria"],
        message: `Duplicate criterion ID: ${duplicate}`,
      });
    }
    for (const duplicate of duplicateIds(optionIds)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: `Duplicate option ID: ${duplicate}`,
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

    for (const [criterionIndex, criterion] of config.criteria.entries()) {
      if (Object.keys(criterion.utilities).length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["criteria", criterionIndex, "utilities"],
          message: "Each probabilistic criterion requires at least two outcome utilities",
        });
      }
    }

    for (const [optionIndex, option] of config.options.entries()) {
      for (const criterion of config.criteria) {
        const assessment = option.criteria[criterion.id];
        if (!assessment) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["options", optionIndex, "criteria"],
            message: `Option '${option.id}' missing criterion '${criterion.id}'`,
          });
          continue;
        }
        const outcomes = Object.keys(assessment.distribution);
        const utilityOutcomes = Object.keys(criterion.utilities);
        const missingUtilities = outcomes.filter(
          (outcome) => !utilityOutcomes.includes(outcome),
        );
        const missingProbabilities = utilityOutcomes.filter(
          (outcome) => !outcomes.includes(outcome),
        );
        if (missingUtilities.length || missingProbabilities.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["options", optionIndex, "criteria", criterion.id],
            message: `Distribution outcomes must exactly match utility outcomes for '${criterion.id}'`,
          });
        }
        const sum = Object.values(assessment.distribution).reduce(
          (total, probability) => total + probability,
          0,
        );
        if (Math.abs(sum - 1) > 1e-6) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["options", optionIndex, "criteria", criterion.id, "distribution"],
            message: `Probabilities sum to ${sum}, must equal 1.0`,
          });
        }
      }
      const extras = Object.keys(option.criteria).filter(
        (id) => !criterionIds.includes(id),
      );
      if (extras.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", optionIndex, "criteria"],
          message: `Unknown probabilistic criteria: ${extras.join(", ")}`,
        });
      }
    }
  });

export type ProbabilisticMCDAConfig = z.infer<
  typeof ProbabilisticMCDAConfigSchema
>;

export const RunProbabilisticArgsSchema = z
  .object({
    config: ProbabilisticMCDAConfigSchema,
  })
  .strict();

export type RunProbabilisticArgs = z.infer<typeof RunProbabilisticArgsSchema>;

export interface ProbabilisticOptionResult {
  option_id: string;
  option_name: string;
  expected_utility: number;
  probability_best: number;
  probability_top_two: number;
  utility_interval_5_95: [number, number];
  criterion_expected_utilities: Record<string, number>;
}

export interface CriticalUncertainty {
  criterion_id: string;
  criterion_name: string;
  weight: number;
  option_id: string;
  utility_variance: number;
  confidence: number;
  voi_proxy: number;
}

export interface ProbabilisticMCDAResult {
  seed: string;
  simulations: number;
  options: ProbabilisticOptionResult[];
  critical_uncertainties: CriticalUncertainty[];
  policy: {
    disposition: "decide" | "gather_evidence" | "escalate";
    reasons: string[];
    evidence_requests: string[];
  };
}

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
