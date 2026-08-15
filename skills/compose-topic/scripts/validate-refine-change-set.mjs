#!/usr/bin/env node
/** Validate a compose-topic refine change set. Usage: node scripts/validate-refine-change-set.mjs FILE [--json] */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UUIDV7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const TOPIC =
  /^ixo:topic:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const TEXT_PATHS = new Set([
  "/title",
  "/intent/text",
  "/outcome/statement/text",
  "/completion/definition",
]);
const DATE_PATHS = new Set(["/outcome/target/value"]);
const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finding = (code, path, message) => ({
  code,
  severity: "error",
  path,
  message,
});

export function validateRefineChangeSet(value) {
  const findings = [];
  const add = (condition, code, path, message) => {
    if (!condition) findings.push(finding(code, path, message));
  };
  if (!isObject(value))
    return [finding("TYPE_OBJECT", "", "must be an object")];
  add(value.version === "1.0", "VERSION", "/version", "must equal 1.0");
  add(
    value.status === "ready-to-stage",
    "STATUS",
    "/status",
    "must equal ready-to-stage",
  );
  add(
    UUIDV7.test(value.changeSetId ?? ""),
    "CHANGE_SET_ID",
    "/changeSetId",
    "must be UUIDv7",
  );
  add(
    UUIDV7.test(value.editSessionId ?? ""),
    "EDIT_SESSION_ID",
    "/editSessionId",
    "must be UUIDv7",
  );
  add(
    TOPIC.test(value.topicId ?? ""),
    "TOPIC_ID",
    "/topicId",
    "must identify the existing Topic",
  );
  add(
    typeof value.expectedRevision === "string" &&
      value.expectedRevision.length > 0,
    "EXPECTED_REVISION",
    "/expectedRevision",
    "is required",
  );
  add(
    !Object.hasOwn(value, "target") && !Object.hasOwn(value, "create"),
    "REFINE_TARGET",
    "",
    "refinement must target the existing Topic",
  );
  add(
    Array.isArray(value.changes) && value.changes.length > 0,
    "CHANGES",
    "/changes",
    "must contain at least one semantic change",
  );
  for (const [index, change] of (value.changes ?? []).entries()) {
    const path = `/changes/${index}`;
    if (!isObject(change)) {
      findings.push(finding("CHANGE_OBJECT", path, "must be an object"));
      continue;
    }
    if (change.op === "set-text") {
      add(
        TEXT_PATHS.has(change.path),
        "TEXT_PATH",
        `${path}/path`,
        "is not an editable text path",
      );
      add(
        typeof change.value === "string",
        "TEXT_VALUE",
        `${path}/value`,
        "must be text",
      );
    } else if (change.op === "set-date") {
      add(
        DATE_PATHS.has(change.path),
        "DATE_PATH",
        `${path}/path`,
        "is not an editable date path",
      );
      add(
        /^\d{4}-\d{2}-\d{2}$/u.test(change.value ?? ""),
        "DATE_VALUE",
        `${path}/value`,
        "must be a date-only value",
      );
    } else if (change.op === "answer-question") {
      add(
        UUIDV7.test(change.questionId ?? ""),
        "QUESTION_ID",
        `${path}/questionId`,
        "must be the stable question statement UUIDv7",
      );
      add(
        typeof change.answer === "string" && change.answer.trim().length > 0,
        "QUESTION_ANSWER",
        `${path}/answer`,
        "must contain an answer",
      );
      add(
        change.status === "answered",
        "QUESTION_STATUS",
        `${path}/status`,
        "must equal answered",
      );
      add(
        !Object.hasOwn(change, "statement"),
        "QUESTION_STATEMENT",
        path,
        "answering preserves the existing question statement",
      );
    } else {
      findings.push(
        finding("CHANGE_OPERATION", `${path}/op`, "is not supported"),
      );
    }
  }
  const serialized = JSON.stringify(value);
  add(
    !/companionSessionId|providerSessionId|sessionReference/iu.test(serialized),
    "PRIVATE_SESSION",
    "",
    "provider-private session identity must remain host-local",
  );
  return findings;
}

export async function main(options = {}) {
  if (!options.file) throw new Error("A refine change-set file is required");
  const file = resolve(options.file);
  const value = JSON.parse(await readFile(file, "utf8"));
  const findings = validateRefineChangeSet(value);
  return {
    validator: "compose-topic-refine-validator",
    version: "1.0",
    file,
    ok: findings.length === 0,
    findings,
  };
}

function argumentsFrom(argv) {
  const options = { json: false };
  for (const value of argv) {
    if (value === "--json") options.json = true;
    else if (value.startsWith("-")) throw new Error(`Unknown option: ${value}`);
    else if (!options.file) options.file = value;
    else throw new Error(`Unexpected argument: ${value}`);
  }
  return options;
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const options = argumentsFrom(process.argv.slice(2));
    const result = await main(options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else
      console.log(
        `Compose Topic refine validation: ${result.ok ? "PASSED" : "FAILED"}`,
      );
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
