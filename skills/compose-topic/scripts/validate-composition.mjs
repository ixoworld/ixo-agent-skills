#!/usr/bin/env node
/** Validate Compose Topic v3 output. Usage: node scripts/validate-composition.mjs FILE [--json] | --examples [--json] */

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHAPE_PINS = JSON.parse(readFileSync(join(ROOT, "references", "topic-shape-pins.json"), "utf8"));
const WORK = new Set(["create", "continue", "branch", "split"]);
const ACCEPTABLE_ACCEPTED_BASIS = new Set(["explicit", "contextual"]);
const AUTO_ACCEPT_RECORD_CLASSES = new Set(["ixo.topic.fact", "ixo.topic.summary", "ixo.topic.classification"]);
const NEVER_AUTO_ACCEPT_RECORD_CLASSES = new Set([
  "ixo.topic.contract",
  "ixo.topic.outcome",
  "ixo.topic.authority",
  "ixo.topic.action",
  "ixo.claim",
  "ixo.evaluation",
  "ixo.settlement",
]);
const ABILITY = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/u;
const TOPIC = /^ixo:topic:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ENTRY = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const COMMIT = "482139c37eed86387a7ff2609a8672c4216e28f4";
const PACKAGE_SHASUM = "74bd726618060b507243ae5c6fa2493a8948f755";
const PROTOCOL_VERSION = "1.0.0-rc.3";
const COMPOSITION_VERSION = "3.1.0";
const PROFILE = "qi.topic-contract-state/v4";
const KINDS = new Set(["project", "task", "agent_task", "proposal", "evaluation", "claims", "question", "discussion", "incident"]);
const RECIPE_BY_KIND = {
  project: "project",
  task: "project",
  agent_task: "flow",
  proposal: "proposal",
  evaluation: "evaluation",
  claims: "claims",
  question: "research",
  discussion: "discussion",
  incident: "incident",
};
const KIND_FIELDS = {
  project: ["outcome", "project", "completion"],
  task: ["outcome", "plan", "completion"],
  agent_task: ["outcome", "plan", "completion"],
  proposal: ["outcome", "decision", "completion"],
  evaluation: ["outcome", "decision", "completion"],
  claims: ["outcome", "completion"],
  question: ["outcome", "questions", "completion"],
  discussion: ["completion"],
  incident: ["completion", "risks"],
};
const FORBIDDEN_CONTRACT_FIELDS = new Set([
  "recipe",
  "agents",
  "actions",
  "action",
  "actionContract",
  "effectContract",
  "evaluationKit",
  "schedule",
  "automation",
  "settlementContract",
  "claimResolution",
  "progress",
  "stateTags",
  "attention",
]);
const EXAMPLES = [
  "decision.example.json",
  "expert-service-flow.example.json",
  "research-brief.example.json",
  "team-project.example.json",
  "verified-work-payment.example.json",
];
const SECRETS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bsk-[A-Za-z0-9_-]{20,}\b/u,
  /\bghp_[A-Za-z0-9]{30,}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}\b/u,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/u,
  /\b(?:mnemonic|seed phrase|private key)\s*[:=]\s*["']?[^\s"']{16,}/iu,
];

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isSubject = (value) => isObject(value)
  && ["actor", "role"].includes(value.kind)
  && typeof value.id === "string"
  && value.id.length > 0;
const unique = (values) => new Set(values).size === values.length;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const finding = (code, path, message, severity = "error") => ({ code, severity, path, message });

function add(findings, condition, code, path, message, severity = "error") {
  if (!condition) findings.push(finding(code, path, message, severity));
}

function requireObject(findings, value, path, keys) {
  if (!isObject(value)) {
    findings.push(finding("TYPE_OBJECT", path, "must be an object"));
    return false;
  }
  for (const key of keys) {
    add(findings, Object.hasOwn(value, key), "REQUIRED_FIELD", `${path}/${key}`, "is required");
  }
  return true;
}

function baseKind(kindRef) {
  if (!isObject(kindRef)) return undefined;
  return kindRef.source === "standard" ? kindRef.kind : kindRef.source === "custom" ? kindRef.baseKind : undefined;
}

function statementEntries(semantic) {
  const entries = [];
  const push = (value, path) => {
    if (isObject(value)) entries.push([value, path]);
  };
  push(semantic?.intent, "/contractDraft/semantic/intent");
  push(semantic?.outcome?.statement, "/contractDraft/semantic/outcome/statement");
  for (const [name, values] of [
    ["included", semantic?.scope?.included],
    ["excluded", semantic?.scope?.excluded],
    ["constraints", semantic?.constraints],
  ]) {
    for (const [index, value] of (values ?? []).entries()) {
      push(value, `/contractDraft/semantic/${name}/${index}`);
    }
  }
  for (const [name, values] of [
    ["assumptions", semantic?.assumptions],
    ["questions", semantic?.questions],
  ]) {
    for (const [index, value] of (values ?? []).entries()) {
      push(value?.statement, `/contractDraft/semantic/${name}/${index}/statement`);
    }
  }
  return entries;
}

