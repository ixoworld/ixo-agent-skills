import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateComposition, validateFile } from "../scripts/validate-composition.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function example(name = "decision.example.json") {
  return JSON.parse(await readFile(join(ROOT, "examples", name), "utf8"));
}

function codes(value) {
  return new Set(validateComposition(value).map((item) => item.code));
}

test("all bundled examples pass", async () => {
  for (const name of ["decision.example.json", "expert-service-flow.example.json", "team-project.example.json"]) {
    const report = await validateFile(join(ROOT, "examples", name));
    assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  }
});

test("rejects generated statements marked accepted", async () => {
  const value = await example();
  value.contractDraft.semantic.assumptions[0].statement.provenance.acceptance = "accepted";
  assert(codes(value).has("GENERATED_ACCEPTED"));
});

test("requires confidential contracts to be reference-only and encrypted", async () => {
  const value = await example();
  value.contractDraft.publication.dataClassification = "confidential";
  value.contractDraft.publication.disclosure = "inline";
  value.contractDraft.publication.e2eeRequired = false;
  assert(codes(value).has("SENSITIVE_INLINE"));
  assert(codes(value).has("SENSITIVE_E2EE"));
});

test("rejects colon-form abilities", async () => {
  const value = await example();
  value.collaborationSuggestions.agentRoles[0].requiredAbilities = ["topic:read"];
  assert(codes(value).has("ABILITY_SYNTAX"));
});

test("rejects invented agent identity in an unresolved suggestion", async () => {
  const value = await example();
  value.collaborationSuggestions.agentRoles[0].agentId = "did:ixo:invented-agent";
  assert(codes(value).has("INVENTED_AGENT_ID"));
});

test("requires contract agents to resolve to participants and roles", async () => {
  const value = await example();
  value.contractDraft.semantic.agents.push({
    agentId: "did:ixo:agent:analyst",
    roleId: "missing-role",
    purpose: "Analyse",
    status: "proposed",
    activation: "on_demand",
    output: "Analysis",
    stopWhen: "Complete"
  });
  const result = codes(value);
  assert(result.has("AGENT_PARTICIPANT"));
  assert(result.has("AGENT_ROLE"));
});

test("requires a decision record for a selected option", async () => {
  const value = await example();
  value.contractDraft.semantic.decision.options[0].status = "selected";
  assert(codes(value).has("DECISION_RECORD"));
});

test("requires an outcome record for achieved state", async () => {
  const value = await example();
  value.contractDraft.semantic.outcome.status = "achieved";
  assert(codes(value).has("OUTCOME_RECORD"));
});

test("preview cannot be commit eligible", async () => {
  const value = await example();
  value.execution.commitEligible = true;
  assert(codes(value).has("PREVIEW_COMMIT"));
});

test("continue requires exact revision agreement", async () => {
  const value = await example();
  value.mode = "refine";
  value.disposition = "continue";
  value.topic = {
    operation: "reuse",
    topicId: "ixo:topic:019c8e56-9d28-7c9b-b981-7f8298c96c30",
    expectedStateRevision: "revision-a"
  };
  value.contractDraft.lifecycle = {
    kind: "successor-proposal",
    authority: "proposal-only",
    baseRevision: "revision-b",
    stateEventRole: "materialized-head-only"
  };
  assert(codes(value).has("BASE_REVISION"));
});

test("external actions are prohibited", async () => {
  const value = await example();
  value.execution.externalActions.push({ action: "send-email" });
  assert(codes(value).has("EXTERNAL_ACTIONS"));
});

test("secret-like content is rejected", async () => {
  const value = await example();
  value.sourceIntent.verbatim = `Use token ${["sk", "abcdefghijklmnopqrstuvwxyz1234567890"].join("-")}`;
  value.contractDraft.semantic.intent.text = value.sourceIntent.verbatim;
  value.records[0].content.verbatim = value.sourceIntent.verbatim;
  assert(codes(value).has("SECRET_DETECTED"));
});

test("canvas primary surface is bounded", async () => {
  const value = await example();
  while (value.canvas.blocks.filter((block) => block.visibility === "primary").length <= 7) {
    const index = value.canvas.blocks.length;
    value.canvas.blocks.push({
      id: `extra-${index}`,
      type: "paragraph",
      semanticRole: "extra",
      basis: "suggested",
      visibility: "primary",
      content: "Extra",
      editable: true
    });
  }
  assert(codes(value).has("PRIMARY_CANVAS_LIMIT"));
});

