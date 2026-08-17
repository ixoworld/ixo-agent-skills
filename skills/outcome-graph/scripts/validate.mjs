#!/usr/bin/env node
/**
 * Validates the outcome-graph schema suite and example artifacts.
 *
 * 1. Compiles every JSON Schema in skills/outcome-graph/schemas/ (draft 2020-12).
 * 2. Validates example artifacts against their declared schema.
 * 3. Parses the JSON-LD context and every JSON file for well-formedness.
 *
 * Usage: node scripts/validate.mjs
 * Exit:  0 all green, 1 any failure.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaDir = join(root, "skills/outcome-graph/schemas");

// strictTuples off: VC 2.0 @context/type are open tuples (fixed prefix, unbounded tail),
// which ajv's strict-tuple heuristic cannot express. Everything else stays strict.
const ajv = new Ajv2020({ strict: true, strictTuples: false, allErrors: true, allowUnionTypes: true });
addFormats(ajv);

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => { failures++; console.error(`  ✗ ${msg}`); };

// ---- 1. Compile all schemas ----------------------------------------------
console.log("Compiling schemas:");
const schemaFiles = readdirSync(schemaDir).filter((f) => f.endsWith(".schema.json") || f === "common.defs.v1.json");
const schemas = {};
for (const f of schemaFiles) {
  try {
    const s = JSON.parse(readFileSync(join(schemaDir, f), "utf8"));
    schemas[f] = s;
    ajv.addSchema(s, f); // register under filename so relative $refs resolve
  } catch (e) {
    bad(`${f}: parse failed — ${e.message}`);
  }
}
for (const [f, s] of Object.entries(schemas)) {
  try {
    ajv.getSchema(f) ?? ajv.compile(s);
    ok(`${f}`);
  } catch (e) {
    bad(`${f}: compile failed — ${e.message}`);
  }
}

// ---- 2. Validate examples -------------------------------------------------
const cases = [
  ["examples/clean-water/run-brief.json", "run-brief.schema.json"],
  ["examples/clean-water/toc-extraction.json", "toc-extraction.schema.json"],
  ["examples/clean-water/causal-graph.json", "causal-graph.schema.json"],
  ["examples/clean-water/evidence-graph.json", "evidence-link.schema.json"],
  ["examples/clean-water/validation-report.json", "validation-report.schema.json"],
  ["examples/clean-water/geo-boundary.json", "geo-boundary.schema.json"],
];
console.log("Validating examples:");
for (const [dataPath, schemaFile] of cases) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(root, dataPath), "utf8"));
  } catch (e) {
    bad(`${dataPath}: parse failed — ${e.message}`);
    continue;
  }
  const validate = ajv.getSchema(schemaFile);
  if (!validate) { bad(`${schemaFile}: no compiled schema`); continue; }
  if (validate(data)) {
    ok(`${dataPath} ⊨ ${schemaFile}`);
  } else {
    bad(`${dataPath} fails ${schemaFile}:`);
    for (const err of validate.errors.slice(0, 12)) {
      console.error(`      ${err.instancePath || "/"} ${err.message}`);
    }
  }
}

// ---- 3. Engine contract test: rubric examples ⊨ vendored live schema ------
// The vendored schema is the engine's own served GET /v1/rubric-schema (see
// schemas/vendor/README.md). It drops four Zod-refine rules, re-checked manually below —
// passing here is necessary but only the pair is sufficient.
console.log("Engine rubric contract:");
const RUBRIC_EXAMPLES = [
  "examples/clean-water/rubric.json",
  "examples/clean-water/rubric-site-visit.json",
  // The v2-pending twin parses and validates today (the geo vocabulary is declared in the
  // format); only the BINDER rejects it (BIND_V2_SURFACE) — which is exactly rfc-005's
  // point. Do not anchor it until the engine activates the surface.
  "examples/clean-water/v2-pending/rubric-site-visit.json",
];
try {
  const vendored = JSON.parse(readFileSync(join(schemaDir, "vendor/evals-engine-rubric.schema.json"), "utf8"));
  const validateRubric = new Ajv2020({ strict: false, allErrors: true }).compile(vendored);
  for (const rf of RUBRIC_EXAMPLES) {
    const doc = JSON.parse(readFileSync(join(root, rf), "utf8"));
    if (validateRubric(doc)) {
      ok(`${rf} ⊨ vendored evals-engine rubric schema`);
    } else {
      bad(`${rf} fails the vendored engine schema:`);
      for (const err of validateRubric.errors.slice(0, 12)) {
        console.error(`      ${err.instancePath || "/"} ${err.message}`);
      }
    }
    for (const msg of checkZodOnlyRules(doc.rubric ?? {})) bad(`${rf}: ${msg}`);
    if (checkZodOnlyRules(doc.rubric ?? {}).length === 0) ok(`${rf} passes Zod-refine-only rules (thresholds, quorum, atLeast, unique bands)`);
  }
} catch (e) {
  bad(`vendored rubric schema: ${e.message}`);
}

/** The four rules the engine enforces in Zod that z.toJSONSchema drops (vendor/README.md). */
function checkZodOnlyRules(rubric) {
  const msgs = [];
  const s = rubric.scoring;
  if (s) {
    if (s.partialFloor !== undefined && !(s.approveAt > s.partialFloor))
      msgs.push(`threshold order: approveAt (${s.approveAt}) must be > partialFloor (${s.partialFloor})`);
    if (s.reviewFloor !== undefined && !(s.approveAt > s.reviewFloor))
      msgs.push(`threshold order: approveAt (${s.approveAt}) must be > reviewFloor (${s.reviewFloor})`);
    if (s.partialFloor !== undefined && s.reviewFloor !== undefined && !(s.partialFloor >= s.reviewFloor))
      msgs.push(`threshold order: partialFloor (${s.partialFloor}) must be >= reviewFloor (${s.reviewFloor})`);
    if (s.method === "quorum" && s.quorum && !(s.quorum.need <= s.quorum.of))
      msgs.push(`quorum.need (${s.quorum.need}) must be <= quorum.of (${s.quorum.of})`);
  }
  const u = rubric.unique;
  if (u?.thresholds && !(u.thresholds.rejectAtBps >= u.thresholds.reviewAtBps))
    msgs.push(`unique thresholds: rejectAtBps must be >= reviewAtBps`);
  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
    if (node && typeof node === "object") {
      if (node["@type"] === "Condition" && Array.isArray(node.of) && typeof node.atLeast === "number" && !(node.atLeast <= node.of.length))
        msgs.push(`${path}: atLeast (${node.atLeast}) must be <= of.length (${node.of.length})`);
      for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    }
  };
  walk(rubric, "rubric");
  return msgs;
}

// ---- 4. JSON-LD context + remaining JSON well-formedness ------------------
console.log("Well-formedness:");
for (const f of [
  "skills/outcome-graph/schemas/outcome-graph.context.v1.jsonld",
  ".claude-plugin/plugin.json",
  "examples/clean-water/claim-form.catalog.json",
  "examples/clean-water/claim-form.site-visit.catalog.json",
  "examples/clean-water/v2-pending/claim-form.site-visit.catalog.json",
  "scripts/lib/geo-vectors.json",
]) {
  try {
    JSON.parse(readFileSync(join(root, f), "utf8"));
    ok(f);
  } catch (e) {
    bad(`${f}: ${e.message}`);
  }
}

console.log(failures === 0 ? "\nAll validation checks passed." : `\n${failures} validation failure(s).`);
process.exit(failures === 0 ? 0 : 1);