function repeatableEntries(semantic) {
  const entries = [...statementEntries(semantic)];
  const append = (values, path) => {
    for (const [index, value] of (values ?? []).entries()) {
      if (isObject(value)) entries.push([value, `${path}/${index}`]);
    }
  };
  append(semantic?.outcome?.successCriteria, "/contractDraft/semantic/outcome/successCriteria");
  append(semantic?.risks, "/contractDraft/semantic/risks");
  append(semantic?.decision?.options, "/contractDraft/semantic/decision/options");
  append(semantic?.decision?.criteria?.filter(isObject), "/contractDraft/semantic/decision/criteria");
  append(semantic?.plan?.milestones, "/contractDraft/semantic/plan/milestones");
  return entries;
}

function validateTop(value, findings) {
  requireObject(findings, value, "", [
    "version",
    "compositionId",
    "mode",
    "disposition",
    "sourceIntent",
    "protocolBinding",
    "routing",
    "execution",
    "quality",
  ]);
  add(findings, value?.version === COMPOSITION_VERSION, "VERSION", "/version", `must equal ${COMPOSITION_VERSION}`);
  add(
    findings,
    /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value?.compositionId ?? ""),
    "COMPOSITION_ID",
    "/compositionId",
    "must be a UUIDv7 URN",
  );
  add(findings, ["preview", "commit", "refine"].includes(value?.mode), "MODE", "/mode", "unsupported mode");
  add(findings, ["create", "continue", "branch", "split", "clarify", "answer-without-topic"].includes(value?.disposition), "DISPOSITION", "/disposition", "unsupported disposition");
  add(findings, typeof value?.sourceIntent?.verbatim === "string" && value.sourceIntent.verbatim.length > 0, "VERBATIM_INTENT", "/sourceIntent/verbatim", "must preserve the person's exact intent");
}

function validateProtocolBinding(value, findings) {
  const binding = value.protocolBinding;
  requireObject(findings, binding, "/protocolBinding", [
    "package",
    "topicProtocolVersion",
    "rootVersion",
    "contractBodyVersion",
    "stateVersion",
    "contractProfile",
    "sourceCommit",
    "packageShasum",
    "legacyPolicy",
  ]);
  add(findings, binding?.package === "@ixo/topic-protocol", "PROTOCOL_PACKAGE", "/protocolBinding/package", "package mismatch");
  add(findings, binding?.topicProtocolVersion === PROTOCOL_VERSION, "PROTOCOL_VERSION", "/protocolBinding/topicProtocolVersion", `must equal ${PROTOCOL_VERSION}`);
  add(findings, binding?.rootVersion === 4 && binding?.contractBodyVersion === 4 && binding?.stateVersion === 4, "PROTOCOL_V4", "/protocolBinding", "root, body, and state must use version 4");
  add(findings, binding?.contractProfile === PROFILE, "CONTRACT_PROFILE", "/protocolBinding/contractProfile", `must equal ${PROFILE}`);
  add(findings, binding?.sourceCommit === COMMIT, "SOURCE_COMMIT", "/protocolBinding/sourceCommit", `must equal ${COMMIT}`);
  add(findings, binding?.packageShasum === PACKAGE_SHASUM, "PACKAGE_SHASUM", "/protocolBinding/packageShasum", "published package shasum mismatch");
  add(findings, binding?.legacyPolicy === "v4-only-no-migration", "LEGACY_POLICY", "/protocolBinding/legacyPolicy", "must reject legacy runtime and migration");
}

function validateDisposition(value, findings) {
  if (WORK.has(value.disposition)) {
    for (const key of ["interpretation", "topic", "recipeSelection", "contractDraft", "canvas", "collaborationSuggestions", "firstTurn", "records"]) {
      add(findings, Object.hasOwn(value, key), "REQUIRED_WORK_FIELD", `/${key}`, "is required for a Topic disposition");
    }
  }
  if (["create", "branch", "split"].includes(value.disposition)) {
    add(findings, value.topic?.operation === "create", "CREATE_OPERATION", "/topic/operation", "must be create");
    add(findings, isObject(value.topic?.rootDraft), "ROOT_DRAFT", "/topic/rootDraft", "is required");
    add(findings, value.contractDraft?.lifecycle?.kind !== "successor-proposal", "CONTRACT_LIFECYCLE", "/contractDraft", "new Topics cannot be successor proposals");
  }
  if (value.disposition === "continue" || value.mode === "refine") {
    add(findings, value.topic?.operation === "reuse", "REUSE_OPERATION", "/topic/operation", "must be reuse");
    add(findings, TOPIC.test(value.topic?.topicId ?? ""), "TOPIC_ID", "/topic/topicId", "must identify the existing Topic");
    add(findings, value.topic?.observedProfile === PROFILE, "LEGACY_TOPIC", "/topic/observedProfile", "only v4 Topics may be refined");
    add(findings, typeof value.topic?.expectedTopicRevision === "string", "EXPECTED_TOPIC_REVISION", "/topic/expectedTopicRevision", "is required");
    add(findings, typeof value.topic?.expectedContractRevision === "string", "EXPECTED_CONTRACT_REVISION", "/topic/expectedContractRevision", "is required");
    add(findings, DIGEST.test(value.topic?.expectedShapeDigest ?? ""), "EXPECTED_SHAPE_DIGEST", "/topic/expectedShapeDigest", "is required");
  }
  if (value.disposition === "branch") {
    add(findings, TOPIC.test(value.routing?.parentTopicId ?? ""), "PARENT_TOPIC", "/routing/parentTopicId", "is required");
  }
  if (value.disposition === "split") {
    add(findings, (value.routing?.proposedChildren?.length ?? 0) > 0, "SPLIT_CHILDREN", "/routing/proposedChildren", "must propose at least one child");
  }
}

