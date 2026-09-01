import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateComposition, validateFile } from "../scripts/validate-composition.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES = [
  "decision.example.json",
  "expert-service-flow.example.json",
  "research-brief.example.json",
  "team-project.example.json",
  "verified-work-payment.example.json",
];

async function example(name = "decision.example.json") {
  return JSON.parse(await readFile(join(ROOT, "examples", name), "utf8"));
}

async function pins() {
  return JSON.parse(await readFile(join(ROOT, "references", "topic-shape-pins.json"), "utf8"));
}

function codes(value) {
  return new Set(validateComposition(value).map((item) => item.code));
}

function acceptProjectAuthority(value, name) {
  value.contractDraft.semantic.fieldProvenance ??= {};
  value.contractDraft.semantic.fieldProvenance[`/project/${name}`] = {
    basis: "explicit",
    acceptance: "accepted",
    sourceEventIds: [],
  };
}

function selectTopicRecipe(value, code, pin) {
  value.recipeSelection = {
    strategy: "topic-recipe",
    baseRecipe: pin.baseRecipe,
    topicRecipeCode: code,
    topicRecipeRef: pin.topicRecipeRef,
    registryLookup: "not-performed",
    registryReason: "pinned-catalog-only",
    reviewState: "draft",
    shapeSources: pin.shapeSources,
    shapeDigest: pin.shapeDigest,
  };
  value.topic.rootDraft.topicRecipeRef = pin.topicRecipeRef;
  value.topic.rootDraft.shapeDigest = pin.shapeDigest;
  value.contractDraft.semantic.topicRecipeRef = pin.topicRecipeRef;
  value.contractDraft.semantic.shapeSources = pin.shapeSources;
  value.contractDraft.semantic.shapeDigest = pin.shapeDigest;
  for (const call of value.execution.proposedCalls) call.boundTo.shapeDigest = pin.shapeDigest;
}

test("all bundled v4 examples pass", async () => {
  for (const name of EXAMPLES) {
    const report = await validateFile(join(ROOT, "examples", name));
    assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  }
});

test("new Topics are Drafts and immutable bodies do not carry lifecycle status", async () => {
  const value = await example();
  value.topic.rootDraft.status = "active";
  value.contractDraft.envelope.status = "accepted";
  const result = codes(value);
  assert(result.has("IMMUTABLE_BODY_STATUS"));
  assert(result.has("NEW_ROOT_DRAFT"));
});

test("composition identity is a UUIDv7 URN", async () => {
  const value = await example();
  value.compositionId = "urn:uuid:550e8400-e29b-41d4-a716-446655440000";
  assert(codes(value).has("COMPOSITION_ID"));
});

test("rejects legacy protocol and state profiles", async () => {
  const value = await example();
  value.protocolBinding.topicProtocolVersion = "0.8.0";
  value.protocolBinding.contractProfile = "qi.topic-contract-state/v2";
  value.protocolBinding.rootVersion = 2;
  const result = codes(value);
  assert(result.has("PROTOCOL_VERSION"));
  assert(result.has("CONTRACT_PROFILE"));
  assert(result.has("PROTOCOL_V4"));
});

test("requires exact pinned Effective Shape sources and digest", async () => {
  const value = await example();
  value.recipeSelection.shapeDigest = `sha256:${"0".repeat(64)}`;
  value.recipeSelection.shapeSources[0].digest = `sha256:${"1".repeat(64)}`;
  const result = codes(value);
  assert(result.has("SHAPE_DIGEST"));
  assert(result.has("SHAPE_SOURCES"));
});

test("requires root and contract Shape pins to match recipe selection", async () => {
  const value = await example();
  value.topic.rootDraft.shapeDigest = `sha256:${"0".repeat(64)}`;
  value.contractDraft.semantic.shapeDigest = `sha256:${"1".repeat(64)}`;
  const result = codes(value);
  assert(result.has("ROOT_SHAPE_DIGEST"));
  assert(result.has("CONTRACT_SHAPE_DIGEST"));
});

test("rejects a Topic Recipe on the wrong Kind or Base Recipe", async () => {
  const value = await example("research-brief.example.json");
  value.contractDraft.semantic.kindRef = { source: "standard", kind: "task" };
  value.topic.rootDraft.kind = "task";
  const result = codes(value);
  assert(result.has("TOPIC_RECIPE_KIND"));
  assert(result.has("KIND_BASE_RECIPE"));
});

test("does not allow invented Marketplace lookup or unpinned recipe refs", async () => {
  const value = await example("research-brief.example.json");
  value.recipeSelection.registryLookup = "complete";
  value.recipeSelection.topicRecipeRef.digest = `sha256:${"0".repeat(64)}`;
  const result = codes(value);
  assert(result.has("RECIPE_LOOKUP"));
  assert(result.has("TOPIC_RECIPE_REF"));
});

test("rejects v0.8 recipe and agent fields from the v4 contract", async () => {
  const value = await example("expert-service-flow.example.json");
  value.contractDraft.semantic.recipe = "flow";
  value.contractDraft.semantic.agents = [{ agentId: "did:ixo:agent:invented" }];
  const result = codes(value);
  assert(result.has("V4_CONTRACT_BOUNDARY"));
});

test("rejects Action, effect, evaluation-kit, and settlement contracts in Topic terms", async () => {
  const fields = ["actionContract", "effectContract", "evaluationKit", "settlementContract"];
  for (const field of fields) {
    const value = await example("verified-work-payment.example.json");
    value.contractDraft.semantic[field] = {};
    assert(codes(value).has("V4_CONTRACT_BOUNDARY"), field);
  }
});

