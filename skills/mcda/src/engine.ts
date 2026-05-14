import { createHash } from "crypto";

import type {
  Criterion,
  GovernanceArtifact,
  MCDAConfig,
  Option,
  RankedOption,
  Scenario,
  SensitivityResult,
} from "./types.js";

const EPSILON = 1e-10;
const SCORE_EPSILON = 1e-12;
const DEFAULT_SENSITIVITY_DELTAS = [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2];

export interface AnalysisOptions {
  timestamp?: string;
  includeSensitivity?: boolean;
  weightDeltas?: number[];
  scenarios?: Scenario[];
}

export interface AnalysisOutput {
  rankings: RankedOption[];
  governance: GovernanceArtifact;
  confidence: "high" | "medium" | "low";
  normalized_matrix: Record<string, Record<string, number>>;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function analyzeConfig(
  config: MCDAConfig,
  options: AnalysisOptions = {},
): AnalysisOutput {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const normalizedMatrix = normalizeMatrix(config);
  const { rawScores, contributions } = aggregateScores(config, normalizedMatrix);
  const rankings = rankOptions(config.options, rawScores, contributions);
  const inputSnapshot = canonicalInputSnapshot(config, options);
  const inputHash = sha256Hex(stableStringify(inputSnapshot));

  const governance: GovernanceArtifact = {
    analysis_id: sha256Hex(`mcda-v1.1:${inputHash}`).slice(0, 16),
    timestamp,
    input_hash: inputHash,
    method_config: {
      version: "1.1.0",
      normalization: config.normalization,
      aggregation: config.aggregation,
      weighted_product_epsilon: EPSILON,
      score_rounding_decimals: 12,
      sensitivity_deltas:
        options.weightDeltas ?? DEFAULT_SENSITIVITY_DELTAS,
    },
    options_snapshot: cloneOptions(config.options),
    criteria_snapshot: cloneCriteria(config.criteria),
    normalization_method: config.normalization,
    aggregation_method: config.aggregation,
    results: rankings,
  };

  const shouldRunSensitivity =
    options.includeSensitivity ?? config.run_sensitivity;
  if (shouldRunSensitivity) {
    governance.sensitivity_analysis = runSensitivityAnalysis(
      config,
      rankings,
      timestamp,
      options.weightDeltas ?? DEFAULT_SENSITIVITY_DELTAS,
    );
  }

  const scenarios = options.scenarios ?? config.scenarios;
  if (scenarios.length > 0) {
    governance.what_if_scenarios = runScenarioAnalysis(
      config,
      scenarios,
      timestamp,
    );
  }

  return {
    rankings,
    governance,
    confidence: assessConfidence(rankings),
    normalized_matrix: normalizedMatrix,
  };
}

export function runSensitivityAnalysis(
  config: MCDAConfig,
  baselineRankings: RankedOption[],
  timestamp: string,
  weightDeltas: number[] = DEFAULT_SENSITIVITY_DELTAS,
): Record<string, SensitivityResult[]> {
  const baselineRanks = Object.fromEntries(
    baselineRankings.map((ranking) => [ranking.option_id, ranking.rank]),
  );
  const results: Record<string, SensitivityResult[]> = {};

  for (const criterion of config.criteria) {
    results[criterion.id] = [];

    for (const delta of weightDeltas) {
      const criteria = adjustWeights(config.criteria, criterion.id, delta);
      const adjustedConfig: MCDAConfig = {
        ...config,
        criteria,
        run_sensitivity: false,
        scenarios: [],
      };
      const analysis = analyzeConfig(adjustedConfig, {
        timestamp,
        includeSensitivity: false,
        scenarios: [],
      });
      const newRankings = analysis.rankings.map(
        (ranking) => [ranking.option_id, ranking.rank] as [string, number],
      );
      const rankChanges: Record<string, number> = {};

      for (const ranking of analysis.rankings) {
        rankChanges[ranking.option_id] =
          ranking.rank - (baselineRanks[ranking.option_id] ?? ranking.rank);
      }

      results[criterion.id]!.push({
        criterion_id: criterion.id,
        weight_change: roundNumber(delta),
        adjusted_weight: roundNumber(
          criteria.find((item) => item.id === criterion.id)?.weight ??
            criterion.weight,
        ),
        new_rankings: newRankings,
        rank_changes: rankChanges,
      });
    }
  }

  return results;
}

export function runScenarioAnalysis(
  config: MCDAConfig,
  scenarios: Scenario[],
  timestamp: string,
): Record<string, RankedOption[]> {
  const results: Record<string, RankedOption[]> = {};

  for (const scenario of scenarios) {
    const scenarioConfig = applyScenario(config, scenario);
    results[scenario.name] = analyzeConfig(scenarioConfig, {
      timestamp,
      includeSensitivity: false,
      scenarios: [],
    }).rankings;
  }

  return results;
}

export function assessConfidence(
  rankings: RankedOption[],
): "high" | "medium" | "low" {
  if (rankings.length < 2) {
    return "high";
  }

  const scores = rankings.map((ranking) => ranking.normalized_score);
  const scoreRange = Math.max(...scores) - Math.min(...scores);

  if (scoreRange > 0.3) {
    return "high";
  }
  if (scoreRange > 0.1) {
    return "medium";
  }
  return "low";
}

export function assessStability(
  sensitivity: Record<string, SensitivityResult[]>,
): "stable" | "sensitive" | "fragile" {
  let maxChange = 0;
  let changedCases = 0;

  for (const criterionResults of Object.values(sensitivity)) {
    for (const result of criterionResults) {
      for (const delta of Object.values(result.rank_changes)) {
        const absoluteDelta = Math.abs(delta);
        maxChange = Math.max(maxChange, absoluteDelta);
        if (absoluteDelta > 0) {
          changedCases += 1;
        }
      }
    }
  }

  if (maxChange === 0) {
    return "stable";
  }
  if (maxChange <= 1 && changedCases <= 2) {
    return "sensitive";
  }
  return "fragile";
}

function normalizeMatrix(
  config: MCDAConfig,
): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};

  for (const option of config.options) {
    matrix[option.id] = {};
  }

  for (const criterion of config.criteria) {
    const values = config.options.map((option) => option.values[criterion.id]!);
    const normalized = normalizeCriterionValues(
      values,
      criterion,
      config.normalization,
    );

    for (const [index, option] of config.options.entries()) {
      matrix[option.id]![criterion.id] = roundNumber(normalized[index]!);
    }
  }

  return matrix;
}

