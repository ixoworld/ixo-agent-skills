import assert from "node:assert/strict";
import test from "node:test";

import {
  compareMethods,
  generateReport,
  runAnalysis,
  runProbabilisticAnalysis,
  runSensitivity,
  validateConfig,
} from "../src/handlers.js";

import type {
  GovernanceArtifact,
  MCDAConfig,
  QiContext,
  RankedOption,
  SensitivityResult,
  ProbabilisticMCDAConfig,
} from "../src/types.js";

interface MockContext extends QiContext {
  writes: string[];
}

const baseConfig: MCDAConfig = {
  options: [
    {
      id: "alpha",
      name: "Alpha",
      values: { impact: 90, cost: 40, risk: 2 },
      metadata: { owner: "ops" },
    },
    {
      id: "beta",
      name: "Beta",
      values: { impact: 80, cost: 30, risk: 3 },
      metadata: {},
    },
    {
      id: "gamma",
      name: "Gamma",
      values: { impact: 60, cost: 20, risk: 1 },
      metadata: {},
    },
  ],
  criteria: [
    { id: "impact", name: "Impact", weight: 0.5, type: "benefit" },
    { id: "cost", name: "Cost", weight: 0.3, type: "cost" },
    { id: "risk", name: "Risk", weight: 0.2, type: "cost" },
  ],
  normalization: "min-max",
  aggregation: "weighted-sum",
  run_sensitivity: false,
  scenarios: [],
};

function createContext(
  capabilities = ["mcda_execute", "mcda_read", "mcda_report", "ipfs_store"],
): MockContext {
  const context: MockContext = {
    writes: [],
    requestTime: "2026-01-02T03:04:05.000Z",
    ucan: {
      capabilities,
      issuer: "did:example:issuer",
      audience: "did:example:audience",
    },
    ipfs: {
      save: async (data: string | Buffer) => {
        context.writes.push(data.toString());
        return `bafy-test-${context.writes.length}`;
      },
    },
    log: {},
  };

  return context;
}

test("validateConfig returns structured errors instead of throwing", async () => {
  const duplicatedConfig = {
    ...baseConfig,
    options: [
      ...baseConfig.options,
      { ...baseConfig.options[0]!, name: "Duplicate Alpha" },
    ],
  };

  const result = await validateConfig({ config: duplicatedConfig });
  const data = result.data as { valid: boolean; errors: string[] };

  assert.equal(data.valid, false);
  assert.match(data.errors.join("\n"), /Duplicate option IDs: alpha/);
});

test("runAnalysis ranks options deterministically and stores governance evidence", async () => {
  const context = createContext();
  const result = await runAnalysis({ config: baseConfig }, context);
  const data = result.data as {
    rankings: RankedOption[];
    governance: GovernanceArtifact;
    confidence: string;
  };

  assert.equal(result.evidence_cid, "bafy-test-1");
  assert.equal(data.rankings[0]?.option_id, "alpha");
  assert.equal(data.governance.input_hash.length, 64);
  assert.equal(data.governance.timestamp, context.requestTime);
  assert.equal(data.confidence, "high");
  assert.match(context.writes[0]!, /mcda_governance_artifact/);

  const repeat = await runAnalysis({ config: baseConfig }, createContext());
  const repeatData = repeat.data as { governance: GovernanceArtifact };
  assert.equal(repeatData.governance.input_hash, data.governance.input_hash);
  assert.equal(repeatData.governance.analysis_id, data.governance.analysis_id);
});

test("runAnalysis enforces transition capabilities", async () => {
  await assert.rejects(
    () => runAnalysis({ config: baseConfig }, createContext(["mcda_read"])),
    /Missing required UCAN capability: mcda_execute/,
  );
});

test("runSensitivity honors supplied weight deltas", async () => {
  const result = await runSensitivity(
    { config: baseConfig, weight_deltas: [0.1] },
    createContext(),
  );
  const data = result.data as {
    sensitivity: Record<string, SensitivityResult[]>;
    stability_assessment: string;
  };

  assert.equal(data.stability_assessment.length > 0, true);
  assert.deepEqual(
    Object.values(data.sensitivity).map((entries) => entries.length),
    [1, 1, 1],
  );
});

test("compareMethods returns method-specific rankings and consensus", async () => {
  const result = await compareMethods(
    {
      config: baseConfig,
      normalizations: ["min-max"],
      aggregations: ["weighted-sum", "topsis"],
    },
    createContext(),
  );
  const data = result.data as {
    consensus: { top_option: string | null; total_methods: number };
  };

  assert.equal(data.consensus.top_option, "alpha");
  assert.equal(data.consensus.total_methods, 2);
});

