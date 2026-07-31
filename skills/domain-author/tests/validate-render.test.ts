import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import { main, type MainOptions, type ValidationReport } from "../scripts/validate-render";

const SPEC_PATH = resolve(__dirname, "../references/domain-md-spec.md");
const SCHEMA_PATH = resolve(__dirname, "../references/domain-md.schema.json");
const SOURCE_LOCK_PATH = resolve(__dirname, "../references/source-lock.json");
const GOVERNED_FIXTURE_PATH = resolve(__dirname, "fixtures/governed-project-domain.md");
const PASSIVE_FIXTURE_PATH = resolve(__dirname, "fixtures/passive-domain.md");
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

async function fixture(path: string): Promise<string> {
  return readFile(path, "utf8");
}

test("bundled rc.3 artifacts match the exact merged source lock", async () => {
  const sourceLock = JSON.parse(await readFile(SOURCE_LOCK_PATH, "utf8")) as {
    domain_md: {
      commit: string;
      specification: { version: string; sha256: string };
      schema: { id: string; sha256: string };
    };
    constitution_vocabulary: { commit: string };
  };
  const digest = (value: string): string => createHash("sha256").update(value).digest("hex");
  assert.equal(sourceLock.domain_md.commit, "bc365f9fb282fb3438389e44c7e450b8168984a4");
  assert.equal(sourceLock.constitution_vocabulary.commit, "a85b26612e097f2004ca7ec5fdc67129d12f1038");
  assert.equal(sourceLock.domain_md.specification.version, "1.0.0-rc.3");
  assert.equal(sourceLock.domain_md.schema.id, "urn:ixo:domain-md:schema:1.0.0-rc.3");
  assert.equal(digest(await readFile(SPEC_PATH, "utf8")), sourceLock.domain_md.specification.sha256);
  assert.equal(digest(await readFile(SCHEMA_PATH, "utf8")), sourceLock.domain_md.schema.sha256);
});

test("the normative minimal example passes static conformance", async () => {
  const report = await validateFixture();
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.equal(report.profile, "authoring_draft");
});

test("the merged governed constitutional fixture passes derived validation", async () => {
  const report = await validatePackage(
    { "domain.md": await fixture(GOVERNED_FIXTURE_PATH) },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.equal(report.validator_version, "1.0.0-rc.3");
});

test("a passive domain may declare its constitution not applicable", async () => {
  const report = await validatePackage(
    { "domain.md": await fixture(PASSIVE_FIXTURE_PATH) },
    { mode: "standalone", expectedProfile: "authoring_draft" },
  );
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
});

test("a governed domain may not use the passive constitutional exemption", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('status: "draft"\n  reason: null\n  subject:', 'status: "not_applicable"\n  reason: "Incorrect passive claim."\n  subject:');
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "constitution-not-applicable-invalid"));
});

test("existing constitutional instruments resolve by unique document id", async () => {
  const report = await validatePackage(
    { "domain.md": await fixture(GOVERNED_FIXTURE_PATH) },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.ok(!report.findings.some((finding) => finding.code === "constitutional-instrument-unresolved"));
});

test("a de-novo operational constitutional instrument does not claim legal effect", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('type: "con:ProjectCharter", functions:', 'type: "con:OperationalConstitutionDocument", functions:');
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.ok(!report.findings.some((finding) => finding.code === "constitutional-authority-unverified"));
});

test("verified legal effect requires jurisdiction and authority evidence", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      'legal_effect: { status: "unknown", jurisdiction: null, authority_evidence: [] }',
      'legal_effect: { status: "verified", jurisdiction: null, authority_evidence: [] }',
    );
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "constitutional-authority-unverified"));
});

test("machine-executable governance requires tests and enforcement", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('mode: "machine_assisted"', 'mode: "machine_executable"')
    .replace('conformance_tests: [ "resource:project-constitutional-tests-v1" ]', "conformance_tests: []");
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "constitutional-execution-incomplete"));
});

test("executable constitutional implementations require immutable content identity", async () => {
  const remoteMutable = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('mode: "machine_assisted"', 'mode: "machine_executable"')
    .replace(
      'implementations: [ "resource:project-constitutional-policy-v1" ]',
      'implementations: [ "https://example.com/current.js" ]',
    );
  const remoteReport = await validatePackage(
    { "domain.md": remoteMutable },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(remoteReport.ok, false);
  assert.ok(
    remoteReport.findings.some(
      (finding) =>
        finding.code === "constitutional-execution-incomplete" &&
        finding.message.includes("immutable content identity"),
    ),
  );

  const localMutable = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('mode: "machine_assisted"', 'mode: "machine_executable"')
    .replace(
      'implementations: [ "resource:project-constitutional-policy-v1" ]',
      'implementations: [ "rubric-service-delivery-v1" ]',
    );
  const localReport = await validatePackage(
    { "domain.md": localMutable },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(localReport.ok, false);
  assert.ok(
    localReport.findings.some(
      (finding) =>
        finding.code === "constitutional-execution-incomplete" &&
        finding.message.includes("immutable content identity"),
    ),
  );

  const immutable = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('mode: "machine_assisted"', 'mode: "machine_executable"')
    .replace(
      'implementations: [ "resource:project-constitutional-policy-v1" ]',
      'implementations: [ "ipfs://bafybeigdyrzt" ]',
    );
  const immutableReport = await validatePackage(
    { "domain.md": immutable },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(immutableReport.ok, true, JSON.stringify(immutableReport.findings, null, 2));
});

test("agentic twins require complete Constitutional-AI binding", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('applies_to_agents: [ "did:ixo:agent:evidence-review-oracle" ]', "applies_to_agents: []");
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "constitutional-ai-incomplete"));
});

