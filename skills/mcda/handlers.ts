/**
 * MCDA Qi Skill — TypeScript Handlers
 *
 * Wraps the hardened Python MCDA engine (v1.1) with Qi Flow Engine conformance:
 * - Zod schema validation on all inputs
 * - Stateless, deterministic operations
 * - IPFS evidence storage for transition tools
 * - ToolResult interface compliance
 *
 * Architecture: TypeScript handlers → JSON IPC → Python subprocess → ToolResult
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as crypto from "crypto";
import * as path from "path";

import {
  QiContext,
  ToolResult,
  ValidateConfigArgsSchema,
  RunAnalysisArgsSchema,
  RunSensitivityArgsSchema,
  RunScenariosArgsSchema,
  CompareMethodsArgsSchema,
  GenerateReportArgsSchema,
  MCDAConfig,
  type ValidateConfigArgs,
  type RunAnalysisArgs,
  type RunSensitivityArgs,
  type RunScenariosArgs,
  type CompareMethodsArgs,
  type GenerateReportArgs,
} from "./types";

const execFileAsync = promisify(execFile);

// Path to the Python engine (relative to skill root)
const PYTHON_ENGINE = path.resolve(__dirname, "../scripts/mcda_engine.py");
const PYTHON_REPORT = path.resolve(__dirname, "../scripts/generate_report.py");

// ============================================================================
// Python IPC Helper
// ============================================================================

/**
 * Execute the Python MCDA engine with a JSON config via stdin.
 * Returns parsed JSON output. Stateless: no temp files, no side effects.
 */
async function invokePythonEngine(
  config: MCDAConfig,
  context: QiContext
): Promise<Record<string, any>> {
  const configJson = JSON.stringify(config);

  try {
    const { stdout, stderr } = await execFileAsync(
      "python3",
      [PYTHON_ENGINE, "/dev/stdin"],
      {
        input: configJson,
        timeout: 30_000, // 30s timeout for large analyses
        maxBuffer: 10 * 1024 * 1024, // 10MB output buffer
      }
    );

    if (stderr) {
      context.log.warn(`Python engine stderr: ${stderr}`);
    }

    return JSON.parse(stdout);
  } catch (error: any) {
    // Map Python errors to clear messages
    if (error.code === "ETIMEDOUT") {
      throw new Error(
        "Analysis timed out after 30s. Consider reducing option/criteria count."
      );
    }
    if (error.stderr?.includes("ValueError")) {
      // Extract the Python ValueError message
      const match = error.stderr.match(/ValueError: (.+)/);
      throw new Error(match ? match[1] : `Validation error: ${error.stderr}`);
    }
    throw new Error(`MCDA engine execution failed: ${error.message}`);
  }
}

/**
 * Compute a deterministic content hash for governance artifact identification.
 */
function contentHash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Assess confidence level from score range.
 */
function assessConfidence(
  rankings: Array<{ normalized_score: number }>
): "high" | "medium" | "low" {
  if (rankings.length < 2) return "high";
  const scores = rankings.map((r) => r.normalized_score);
  const range = Math.max(...scores) - Math.min(...scores);
  if (range > 0.3) return "high";
  if (range > 0.1) return "medium";
  return "low";
}

/**
 * Assess sensitivity stability from sensitivity results.
 */
function assessStability(
  sensitivity: Record<string, Array<{ rank_changes: Record<string, number> }>>
): "stable" | "sensitive" | "fragile" {
  let maxChange = 0;
  let rankFlips = 0;

  for (const critResults of Object.values(sensitivity)) {
    for (const result of critResults) {
      for (const delta of Object.values(result.rank_changes)) {
        maxChange = Math.max(maxChange, Math.abs(delta));
        if (Math.abs(delta) > 0) rankFlips++;
      }
    }
  }

  if (maxChange === 0) return "stable";
  if (maxChange <= 1 && rankFlips <= 2) return "sensitive";
  return "fragile";
}

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * validate_config — Read-only, no auth required.
 *
 * Validates an MCDA configuration without executing the analysis.
 * Returns validation results with errors, warnings, and a config summary.
 */
