import assert from "node:assert/strict";
import test from "node:test";

import { runProbabilisticAnalysis } from "../src/handlers.js";
import { runProbabilisticMCDA } from "../src/probabilistic.js";
import {
  ProbabilisticMCDAConfigSchema,
  type ProbabilisticMCDAConfig,
  type QiContext,
} from "../src/types.js";

function binaryConfig(): ProbabilisticMCDAConfig {
  return ProbabilisticMCDAConfigSchema.parse({
    criteria: [{ id: "quality", name: "Quality", weight: 1, utilities: { bad: 0, good: 1 } }],
    options: [
      {
        id: "a", name: "A", criteria: {
          quality: {
            distribution: { bad: 0.5, good: 0.5 },
            confidence: { value: 0.6, semantics: "distribution-concentration" },
          },
        },
      },
      {
        id: "b", name: "B", criteria: {
          quality: {
            distribution: { bad: 0.01, good: 0.99 },
            confidence: { value: 0.1, semantics: "jev-score-distribution-concentration" },
          },
        },
      },
    ],
    simulations: 1000,
    seed: "review-regression",
    autonomy_policy: { min_criterion_confidence: 0.5, critical_weight_threshold: 0.5 },
  });
}

test("confidence schema rejects unsupported semantics before storing evidence", async () => {
  const writes: string[] = [];
  const context: QiContext = {
    ucan: { capabilities: ["mcda_execute", "ipfs_store"] },
    ipfs: { save: async (data) => { writes.push(data.toString()); return "unused"; } },
    log: {},
  };
  for (const semantics of ["probability-correct", "provider-specific-score", "", " distribution-concentration "]) {
    const config = binaryConfig();
    const invalid = {
      ...config,
      options: config.options.map((option) => ({
        ...option,
        criteria: {
          quality: { ...option.criteria.quality!, confidence: { value: 1, semantics } },
        },
      })),
    };
    assert.equal(ProbabilisticMCDAConfigSchema.safeParse(invalid).success, false);
    await assert.rejects(() => runProbabilisticAnalysis({ config: invalid }, context), /semantics/);
  }
  assert.deepEqual(writes, []);
});

test("both declared concentration semantics remain supported", () => {
  assert.equal(ProbabilisticMCDAConfigSchema.safeParse(binaryConfig()).success, true);
});

test("confidence policy checks an option hidden by the maximum VOI representative", () => {
  const result = runProbabilisticMCDA(binaryConfig());
  assert.equal(result.critical_uncertainties[0]!.option_id, "a");
  assert.equal(result.critical_uncertainties[0]!.confidence, 0.6);
  assert.equal(result.policy.disposition, "gather_evidence");
  assert.equal(result.policy.evidence_requests.length, 1);
  assert.match(result.policy.evidence_requests[0]!, /option 'b'/);
  assert.match(result.policy.reasons[0]!, /criterion 'quality' on option 'b' confidence 0.1/);
});

test("confidence policy requests evidence for every failing assessment without discounting utility", () => {
  const config = binaryConfig();
  const originalOptions = runProbabilisticMCDA(config).options;
  config.options[0]!.criteria.quality!.confidence!.value = 0.2;
  const result = runProbabilisticMCDA(config);
  assert.equal(result.policy.evidence_requests.length, 2);
  assert.ok(result.policy.evidence_requests.some((request) => request.includes("option 'a'")));
  assert.ok(result.policy.evidence_requests.some((request) => request.includes("option 'b'")));
  assert.deepEqual(result.options, originalOptions);
});

test("confidence thresholds use unrounded values and include equality at the critical weight", () => {
  const config = binaryConfig();
  config.options[0]!.criteria.quality!.confidence!.value = 0.5;
  config.options[1]!.criteria.quality!.confidence!.value = 0.499999999;
  config.autonomy_policy!.critical_weight_threshold = 1;
  const result = runProbabilisticMCDA(config);
  assert.equal(result.policy.disposition, "gather_evidence");
  assert.equal(result.policy.evidence_requests.length, 1);
  assert.match(result.policy.evidence_requests[0]!, /option 'b'/);
  config.options[1]!.criteria.quality!.confidence!.value = 0.5;
  assert.equal(runProbabilisticMCDA(config).policy.disposition, "decide");
});

test("confidence policy respects the critical weight threshold", () => {
  const config = binaryConfig();
  config.criteria[0]!.weight = 0.4;
  config.criteria.push({ id: "cost", name: "Cost", weight: 0.6, utilities: { low: 1, high: 0 } });
  for (const option of config.options) {
    option.criteria.cost = { distribution: { low: 1, high: 0 } };
  }
  assert.equal(runProbabilisticMCDA(ProbabilisticMCDAConfigSchema.parse(config)).policy.disposition, "decide");
});