test("every declared agent requires Constitutional-AI binding", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      "agents:\n  entries:\n",
      'agents:\n  entries:\n    - { id: "did:ixo:agent:unbound-reviewer" }\n',
    );
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(
    report.findings.some(
      (finding) =>
        finding.code === "constitutional-ai-incomplete" &&
        finding.message.includes("did:ixo:agent:unbound-reviewer"),
    ),
  );
});

test("subject profiles resolve nested claims and local wallets", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('claims: [ "claim-collection:field-services" ]', 'claims: [ "service_delivery" ]')
    .replace('wallets: [ "did:ixo:wallet:field-services" ]', 'wallets: [ "payouts" ]');
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
});

test("subject-profile facets reject unresolved local references", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('claims: [ "claim-collection:field-services" ]', 'claims: [ "missing_claim_type" ]');
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "constitutional-subject-profile-unresolved"));
});

test("constitutional instruments must resolve to documents", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('document_ref: "domain-charter"', 'document_ref: "missing-charter"');
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "constitutional-instrument-unresolved"));
});

test("constitutional documents may not have duplicate instrument mappings", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /(    - \{ document_ref: "domain-charter".+\})/,
      '$1\n    - { document_ref: "domain-charter", type: "con:GovernancePolicy", functions: [ "governing" ], canonical: false, effective_from: null, effective_until: null }',
    );
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(
    report.findings.some(
      (finding) =>
        finding.code === "constitutional-instrument-unresolved" &&
        finding.message.includes("more than one instrument entry"),
    ),
  );
});

test("constitutional supersession chains reject missing predecessor documents", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /(id: "domain-charter".*?supersedes:) null/,
      '$1 "missing-predecessor"',
    );
  assert.match(source, /id: "domain-charter".*?supersedes: "missing-predecessor"/);
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(
    report.findings.some(
      (finding) =>
        finding.code === "constitutional-instrument-unresolved" &&
        finding.message.includes("missing-predecessor"),
    ),
  );
});

test("constitutional supersession chains reject cycles", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /(id: "domain-charter".*?supersedes:) null/,
      '$1 "domain-charter"',
    );
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(
    report.findings.some(
      (finding) =>
        finding.code === "constitution-conflicts-canonical" &&
        finding.message.includes("cycle"),
    ),
  );
});

test("superseded constitutions may not retain canonical instruments", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('status: "draft"\n  reason: null\n  subject:', 'status: "superseded"\n  reason: null\n  subject:');
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "constitution-conflicts-canonical"));
});

test("amending instruments require an amendment procedure and authority", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('functions: [ "constitutive", "governing" ]', 'functions: [ "constitutive", "governing", "amending" ]')
    .replace('amendment_procedure: "resource:project-amendment-procedure-v1"', "amendment_procedure: null");
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "constitutional-amendment-unapproved"));
});

test("document ids are unique independently of their roles", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('{ id: "changelog", role: "changelog"', '{ id: "description", role: "changelog"');
  const report = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(report.ok, false);
  assert.ok(report.findings.some((finding) => finding.code === "duplicate-entry-id"));
});

test("standalone mode rejects protocol type and protocol-template lineage", async () => {
  const derived = await validatePackage(
    { "domain.md": await fixture(GOVERNED_FIXTURE_PATH) },
    { mode: "standalone", expectedProfile: "authoring_draft" },
  );
  assert.equal(derived.ok, false);
  assert.ok(
    derived.findings.some(
      (finding) =>
        finding.code === "standalone-lineage" &&
        finding.message.includes("domain.class"),
    ),
  );

  const protocol = await validatePackage(
    {
      "domain.md": (await fixture(PASSIVE_FIXTURE_PATH))
        .replace('type: "dataset"', 'type: "protocol"'),
    },
    { mode: "standalone", expectedProfile: "authoring_draft" },
  );
  assert.equal(protocol.ok, false);
  assert.ok(
    protocol.findings.some(
      (finding) =>
        finding.code === "standalone-lineage" &&
        finding.message.includes("domain.type"),
    ),
  );
});

test("static validation is deterministic for the same package bytes", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "domain-author-validator-"));
  try {
    await writeFile(resolve(root, "domain.md"), await fixture(GOVERNED_FIXTURE_PATH), "utf8");
    const options: MainOptions = {
      root,
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    };
    const first = await main(options);
    const second = await main(options);
    assert.deepEqual(first, second);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
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
