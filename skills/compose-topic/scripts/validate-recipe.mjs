#!/usr/bin/env node
/**
 * Validate a Topic Recipe file the way the Portal does before it signs a release.
 * Usage: node scripts/validate-recipe.mjs FILE --did <recipe-domain-did> --version <recipeVersion> [--kind <kind>] [--json]
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_RECIPES = new Set(["project", "flow", "proposal", "evaluation", "claims", "research", "discussion", "incident"]);
const RECIPE_BY_KIND = {
  project: "project", task: "project", agent_task: "flow", proposal: "proposal", evaluation: "evaluation",
  claims: "claims", question: "research", discussion: "discussion", incident: "incident",
};
const AXES = new Set(["contract", "work", "topic", "verification", "decision", "effect", "settlement"]);
const PHASES = new Set(["forming", "working", "verifying", "deciding", "effecting", "settling", "complete", "dormant"]);
const COMMANDS = new Set([
  "topic.edit-setup", "topic.confirm-setup", "topic.record-assent", "topic.raise-dispute", "topic.resolve-dispute",
  "topic.start-work", "topic.answer-question", "topic.change-due-date", "topic.unblock", "topic.record-outcome",
  "topic.complete", "topic.close-project", "topic.request-action", "topic.confirm-action",
  "topic.record-verification", "topic.record-decision", "topic.record-settlement",
]);
const DID = /^did:ixo:entity:[0-9a-f]{32,}$/u;

const isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Load the pinned protocol artifact once and hand back its resolver and digest helpers.
 * Extracted under the skill's own `.cache` with relative paths: a `D:\…` path makes GNU tar on Windows look for a remote host.
 */
export async function loadProtocol() {
  const lock = JSON.parse(await readFile(join(ROOT, "references", "source-lock.json"), "utf8"));
  await mkdir(join(ROOT, ".cache"), { recursive: true });
  const temporary = await mkdtemp(join(ROOT, ".cache", "protocol-"));
  execFileSync("tar", ["-xzf", lock.topicProtocol.package.artifact, "-C", relative(ROOT, temporary)], { cwd: ROOT });
  const resolver = await import(pathToFileURL(join(temporary, "package/dist/src/shapes/resolver.js")).href);
  const canonical = await import(pathToFileURL(join(temporary, "package/dist/src/shapes/canonical.js")).href);
  return { ...resolver, ...canonical, dispose: () => rm(temporary, { recursive: true, force: true }) };
}

/** Static checks that need no protocol code: the shape of the file and the parts a recipe may use. */
export function staticIssues(recipe, expected) {
  const issues = [];
  if (!isRecord(recipe)) return ["file must be a JSON object"];
  if (recipe.version !== 1) issues.push("version must be 1");
  if (typeof recipe.code !== "string" || !recipe.code.trim()) issues.push("code is required");
  if (recipe.id !== expected.did) issues.push(`id must be the recipe domain DID ${expected.did}`);
  if (!DID.test(String(recipe.id))) issues.push("id must look like did:ixo:entity:<hex>");
  if (recipe.recipeVersion !== expected.version) issues.push(`recipeVersion must be ${expected.version}`);
  if (!BASE_RECIPES.has(recipe.baseRecipe)) issues.push(`baseRecipe must be one of ${[...BASE_RECIPES].join(", ")}`);
  if (expected.kind && RECIPE_BY_KIND[expected.kind] !== recipe.baseRecipe) issues.push(`baseRecipe must be ${RECIPE_BY_KIND[expected.kind]} for kind ${expected.kind}`);
  if (recipe.creates !== "draft") issues.push('creates must be "draft"');
  if (typeof recipe.label !== "string" || !recipe.label.trim()) issues.push("label is required");
  if (!isRecord(recipe.shape)) {
    issues.push("shape is required: a file without a shape overlay is a brief, not a recipe");
    return issues;
  }
  const shape = recipe.shape;
  if (shape.version !== 1) issues.push("shape.version must be 1");
  if (typeof shape.code !== "string" || !shape.code.trim()) issues.push("shape.code is required");
  for (const axis of Array.isArray(shape.axes) ? shape.axes : []) {
    if (!AXES.has(axis?.code)) issues.push(`axis ${axis?.code} is not a protocol axis`);
    if (!PHASES.has(axis?.phase)) issues.push(`axis ${axis?.code}: phase ${axis?.phase} is not a protocol phase`);
  }
  for (const transition of Array.isArray(shape.transitions) ? shape.transitions : []) {
    if (!COMMANDS.has(transition?.command)) issues.push(`transition ${transition?.code}: command ${transition?.command} has no Portal handler`);
    if (!PHASES.has(transition?.phase)) issues.push(`transition ${transition?.code}: phase ${transition?.phase} is not a protocol phase`);
    if (transition?.completesTopic === true) issues.push(`transition ${transition?.code}: the base recipe already provides the completing transition`);
    const presentation = transition?.presentation;
    for (const key of ["reasonCode", "actionLabelKey", "bodyKey", "purposeKey", "unlocksKey"]) {
      if (typeof presentation?.[key] !== "string") issues.push(`transition ${transition?.code}: presentation.${key} is required`);
    }
    if (typeof presentation?.priority !== "number") issues.push(`transition ${transition?.code}: presentation.priority is required`);
  }
  if (recipe.project !== undefined && expected.kind && expected.kind !== "project") issues.push("a project block is only allowed for kind project");
  if (expected.kind === "project" && (!isRecord(recipe.project) || recipe.project.compatibleKind !== "project")) {
    issues.push('a recipe for kind project needs a project block: { version: 1, compatibleKind: "project", compatibleShapeVersion: 1, allowedChildKinds, entryPoints, milestoneSuggestions }');
  }
  if (!isRecord(recipe.draft)) issues.push("warning: no draft block; the Topic Draft will open with empty text");
  return issues;
}