function validateRecipe(value, findings) {
  if (!WORK.has(value.disposition)) return;
  const semantic = value.contractDraft?.semantic;
  const kind = baseKind(semantic?.kindRef);
  const selection = value.recipeSelection;
  add(findings, KINDS.has(kind), "KIND", "/contractDraft/semantic/kindRef", "must resolve to one canonical Kind");
  const expectedBase = RECIPE_BY_KIND[kind];
  add(findings, selection?.baseRecipe === expectedBase, "KIND_BASE_RECIPE", "/recipeSelection/baseRecipe", "must match the selected Kind");
  add(findings, semantic?.baseRecipe === expectedBase, "CONTRACT_BASE_RECIPE", "/contractDraft/semantic/baseRecipe", "must match the selected Kind");
  add(findings, value.topic?.rootDraft === undefined || value.topic.rootDraft.baseRecipe === expectedBase, "ROOT_BASE_RECIPE", "/topic/rootDraft/baseRecipe", "must match the selected Kind");
  add(findings, selection?.registryLookup === "not-performed" && selection?.registryReason === "pinned-catalog-only", "RECIPE_LOOKUP", "/recipeSelection", "Marketplace lookup is not available yet");
  add(findings, selection?.reviewState === "draft", "RECIPE_REVIEW_STATE", "/recipeSelection/reviewState", "every recipe selection must remain a Draft");

  const pin = selection?.strategy === "topic-recipe"
    ? SHAPE_PINS.topicRecipes?.[selection.topicRecipeCode]
    : SHAPE_PINS.baseCompositions?.[kind];
  add(findings, isObject(pin), "SHAPE_PIN", "/recipeSelection", "must use a pinned Base or Topic Recipe entry");
  if (!isObject(pin)) return;
  add(findings, pin.kind === undefined || pin.kind === kind, "TOPIC_RECIPE_KIND", "/recipeSelection/topicRecipeCode", "Topic Recipe does not match Kind");
  add(findings, pin.baseRecipe === expectedBase, "TOPIC_RECIPE_BASE", "/recipeSelection/baseRecipe", "Topic Recipe does not extend this Base Recipe");
  add(findings, same(selection.shapeSources, pin.shapeSources), "SHAPE_SOURCES", "/recipeSelection/shapeSources", "must equal the resolver's pinned source list");
  add(findings, selection.shapeDigest === pin.shapeDigest, "SHAPE_DIGEST", "/recipeSelection/shapeDigest", "must equal the resolver's Effective Shape digest");
  if (selection.strategy === "topic-recipe") {
    add(findings, same(selection.topicRecipeRef, pin.topicRecipeRef), "TOPIC_RECIPE_REF", "/recipeSelection/topicRecipeRef", "must equal the pinned Topic Recipe reference");
    add(findings, pin.creates === "draft", "TOPIC_RECIPE_CREATES", "/recipeSelection/reviewState", "Topic Recipe must create a Draft");
  } else {
    add(findings, selection.topicRecipeRef === undefined && selection.topicRecipeCode === undefined, "BASE_RECIPE_ONLY", "/recipeSelection", "Base Recipe strategy cannot carry a Topic Recipe");
  }
  add(findings, same(semantic?.shapeSources, selection.shapeSources), "CONTRACT_SHAPE_SOURCES", "/contractDraft/semantic/shapeSources", "must match recipe selection");
  add(findings, semantic?.shapeDigest === selection.shapeDigest, "CONTRACT_SHAPE_DIGEST", "/contractDraft/semantic/shapeDigest", "must match recipe selection");
  add(findings, same(semantic?.topicRecipeRef, selection.topicRecipeRef), "CONTRACT_TOPIC_RECIPE", "/contractDraft/semantic/topicRecipeRef", "must match recipe selection");
  if (value.topic?.rootDraft) {
    add(findings, value.topic.rootDraft.shapeDigest === selection.shapeDigest, "ROOT_SHAPE_DIGEST", "/topic/rootDraft/shapeDigest", "must match recipe selection");
    add(findings, same(value.topic.rootDraft.topicRecipeRef, selection.topicRecipeRef), "ROOT_TOPIC_RECIPE", "/topic/rootDraft/topicRecipeRef", "must match recipe selection");
    add(findings, value.topic.rootDraft.kind === kind, "ROOT_CONTRACT_KIND", "/topic/rootDraft/kind", "root and contract Kind must agree");
  }
}