test("keeps protocol state tags out of user-authored tags", async () => {
  const value = await example();
  value.contractDraft.semantic.stateTags = [{ code: "phase-forming" }];
  assert(codes(value).has("V4_CONTRACT_BOUNDARY"));
});

test("rejects generated contract statements marked accepted", async () => {
  const value = await example();
  value.contractDraft.semantic.outcome.statement.provenance.acceptance = "accepted";
  assert(codes(value).has("GENERATED_ACCEPTED"));
});

test("requires confidential contracts to be reference-only and encrypted", async () => {
  const value = await example();
  value.contractDraft.publication.dataClassification = "confidential";
  value.contractDraft.publication.disclosure = "inline";
  value.contractDraft.publication.e2eeRequired = false;
  const result = codes(value);
  assert(result.has("SENSITIVE_INLINE"));
  assert(result.has("SENSITIVE_E2EE"));
});

test("rejects colon-form abilities and invented agent identity", async () => {
  const value = await example();
  value.collaborationSuggestions.agentRoles[0].requiredAbilities = ["topic:read"];
  value.collaborationSuggestions.agentRoles[0].agentId = "did:ixo:agent:invented";
  const result = codes(value);
  assert(result.has("ABILITY_SYNTAX"));
  assert(result.has("INVENTED_AGENT_ID"));
});

test("requires a decision record for a selected option", async () => {
  const value = await example();
  value.contractDraft.semantic.decision.options[0].status = "selected";
  assert(codes(value).has("DECISION_RECORD"));
});

test("requires an outcome record for achieved state", async () => {
  const value = await example();
  value.contractDraft.semantic.outcome.status = "achieved";
  assert(codes(value).has("OUTCOME_RECORD"));
});

test("weighted criteria must be complete and sum to one", async () => {
  const value = await example();
  value.contractDraft.semantic.decision.criteria[0].weight = 0.7;
  value.contractDraft.semantic.decision.criteria[1].weight = 0.4;
  assert(codes(value).has("WEIGHT_SUM"));
  delete value.contractDraft.semantic.decision.criteria[1].weight;
  assert(codes(value).has("WEIGHT_COMPLETENESS"));
});

test("claim binding is singular and exact", async () => {
  const value = await example("verified-work-payment.example.json");
  value.contractDraft.semantic.claimBinding.collectionIds = ["one", "two"];
  assert(codes(value).has("SINGULAR_CLAIM_BINDING"));
});

test("claim resolution is read-only and must match the bound entity and collection", async () => {
  const value = await example("verified-work-payment.example.json");
  value.claimResolutionEvidence.collectionId = "different";
  value.claimResolutionEvidence.readOnly = false;
  const result = codes(value);
  assert(result.has("CLAIM_RESOLUTION_MATCH"));
  assert(result.has("CLAIM_RESOLUTION_READ_ONLY"));
});

test("inferred auto-accept is limited to non-effecting record classes", async () => {
  const value = await example();
  value.records.push({
    localId: "summary",
    kind: "fact",
    recordClass: "ixo.topic.summary",
    basis: "inferred",
    accepted: true,
    sourceEventIds: [],
    content: { text: "A non-effecting summary" },
  });
  assert.equal(codes(value).has("INFERRED_RECORD_POLICY"), false);
  value.records.at(-1).recordClass = "ixo.evaluation";
  const result = codes(value);
  assert(result.has("INFERRED_RECORD_POLICY"));
  assert(result.has("CONSEQUENTIAL_RECORD_ACCEPTED"));
});

test("the exact intent memory is first", async () => {
  const value = await example();
  value.records.unshift({
    localId: "other",
    kind: "fact",
    recordClass: "ixo.topic.fact",
    basis: "explicit",
    accepted: true,
    sourceEventIds: [],
    content: { text: "Other" },
  });
  assert(codes(value).has("INTENT_MEMORY_FIRST"));
});

test("preview cannot be commit eligible", async () => {
  const value = await example();
  value.execution.commitEligible = true;
  assert(codes(value).has("PREVIEW_COMMIT"));
});

test("commit requires verified Matrix write and every protocol ability", async () => {
  const value = await example("team-project.example.json");
  value.execution.hostContext.matrixWrite = false;
  value.execution.hostContext.verifiedAbilities = ["topic/create"];
  const result = codes(value);
  assert(result.has("MATRIX_WRITE"));
  assert(result.has("VERIFIED_ABILITY"));
});

test("best-guess Kind inference must match the contract Kind", async () => {
  const value = await example();
  value.routing.kindInference.selectedKind = "discussion";
  assert(codes(value).has("KIND_INFERENCE_MISMATCH"));
});

test("a Topic disposition requires a selected canonical Kind", async () => {
  const value = await example();
  value.routing.kindInference = {
    status: "needs-user-choice",
    confidence: "low",
    rationale: "Proposal and evaluation remain equally plausible.",
    alternatives: [
      { kind: "proposal", when: "Draft a policy for approval." },
      { kind: "evaluation", when: "Compare evidence before deciding." },
    ],
  };
  const result = codes(value);
  assert(result.has("KIND_INFERENCE_STATUS"));
  assert(result.has("KIND_INFERENCE_SELECTED"));
});

