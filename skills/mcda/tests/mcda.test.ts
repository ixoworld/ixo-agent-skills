import assert from "node:assert/strict";
import test from "node:test";

import {
  compareMethods,
  generateReport,
  runAnalysis,
  runSensitivity,
  validateConfig,
} from "../src/handlers.js";

import type {
  GovernanceArtifact,
  MCDAConfig,
  QiContext,
  RankedOption,
  SensitivityResult,
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
