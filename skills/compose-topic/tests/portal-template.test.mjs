import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateComposition } from "../scripts/validate-composition.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const KINDS = ["project", "task", "agent_task", "proposal", "evaluation", "claims", "question", "discussion", "incident"];

async function templateBlocks() {
  const text = await readFile(join(root, "references/portal-create-template.md"), "utf8");
  const blocks = [...text.matchAll(/```json\n([\s\S]*?)\n```/gu)].map((match) => JSON.parse(match[1]));
  assert.equal(blocks.length, 2, "template has the skeleton and the pins block");
  return { skeleton: blocks[0], pins: blocks[1], text };
}

function uuidv7(seed) {
  const hex = seed.toString(16).padStart(12, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7000-8000-000000000000`;
}

function sourcesFor(pins, kind) {
  const entry = pins.kinds[kind];
  return [pins.baseRecipeSources[entry.baseRecipe], { kind: "kind", id: `https://topic-protocol.ixo.world/kinds/${kind}`, version: "1.0.0-rc.4", digest: entry.kindDigest }];
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
  if (kind === "project") {
    semantic.project = { version: 1 };
    composition.contractDraft.setupObligations.push(
      { code: "setup.project-lead", path: "/project/lead", prompt: "Who will lead this Project?", purpose: "p", responsibility: "unassigned", priority: 400, unlocks: "u" },
      { code: "setup.project-closer", path: "/project/closer", prompt: "Who may close this Project?", purpose: "p", responsibility: "unassigned", priority: 650, unlocks: "u" }
    );
  }
  if (kind === "proposal") semantic.decision = { governanceProposal: "sample" };
  if (kind === "evaluation") semantic.decision = { question: "q", criteria: ["c"], method: "m" };
  if (kind === "question") semantic.questions = [{ statement: { id: uuidv7(99), text: "q", provenance: { basis: "explicit", acceptance: "accepted", sourceEventIds: [] } }, status: "open" }];
  if (kind === "incident") semantic.risks = [{ id: uuidv7(98), description: "r", impact: "high", status: "open" }];
  return composition;
}

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

test("the filled skeleton passes the composition validator for every Kind", async () => {
  const { skeleton, pins } = await templateBlocks();
  for (const kind of KINDS) {
    const findings = validateComposition(fill(skeleton, pins, kind));
    assert.deepEqual(findings, [], `${kind}: ${JSON.stringify(findings)}`);
  }
});

test("the template forbids the fields the Portal rejects", async () => {
  const { text } = await templateBlocks();
  for (const field of ["participants", "roles", "plan", "attachments", "timezone", "successCriteria", "requiresOutcomeRecord", "reviewAt"]) {
    assert.match(text, new RegExp(`\`${field}\``, "u"), field);
  }
});