test("a clarification requires at least two concrete Kind choices", async () => {
  const value = await example();
  value.disposition = "clarify";
  value.routing.kindInference = {
    status: "needs-user-choice",
    confidence: "low",
    rationale: "The intended coordination job is ambiguous.",
    alternatives: [{ kind: "proposal", when: "Draft something for approval." }],
  };
  assert(codes(value).has("KIND_INFERENCE_CHOICES"));
});

test("Kind clarification choices must be well formed, distinct, and recommend exactly one option", async () => {
  const value = await example();
  value.disposition = "clarify";
  value.routing.kindInference = {
    status: "needs-user-choice",
    confidence: "low",
    rationale: "The intended coordination job is ambiguous.",
    alternatives: [
      { kind: "proposal", when: "Draft something for approval." },
      { kind: "proposal", when: "Draft the same thing again." },
      null,
    ],
  };
  const result = codes(value);
  assert(result.has("KIND_INFERENCE_ALTERNATIVE"));
  assert(result.has("KIND_INFERENCE_DUPLICATE"));
  assert(result.has("KIND_INFERENCE_RECOMMENDED"));
});

test("a resolved room requires direct Matrix room evidence", async () => {
  const value = await example("team-project.example.json");
  value.routing.roomResolution.evidence = ["entity-lookup", "entity-profile"];
  assert(codes(value).has("ROOM_RESOLUTION_EVIDENCE"));
});

test("a resolved named Domain requires its DID and verified Domain-to-room relationship", async () => {
  const value = await example("team-project.example.json");
  value.routing.roomResolution = {
    target: "named-domain",
    status: "resolved",
    requestedLabel: "Yoma Design Studio SC",
    roomId: value.execution.hostContext.roomId,
    evidence: ["current-context"],
  };

  const unresolved = codes(value);
  assert(unresolved.has("ROOM_DOMAIN_ID"));
  assert(unresolved.has("ROOM_DOMAIN_RELATIONSHIP"));

  value.routing.roomResolution.domainDid = "did:ixo:";
  assert(codes(value).has("ROOM_DOMAIN_ID"));

  value.routing.roomResolution.domainDid = "did:ixo:entity:yoma";
  value.routing.roomResolution.evidence.push("domain-room-graph");
  const resolved = codes(value);
  assert(!resolved.has("ROOM_DOMAIN_ID"));
  assert(!resolved.has("ROOM_DOMAIN_RELATIONSHIP"));
});

test("a newly created Domain room resolves only from its bound creation result", async () => {
  const value = await example("team-project.example.json");
  value.routing.roomResolution = {
    target: "new-room-under-domain",
    status: "resolved",
    roomId: value.execution.hostContext.roomId,
    evidence: ["current-context"],
  };

  const unrelated = codes(value);
  assert(unrelated.has("ROOM_DOMAIN_ID"));
  assert(unrelated.has("NEW_ROOM_RESOLUTION_EVIDENCE"));

  value.routing.roomResolution.domainDid = "did:ixo:entity:yoma";
  value.routing.roomResolution.evidence = ["room-creation-result"];
  const resolved = codes(value);
  assert(!resolved.has("ROOM_DOMAIN_ID"));
  assert(!resolved.has("NEW_ROOM_RESOLUTION_EVIDENCE"));
});

test("room routing target and status must use supported values", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "somewhere",
    status: "maybe",
    evidence: [],
  };

  const result = codes(value);
  assert(result.has("ROOM_RESOLUTION_TARGET"));
  assert(result.has("ROOM_RESOLUTION_STATUS"));
});

test("malformed room evidence produces findings instead of throwing", async () => {
  for (const evidence of [{ source: "list-rooms" }, "list-rooms"]) {
    const value = await example("team-project.example.json");
    value.routing.roomResolution.evidence = evidence;
    const result = codes(value);
    assert(result.has("ROOM_RESOLUTION_EVIDENCE_TYPE"));
    assert(result.has("ROOM_RESOLUTION_EVIDENCE"));
  }
});

test("a resolved room requires a valid Matrix room ID", async () => {
  for (const roomId of ["did:ixo:entity:not-a-room", "!x", "!x::", "!x:@", "!x:https://evil", "!x:\\evil", "!x:[:::]", "!x:[....]", "!x:[1:2:3:]", "!x:[1:2:3:4:5:6:7]", "!x:example.org:65536"]) {
    const value = await example("team-project.example.json");
    value.routing.roomResolution.roomId = roomId;
    assert(codes(value).has("ROOM_RESOLUTION_ID"), roomId);
  }
});

test("a valid bracketed IPv6 Matrix homeserver is accepted", async () => {
  for (const roomId of ["!governance:[2001:db8::1]:8448", "!governance:[::ffff:127.0.0.1]", "!governance:[::]", "!governance:[::]:8448"]) {
    const value = await example("team-project.example.json");
    value.routing.roomResolution.roomId = roomId;
    value.execution.hostContext.roomId = roomId;
    const result = codes(value);
    assert(!result.has("ROOM_RESOLUTION_ID"), roomId);
    assert(!result.has("COMMIT_ROOM"), roomId);
    assert(!result.has("COMMIT_ROOM_MATCH"), roomId);
  }
});

test("ambiguous room or Domain resolution must preserve a real candidate picker", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "named-room",
    status: "needs-user-choice",
    evidence: ["list-rooms"],
    candidates: [{ type: "room", label: "Design Studio", roomId: "!one:example.org" }],
  };
  assert(codes(value).has("ROOM_RESOLUTION_CHOICES"));
});