function validateContract(value, findings) {
  const draft = value.contractDraft;
  if (!requireObject(findings, draft, "/contractDraft", ["envelope", "semantic", "setupObligations", "publication", "readiness", "unresolvedHostFields"])) return;
  const envelope = draft.envelope;
  const semantic = draft.semantic;
  requireObject(findings, envelope, "/contractDraft/envelope", ["version", "revision", "authoredBy", "authoredAt"]);
  requireObject(findings, semantic, "/contractDraft/semantic", ["kindRef", "workingMode", "baseRecipe", "shapeSources", "shapeDigest", "activationPolicy"]);
  add(findings, envelope?.version === 4, "CONTRACT_VERSION", "/contractDraft/envelope/version", "must equal 4");
  add(findings, !Object.hasOwn(envelope ?? {}, "status"), "IMMUTABLE_BODY_STATUS", "/contractDraft/envelope/status", "lifecycle status belongs to contract heads and replayed operations, not the immutable body");
  if (["create", "branch", "split"].includes(value.disposition)) {
    add(findings, value.topic?.rootDraft?.status === "draft", "NEW_ROOT_DRAFT", "/topic/rootDraft/status", "every new Topic root must be a Draft");
  }
  for (const field of Object.keys(semantic ?? {})) {
    add(findings, !FORBIDDEN_CONTRACT_FIELDS.has(field), "V4_CONTRACT_BOUNDARY", `/contractDraft/semantic/${field}`, "does not belong in a v4 Topic Contract body");
  }
  add(findings, Array.isArray(semantic?.shapeSources) && semantic.shapeSources.length >= 2, "SHAPE_SOURCE_COUNT", "/contractDraft/semantic/shapeSources", "must pin the Base Recipe and Kind Shape at minimum");
  add(findings, DIGEST.test(semantic?.shapeDigest ?? ""), "CONTRACT_SHAPE_DIGEST", "/contractDraft/semantic/shapeDigest", "must be a SHA-256 digest");

  const kind = baseKind(semantic?.kindRef);
  for (const field of KIND_FIELDS[kind] ?? []) {
    add(findings, Object.hasOwn(semantic ?? {}, field), "KIND_TEMPLATE_FIELD", `/contractDraft/semantic/${field}`, `${kind} Draft must initialise this structure`);
  }
  if (!new Set(["incident", "project"]).has(kind) && Array.isArray(semantic?.risks) && semantic.risks.length > 0) {
    findings.push(finding("RISKS_KIND_BOUNDARY", "/contractDraft/semantic/risks", "risks are available only for Incident and Project Drafts"));
  }
  for (const [index, risk] of (semantic?.risks ?? []).entries()) {
    add(findings, !Object.hasOwn(risk, "likelihood"), "LEGACY_LIKELIHOOD", `/contractDraft/semantic/risks/${index}`, "v4 uses Impact-only risk");
  }

  for (const [statement, path] of statementEntries(semantic)) {
    add(findings, ENTRY.test(statement.id ?? ""), "ENTRY_ID", `${path}/id`, "must be UUIDv7");
    const provenance = statement.provenance;
    add(findings, isObject(provenance), "STATEMENT_PROVENANCE", `${path}/provenance`, "is required");
    if (["inferred", "suggested", "retrieved"].includes(provenance?.basis)) {
      add(findings, provenance.acceptance === "proposed", "GENERATED_ACCEPTED", `${path}/provenance/acceptance`, "generated contract terms must remain proposed");
    }
  }
  for (const [entry, path] of repeatableEntries(semantic)) {
    add(findings, ENTRY.test(entry.id ?? ""), "ENTRY_ID", `${path}/id`, "must be UUIDv7");
  }

  const selected = semantic?.decision?.options?.some((option) => option.status === "selected");
  add(findings, !selected || typeof semantic?.decision?.decisionRecordId === "string", "DECISION_RECORD", "/contractDraft/semantic/decision/decisionRecordId", "a selected option requires an accepted decision record");
  add(findings, semantic?.outcome?.status !== "achieved" || typeof semantic?.outcome?.outcomeRecordId === "string", "OUTCOME_RECORD", "/contractDraft/semantic/outcome/outcomeRecordId", "an achieved outcome requires an accepted outcome record");

  const criteria = semantic?.decision?.criteria?.filter(isObject) ?? [];
  const weights = criteria.map((criterion) => criterion.weight).filter((weight) => typeof weight === "number");
  if (weights.length > 0) {
    add(findings, weights.length === criteria.length, "WEIGHT_COMPLETENESS", "/contractDraft/semantic/decision/criteria", "all criteria must be weighted or none");
    const sum = weights.reduce((total, weight) => total + weight, 0);
    add(findings, Math.abs(sum - 1) < 1e-9, "WEIGHT_SUM", "/contractDraft/semantic/decision/criteria", "weights must sum to 1");
  }

  const claim = semantic?.claimBinding;
  if (claim !== undefined) {
    add(findings, isObject(claim) && Object.keys(claim).length === 2, "SINGULAR_CLAIM_BINDING", "/contractDraft/semantic/claimBinding", "must contain only entityDid and collectionId");
    add(findings, /^did:ixo:/u.test(claim?.entityDid ?? ""), "CLAIM_ENTITY", "/contractDraft/semantic/claimBinding/entityDid", "must be one IXO Entity DID");
    add(findings, typeof claim?.collectionId === "string" && claim.collectionId.length > 0, "CLAIM_COLLECTION", "/contractDraft/semantic/claimBinding/collectionId", "must be one collection ID");
  }
  if (value.claimResolutionEvidence !== undefined) {
    add(findings, isObject(claim), "CLAIM_RESOLUTION_BINDING", "/claimResolutionEvidence", "requires a contract claim binding");
    add(findings, value.claimResolutionEvidence.entityDid === claim?.entityDid && value.claimResolutionEvidence.collectionId === claim?.collectionId, "CLAIM_RESOLUTION_MATCH", "/claimResolutionEvidence", "must resolve the exact bound entity and collection");
    add(findings, value.claimResolutionEvidence.readOnly === true, "CLAIM_RESOLUTION_READ_ONLY", "/claimResolutionEvidence/readOnly", "resolution evidence is read-only");
  }
  validateSetupPolicy(draft, semantic, findings);
  validateProject(draft, semantic, kind, findings);
  const publication = draft.publication;
  if (["confidential", "restricted"].includes(publication?.dataClassification)) {
    add(findings, publication.disclosure === "reference-only", "SENSITIVE_INLINE", "/contractDraft/publication/disclosure", "sensitive contracts must be reference-only");
    add(findings, publication.e2eeRequired === true, "SENSITIVE_E2EE", "/contractDraft/publication/e2eeRequired", "sensitive contracts require E2EE");
  }
  add(findings, publication?.embedsCanvasContent === false, "CANVAS_EMBED", "/contractDraft/publication/embedsCanvasContent", "canvas content must not be embedded");
  add(findings, publication?.containsProviderSessionIds === false, "PROVIDER_SESSION", "/contractDraft/publication/containsProviderSessionIds", "provider session IDs must remain private");
}