test("missing confidence uses entropy concentration for each option", () => {
  const config = binaryConfig();
  delete config.options[0]!.criteria.quality!.confidence;
  delete config.options[1]!.criteria.quality!.confidence;
  const result = runProbabilisticMCDA(config);
  assert.equal(result.policy.disposition, "gather_evidence");
  assert.equal(result.policy.evidence_requests.length, 1);
  assert.match(result.policy.evidence_requests[0]!, /option 'a'/);
});

function fixedUtilities(values: number[]): ProbabilisticMCDAConfig {
  const utilities = Object.fromEntries(values.map((value, index) => [`outcome-${index}`, value]));
  return ProbabilisticMCDAConfigSchema.parse({
    criteria: [{ id: "quality", name: "Quality", weight: 1, utilities }],
    options: values.map((_, index) => ({
      id: `option-${index}`, name: `Option ${index}`,
      criteria: {
        quality: {
          distribution: Object.fromEntries(values.map((_, outcome) => [`outcome-${outcome}`, Number(index === outcome)])),
        },
      },
    })),
    simulations: 100,
    seed: "tie-regression",
  });
}

for (const count of [2, 3, 4]) {
  test(`top-two mass is shared equally between ${count} identical options`, () => {
    const config = fixedUtilities(Array.from({ length: count }, () => 0.5));
    const result = runProbabilisticMCDA(config);
    for (const option of result.options) {
      assert.ok(Math.abs(option.probability_best - 1 / count) < 1e-8);
      assert.ok(Math.abs(option.probability_top_two - 2 / count) < 1e-8);
    }
    assert.ok(Math.abs(result.options.reduce((sum, option) => sum + option.probability_top_two, 0) - 2) < 1e-7);
    config.options.reverse();
    assert.deepEqual(runProbabilisticMCDA(config).options, result.options);
  });
}

test("a strict winner gets one top-two slot and tied runners-up share the remaining slot", () => {
  const result = runProbabilisticMCDA(fixedUtilities([1, 0.5, 0.5, 0.5, 0]));
  assert.equal(result.options[0]!.probability_top_two, 1);
  for (const option of result.options.slice(1, 4)) {
    assert.ok(Math.abs(option.probability_top_two - 1 / 3) < 1e-8);
  }
  assert.equal(result.options[4]!.probability_top_two, 0);
});

test("untied top-two membership is unchanged", () => {
  const result = runProbabilisticMCDA(fixedUtilities([1, 0.5, 0]));
  assert.deepEqual(result.options.map((option) => option.probability_top_two), [1, 1, 0]);
});

test("top-two cutoff partitions scores consistently at floating-point tolerance boundaries", () => {
  const result = runProbabilisticMCDA(fixedUtilities([1.000000000001, 1, 0]));
  assert.deepEqual(result.options.map((option) => option.probability_best), [1, 0, 0]);
  assert.deepEqual(result.options.map((option) => option.probability_top_two), [1, 1, 0]);
});

test("near-tie groups keep top-two probability at least as large as best probability", () => {
  const result = runProbabilisticMCDA(fixedUtilities([1.9e-12, 0.95e-12, 0, 0, 0, 0]));
  const byId = Object.fromEntries(result.options.map((option) => [option.option_id, option]));
  assert.deepEqual(result.options.map((option) => option.probability_best), [0.5, 0.5, 0, 0, 0, 0]);
  assert.equal(byId["option-0"]!.probability_top_two, 1);
  assert.equal(byId["option-1"]!.probability_top_two, 1);
  assert.ok(result.options.every((option) => option.probability_top_two >= option.probability_best));
  assert.equal(result.options.reduce((sum, option) => sum + option.probability_top_two, 0), 2);
});

function reverseRecordKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseRecordKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).reverse().map(([key, entry]) => [key, reverseRecordKeys(entry)]));
  }
  return value;
}

for (const explicitSeed of [true, false]) {
  test(`record key order does not affect ${explicitSeed ? "explicit" : "derived"} seeded results`, () => {
    const config = binaryConfig();
    config.options[0]!.metadata = { first: { x: 1, y: 2 }, second: "metadata" };
    if (!explicitSeed) delete config.seed;
    const reordered = ProbabilisticMCDAConfigSchema.parse(reverseRecordKeys(config));
    assert.deepEqual(runProbabilisticMCDA(reordered), runProbabilisticMCDA(config));
  });
}