test("a verified multi-room picker is valid while clarification is pending", async () => {
  const value = await example();
  value.disposition = "clarify";
  value.routing.roomResolution = {
    target: "named-room",
    status: "needs-user-choice",
    evidence: ["list-rooms"],
    candidates: [
      { type: "room", label: "Design Studio", roomId: "!one:example.org" },
      { type: "room", label: "Design Studio Archive", roomId: "!two:example.org" },
    ],
  };
  assert(!codes(value).has("ROOM_RESOLUTION_CHOICES"));
});

test("room and Domain picker candidates must be well formed and distinct", async () => {
  const value = await example();
  value.disposition = "clarify";
  value.routing.roomResolution = {
    target: "named-room",
    status: "needs-user-choice",
    evidence: ["list-rooms"],
    candidates: [
      { type: "room", label: "Design Studio", roomId: "!same:example.org" },
      { type: "room", label: "Design Studio duplicate", roomId: "!same:example.org" },
      null,
    ],
  };
  const result = codes(value);
  assert(result.has("ROOM_RESOLUTION_CANDIDATE"));
  assert(result.has("ROOM_RESOLUTION_DUPLICATE"));
});

test("a new Domain conversation room requires its target, proposal, and confirmation", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "named-domain",
    status: "new-room-required",
    domainDid: "did:ixo:entity:example",
    evidence: ["entity-lookup"],
    newRoomProposal: {
      name: "Governance Studio",
      parentDomainDid: "did:ixo:entity:example",
      audience: "domain-default",
      e2eeRequired: true,
      federation: "domain-default",
      roomCreatePermission: "verified",
      confirmationRequired: false,
    },
  };
  const result = codes(value);
  assert(result.has("NEW_ROOM_TARGET"));
  assert(result.has("NEW_ROOM_CONFIRMATION"));

  delete value.routing.roomResolution.newRoomProposal;
  assert(codes(value).has("NEW_ROOM_PROPOSAL"));
});

test("a new room proposal must remain bound to the resolved parent Domain", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "new-room-under-domain",
    status: "new-room-required",
    domainDid: "did:ixo:entity:resolved",
    evidence: ["entity-lookup"],
    newRoomProposal: {
      name: "Governance Studio",
      parentDomainDid: "did:ixo:entity:different",
      audience: "domain-default",
      e2eeRequired: true,
      federation: "domain-default",
      roomCreatePermission: "verified",
      confirmationRequired: true,
    },
  };
  assert(codes(value).has("NEW_ROOM_DOMAIN_MATCH"));
});

test("a new room proposal requires a non-blank name", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "new-room-under-domain",
    status: "new-room-required",
    domainDid: "did:ixo:entity:resolved",
    evidence: ["entity-lookup"],
    newRoomProposal: {
      parentDomainDid: "did:ixo:entity:resolved",
      audience: "domain-default",
      e2eeRequired: true,
      federation: "domain-default",
      roomCreatePermission: "verified",
      confirmationRequired: true,
    },
  };

  assert(codes(value).has("NEW_ROOM_NAME"));
  value.routing.roomResolution.newRoomProposal.name = "   ";
  assert(codes(value).has("NEW_ROOM_NAME"));
  value.routing.roomResolution.newRoomProposal.name = "Governance Studio";
  assert(!codes(value).has("NEW_ROOM_NAME"));
});

test("a new room proposal preserves audience, encryption, federation, and permission decisions", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "new-room-under-domain",
    status: "new-room-required",
    domainDid: "did:ixo:entity:resolved",
    evidence: ["entity-lookup"],
    newRoomProposal: {
      name: "Governance Studio",
      parentDomainDid: "did:ixo:entity:resolved",
      confirmationRequired: true,
    },
  };
  const missing = codes(value);
  assert(missing.has("NEW_ROOM_AUDIENCE"));
  assert(missing.has("NEW_ROOM_E2EE"));
  assert(missing.has("NEW_ROOM_FEDERATION"));
  assert(missing.has("NEW_ROOM_PERMISSION"));

  Object.assign(value.routing.roomResolution.newRoomProposal, {
    audience: "specified",
    e2eeRequired: true,
    federation: "disabled",
    roomCreatePermission: "verified",
  });
  const resolved = codes(value);
  assert(!resolved.has("NEW_ROOM_AUDIENCE"));
  assert(!resolved.has("NEW_ROOM_E2EE"));
  assert(!resolved.has("NEW_ROOM_FEDERATION"));
  assert(!resolved.has("NEW_ROOM_PERMISSION"));
});

test("a blocked room resolution requires an actionable room failure code", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "named-domain",
    status: "blocked",
    evidence: ["entity-lookup"],
  };
  const result = codes(value);
  assert(result.has("ROOM_BLOCKED_CODE"));

  value.routing.roomResolution.blockedCode = "BLOCKED_ROOM_CREATION_UNAVAILABLE";
  value.quality.blockers = [{
    code: "BLOCKED_ROOM_UNRESOLVED",
    reason: "The room remains unresolved.",
  }];
  assert(codes(value).has("ROOM_BLOCKED_CODE_MATCH"));

  value.quality.blockers = [{
    code: "BLOCKED_ROOM_CREATION_UNAVAILABLE",
    reason: "No authorized conversation-room creation capability is available.",
  }];
  const resolved = codes(value);
  assert(!resolved.has("ROOM_BLOCKED_CODE"));
  assert(!resolved.has("ROOM_BLOCKED_CODE_MATCH"));
});