test("weighted criteria must be complete and sum to one", async () => {
  const value = await example();
  value.contractDraft.semantic.decision.method = "weighted_score";
  value.contractDraft.semantic.decision.criteria = [
    { id: "cost", label: "Cost", direction: "minimize", weight: 0.7 },
    { id: "fit", label: "Fit", direction: "maximize", weight: 0.4 }
  ];
  assert(codes(value).has("WEIGHT_SUM"));
});

test("accepts an adopted existing thread root", async () => {
  const value = await example("team-project.example.json");
  value.topic.anchor = {
    mode: "adopted",
    roomId: "!room:example.org",
    rootEventId: "$existing-root",
    manifestSource: "state-event"
  };
  assert.equal(codes(value).has("ANCHOR_MANIFEST_SOURCE"), false);
  assert.equal(codes(value).has("ADOPTED_ROOT"), false);
});

test("derives custom kinds from one standard base kind", async () => {
  const value = await example();
  value.contractDraft.semantic.kindRef = {
    source: "custom",
    customId: "audit",
    label: "Audit",
    baseKind: "evaluation"
  };
  assert.equal(codes(value).has("KIND_RECIPE"), false);
});

test("requires the canonical draft structures for every standard Kind", async () => {
  const required = {
    task: ["outcome", "plan", "completion"],
    agent_task: ["outcome", "agents", "completion"],
    proposal: ["outcome", "decision", "completion"],
    evaluation: ["outcome", "decision", "completion"],
    claims: ["outcome", "attachments", "completion"],
    question: ["outcome", "questions", "completion"],
    discussion: ["completion"],
    incident: ["completion", "risks"]
  };
  const recipes = {
    task: "project",
    agent_task: "flow",
    proposal: "proposal",
    evaluation: "evaluation",
    claims: "claims",
    question: "research",
    discussion: "discussion",
    incident: "incident"
  };
  for (const [kind, fields] of Object.entries(required)) {
    const value = await example("team-project.example.json");
    value.topic.rootDraft.kind = kind;
    value.contractDraft.semantic.kindRef = { source: "standard", kind };
    value.contractDraft.semantic.recipe = recipes[kind];
    for (const field of fields) delete value.contractDraft.semantic[field];
    assert(codes(value).has("KIND_TEMPLATE_FIELD"), `${kind} must require its canonical draft structures`);
  }
});

test("accepts an initialised canonical draft structure for every standard Kind", async () => {
  const recipes = {
    task: "project",
    agent_task: "flow",
    proposal: "proposal",
    evaluation: "evaluation",
    claims: "claims",
    question: "research",
    discussion: "discussion",
    incident: "incident"
  };
  const decision = (await example()).contractDraft.semantic.decision;
  for (const kind of Object.keys(recipes)) {
    const value = await example("team-project.example.json");
    const semantic = value.contractDraft.semantic;
    value.topic.rootDraft.kind = kind;
    semantic.kindRef = { source: "standard", kind };
    semantic.recipe = recipes[kind];
    if (kind === "proposal" || kind === "evaluation") semantic.decision = decision;
    if (kind === "claims") semantic.attachments = [];
    if (kind === "discussion") semantic.completion = {};
    if (kind === "incident") semantic.risks = [];
    const result = codes(value);
    assert.equal(result.has("KIND_TEMPLATE_FIELD"), false, `${kind} template must be initialised`);
    assert.equal(result.has("ROOT_CONTRACT_KIND"), false, `${kind} root and contract must agree`);
  }
});

test("binds the canonical Job profile and typed Job Card resource together", async () => {
  const value = await example("team-project.example.json");
  const profile = {
    id: "https://topic-protocol.ixo.world/profiles/job-card",
    version: "1.0.0",
    schema: "https://topic-protocol.ixo.world/schemas/topic-kind-profile.schema.json",
    digest: "sha256:0991eb565e1253c5caf92e7f06a392edacda6d9d90c3b3111ebfa6bf65b8eaf5"
  };
  const id = "urn:ixo:job:019c8e56-9d28-7c9b-b981-7f8298c96c31";
  value.contractDraft.semantic.kindRef = { source: "custom", customId: "org.ixo.job-card", label: "Job", baseKind: "task" };
  value.contractDraft.semantic.kindProfile = profile;
  value.contractDraft.semantic.kindResource = {
    profile,
    type: "org.ixo.job-card",
    id,
    version: 1,
    value: { version: 1, type: "org.ixo.job-card", id }
  };
  const result = codes(value);
  assert.equal(result.has("JOB_PROFILE"), false);
  assert.equal(result.has("JOB_RESOURCE"), false);
  assert.equal(result.has("PROFILE_RESOURCE_REF"), false);
});

