import assert from "node:assert/strict";
import test from "node:test";

import { validateRefineChangeSet } from "../scripts/validate-refine-change-set.mjs";

const valid = () => ({
  version: "1.0",
  status: "ready-to-stage",
  changeSetId: "019ff687-3b07-7b79-8dd4-6de9b3111830",
  editSessionId: "019ff687-3b07-7b79-8dd4-6de9b3111831",
  topicId: "ixo:topic:019ff687-3b07-706c-bab4-bfdd665ebc93",
  expectedRevision: "ixo:topic-operation:019ff687-3b07-7e7f-8ee6-28b632bdc296",
  expectedBodyHash: "sha256:current",
  changes: [
    { op: "set-date", path: "/outcome/target/value", value: "2026-08-20" },
    {
      op: "answer-question",
      questionId: "019ff687-3b07-7b79-8dd4-6de9b3111832",
      answer: "Manchester City vs Arsenal",
      status: "answered",
    },
  ],
});

const codes = (value) =>
  new Set(validateRefineChangeSet(value).map((finding) => finding.code));

test("accepts a revision-bound existing Topic change set that answers rather than overwrites a question", () => {
  assert.deepEqual(validateRefineChangeSet(valid()), []);
});

test("rejects a refinement that falls back to Topic creation or lacks the expected revision", () => {
  const value = valid();
  value.target = "new";
  delete value.expectedRevision;
  const result = codes(value);
  assert(result.has("REFINE_TARGET"));
  assert(result.has("EXPECTED_REVISION"));
});

test("rejects an answer operation without the stable question identity", () => {
  const value = valid();
  delete value.changes[1].questionId;
  assert(codes(value).has("QUESTION_ID"));
});
