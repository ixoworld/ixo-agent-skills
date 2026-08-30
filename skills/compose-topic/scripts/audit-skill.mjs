#!/usr/bin/env node
/**
 * Audit the Compose Topic skill package.
 *
 * Usage: node scripts/audit-skill.mjs [--json]
 */

import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateFile } from "./validate-composition.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(SCRIPT_DIR, "..");
const SUBSKILLS = [
  "compose-topic-task",
  "compose-topic-agent-task",
  "compose-topic-proposal",
  "compose-topic-evaluation",
  "compose-topic-claims",
  "compose-topic-question",
  "compose-topic-discussion",
  "compose-topic-incident",
];
const EXPECTED_FILES = [
  "SKILL.md",
  "AUDIT.md",
  "agents/openai.yaml",
  "schemas/topic-composition.schema.json",
  "schemas/topic-contract-draft.schema.json",
  "schemas/topic-refine-change-set.schema.json",
  "references/canvas-recipes.md",
  "references/protocol-adapter.md",
  "references/refine-existing-topic.md",
  "references/topic-contract-profile.md",
  "references/topic-kind-templates.md",
  "references/topic-recipe-selection.md",
  "references/topic-shape-pins.json",
  "references/security-review.md",
  "references/source-lock.json",
  "examples/decision.example.json",
  "examples/expert-service-flow.example.json",
  "examples/research-brief.example.json",
  "examples/team-project.example.json",
  "examples/verified-work-payment.example.json",
  "evals/evals.json",
  "scripts/package.json",
  "scripts/package-lock.json",
  "scripts/validate-composition.mjs",
  "scripts/validate-refine-change-set.mjs",
  "scripts/audit-skill.mjs",
  "tests/validate-composition.test.mjs",
  "tests/refine-change-set.test.mjs",
  "tests/audit-skill.test.mjs",
  ...SUBSKILLS.map((name) => `subskills/${name}/SKILL.md`),
];
const EXPECTED_SOURCE_COMMIT = "0407c6e7e3f77091260a08d586441e5323a0227f";
const EXPECTED_PACKAGE_SHASUM = "2e35955b3c5b374e023b8d317e1f3a14c0ffe72f";
const ACTUAL_SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bsk-[A-Za-z0-9_-]{32,}\b/u,
  /\bghp_[A-Za-z0-9]{30,}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
];

function finding(code, path, message, severity = "error") {
  return { code, severity, path, message };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(directory) {
  const result = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else result.push(path);
    }
  }
  await visit(directory);
  return result.sort();
}

function parseFrontmatter(markdown) {
  const lines = markdown.split(/\r?\n/u);
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end < 0) return null;
  const values = {};
  let pendingKey;
  for (const line of lines.slice(1, end)) {
    if (/^\s/u.test(line) && pendingKey !== undefined) {
      values[pendingKey] = `${values[pendingKey]} ${line.trim()}`.trim();
      continue;
    }
    const match = /^([A-Za-z0-9-]+):\s*(.*)$/u.exec(line);
    if (match === null) continue;
    const [, key, raw] = match;
    pendingKey = key;
    values[key] = raw === ">-" || raw === ">" ? "" : raw.replace(/^['"]|['"]$/gu, "");
  }
  return values;
}

function markdownLinks(content) {
  const links = [];
  const pattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/gu;
  for (const match of content.matchAll(pattern)) links.push(match[1]);
  return links;
}

function localJsonRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const child of value) localJsonRefs(child, refs);
    return refs;
  }
  if (typeof value !== "object" || value === null) return refs;
  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string" && !child.startsWith("#") && !child.includes("://")) refs.push(child.split("#", 1)[0]);
    else localJsonRefs(child, refs);
  }
  return refs;
}

async function auditStructure(findings) {
  for (const path of EXPECTED_FILES) {
    if (!(await exists(join(SKILL_ROOT, path)))) findings.push(finding("MISSING_FILE", path, "required package file is missing"));
  }
  const files = await listFiles(SKILL_ROOT);
  let totalBytes = 0;
  for (const file of files) {
    const info = await lstat(file);
    const path = relative(SKILL_ROOT, file);
    totalBytes += info.size;
    if (info.isSymbolicLink()) findings.push(finding("SYMLINK", path, "symlinks are not permitted in the skill package"));
    if (info.size > 1_000_000) findings.push(finding("LARGE_FILE", path, "individual skill files must remain below 1 MB"));
  }
  if (totalBytes > 4_000_000) findings.push(finding("LARGE_PACKAGE", "", "skill package must remain below 4 MB"));
}

