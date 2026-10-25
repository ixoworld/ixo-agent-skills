import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { validatePackage, validateProfile } from "../scripts/validate-package.mjs";
import { generateFixtures, protocol } from "./generate-fixtures.mjs";

const require = createRequire(new URL("../../domain-author/scripts/package.json", import.meta.url));
const YAML = require("yaml");
const examples = fileURLToPath(new URL("../examples/evidence-service/", import.meta.url));
const base = fileURLToPath(new URL("../../domain-author/", import.meta.url));
const parse = (source) => YAML.parse(/^---\n([\s\S]*?)\n---/.exec(source)[1]);
const fixture = parse(await readFile(join(examples, "standalone/domain.md"), "utf8"));

test("standalone and derived professional packages pass canonical rc.3 and profile validation", async () => {
  for (const mode of ["standalone", "derived"]) {
    const report = await validatePackage(join(examples, mode), { mode, ...(mode === "derived" ? { expectedClass: protocol } : {}) });
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.base.validator_version, "1.0.0-rc.3");
    assert.equal(report.base.profile, "authoring_draft");
    assert.equal(report.base.warnings, 0);
  }
});

test("an unimplemented observation practice does not make a package invalid", () => {
  const domain = structuredClone(fixture);
  domain["x-professional-oracle"].rulePractices.forEach((rule) => { rule.implementationStatus = "unimplemented"; rule.evidenceRefs = []; });
  assert.equal(validateProfile(domain).ok, true);
});

test("profile array bounds fit the existing QiForge document parser", () => {
  const domain = structuredClone(fixture);
  const profile = domain["x-professional-oracle"];
  const rule = profile.rulePractices[0];
  profile.rulePractices = Array.from({ length: 64 }, (_, i) => ({ ...rule, ruleRef: `urn:rule:${i}` }));
  profile.serviceScope.protocols = Array.from({ length: 64 }, (_, i) => `did:ixo:entity:protocol-${i}`);
  assert.equal(validateProfile(domain).ok, true);
  profile.rulePractices.push({ ...rule, ruleRef: "urn:rule:65" });
  assert.equal(validateProfile(domain).ok, false);
  profile.rulePractices.pop();
  profile.serviceScope.protocols.push("did:ixo:entity:protocol-65");
  assert.equal(validateProfile(domain).ok, false);
});

test("profile accepts either runtime without requiring the other", () => {
  for (const target of ["qiforge", "decision-oracle"]) {
    const domain = structuredClone(fixture);
    domain["x-professional-oracle"].runtimeTargets = [target];
    assert.equal(validateProfile(domain).ok, true);
  }
});

test("profile rejects blocking modes and implicit model assessments", () => {
  for (const observation of [ { mode: "enforce", modelAssessments: false }, { mode: "advisory", modelAssessments: true }, { mode: "advisory", modelAssessments: false, blockOnFailure: true } ]) {
    const domain = structuredClone(fixture);
    domain["x-professional-oracle"].observation = observation;
    assert.equal(validateProfile(domain).ok, false);
  }
});

test("profile cannot supply its own adoption authority", () => {
  const domain = structuredClone(fixture);
  domain["x-professional-oracle"].approvalPolicy = { threshold: 0, selfApprove: true };
  assert.equal(validateProfile(domain).ok, false);
});

test("method and rule references must resolve stable document and resource IDs", () => {
  for (const mutate of [
    (domain) => { domain["x-professional-oracle"].methods[0].documentRef = "missing"; },
    (domain) => { domain["x-professional-oracle"].methods[0].resourceRefs = ["missing"]; },
    (domain) => { domain["x-professional-oracle"].rulePractices[0].documentRef = "missing"; },
  ]) {
    const domain = structuredClone(fixture);
    mutate(domain);
    assert.equal(validateProfile(domain).ok, false);
  }
});

test("multiple methods may share a role but cannot reuse a method ID", () => {
  const domain = structuredClone(fixture);
  domain["x-professional-oracle"].methods.push({ id: "corroboration", documentRef: "methods", resourceRefs: [] });
  assert.equal(validateProfile(domain).ok, true);
  domain["x-professional-oracle"].methods[1].id = domain["x-professional-oracle"].methods[0].id;
  assert.equal(validateProfile(domain).ok, false);
});

test("advisory profile does not invalidate existing execution declarations", () => {
  const domain = structuredClone(fixture);
  domain.constitution.execution.mode = "hybrid";
  assert.equal(validateProfile(domain).ok, true);
});

