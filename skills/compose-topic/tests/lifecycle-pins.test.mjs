import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProtocol } from "../scripts/validate-recipe.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("every current, rc4 and rc3 composition pin resolves from the bundled package", async () => {
  const { resolveEffectiveTopicShape, dispose } = await loadProtocol();
  try {
    for (const filename of ["topic-shape-pins.json", "topic-shape-pins-rc4.json", "topic-shape-pins-rc3.json"]) {
      const pins = JSON.parse(await readFile(join(root, "references", filename), "utf8"));
      assert.equal(pins.topicRecipes, undefined, `${filename}: no bundled Topic Recipe catalog`);
      const cases = Object.entries(pins.baseCompositions);
      for (const [kind, pin] of cases) {
        const resolved = resolveEffectiveTopicShape({ kind, baseRecipe: pin.baseRecipe, sourceVersion: pins.protocolVersion,
          ...(pin.topicRecipeRef ? { topicRecipeRef: pin.topicRecipeRef } : {}) });
        assert.equal(resolved.digest, pin.shapeDigest, `${filename}: ${kind}`);
        assert.deepEqual(resolved.sources, pin.shapeSources);
      }
    }
  } finally { await dispose(); }
});
