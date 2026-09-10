#!/usr/bin/env node
/** Check one normalized PA turn. Usage: node scripts/validate-execution-trace.mjs trace.json */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STAGING = new Set(["stage_topic_composition", "stage_topic_changes"]);
const STOP = new Set(["composition-staged-for-review", "changes-staged-for-review", "approval-pending", "awaiting-user", "possible-duplicates", "transport-timeout", "render-pending"]);
const DISCOVERY = new Set(["findEntity", "getEntityProfileDomain", "resolve_domain_topic_rooms"]);
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

export function validateTrace(trace) {
  const findings = [];
  const fail = (code, index, message) => findings.push({ code, index, message });
  if (!trace || trace.version !== 1 || !["create", "clone", "continue", "refine"].includes(trace.requestMode) || !Array.isArray(trace.calls)) {
    return { valid: false, findings: [{ code: "TRACE_FORMAT", message: "Expected version 1, requestMode, and calls." }] };
  }
  if (trace.calls.length > 12) fail("CALL_BUDGET", null, "More than 12 calls in one Topic turn; inspect reference loading and recovery.");
  let stopped = false;
  let stageCount = 0;
  let readCount = 0;
  const failedCalls = new Set();
  const loadedResources = new Set();
  trace.calls.forEach((call, index) => {
    if (!call || typeof call.tool !== "string" || !call.args || typeof call.args !== "object" || typeof call.result?.status !== "string") {
      fail("CALL_FORMAT", index, "Each call needs tool, args, and result.status.");
      return;
    }
    if (stopped) fail("CALL_AFTER_STOP", index, "A previous result required returning control to the person.");
    const key = JSON.stringify([call.tool, canonical(call.args)]);
    if (failedCalls.has(key)) fail("UNCHANGED_RETRY", index, "Repeated failed input without a targeted repair.");
    if (call.result.success === false) failedCalls.add(key);
    if (trace.hostCompletesDestination && DISCOVERY.has(call.tool)) fail("ROOM_REDISCOVERY", index, "The Portal already supplies the selected room.");
    if (trace.hostCompletesDestination && call.tool === "list_topic_destinations") {
      if (call.args.roomId !== trace.roomId) fail("WRONG_ROOM_LOOKUP", index, "Destination lookup must use the exact selected room.");
      if (!trace.destinationTokenRequired && !trace.calls.slice(0, index).some(c => c?.result?.status === "destination-token-expired")) {
        fail("UNNECESSARY_TOKEN_LOOKUP", index, "The host supplies the token for this room.");
      }
    }
    if (call.tool === "read_topic" && ++readCount > 1 && !trace.calls.slice(0, index).some(c => c?.result?.status === "stale-topic-revision")) {
      fail("REPEATED_TOPIC_READ", index, "Read once unless the host reports a stale revision.");
    }
    if (readCount > 2) fail("READ_BUDGET", index, "Only one revision refresh is allowed.");
    if (STAGING.has(call.tool)) {
      if (++stageCount > 2) fail("STAGE_BUDGET", index, "Only one targeted staging repair is allowed.");
      if (trace.requestMode === "continue" && !trace.changeRequested) fail("UNREQUESTED_EDIT", index, "Continuation alone does not request an edit.");
      if (["continue", "refine"].includes(trace.requestMode) && call.tool === "stage_topic_composition") fail("RECREATED_TOPIC", index, "An existing Topic must not be recreated.");
    }
    if (call.resource) {
      if (loadedResources.has(call.resource)) fail("REPEATED_RESOURCE_LOAD", index, "Reuse the skill or reference already loaded this turn.");
      loadedResources.add(call.resource);
    }
    if (call.purpose === "repository-validation" || call.purpose === "skill-discovery") fail("NONINTERACTIVE_WORK", index, "Release checks and skill discovery do not belong in this turn.");
    if (trace.knownMissingQuestion && trace.requestMode === "continue" && call.tool !== "ask_user_question") fail("UNNECESSARY_CONTINUATION_CALL", index, "Ask the supplied missing question first.");
    if (STOP.has(call.result.status) || stageCount >= 2 && call.result.success === false) stopped = true;
  });
  if (trace.claimedEditorOpen && !trace.calls.some(c => STAGING.has(c?.tool) && c.result?.success === true && c.result?.renderReceiptVerified === true)) {
    fail("MISSING_RENDER_RECEIPT", null, "An editor-open claim needs a correlated host render receipt.");
  }
  return { valid: findings.length === 0, findings };
}

export async function main({ path } = {}) {
  if (!path) return { valid: false, findings: [{ code: "USAGE", message: "Pass a normalized trace JSON file." }] };
  try { return validateTrace(JSON.parse(await readFile(path, "utf8"))); }
  catch (error) { return { valid: false, findings: [{ code: "TRACE_READ", message: error.message }] }; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await main({ path: process.argv[2] });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.valid ? 0 : 1;
}
