import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProtocol, staticIssues, validateRecipeText } from "../scripts/validate-recipe.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DID = "did:ixo:entity:00000000000000000000000000000001";

test("the example recipe resolves against the pinned protocol and pins a canonical ref", async (t) => {
  const protocol = await loadProtocol();
  t.after(() => protocol.dispose());
  const text = await readFile(join(ROOT, "examples", "fps-game-build.recipe.json"), "utf8");
  const result = await validateRecipeText(text, { did: DID, version: "1.0.0", kind: "project" }, protocol);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.topicRecipeRef.id, DID);
  assert.equal(result.topicRecipeRef.version, "1.0.0");
  assert.match(result.topicRecipeRef.digest, /^sha256:[0-9a-f]{64}$/u);
  assert.match(result.byteDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.notEqual(result.topicRecipeRef.digest, result.byteDigest);
  assert.ok(result.axes.includes("verification"));
  assert.ok(result.transitions.includes("record-verification"));
  assert.deepEqual(result.sources.map((source) => source.kind).sort(), ["base-recipe", "kind", "topic-recipe"]);
});

test("a brief, a wrong owner and an unknown command are refused before the resolver runs", async () => {
  const recipe = JSON.parse(await readFile(join(ROOT, "examples", "fps-game-build.recipe.json"), "utf8"));
  assert.ok(staticIssues({ version: 1, title: "brief" }, { did: DID, version: "1.0.0" }).some((issue) => issue.includes("brief")));
  assert.ok(staticIssues(recipe, { did: "did:ixo:entity:00000000000000000000000000000002", version: "1.0.0" }).some((issue) => issue.startsWith("id must be")));
  assert.ok(staticIssues(recipe, { did: DID, version: "1.0.0", kind: "question" }).some((issue) => issue.includes("baseRecipe must be research")));
  const flying = { ...recipe, shape: { ...recipe.shape, transitions: [{ ...recipe.shape.transitions[0], command: "topic.fly" }] } };
  assert.ok(staticIssues(flying, { did: DID, version: "1.0.0" }).some((issue) => issue.includes("has no Portal handler")));
});

test("a transition that names an axis the merged Shape lacks is refused by the resolver", async (t) => {
  const protocol = await loadProtocol();
  t.after(() => protocol.dispose());
  const recipe = JSON.parse(await readFile(join(ROOT, "examples", "fps-game-build.recipe.json"), "utf8"));
  const broken = { ...recipe, shape: { ...recipe.shape, transitions: [{ ...recipe.shape.transitions[0], predecessor: { axis: "settlement", state: "pending" } }] } };
  const result = await validateRecipeText(JSON.stringify(broken), { did: DID, version: "1.0.0" }, protocol);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^resolver:/u);
});