test("an unresolved named Domain exposes the room failure and cannot commit", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "named-domain",
    status: "unresolved",
    domainDid: "did:ixo:entity:governance",
    evidence: ["entity-lookup"],
  };
  const result = codes(value);
  assert(result.has("ROOM_UNRESOLVED_CODE"));
  assert(result.has("ROOM_BLOCKED_CODE_MATCH"));

  value.routing.roomResolution.blockedCode = "BLOCKED_ROOM_UNRESOLVED";
  value.quality.blockers = [{
    code: "BLOCKED_ROOM_UNRESOLVED",
    reason: "The Domain is resolved, but no verified Matrix room is mapped to it.",
  }];
  const resolved = codes(value);
  assert(!resolved.has("ROOM_UNRESOLVED_CODE"));
  assert(!resolved.has("ROOM_BLOCKED_CODE_MATCH"));
});

test("a room that was not found fails closed with an actionable blocker", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "named-room",
    status: "not-found",
    requestedLabel: "Governance Studio",
    evidence: ["list-rooms"],
  };
  const missing = codes(value);
  assert(missing.has("ROOM_NOT_FOUND_CODE"));
  assert(missing.has("ROOM_BLOCKED_CODE_MATCH"));

  value.routing.roomResolution.blockedCode = "BLOCKED_ROOM_UNRESOLVED";
  value.quality.blockers = [{
    code: "BLOCKED_ROOM_UNRESOLVED",
    reason: "No joined Topic-capable room matched the requested label.",
  }];
  const resolved = codes(value);
  assert(!resolved.has("ROOM_NOT_FOUND_CODE"));
  assert(!resolved.has("ROOM_BLOCKED_CODE_MATCH"));
});

test("commit requires the resolved room and a Kind-preserving host path", async () => {
  const value = await example("team-project.example.json");
  value.routing.roomResolution.status = "unresolved";
  value.execution.hostContext.kindPreservingCreate = false;
  const result = codes(value);
  assert(result.has("COMMIT_ROOM_RESOLUTION"));
  assert(result.has("COMMIT_KIND_HANDOFF"));
});

test("commit host room must match the resolved routing room", async () => {
  const value = await example("team-project.example.json");
  value.execution.hostContext.roomId = "!different:example.org";
  assert(codes(value).has("COMMIT_ROOM_MATCH"));
});

test("commit rejects a room ID without a homeserver", async () => {
  const value = await example("team-project.example.json");
  value.execution.hostContext.roomId = "!x";
  assert(codes(value).has("COMMIT_ROOM"));
});

test("a host known to drop Kind requires a structured non-commit failure", async () => {
  const value = await example();
  value.execution.hostContext.kindPreservingCreate = false;
  assert(codes(value).has("KIND_HANDOFF_BLOCKED_CODE"));

  value.quality.blockers = [{
    code: "BLOCKED_KIND_HANDOFF_UNAVAILABLE",
    reason: "The available Topic tool omits Kind and would default to Discussion.",
  }];
  const resolved = codes(value);
  assert(!resolved.has("KIND_HANDOFF_BLOCKS_COMMIT"));
  assert(!resolved.has("KIND_HANDOFF_BLOCKED_CODE"));
});

test("simultaneous room and Kind failures preserve both blockers", async () => {
  const value = await example();
  value.routing.roomResolution = {
    target: "named-domain",
    status: "unresolved",
    domainDid: "did:ixo:entity:governance",
    evidence: ["entity-lookup"],
    blockedCode: "BLOCKED_ROOM_UNRESOLVED",
  };
  value.execution.hostContext.kindPreservingCreate = false;
  value.quality.blockers = [
    {
      code: "BLOCKED_ROOM_UNRESOLVED",
      reason: "No verified Matrix room is mapped to the selected Domain.",
    },
    {
      code: "BLOCKED_KIND_HANDOFF_UNAVAILABLE",
      reason: "The available Topic tool cannot preserve the selected Kind.",
    },
  ];
  const result = codes(value);
  assert(!result.has("ROOM_BLOCKED_CODE_MATCH"));
  assert(!result.has("KIND_HANDOFF_BLOCKED_CODE"));
});

test("structured blockers require a supported distinct code and a reason", async () => {
  const value = await example();
  value.quality.blockers = [
    { code: "BLOCKED_UNKNOWN", reason: "" },
    { code: "BLOCKED_ROOM_UNRESOLVED", reason: "First reason." },
    { code: "BLOCKED_ROOM_UNRESOLVED", reason: "Second reason." },
  ];
  const result = codes(value);
  assert(result.has("BLOCKER"));
  assert(result.has("DUPLICATE_BLOCKER"));
});

test("any active blocker makes the composition non-committable", async () => {
  const value = await example("team-project.example.json");
  value.quality.blockers = [{
    code: "BLOCKED_AUTHORITY",
    reason: "The required write authority has not been verified.",
  }];
  assert(codes(value).has("BLOCKERS_BLOCK_COMMIT"));

  value.execution.commitEligible = false;
  assert(!codes(value).has("BLOCKERS_BLOCK_COMMIT"));
});

test("host calls are bound to the Effective Shape digest", async () => {
  const value = await example("team-project.example.json");
  value.execution.proposedCalls[0].boundTo.shapeDigest = `sha256:${"0".repeat(64)}`;
  assert(codes(value).has("CALL_SHAPE_BINDING"));
});

