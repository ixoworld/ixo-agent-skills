import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("every current and rc3 composition pin resolves from the bundled candidate", async () => {
  const lock = JSON.parse(await readFile(join(root, "references/source-lock.json"), "utf8"));
  const temporary = await mkdtemp(join(tmpdir(), "compose-topic-pins-"));
  try {
    execFileSync("tar", ["-xzf", join(root, lock.topicProtocol.package.artifact), "-C", temporary]);
    const { resolveEffectiveTopicShape } = await import(pathToFileURL(join(temporary, "package/dist/src/shapes/resolver.js")).href);
    for (const filename of ["topic-shape-pins.json", "topic-shape-pins-rc3.json"]) {
      const pins = JSON.parse(await readFile(join(root, "references", filename), "utf8"));
      const cases = [...Object.entries(pins.baseCompositions), ...Object.values(pins.topicRecipes).map((pin) => [pin.kind, pin])];
      for (const [kind, pin] of cases) {
        const resolved = resolveEffectiveTopicShape({ kind, baseRecipe: pin.baseRecipe, sourceVersion: pins.protocolVersion,
          ...(pin.topicRecipeRef ? { topicRecipeRef: pin.topicRecipeRef } : {}) });
        assert.equal(resolved.digest, pin.shapeDigest, `${filename}: ${kind}`);
        assert.deepEqual(resolved.sources, pin.shapeSources);
      }
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
