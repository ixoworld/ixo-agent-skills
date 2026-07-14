import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { main, type ValidationReport } from "../scripts/validate-render";

const SPEC_PATH = resolve(__dirname, "../references/domain-md-spec.md");
const EXPECTED_CLASS = "did:ixo:entity:protocol:verified-services";

async function minimalExample(): Promise<string> {
  const specification = await readFile(SPEC_PATH, "utf8");
  const sectionStart = specification.indexOf("## 15\\. Minimal compliant example");
  const nextSection = specification.indexOf("## 16\\. Production processing and interoperability", sectionStart);
  assert.notEqual(sectionStart, -1, "minimal example section must exist");
  assert.notEqual(nextSection, -1, "production processing section must exist");
  const section = specification.slice(sectionStart, nextSection);
  const match = /\n```\n([\s\S]+?)\n```\n/.exec(section);
  assert.ok(match, "minimal example must contain one fenced domain.md");
  return match[1];
}

async function validateFixture(transform: (source: string) => string = (source) => source): Promise<ValidationReport> {
  const root = await mkdtemp(resolve(tmpdir(), "domain-author-validator-"));
  try {
    await writeFile(resolve(root, "domain.md"), transform(await minimalExample()), "utf8");
    return await main({
      root,
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

test("the normative minimal example passes static conformance", async () => {
  const report = await validateFixture();
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.equal(report.profile, "authoring_draft");
});

test("rendered packages reject unresolved template placeholders", async () => {
  const report = await validateFixture((source) => source.replace('name: "Verified Field Services POD"', 'name: "{{domain_name}}"'));
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "author-placeholder"));
});

test("safe YAML parsing rejects anchors and aliases", async () => {
  const report = await validateFixture((source) => source.replace('name: "Verified Field Services POD"', 'x-anchor: &shared "value"\nx-alias: *shared\nname: "Verified Field Services POD"'));
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "unsafe-yaml"));
});

test("flow validation rejects unreachable states", async () => {
  const report = await validateFixture((source) => source.replace('states: [ "submitted", "evaluating", "review_required", "determined", "actioned", "closed" ]', 'states: [ "submitted", "evaluating", "review_required", "determined", "actioned", "closed", "orphaned" ]'));
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "invalid-flow" && finding.message.includes("unreachable")));
});

test("persisted profiles reject null document identities", async () => {
  const report = await validateFixture((source) => source.replace('profile: "authoring_draft"', 'profile: "persisted_draft"'));
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "schema"));
});