test("does not persist a separate Effective Shape record", async () => {
  const value = await example();
  value.execution.stateEventPlan.shapeRecordPersisted = true;
  assert(codes(value).has("EFFECTIVE_SHAPE_RECORD"));
});

test("continue and refine require v4 plus Topic, contract, and Shape pins", async () => {
  const value = await example();
  value.mode = "refine";
  value.disposition = "continue";
  value.topic = {
    operation: "reuse",
    topicId: "ixo:topic:019c8e56-9d28-7c9b-b981-7f8298c96c30",
    observedProfile: "qi.topic-contract-state/v2",
  };
  const result = codes(value);
  assert(result.has("LEGACY_TOPIC"));
  assert(result.has("EXPECTED_TOPIC_REVISION"));
  assert(result.has("EXPECTED_CONTRACT_REVISION"));
  assert(result.has("EXPECTED_SHAPE_DIGEST"));
});

test("all canonical Kinds require their focused Draft structures", async () => {
  const required = {
    project: ["outcome", "project", "completion"],
    task: ["outcome", "plan", "completion"],
    agent_task: ["outcome", "plan", "completion"],
    proposal: ["outcome", "decision", "completion"],
    evaluation: ["outcome", "decision", "completion"],
    claims: ["outcome", "completion"],
    question: ["outcome", "questions", "completion"],
    discussion: ["completion"],
    incident: ["completion", "risks"],
  };
  const catalog = await pins();
  for (const [kind, fields] of Object.entries(required)) {
    for (const field of fields) {
      const value = await example("team-project.example.json");
      const pin = catalog.baseCompositions[kind];
      value.topic.rootDraft.kind = kind;
      value.topic.rootDraft.baseRecipe = pin.baseRecipe;
      value.topic.rootDraft.shapeDigest = pin.shapeDigest;
      value.recipeSelection = {
        strategy: "base-recipe",
        baseRecipe: pin.baseRecipe,
        registryLookup: "not-performed",
        registryReason: "pinned-catalog-only",
        reviewState: "draft",
        shapeSources: pin.shapeSources,
        shapeDigest: pin.shapeDigest,
      };
      value.contractDraft.semantic.kindRef = { source: "standard", kind };
      value.contractDraft.semantic.baseRecipe = pin.baseRecipe;
      value.contractDraft.semantic.shapeSources = pin.shapeSources;
      value.contractDraft.semantic.shapeDigest = pin.shapeDigest;
      value.contractDraft.semantic.plan ??= { milestones: [] };
      value.contractDraft.semantic.decision ??= {};
      value.contractDraft.semantic.questions ??= [];
      value.contractDraft.semantic.risks ??= [];
      delete value.contractDraft.semantic[field];
      assert(codes(value).has("KIND_TEMPLATE_FIELD"), `${kind} must initialise ${field}`);
    }
  }
});

test("risks are Project- and Incident-only and never use likelihood", async () => {
  const value = await example();
  value.contractDraft.semantic.risks = [{
    id: "019c9a5d-1b8a-7b0a-9a6e-28ed6fe77999",
    description: "Uncertainty",
    likelihood: "medium",
    status: "open",
  }];
  const result = codes(value);
  assert(result.has("RISKS_KIND_BOUNDARY"));
  assert(result.has("LEGACY_LIKELIHOOD"));
});

test("Project Drafts keep missing lead and closer choices visible", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.setupObligations = value.contractDraft.setupObligations.filter(
    ({ code }) => !["setup.project-lead", "setup.project-closer"].includes(code),
  );
  const result = codes(value);
  assert(result.has("PROJECT_LEAD_OBLIGATION"));
  assert(result.has("PROJECT_CLOSER_OBLIGATION"));
});

test("Project children use the reviewed non-Project Kind palette", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.project.childObligations = [{
    obligationId: "work-1",
    title: "Nested project",
    kind: "project",
    status: "unmet",
  }];
  assert(codes(value).has("PROJECT_CHILD_KIND"));
});

test("Project milestones and child Kinds materialize only after review", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.project.milestones = [{ id: "release", name: "Release readiness" }];
  value.contractDraft.semantic.project.childObligations = [{ id: "verify", title: "Verify the release", kind: "task" }];
  assert(codes(value).has("PROJECT_MILESTONE_PROVENANCE"));
  assert(codes(value).has("PROJECT_CHILD_KIND_PROVENANCE"));

  value.contractDraft.semantic.fieldProvenance ??= {};
  value.contractDraft.semantic.fieldProvenance["/project/milestones/0"] = {
    basis: "explicit",
    acceptance: "accepted",
    sourceEventIds: [],
  };
  value.contractDraft.semantic.fieldProvenance["/project/childObligations/0/kind"] = {
    basis: "contextual",
    acceptance: "accepted",
    sourceEventIds: ["$child-review"],
  };
  assert.equal(codes(value).has("PROJECT_MILESTONE_PROVENANCE"), false);
  assert.equal(codes(value).has("PROJECT_CHILD_KIND_PROVENANCE"), false);
});

test("Blueprint method manifests require an accepted immutable reference", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.project.methodManifestRef = {
    id: "https://methods.ixo.world/design-yoma/v1",
    version: "1.0.0",
    digest: `sha256:${"a".repeat(64)}`,
  };
  assert(codes(value).has("PROJECT_METHOD_MANIFEST_PROVENANCE"));

  value.contractDraft.semantic.fieldProvenance ??= {};
  value.contractDraft.semantic.fieldProvenance["/project/methodManifestRef"] = {
    basis: "explicit",
    acceptance: "accepted",
    sourceEventIds: ["$method-manifest"],
  };
  assert.equal(codes(value).has("PROJECT_METHOD_MANIFEST_PROVENANCE"), false);
});