function validateSetupPolicy(draft, semantic, findings) {
  const policy = semantic?.activationPolicy;
  add(findings, isObject(policy), "ACTIVATION_POLICY", "/contractDraft/semantic/activationPolicy", "every v4 composition must expose a partial activation policy object");
  const obligations = Array.isArray(draft.setupObligations) ? draft.setupObligations : [];
  const obligationCodes = new Set(obligations.map((item) => item?.code));
  const expectedMissing = [
    [!(policy?.editors?.length > 0), "setup.editors"],
    [!isObject(policy?.confirmation), "setup.confirmation-policy"],
  ];
  for (const [missing, code] of expectedMissing) {
    add(findings, !missing || obligationCodes.has(code), "MISSING_SETUP_OBLIGATION", "/contractDraft/setupObligations", `${code} must remain visible while unresolved`);
  }
  for (const [index, obligation] of obligations.entries()) {
    add(findings, typeof obligation?.prompt === "string" && obligation.prompt.length > 0, "OBLIGATION_PROMPT", `/contractDraft/setupObligations/${index}/prompt`, "must name the concrete choice in plain language");
    add(findings, typeof obligation?.purpose === "string" && obligation.purpose.length > 0, "OBLIGATION_PURPOSE", `/contractDraft/setupObligations/${index}/purpose`, "must explain why the choice is needed");
    add(findings, typeof obligation?.unlocks === "string" && obligation.unlocks.length > 0, "OBLIGATION_UNLOCKS", `/contractDraft/setupObligations/${index}/unlocks`, "must explain what resolving the choice permits");
  }
  if (policy?.lifecycle !== undefined) {
    add(findings, policy.lifecycle.onExpiry === "pause-consequential", "EXPIRY_BEHAVIOR", "/contractDraft/semantic/activationPolicy/lifecycle/onExpiry", "must pause consequential progression");
  }
  const thresholdRules = [
    [policy?.confirmation, "/contractDraft/semantic/activationPolicy/confirmation"],
    [semantic?.assentPolicy, "/contractDraft/semantic/assentPolicy"],
  ];
  for (const [rule, path] of thresholdRules) {
    if (!isObject(rule)) continue;
    const subjects = rule.subjects ?? rule.signatories ?? [];
    add(findings, rule.mode !== "threshold" || (Number.isInteger(rule.threshold) && rule.threshold > 0 && rule.threshold <= subjects.length), "POLICY_THRESHOLD", path, "threshold must be positive and no greater than the named subjects");
  }
  add(findings, semantic?.assentPolicy === undefined || semantic?.workingMode !== "solo", "SOLO_ASSENT", "/contractDraft/semantic/assentPolicy", "agreement signatories are available only for team or client Topics");

  const provenance = semantic?.fieldProvenance ?? {};
  const authorityPaths = [
    [policy?.editors, "/activationPolicy/editors"],
    [policy?.confirmation, "/activationPolicy/confirmation"],
    [policy?.dispute?.resolvers, "/activationPolicy/dispute/resolvers"],
    [semantic?.assentPolicy, "/assentPolicy"],
  ];
  for (const [entry, path] of authorityPaths) {
    if (entry === undefined) continue;
    const proof = provenance[path];
    add(findings, isObject(proof) && ["explicit", "contextual"].includes(proof.basis), "POLICY_PROVENANCE", `/contractDraft/semantic/fieldProvenance${path}`, "named authority must come from explicit or accepted context, never owner or creator fallback");
  }
  for (const name of ["effectiveAt", "reviewAt", "expiresAt"]) {
    if (policy?.lifecycle?.[name] === undefined) continue;
    const path = `/activationPolicy/lifecycle/${name}`;
    const proof = provenance[path];
    add(findings, isObject(proof) && ["explicit", "contextual"].includes(proof.basis), "LIFECYCLE_PROVENANCE", `/contractDraft/semantic/fieldProvenance${path}`, "dates must be supplied or accepted, never invented");
  }
}