async function changedPackage(run) {
  const root = await mkdtemp(join(tmpdir(), "professional-oracle-"));
  try {
    await cp(join(examples, "standalone"), root, { recursive: true });
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test("missing SOP is a package validation error, without asserting a runtime policy", async () => {
  await changedPackage(async (root) => {
    await rm(join(root, "operations.md"));
    const report = await validatePackage(root);
    assert.equal(report.ok, false);
    assert.ok(report.professional.errors.some((error) => error.code === "document-unavailable"));
  });
});

test("changed machine resource bytes cannot retain an old digest", async () => {
  await changedPackage(async (root) => {
    await writeFile(join(root, "resources/fact.schema.json"), '{"type":"string"}\n');
    const report = await validatePackage(root);
    assert.equal(report.ok, false);
    assert.ok(report.professional.errors.some((error) => error.code === "resource-integrity"));
  });
});

test("parent-directory document references are rejected", async () => {
  await changedPackage(async (root) => {
    const domain = structuredClone(fixture);
    domain.documents.entries[0].uri = "file:./../outside.md";
    const body = (await readFile(join(root, "domain.md"), "utf8")).split(/\n---\n/)[1];
    await writeFile(join(root, "domain.md"), `---\n${YAML.stringify(domain)}---\n${body}`);
    const report = await validatePackage(root);
    assert.equal(report.ok, false);
    assert.ok(report.professional.errors.some((error) => error.code === "document-path"));
  });
});

test("invalid base constitutional identity is not hidden by a valid extension", async () => {
  await changedPackage(async (root) => {
    const source = await readFile(join(root, "domain.md"), "utf8");
    await writeFile(join(root, "domain.md"), source.replace(/subject: .*/, "subject: urn:uuid:00000000-0000-4000-8000-000000000000"));
    const report = await validatePackage(root);
    assert.equal(report.ok, false);
    assert.ok(report.base.findings.some((finding) => finding.code === "constitution-required"));
  });
});

test("derived bytes render from pinned templates without importing protocol authority", async () => {
  const manifest = JSON.parse(await readFile(join(examples, "templates/manifest.json"), "utf8"));
  const derived = parse(await readFile(join(examples, "derived/domain.md"), "utf8"));
  const provenance = JSON.parse(await readFile(join(examples, "derived/provenance.json"), "utf8"));
  assert.equal(manifest.bundles.length, 1);
  assert.equal(manifest.bundles[0].derived_type, "oracle");
  for (const file of manifest.bundles[0].files) {
    assert.equal(typeof file.role, "string");
    assert.equal(file.required, true);
    const source = await readFile(join(examples, file.path), "utf8");
    assert.equal(createHash("sha256").update(source).digest("hex"), file.sha256);
    const validator = spawnSync(process.execPath, ["--import", pathToFileURL(require.resolve("tsx")).href, join(base, "scripts/validate-render.ts"), join(examples, file.path), "--mode", "template", "--expected-protocol", protocol, "--expected-type", "oracle", "--json"], { encoding: "utf8" });
    assert.equal(validator.status, 0, validator.stdout + validator.stderr);
    const renderedPath = file.path.replace(/^templates\/oracle\//, "").replace(/\.tmpl$/, "");
    if (renderedPath !== "domain.md") {
      assert.equal(source.replace(/^---\n[\s\S]*?\n---\n/, ""), await readFile(join(examples, "derived", renderedPath), "utf8"));
      continue;
    }
    const rendered = parse(source);
    delete rendered["x-template"];
    assert.deepEqual(rendered.name, { $param: "service_name" });
    rendered.name = provenance.parameters[rendered.name.$param];
    rendered.domain.class = protocol;
    rendered.domain.class_binding = derived.domain.class_binding;
    assert.deepEqual(rendered, derived);
  }
});

test("fixture generation is deterministic", async () => {
  const generated = await mkdtemp(join(tmpdir(), "professional-oracle-generate-"));
  try {
    await generateFixtures(generated);
    const compare = async (dir = "") => {
      for (const entry of await readdir(join(examples, dir), { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await compare(path);
        else assert.equal(await readFile(join(generated, path), "utf8"), await readFile(join(examples, path), "utf8"), path);
      }
    };
    await compare();
  } finally { await rm(generated, { recursive: true, force: true }); }
});
