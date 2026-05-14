import { ZodError } from "zod";

import {
  analyzeConfig,
  assessStability,
  stableStringify,
} from "./engine.js";
import { generateDecisionReport } from "./report.js";
import {
  CompareMethodsArgsSchema,
  GenerateReportArgsSchema,
  MCDAConfigSchema,
  RunAnalysisArgsSchema,
  RunScenariosArgsSchema,
  RunSensitivityArgsSchema,
  ValidateConfigArgsSchema,
  type GovernanceArtifact,
  type MCDAConfig,
  type QiContext,
  type ToolResult,
} from "./types.js";

const CAPABILITY_FRAGMENTS: Record<string, string> = {
  mcda_read: "#cap-02",
  mcda_report: "#cap-03",
  mcda_execute: "#cap-04",
  ipfs_store: "#cap-04",
};

export async function validateConfig(
  args: unknown,
  context: QiContext = {},
): Promise<ToolResult> {
  const parsedArgs = ValidateConfigArgsSchema.safeParse(args);
  if (!parsedArgs.success) {
    return invalidValidationResult(parsedArgs.error);
  }

  const parsedConfig = MCDAConfigSchema.safeParse(parsedArgs.data.config);
  if (!parsedConfig.success) {
    return invalidValidationResult(parsedConfig.error);
  }

  const config = parsedConfig.data;
  logInfo(
    context,
    `Validated MCDA config: ${config.options.length} options, ${config.criteria.length} criteria`,
  );

  const warnings = buildConfigWarnings(config);

  return {
    data: {
      valid: true,
      errors: [],
      warnings,
      config_summary: summarizeConfig(config),
    },
    summary: `Config valid: ${config.options.length} options, ${config.criteria.length} criteria`,
  };
}

export async function runAnalysis(
  args: unknown,
  context: QiContext,
): Promise<ToolResult> {
  requireCapability(context, "mcda_execute");
  requireCapability(context, "ipfs_store");

  const { config, timestamp } = RunAnalysisArgsSchema.parse(args);
  const requestTime = timestamp ?? getRequestTime(context);
  const analysis = analyzeConfig(config, {
    timestamp: requestTime,
    includeSensitivity: config.run_sensitivity,
    scenarios: config.scenarios,
  });

  const evidenceCid = await saveEvidence(context, {
    type: "mcda_governance_artifact",
    governance: analysis.governance,
    ucan: {
      issuer: context.ucan?.issuer ?? null,
      audience: context.ucan?.audience ?? null,
    },
    stored_at: requestTime,
  });

  const top = analysis.rankings[0]!;
  logInfo(
    context,
    `MCDA analysis complete: ${top.option_id} ranked #1, evidence ${evidenceCid}`,
  );

  return {
    data: {
      rankings: analysis.rankings,
      governance: analysis.governance,
      confidence: analysis.confidence,
      normalized_matrix: analysis.normalized_matrix,
    },
    evidence_cid: evidenceCid,
    summary: `${top.option_name} ranked #1 (score: ${top.normalized_score.toFixed(3)}, confidence: ${analysis.confidence})`,
  };
}

export async function runSensitivity(
  args: unknown,
  context: QiContext,
): Promise<ToolResult> {
  requireCapability(context, "mcda_read");

  const { config, weight_deltas } = RunSensitivityArgsSchema.parse(args);
  const analysis = analyzeConfig(
    { ...config, run_sensitivity: false, scenarios: [] },
    {
      timestamp: getRequestTime(context),
      includeSensitivity: true,
      weightDeltas: weight_deltas,
      scenarios: [],
    },
  );
  const sensitivity = analysis.governance.sensitivity_analysis ?? {};
  const stability = assessStability(sensitivity);

  return {
    data: {
      baseline_rankings: analysis.rankings,
      sensitivity,
      stability_assessment: stability,
    },
    summary: `Rankings ${stability} under ${weight_deltas.length} weight perturbation(s) across ${config.criteria.length} criteria`,
  };
}

export async function runScenarios(
  args: unknown,
  context: QiContext,
): Promise<ToolResult> {
  requireCapability(context, "mcda_read");

  const { config, scenarios } = RunScenariosArgsSchema.parse(args);
  const analysis = analyzeConfig(
    { ...config, run_sensitivity: false, scenarios: [] },
    {
      timestamp: getRequestTime(context),
      includeSensitivity: false,
      scenarios,
    },
  );
  const scenarioResults = analysis.governance.what_if_scenarios ?? {};

  return {
    data: {
      baseline_rankings: analysis.rankings,
      scenario_results: scenarioResults,
      scenarios_run: Object.keys(scenarioResults),
    },
    summary: `${Object.keys(scenarioResults).length} scenario(s) analyzed: ${Object.keys(scenarioResults).join(", ")}`,
  };
}

