import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTrace } from "../scripts/validate-execution-trace.mjs";
const call = (tool, args = {}, result = { status: "ok", success: true }) => ({ tool, args, result });
const staged = () => call("stage_topic_composition", { title: "Review policy" }, { status: "composition-staged-for-review", success: true, renderReceiptVerified: true });
const trace = (calls, extra = {}) => ({ version: 1, requestMode: "create", calls, ...extra });
const codes = value => validateTrace(value).findings.map(f => f.code);

test("accepts a selected-room create with one staging call and a verified render receipt", () => {
  assert.equal(validateTrace(trace([staged()], { hostCompletesDestination: true, roomId: "!support:example.org", claimedEditorOpen: true })).valid, true);
});
test("rejects room rediscovery and unnecessary token calls", () => {
  assert.ok(codes(trace([call("findEntity")], { hostCompletesDestination: true })).includes("ROOM_REDISCOVERY"));
  assert.ok(codes(trace([call("list_topic_destinations", { roomId: "!support:example.org" })], { hostCompletesDestination: true, roomId: "!support:example.org" })).includes("UNNECESSARY_TOKEN_LOOKUP"));
});
test("accepts an exact-room token refresh after expiry", () => {
  const calls = [call("stage_topic_composition", { token: "expired" }, { status: "destination-token-expired", success: false }), call("list_topic_destinations", { roomId: "!support:example.org" }), staged()];
  assert.equal(validateTrace(trace(calls, { hostCompletesDestination: true, roomId: "!support:example.org" })).valid, true);
});
test("accepts one repair but detects unchanged retries despite object key ordering", () => {
  const failed = call("stage_topic_composition", { title: "a", version: "bad" }, { status: "invalid-topic-composition", success: false });
  assert.equal(validateTrace(trace([failed, staged()])).valid, true);
  assert.ok(codes(trace([failed, call(failed.tool, { version: "bad", title: "a" })])).includes("UNCHANGED_RETRY"));
});
for (const status of ["composition-staged-for-review", "changes-staged-for-review", "approval-pending", "awaiting-user", "possible-duplicates", "transport-timeout", "render-pending"]) {
  test(`stops after ${status}`, () => assert.ok(codes(trace([call("stage_topic_composition", {}, { status }), call("read_topic")])).includes("CALL_AFTER_STOP")));
}
test("rejects repeated failed repair attempts", () => {
  const calls = [1, 2, 3].map(n => call("stage_topic_composition", { n }, { status: "invalid-topic-composition", success: false }));
  assert.ok(codes(trace(calls)).includes("STAGE_BUDGET"));
  assert.ok(codes(trace(calls)).includes("CALL_AFTER_STOP"));
});
test("continuation asks the known question without reads or edits", () => {
  const context = { requestMode: "continue", knownMissingQuestion: true };
  assert.equal(validateTrace(trace([call("ask_user_question", {}, { status: "awaiting-user" })], context)).valid, true);
  assert.ok(codes(trace([call("read_topic")], context)).includes("UNNECESSARY_CONTINUATION_CALL"));
  assert.ok(codes(trace([call("stage_topic_changes")], context)).includes("UNREQUESTED_EDIT"));
});
test("allows one stale-revision refresh without recreating the Topic", () => {
  const calls = [call("read_topic"), call("stage_topic_changes", { revision: "old" }, { status: "stale-topic-revision", success: false }), call("read_topic"), call("stage_topic_changes", { revision: "new" }, { status: "changes-staged-for-review", success: true })];
  assert.equal(validateTrace(trace(calls, { requestMode: "refine" })).valid, true);
  assert.ok(codes(trace([staged()], { requestMode: "refine" })).includes("RECREATED_TOPIC"));
});
test("rejects duplicate reference loading, repository checks, and unverified editor claims", () => {
  const resource = { ...call("read_file"), resource: "compose-topic/SKILL.md" };
  assert.ok(codes(trace([resource, resource])).includes("REPEATED_RESOURCE_LOAD"));
  assert.ok(codes(trace([{ ...call("shell"), purpose: "repository-validation" }])).includes("NONINTERACTIVE_WORK"));
  assert.ok(codes(trace([], { claimedEditorOpen: true })).includes("MISSING_RENDER_RECEIPT"));
});
test("enforces the total call budget and validates input format", () => {
  assert.ok(codes(trace(Array.from({ length: 13 }, () => call("read_file")))) .includes("CALL_BUDGET"));
  assert.equal(validateTrace({}).valid, false);
});