async function auditFrontmatter(findings) {
  const content = await readFile(join(SKILL_ROOT, "SKILL.md"), "utf8");
  const frontmatter = parseFrontmatter(content);
  if (frontmatter === null) {
    findings.push(finding("FRONTMATTER", "SKILL.md", "valid YAML frontmatter is required"));
    return;
  }
  if (frontmatter.name !== "compose-topic") findings.push(finding("SKILL_NAME", "SKILL.md", "frontmatter name must equal compose-topic"));
  const description = frontmatter.description ?? "";
  if (description.length < 1 || description.length > 1024) findings.push(finding("DESCRIPTION", "SKILL.md", "description must contain 1 to 1024 characters"));
  if (frontmatter.license !== "Apache-2.0") findings.push(finding("LICENSE", "SKILL.md", "license must be Apache-2.0"));
  if (!/^compose-topic$/u.test(frontmatter.name ?? "")) findings.push(finding("FOLDER_NAME", "SKILL.md", "name must be lowercase alphanumeric with single hyphens"));
  for (const name of SUBSKILLS) {
    const path = `subskills/${name}/SKILL.md`;
    const nested = parseFrontmatter(await readFile(join(SKILL_ROOT, path), "utf8"));
    if (nested?.name !== name) findings.push(finding("SUBSKILL_NAME", path, `frontmatter name must equal ${name}`));
    if ((nested?.description ?? "").length === 0) findings.push(finding("SUBSKILL_DESCRIPTION", path, "description is required"));
    if (nested?.license !== "Apache-2.0") findings.push(finding("SUBSKILL_LICENSE", path, "license must be Apache-2.0"));
  }
}

async function auditLinks(findings) {
  const files = (await listFiles(SKILL_ROOT)).filter((file) => extname(file) === ".md");
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const raw of markdownLinks(content)) {
      if (raw.startsWith("#") || raw.includes("://") || raw.startsWith("mailto:")) continue;
      const path = raw.split("#", 1)[0];
      const target = resolve(dirname(file), path);
      if (!(await exists(target))) findings.push(finding("BROKEN_LINK", relative(SKILL_ROOT, file), `missing local target: ${raw}`));
    }
  }
}

async function auditJson(findings) {
  const files = (await listFiles(SKILL_ROOT)).filter((file) => extname(file) === ".json");
  for (const file of files) {
    const path = relative(SKILL_ROOT, file);
    let value;
    try {
      value = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      findings.push(finding("JSON_PARSE", path, error instanceof Error ? error.message : String(error)));
      continue;
    }
    if (path.startsWith("schemas/")) {
      if (value.$schema !== "https://json-schema.org/draft/2020-12/schema") findings.push(finding("SCHEMA_DIALECT", path, "must use Draft 2020-12"));
      if (typeof value.$id !== "string" || value.$id.length === 0) findings.push(finding("SCHEMA_ID", path, "must declare $id"));
      for (const reference of localJsonRefs(value)) {
        if (!(await exists(resolve(dirname(file), reference)))) findings.push(finding("SCHEMA_REF", path, `missing local schema reference: ${reference}`));
      }
    }
  }
}