test("Project lead assignment does not imply setup confirmation or closure authority", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.project.lead = { kind: "actor", id: "did:ixo:lead" };
  acceptProjectAuthority(value, "lead");
  value.contractDraft.setupObligations = value.contractDraft.setupObligations.filter(
    ({ code }) => code !== "setup.project-lead",
  );
  const result = codes(value);
  assert.equal(result.has("PROJECT_LEAD_OBLIGATION"), false);
  assert(value.contractDraft.setupObligations.some(({ code }) => code === "setup.confirmation-policy"));
  assert(value.contractDraft.setupObligations.some(({ code }) => code === "setup.project-closer"));
});

test("Project closer is explicit and independent from generic completion authority", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.project.closer = { kind: "actor", id: "did:ixo:closer" };
  acceptProjectAuthority(value, "closer");
  value.contractDraft.setupObligations = value.contractDraft.setupObligations.filter(
    ({ code }) => code !== "setup.project-closer",
  );
  value.contractDraft.semantic.completion.acceptanceAuthorityIds = ["did:ixo:someone-else"];
  const result = codes(value);
  assert.equal(result.has("PROJECT_CLOSER_OBLIGATION"), false);
  delete value.contractDraft.semantic.project.closer;
  assert(codes(value).has("PROJECT_CLOSER_OBLIGATION"));
});

test("Project authorities require valid subjects and accepted field provenance", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.setupObligations = value.contractDraft.setupObligations.filter(
    ({ code }) => !["setup.project-lead", "setup.project-closer"].includes(code),
  );
  value.contractDraft.semantic.project.lead = {};
  value.contractDraft.semantic.project.closer = { kind: "actor", id: "did:ixo:closer" };
  assert(codes(value).has("PROJECT_LEAD_OBLIGATION"));
  assert(codes(value).has("PROJECT_CLOSER_OBLIGATION"));

  value.contractDraft.semantic.project.lead = { kind: "role", id: "project-lead" };
  acceptProjectAuthority(value, "lead");
  acceptProjectAuthority(value, "closer");
  assert.equal(codes(value).has("PROJECT_LEAD_OBLIGATION"), false);
  assert.equal(codes(value).has("PROJECT_CLOSER_OBLIGATION"), false);
});

test("Project recipes use their exact digest-pinned Effective Shapes", async () => {
  const catalog = await pins();
  for (const code of ["software-build", "blueprint-design"]) {
    const value = await example("team-project.example.json");
    const pin = catalog.topicRecipes[code];
    selectTopicRecipe(value, code, pin);
    const report = validateComposition(value);
    assert.deepEqual(report, [], `${code}: ${JSON.stringify(report, null, 2)}`);
  }
});

test("secret-like material is rejected", async () => {
  const value = await example();
  value.sourceIntent.verbatim = `Use token ${["sk", "abcdefghijklmnopqrstuvwxyz1234567890"].join("-")}`;
  value.records[0].content.verbatim = value.sourceIntent.verbatim;
  assert(codes(value).has("SECRET_DETECTED"));
});

test("contract schema exposes v4 Shape and singular claim fields without agents", async () => {
  const schema = JSON.parse(await readFile(join(ROOT, "schemas/topic-contract-draft.schema.json"), "utf8"));
  const semantic = schema.properties.semantic.properties;
  assert.equal(schema.properties.envelope.properties.status, undefined);
  assert.equal(semantic.baseRecipe.$ref, "#/$defs/baseRecipe");
  assert.equal(semantic.topicRecipeRef.$ref, "#/$defs/topicRecipeRef");
  assert.equal(semantic.shapeSources.type, "array");
  assert.equal(semantic.claimBinding.$ref, "#/$defs/claimBinding");
  assert.equal(semantic.activationPolicy.$ref, "#/$defs/activationPolicy");
  assert.equal(semantic.project.$ref, "#/$defs/projectPlan");
  assert.equal(semantic.assentPolicy.$ref, "#/$defs/assentPolicy");
  assert.equal(schema.properties.setupObligations.type, "array");
  assert.equal(semantic.agents, undefined);
  assert.equal(semantic.recipe, undefined);
});