function validateProject(draft, semantic, kind, findings) {
  if (kind !== "project") return;
  const project = semantic?.project;
  const provenance = semantic?.fieldProvenance ?? {};
  add(findings, isObject(project) && project.version === 1, "PROJECT_PLAN", "/contractDraft/semantic/project", "Project Drafts require a version 1 Project plan");
  const obligationCodes = new Set((draft.setupObligations ?? []).map((item) => item?.code));
  add(findings, isObject(semantic?.outcome?.statement) || obligationCodes.has("setup.result"), "PROJECT_OUTCOME_OBLIGATION", "/contractDraft/setupObligations", "a missing Project outcome must remain visible");
  const acceptedField = (path) => {
    const proof = provenance[path];
    return isObject(proof)
      && ACCEPTABLE_ACCEPTED_BASIS.has(proof.basis)
      && proof.acceptance === "accepted";
  };
  const acceptedAuthority = (name) => {
    return isSubject(project?.[name])
      && acceptedField(`/project/${name}`);
  };
  add(findings, acceptedAuthority("lead") || obligationCodes.has("setup.project-lead"), "PROJECT_LEAD_OBLIGATION", "/contractDraft/setupObligations", "a missing, invalid, or unaccepted Project lead must remain visible");
  add(findings, acceptedAuthority("closer") || obligationCodes.has("setup.project-closer"), "PROJECT_CLOSER_OBLIGATION", "/contractDraft/setupObligations", "a missing, invalid, or unaccepted Project closer must remain visible without being defaulted");
  for (const [index] of (project?.milestones ?? []).entries()) {
    const path = `/project/milestones/${index}`;
    add(findings, acceptedField(path), "PROJECT_MILESTONE_PROVENANCE", `/contractDraft/semantic/fieldProvenance${path}`, "materialized Project milestones require explicit or contextual accepted provenance");
  }
  const allowedChildren = new Set(["task", "agent_task", "proposal", "evaluation", "claims", "incident", "question", "discussion"]);
  for (const [index, child] of (project?.childObligations ?? []).entries()) {
    add(findings, child.kind === undefined || allowedChildren.has(child.kind), "PROJECT_CHILD_KIND", `/contractDraft/semantic/project/childObligations/${index}/kind`, "must be an allowed non-Project child Kind");
    const path = `/project/childObligations/${index}/kind`;
    add(findings, child.kind === undefined || acceptedField(path), "PROJECT_CHILD_KIND_PROVENANCE", `/contractDraft/semantic/fieldProvenance${path}`, "a selected Project child Kind requires explicit or contextual accepted provenance");
  }
  add(findings, project?.methodManifestRef === undefined || acceptedField("/project/methodManifestRef"), "PROJECT_METHOD_MANIFEST_PROVENANCE", "/contractDraft/semantic/fieldProvenance/project/methodManifestRef", "a method manifest binding requires an immutable supplied or verified reference with accepted provenance");
}

function validateCanvas(value, findings) {
  const canvas = value.canvas;
  if (!isObject(canvas)) return;
  const blocks = canvas.blocks ?? [];
  const ids = blocks.map((block) => block.id);
  add(findings, blocks.length >= 3 && blocks.length <= 20, "CANVAS_LIMIT", "/canvas/blocks", "must contain 3 to 20 blocks");
  add(findings, unique(ids), "DUPLICATE_CANVAS_BLOCK", "/canvas/blocks", "block IDs must be unique");
  add(findings, blocks.filter((block) => block.visibility === "primary").length <= 7, "PRIMARY_CANVAS_LIMIT", "/canvas/blocks", "at most seven primary blocks");
  add(findings, blocks[0]?.semanticRole === "outcome", "OUTCOME_FIRST", "/canvas/blocks/0/semanticRole", "outcome must be first");
  add(findings, ids.includes(canvas.focusBlockId), "FOCUS_BLOCK", "/canvas/focusBlockId", "must resolve");
  add(findings, ids.includes(canvas.nextActionBlockId), "NEXT_ACTION_BLOCK", "/canvas/nextActionBlockId", "must resolve");
  add(findings, blocks.find((block) => block.id === canvas.nextActionBlockId)?.semanticRole === "next-action", "NEXT_ACTION_ROLE", "/canvas/nextActionBlockId", "must identify the next action");
}

