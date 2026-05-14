import { sha256Hex, stableStringify } from "./engine.js";

import type { GovernanceArtifact, RankedOption } from "./types.js";

export function generateDecisionReport(
  governance: GovernanceArtifact,
  format: "markdown" | "json",
): string {
  verifyGovernanceArtifact(governance);

  if (format === "json") {
    return JSON.stringify(generateJsonSummary(governance), null, 2);
  }

  return generateMarkdownReport(governance);
}

export function verifyGovernanceArtifact(governance: GovernanceArtifact): void {
  const requiredFields: Array<keyof GovernanceArtifact> = [
    "analysis_id",
    "timestamp",
    "input_hash",
    "options_snapshot",
    "criteria_snapshot",
    "normalization_method",
    "aggregation_method",
    "results",
  ];

  for (const field of requiredFields) {
    if (governance[field] === undefined || governance[field] === null) {
      throw new Error(`Governance artifact missing required field: ${field}`);
    }
  }

  if (!Array.isArray(governance.results) || governance.results.length === 0) {
    throw new Error("Governance artifact must include at least one result");
  }
}

function generateMarkdownReport(governance: GovernanceArtifact): string {
  const results = governance.results;
  const topOption = results[0]!;
  const scoreRange = calculateScoreRange(results);
  const lines: string[] = [];

  lines.push("# Multi-Criteria Decision Analysis Report");
  lines.push("");
  lines.push(`**Analysis ID:** \`${governance.analysis_id}\``);
  lines.push(`**Timestamp:** ${governance.timestamp}`);
  lines.push(
    `**Method:** ${governance.aggregation_method} with ${governance.normalization_method} normalization`,
  );
  lines.push(`**Input Hash:** \`${governance.input_hash}\``);
  lines.push("");

  lines.push("## Executive Summary");
  lines.push("");
  lines.push(
    `Evaluated **${results.length} option(s)** against **${governance.criteria_snapshot.length} criterion/criteria**.`,
  );
  lines.push(
    `Recommended option: **${topOption.option_name}** with normalized score **${formatScore(topOption.normalized_score)}**.`,
  );
  lines.push(`Confidence: **${confidenceLabel(scoreRange)}**.`);
  lines.push("");

  lines.push("## Rankings");
  lines.push("");
  lines.push("| Rank | Option | Raw Score | Normalized Score |");
  lines.push("|---:|---|---:|---:|");
  for (const result of results) {
    lines.push(
      `| ${result.rank} | ${escapePipe(result.option_name)} | ${formatScore(result.raw_score)} | ${formatScore(result.normalized_score)} |`,
    );
  }
  lines.push("");

  lines.push("## Criterion Contributions");
  lines.push("");
  const criteriaById = Object.fromEntries(
    governance.criteria_snapshot.map((criterion) => [criterion.id, criterion]),
  );
  for (const result of results) {
    lines.push(`### ${result.option_name}`);
    lines.push("");
    lines.push("| Criterion | Weight | Type | Contribution |");
    lines.push("|---|---:|---|---:|");
    for (const [criterionId, contribution] of Object.entries(
      result.criterion_contributions,
    )) {
      const criterion = criteriaById[criterionId];
      lines.push(
        `| ${escapePipe(criterion?.name ?? criterionId)} | ${formatPercent(criterion?.weight ?? 0)} | ${criterion?.type ?? "unknown"} | ${formatScore(contribution)} |`,
      );
    }
    lines.push("");
  }

  if (governance.sensitivity_analysis) {
    lines.push("## Sensitivity Analysis");
    lines.push("");
    lines.push("| Criterion | Delta | Adjusted Weight | Rank Changes |");
    lines.push("|---|---:|---:|---|");
    for (const [criterionId, entries] of Object.entries(
      governance.sensitivity_analysis,
    )) {
      const criterion = criteriaById[criterionId];
      for (const entry of entries) {
        const changes = Object.entries(entry.rank_changes)
          .filter(([, delta]) => delta !== 0)
          .map(([optionId, delta]) => `${optionId}: ${delta > 0 ? "+" : ""}${delta}`)
          .join(", ");
        lines.push(
          `| ${escapePipe(criterion?.name ?? criterionId)} | ${formatSigned(entry.weight_change)} | ${formatPercent(entry.adjusted_weight)} | ${changes || "None"} |`,
        );
      }
    }
    lines.push("");
  }

  if (governance.what_if_scenarios) {
    lines.push("## What-If Scenarios");
    lines.push("");
    for (const [scenarioName, scenarioResults] of Object.entries(
      governance.what_if_scenarios,
    )) {
      lines.push(`### ${scenarioName}`);
      lines.push("");
      lines.push("| Rank | Option | Normalized Score |");
      lines.push("|---:|---|---:|");
      for (const result of scenarioResults) {
        lines.push(
          `| ${result.rank} | ${escapePipe(result.option_name)} | ${formatScore(result.normalized_score)} |`,
        );
      }
      lines.push("");
    }
  }

  lines.push("## Governance");
  lines.push("");
  lines.push(`- Analysis ID: \`${governance.analysis_id}\``);
  lines.push(`- Input hash: \`${governance.input_hash}\``);
  lines.push(`- Audit checksum: \`${sha256Hex(stableStringify(governance)).slice(0, 16)}\``);
  lines.push(
    "- Re-run the same configuration with the same timestamp to reproduce rankings and the input hash.",
  );
  lines.push("");

  return lines.join("\n");
}

function generateJsonSummary(governance: GovernanceArtifact): Record<string, unknown> {
  const topOption = governance.results[0]!;
  const scoreRange = calculateScoreRange(governance.results);

  return {
    analysis_id: governance.analysis_id,
    timestamp: governance.timestamp,
    input_hash: governance.input_hash,
    method: {
      normalization: governance.normalization_method,
      aggregation: governance.aggregation_method,
    },
    recommendation: {
      option_id: topOption.option_id,
      option_name: topOption.option_name,
      score: topOption.normalized_score,
      confidence: confidenceLabel(scoreRange).toLowerCase(),
    },
    rankings: governance.results.map((result) => ({
      rank: result.rank,
      option_id: result.option_id,
      option_name: result.option_name,
      score: result.normalized_score,
    })),
    audit: {
      options_count: governance.options_snapshot.length,
      criteria_count: governance.criteria_snapshot.length,
      has_sensitivity: Boolean(governance.sensitivity_analysis),
      has_scenarios: Boolean(governance.what_if_scenarios),
    },
  };
}

function calculateScoreRange(results: RankedOption[]): number {
  const scores = results.map((result) => result.normalized_score);
  return Math.max(...scores) - Math.min(...scores);
}

function confidenceLabel(scoreRange: number): "HIGH" | "MEDIUM" | "LOW" {
  if (scoreRange > 0.3) {
    return "HIGH";
  }
  if (scoreRange > 0.1) {
    return "MEDIUM";
  }
  return "LOW";
}

function formatScore(value: number): string {
  return value.toFixed(3);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|");
}
