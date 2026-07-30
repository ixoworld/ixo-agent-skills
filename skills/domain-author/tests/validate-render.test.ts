import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import { main, type MainOptions, type ValidationReport } from "../scripts/validate-render";

const SPEC_PATH = resolve(__dirname, "../references/domain-md-spec.md");
const EXPECTED_CLASS = "did:ixo:entity:protocol:verified-services";

const TEMPLATE_SOURCE = `---
x-template:
  is_template: true
  instantiates_type: "project"
  protocol: "${EXPECTED_CLASS}"
  template_version: "1.0.0"
  parameters:
    - name: "name"
      type: "string"
      required: true
      fill_at: "author"
---
name: "{{name}}"
`;

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

async function validatePackage(files: Record<string, string>, options: Omit<MainOptions, "root">): Promise<ValidationReport> {
  const root = await mkdtemp(resolve(tmpdir(), "domain-author-validator-"));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = resolve(root, relativePath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, "utf8");
    }
    return await main({ root, ...options });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

async function validateTemplateFile(relativePath: string, content: string, options: Omit<MainOptions, "root" | "mode">): Promise<ValidationReport> {
  const base = await mkdtemp(resolve(tmpdir(), "domain-author-validator-"));
  try {
    const target = resolve(base, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
    return await main({ root: target, mode: "template", ...options });
  } finally {
    await rm(base, { force: true, recursive: true });
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

test("protocol packages keep template sources under templates/ without leak errors", async () => {
  const report = await validatePackage(
    { "domain.md": await minimalExample(), "templates/project/domain.md.tmpl": TEMPLATE_SOURCE },
    { mode: "protocol" },
  );
  const templateFindings = report.findings.filter((finding) => finding.path.includes("templates"));
  assert.deepEqual(templateFindings, []);
});

test("derived packages reject template sources", async () => {
  const report = await validatePackage(
    { "domain.md": await minimalExample(), "templates/project/domain.md.tmpl": TEMPLATE_SOURCE },
    { mode: "derived", expectedProfile: "authoring_draft", expectedClass: EXPECTED_CLASS },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "template-suffix-leaked"));
  assert.ok(report.findings.some((finding) => finding.code === "template-marker-leaked"));
});

test("template mode validates a single template contract", async () => {
  const pass = await validateTemplateFile("templates/project/domain.md.tmpl", TEMPLATE_SOURCE, {
    expectedProtocol: EXPECTED_CLASS,
    expectedType: "project",
  });
  assert.equal(pass.ok, true, JSON.stringify(pass.findings, null, 2));
  const fail = await validateTemplateFile("templates/project/domain.md.tmpl", TEMPLATE_SOURCE, {
    expectedProtocol: EXPECTED_CLASS,
    expectedType: "asset",
  });
  assert.equal(fail.ok, false);
  assert.ok(fail.findings.some((finding) => finding.code === "template-path-type" || finding.code === "template-type-mismatch"));
});

test("headings inside fenced code blocks are not counted as sections", async () => {
  const report = await validateFixture((source) => `${source}\nExample snippet:\n\n\`\`\`text\n## Overview\n## Do's and Don'ts\n\`\`\`\n`);
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.ok(!report.findings.some((finding) => finding.code === "duplicate-section"));
});

test("a non-standard manifest disclosure pass warns instead of failing", async () => {
  const report = await validateFixture((source) => source.replace("disclosure_pass: 3", "disclosure_pass: 2"));
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.ok(report.findings.some((finding) => finding.severity === "warning" && finding.code === "document-pass-mismatch"));
});

test("a serialized domain.md must not carry its own anchoring cid", async () => {
  const report = await validateFixture((source) => source.replace("cid: null, verified_at: null }", 'cid: "bafybeigdyrzt", verified_at: null }'));
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "anchoring-self-cid"));
});

test("overrides may not raise the agent mode ceiling", async () => {
  const report = await validateFixture((source) => source.replace("move_value: false", "move_value: true"));
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "open-ended-agent-authority"));
});

test("a domain index older than stale_after warns", async () => {
  const report = await validateFixture((source) => source.replace('last_updated: "2026-06-27"', 'last_updated: "2020-01-01"'));
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.ok(report.findings.some((finding) => finding.severity === "warning" && finding.code === "stale-domain-index"));
});
