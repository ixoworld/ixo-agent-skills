import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(new URL("../../domain-author/scripts/package.json", import.meta.url));
const YAML = require("yaml");
const root = fileURLToPath(new URL("../examples/evidence-service/", import.meta.url));
const controller = "did:ixo:entity:synthetic-evidence-operator";
const agent = "did:ixo:agent:synthetic-evidence-assistant";
export const protocol = "did:ixo:entity:syntheticevidenceprotocol";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function rawCid(bytes) {
  const data = Buffer.concat([Buffer.from([1, 0x55, 0x12, 0x20]), createHash("sha256").update(bytes).digest()]);
  let bits = 0, value = 0, encoded = "b";
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { bits -= 5; encoded += "abcdefghijklmnopqrstuvwxyz234567"[(value >>> bits) & 31]; }
  }
  if (bits) encoded += "abcdefghijklmnopqrstuvwxyz234567"[(value << (5 - bits)) & 31];
  return encoded;
}
async function put(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

const documents = [
  ["description", "description", "Synthetic evidence service", `# Synthetic evidence service

This fictional service supplies facts about submitted completion evidence. It is an authoring and test fixture.
No identity, protocol, credential, deployment, customer, or grant in this package represents a live service.
The decision engine evaluates the commissioner's rubric. The service does not change the rubric or verdict.
`],
  ["changelog", "changelog", "Change history", `# Change history

Version 0.1.0 drafts an operational constitution and advisory observation practices on 2026-10-25.
No adoption, registration, publication, or live test has occurred. Proof references remain unavailable.
`],
  ["charter", "manifest", "Oracle charter", `# Oracle charter

## Mandate

Supply attributable facts about completion evidence requested by the engine manifest. Identify what the
evidence supports and where it is incomplete. Do not claim accreditation or verified legal effect.

## evidence-attribution

The intended practice is to cite the permitted source for each supplied fact and distinguish an observation
from an inference. Missing citations produce advisory findings. Existing decision rules remain authoritative.

## independence

The operator records relevant conflicts and follows the applicable commissioning and review procedures.
The constitution does not appoint a customer claim reviewer or grant any evaluation or payment capability.

## Learning posture

New constitutional assessments remain advisory. They do not stop effects, change outcomes, require another
review, or amend this charter. Governance changes require adoption through the applicable procedure.
`],
  ["governance", "governance", "Governance procedures", `# Governance procedures

## Founding adoption

Before adoption, establish the creator or controller's authority from independent canonical evidence.
The identities here are synthetic and provide no such evidence. An author cannot self-authorize by editing this file.
Resolve the final subject identity and document references before obtaining approval of the exact bytes.

## Amendments

Apply the incumbent amendment procedure. Present the revision diff, rationale, affected rules, and supporting
observations. Record approvals bound to the exact final revision and check the expected predecessor.
Independent review is required only where the applicable procedure requires it. Preserve old revisions.

## Interpretation and disputes

Record competing interpretations and ask the authorized domain steward to resolve them. Record complaints
and appeals separately from constitutional adoption. Existing claim-review rules continue to apply.

## Suspension and dissolution

Only an authorized operator or governing body can suspend, restore, or close the service through existing
controls. An advisory observation cannot do so. The required failure-policy field describes refusing an
unverified governance mutation; it is not a new runtime constitutional gate.
`],
  ["operations", "operations", "Operating procedures", `# Operating procedures

Read the engine manifest, obtain authorized evidence, produce requested facts, freeze the facts, and use the
existing decision engine and delivery workflow. Preserve content binding, review folds, authorizations, and
replay semantics. Record attempts, receipts, and unknown outcomes separately. Reconcile uncertain effects
before retrying. Do not make fresh model assessment calls during replay.

If a governing document is unavailable or a configured revision differs from the loaded revision, record
that observation. Preserve existing runtime failure and fallback behavior.
`],
  ["evidence-policy", "x-evidence-policy", "Evidence policy", `# Evidence policy

Record source identity, retrieval or capture time when available, relevant limitations, and source integrity.
Inspect only evidence available under existing permissions. A missing second source or uncertain provenance
is an advisory finding unless an existing commissioning rule already controls the authoritative outcome.
Never make private evidence public to complete a constitutional assessment.
`],
  ["methods", "x-methods", "Evidence methods", `# Evidence methods

## Method completion-evidence

Match each requested fact to permitted source evidence. Produce the type and missing-evidence representation
required by the engine manifest. The example fact schema documents a synthetic input for authoring tests.
It is not a replacement for a live engine manifest or rubric.

## source-corroboration

The intended practice is to compare independent sources when available. The expert has not yet calibrated
this practice or implemented an automated check. Record the gap as a learning opportunity. Do not introduce
automatic abstention, a new human-review requirement, or a delivery block.
`],
  ["conflicts-appeals", "x-conflicts-appeals", "Conflicts and appeals", `# Conflicts and appeals

Record relevant operator relationships and who is responsible for resolving them under the commissioning
mandate. Keep private disclosures access-controlled. Preserve the customer's existing reviewer authorization
and independence requirements. Route a complaint to the designated human procedure and record its outcome.
An observation about a conflict is not itself a verdict, revocation, or mandatory additional review.
`],
  ["data-policy", "data-policy", "Data policy", `# Data policy

Documents and source instruments are private by default. Public listing metadata contains only approved
service disclosures. Retention periods and lawful handling requirements remain operator decisions supported
by applicable instruments; this synthetic example does not invent them.
Observation records contain references and digests rather than evidence payloads, credentials, or hidden reasoning.
`],
  ["incidents", "x-incidents", "Incident response", `# Incident response

Record the affected service, relevant revision, observed facts, and the existing response owner. Use existing
security and operational controls for actual incidents. A failed constitutional observer produces a diagnostic
without stopping the primary workflow. Amend documents only through authorized change control.
`],
  ["report-template", "x-report-template", "Observation report template", `# Observation report template

Record the run reference, configured and loaded governing revisions, rule reference, evidence references,
check identity and version, assessment, uncertainty, and suggested follow-up.
Assessments distinguish consistent behavior, apparent inconsistency, ambiguous rules, insufficient evidence,
and suspected check error. Report document adoption, runtime loading, observation quality, and launch evidence
separately. A successful observation does not establish compliance.
`],
  ["agents", "agents", "Agent policy", `# Agent policy

The synthetic QiForge assistant helps interpret the service's documents and prepare evidence summaries.
It operates under existing tool permissions and cannot change a rubric, grant capabilities, sign an adoption,
or make a payment because a document tells it to. Observe-only context remains observe-only.
Assessments are deterministic in this release. No model-based constitutional assessment is configured.
`],
];

export async function generateFixtures(targetRoot = root) {
  const source = await readFile(new URL("../../domain-author/tests/fixtures/governed-project-domain.md", import.meta.url), "utf8");
  const d = YAML.parse(/^---\n([\s\S]*?)\n---/.exec(source)[1]);
  d.name = "Synthetic evidence service";
  d.description = "Fictional professional oracle package for authoring and validation tests.";
  d.last_updated = "2026-10-25";
  d.domain = { ...d.domain, type: "oracle", class: null, purpose: "Produce attributable completion-evidence facts.", operating_boundary: "Synthetic evidence verification and advisory constitutional observations." };
  delete d.domain.class_binding;
  d.domain.network = { chain_id: "synthetic-testnet", environment: "testnet", resolver: "ixo-did-resolver", blocksync_endpoint: null, rpc_endpoint: null };
  d.source_of_truth.claims_registry = null;
  d.source_of_truth.evidence_store = null;
  for (const key of ["protocols", "pods", "accounts", "claims"]) delete d[key];
  d.documents.entries = documents.map(([id, role, name]) => ({ id, role, category: role === "manifest" ? "manifest" : ["description", "changelog"].includes(role) ? "universal" : role.startsWith("x-") ? "extension" : "operational", manifest_type: role === "manifest" ? "charter" : null, name, uri: `file:./${id}.md`, cid: null, media_type: "text/markdown", version: "0.1.0", owner: controller, update_authority: [controller], authority: role === "manifest" ? "defining" : role === "changelog" ? "advisory" : "interpretive", disclosure_pass: role === "manifest" ? 3 : 2, required_for_tasks: ["read_domain_state"], sensitivity: "internal", access_policy: "controller_only", agent_use: { read: true, cite: true, summarize: true }, freshness: { last_verified: null, max_age: null }, supersedes: null }));
  const profile = d.constitution.subject_profile;
  for (const key of Object.keys(profile)) profile[key] = [];
  Object.assign(profile, { subject_types: ["con:Oracle", "con:Service"], archetypes: ["con:Governed", "con:Managed"], identity: [d.domain.id], purposes: ["charter"], interests: ["charter"], values: ["service-norms"], obligations: ["charter"], authorities: [controller], evidence_policies: ["evidence-policy"], evaluation_policies: ["methods"], decision_policies: ["governance"], governance: ["governance"], stewards: [controller], oracles: [agent], agentic_twins: [agent] });
  Object.assign(d.constitution, { type: "con:OracleConstitution", norms: ["service-norms"], legal_effect: { status: "none", jurisdiction: null, authority_evidence: [] }, instruments: [ { document_ref: "charter", type: "con:OracleCharter", functions: ["constitutive", "governing"], canonical: true, effective_from: null, effective_until: null }, { document_ref: "evidence-policy", type: "con:EvaluationPolicy", functions: ["interpretive"], canonical: true, effective_from: null, effective_until: null } ], governance: { authority_sources: ["governance"], decision_procedure: "governance", amendment_procedure: "governance", interpretation_procedure: "governance", dispute_resolution_procedure: "conflicts-appeals", suspension_procedure: "governance", dissolution_procedure: "governance" }, execution: { mode: "human_interpreted", implementations: [], conformance_tests: ["observation-scenarios"], enforcement_points: [], failure_policy: "pause_and_escalate", human_review_required_for: [] }, constitutional_ai: { mode: "context_only", applies_to_agents: [agent], principles: ["service-norms"], critique_procedure: null, revision_procedure: null, decision_procedure: null, model_profile: null, conflict_policy: "canonical_authority_prevails", audit_record: "audit-policy" } });
  d.agent_default_mode = { mode: "propose_only", overrides: { move_value: false, issue_credentials: false, change_rights: false, change_rubrics: false }, human_review_required_for: [] };
  d.controllers = { summary: { primary_controller: controller, governance_model: "single_controller", agent_controllers_allowed: false }, entries: [ { id: controller, type: "human", name: "Synthetic operator", role: "Fixture controller only", verification_methods: [], addresses: [], authorities: [], approval_policy: {}, limitations: ["Synthetic identity is not authority evidence."], audit_requirements: { signature_required: true } } ] };
  d.services.entries = [];
  d.rights.entries = [];
  d.agents.entries = [ { id: agent, name: "Synthetic assistant", type: "assistant", operator: controller, permitted_outputs: ["advisory_observation"], forbidden_outputs: ["authority_grant", "constitutional_amendment"] } ];
  const resources = {
    "service-norms.json": JSON.stringify({ version: "1", rules: [{ id: "evidence-attribution", documentRef: "charter" }, { id: "source-corroboration", documentRef: "methods" }], posture: "advisory" }, null, 2) + "\n",
    "fact.schema.json": JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", title: "Synthetic fact fixture", type: "object", required: ["sourceRef", "completionObserved"], properties: { sourceRef: { type: "string" }, completionObserved: { type: ["boolean", "null"] } }, additionalProperties: false }, null, 2) + "\n",
    "observation-scenarios.json": JSON.stringify({ synthetic: true, executed: false, cases: [ { input: "source is attributable", expected: "consistent" }, { input: "clear citation rule not followed", expected: "apparent_inconsistency" }, { input: "independence has competing meanings", expected: "ambiguous_rule" }, { input: "source unavailable", expected: "insufficient_evidence" }, { input: "check flags cited evidence as uncited", expected: "suspected_check_error" } ], authoritativeOutcomeChange: false }, null, 2) + "\n",
    "audit-policy.md": "# Audit policy\n\nUse ixo.professional-oracle.observation/v1 from @ixo/oracle-observations. Retain exact rule, revision, and evidence references. Do not store private payloads, credentials, or hidden reasoning. Observation success is not compliance or authorization.\n",
  };
  d.resources.entries = Object.entries(resources).map(([path, bytes]) => ({ id: path === "fact.schema.json" ? "fact-schema" : path.replace(/\.(json|md)$/, ""), type: path.endsWith(".json") ? "schema" : "audit_record_definition", name: path, uri: `file:./resources/${path}`, cid: null, hash: digest(bytes), version: "0.1.0", owner: controller, update_authority: [controller], access_policy: "controller_only", sensitivity: "internal", agent_use: { read: true, cite: true, summarize: true, transform: false, write: false }, freshness: { last_verified: null, max_age: null }, canonical_for: [] }));
  d.critical_do_not = ["Do not treat synthetic identities as verified authority.", "Do not change decisions or existing authorization because of advisory findings.", "Do not publish private evidence or credentials."];
  d["x-professional-oracle"] = { version: "1", runtimeTargets: ["decision-oracle", "qiforge"], serviceScope: { summary: "Supply facts about synthetic completion evidence.", exclusions: ["Payment authorization", "Professional accreditation claims"], protocols: [] }, methods: [ { id: "completion-evidence", documentRef: "methods", resourceRefs: ["fact-schema"] } ], rulePractices: [ { ruleRef: "charter#evidence-attribution", documentRef: "charter", practice: "Cite the permitted source for each supplied fact.", responsibleRole: "evidence-provider", evidenceRefs: [], implementationStatus: "documented" }, { ruleRef: "methods#source-corroboration", documentRef: "methods", practice: "Compare independent sources when available.", responsibleRole: "method-steward", evidenceRefs: [], implementationStatus: "unimplemented" } ], observation: { mode: "advisory", modelAssessments: false } };
  const body = "# domain.md\n\n## Overview\nSynthetic evidence-verification service. See description.md and charter.md.\n\n## Authority & Control\nThe listed controller is a fixture, not verified authority. See governance.md.\n\n## Constitutional Governance\nThis is a draft human-interpreted operational constitution. See charter.md and governance.md.\n\n## Rights & Capabilities\nNo grants are issued by this package. Existing runtime permissions remain unchanged.\n\n## Privacy & Source-of-Truth Boundaries\nPrivate by default. See data-policy.md.\n\n## Do's and Don'ts\nKeep constitutional observations advisory. Do not reinterpret engine rubrics or alter verdicts.\n\n## Changelog\nSee changelog.md for version 0.1.0.\n";
  const serialize = (domain) => `---\n${YAML.stringify(domain)}---\n${body}`;
  const standalone = serialize(d);
  const templateDomain = structuredClone(d);
  templateDomain.name = { $param: "service_name" };
  templateDomain["x-professional-oracle"].serviceScope.protocols = [protocol];
  const marker = { is_template: true, instantiates_type: "oracle", protocol, template_version: "0.1.0", parameters: [{ name: "service_name", type: "string", required: true, fill_at: "author" }] };
  templateDomain["x-template"] = marker;
  const templateFiles = { "domain.md.tmpl": serialize(templateDomain), ...Object.fromEntries(documents.map(([id, , , text]) => [`${id}.md.tmpl`, `---\n${YAML.stringify({ "x-template": { ...marker, parameters: [] } })}---\n${text}`])), ...Object.fromEntries(Object.entries(resources).map(([path, text]) => [`resources/${path}.tmpl`, `---\n${YAML.stringify({ "x-template": { ...marker, parameters: [] } })}---\n${text}`])) };
  for (const [path, bytes] of Object.entries(templateFiles)) await put(resolve(targetRoot, "templates/oracle", path), bytes);
  const roles = Object.fromEntries(documents.map(([id, role]) => [`${id}.md.tmpl`, role]));
  const manifest = JSON.stringify({ synthetic: true, protocol, version: "0.1.0", bundles: [{ derived_type: "oracle", files: Object.entries(templateFiles).map(([path, bytes]) => ({ role: path === "domain.md.tmpl" ? "domain.md" : roles[path] ?? "x-machine-resource", path: `templates/oracle/${path}`, sha256: digest(bytes), cid: rawCid(bytes), required: true, template_version: "0.1.0" })) }] }, null, 2) + "\n";
  await put(resolve(targetRoot, "templates/manifest.json"), manifest);
  const derived = structuredClone(d);
  derived.domain.class = protocol;
  derived.domain.class_binding = { resource: `ipfs://${rawCid(manifest)}`, cid: rawCid(manifest), version: "0.1.0", merge_policy: "local_explicit_only" };
  derived["x-professional-oracle"].serviceScope.protocols = [protocol];
  for (const [mode, domain] of [["standalone", standalone], ["derived", serialize(derived)]]) {
    await put(resolve(targetRoot, mode, "domain.md"), domain);
    for (const [id, , , text] of documents) await put(resolve(targetRoot, mode, `${id}.md`), text);
    for (const [path, bytes] of Object.entries(resources)) await put(resolve(targetRoot, mode, "resources", path), bytes);
    const lock = JSON.parse(await readFile(new URL("../../domain-author/references/source-lock.json", import.meta.url), "utf8"));
    await put(resolve(targetRoot, mode, "provenance.json"), JSON.stringify({ synthetic: true, operation: mode, specification: lock.domain_md, protocol: mode === "derived" ? protocol : null, templateManifestCid: mode === "derived" ? rawCid(manifest) : null, selectedTemplates: mode === "derived" ? JSON.parse(manifest).bundles[0].files : [], parameters: mode === "derived" ? { service_name: d.name } : null, parameterDigest: mode === "derived" ? digest(JSON.stringify({ service_name: d.name })) : null, renderer: "domain-author-pro-oracle/tests/generate-fixtures.mjs", state: "authoring_draft", adoption: null, publication: null, liveAcceptance: "not_run" }, null, 2) + "\n");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateFixtures();