async function auditSourceLock(findings) {
  const lockPath = join(SKILL_ROOT, "references/source-lock.json");
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  if (lock.skill !== "compose-topic") findings.push(finding("LOCK_SKILL", "references/source-lock.json", "skill must equal compose-topic"));
  if (lock.version !== 5) findings.push(finding("LOCK_VERSION", "references/source-lock.json", "source lock must use version 5"));
  if (lock.topicProtocol?.version !== "1.0.0-rc.2") findings.push(finding("LOCK_PROTOCOL", "references/source-lock.json", "Topic Protocol must be pinned to 1.0.0-rc.2"));
  if (lock.topicProtocol?.normativeBaseCommit !== EXPECTED_SOURCE_COMMIT) findings.push(finding("LOCK_BASE_COMMIT", "references/source-lock.json", `normative commit must equal ${EXPECTED_SOURCE_COMMIT}`));
  if (lock.topicProtocol?.contractProfile?.sourceCommit !== EXPECTED_SOURCE_COMMIT) findings.push(finding("LOCK_COMMIT", "references/source-lock.json", `source commit must equal ${EXPECTED_SOURCE_COMMIT}`));
  if (lock.topicProtocol?.contractProfile?.status !== "normative") findings.push(finding("LOCK_STATUS", "references/source-lock.json", "contract profile must be normative"));
  if (lock.topicProtocol?.contractProfile?.profile !== "qi.topic-contract-state/v4") findings.push(finding("LOCK_PROFILE", "references/source-lock.json", "contract profile must be qi.topic-contract-state/v4"));
  if (lock.topicProtocol?.contractProfile?.rootVersion !== 4 || lock.topicProtocol?.contractProfile?.bodyVersion !== 4 || lock.topicProtocol?.contractProfile?.stateVersion !== 4) findings.push(finding("LOCK_V4", "references/source-lock.json", "root, body, and state must use version 4"));
  if (lock.topicProtocol?.package?.shasum !== EXPECTED_PACKAGE_SHASUM) findings.push(finding("LOCK_PACKAGE_SHASUM", "references/source-lock.json", "published package shasum mismatch"));
  const sources = lock.topicProtocol?.sourceFiles ?? [];
  if (sources.length < 20) findings.push(finding("LOCK_SOURCE_COUNT", "references/source-lock.json", "must pin v4 contracts, Shape resolution/projection, and all seed Topic Recipes"));
  const sourcePaths = sources.map((item) => item.path);
  if (new Set(sourcePaths).size !== sourcePaths.length) findings.push(finding("LOCK_DUPLICATE_SOURCE", "references/source-lock.json", "source paths must be unique"));
  for (const item of sources) {
    if (!/^[0-9a-f]{40}$/u.test(item.blobSha ?? "")) findings.push(finding("LOCK_BLOB_SHA", "references/source-lock.json", `invalid blob SHA for ${item.path ?? "unknown"}`));
  }
  for (const [path, expected] of Object.entries(lock.localArtifacts ?? {})) {
    const absolute = join(SKILL_ROOT, path);
    if (!(await exists(absolute))) {
      findings.push(finding("LOCK_LOCAL_MISSING", path, "locked local artifact is missing"));
      continue;
    }
    const digest = sha256(await readFile(absolute));
    if (digest !== expected.sha256) findings.push(finding("LOCK_LOCAL_HASH", path, `SHA-256 mismatch: expected ${expected.sha256}, got ${digest}`));
  }
}

async function auditShapePins(findings) {
  const path = "references/topic-shape-pins.json";
  const pins = JSON.parse(await readFile(join(SKILL_ROOT, path), "utf8"));
  if (pins.version !== 2) findings.push(finding("PIN_VERSION", path, "must use catalog version 2"));
  if (pins.protocolVersion !== "1.0.0-rc.2") findings.push(finding("PIN_PROTOCOL", path, "must pin Topic Protocol 1.0.0-rc.2"));
  if (pins.sourceCommit !== EXPECTED_SOURCE_COMMIT) findings.push(finding("PIN_COMMIT", path, "must pin the published git head"));
  const expectedKinds = ["task", "agent_task", "proposal", "evaluation", "claims", "question", "discussion", "incident"];
  const expectedRecipes = ["research-brief", "agent-delivery", "verified-work-payment"];
  const kinds = Object.keys(pins.baseCompositions ?? {}).sort();
  const recipes = Object.keys(pins.topicRecipes ?? {}).sort();
  if (kinds.join() !== [...expectedKinds].sort().join()) findings.push(finding("PIN_KINDS", path, "must contain exactly the eight canonical Kind resolutions"));
  if (recipes.join() !== [...expectedRecipes].sort().join()) findings.push(finding("PIN_RECIPES", path, "must contain exactly the three seed Topic Recipes"));
  for (const [code, recipe] of Object.entries(pins.topicRecipes ?? {})) {
    if (recipe.creates !== "draft") findings.push(finding("PIN_RECIPE_DRAFT", path, `${code} must create a Draft`));
  }
}

async function auditExamples(findings) {
  const files = [
    "decision.example.json",
    "expert-service-flow.example.json",
    "research-brief.example.json",
    "team-project.example.json",
    "verified-work-payment.example.json",
  ];
  for (const name of files) {
    const report = await validateFile(join(SKILL_ROOT, "examples", name));
    for (const item of report.findings) findings.push({ ...item, path: `examples/${name}${item.path}` });
  }
}