export async function compareMethods(
  args: unknown,
  context: QiContext = {},
): Promise<ToolResult> {
  const { config, normalizations, aggregations } =
    CompareMethodsArgsSchema.parse(args);

  const combinations = normalizations.length * aggregations.length;
  const methodResults: Record<string, unknown> = {};
  const topOptions: Record<string, number> = {};

  for (const normalization of normalizations) {
    for (const aggregation of aggregations) {
      const key = `${normalization}_${aggregation}`;
      const methodConfig: MCDAConfig = {
        ...config,
        normalization,
        aggregation,
        run_sensitivity: false,
        scenarios: [],
      };

      try {
        const analysis = analyzeConfig(methodConfig, {
          timestamp: getRequestTime(context),
          includeSensitivity: false,
          scenarios: [],
        });
        methodResults[key] = analysis.rankings;

        const top = analysis.rankings[0]!;
        topOptions[top.option_id] = (topOptions[top.option_id] ?? 0) + 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        methodResults[key] = { error: message };
        logWarn(context, `MCDA method comparison failed for ${key}: ${message}`);
      }
    }
  }

  const consensusOption = Object.entries(topOptions).sort(
    ([leftId, leftCount], [rightId, rightCount]) =>
      rightCount - leftCount || leftId.localeCompare(rightId),
  )[0];
  const agreement = consensusOption
    ? consensusOption[1] === combinations
      ? "unanimous"
      : consensusOption[1] > combinations / 2
        ? "majority"
        : "plurality"
    : "no_consensus";

  return {
    data: {
      method_results: methodResults,
      consensus: {
        top_option: consensusOption?.[0] ?? null,
        agreement,
        vote_count: topOptions,
        total_methods: combinations,
      },
    },
    summary: consensusOption
      ? `${consensusOption[0]} wins ${consensusOption[1]}/${combinations} methods (${agreement})`
      : `No consensus across ${combinations} method(s)`,
  };
}

export async function generateReport(
  args: unknown,
  context: QiContext,
): Promise<ToolResult> {
  requireCapability(context, "mcda_report");
  requireCapability(context, "ipfs_store");

  const { governance, format } = GenerateReportArgsSchema.parse(args);
  const report = generateDecisionReport(
    governance as unknown as GovernanceArtifact,
    format,
  );
  const artifact = governance as unknown as GovernanceArtifact;
  const evidenceCid = await saveEvidence(context, {
    type: "mcda_decision_report",
    format,
    report,
    analysis_id: artifact.analysis_id,
    input_hash: artifact.input_hash,
    generated_at: getRequestTime(context),
  });

  return {
    data: {
      report,
      format,
      analysis_id: artifact.analysis_id,
    },
    evidence_cid: evidenceCid,
    summary: `${format} report generated for analysis ${artifact.analysis_id}`,
  };
}

function invalidValidationResult(error: ZodError): ToolResult {
  const errors = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });

  return {
    data: {
      valid: false,
      errors,
      warnings: [],
      config_summary: null,
    },
    summary: `Config invalid: ${errors.length} error(s)`,
  };
}

function summarizeConfig(config: MCDAConfig): Record<string, unknown> {
  return {
    option_count: config.options.length,
    criteria_count: config.criteria.length,
    weight_sum: config.criteria.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    ),
    normalization: config.normalization,
    aggregation: config.aggregation,
    scenario_count: config.scenarios.length,
  };
}

function buildConfigWarnings(config: MCDAConfig): string[] {
  const warnings: string[] = [];

  if (config.options.length === 1) {
    warnings.push("Single-option analysis: ranking is trivial");
  }
  if (config.criteria.length === 1) {
    warnings.push("Single-criterion analysis: result determined by one metric");
  }

  const zeroWeightCriteria = config.criteria.filter(
    (criterion) => criterion.weight === 0,
  );
  if (zeroWeightCriteria.length > 0) {
    warnings.push(
      `Zero-weight criteria contribute nothing: ${zeroWeightCriteria.map((criterion) => criterion.id).join(", ")}`,
    );
  }

  const maxWeight = Math.max(
    ...config.criteria.map((criterion) => criterion.weight),
  );
  if (maxWeight >= 0.95 && config.criteria.length > 1) {
    warnings.push("Extreme weight concentration (>=0.95): effectively single-criterion");
  }

  for (const criterion of config.criteria) {
    const values = config.options.map((option) => option.values[criterion.id]!);
    if (new Set(values).size === 1) {
      warnings.push(
        `Criterion '${criterion.id}' has identical values across all options`,
      );
    }
  }

  return warnings;
}

function requireCapability(context: QiContext, capability: string): void {
  const capabilities = context.ucan?.capabilities ?? [];
  const fragment = CAPABILITY_FRAGMENTS[capability];
  const authorized = capabilities.some(
    (candidate) =>
      candidate === capability ||
      candidate.includes(capability) ||
      Boolean(fragment && candidate.endsWith(fragment)),
  );

  if (!authorized) {
    throw new Error(`Missing required UCAN capability: ${capability}`);
  }
}

async function saveEvidence(
  context: QiContext,
  payload: Record<string, unknown>,
): Promise<string> {
  if (!context.ipfs?.save) {
    throw new Error("IPFS save capability is required for transition evidence");
  }

  return context.ipfs.save(stableStringify(payload));
}

function getRequestTime(context: QiContext): string {
  if (context.requestTime) {
    return context.requestTime;
  }

  const timestamp = new Date().toISOString();
  logWarn(
    context,
    `QiContext.requestTime missing; using runtime timestamp ${timestamp}`,
  );
  return timestamp;
}

function logInfo(context: QiContext, message: string): void {
  context.log?.info?.(message);
}

function logWarn(context: QiContext, message: string): void {
  context.log?.warn?.(message);
}