function validateCollaboration(value, findings) {
  const suggestions = value.collaborationSuggestions;
  if (!isObject(suggestions)) return;
  add(findings, unique((suggestions.humanRoles ?? []).map((role) => role.roleId)), "DUPLICATE_HUMAN_ROLE", "/collaborationSuggestions/humanRoles", "role IDs must be unique");
  add(findings, unique((suggestions.agentRoles ?? []).map((role) => role.roleId)), "DUPLICATE_AGENT_ROLE", "/collaborationSuggestions/agentRoles", "role IDs must be unique");
  add(findings, (suggestions.agentRoles ?? []).filter((role) => role.activation === "now").length <= 1, "IMMEDIATE_AGENT_LIMIT", "/collaborationSuggestions/agentRoles", "at most one agent role may be suggested now");
  for (const [index, role] of (suggestions.agentRoles ?? []).entries()) {
    add(findings, !Object.hasOwn(role, "agentId"), "INVENTED_AGENT_ID", `/collaborationSuggestions/agentRoles/${index}`, "suggestions must not contain a stable agent identity");
    for (const [abilityIndex, ability] of (role.requiredAbilities ?? []).entries()) {
      add(findings, ABILITY.test(ability), "ABILITY_SYNTAX", `/collaborationSuggestions/agentRoles/${index}/requiredAbilities/${abilityIndex}`, "must use slash syntax");
    }
    if (role.activation === "on_condition") {
      add(findings, typeof role.activationCondition === "string" && role.activationCondition.length > 0, "SUGGESTED_AGENT_CONDITION", `/collaborationSuggestions/agentRoles/${index}/activationCondition`, "is required");
    }
  }
}

function validateRecords(value, findings) {
  const records = value.records;
  if (!Array.isArray(records)) return;
  add(findings, unique(records.map((record) => record.localId)), "DUPLICATE_RECORD", "/records", "record IDs must be unique");
  for (const [index, record] of records.entries()) {
    if (!record.accepted) continue;
    if (record.basis === "inferred") {
      add(findings, record.kind === "fact" && AUTO_ACCEPT_RECORD_CLASSES.has(record.recordClass), "INFERRED_RECORD_POLICY", `/records/${index}`, "only Shape-permitted non-effecting fact, summary, or classification records may auto-accept");
    } else {
      add(findings, ACCEPTABLE_ACCEPTED_BASIS.has(record.basis), "GENERATED_RECORD_ACCEPTED", `/records/${index}/accepted`, "suggested or retrieved records must remain proposed");
    }
    add(findings, !NEVER_AUTO_ACCEPT_RECORD_CLASSES.has(record.recordClass), "CONSEQUENTIAL_RECORD_ACCEPTED", `/records/${index}/accepted`, "consequential inferred records must remain proposed");
  }
  if (["create", "branch", "split"].includes(value.disposition)) {
    const intent = records.find((record) => record.kind === "memory" && record.accepted && record.content?.type === "user-intent");
    add(findings, isObject(intent), "INTENT_MEMORY", "/records", "the first accepted record must preserve intent");
    add(findings, intent?.content?.verbatim === value.sourceIntent?.verbatim, "INTENT_MEMORY_FIDELITY", "/records", "verbatim intent does not match");
    add(findings, records[0] === intent, "INTENT_MEMORY_FIRST", "/records/0", "verbatim intent memory must be the first accepted record");
  }
}

function validateFirstTurn(value, findings) {
  const first = value.firstTurn;
  if (!isObject(first)) return;
  const actions = first.quickActions ?? [];
  const ids = actions.map((action) => action.id);
  add(findings, actions.length >= 2 && actions.length <= 4, "QUICK_ACTION_COUNT", "/firstTurn/quickActions", "must contain 2 to 4 actions");
  add(findings, unique(ids), "DUPLICATE_QUICK_ACTION", "/firstTurn/quickActions", "action IDs must be unique");
  add(findings, ids.includes(first.defaultActionId), "DEFAULT_QUICK_ACTION", "/firstTurn/defaultActionId", "must resolve");
}

