import { createHash } from "crypto";

import type {
  ProbabilisticMCDAConfig,
  ProbabilisticMCDAResult,
  ProbabilisticOptionResult,
} from "./types.js";

const EPSILON = 1e-12;

interface RNG {
  next(): number;
}

class SeededRng implements RNG {
  private state: number;

  constructor(seed: string) {
    const digest = createHash("sha256").update(seed).digest();
    this.state = digest.readUInt32LE(0) || 0x9e3779b9;
  }

  next(): number {
    // Mulberry32: deterministic simulation, not cryptographic randomness.
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function runProbabilisticMCDA(
  config: ProbabilisticMCDAConfig,
): ProbabilisticMCDAResult {
  const seed = config.seed ?? stableSeed(config);
  const rng = new SeededRng(seed);
  const optionIds = config.options.map((option) => option.id);
  const totals = Object.fromEntries(optionIds.map((id) => [id, [] as number[]]));
  const wins = Object.fromEntries(optionIds.map((id) => [id, 0]));
  const topTwo = Object.fromEntries(optionIds.map((id) => [id, 0]));

  for (let simulation = 0; simulation < config.simulations; simulation += 1) {
    const scores = config.options.map((option) => {
      let utility = 0;
      for (const criterion of config.criteria) {
        const assessment = option.criteria[criterion.id]!;
        const outcome = sampleOutcome(assessment.distribution, rng);
        utility += criterion.weight * criterion.utilities[outcome]!;
      }
      totals[option.id]!.push(utility);
      return { id: option.id, utility };
    });

    scores.sort(
      (a, b) => b.utility - a.utility || a.id.localeCompare(b.id),
    );
    const max = scores[0]!.utility;
    const winners = scores.filter(
      (entry) => Math.abs(entry.utility - max) <= EPSILON,
    );
    for (const winner of winners) {
      wins[winner.id] = (wins[winner.id] ?? 0) + 1 / winners.length;
    }

    const topIds = new Set(scores.slice(0, Math.min(2, scores.length)).map((x) => x.id));
    for (const id of topIds) topTwo[id] = (topTwo[id] ?? 0) + 1;
  }

  const options: ProbabilisticOptionResult[] = config.options
    .map((option) => {
      const samples = totals[option.id]!.sort((a, b) => a - b);
      const criterionExpectedUtilities = Object.fromEntries(
        config.criteria.map((criterion) => [
          criterion.id,
          expectedUtility(
            option.criteria[criterion.id]!.distribution,
            criterion.utilities,
          ),
        ]),
      );
      const expected = Object.entries(criterionExpectedUtilities).reduce(
        (sum, [criterionId, value]) =>
          sum +
          config.criteria.find((criterion) => criterion.id === criterionId)!
            .weight *
            value,
        0,
      );

      return {
        option_id: option.id,
        option_name: option.name,
        expected_utility: round(expected),
        probability_best: round((wins[option.id] ?? 0) / config.simulations),
        probability_top_two: round(
          (topTwo[option.id] ?? 0) / config.simulations,
        ),
        utility_interval_5_95: [
          round(percentile(samples, 0.05)),
          round(percentile(samples, 0.95)),
        ],
        criterion_expected_utilities: mapRounded(criterionExpectedUtilities),
      };
    })
    .sort(
      (a, b) =>
        b.probability_best - a.probability_best ||
        b.expected_utility - a.expected_utility ||
        a.option_id.localeCompare(b.option_id),
    );

  const criticalUncertainties = computeCriticalUncertainties(config);
  const policy = evaluateAutonomyPolicy(config, options, criticalUncertainties);

  return {
    seed,
    simulations: config.simulations,
    options,
    critical_uncertainties: criticalUncertainties,
    policy,
  };
}

function computeCriticalUncertainties(config: ProbabilisticMCDAConfig) {
  return config.criteria
    .map((criterion) => {
      const perOption = config.options.map((option) => {
        const assessment = option.criteria[criterion.id]!;
        const variance = utilityVariance(
          assessment.distribution,
          criterion.utilities,
        );
        const confidence =
          assessment.confidence?.value ??
          normalizedConcentration(assessment.distribution);
        const voiProxy = criterion.weight * Math.sqrt(variance) * (1 - confidence);
        return {
          option_id: option.id,
          variance,
          confidence,
          voi_proxy: voiProxy,
        };
      });
      const max = perOption.reduce(
        (best, current) =>
          current.voi_proxy > best.voi_proxy ? current : best,
        perOption[0]!,
      );
      return {
        criterion_id: criterion.id,
        criterion_name: criterion.name,
        weight: criterion.weight,
        option_id: max.option_id,
        utility_variance: round(max.variance),
        confidence: round(max.confidence),
        voi_proxy: round(max.voi_proxy),
      };
    })
    .sort((a, b) => b.voi_proxy - a.voi_proxy);
}

function evaluateAutonomyPolicy(
  config: ProbabilisticMCDAConfig,
  options: ProbabilisticOptionResult[],
  uncertainties: ProbabilisticMCDAResult["critical_uncertainties"],
): ProbabilisticMCDAResult["policy"] {
  const policy = config.autonomy_policy;
  if (!policy) {
    return {
      disposition: "decide",
      reasons: ["No autonomy policy supplied; result is analysis-only."],
      evidence_requests: [],
    };
  }

  const reasons: string[] = [];
  const evidenceRequests: string[] = [];
  const top = options[0]!;
  if (
    policy.min_probability_best !== undefined &&
    top.probability_best < policy.min_probability_best
  ) {
    reasons.push(
      `Top option P(best)=${top.probability_best} is below ${policy.min_probability_best}.`,
    );
  }

  const lowConfidence = uncertainties.filter(
    (entry) =>
      policy.min_criterion_confidence !== undefined &&
      entry.confidence < policy.min_criterion_confidence &&
      entry.weight >= (policy.critical_weight_threshold ?? 0),
  );
  for (const entry of lowConfidence) {
    reasons.push(
      `Critical criterion '${entry.criterion_id}' confidence ${entry.confidence} is below ${policy.min_criterion_confidence}.`,
    );
    evidenceRequests.push(
      `Acquire evidence that reduces uncertainty for '${entry.criterion_name}' on option '${entry.option_id}'.`,
    );
  }

  if (!reasons.length) {
    return { disposition: "decide", reasons: [], evidence_requests: [] };
  }
  return {
    disposition: evidenceRequests.length ? "gather_evidence" : "escalate",
    reasons,
    evidence_requests: evidenceRequests,
  };
}

export function expectedUtility(
  distribution: Record<string, number>,
  utilities: Record<string, number>,
): number {
  return Object.entries(distribution).reduce(
    (sum, [outcome, probability]) => sum + probability * utilities[outcome]!,
    0,
  );
}

export function utilityVariance(
  distribution: Record<string, number>,
  utilities: Record<string, number>,
): number {
  const mean = expectedUtility(distribution, utilities);
  return Object.entries(distribution).reduce(
    (sum, [outcome, probability]) =>
      sum + probability * (utilities[outcome]! - mean) ** 2,
    0,
  );
}

/**
 * Generic distribution concentration. Jev Choice/Score confidence should be
 * supplied directly when available; this is only a provider-neutral fallback.
 */
export function normalizedConcentration(
  distribution: Record<string, number>,
): number {
  const probabilities = Object.values(distribution);
  if (probabilities.length <= 1) return 1;
  const entropy = -probabilities.reduce(
    (sum, p) => (p > 0 ? sum + p * Math.log(p) : sum),
    0,
  );
  return Math.max(0, Math.min(1, 1 - entropy / Math.log(probabilities.length)));
}

/** Confidence-like concentration for a Jev Noul probability. */
export function noulConcentration(probabilityTrue: number): number {
  return Math.abs(2 * probabilityTrue - 1);
}

function sampleOutcome(distribution: Record<string, number>, rng: RNG): string {
  const draw = rng.next();
  let cumulative = 0;
  const entries = Object.entries(distribution);
  for (const [outcome, probability] of entries) {
    cumulative += probability;
    if (draw <= cumulative + EPSILON) return outcome;
  }
  return entries[entries.length - 1]![0];
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * p)),
  );
  return sorted[index]!;
}

function stableSeed(config: ProbabilisticMCDAConfig): string {
  return createHash("sha256")
    .update(JSON.stringify(config))
    .digest("hex")
    .slice(0, 16);
}

function mapRounded(values: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, round(value)]),
  );
}

function round(value: number): number {
  return Number(value.toFixed(8));
}
