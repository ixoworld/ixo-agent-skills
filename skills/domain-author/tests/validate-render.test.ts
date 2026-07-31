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
      specification: { version: string; sha256: string; bundled: boolean };
      schema: { id: string; sha256: string; bundled: boolean };
    };
    constitution_vocabulary: {
      commit: string;
      bundled: boolean;
      verification: string;
    };
  };
  const digest = (value: string): string => createHash("sha256").update(value).digest("hex");
  assert.equal(sourceLock.domain_md.commit, "bc365f9fb282fb3438389e44c7e450b8168984a4");
  assert.equal(sourceLock.constitution_vocabulary.commit, "a85b26612e097f2004ca7ec5fdc67129d12f1038");
  assert.equal(sourceLock.domain_md.specification.bundled, true);
  assert.equal(sourceLock.domain_md.schema.bundled, true);
  assert.equal(sourceLock.constitution_vocabulary.bundled, false);
  assert.equal(sourceLock.constitution_vocabulary.verification, "upstream_provenance_only");
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

test("Oracle Capsule bindings require a CIDv1 raw sha2-256 manifest identity", async () => {
  const validCid =
    "bafkreigh2akiscaildcxy6wo5t3aij7f6bexqxyfkuprjzsd5r5kps3dhe";
  const source = (await fixture(GOVERNED_FIXTURE_PATH)).replace(
    'document_revision: "0.1.0"\n',
    `document_revision: "0.1.0"
x-oracle-capsule:
  contract: "ixo.earth/oracle-capsule/v0alpha1"
  manifest:
    uri: "ipfs://${validCid}"
    cid: "${validCid}"
    sha256: "${"a".repeat(64)}"
    media_type: "application/vnd.ixo.oracle-capsule+json"
    schema: "urn:ixo:domain-md:x-oracle-capsule:manifest:0.1.0"
    version: "0.1.0"
`,
  );
  const validReport = await validatePackage(
    { "domain.md": source },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(validReport.ok, true, JSON.stringify(validReport.findings, null, 2));

  const truncatedReport = await validatePackage(
    {
      "domain.md": source.replace(
        `cid: "${validCid}"`,
        'cid: "bafybeigdyrzt"',
      ),
    },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(truncatedReport.ok, false);
  assert.ok(
    truncatedReport.findings.some(
      (finding) =>
        finding.code === "capsule-cid" &&
        finding.message.includes("CIDv1 raw sha2-256"),
    ),
  );
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

test("canonically equivalent Unicode constitutional references resolve consistently", async () => {
  const decomposedDocumentId = "cafe\u0301-charter";
  const source = (await fixture(GOVERNED_FIXTURE_PATH)).replaceAll(
    '"domain-charter"',
    `"${decomposedDocumentId}"`,
  );
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

test("external constitutional norms require immutable content identity", async () => {
  const mutable = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      'norms: [ "resource:constitutional-principles-v1" ]',
      'norms: [ "https://example.com/current-policy" ]',
    );
  const mutableReport = await validatePackage(
    { "domain.md": mutable },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(mutableReport.ok, false);
  assert.ok(
    mutableReport.findings.some(
      (finding) =>
        finding.code === "constitution-required" &&
        finding.message.includes("immutable external reference"),
    ),
  );

  const immutable = mutable.replace(
    "https://example.com/current-policy",
    "ipfs://bafkreigh2akiscaildcxy6wo5t3aij7f6bexqxyfkuprjzsd5r5kps3dhe",
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

  const malformedLocalHash = localMutable.replace(
    "hash: null",
    'hash: "unverifiable"',
  );
  const malformedLocalReport = await validatePackage(
    { "domain.md": malformedLocalHash },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(malformedLocalReport.ok, false);
  assert.ok(
    malformedLocalReport.findings.some(
      (finding) =>
        finding.code === "constitutional-execution-incomplete" &&
        finding.message.includes("immutable content identity"),
    ),
  );

  const immutableLocalHash = localMutable.replace(
    "hash: null",
    `hash: "sha256:${"a".repeat(64)}"`,
  );
  const immutableLocalReport = await validatePackage(
    { "domain.md": immutableLocalHash },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(
    immutableLocalReport.ok,
    true,
    JSON.stringify(immutableLocalReport.findings, null, 2),
  );

  const immutable = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('mode: "machine_assisted"', 'mode: "machine_executable"')
    .replace(
      'implementations: [ "resource:project-constitutional-policy-v1" ]',
      'implementations: [ "ipfs://bafkreigh2akiscaildcxy6wo5t3aij7f6bexqxyfkuprjzsd5r5kps3dhe" ]',
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

  const uppercaseSchemeReport = await validatePackage(
    { "domain.md": immutable.replace("ipfs://", "IPFS://") },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(
    uppercaseSchemeReport.ok,
    true,
    JSON.stringify(uppercaseSchemeReport.findings, null, 2),
  );

  const malformedCid = immutable.replace(
    "bafkreigh2akiscaildcxy6wo5t3aij7f6bexqxyfkuprjzsd5r5kps3dhe",
    "bafybeigdyrzt",
  );
  const malformedCidReport = await validatePackage(
    { "domain.md": malformedCid },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(malformedCidReport.ok, false);
  assert.ok(
    malformedCidReport.findings.some(
      (finding) =>
        finding.code === "constitutional-execution-incomplete" &&
        finding.message.includes("immutable content identity"),
    ),
  );
});

test("Arweave identities require canonical 32-byte base64url transaction ids", async () => {
  const executable = (await fixture(GOVERNED_FIXTURE_PATH)).replace(
    'mode: "machine_assisted"',
    'mode: "machine_executable"',
  );
  const canonicalId = "A".repeat(43);
  const canonical = executable.replace(
    'implementations: [ "resource:project-constitutional-policy-v1" ]',
    `implementations: [ "ar://${canonicalId}" ]`,
  );
  const canonicalReport = await validatePackage(
    { "domain.md": canonical },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(canonicalReport.ok, true, JSON.stringify(canonicalReport.findings, null, 2));

  const nonCanonical = canonical.replace(canonicalId, `${"A".repeat(42)}B`);
  const nonCanonicalReport = await validatePackage(
    { "domain.md": nonCanonical },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(nonCanonicalReport.ok, false);
  assert.ok(
    nonCanonicalReport.findings.some(
      (finding) =>
        finding.code === "constitutional-execution-incomplete" &&
        finding.message.includes("immutable content identity"),
    ),
  );
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

test("agentic twins require a local agent or linked-entity declaration", async () => {
  const undeclaredTwin = "did:ixo:agent:undeclared-twin";
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      'agentic_twins: [ "did:ixo:agent:evidence-review-oracle" ]',
      `agentic_twins: [ "${undeclaredTwin}" ]`,
    )
    .replace(
      'applies_to_agents: [ "did:ixo:agent:evidence-review-oracle" ]',
      `applies_to_agents: [ "did:ixo:agent:evidence-review-oracle", "${undeclaredTwin}" ]`,
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
        finding.code === "constitutional-subject-profile-unresolved" &&
        finding.message.includes(undeclaredTwin),
    ),
  );
});

test("disabled Constitutional AI still validates populated references", async () => {
  const inactive = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /agents:\n  entries:\n[\s\S]*?\nclaims:/,
      "agents:\n  entries: []\nclaims:",
    )
    .replace(
      'agentic_twins: [ "did:ixo:agent:evidence-review-oracle" ]',
      "agentic_twins: []",
    )
    .replace('mode: "critique_and_revise"', 'mode: "none"')
    .replace(
      'applies_to_agents: [ "did:ixo:agent:evidence-review-oracle" ]',
      "applies_to_agents: []",
    )
    .replace(
      'principles: [ "resource:constitutional-principles-v1" ]',
      "principles: []",
    )
    .replace(
      'critique_procedure: "resource:constitutional-critique-v1"',
      "critique_procedure: null",
    )
    .replace(
      'revision_procedure: "resource:constitutional-revision-v1"',
      "revision_procedure: null",
    )
    .replace(
      'model_profile: "resource:constitutional-model-profile-v1"',
      "model_profile: null",
    )
    .replace(
      'audit_record: "resource:constitutional-audit-schema-v1"',
      "audit_record: null",
    );
  const inactiveReport = await validatePackage(
    { "domain.md": inactive },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(inactiveReport.ok, true, JSON.stringify(inactiveReport.findings, null, 2));

  const unresolved = inactive
    .replace("applies_to_agents: []", 'applies_to_agents: [ "ghost-agent" ]')
    .replace("principles: []", 'principles: [ "missing-policy" ]')
    .replace("audit_record: null", 'audit_record: "missing-schema"');
  const unresolvedReport = await validatePackage(
    { "domain.md": unresolved },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(unresolvedReport.ok, false);
  assert.ok(
    unresolvedReport.findings.some(
      (finding) =>
        finding.code === "constitutional-ai-incomplete" &&
        finding.message.includes("ghost-agent") &&
        finding.message.includes("not a declared agent"),
    ),
  );
  for (const reference of ["missing-policy", "missing-schema"]) {
    assert.ok(
      unresolvedReport.findings.some(
        (finding) =>
          finding.code === "constitutional-ai-incomplete" &&
          finding.message.includes(reference) &&
          finding.message.includes("does not resolve"),
      ),
    );
  }
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

test("claim collection, nested type, and linked claim identifiers share one unique namespace", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replaceAll('"claim-collection:field-services"', '"service_delivery"');
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
        finding.code === "duplicate-entry-id" &&
        finding.message.includes("claim reference") &&
        finding.message.includes("service_delivery"),
    ),
  );
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

test("subject-profile archetypes are restricted to the canonical governance mixins", async () => {
  const unsupported = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('"con:Managed"', '"custom:Administrator"');
  const unsupportedReport = await validatePackage(
    { "domain.md": unsupported },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(unsupportedReport.ok, false);
  assert.ok(
    unsupportedReport.findings.some(
      (finding) =>
        finding.code === "constitutional-subject-profile-unresolved" &&
        finding.message.includes("seven canonical governance mixins"),
    ),
  );

  const expanded = unsupported.replace(
    "custom:Administrator",
    "https://w3id.org/ixo/vocab/v1/constitution#Managed",
  );
  const expandedReport = await validatePackage(
    { "domain.md": expanded },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(expandedReport.ok, true, JSON.stringify(expandedReport.findings, null, 2));
});

test("subject types are restricted to the canonical IXO subject taxonomy", async () => {
  const unsupported = (await fixture(GOVERNED_FIXTURE_PATH)).replace(
    'subject_types: [ "con:Project", "con:Work" ]',
    'subject_types: [ "custom:UnrecognizedSubject" ]',
  );
  const unsupportedReport = await validatePackage(
    { "domain.md": unsupported },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(unsupportedReport.ok, false);
  assert.ok(
    unsupportedReport.findings.some(
      (finding) =>
        finding.code === "constitutional-subject-profile-unresolved" &&
        finding.message.includes("canonical IXO subject-taxonomy class"),
    ),
  );

  const expanded = unsupported.replace(
    "custom:UnrecognizedSubject",
    "https://w3id.org/ixo/vocab/v1/constitution#Project",
  );
  const expandedReport = await validatePackage(
    { "domain.md": expanded },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(expandedReport.ok, true, JSON.stringify(expandedReport.findings, null, 2));
});

test("constitution types are restricted to the canonical IXO catalogue", async () => {
  const unsupported = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace('type: "con:ProjectConstitution"', 'type: "custom:Policy"');
  const unsupportedReport = await validatePackage(
    { "domain.md": unsupported },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(unsupportedReport.ok, false);
  assert.ok(
    unsupportedReport.findings.some(
      (finding) =>
        finding.code === "constitution-required" &&
        finding.message.includes("canonical IXO constitutional type"),
    ),
  );

  const expanded = unsupported.replace(
    "custom:Policy",
    "https://w3id.org/ixo/vocab/v1/constitution#ProjectConstitution",
  );
  const expandedReport = await validatePackage(
    { "domain.md": expanded },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(expandedReport.ok, true, JSON.stringify(expandedReport.findings, null, 2));
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

test("constitutional instrument types are restricted to the canonical IXO vocabulary", async () => {
  const unsupported = (await fixture(GOVERNED_FIXTURE_PATH)).replace(
    'type: "con:ProjectCharter", functions:',
    'type: "custom:MadeUpInstrument", functions:',
  );
  const unsupportedReport = await validatePackage(
    { "domain.md": unsupported },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(unsupportedReport.ok, false);
  assert.ok(
    unsupportedReport.findings.some(
      (finding) =>
        finding.code === "constitutional-instrument-unresolved" &&
        finding.message.includes("canonical IXO constitutional-instrument class"),
    ),
  );

  const expanded = unsupported.replace(
    "custom:MadeUpInstrument",
    "https://w3id.org/ixo/vocab/v1/constitution#ProjectCharter",
  );
  const expandedReport = await validatePackage(
    { "domain.md": expanded },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(expandedReport.ok, true, JSON.stringify(expandedReport.findings, null, 2));
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
  const selfCycle = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /(id: "domain-charter".*?supersedes:) null/,
      '$1 "domain-charter"',
    );
  const selfReport = await validatePackage(
    { "domain.md": selfCycle },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(selfReport.ok, false);
  assert.ok(
    selfReport.findings.some(
      (finding) =>
        finding.code === "constitution-conflicts-canonical" &&
        finding.message.includes("cycle"),
    ),
  );

  const twoDocumentCycle = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /(id: "description".*?supersedes:) null/,
      '$1 "changelog"',
    )
    .replace(
      /(id: "changelog".*?supersedes:) null/,
      '$1 "description"',
    );
  const twoDocumentReport = await validatePackage(
    { "domain.md": twoDocumentCycle },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(twoDocumentReport.ok, false);
  assert.ok(
    twoDocumentReport.findings.some(
      (finding) =>
        finding.code === "constitution-conflicts-canonical" &&
        finding.message.includes("description -> changelog -> description"),
    ),
  );
});

test("canonical conflicts are detected through the full supersession chain", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /(id: "changelog".*?supersedes:) null/,
      '$1 "description"',
    )
    .replace(
      /(id: "domain-charter".*?supersedes:) null/,
      '$1 "changelog"',
    )
    .replace(
      /(    - \{ document_ref: "domain-charter".+\})/,
      '$1\n    - { document_ref: "changelog", type: "con:AmendmentInstrument", functions: [ "amending" ], canonical: false, effective_from: null, effective_until: null }\n    - { document_ref: "description", type: "con:GoverningInstrument", functions: [ "governing" ], canonical: true, effective_from: null, effective_until: null }',
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
        finding.message.includes("domain-charter") &&
        finding.message.includes("description") &&
        finding.message.includes("amendment chain"),
    ),
  );
});

test("canonical conflicts reject competing successors of one instrument", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /(id: "domain-charter".*?supersedes:) null/,
      '$1 "description"',
    )
    .replace(
      /(id: "changelog".*?supersedes:) null/,
      '$1 "description"',
    )
    .replace(
      'functions: [ "constitutive", "governing" ]',
      'functions: [ "constitutive", "governing", "amending" ]',
    )
    .replace(
      /(    - \{ document_ref: "domain-charter".+\})/,
      '$1\n    - { document_ref: "changelog", type: "con:AmendmentInstrument", functions: [ "amending" ], canonical: true, effective_from: null, effective_until: null }\n    - { document_ref: "description", type: "con:ConstitutionDocument", functions: [ "constitutive" ], canonical: false, effective_from: null, effective_until: null }',
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
        finding.message.includes("domain-charter") &&
        finding.message.includes("changelog") &&
        finding.message.includes("description") &&
        finding.message.includes("competing successors"),
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
    .replace(
      /(id: "domain-charter".*?supersedes:) null/,
      '$1 "description"',
    )
    .replace(
      /(    - \{ document_ref: "domain-charter".+\})/,
      '$1\n    - { document_ref: "description", type: "con:ConstitutionDocument", functions: [ "constitutive" ], canonical: false, effective_from: null, effective_until: null }',
    )
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

test("amending instruments require a mapped constitutional predecessor", async () => {
  const missingLineage = (await fixture(GOVERNED_FIXTURE_PATH)).replace(
    'functions: [ "constitutive", "governing" ]',
    'functions: [ "constitutive", "governing", "amending" ]',
  );
  const missingLineageReport = await validatePackage(
    { "domain.md": missingLineage },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(missingLineageReport.ok, false);
  assert.ok(
    missingLineageReport.findings.some(
      (finding) =>
        finding.code === "constitutional-amendment-unapproved" &&
        finding.message.includes("supersede a resolvable constitutional instrument"),
    ),
  );

  const documentOnlyLineage = missingLineage.replace(
    /(id: "domain-charter".*?supersedes:) null/,
    '$1 "description"',
  );
  const documentOnlyLineageReport = await validatePackage(
    { "domain.md": documentOnlyLineage },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(documentOnlyLineageReport.ok, false);
  assert.ok(
    documentOnlyLineageReport.findings.some(
      (finding) =>
        finding.code === "constitutional-amendment-unapproved" &&
        finding.message.includes("supersede a resolvable constitutional instrument"),
    ),
  );

  const mappedLineage = documentOnlyLineage.replace(
    /(    - \{ document_ref: "domain-charter".+\})/,
    '$1\n    - { document_ref: "description", type: "con:ConstitutionDocument", functions: [ "constitutive" ], canonical: false, effective_from: null, effective_until: null }',
  );
  const mappedLineageReport = await validatePackage(
    { "domain.md": mappedLineage },
    {
      mode: "derived",
      expectedProfile: "authoring_draft",
      expectedClass: EXPECTED_CLASS,
    },
  );
  assert.equal(mappedLineageReport.ok, true, JSON.stringify(mappedLineageReport.findings, null, 2));
});

test("constitutional supersession edges require the amending function", async () => {
  const source = (await fixture(GOVERNED_FIXTURE_PATH))
    .replace(
      /(id: "domain-charter".*?supersedes:) null/,
      '$1 "description"',
    )
    .replace(
      /(    - \{ document_ref: "domain-charter".+\})/,
      '$1\n    - { document_ref: "description", type: "con:ConstitutionDocument", functions: [ "constitutive" ], canonical: false, effective_from: null, effective_until: null }',
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
        finding.code === "constitutional-amendment-unapproved" &&
        finding.message.includes("must declare the amending function"),
    ),
  );
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
