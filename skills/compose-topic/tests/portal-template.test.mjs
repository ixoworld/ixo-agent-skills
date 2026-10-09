import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateComposition } from "../scripts/validate-composition.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const KINDS = ["project", "task", "agent_task", "proposal", "evaluation", "claims", "question", "discussion", "incident"];
const PEOPLE_BY_KIND = {
  project: ["setup.project-lead", "setup.project-closer"],
  question: ["setup.owner", "setup.answer-reviewer"],
};

async function templateBlocks() {
  const text = (await readFile(join(root, "references/portal-create-template.md"), "utf8")).replaceAll("\r\n", "\n");
  const blocks = [...text.matchAll(/```json\n([\s\S]*?)\n```/gu)].map((match) => JSON.parse(match[1]));
  assert.equal(blocks.length, 3, "template has the skeleton, the pins block and the people obligations");
  return { skeleton: blocks[0], pins: blocks[1], people: Object.fromEntries(blocks[2].map((item) => [item.code, item])), text };
}

function uuidv7(seed) {
  const hex = seed.toString(16).padStart(12, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7000-8000-000000000000`;
}

function sourcesFor(pins, kind) {
  const entry = pins.kinds[kind];
  return [pins.baseRecipeSources[entry.baseRecipe], { kind: "kind", id: `https://topic-protocol.ixo.world/kinds/${kind}`, version: "1.0.0-rc.7", digest: entry.kindDigest }];
}

function fill(skeleton, pins, kind) {
  const entry = pins.kinds[kind];
  const sources = sourcesFor(pins, kind);
  let counter = 1;
  const substitute = (value) => {
    if (Array.isArray(value)) return value.map(substitute);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item)]));
    if (typeof value !== "string") return value;
    if (value === "<<PINS.shapeSources>>") return sources;
    if (value === "<<PINS.shapeDigest>>") return entry.shapeDigest;
    if (value === "<<PINS.baseRecipe>>") return entry.baseRecipe;
    if (value === "<<KIND>>") return kind;
    if (value === "urn:uuid:<<UUIDV7>>") return "urn:uuid:01a0c310-af83-736d-94ae-3c624c394616";
    if (value === "urn:uuid:<<SAME_UUIDV7_AS_compositionId>>:commit") return "urn:uuid:01a0c310-af83-736d-94ae-3c624c394616:commit";
    if (value === "<<UUIDV7>>") return uuidv7(counter++);
    if (value === "<<milestones|work-breakdown|questions>>") return "milestones";
    return value.replaceAll(/<<[^>]+>>/gu, "sample text");
  };
  const composition = substitute(skeleton);
  const semantic = composition.contractDraft.semantic;
  if (kind === "project") semantic.project = { version: 1 };
  if (kind === "proposal") semantic.decision = { governanceProposal: "sample" };
  if (kind === "evaluation") semantic.decision = { question: "q", criteria: ["c"], method: "m" };
  if (kind === "question") semantic.questions = [{ statement: { id: uuidv7(99), text: "q", provenance: { basis: "explicit", acceptance: "accepted", sourceEventIds: [] } }, status: "open" }];
  if (kind === "incident") semantic.risks = [{ id: uuidv7(98), description: "r", impact: "high", status: "open" }];
  return composition;
}

function withPeople(composition, people, codes) {
  composition.contractDraft.setupObligations.unshift(...codes.map((code) => people[code]));
  return composition;
}

const peopleFor = (kind) => PEOPLE_BY_KIND[kind] ?? ["setup.owner", "setup.acceptor"];

test("template pins equal the bundled shape pins for every Kind", async () => {
  const { pins } = await templateBlocks();
  const bundled = JSON.parse(await readFile(join(root, "references/topic-shape-pins.json"), "utf8"));
  assert.deepEqual(Object.keys(pins.kinds).sort(), [...KINDS].sort());
  for (const kind of KINDS) {
    const pin = bundled.baseCompositions[kind];
    assert.equal(pins.kinds[kind].baseRecipe, pin.baseRecipe, kind);
    assert.equal(pins.kinds[kind].shapeDigest, pin.shapeDigest, kind);
    assert.deepEqual(sourcesFor(pins, kind), pin.shapeSources, kind);
  }
});