export async function validateRecipeText(text, expected, protocol) {
  let recipe;
  try {
    recipe = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [`not JSON: ${error.message}`], warnings: [] };
  }
  const all = staticIssues(recipe, expected);
  const errors = all.filter((issue) => !issue.startsWith("warning:"));
  const warnings = all.filter((issue) => issue.startsWith("warning:"));
  if (errors.length) return { ok: false, errors, warnings };
  const ref = protocol.topicRecipeRef(recipe);
  try {
    const effective = protocol.resolveEffectiveTopicShape({
      baseRecipe: recipe.baseRecipe,
      ...(expected.kind ? { kind: expected.kind } : {}),
      topicRecipeRef: ref,
      recipeRegistry: { [`${recipe.id}@${recipe.recipeVersion}`]: recipe },
    });
    return {
      ok: true,
      errors: [],
      warnings,
      topicRecipeRef: ref,
      byteDigest: `sha256:${createHash("sha256").update(text).digest("hex")}`,
      effectiveShapeDigest: effective.digest,
      axes: effective.shape.axes.map((axis) => axis.code),
      transitions: effective.shape.transitions.map((transition) => transition.code),
      sources: effective.sources,
    };
  } catch (error) {
    return { ok: false, errors: [`resolver: ${error.message}`], warnings };
  }
}

function parseArgs(argv) {
  const [file, ...rest] = argv;
  const options = { file, json: false };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--did") options.did = rest[++index];
    else if (argument === "--version") options.version = rest[++index];
    else if (argument === "--kind") options.kind = rest[++index];
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.file || !options.did || !options.version) {
    console.error("Usage: node scripts/validate-recipe.mjs FILE --did <recipe-domain-did> --version <recipeVersion> [--kind <kind>] [--json]");
    process.exit(2);
  }
  const protocol = await loadProtocol();
  try {
    const text = await readFile(options.file, "utf8");
    const result = await validateRecipeText(text, { did: options.did, version: options.version, kind: options.kind }, protocol);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      for (const warning of result.warnings) console.log(`! ${warning}`);
      if (result.ok) {
        console.log(`ok: topicRecipeRef ${JSON.stringify(result.topicRecipeRef)}`);
        console.log(`   bytes ${result.byteDigest}`);
        console.log(`   axes ${result.axes.join(", ")}`);
      } else for (const error of result.errors) console.log(`x ${error}`);
    }
    process.exit(result.ok ? 0 : 1);
  } finally {
    await protocol.dispose();
  }
}
