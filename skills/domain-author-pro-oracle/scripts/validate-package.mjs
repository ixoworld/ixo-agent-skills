import { createRequire } from "node:module";
import { readFile, realpath } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const base = fileURLToPath(new URL("../../domain-author/", import.meta.url));
const require = createRequire(resolve(base, "scripts/package.json"));
const Ajv = require("ajv/dist/2020");
const YAML = require("yaml");
const schema = JSON.parse(await readFile(new URL("../references/profile.schema.json", import.meta.url), "utf8"));
const check = new Ajv({ allErrors: true, strict: true }).compile(schema);

export function validateProfile(domain) {
  const errors = [];
  const profile = domain?.["x-professional-oracle"];
  if (!check(profile)) {
    return { ok: false, errors: check.errors.map((error) => ({ code: "professional-profile", path: error.instancePath, message: error.message })) };
  }
  if (domain.domain?.type !== "oracle") errors.push({ code: "professional-domain-type", message: "The professional profile requires domain.type oracle." });
  const documents = new Set((domain.documents?.entries ?? []).map((entry) => entry.id));
  const resources = new Set((domain.resources?.entries ?? []).map((entry) => entry.id));
  const methodIds = new Set();
  for (const method of profile.methods) {
    if (methodIds.has(method.id)) errors.push({ code: "duplicate-method", message: `Method ${method.id} is repeated.` });
    methodIds.add(method.id);
    if (!documents.has(method.documentRef)) errors.push({ code: "method-document", message: `Method ${method.id} has no indexed document.` });
    for (const resource of method.resourceRefs) {
      if (!resources.has(resource)) errors.push({ code: "method-resource", message: `Method ${method.id} refers to an unknown machine resource.` });
    }
  }
  const ruleRefs = new Set();
  for (const rule of profile.rulePractices) {
    if (ruleRefs.has(rule.ruleRef)) errors.push({ code: "duplicate-rule", message: `Rule ${rule.ruleRef} is repeated.` });
    ruleRefs.add(rule.ruleRef);
    if (!documents.has(rule.documentRef)) errors.push({ code: "rule-document", message: `Rule ${rule.ruleRef} has no indexed document.` });
  }
  return { ok: errors.length === 0, errors };
}

export async function validatePackage(root, { mode = "standalone", expectedClass } = {}) {
  if (!["standalone", "derived"].includes(mode)) throw new Error("Mode must be standalone or derived.");
  const canonicalRoot = await realpath(root);
  const args = ["--import", pathToFileURL(require.resolve("tsx")).href, resolve(base, "scripts/validate-render.ts"), canonicalRoot, "--mode", mode, "--json"];
  if (expectedClass) args.push("--expected-class", expectedClass);
  const result = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || !result.stdout.trim()) throw new Error("The canonical Domain Author validator could not run. Install its locked dependencies first.");
  const baseReport = JSON.parse(result.stdout);
  if (!baseReport.ok) return { ok: false, base: baseReport, professional: { ok: false, errors: [] } };
  const source = await readFile(resolve(canonicalRoot, "domain.md"), "utf8");
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---/.exec(source);
  const domain = YAML.parse(match[1], { maxAliasCount: 0 });
  const professional = validateProfile(domain);
  const paths = new Set();
  for (const document of domain.documents.entries) {
    if (typeof document.uri !== "string" || !document.uri.startsWith("file:./")) {
      professional.errors.push({ code: "local-document", message: `Document ${document.id} requires an exact file:./ path in this local authoring package.` });
      continue;
    }
    const local = document.uri.slice("file:./".length);
    if (!local || local.includes("\\") || isAbsolute(local) || local.split("/").some((part) => part === ".." || part === "." || !part)) {
      professional.errors.push({ code: "document-path", message: `Document ${document.id} has an unsafe path.` });
      continue;
    }
    if (paths.has(local.toLowerCase())) professional.errors.push({ code: "duplicate-document-path", message: `Document ${document.id} shares a local path.` });
    paths.add(local.toLowerCase());
    try {
      const target = await realpath(resolve(canonicalRoot, local));
      const confined = relative(canonicalRoot, target);
      if (confined.startsWith("..") || isAbsolute(confined)) throw new Error("outside package");
      await readFile(target, "utf8");
    } catch {
      professional.errors.push({ code: "document-unavailable", message: `Document ${document.id} is missing or outside the package.` });
    }
  }
  for (const resource of domain.resources?.entries ?? []) {
    if (!resource.uri?.startsWith("file:./")) continue;
    const local = resource.uri.slice("file:./".length);
    try {
      if (!local || local.includes("\\") || isAbsolute(local) || local.split("/").some((part) => part === ".." || part === "." || !part)) throw new Error("unsafe path");
      const target = await realpath(resolve(canonicalRoot, local));
      const confined = relative(canonicalRoot, target);
      if (confined.startsWith("..") || isAbsolute(confined)) throw new Error("outside package");
      const bytes = await readFile(target);
      if (resource.hash && createHash("sha256").update(bytes).digest("hex") !== resource.hash) {
        professional.errors.push({ code: "resource-integrity", message: `Resource ${resource.id} differs from its declared digest.` });
      }
    } catch {
      professional.errors.push({ code: "resource-unavailable", message: `Resource ${resource.id} is missing or outside the package.` });
    }
  }
  professional.ok = professional.errors.length === 0;
  return { ok: professional.ok, base: baseReport, professional };
}

export async function main({ root, ...options } = {}) {
  return validatePackage(root, options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [root, ...flags] = process.argv.slice(2);
  try {
    if (!root) throw new Error("Usage: validate-package.mjs <package-directory> [--mode standalone|derived] [--expected-class <did>]");
    const options = {};
    for (let index = 0; index < flags.length; index += 2) {
      if (!["--mode", "--expected-class"].includes(flags[index]) || !flags[index + 1]) throw new Error("Unknown or incomplete argument.");
      options[flags[index] === "--mode" ? "mode" : "expectedClass"] = flags[index + 1];
    }
    const report = await validatePackage(root, options);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