export async function validateConfig(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // 1. Validate input schema
  const { config } = ValidateConfigArgsSchema.parse(args);

  context.log.info(
    `Validating config: ${config.options.length} options, ${config.criteria.length} criteria`
  );

  // 2. Perform validation checks
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check weight sum
  const weightSum = config.criteria.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(weightSum - 1.0) > 1e-6) {
    errors.push(`Criterion weights sum to ${weightSum}, must equal 1.0`);
  }

  // Check duplicate option IDs
  const optionIds = config.options.map((o) => o.id);
  const dupeOptions = optionIds.filter(
    (id, i) => optionIds.indexOf(id) !== i
  );
  if (dupeOptions.length > 0) {
    errors.push(`Duplicate option IDs: ${[...new Set(dupeOptions)].join(", ")}`);
  }

  // Check duplicate criterion IDs
  const criterionIds = config.criteria.map((c) => c.id);
  const dupeCriteria = criterionIds.filter(
    (id, i) => criterionIds.indexOf(id) !== i
  );
  if (dupeCriteria.length > 0) {
    errors.push(
      `Duplicate criterion IDs: ${[...new Set(dupeCriteria)].join(", ")}`
    );
  }

  // Check value completeness
  const critIdSet = new Set(criterionIds);
  for (const option of config.options) {
    const optKeys = new Set(Object.keys(option.values));
    const missing = [...critIdSet].filter((id) => !optKeys.has(id));
    const extra = [...optKeys].filter((id) => !critIdSet.has(id));
    if (missing.length > 0) {
      errors.push(`Option '${option.name}' missing values for: ${missing.join(", ")}`);
    }
    if (extra.length > 0) {
      errors.push(`Option '${option.name}' has extra values for: ${extra.join(", ")}`);
    }
  }

  // Check target-based normalization has targets
  if (config.normalization === "target-based") {
    const missingTargets = config.criteria
      .filter((c) => c.target === undefined || c.target === null)
      .map((c) => c.id);
    if (missingTargets.length > 0) {
      errors.push(
        `Target-based normalization requires target values for: ${missingTargets.join(", ")}`
      );
    }
  }

  // Warnings for suspicious configurations
  if (config.options.length === 1) {
    warnings.push("Single-option analysis: ranking is trivial");
  }
  if (config.criteria.length === 1) {
    warnings.push(
      "Single-criterion analysis: result determined by one metric"
    );
  }
  const zeroWeights = config.criteria.filter((c) => c.weight === 0);
  if (zeroWeights.length > 0) {
    warnings.push(
      `Zero-weight criteria contribute nothing: ${zeroWeights.map((c) => c.id).join(", ")}`
    );
  }
  const maxWeight = Math.max(...config.criteria.map((c) => c.weight));
  if (maxWeight >= 0.95 && config.criteria.length > 1) {
    warnings.push("Extreme weight concentration (≥0.95): effectively single-criterion");
  }

  const valid = errors.length === 0;

  return {
    data: {
      valid,
      errors,
      warnings,
      config_summary: {
        option_count: config.options.length,
        criteria_count: config.criteria.length,
        weight_sum: weightSum,
        normalization: config.normalization,
        aggregation: config.aggregation,
      },
    },
    summary: valid
      ? `Config valid: ${config.options.length} options, ${config.criteria.length} criteria`
      : `Config invalid: ${errors.length} error(s)`,
  };
}

/**
 * run_analysis — Transition tool, requires mcda_execute capability.
 *
 * Executes full MCDA analysis, generates governance artifact,
 * stores evidence to IPFS, returns CID.
 */