function normalizeCriterionValues(
  values: number[],
  criterion: Criterion,
  method: MCDAConfig["normalization"],
): number[] {
  switch (method) {
    case "min-max":
      return minMaxNormalize(values, criterion.type);
    case "z-score":
      return zScoreNormalize(values, criterion.type);
    case "vector":
      return vectorNormalize(values, criterion.type);
    case "target-based":
      if (criterion.target === undefined) {
        throw new Error(`Target value required for criterion '${criterion.id}'`);
      }
      return targetNormalize(values, criterion.target);
    default:
      throw new Error(`Unsupported normalization method: ${method}`);
  }
}

function minMaxNormalize(
  values: number[],
  criterionType: Criterion["type"],
): number[] {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (Math.abs(maxValue - minValue) <= SCORE_EPSILON) {
    return values.map(() => 0.5);
  }

  return values.map((value) =>
    criterionType === "benefit"
      ? (value - minValue) / (maxValue - minValue)
      : (maxValue - value) / (maxValue - minValue),
  );
}

function zScoreNormalize(
  values: number[],
  criterionType: Criterion["type"],
): number[] {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;

  if (variance <= SCORE_EPSILON) {
    return values.map(() => 0.5);
  }

  const stdDev = Math.sqrt(variance);
  const zScores = values.map((value) => (value - mean) / stdDev);
  return minMaxNormalize(zScores, criterionType);
}

function vectorNormalize(
  values: number[],
  criterionType: Criterion["type"],
): number[] {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value ** 2, 0),
  );

  if (magnitude <= SCORE_EPSILON) {
    return values.map(() => 0.5);
  }

  const vectorScores = values.map((value) => value / magnitude);
  return minMaxNormalize(vectorScores, criterionType);
}

function targetNormalize(values: number[], target: number): number[] {
  const distances = values.map((value) => Math.abs(value - target));
  const maxDistance = Math.max(...distances);

  if (maxDistance <= SCORE_EPSILON) {
    return values.map(() => 1);
  }

  return distances.map((distance) => 1 - distance / maxDistance);
}

function aggregateScores(
  config: MCDAConfig,
  matrix: Record<string, Record<string, number>>,
): {
  rawScores: Record<string, number>;
  contributions: Record<string, Record<string, number>>;
} {
  switch (config.aggregation) {
    case "weighted-sum":
      return aggregateWeightedSum(config, matrix);
    case "weighted-product":
      return aggregateWeightedProduct(config, matrix);
    case "topsis":
      return aggregateTopsis(config, matrix);
    default:
      throw new Error(`Unsupported aggregation method: ${config.aggregation}`);
  }
}