test("generateReport validates governance and stores report evidence", async () => {
  const context = createContext();
  const analysis = await runAnalysis(
    {
      config: {
        ...baseConfig,
        run_sensitivity: true,
        scenarios: [
          {
            name: "Cost focused",
            weight_overrides: { impact: 0.2, cost: 0.6, risk: 0.2 },
          },
        ],
      },
    },
    context,
  );
  const analysisData = analysis.data as { governance: GovernanceArtifact };
  const report = await generateReport(
    { governance: analysisData.governance, format: "markdown" },
    context,
  );
  const reportData = report.data as { report: string };

  assert.equal(report.evidence_cid, "bafy-test-2");
  assert.match(reportData.report, /Multi-Criteria Decision Analysis Report/);
  assert.match(reportData.report, /Cost focused/);
  assert.match(context.writes[1]!, /mcda_decision_report/);
});


const probabilisticConfig: ProbabilisticMCDAConfig = {
  criteria: [
    {
      id: "effectiveness",
      name: "Effectiveness",
      weight: 0.6,
      utilities: { poor: 0, adequate: 0.33, good: 0.67, excellent: 1 },
    },
    {
      id: "safety",
      name: "Safety",
      weight: 0.4,
      utilities: { poor: 0, good: 0.7, excellent: 1 },
    },
  ],
  options: [
    {
      id: "a",
      name: "A",
      criteria: {
        effectiveness: {
          distribution: { poor: 0.03, adequate: 0.12, good: 0.55, excellent: 0.3 },
          confidence: {
            value: 0.68,
            semantics: "jev-score-distribution-concentration",
          },
        },
        safety: {
          distribution: { poor: 0.05, good: 0.25, excellent: 0.7 },
          confidence: { value: 0.8, semantics: "distribution-concentration" },
        },
      },
    },
    {
      id: "b",
      name: "B",
      criteria: {
        effectiveness: {
          distribution: { poor: 0.05, adequate: 0.2, good: 0.55, excellent: 0.2 },
          confidence: { value: 0.7, semantics: "distribution-concentration" },
        },
        safety: {
          distribution: { poor: 0.02, good: 0.18, excellent: 0.8 },
          confidence: { value: 0.85, semantics: "distribution-concentration" },
        },
      },
    },
  ],
  simulations: 5000,
  seed: "mcda-test",
  autonomy_policy: {
    min_probability_best: 0.5,
    min_criterion_confidence: 0.5,
    critical_weight_threshold: 0.25,
  },
};

test("runProbabilisticAnalysis propagates distributions without confidence-weighting utility", async () => {
  const context = createContext();
  const result = await runProbabilisticAnalysis(
    { config: probabilisticConfig },
    context,
  );
  const data = result.data as {
    options: Array<{
      option_id: string;
      expected_utility: number;
      probability_best: number;
      utility_interval_5_95: [number, number];
    }>;
    simulations: number;
    policy: { disposition: string };
    evidence_model: { confidence: string };
  };

  assert.equal(result.evidence_cid, "bafy-test-1");
  assert.equal(data.simulations, 5000);
  assert.equal(data.options.length, 2);
  assert.ok(data.options[0]!.probability_best >= data.options[1]!.probability_best);
  assert.ok(data.options.every((option) => option.expected_utility >= 0 && option.expected_utility <= 1));
  assert.match(data.evidence_model.confidence, /not a preference weight/);
  assert.match(context.writes[0]!, /probabilistic_mcda_governance_artifact/);
});

test("probabilistic MCDA is reproducible with the same seed", async () => {
  const first = await runProbabilisticAnalysis(
    { config: probabilisticConfig },
    createContext(),
  );
  const second = await runProbabilisticAnalysis(
    { config: probabilisticConfig },
    createContext(),
  );
  assert.deepEqual(first.data.options, second.data.options);
});

test("low confidence on an influential criterion requests more evidence rather than discounting utility", async () => {
  const lowConfidence: ProbabilisticMCDAConfig = {
    ...probabilisticConfig,
    options: probabilisticConfig.options.map((option, index) =>
      index === 0
        ? {
            ...option,
            criteria: {
              ...option.criteria,
              effectiveness: {
                ...option.criteria.effectiveness!,
                confidence: {
                  value: 0.2,
                  semantics: "jev-score-distribution-concentration",
                },
              },
            },
          }
        : option,
    ),
    autonomy_policy: {
      min_criterion_confidence: 0.5,
      critical_weight_threshold: 0.5,
    },
  };

  const result = await runProbabilisticAnalysis(
    { config: lowConfidence },
    createContext(),
  );
  const data = result.data as {
    policy: { disposition: string; evidence_requests: string[] };
  };
  assert.equal(data.policy.disposition, "gather_evidence");
  assert.ok(data.policy.evidence_requests.some((request) => request.includes("Effectiveness")));
});