export async function runAnalysis(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // 1. Validate input schema
  const { config, timestamp } = RunAnalysisArgsSchema.parse(args);

  context.log.info(
    `Running MCDA analysis: ${config.options.length} options × ${config.criteria.length} criteria ` +
      `[${config.normalization} + ${config.aggregation}]`
  );

  // 2. Prepare config for Python engine with sensitivity enabled
  const engineConfig = {
    ...config,
    options: config.options.map((o) => ({
      id: o.id,
      name: o.name,
      values: o.values,
      metadata: o.metadata || {},
    })),
    criteria: config.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight,
      type: c.type,
      target: c.target ?? null,
    })),
    run_sensitivity: config.run_sensitivity,
    scenarios: config.scenarios || [],
  };

  // 3. Invoke Python engine (stateless subprocess)
  const result = await invokePythonEngine(engineConfig, context);

  // 4. Inject deterministic timestamp into governance artifact
  const ts = timestamp || context.requestTime;
  if (result.governance) {
    result.governance.timestamp = ts;
    // Recompute content-addressable analysis_id
    const inputHash = result.governance.input_hash;
    result.governance.analysis_id = contentHash(`mcda-v1.1-${inputHash}`).slice(
      0,
      16
    );
  }

  // 5. Assess confidence from rankings
  const rankings = result.summary?.rankings || [];
  const confidence = assessConfidence(rankings);

  // 6. Store governance artifact to IPFS (REQUIRED for transition tools)
  const evidenceCid = await context.ipfs.save(
    JSON.stringify({
      type: "mcda_governance_artifact",
      governance: result.governance,
      ucan: {
        issuer: context.ucan.issuer,
        audience: context.ucan.audience,
      },
      stored_at: ts,
    })
  );

  context.log.info(
    `Analysis complete. Evidence CID: ${evidenceCid}. ` +
      `Top: ${rankings[0]?.option} (${rankings[0]?.score?.toFixed(3)})`
  );

  // 7. Return ToolResult
  return {
    data: {
      rankings,
      governance: result.governance,
      confidence,
    },
    evidence_cid: evidenceCid,
    summary: rankings[0]
      ? `${rankings[0].option} ranked #1 (score: ${rankings[0].score?.toFixed(3)}, confidence: ${confidence})`
      : "Analysis produced no rankings",
  };
}

/**
 * run_sensitivity — Read-only, requires mcda_read capability.
 *
 * Performs sensitivity analysis by varying criterion weights.
 */
export async function runSensitivity(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // 1. Validate
  const { config, weight_deltas } = RunSensitivityArgsSchema.parse(args);

  context.log.info(
    `Running sensitivity analysis: ${config.criteria.length} criteria, ` +
      `deltas: [${weight_deltas.join(", ")}]`
  );

  // 2. Run baseline + sensitivity through Python engine
  const engineConfig = {
    ...config,
    options: config.options.map((o) => ({
      id: o.id,
      name: o.name,
      values: o.values,
      metadata: o.metadata || {},
    })),
    criteria: config.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight,
      type: c.type,
      target: c.target ?? null,
    })),
    run_sensitivity: true,
    scenarios: [],
  };

  const result = await invokePythonEngine(engineConfig, context);

  // 3. Assess stability
  const sensitivity = result.governance?.sensitivity_analysis || {};
  const stability = assessStability(sensitivity);
  const baselineRankings = result.summary?.rankings || [];

  return {
    data: {
      baseline_rankings: baselineRankings,
      sensitivity,
      stability_assessment: stability,
    },
    summary: `Rankings ${stability} under weight perturbations (${config.criteria.length} criteria tested)`,
  };
}

/**
 * run_scenarios — Read-only, requires mcda_read capability.
 *
 * Executes what-if scenarios with alternative configurations.
 */
export async function runScenarios(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // 1. Validate
  const { config, scenarios } = RunScenariosArgsSchema.parse(args);

  context.log.info(`Running ${scenarios.length} what-if scenario(s)`);

  // 2. Run through Python engine
  const engineConfig = {
    ...config,
    options: config.options.map((o) => ({
      id: o.id,
      name: o.name,
      values: o.values,
      metadata: o.metadata || {},
    })),
    criteria: config.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight,
      type: c.type,
      target: c.target ?? null,
    })),
    run_sensitivity: false,
    scenarios,
  };

  const result = await invokePythonEngine(engineConfig, context);

  const scenarioResults = result.governance?.what_if_scenarios || {};
  const scenarioNames = Object.keys(scenarioResults);

  return {
    data: {
      baseline_rankings: result.summary?.rankings || [],
      scenario_results: scenarioResults,
      scenarios_run: scenarioNames,
    },
    summary: `${scenarioNames.length} scenario(s) analyzed: ${scenarioNames.join(", ")}`,
  };
}

