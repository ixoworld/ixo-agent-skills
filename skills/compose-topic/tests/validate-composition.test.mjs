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