function validateExecution(value, findings) {
  const execution = value.execution;
  if (!requireObject(findings, execution, "/execution", ["commitEligible", "hostContext", "idempotencyKey", "proposedCalls", "externalActions", "stateEventPlan"])) return;
  add(findings, Array.isArray(execution.externalActions) && execution.externalActions.length === 0, "EXTERNAL_ACTIONS", "/execution/externalActions", "must remain empty");
  if (value.mode === "preview") {
    add(findings, execution.commitEligible === false, "PREVIEW_COMMIT", "/execution/commitEligible", "preview cannot commit");
  }
  const calls = execution.proposedCalls ?? [];
  if (execution.commitEligible) {
    add(findings, value.mode === "commit", "COMMIT_MODE", "/execution/commitEligible", "requires commit mode");
    add(findings, execution.hostContext?.roomId?.startsWith("!"), "COMMIT_ROOM", "/execution/hostContext/roomId", "is required");
    add(findings, typeof execution.hostContext?.actorId === "string", "COMMIT_ACTOR", "/execution/hostContext/actorId", "is required");
    add(findings, execution.hostContext?.matrixWrite === true, "MATRIX_WRITE", "/execution/hostContext/matrixWrite", "verified Matrix write permission is required");
    const abilities = new Set(execution.hostContext?.verifiedAbilities ?? []);
    for (const [index, call] of calls.entries()) {
      add(findings, abilities.has(call.requiredAbility), "VERIFIED_ABILITY", `/execution/proposedCalls/${index}/requiredAbility`, "required ability is not verified");
    }
  }
  add(findings, execution.idempotencyKey?.startsWith(`${value.compositionId}:`), "COMMIT_IDEMPOTENCY", "/execution/idempotencyKey", "must derive from compositionId");
  const keys = [execution.idempotencyKey, ...calls.map((call) => call.idempotencyKey)];
  add(findings, unique(keys), "DUPLICATE_IDEMPOTENCY", "/execution", "idempotency keys must be unique");
  for (const [index, call] of calls.entries()) {
    add(findings, call.idempotencyKey?.startsWith(`${value.compositionId}:`), "CALL_IDEMPOTENCY", `/execution/proposedCalls/${index}/idempotencyKey`, "must derive from compositionId");
    add(findings, ABILITY.test(call.requiredAbility ?? ""), "CALL_ABILITY", `/execution/proposedCalls/${index}/requiredAbility`, "must use slash syntax");
    add(findings, call.boundTo?.shapeDigest === value.recipeSelection?.shapeDigest, "CALL_SHAPE_BINDING", `/execution/proposedCalls/${index}/boundTo/shapeDigest`, "must bind the resolved Shape digest");
    if (call.sideEffect !== "none") {
      add(findings, ["policy", "human"].includes(call.confirmation), "SIDE_EFFECT_CONFIRMATION", `/execution/proposedCalls/${index}/confirmation`, "is required");
    }
  }
  const plan = execution.stateEventPlan;
  add(findings, plan?.profile === PROFILE && plan?.version === 4, "STATE_PROFILE", "/execution/stateEventPlan", "must publish the v4 profile");
  add(findings, plan?.shapeRecordPersisted === false, "EFFECTIVE_SHAPE_RECORD", "/execution/stateEventPlan/shapeRecordPersisted", "must not persist a separate Effective Shape record");
}

function validateSensitive(value, findings) {
  const text = JSON.stringify(value);
  for (const pattern of SECRETS) {
    add(findings, !pattern.test(text), "SECRET_DETECTED", "", "contains secret-like material");
  }
  const walk = (entry, path = "") => {
    if (Array.isArray(entry)) {
      entry.forEach((child, index) => walk(child, `${path}/${index}`));
      return;
    }
    if (!isObject(entry)) return;
    for (const [key, child] of Object.entries(entry)) {
      const childPath = `${path}/${key}`;
      const normalized = key.toLowerCase();
      if (["chainofthought", "chain_of_thought", "reasoningtrace", "private_reasoning", "providersessionid", "sessionreference", "companionSessionId"].map((name) => name.toLowerCase()).includes(normalized)) {
        findings.push(finding("PROHIBITED_FIELD", childPath, "must not enter shared output"));
      }
      walk(child, childPath);
    }
  };
  walk(value);
}

export function validateComposition(value) {
  const findings = [];
  validateTop(value, findings);
  if (!isObject(value)) return findings;
  validateProtocolBinding(value, findings);
  validateDisposition(value, findings);
  if (WORK.has(value.disposition)) {
    validateRecipe(value, findings);
    validateContract(value, findings);
    validateCanvas(value, findings);
    validateCollaboration(value, findings);
    validateRecords(value, findings);
    validateFirstTurn(value, findings);
  }
  validateExecution(value, findings);
  validateSensitive(value, findings);
  return findings;
}

export async function validateFile(file) {
  const path = resolve(file);
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    const findings = validateComposition(value);
    return { file: path, ok: findings.length === 0, findings };
  } catch (error) {
    return { file: path, ok: false, findings: [finding("JSON_PARSE", "", error instanceof Error ? error.message : String(error))] };
  }
}

export async function main(options = {}) {
  if (!options.examples && !options.file) throw new Error("A composition file or --examples is required");
  const files = options.examples ? EXAMPLES.map((name) => join(ROOT, "examples", name)) : [resolve(options.file)];
  const reports = [];
  for (const file of files) reports.push(await validateFile(file));
  const findings = reports.flatMap((report) => report.findings.map((item) => ({ ...item, file: report.file })));
  return {
    validator: "compose-topic-validator",
    version: COMPOSITION_VERSION,
    ok: findings.length === 0,
    files: reports.map((report) => ({ file: report.file, ok: report.ok, findingCount: report.findings.length })),
    findings,
  };
}

function argumentsFrom(argv) {
  const options = { json: false, examples: false };
  for (const value of argv) {
    if (value === "--json") options.json = true;
    else if (value === "--examples") options.examples = true;
    else if (value.startsWith("-")) throw new Error(`Unknown option: ${value}`);
    else if (!options.file) options.file = value;
    else throw new Error(`Unexpected argument: ${value}`);
  }
  return options;
}

async function cli() {
  try {
    const options = argumentsFrom(process.argv.slice(2));
    const result = await main(options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Compose Topic validation: ${result.ok ? "PASSED" : "FAILED"}`);
      for (const file of result.files) console.log(`- ${file.file}: ${file.ok ? "OK" : `${file.findingCount} finding(s)`}`);
      for (const item of result.findings) console.error(`  ${item.code} ${item.path}: ${item.message}`);
    }
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli();