function aggregateWeightedSum(
  config: MCDAConfig,
  matrix: Record<string, Record<string, number>>,
): {
  rawScores: Record<string, number>;
  contributions: Record<string, Record<string, number>>;
} {
  const rawScores: Record<string, number> = {};
  const contributions: Record<string, Record<string, number>> = {};

  for (const option of config.options) {
    rawScores[option.id] = 0;
    contributions[option.id] = {};

    for (const criterion of config.criteria) {
      const contribution = matrix[option.id]![criterion.id]! * criterion.weight;
      contributions[option.id]![criterion.id] = roundNumber(contribution);
      rawScores[option.id] = (rawScores[option.id] ?? 0) + contribution;
    }

    rawScores[option.id] = roundNumber(rawScores[option.id]!);
  }

  return { rawScores, contributions };
}

function aggregateWeightedProduct(
  config: MCDAConfig,
  matrix: Record<string, Record<string, number>>,
): {
  rawScores: Record<string, number>;
  contributions: Record<string, Record<string, number>>;
} {
  const rawScores: Record<string, number> = {};
  const contributions: Record<string, Record<string, number>> = {};

  for (const option of config.options) {
    let score = 1;
    contributions[option.id] = {};

    for (const criterion of config.criteria) {
      const normalizedValue = Math.max(matrix[option.id]![criterion.id]!, EPSILON);
      const factor = normalizedValue ** criterion.weight;
      score *= factor;
      contributions[option.id]![criterion.id] = roundNumber(
        matrix[option.id]![criterion.id]! * criterion.weight,
      );
    }

    rawScores[option.id] = roundNumber(score);
  }

  return { rawScores, contributions };
}

function aggregateTopsis(
  config: MCDAConfig,
  matrix: Record<string, Record<string, number>>,
): {
  rawScores: Record<string, number>;
  contributions: Record<string, Record<string, number>>;
} {
  const weighted: Record<string, Record<string, number>> = {};
  const rawScores: Record<string, number> = {};
  const contributions: Record<string, Record<string, number>> = {};
  const ideal: Record<string, number> = {};
  const antiIdeal: Record<string, number> = {};

  for (const option of config.options) {
    weighted[option.id] = {};
    contributions[option.id] = {};
    for (const criterion of config.criteria) {
      const value = matrix[option.id]![criterion.id]! * criterion.weight;
      weighted[option.id]![criterion.id] = value;
      contributions[option.id]![criterion.id] = roundNumber(value);
    }
  }

  for (const criterion of config.criteria) {
    const values = config.options.map(
      (option) => weighted[option.id]![criterion.id]!,
    );
    ideal[criterion.id] = Math.max(...values);
    antiIdeal[criterion.id] = Math.min(...values);
  }

  for (const option of config.options) {
    let distanceToIdeal = 0;
    let distanceToAntiIdeal = 0;

    for (const criterion of config.criteria) {
      const value = weighted[option.id]![criterion.id]!;
      distanceToIdeal += (value - ideal[criterion.id]!) ** 2;
      distanceToAntiIdeal += (value - antiIdeal[criterion.id]!) ** 2;
    }

    distanceToIdeal = Math.sqrt(distanceToIdeal);
    distanceToAntiIdeal = Math.sqrt(distanceToAntiIdeal);
    const denominator = distanceToIdeal + distanceToAntiIdeal;
    rawScores[option.id] =
      denominator <= SCORE_EPSILON
        ? 0.5
        : roundNumber(distanceToAntiIdeal / denominator);
  }

  return { rawScores, contributions };
}

function rankOptions(
  options: Option[],
  rawScores: Record<string, number>,
  contributions: Record<string, Record<string, number>>,
): RankedOption[] {
  const normalizedScores = normalizeRawScores(rawScores);
  const sorted = options
    .map((option) => ({
      option,
      rawScore: rawScores[option.id]!,
      normalizedScore: normalizedScores[option.id]!,
    }))
    .sort((left, right) => {
      const scoreDelta = right.rawScore - left.rawScore;
      if (Math.abs(scoreDelta) > SCORE_EPSILON) {
        return scoreDelta;
      }
      return left.option.id.localeCompare(right.option.id);
    });

  let previousScore: number | undefined;
  let currentRank = 0;

  return sorted.map((item, index) => {
    if (
      previousScore === undefined ||
      Math.abs(previousScore - item.rawScore) > SCORE_EPSILON
    ) {
      currentRank = index + 1;
      previousScore = item.rawScore;
    }

    return {
      rank: currentRank,
      option_id: item.option.id,
      option_name: item.option.name,
      raw_score: roundNumber(item.rawScore),
      normalized_score: roundNumber(item.normalizedScore),
      criterion_contributions: contributions[item.option.id]!,
      metadata: { ...(item.option.metadata ?? {}) },
    };
  });
}

