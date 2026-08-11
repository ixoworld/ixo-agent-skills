import assert from "node:assert/strict";
import test from "node:test";
import { main } from "../scripts/audit-skill.mjs";

test("production skill audit passes", async () => {
  const report = await main();
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
});
