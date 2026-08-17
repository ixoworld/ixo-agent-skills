#!/usr/bin/env node
/**
 * CLI wrapper over scripts/lib/graph-checks.mjs — deterministic structural checks for
 * outcome.causal-graph.v1 artifacts. The check logic lives in the lib so the graph-oracle
 * service (service/checks.mjs) answers from the exact same code.
 *
 * Usage:  node scripts/check-graph.mjs <causal-graph.json> [--out <findings.json>]
 * Output: findings in the validation-report.v1 finding shape, on stdout (or --out).
 * Exit:   0 = no blocking failures, 1 = blocking failure(s), 2 = unusable input.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { checkGraph } from "./lib/graph-checks.mjs";

function fail(msg) {
  process.stderr.write(`check-graph: ${msg}\n`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length === 0) fail("usage: check-graph.mjs <causal-graph.json> [--out <findings.json>]");
const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
const inputPath = args.filter((_, i) => outIdx === -1 || (i !== outIdx && i !== outIdx + 1))[0];

let graph;
try {
  graph = JSON.parse(readFileSync(inputPath, "utf8"));
} catch (e) {
  fail(`cannot read/parse ${inputPath}: ${e.message}`);
}

let result;
try {
  result = checkGraph(graph);
} catch (e) {
  fail(e.message);
}

const output = {
  schema: "outcome.check-graph-output.v1",
  input: inputPath,
  findings: result.findings,
  pass_summary: result.pass_summary,
};
const rendered = JSON.stringify(output, null, 2);
if (outPath) {
  writeFileSync(outPath, rendered + "\n");
  process.stderr.write(`check-graph: ${result.findings.length} findings (${result.pass_summary.blocking_count} blocking) → ${outPath}\n`);
} else {
  process.stdout.write(rendered + "\n");
}
process.exit(result.pass_summary.blocking_count > 0 ? 1 : 0);