test("rejects an unpinned or mismatched Job profile", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.kindRef = { source: "custom", customId: "org.ixo.job-card", label: "Job", baseKind: "task" };
  value.contractDraft.semantic.kindProfile = {
    id: "https://topic-protocol.ixo.world/profiles/job-card",
    version: "1.0.0",
    schema: "https://topic-protocol.ixo.world/schemas/topic-kind-profile.schema.json",
    digest: `sha256:${"0".repeat(64)}`
  };
  assert(codes(value).has("JOB_PROFILE"));
  assert(codes(value).has("PROFILE_RESOURCE_PAIR"));
});

test("rejects risks outside Incidents and legacy likelihood", async () => {
  const value = await example();
  value.contractDraft.semantic.risks = [{
    id: "risk-1",
    description: "Uncertainty",
    likelihood: "medium",
    status: "open"
  }];
  const result = codes(value);
  assert(result.has("RISKS_INCIDENT_ONLY"));
  assert(result.has("LEGACY_LIKELIHOOD"));
});

test("allows unresolved fields in a v2 Draft", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.outcome = {};
  delete value.contractDraft.semantic.ownerId;
  assert.equal(codes(value).has("SUCCESS_CRITERIA"), false);
  assert.equal(codes(value).has("ACCEPTED_TASK_OWNER"), false);
});

test("enforces base Kind completeness only when a contract is accepted", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.envelope.status = "accepted";
  delete value.contractDraft.semantic.ownerId;
  assert(codes(value).has("ACCEPTED_TASK_OWNER"));
});

test("enforces Job profile completeness in addition to its Task base", async () => {
  const value = await example("team-project.example.json");
  const profile = {
    id: "https://topic-protocol.ixo.world/profiles/job-card",
    version: "1.0.0",
    schema: "https://topic-protocol.ixo.world/schemas/topic-kind-profile.schema.json",
    digest: "sha256:0991eb565e1253c5caf92e7f06a392edacda6d9d90c3b3111ebfa6bf65b8eaf5"
  };
  const id = "urn:ixo:job:019c8e56-9d28-7c9b-b981-7f8298c96c31";
  value.contractDraft.envelope.status = "accepted";
  value.contractDraft.semantic.ownerId = "did:ixo:shaun";
  value.contractDraft.semantic.kindRef = { source: "custom", customId: "org.ixo.job-card", label: "Job", baseKind: "task" };
  value.contractDraft.semantic.kindProfile = profile;
  value.contractDraft.semantic.kindResource = {
    profile,
    type: "org.ixo.job-card",
    id,
    version: 1,
    value: { version: 1, type: "org.ixo.job-card", id }
  };
  const result = codes(value);
  assert(result.has("ACCEPTED_JOB_NUMBER"));
  assert(result.has("ACCEPTED_JOB_PHASE"));
});

test("requires UUIDv7 identities for repeatable contract entries", async () => {
  const value = await example();
  value.contractDraft.semantic.intent.id = "array-index-0";
  assert(codes(value).has("ENTRY_ID"));
});

test("contract schema exposes Protocol 0.8 Kind Profile and typed resource fields", async () => {
  const schema = JSON.parse(await readFile(join(ROOT, "schemas/topic-contract-draft.schema.json"), "utf8"));
  const semantic = schema.properties.semantic.properties;
  assert.deepEqual(semantic.kindProfile.required, ["id", "version", "schema", "digest"]);
  assert.deepEqual(semantic.kindResource.required, ["profile", "type", "id", "version", "value"]);
  assert.equal(semantic.attachments.type, "array");
  assert.equal(semantic.bindings, undefined);
  assert.equal(semantic.completion.properties.acceptanceAuthority, undefined);
  assert.equal(semantic.completion.properties.acceptanceAuthorityIds.type, "array");
  assert.deepEqual(semantic.decision.required, []);
});