test("composition schema can represent generic and room-specific failure codes", async () => {
  const schema = JSON.parse(await readFile(join(ROOT, "schemas/topic-composition.schema.json"), "utf8"));
  assert.equal(schema.properties.quality.properties.blockers.items.$ref, "#/$defs/blocker");
  assert.equal(schema.$defs.blocker.properties.code.$ref, "#/$defs/failureCode");
  assert(schema.$defs.failureCode.enum.includes("BLOCKED_KIND_HANDOFF_UNAVAILABLE"));
  assert(schema.$defs.failureCode.enum.includes("BLOCKED_ROOM_CREATION_UNAVAILABLE"));
  const room = schema.properties.routing.properties.roomResolution;
  assert(room.allOf.some((entry) => entry.then?.required?.includes("blockedCode")));
  const resolvedRule = room.allOf.find((entry) => entry.if?.properties?.status?.const === "resolved");
  assert(resolvedRule.then.properties.evidence.contains.enum.includes("list-rooms"));
  const namedDomainResolvedRule = room.allOf.find((entry) => entry.if?.properties?.target?.const === "named-domain"
    && entry.if?.properties?.status?.const === "resolved");
  assert(namedDomainResolvedRule.then.required.includes("domainDid"));
  assert.equal(namedDomainResolvedRule.then.properties.evidence.contains.const, "domain-room-graph");
  const newDomainRoomResolvedRule = room.allOf.find((entry) => entry.if?.properties?.target?.const === "new-room-under-domain"
    && entry.if?.properties?.status?.const === "resolved");
  assert(newDomainRoomResolvedRule.then.required.includes("domainDid"));
  assert.equal(newDomainRoomResolvedRule.then.properties.evidence.contains.const, "room-creation-result");
  assert.equal(room.properties.newRoomProposal.properties.name.pattern, "\\S");
  assert.equal(room.properties.domainDid.$ref, "#/$defs/ixoEntityDid");
  assert.equal(room.properties.candidates.items.properties.domainDid.$ref, "#/$defs/ixoEntityDid");
  assert.equal(room.properties.newRoomProposal.properties.parentDomainDid.$ref, "#/$defs/ixoEntityDid");
  const entityDid = new RegExp(schema.$defs.ixoEntityDid.pattern, "u");
  assert(entityDid.test("did:ixo:entity:yoma"));
  assert(!entityDid.test("did:ixo:"));
  assert(!entityDid.test("did:ixo:   "));
  assert(schema.allOf.some((entry) => entry.if?.properties?.quality?.properties?.blockers?.minItems === 1
    && entry.then?.properties?.execution?.properties?.commitEligible?.const === false));
  assert(schema.allOf.some((entry) => entry.if?.properties?.routing?.properties?.roomResolution?.properties?.status?.enum?.includes("new-room-required")
    && entry.then?.properties?.execution?.properties?.commitEligible?.const === false));
  const roomId = new RegExp(schema.$defs.matrixRoomId.pattern, "u");
  assert(roomId.test("!governance:[2001:db8::1]:8448"));
  assert(roomId.test("!governance:[::ffff:127.0.0.1]"));
  assert(roomId.test("!governance:[::]"));
  assert(!roomId.test("!x:[....]"));
  assert(!roomId.test("!x:example.org:65536"));
});

test("keeps every unresolved setup authority choice visible as an obligation", async () => {
  const value = await example();
  value.contractDraft.setupObligations = value.contractDraft.setupObligations.filter(({ code }) => code !== "setup.editors");
  assert(codes(value).has("MISSING_SETUP_OBLIGATION"));
});

test("rejects owner-as-authority fallback without explicit policy provenance", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.activationPolicy.editors = [{ kind: "actor", id: value.contractDraft.semantic.ownerId }];
  assert(codes(value).has("POLICY_PROVENANCE"));
});

test("accepts explicitly supplied setup authority even when that actor is also the owner", async () => {
  const value = await example("team-project.example.json");
  value.contractDraft.semantic.activationPolicy.editors = [{ kind: "actor", id: value.contractDraft.semantic.ownerId }];
  value.contractDraft.semantic.fieldProvenance ??= {};
  value.contractDraft.semantic.fieldProvenance["/activationPolicy/editors"] = {
    basis: "explicit",
    acceptance: "accepted",
    sourceEventIds: [],
  };
  value.contractDraft.setupObligations = value.contractDraft.setupObligations.filter(({ code }) => code !== "setup.editors");
  assert.equal(codes(value).has("POLICY_PROVENANCE"), false);
  assert.equal(codes(value).has("MISSING_SETUP_OBLIGATION"), false);
});

test("rejects invented lifecycle dates and invalid thresholds", async () => {
  const value = await example();
  value.contractDraft.semantic.activationPolicy.lifecycle.expiresAt = "2030-01-01T00:00:00Z";
  value.contractDraft.semantic.activationPolicy.confirmation = {
    mode: "threshold",
    subjects: [{ kind: "actor", id: "did:ixo:reviewer" }],
    threshold: 2,
  };
  value.contractDraft.semantic.fieldProvenance ??= {};
  value.contractDraft.semantic.fieldProvenance["/activationPolicy/confirmation"] = {
    basis: "explicit",
    acceptance: "accepted",
    sourceEventIds: [],
  };
  const result = codes(value);
  assert(result.has("LIFECYCLE_PROVENANCE"));
  assert(result.has("POLICY_THRESHOLD"));
});

test("keeps optional agreement signatories out of solo Topics", async () => {
  const value = await example("research-brief.example.json");
  value.contractDraft.semantic.assentPolicy = {
    mode: "all",
    signatories: [{ kind: "actor", id: "did:ixo:signatory" }],
  };
  value.contractDraft.semantic.fieldProvenance ??= {};
  value.contractDraft.semantic.fieldProvenance["/assentPolicy"] = {
    basis: "explicit",
    acceptance: "accepted",
    sourceEventIds: [],
  };
  assert(codes(value).has("SOLO_ASSENT"));
});

test("Agent Task Draft names delivery responsibility as its best missing setup step", async () => {
  const value = await example("expert-service-flow.example.json");
  const first = value.contractDraft.setupObligations[0];
  assert.equal(first.code, "setup.owner");
  assert.equal(first.prompt, "Choose who is responsible for the result.");
  assert.equal(value.topic.rootDraft.overview.nextStep.summary, first.prompt);
});