function normalizeRawScores(
  rawScores: Record<string, number>,
): Record<string, number> {
  const entries = Object.entries(rawScores);

  if (entries.length === 1) {
    return { [entries[0]![0]]: 1 };
  }

  const values = entries.map(([, value]) => value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (Math.abs(maxValue - minValue) <= SCORE_EPSILON) {
    return Object.fromEntries(entries.map(([id]) => [id, 0.5]));
  }

  return Object.fromEntries(
    entries.map(([id, value]) => [
      id,
      roundNumber((value - minValue) / (maxValue - minValue)),
    ]),
  );
}

function adjustWeights(
  criteria: Criterion[],
  criterionId: string,
  delta: number,
): Criterion[] {
  if (criteria.length === 1) {
    return criteria.map((criterion) => ({ ...criterion, weight: 1 }));
  }

  const target = criteria.find((criterion) => criterion.id === criterionId);
  if (!target) {
    throw new Error(`Unknown criterion: ${criterionId}`);
  }

  const adjustedTargetWeight = clamp(target.weight + delta, 0, 1);
  const remainingWeight = 1 - adjustedTargetWeight;
  const otherCriteria = criteria.filter((criterion) => criterion.id !== criterionId);
  const otherWeightSum = otherCriteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );

  return criteria.map((criterion) => {
    if (criterion.id === criterionId) {
      return { ...criterion, weight: roundNumber(adjustedTargetWeight) };
    }

    const weight =
      otherWeightSum > SCORE_EPSILON
        ? (criterion.weight / otherWeightSum) * remainingWeight
        : remainingWeight / otherCriteria.length;
    return { ...criterion, weight: roundNumber(weight) };
  });
}

function applyScenario(config: MCDAConfig, scenario: Scenario): MCDAConfig {
  const options = config.options.map((option) => ({
    ...option,
    values: {
      ...option.values,
      ...(scenario.value_overrides?.[option.id] ?? {}),
    },
    metadata: { ...(option.metadata ?? {}) },
  }));

  let criteria = cloneCriteria(config.criteria);
  if (scenario.weight_overrides) {
    criteria = criteria.map((criterion) => ({
      ...criterion,
      weight:
        scenario.weight_overrides?.[criterion.id] ?? criterion.weight,
    }));

    const totalWeight = criteria.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    );
    if (totalWeight <= SCORE_EPSILON) {
      throw new Error(
        `Scenario '${scenario.name}' weights must sum to more than zero`,
      );
    }

    criteria = criteria.map((criterion) => ({
      ...criterion,
      weight: roundNumber(criterion.weight / totalWeight),
    }));
  }

  return {
    ...config,
    options,
    criteria,
    run_sensitivity: false,
    scenarios: [],
  };
}

function canonicalInputSnapshot(
  config: MCDAConfig,
  options: AnalysisOptions,
): Record<string, unknown> {
  const includeSensitivity = options.includeSensitivity ?? config.run_sensitivity;
  const scenarios = options.scenarios ?? config.scenarios;

  return {
    options: cloneOptions(config.options),
    criteria: cloneCriteria(config.criteria),
    normalization: config.normalization,
    aggregation: config.aggregation,
    run_sensitivity: includeSensitivity,
    ...(includeSensitivity
      ? { weight_deltas: options.weightDeltas ?? DEFAULT_SENSITIVITY_DELTAS }
      : {}),
    scenarios,
  };
}

function cloneOptions(options: Option[]): Option[] {
  return options.map((option) => ({
    id: option.id,
    name: option.name,
    values: { ...option.values },
    metadata: { ...(option.metadata ?? {}) },
  }));
}

function cloneCriteria(criteria: Criterion[]): Criterion[] {
  return criteria.map((criterion) => ({
    id: criterion.id,
    name: criterion.name,
    weight: criterion.weight,
    type: criterion.type,
    ...(criterion.target === undefined ? {} : { target: criterion.target }),
  }));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .filter((key) => object[key] !== undefined)
        .map((key) => [key, stableValue(object[key])]),
    );
  }

  return value;
}

function roundNumber(value: number, decimals = 12): number {
  return Number(value.toFixed(decimals));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