async function auditEvals(findings) {
  const evals = JSON.parse(await readFile(join(SKILL_ROOT, "evals/evals.json"), "utf8"));
  if (evals.version !== "3.0.0") findings.push(finding("EVAL_VERSION", "evals/evals.json", "must equal 3.0.0"));
  if (evals.skill !== "compose-topic") findings.push(finding("EVAL_SKILL", "evals/evals.json", "must equal compose-topic"));
  const cases = evals.cases ?? [];
  if (cases.length < 36) findings.push(finding("EVAL_COVERAGE", "evals/evals.json", "must include all Kinds, recipes, Shapes, Portal progression, authority, inference, and security cases"));
  const ids = cases.map((item) => item.id);
  if (new Set(ids).size !== ids.length) findings.push(finding("EVAL_DUPLICATE", "evals/evals.json", "case IDs must be unique"));
  const required = ["sensitive-audience", "confidential-contract", "unresolved-agent", "ability-syntax", "selected-option", "achieved-outcome", "prompt-injection-attachment", "secret-input", "stale-revision", "legacy-v08", "legacy-v3", "adopt-existing-thread", "custom-kind", "partial-draft", "partial-activation-policy", "owner-authority-fallback", "confirmation-not-assent", "expiry-non-invention", "dispute-authority", "impact-only-risk", "virtual-thread", "refine-apply-existing", "refine-tool-unavailable", "refine-answer-question", "kind-task", "kind-agent-task", "kind-proposal", "kind-evaluation", "kind-claims", "kind-question", "kind-discussion", "kind-incident", "kind-job-profile", "recipe-research-brief", "recipe-agent-delivery", "recipe-verified-work-payment", "recipe-marketplace-future", "shape-digest-mismatch", "claim-singular-binding", "flow-action-boundary", "viewer-authority", "inference-boundary"];
  for (const id of required) if (!ids.includes(id)) findings.push(finding("EVAL_REQUIRED", "evals/evals.json", `missing security or protocol case: ${id}`));
}

async function auditScripts(findings) {
  for (const name of ["validate-composition.mjs", "validate-refine-change-set.mjs", "audit-skill.mjs"]) {
    const path = join(SKILL_ROOT, "scripts", name);
    const content = await readFile(path, "utf8");
    if (!content.startsWith("#!/usr/bin/env node")) findings.push(finding("SCRIPT_SHEBANG", `scripts/${name}`, "must start with a Node shebang"));
    if (!/export (?:async )?function main\(/u.test(content)) findings.push(finding("SCRIPT_MAIN", `scripts/${name}`, "must export main(options)"));
    if (!/process\.argv/u.test(content)) findings.push(finding("SCRIPT_CLI", `scripts/${name}`, "must provide a CLI entry point"));
  }
  const packageJson = JSON.parse(await readFile(join(SKILL_ROOT, "scripts/package.json"), "utf8"));
  for (const script of ["test", "audit", "validate"]) if (typeof packageJson.scripts?.[script] !== "string") findings.push(finding("PACKAGE_SCRIPT", "scripts/package.json", `missing npm script: ${script}`));
  if (Object.keys(packageJson.dependencies ?? {}).length > 0) findings.push(finding("RUNTIME_DEPENDENCY", "scripts/package.json", "audit scripts must remain dependency-free"));
}

async function auditSecrets(findings) {
  const files = await listFiles(SKILL_ROOT);
  for (const file of files) {
    const path = relative(SKILL_ROOT, file);
    if (![".md", ".json", ".mjs", ".yaml", ".yml"].includes(extname(file))) continue;
    const content = await readFile(file, "utf8");
    for (const pattern of ACTUAL_SECRET_PATTERNS) {
      if (pattern.test(content)) findings.push(finding("SECRET_PATTERN", path, "contains material resembling a live credential or private key"));
    }
  }
}

export async function main(options = {}) {
  const findings = [];
  await auditStructure(findings);
  await auditFrontmatter(findings);
  await auditLinks(findings);
  await auditJson(findings);
  await auditSourceLock(findings);
  await auditShapePins(findings);
  await auditExamples(findings);
  await auditEvals(findings);
  await auditScripts(findings);
  await auditSecrets(findings);
  findings.sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));
  return {
    auditor: "compose-topic-skill-audit",
    version: "3.0.0",
    root: options.root ?? SKILL_ROOT,
    ok: findings.length === 0,
    findingCount: findings.length,
    findings,
  };
}

async function cli() {
  const json = process.argv.slice(2).includes("--json");
  const unknown = process.argv.slice(2).filter((argument) => argument !== "--json");
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown[0]}`);
    process.exitCode = 2;
    return;
  }
  try {
    const report = await main();
    if (json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`Compose Topic skill audit: ${report.ok ? "PASSED" : "FAILED"}`);
      for (const item of report.findings) console.error(`- ${item.code} ${item.path}: ${item.message}`);
    }
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await cli();
}