/**
 * compare_methods — Read-only, no auth required.
 *
 * Runs the same config across multiple method combinations.
 */
export async function compareMethods(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // 1. Validate
  const { config, normalizations, aggregations } =
    CompareMethodsArgsSchema.parse(args);

  const combinations = normalizations.length * aggregations.length;
  context.log.info(
    `Comparing ${combinations} method combination(s): ` +
      `${normalizations.join("+")} × ${aggregations.join("+")}`
  );

  // 2. Run each combination
  const results: Record<string, any> = {};
  const topOptions: Record<string, number> = {};

  for (const norm of normalizations) {
    for (const agg of aggregations) {
      const key = `${norm}_${agg}`;
      const engineConfig = {
        ...config,
        normalization: norm,
        aggregation: agg,
        options: config.options.map((o) => ({
          id: o.id,
          name: o.name,
          values: o.values,
          metadata: o.metadata || {},
        })),
        criteria: config.criteria.map((c) => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
          type: c.type,
          target: c.target ?? null,
        })),
        run_sensitivity: false,
        scenarios: [],
      };

      try {
        const result = await invokePythonEngine(engineConfig, context);
        const rankings = result.summary?.rankings || [];
        results[key] = rankings;

        if (rankings[0]) {
          const topId = rankings[0].option;
          topOptions[topId] = (topOptions[topId] || 0) + 1;
        }
      } catch (error: any) {
        results[key] = { error: error.message };
        context.log.warn(`Method ${key} failed: ${error.message}`);
      }
    }
  }

  // 3. Compute consensus
  const consensusOption = Object.entries(topOptions).sort(
    ([, a], [, b]) => b - a
  )[0];
  const consensus =
    consensusOption && consensusOption[1] === combinations
      ? "unanimous"
      : consensusOption
        ? "majority"
        : "no_consensus";

  return {
    data: {
      method_results: results,
      consensus: {
        top_option: consensusOption?.[0] || null,
        agreement: consensus,
        vote_count: topOptions,
        total_methods: combinations,
      },
    },
    summary: consensusOption
      ? `${consensusOption[0]} wins ${consensusOption[1]}/${combinations} methods (${consensus})`
      : `No consensus across ${combinations} methods`,
  };
}

/**
 * generate_report — Transition tool, requires mcda_report capability.
 *
 * Generates a decision report and stores to IPFS.
 */
export async function generateReport(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // 1. Validate
  const { governance, format } = GenerateReportArgsSchema.parse(args);

  context.log.info(
    `Generating ${format} report for analysis ${governance.analysis_id || "unknown"}`
  );

  // 2. Generate report via Python
  const reportJson = JSON.stringify(governance);
  let report: string;

  try {
    const { stdout } = await execFileAsync(
      "python3",
      [PYTHON_REPORT, "/dev/stdin", "--format", format],
      {
        input: reportJson,
        timeout: 15_000,
        maxBuffer: 5 * 1024 * 1024,
      }
    );
    report = stdout;
  } catch (error: any) {
    throw new Error(`Report generation failed: ${error.message}`);
  }

  // 3. Store report to IPFS (REQUIRED for transition tools)
  const evidenceCid = await context.ipfs.save(
    JSON.stringify({
      type: "mcda_decision_report",
      format,
      report,
      analysis_id: governance.analysis_id,
      input_hash: governance.input_hash,
      generated_at: context.requestTime,
    })
  );

  const optionCount = governance.results?.length || 0;
  const criteriaCount = governance.criteria_snapshot?.length || 0;

  return {
    data: {
      report,
      format,
      analysis_id: governance.analysis_id,
    },
    evidence_cid: evidenceCid,
    summary: `${format.charAt(0).toUpperCase() + format.slice(1)} report generated: ${optionCount} options, ${criteriaCount} criteria`,
  };
}