test("the filled skeleton with the Kind's people obligations passes the composition validator", async () => {
  const { skeleton, pins, people } = await templateBlocks();
  for (const kind of KINDS) {
    const findings = validateComposition(withPeople(fill(skeleton, pins, kind), people, peopleFor(kind)));
    assert.deepEqual(findings, [], `${kind}: ${JSON.stringify(findings)}`);
  }
});

test("a setup that hides who does the work or accepts the result is rejected", async () => {
  const { skeleton, pins } = await templateBlocks();
  for (const kind of KINDS) {
    const codes = validateComposition(fill(skeleton, pins, kind)).map((item) => item.code);
    const expected = kind === "project" ? ["PROJECT_LEAD_OBLIGATION", "PROJECT_CLOSER_OBLIGATION"] : ["OWNER_OBLIGATION", "ACCEPTOR_OBLIGATION"];
    assert.deepEqual(codes.filter((code) => expected.includes(code)).sort(), [...expected].sort(), kind);
  }
});

test("a named owner and acceptor replace their obligations", async () => {
  const { skeleton, pins } = await templateBlocks();
  const composition = fill(skeleton, pins, "task");
  const semantic = composition.contractDraft.semantic;
  semantic.ownerId = "@alice:ixo.world";
  semantic.completion.acceptanceAuthorityIds = ["@bob:ixo.world"];
  semantic.fieldProvenance = {
    "/ownerId": { basis: "explicit", acceptance: "accepted", sourceEventIds: [] },
    "/completion/acceptanceAuthorityIds": { basis: "explicit", acceptance: "accepted", sourceEventIds: [] },
  };
  assert.deepEqual(validateComposition(composition), []);
  semantic.ownerId = "did:ixo:alice";
  assert.ok(validateComposition(composition).some((item) => item.code === "OWNER_ID"));
});

test("scope, constraints and assumptions take statement objects, never plain text", async () => {
  const { skeleton, pins, people } = await templateBlocks();
  const statement = (seed, text) => ({ id: uuidv7(seed), text, provenance: { basis: "suggested", acceptance: "proposed", sourceEventIds: [] } });
  const composition = withPeople(fill(skeleton, pins, "proposal"), people, peopleFor("proposal"));
  const semantic = composition.contractDraft.semantic;
  semantic.scope = { included: [statement(201, "Payroll runs")], excluded: [statement(202, "Benefits")] };
  semantic.constraints = [statement(203, "No gap in salaries")];
  semantic.assumptions = [{ statement: statement(204, "Current contract ends in March") }];
  assert.deepEqual(validateComposition(composition), []);
  semantic.scope.included = ["Payroll runs"];
  semantic.constraints = ["No gap in salaries"];
  semantic.assumptions = [statement(205, "Current contract ends in March")];
  const codes = validateComposition(composition).map((item) => `${item.code} ${item.path}`);
  assert.ok(codes.includes("STATEMENT_ITEM /contractDraft/semantic/scope/included/0"));
  assert.ok(codes.includes("STATEMENT_ITEM /contractDraft/semantic/constraints/0"));
  assert.ok(codes.includes("WRAPPED_STATEMENT_ITEM /contractDraft/semantic/assumptions/0"));
});

test("an ongoing Discussion needs an owner but no acceptor", async () => {
  const { skeleton, pins, people } = await templateBlocks();
  const composition = withPeople(fill(skeleton, pins, "discussion"), people, ["setup.owner"]);
  composition.contractDraft.semantic.temporalMode = "ongoing";
  assert.deepEqual(validateComposition(composition), []);
  const task = withPeople(fill(skeleton, pins, "task"), people, peopleFor("task"));
  task.contractDraft.semantic.temporalMode = "ongoing";
  assert.ok(validateComposition(task).some((item) => item.code === "TEMPORAL_MODE_KIND"));
});

test("the template forbids the fields the Portal rejects", async () => {
  const { text } = await templateBlocks();
  for (const field of ["participants", "roles", "plan", "attachments", "timezone", "successCriteria", "requiresOutcomeRecord", "reviewAt"]) {
    assert.match(text, new RegExp(`\`${field}\``, "u"), field);
  }
});
