#!/usr/bin/env node
/**
 * The run's deterministic state gate.
 *
 * In the Claude Code plugin, role isolation does part of this work: the orchestrator
 * dispatches to a specialist, and a separate agent's output is what advances the state.
 * A QiForge oracle runs one agent, so that separation is gone. This script supplies the
 * deterministic gate only when the Portal host owns its invocation and durable run storage.
 *
 * Nothing here trusts a claim of completion. `advance` re-validates the artifact against
 * its schema, re-runs the deterministic graph checks, and refuses any envelope that does
 * not carry an `approve_transition` verdict backed by tool evidence. Human approval is a
 * host-signed decision; a caller-supplied DID is never treated as authorization.
 *
 * Usage:
 *   node scripts/run.mjs init --workflow <id> --domain <d> [--target-tier N] [--brief <file>]
 *   node scripts/run.mjs state  --workflow <id>
 *   node scripts/run.mjs record --workflow <id> --artifact <file>
 *   node scripts/run.mjs record-packet --workflow <id> --packet <ref> --file <markdown>
 *   node scripts/run.mjs plan --workflow <id> --to <STATE> --artifact <file>
 *        [--supersession-event <json>]
 *   node scripts/run.mjs advance --workflow <id> --to <STATE> --gate-plan <file>
 *        --task-contract <file> --result <file> --envelope <file> --expected-revision <n>
 *        [--supersession-event <json>]
 *        [--review-decision <host-signed-json>]
 *        [--issuance-authorization <host-signed-json>]
 *   node scripts/run.mjs totals --workflow <id>
 *   node scripts/run.mjs snapshot --workflow <id>
 *   node scripts/run.mjs reconcile --workflow <id>
 *
 * Runs live under $OUTCOME_GRAPH_RUNS, defaulting to the sandbox's output mount at
 * /workspace/data/output/outcome-graph — ordinary file writes, isolated to this user by
 * the sandbox. Nothing outside the sandbox reads these files directly: `snapshot` writes
 * the one artifact the agent hands to the canvas, via a presigned URL the sandbox mints.
 */

import { createHash, createPublicKey, randomUUID, verify as verifySignature } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { hostname } from "node:os";
import { fileURLToPath } from "node:url";
import { checkGraph as checkGraphInMemory } from "./lib/graph-checks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPSULE = resolve(HERE, "..");
const RUNS_ROOT =
  process.env.OUTCOME_GRAPH_RUNS ?? "/workspace/data/output/outcome-graph";

/** Machine states, in pipeline order. Mirrors common.defs.v1.json#/$defs/workflow_state. */
const STATES = [
  "SOURCE_ACCEPTED",
  "TOC_PARSED",
  "CLAIMS_STRUCTURED",
  "CAUSAL_GRAPH_DRAFTED",
  "EVIDENCE_GRAPH_LINKED",
  "VALIDATION_RUNNING",
  "REVIEW_REQUIRED",
  "VALIDATED",
  "ISSUANCE_ELIGIBLE",
  "CERTIFICATE_ISSUED",
  "REJECTED",
  "VERSION_ARCHIVED",
];

/**
 * The schema id of a signed certificate. It has no `schema` field of its own — a W3C
 * VC 2.0 document must be readable by a verifier that has never heard of this pipeline —
 * so the gate names it here and recognises the document by its `type` array.
 */
const CERTIFICATE_SCHEMA = "outcome.outcome-certificate.v1";

/**
 * Which states may precede each state. Membership in STATES is not enough: without this,
 * `advance --to CERTIFICATE_ISSUED` succeeds straight from SOURCE_ACCEPTED, skipping the
 * graph, evidence, validation and review gates and leaving a run that advertises an issued
 * certificate with every artifact_ref null. The states that assert an achievement —
 * VALIDATED, ISSUANCE_ELIGIBLE, CERTIFICATE_ISSUED — therefore have exact predecessors.
 *
 * Rework edges are deliberate. Validation that finds problems sends the run back to redraft
 * the graph or the evidence, and a gate that forbade that would be routed around rather than
 * obeyed. Self-transitions are how a second candidate version is recorded.
 *
 * REJECTED and VERSION_ARCHIVED are permissive because neither asserts an achievement: one
 * is an ending, the other a filing decision, and a run can honestly reach either from
 * anywhere. SOURCE_ACCEPTED is absent — `init` is its only writer.
 */
const WORKING_STATES = [
  "TOC_PARSED",
  "CLAIMS_STRUCTURED",
  "CAUSAL_GRAPH_DRAFTED",
  "EVIDENCE_GRAPH_LINKED",
  "VALIDATION_RUNNING",
];
const LEGAL_PREDECESSORS = {
  SOURCE_ACCEPTED: [],
  TOC_PARSED: ["SOURCE_ACCEPTED", "TOC_PARSED", "REVIEW_REQUIRED"],
  CLAIMS_STRUCTURED: ["TOC_PARSED", "CLAIMS_STRUCTURED", "REVIEW_REQUIRED"],
  CAUSAL_GRAPH_DRAFTED: [
    "CLAIMS_STRUCTURED",
    "CAUSAL_GRAPH_DRAFTED",
    "VALIDATION_RUNNING",
    "REVIEW_REQUIRED",
  ],
  EVIDENCE_GRAPH_LINKED: [
    "CAUSAL_GRAPH_DRAFTED",
    "EVIDENCE_GRAPH_LINKED",
    "VALIDATION_RUNNING",
    "REVIEW_REQUIRED",
  ],
  VALIDATION_RUNNING: ["EVIDENCE_GRAPH_LINKED", "VALIDATION_RUNNING", "REVIEW_REQUIRED"],
  REVIEW_REQUIRED: [...WORKING_STATES, "VALIDATED", "ISSUANCE_ELIGIBLE"],
  VALIDATED: ["VALIDATION_RUNNING", "REVIEW_REQUIRED"],
  ISSUANCE_ELIGIBLE: ["VALIDATED"],
  CERTIFICATE_ISSUED: ["ISSUANCE_ELIGIBLE"],
  REJECTED: [...WORKING_STATES, "SOURCE_ACCEPTED", "REVIEW_REQUIRED", "VALIDATED", "ISSUANCE_ELIGIBLE"],
  VERSION_ARCHIVED: STATES.filter((s) => s !== "VERSION_ARCHIVED"),
};

/** Which artifact a state must have produced, and where state.json records it. */
const STATE_ARTIFACT = {
  TOC_PARSED: { schema: "outcome.toc-extraction.v1", ref: "toc_extraction" },
  CLAIMS_STRUCTURED: { schema: "outcome.toc-extraction.v1", ref: "toc_extraction" },
  CAUSAL_GRAPH_DRAFTED: { schema: "outcome.causal-graph.v1", ref: "causal_graph" },
  EVIDENCE_GRAPH_LINKED: { schema: "outcome.evidence-graph.v1", ref: "evidence_graph" },
  VALIDATION_RUNNING: { schema: "outcome.validation-report.v1", ref: "validation_report" },
  ISSUANCE_ELIGIBLE: { schema: "outcome.issuance-request.v1", ref: "issuance_request" },
  // VALIDATED is an orchestrator state, but SKILL.md is explicit that it means "the
  // validation report recommends validated". Requiring the report here is also what stops
  // REVIEW_REQUIRED being used to launder a run into VALIDATED: review is reachable from
  // every working state, so without this a run could escalate from TOC_PARSED and come back
  // validated, having never built a graph, linked evidence, or run a check.
  VALIDATED: { schema: "outcome.validation-report.v1", ref: "validation_report" },
  // Without this the state that claims a certificate exists never checks for one.
  CERTIFICATE_ISSUED: { schema: CERTIFICATE_SCHEMA, ref: "certificate" },
};

/** Identity field per artifact schema, so an artifact_ref resolves to a document. */
const ID_FIELDS = {
  "outcome.toc-extraction.v1": "extraction_id",
  "outcome.toc-semantic-review.v1": "review_id",
  "outcome.causal-graph.v1": "graph_version_id",
  "outcome.evidence-graph.v1": "evidence_graph_id",
  "outcome.validation-report.v1": "report_id",
  "outcome.issuance-request.v1": "request_id",
  "outcome.geo-boundary.v1": "boundary_id",
  "outcome.run-brief.v1": "brief_id",
  "outcome.review-decision.v1": "decision_id",
  "outcome.issuance-authorization.v1": "authorization_id",
  [CERTIFICATE_SCHEMA]: "id",
};

const DIMENSIONS = ["schema", "provenance", "semantics", "structure", "identification", "governance"];

/** Host executors available inside the capsule. An unknown required executor blocks. */
const CRITERIA = {
  artifact_schema_valid: ["schema", "schema_validation", "run.mjs:artifact-schema", "2.0.0"],
  legal_state_transition: ["governance", "deterministic_tool", "run.mjs:state-machine", "2.0.0"],
  source_provenance_integrity: ["provenance", "deterministic_tool", "run.mjs:source-provenance", "2.0.0"],
  toc_role_semantics_reviewed: ["semantics", "agent_judgment", "run.mjs:toc-semantic-review", "2.0.0"],
  toc_proposition_node_coverage: ["provenance", "deterministic_tool", "run.mjs:toc-graph-coverage", "2.0.0"],
  intervention_to_claimable_node_reachability: ["structure", "deterministic_tool", "run.mjs:claimable-reachability", "2.0.0"],
  acyclicity: ["structure", "deterministic_tool", "check-graph.mjs:DAG-01", "1.0.0"],
  edge_validation_status_policy: ["governance", "deterministic_tool", "run.mjs:edge-status-policy", "2.0.0"],
  provenance_reference_integrity: ["provenance", "deterministic_tool", "run.mjs:reference-integrity", "2.0.0"],
  validation_pass_completeness: ["structure", "deterministic_tool", "run.mjs:validation-coverage", "2.0.0"],
  attainable_tier_policy: ["identification", "deterministic_tool", "run.mjs:tier-policy", "2.0.0"],
  issuance_policy: ["governance", "deterministic_tool", "run.mjs:issuance-policy", "1.0.0"],
  certificate_proof: ["governance", "deterministic_tool", "run.mjs:certificate-proof", "1.0.0"],
  governance_authority: ["governance", "human_review", "run.mjs:governance-authority", "3.0.0"],
  artifact_registration_integrity: ["provenance", "deterministic_tool", "run.mjs:artifact-registration", "2.0.0"],
  supersession_lineage_integrity: ["provenance", "deterministic_tool", "run.mjs:supersession-lineage", "1.0.0"],
  manifest_compare_and_swap: ["governance", "deterministic_tool", "run.mjs:manifest-cas", "2.0.0"],
  snapshot_reconciliation: ["schema", "deterministic_tool", "run.mjs:snapshot-reconciliation", "2.0.0"],
};

const BASE_CRITERIA = [
  "artifact_schema_valid",
  "legal_state_transition",
  "artifact_registration_integrity",
  "supersession_lineage_integrity",
  "manifest_compare_and_swap",
  "snapshot_reconciliation",
];

/** Minimum complete pass matrix for validation-report.v1 in this control-plane version. */
const VALIDATION_REQUIRED_CHECKS = ["SEM-01", "DAG-01", "DAG-02", "EDGE-03", "ADM-02", "EMP-01", "EMP-05"];

function requiredCriteria(from, to) {
  const ids = new Set(BASE_CRITERIA);
  if (["TOC_PARSED", "CLAIMS_STRUCTURED"].includes(to)) {
    ids.add("source_provenance_integrity");
    ids.add("toc_role_semantics_reviewed");
  }
  if (to === "CAUSAL_GRAPH_DRAFTED") {
    for (const id of [
      "toc_proposition_node_coverage",
      "intervention_to_claimable_node_reachability",
      "acyclicity",
      "edge_validation_status_policy",
      "provenance_reference_integrity",
    ]) ids.add(id);
  }
  if (["EVIDENCE_GRAPH_LINKED", "VALIDATION_RUNNING", "VALIDATED", "ISSUANCE_ELIGIBLE", "CERTIFICATE_ISSUED"].includes(to)) {
    ids.add("provenance_reference_integrity");
  }
  if (["VALIDATED", "REVIEW_REQUIRED", "ISSUANCE_ELIGIBLE", "CERTIFICATE_ISSUED"].includes(to)) {
    ids.add("governance_authority");
  }
  if (["VALIDATED", "REVIEW_REQUIRED"].includes(to) && ["VALIDATION_RUNNING", "REVIEW_REQUIRED"].includes(from)) {
    ids.add("validation_pass_completeness");
    ids.add("attainable_tier_policy");
  }
  if (["ISSUANCE_ELIGIBLE", "CERTIFICATE_ISSUED"].includes(to)) ids.add("attainable_tier_policy");
  if (to === "ISSUANCE_ELIGIBLE") ids.add("issuance_policy");
  if (to === "CERTIFICATE_ISSUED") ids.add("certificate_proof");
  return [...ids];
}

const AGENT_FOR_STATE = {
  TOC_PARSED: "toc-intake",
  CLAIMS_STRUCTURED: "toc-intake",
  CAUSAL_GRAPH_DRAFTED: "causal-modeler",
  EVIDENCE_GRAPH_LINKED: "evidence-mapper",
  VALIDATION_RUNNING: "graph-validator",
  REVIEW_REQUIRED: "review-escalation",
  VALIDATED: "review-escalation",
  ISSUANCE_ELIGIBLE: "certificate-issuer",
  CERTIFICATE_ISSUED: "certificate-issuer",
  REJECTED: "review-escalation",
  VERSION_ARCHIVED: "review-escalation",
};

/**
 * What an artifact document is, by its own contents. Everything this pipeline authors
 * declares `schema`; a signed certificate is the exception and is identified by its VC
 * `type` array. Returns null for a document that is neither.
 */
function classify(doc) {
  if (Array.isArray(doc?.type) && doc.type.includes("OutcomeCertificate")) {
    return { schema: CERTIFICATE_SCHEMA, idField: "id" };
  }
  const schema = doc?.schema;
  if (typeof schema !== "string" || !ID_FIELDS[schema]) return null;
  return { schema, idField: ID_FIELDS[schema] };
}

// ---- plumbing --------------------------------------------------------------

/**
 * Print the refusal and exit non-zero. The non-zero exit is the gate: a caller in a shell
 * must be able to tell a blocked transition from an allowed one without parsing stdout.
 */
export class OutcomeGraphGateError extends Error {
  constructor(message) {
    super(message);
    this.name = "OutcomeGraphGateError";
  }
}

const die = (message) => {
  throw new OutcomeGraphGateError(message);
};

/** One JSON object on stdout: the agent reads this, never the files directly. */
function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function runDir(workflowId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(workflowId ?? "")) {
    die(`invalid workflow id '${workflowId}'`);
  }
  const root = resolve(RUNS_ROOT, "runs");
  const path = resolve(root, workflowId);
  if (dirname(path) !== root) die(`invalid workflow id '${workflowId}'`);
  if (existsSync(path)) {
    if (lstatSync(path).isSymbolicLink()) die(`workflow '${workflowId}' may not be a symbolic link`);
    const canonicalRoot = existsSync(root) ? realpathSync(root) : root;
    if (dirname(realpathSync(path)) !== canonicalRoot) {
      die(`workflow '${workflowId}' does not resolve beneath the runs root`);
    }
  }
  return path;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    die(`cannot read JSON at ${path}: ${error.message}`);
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function jsonBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value) {
  return sha256(jsonBytes(value));
}

function reviewDecisionPayload(decision) {
  return {
    schema: decision?.schema,
    workflow_id: decision?.workflow_id,
    manifest_revision: decision?.manifest_revision,
    state_in: decision?.state_in,
    state_out: decision?.state_out,
    candidate_digest: decision?.candidate_digest,
    packet_ref: decision?.packet_ref,
    reviewer_did: decision?.reviewer_did,
    decision: decision?.decision,
    decided_at: decision?.decided_at,
  };
}

function reviewDecisionId(decision) {
  return `urn:ixo:review-decision:${digestJson(reviewDecisionPayload(decision))}`;
}

function verifyReviewDecision({ decision, state, to, manifestRevision, candidate }) {
  if (!decision) return { status: "fail", summary: `${to} needs a host-signed --review-decision` };
  const controller = state.issuer_context?.issuer?.did;
  const key = state.issuer_context?.review_verification_key;
  if (!controller || !key) {
    return { status: "fail", summary: "the host did not inject a controller and review verification key at init" };
  }
  const packets = state.open_review_packets ?? [];
  if (packets.length !== 1) {
    return { status: "fail", summary: `${to} requires exactly one unresolved review packet, found ${packets.length}` };
  }
  const packetRef = packets[0];
  const expected = {
    workflow_id: state.workflow_id,
    manifest_revision: manifestRevision,
    state_in: state.current_state,
    state_out: to,
    candidate_digest: candidate ? digestJson(candidate) : digestJson(state),
    packet_ref: packetRef,
    reviewer_did: controller,
    decision: "approve",
  };
  for (const [field, value] of Object.entries(expected)) {
    if (decision[field] !== value) {
      return { status: "fail", summary: `review decision '${field}' is not bound to the active transition` };
    }
  }
  if (decision.decision_id !== reviewDecisionId(decision)) {
    return { status: "fail", summary: "review decision ID is not the content address of its signed payload" };
  }
  if (decision.proof?.verification_method !== `${controller}#outcome-graph-review`) {
    return { status: "fail", summary: "review decision verification method does not belong to the run controller" };
  }
  try {
    const keyBytes = Buffer.from(key.public_key_spki_base64, "base64");
    if (sha256(keyBytes) !== key.fingerprint) {
      return { status: "fail", summary: "stored review verification key fingerprint is invalid" };
    }
    const publicKey = createPublicKey({ key: keyBytes, format: "der", type: "spki" });
    const verified = verifySignature(
      null,
      Buffer.from(jsonBytes(reviewDecisionPayload(decision))),
      publicKey,
      Buffer.from(decision.proof?.proof_value ?? "", "base64"),
    );
    return verified
      ? { status: "pass", summary: `host-signed decision from '${controller}' authorizes ${to}` }
      : { status: "fail", summary: "review decision signature is invalid" };
  } catch (error) {
    return { status: "fail", summary: `review decision proof cannot be verified: ${error.message}` };
  }
}

function issuanceAuthorizationPayload(authorization) {
  return {
    schema: authorization?.schema,
    workflow_id: authorization?.workflow_id,
    manifest_revision: authorization?.manifest_revision,
    state_in: authorization?.state_in,
    state_out: authorization?.state_out,
    candidate_digest: authorization?.candidate_digest,
    purpose: authorization?.purpose,
    issuer_did: authorization?.issuer_did,
    assessment_tier: authorization?.assessment_tier,
    decision: authorization?.decision,
    signing_receipt_ref: authorization?.signing_receipt_ref,
    authorized_by_did: authorization?.authorized_by_did,
    authorized_at: authorization?.authorized_at,
  };
}

function issuanceAuthorizationId(authorization) {
  return `urn:ixo:issuance-authorization:${digestJson(issuanceAuthorizationPayload(authorization))}`;
}

function supersessionEventPayload(event) {
  return {
    schema: event?.schema,
    workflow_id: event?.workflow_id,
    artifact_kind: event?.artifact_kind,
    predecessor_ref: event?.predecessor_ref,
    predecessor_digest: event?.predecessor_digest,
    successor_ref: event?.successor_ref,
    successor_digest: event?.successor_digest,
    failed_check_ids: event?.failed_check_ids,
    patch_summary: event?.patch_summary,
    actor: event?.actor,
    occurred_at: event?.occurred_at,
    rerun_evidence_refs: event?.rerun_evidence_refs,
    predecessor_disposition: event?.predecessor_disposition,
  };
}

function supersessionEventId(event) {
  return `urn:ixo:supersession-event:${digestJson(supersessionEventPayload(event))}`;
}

function verifyIssuanceAuthorization({ authorization, state, to, manifestRevision, candidate }) {
  if (!authorization) return { status: "fail", summary: `${to} needs a host-signed --issuance-authorization` };
  const controller = state.issuer_context?.issuer?.did;
  const key = state.issuer_context?.review_verification_key;
  if (!controller || !key) {
    return { status: "fail", summary: "the host did not inject a controller and issuance verification key at init" };
  }
  const certificateCommit = to === "CERTIFICATE_ISSUED";
  const expected = {
    workflow_id: state.workflow_id,
    manifest_revision: manifestRevision,
    state_in: state.current_state,
    state_out: to,
    candidate_digest: candidate ? digestJson(candidate) : digestJson(state),
    purpose: certificateCommit ? "certificate_commit" : "issuance_eligibility",
    issuer_did: certificateCommit ? candidate?.issuer?.id : null,
    assessment_tier: certificateCommit
      ? candidate?.credentialSubject?.assessmentTier
      : candidate?.computed_tier,
    decision: "authorize",
    authorized_by_did: controller,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (authorization[field] !== value) {
      return { status: "fail", summary: `issuance authorization '${field}' is not bound to the active transition` };
    }
  }
  if (certificateCommit && !authorization.signing_receipt_ref) {
    return { status: "fail", summary: "certificate commit authorization needs a signing receipt ref" };
  }
  if (!certificateCommit && authorization.signing_receipt_ref !== null) {
    return { status: "fail", summary: "eligibility authorization must not claim a signing receipt" };
  }
  if (authorization.authorization_id !== issuanceAuthorizationId(authorization)) {
    return { status: "fail", summary: "issuance authorization ID is not the content address of its signed payload" };
  }
  if (authorization.proof?.verification_method !== `${controller}#outcome-graph-issuance`) {
    return { status: "fail", summary: "issuance authorization verification method does not belong to the run controller" };
  }
  try {
    const keyBytes = Buffer.from(key.public_key_spki_base64, "base64");
    if (sha256(keyBytes) !== key.fingerprint) {
      return { status: "fail", summary: "stored issuance verification key fingerprint is invalid" };
    }
    const publicKey = createPublicKey({ key: keyBytes, format: "der", type: "spki" });
    const verified = verifySignature(
      null,
      Buffer.from(jsonBytes(issuanceAuthorizationPayload(authorization))),
      publicKey,
      Buffer.from(authorization.proof?.proof_value ?? "", "base64"),
    );
    return verified
      ? { status: "pass", summary: `host-signed issuance authorization permits ${to}` }
      : { status: "fail", summary: "issuance authorization signature is invalid" };
  } catch (error) {
    return { status: "fail", summary: `issuance authorization proof cannot be verified: ${error.message}` };
  }
}

function safeName(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/g, "-");
}

function artifactPath(workflowId, artifactId, area = "artifacts") {
  const readable = safeName(artifactId).slice(0, 80) || "artifact";
  return join(runDir(workflowId), area, `${readable}-${sha256(String(artifactId)).slice(0, 16)}.json`);
}

function reviewPacketPath(workflowId, packetRef) {
  const readable = safeName(packetRef).slice(0, 80) || "review-packet";
  return join(runDir(workflowId), "review-packets", `${readable}-${sha256(String(packetRef)).slice(0, 16)}.md`);
}

function loadManifest(workflowId) {
  const path = join(runDir(workflowId), "manifest.json");
  if (!existsSync(path)) die(`run '${workflowId}' has no manifest.json`);
  const manifest = readJson(path);
  if (manifest.schema !== "outcome.manifest-pointer.v1") die("manifest.json has the wrong schema");
  return { path, manifest };
}

function loadSelectedCommit(workflowId, manifest) {
  const path = artifactPath(workflowId, manifest.transition_commit_ref, "commits");
  if (!existsSync(path)) die(`manifest selects missing transition commit '${manifest.transition_commit_ref}'`);
  const bytes = readFileSync(path);
  const digest = sha256(bytes);
  if (digest !== manifest.transition_commit_digest) {
    die(`transition commit digest mismatch: manifest ${manifest.transition_commit_digest}, actual ${digest}`);
  }
  const commit = JSON.parse(bytes.toString("utf8"));
  if (commit.workflow_id !== workflowId || commit.manifest_revision !== manifest.manifest_revision) {
    die("manifest and selected transition commit disagree on workflow or revision");
  }
  const expectedCommitId = transitionCommitId({
    workflowId,
    revision: commit.manifest_revision,
    from: commit.state_before,
    to: commit.state_after,
    taskRef: commit.task_ref,
    resultRef: commit.result_ref,
    envelopeRef: commit.verification_envelope_ref,
    stateDigest: commit.state_projection_digest,
  });
  if (commit.commit_id !== expectedCommitId || manifest.transition_commit_ref !== expectedCommitId) {
    die("transition commit ID is not the content address of its committed transition fields");
  }
  return { path, commit, digest };
}

function projectionPaths(workflowId, commitRef) {
  const stem = artifactPath(workflowId, commitRef, "commits").replace(/\.json$/, "");
  return { state: `${stem}.state.json`, snapshot: `${stem}.snapshot.json` };
}

function snapshotProjectionDigest(snapshot) {
  const committedOnly = structuredClone(snapshot);
  if (committedOnly.control) {
    committedOnly.control.includes_uncommitted_work = false;
    committedOnly.control.uncommitted = Object.fromEntries(
      Object.keys(committedOnly.control.committed ?? {}).map((key) => [key, 0]),
    );
  }
  return digestJson(committedOnly);
}

function reconciliationMismatches(workflowId, commit) {
  const dir = runDir(workflowId);
  const mismatches = [];
  const statePath = join(dir, "state.json");
  const snapshotPath = join(dir, "snapshot.json");
  if (!existsSync(statePath) || sha256(readFileSync(statePath)) !== commit.state_projection_digest) {
    mismatches.push("state_projection_digest");
  }
  if (!existsSync(snapshotPath)) mismatches.push("snapshot_projection_digest");
  else {
    try {
      if (snapshotProjectionDigest(JSON.parse(readFileSync(snapshotPath, "utf8"))) !== commit.snapshot_projection_digest) {
        mismatches.push("snapshot_projection_digest");
      }
    } catch {
      mismatches.push("snapshot_projection_digest");
    }
  }
  for (const registration of commit.artifact_registrations ?? []) {
    if (registration.artifact_kind === "state_projection") continue;
    const path = registration.artifact_kind === "review_packet"
      ? reviewPacketPath(workflowId, registration.artifact_ref)
      : registration.artifact_kind === "outcome.supersession-event.v1"
        ? artifactPath(workflowId, registration.artifact_ref, "revisions")
      : ["task_contract", "result_contract", "verification_envelope", "gate_plan", "gate_result"].includes(registration.artifact_kind)
        ? artifactPath(workflowId, registration.artifact_ref, "tasks")
        : artifactPath(workflowId, registration.artifact_ref);
    if (!existsSync(path)) mismatches.push(`missing:${registration.artifact_ref}`);
    else if (sha256(readFileSync(path)) !== registration.digest) mismatches.push(`digest:${registration.artifact_ref}`);
  }
  const registeredGateResults = new Set((commit.artifact_registrations ?? [])
    .filter((registration) => registration.artifact_kind === "gate_result" && registration.status === "verified")
    .map((registration) => registration.artifact_ref));
  for (const result of commit.gate_results ?? []) {
    if (!registeredGateResults.has(result.evidence_ref)) {
      mismatches.push(`unregistered-gate-result:${result.evidence_ref}`);
    }
  }
  const registeredSupersessionEvents = new Set((commit.artifact_registrations ?? [])
    .filter((registration) => registration.artifact_kind === "outcome.supersession-event.v1" && registration.status === "accepted")
    .map((registration) => registration.artifact_ref));
  const registeredEvidence = new Set((commit.artifact_registrations ?? [])
    .filter((registration) => ["verification_envelope", "gate_result"].includes(registration.artifact_kind))
    .map((registration) => registration.artifact_ref));
  const passingGateCriteria = new Set((commit.gate_results ?? [])
    .filter((result) => result.status === "pass")
    .map((result) => result.criterion_id));
  for (const ref of commit.supersession_event_refs ?? []) {
    if (!registeredSupersessionEvents.has(ref)) mismatches.push(`unregistered-supersession-event:${ref}`);
    const path = artifactPath(workflowId, ref, "revisions");
    if (!existsSync(path)) continue;
    try {
      const event = readJson(path);
      for (const evidenceRef of event.rerun_evidence_refs ?? []) {
        if (!registeredEvidence.has(evidenceRef)) mismatches.push(`unregistered-rerun-evidence:${evidenceRef}`);
      }
      for (const criterionId of event.failed_check_ids ?? []) {
        if (!passingGateCriteria.has(criterionId)) mismatches.push(`unpassed-repair-criterion:${criterionId}`);
      }
    } catch {
      mismatches.push(`invalid-supersession-event:${ref}`);
    }
  }
  const projections = projectionPaths(workflowId, commit.commit_id);
  if (existsSync(projections.state)) {
    const committedState = readJson(projections.state);
    const registered = new Set((commit.artifact_registrations ?? [])
      .filter((registration) => registration.status === "accepted")
      .map((registration) => registration.artifact_ref));
    for (const ref of Object.values(committedState.artifact_refs ?? {}).filter(Boolean)) {
      if (!registered.has(ref)) mismatches.push(`unregistered:${ref}`);
    }
  }
  return mismatches;
}

function reconcileRunIntegrity(workflowId, { repair = false } = {}) {
  const { manifest } = loadManifest(workflowId);
  const { commit } = loadSelectedCommit(workflowId, manifest);
  let mismatches = reconciliationMismatches(workflowId, commit);
  if (mismatches.length && repair) {
    const projections = projectionPaths(workflowId, commit.commit_id);
    if (!existsSync(projections.state) || !existsSync(projections.snapshot)) {
      die(`cannot repair projections for ${commit.commit_id}: immutable projection copies are missing`);
    }
    writeFileSync(join(runDir(workflowId), "state.json"), readFileSync(projections.state));
    writeFileSync(join(runDir(workflowId), "snapshot.json"), readFileSync(projections.snapshot));
    mismatches = reconciliationMismatches(workflowId, commit);
  }
  if (mismatches.length) {
    die(`run reconciliation failed: ${mismatches.join(", ")}; run 'reconcile --workflow ${workflowId}'`);
  }
  return { manifest, commit };
}

function acquireManifestLock(workflowId) {
  const path = join(runDir(workflowId), ".manifest-locks");
  mkdirSync(path, { recursive: true });
  const token = `${Date.now()}-${process.pid}-${randomUUID()}`;
  const ownerPath = join(path, `${token}.json`);
  const pendingPath = join(path, `.${token}.tmp`);
  const owner = {
    token,
    pid: process.pid,
    host: hostname(),
    acquired_at: new Date().toISOString(),
  };
  try {
    // Publish only complete owner records. A crash before rename leaves an ignored temp file;
    // after rename, no reader can observe a half-written claim.
    writeFileSync(pendingPath, jsonBytes(owner), { flag: "wx" });
    renameSync(pendingPath, ownerPath);
  } catch (error) {
    rmSync(pendingPath, { force: true });
    die(`cannot publish manifest lock for '${workflowId}': ${error.message}`);
  }

  const competitors = [];
  for (const file of readdirSync(path).filter((name) => name.endsWith(".json") && name !== `${token}.json`)) {
    const claimPath = join(path, file);
    let claim = null;
    try { claim = readJson(claimPath); } catch { /* corrupt claims fail closed */ }
    let dead = false;
    if (claim?.host === hostname() && Number.isInteger(claim.pid) && claim.pid > 0) {
      try { process.kill(claim.pid, 0); } catch (probeError) {
        dead = probeError.code === "ESRCH";
      }
    }
    if (dead) rmSync(claimPath, { force: true });
    else competitors.push(file);
  }
  if (competitors.length) {
    rmSync(ownerPath, { force: true });
    die(`manifest for '${workflowId}' is locked by another transition`);
  }

  const cleanup = () => rmSync(ownerPath, { force: true });
  process.once("exit", cleanup);
  return () => {
    process.removeListener("exit", cleanup);
    cleanup();
  };
}

function writeManifestAtomic(workflowId, manifest) {
  const dir = runDir(workflowId);
  const temp = join(dir, `.manifest-${process.pid}-${Date.now()}.json`);
  writeJson(temp, manifest);
  renameSync(temp, join(dir, "manifest.json"));
}

function loadState(workflowId) {
  const path = join(runDir(workflowId), "state.json");
  if (!existsSync(path)) die(`no run '${workflowId}' — run 'init' first`);
  return { path, state: readJson(path) };
}

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  return out;
}

// ---- verification ----------------------------------------------------------

/**
 * Whether schema validation can actually run. The sandbox installs the capsule's
 * dependencies at extract time, but if that has not happened the agent needs to know on
 * turn one rather than discovering it in a transition's check list halfway through a run.
 */
async function validationAvailable() {
  return Boolean(await schemaRegistry());
}

let schemaRegistryPromise;

function schemaRegistry() {
  schemaRegistryPromise ??= buildSchemaRegistry();
  return schemaRegistryPromise;
}

async function buildSchemaRegistry() {
  const schemaDir = join(CAPSULE, "schemas");
  let Ajv2020;
  let addFormats;
  try {
    ({ default: Ajv2020 } = await import("ajv/dist/2020.js"));
    ({ default: addFormats } = await import("ajv-formats"));
  } catch {
    return null;
  }
  const ajv = new Ajv2020({ strict: false, allErrors: true, allowUnionTypes: true });
  addFormats(ajv);
  for (const file of readdirSync(schemaDir).filter((f) => f.endsWith(".json"))) {
    try {
      ajv.addSchema(JSON.parse(readFileSync(join(schemaDir, file), "utf8")), file);
    } catch {
      /* JSON-LD contexts and duplicate aliases are not executable schemas. */
    }
  }
  return ajv;
}

/**
 * Schema validation, run here rather than taken on trust. If ajv is missing the check is
 * reported as unavailable — never silently as a pass. "Downgrade, don't pretend" applies
 * to the gate itself, not only to the evidence it weighs.
 */
async function validateArtifact(doc, schemaName) {
  const ajv = await schemaRegistry();
  if (!ajv) {
    return { status: "unavailable", detail: "ajv is not installed in this sandbox" };
  }

  const file = `${schemaName.replace(/^outcome\./, "").replace(/\.v1$/, "")}.schema.json`;
  const candidates = [
    file,
    file.replace("evidence-graph", "evidence-link"),
    file.replace("toc-extraction", "toc-extraction"),
  ];
  const validate = candidates.map((c) => ajv.getSchema(c)).find(Boolean);
  if (!validate) return { status: "unavailable", detail: `no schema file for ${schemaName}` };

  return validate(doc)
    ? { status: "pass" }
    : { status: "fail", detail: JSON.stringify(validate.errors?.slice(0, 4)) };
}

async function validateControl(doc, schemaFile) {
  const ajv = await schemaRegistry();
  if (!ajv) return { status: "unavailable", detail: "ajv is not installed in this sandbox" };
  const validate = ajv.getSchema(schemaFile);
  if (!validate) return { status: "unavailable", detail: `no schema '${schemaFile}'` };
  return validate(doc)
    ? { status: "pass" }
    : { status: "fail", detail: JSON.stringify(validate.errors?.slice(0, 6)) };
}

/** The deterministic DAG checks, over the same in-memory document every other gate uses. */
function checkGraph(graph) {
  try {
    const result = checkGraphInMemory(graph);
    const blocking = result.findings.filter((finding) => finding.severity === "blocking");
    return {
      status: blocking.length ? "fail" : "pass",
      detail: `${result.findings.length} finding(s), ${blocking.length} blocking${
        blocking.length ? `: ${blocking.map((finding) => finding.check_id).join(",")}` : ""
      }`,
    };
  } catch (error) {
    return { status: "fail", detail: error.message };
  }
}

function loadArtifactByRef(workflowId, ref) {
  if (!ref) return null;
  const path = artifactPath(workflowId, ref);
  return existsSync(path) ? readJson(path) : null;
}

function loadArtifactVersion(workflowId, ref) {
  if (!ref) return null;
  for (const area of ["artifacts", "work"]) {
    const path = artifactPath(workflowId, ref, area);
    if (existsSync(path)) return { area, path, doc: readJson(path) };
  }
  return null;
}

function supersessionLineageCheck({ workflowId, candidate, event, envelope = null }) {
  const kind = candidate ? classify(candidate) : null;
  const successorRef = kind ? candidate[kind.idField] : null;
  const predecessorRef = candidate?.supersedes ?? null;
  if (!predecessorRef) {
    return event
      ? { status: "fail", summary: "--supersession-event is only accepted when the candidate declares supersedes" }
      : { status: "pass", summary: "candidate declares no predecessor; no supersession event is required" };
  }
  if (!event) {
    return {
      status: "fail",
      summary: `candidate '${successorRef}' supersedes '${predecessorRef}' but has no --supersession-event`,
    };
  }
  const predecessor = loadArtifactVersion(workflowId, predecessorRef);
  if (!predecessor) {
    return { status: "fail", summary: `supersession predecessor '${predecessorRef}' is not a frozen draft or committed artifact` };
  }
  const predecessorKind = classify(predecessor.doc);
  const expected = {
    workflow_id: workflowId,
    artifact_kind: kind?.schema,
    predecessor_ref: predecessorRef,
    predecessor_digest: digestJson(predecessor.doc),
    successor_ref: successorRef,
    successor_digest: digestJson(candidate),
  };
  for (const [field, value] of Object.entries(expected)) {
    if (event[field] !== value) {
      return { status: "fail", summary: `supersession event '${field}' is not bound to the frozen predecessor and successor` };
    }
  }
  if (!predecessorKind || predecessorKind.schema !== kind.schema ||
      predecessor.doc[predecessorKind.idField] !== predecessorRef) {
    return { status: "fail", summary: "supersession predecessor and successor are not versions of the same artifact kind" };
  }
  if (predecessor.doc.workflow_id && predecessor.doc.workflow_id !== workflowId) {
    return { status: "fail", summary: "supersession predecessor belongs to a different workflow" };
  }
  if (event.event_id !== supersessionEventId(event)) {
    return { status: "fail", summary: "supersession event ID is not the content address of its lineage payload" };
  }
  if (predecessor.area === "artifacts" && event.predecessor_disposition !== "superseded") {
    return { status: "fail", summary: "a committed predecessor must have predecessor_disposition 'superseded'" };
  }
  if (event.rerun_evidence_refs.length !== 1 ||
      !event.rerun_evidence_refs[0].startsWith("urn:ixo:verification-envelope:")) {
    return {
      status: "fail",
      summary: "supersession rerun_evidence_refs must name exactly one v2 verification envelope",
    };
  }
  if (envelope) {
    if (event.rerun_evidence_refs[0] !== envelope.envelope_id) {
      return {
        status: "fail",
        summary: "supersession rerun_evidence_refs must resolve to the verification envelope for this transition",
      };
    }
    const checks = new Map((envelope.checks ?? []).map((check) => [check.criterion_id, check]));
    const unresolved = event.failed_check_ids.filter((criterionId) => {
      const check = checks.get(criterionId);
      return !check || check.status !== "pass" || check.output_digest !== digestJson(candidate);
    });
    if (unresolved.length) {
      return {
        status: "fail",
        summary: `supersession rerun evidence does not prove repaired criteria: ${unresolved.join(", ")}`,
      };
    }
  }
  return {
    status: "pass",
    summary: `repair lineage binds '${predecessorRef}' to '${successorRef}' with ${event.failed_check_ids.length} failed check(s)`,
  };
}

function sourceProvenanceCheck(toc, workflowId) {
  if (toc?.workflow_id !== workflowId) {
    return { status: "fail", summary: `ToC extraction belongs to '${toc?.workflow_id ?? "unknown"}', not '${workflowId}'` };
  }
  const sources = new Set((toc?.source_artifacts ?? []).map((source) => source.artifact_id));
  const invalid = [];
  for (const proposition of toc?.propositions ?? []) {
    if (proposition.provenance?.extraction_method === "ai_inferred") continue;
    const spans = proposition.provenance?.source_spans ?? [];
    if (!spans.length || spans.some((span) => !sources.has(span.artifact_id))) invalid.push(proposition.proposition_id);
  }
  return invalid.length
    ? { status: "fail", summary: `propositions with missing or unknown source spans: ${invalid.join(", ")}` }
    : { status: "pass", summary: "every extracted proposition resolves to a declared source artifact" };
}

function semanticReviewCheck(toc, review, workflowId) {
  if (!review) return { status: "fail", summary: "outcome.toc-semantic-review.v1 is missing" };
  if (review.workflow_id !== workflowId) {
    return { status: "fail", summary: `semantic review belongs to '${review.workflow_id}', not '${workflowId}'` };
  }
  if (review.extraction_ref !== toc?.extraction_id) {
    return { status: "fail", summary: "semantic review is bound to a different extraction" };
  }
  const expected = new Set((toc?.propositions ?? []).map((p) => p.proposition_id));
  const actual = new Set((review.classifications ?? []).map((c) => c.proposition_id));
  const missing = [...expected].filter((id) => !actual.has(id));
  const extra = [...actual].filter((id) => !expected.has(id));
  const duplicates = (review.classifications ?? []).length !== actual.size;
  const blocked = (review.classifications ?? []).filter((c) => c.status !== "accepted").map((c) => c.proposition_id);
  const missingEvidence = (review.classifications ?? []).filter((c) => !(c.evidence_refs ?? []).length).map((c) => c.proposition_id);
  const kindById = new Map((toc?.propositions ?? []).map((p) => [p.proposition_id, p.kind]));
  const mismatched = (review.classifications ?? [])
    .filter((c) => kindById.has(c.proposition_id) && kindById.get(c.proposition_id) !== c.selected_kind)
    .map((c) => c.proposition_id);
  if (missing.length || extra.length || duplicates || blocked.length || missingEvidence.length || mismatched.length || review.recommendation !== "pass") {
    return {
      status: "fail",
      summary: `semantic review unresolved; missing=${missing.join("|") || "none"}, extra=${extra.join("|") || "none"}, duplicates=${duplicates ? "yes" : "no"}, blocked=${blocked.join("|") || "none"}, missing_evidence=${missingEvidence.join("|") || "none"}, kind_mismatch=${mismatched.join("|") || "none"}`,
    };
  }
  const counts = (review.classifications ?? []).reduce(
    (out, c) => ({ ...out, [c.status]: (out[c.status] ?? 0) + 1 }),
    { accepted: 0, revise: 0, review_required: 0 },
  );
  if (["accepted", "revise", "review_required"].some((key) => counts[key] !== review.summary?.[key])) {
    return { status: "fail", summary: "semantic review summary does not match its classifications" };
  }
  return { status: "pass", summary: `all ${expected.size} proposition roles have accepted rationale and confidence` };
}

function propositionCoverageCheck(toc, graph) {
  const claimableKinds = new Set(["intervention", "activity", "output", "outcome", "impact", "mechanism", "contextual_factor"]);
  const required = (toc?.propositions ?? []).filter((p) => claimableKinds.has(p.kind)).map((p) => p.proposition_id);
  const covered = new Set((graph?.nodes ?? []).flatMap((node) => node.proposition_refs ?? []));
  const missing = required.filter((id) => !covered.has(id));
  return missing.length
    ? { status: "fail", summary: `claimable ToC propositions without graph nodes: ${missing.join(", ")}` }
    : { status: "pass", summary: `all ${required.length} claimable ToC propositions map to graph nodes` };
}

function claimableReachabilityCheck(graph) {
  const starts = new Set((graph?.nodes ?? []).filter((n) => ["intervention", "activity"].includes(n.node_type)).map((n) => n.node_id));
  const claimable = (graph?.nodes ?? []).filter((n) => ["output", "mediator", "outcome", "impact"].includes(n.node_type));
  const outgoing = new Map();
  for (const edge of graph?.edges ?? []) {
    if (!outgoing.has(edge.source_node_id)) outgoing.set(edge.source_node_id, []);
    outgoing.get(edge.source_node_id).push(edge.target_node_id);
  }
  const seen = new Set(starts);
  const queue = [...starts];
  while (queue.length) {
    for (const next of outgoing.get(queue.shift()) ?? []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  const missing = claimable.filter((node) => !seen.has(node.node_id)).map((node) => node.node_id);
  return missing.length
    ? { status: "fail", summary: `claimable nodes unreachable from an intervention or activity: ${missing.join(", ")}` }
    : { status: "pass", summary: `all ${claimable.length} claimable nodes are reachable from an intervention or activity` };
}

function edgeStatusPolicyCheck(graph) {
  const invalid = (graph?.edges ?? []).filter(
    (edge) => edge.validation_status === "supported",
  ).map((edge) => edge.edge_id);
  return invalid.length
    ? { status: "fail", summary: `draft graph edges may not self-promote to supported: ${invalid.join(", ")}` }
    : { status: "pass", summary: "draft graph edges contain no self-authored supported status" };
}

function referenceIntegrityCheck(state, candidate) {
  if (candidate?.schema === "outcome.causal-graph.v1") {
    const toc = state.artifact_refs?.toc_extraction;
    if (!toc || candidate.toc_extraction_ref !== toc) {
      return { status: "fail", summary: "causal graph does not reference the committed ToC extraction" };
    }
    const extraction = loadArtifactByRef(state.workflow_id, toc);
    const propositionIds = new Set((extraction?.propositions ?? []).map((item) => item.proposition_id));
    const invalidNodes = (candidate.nodes ?? []).filter((node) =>
      !(node.proposition_refs ?? []).length || node.proposition_refs.some((ref) => !propositionIds.has(ref)),
    ).map((node) => node.node_id);
    if (invalidNodes.length) {
      return { status: "fail", summary: `causal graph nodes have missing or unknown proposition refs: ${invalidNodes.join(", ")}` };
    }
  }
  if (candidate?.schema === "outcome.evidence-graph.v1") {
    const graph = state.artifact_refs?.causal_graph;
    if (!graph || candidate.graph_version_ref !== graph) {
      return { status: "fail", summary: "evidence graph does not reference the committed causal graph" };
    }
    if (candidate.workflow_id !== state.workflow_id) {
      return { status: "fail", summary: "evidence graph belongs to a different workflow" };
    }
    const causal = loadArtifactByRef(state.workflow_id, graph);
    const targets = {
      graph: new Set([graph]),
      node: new Set((causal?.nodes ?? []).map((item) => item.node_id)),
      edge: new Set((causal?.edges ?? []).map((item) => item.edge_id)),
    };
    const artifactIds = new Set((candidate.artifacts ?? []).map((item) => item.artifact_id));
    const invalidLinks = (candidate.links ?? []).filter((link) =>
      !artifactIds.has(link.artifact_id) || !targets[link.target_kind]?.has(link.target_id),
    ).map((link) => link.link_id);
    const invalidGaps = (candidate.gaps ?? []).filter((gap) =>
      !targets[gap.target_kind]?.has(gap.target_id),
    ).map((gap) => gap.gap_id);
    if (invalidLinks.length || invalidGaps.length) {
      return {
        status: "fail",
        summary: `evidence references do not resolve; links=${invalidLinks.join("|") || "none"}, gaps=${invalidGaps.join("|") || "none"}`,
      };
    }
  }
  if (candidate?.schema === "outcome.validation-report.v1") {
    if (candidate.workflow_id !== state.workflow_id) {
      return { status: "fail", summary: "validation report belongs to a different workflow" };
    }
    if (candidate.graph_version_ref !== state.artifact_refs?.causal_graph) {
      return { status: "fail", summary: "validation report does not reference the committed causal graph" };
    }
    if (candidate.evidence_graph_ref && candidate.evidence_graph_ref !== state.artifact_refs?.evidence_graph) {
      return { status: "fail", summary: "validation report does not reference the committed evidence graph" };
    }
    const graph = loadArtifactByRef(state.workflow_id, state.artifact_refs?.causal_graph);
    const targetIds = {
      graph: new Set([state.artifact_refs?.causal_graph]),
      node: new Set((graph?.nodes ?? []).map((item) => item.node_id)),
      edge: new Set((graph?.edges ?? []).map((item) => item.edge_id)),
    };
    const invalidFindings = (candidate.findings ?? []).filter((finding) =>
      targetIds[finding.target_kind] && !targetIds[finding.target_kind].has(finding.target_id),
    ).map((finding) => finding.finding_id);
    const invalidChanges = (candidate.edge_status_changes ?? []).filter((change) =>
      !targetIds.edge.has(change.edge_id),
    ).map((change) => change.edge_id);
    if (invalidFindings.length || invalidChanges.length) {
      return {
        status: "fail",
        summary: `validation references do not resolve; findings=${invalidFindings.join("|") || "none"}, edge_changes=${invalidChanges.join("|") || "none"}`,
      };
    }
  }
  if (candidate?.schema === "outcome.issuance-request.v1") {
    if (candidate.workflow_id !== state.workflow_id ||
        candidate.graph_version_ref !== state.artifact_refs?.causal_graph ||
        candidate.evidence_graph_ref !== state.artifact_refs?.evidence_graph ||
        candidate.validation_report_ref !== state.artifact_refs?.validation_report) {
      return {
        status: "fail",
        summary: "issuance request does not resolve to the committed workflow, graph, evidence graph, and report",
      };
    }
  }
  if (Array.isArray(candidate?.type) && candidate.type.includes("OutcomeCertificate")) {
    if (candidate.credentialSubject?.graphVersionRef !== state.artifact_refs?.causal_graph ||
        candidate.credentialSubject?.evidenceBundle?.evidenceGraphRef !== state.artifact_refs?.evidence_graph) {
      return { status: "fail", summary: "certificate does not resolve to the committed graph and evidence graph" };
    }
  }
  return { status: "pass", summary: "candidate provenance references resolve to committed inputs" };
}

function validationCompletenessCheck(report, targetState) {
  if (!report) return { status: "fail", summary: "validation report is missing" };
  const findings = report.findings ?? [];
  const actual = {
    passes: findings.filter((f) => f.status === "pass").length,
    failures: findings.filter((f) => f.status === "fail").length,
    warnings: findings.filter((f) => f.status === "warning").length,
    blocking_count: findings.filter((f) => f.severity === "blocking" && f.status === "fail").length,
  };
  if (JSON.stringify(actual) !== JSON.stringify(report.pass_summary)) {
    return { status: "fail", summary: `pass_summary mismatch; recomputed ${JSON.stringify(actual)}` };
  }
  const missing = VALIDATION_REQUIRED_CHECKS.filter((id) => !findings.some((finding) => finding.check_id === id));
  if (missing.length) return { status: "fail", summary: `validation report omits required checks: ${missing.join(", ")}` };
  if (targetState === "VALIDATED") {
    const blocking = findings.filter((finding) => finding.status === "fail" && finding.severity === "blocking");
    if (blocking.length) {
      return { status: "fail", summary: `validation report still has blocking findings: ${blocking.map((item) => item.finding_id).join(", ")}` };
    }
    if (report.graph_status_recommendation !== "validated") {
      return { status: "fail", summary: `validation report recommends '${report.graph_status_recommendation}', not validated` };
    }
  }
  return { status: "pass", summary: `report totals and required coverage reconcile across ${findings.length} findings` };
}

function recomputeAttainableTier(state, report) {
  const graph = loadArtifactByRef(state.workflow_id, state.artifact_refs?.causal_graph);
  const evidence = loadArtifactByRef(state.workflow_id, state.artifact_refs?.evidence_graph);
  if (!graph || !report) return 0;
  if ((report.findings ?? []).some((finding) => finding.status === "fail" && finding.severity === "blocking")) return 0;
  if (report.graph_status_recommendation === "rejected") return 0;
  let cap = 3;
  const overlay = new Map((report.edge_status_changes ?? []).map((change) => [change.edge_id, change.to]));
  const criticalStatuses = (graph.edges ?? [])
    .filter((edge) => edge.issuance_critical)
    .map((edge) => overlay.get(edge.edge_id) ?? edge.validation_status);
  if (criticalStatuses.some((status) => status !== "supported")) cap = Math.min(cap, 2);
  for (const gap of evidence?.gaps ?? []) {
    if (gap.status === "open" && Number.isInteger(gap.tier_without)) cap = Math.min(cap, gap.tier_without);
  }
  if ((report.findings ?? []).some((finding) => finding.status === "fail")) cap = Math.min(cap, 2);
  return cap;
}

function attainableTierCheck(state, candidate) {
  const report = candidate?.schema === "outcome.validation-report.v1"
    ? candidate
    : loadArtifactByRef(state.workflow_id, state.artifact_refs?.validation_report);
  const recomputed = recomputeAttainableTier(state, report);
  if (!report?.attainable_tier || report.attainable_tier.tier > state.target_tier || report.attainable_tier.tier > recomputed) {
    return { status: "fail", summary: `attainable tier is missing or exceeds the target or host-recomputed cap ${recomputed}` };
  }
  if (candidate?.schema === "outcome.issuance-request.v1" && candidate.computed_tier !== report.attainable_tier.tier) {
    return { status: "fail", summary: "issuance request computed_tier does not match the committed validation report" };
  }
  if (Array.isArray(candidate?.type) && candidate.type.includes("OutcomeCertificate") &&
      candidate.credentialSubject?.assessmentTier > report.attainable_tier.tier) {
    return { status: "fail", summary: "certificate assessment tier exceeds the attainable tier" };
  }
  return { status: "pass", summary: `attainable tier ${report.attainable_tier.tier} respects target ${state.target_tier} and host-recomputed cap ${recomputed}` };
}

function issuancePolicyCheck(request) {
  if (request?.schema !== "outcome.issuance-request.v1") {
    return { status: "fail", summary: "issuance eligibility requires an issuance request" };
  }
  if (!["issue", "issue_at_lower_tier"].includes(request.decision)) {
    return { status: "fail", summary: `issuance request decision '${request.decision}' is not issuable` };
  }
  if (request.policy_evaluation?.thresholds_met !== true) {
    return { status: "fail", summary: "issuance policy thresholds are not met" };
  }
  const blocked = (request.policy_evaluation?.checks ?? []).filter(
    (check) => !["pass", "warning"].includes(check.status) || (check.status === "warning" && !check.evidence_ref),
  );
  if (blocked.length) {
    return { status: "fail", summary: `issuance policy has unresolved checks: ${blocked.map((item) => item.requirement).join(" | ")}` };
  }
  if (request.decision === "issue" && request.computed_tier < request.target_tier) {
    return { status: "fail", summary: "decision must be issue_at_lower_tier when computed tier is below target" };
  }
  if (request.decision === "issue_at_lower_tier" && request.computed_tier >= request.target_tier) {
    return { status: "fail", summary: "issue_at_lower_tier is inconsistent with the computed and target tiers" };
  }
  return { status: "pass", summary: `issuance decision '${request.decision}' has met thresholds and no unresolved policy checks` };
}

function certificateProofCheck(certificate) {
  const proof = certificate?.proof;
  if (!proof || typeof proof.type !== "string" || typeof proof.verificationMethod !== "string" ||
      typeof proof.proofValue !== "string" || !proof.proofValue.trim()) {
    return { status: "fail", summary: "certificate has no complete external issuer proof" };
  }
  const invalidReceipts = (certificate.evidence ?? []).filter(
    (receipt) => !receipt.receiptCid || receipt.verdictClass !== "supported",
  );
  if (invalidReceipts.length || !(certificate.evidence ?? []).length) {
    return { status: "fail", summary: "certificate evidence lacks supported external receipts" };
  }
  return { status: "pass", summary: "certificate carries an issuer proof and supported receipt references attested by the host authorization" };
}

function draftDocs(workflowId) {
  const dir = join(runDir(workflowId), "work");
  const out = {};
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
    try {
      const doc = JSON.parse(readFileSync(join(dir, file), "utf8"));
      const kind = classify(doc);
      if (kind) {
        const id = doc[kind.idField];
        const committed = id ? artifactPath(workflowId, id) : null;
        if (committed && existsSync(committed) && sha256(readFileSync(committed)) === sha256(jsonBytes(doc))) continue;
        out[kind.schema] = doc;
      }
    } catch {
      /* malformed drafts remain files, but do not become display totals */
    }
  }
  return out;
}

async function buildSnapshot(workflowId, state, { manifestRevision, transitionCommitRef, generatedAt }) {
  const { composeSnapshot, computeTotals } = await import("./lib/snapshot.mjs");
  const byId = new Map();
  for (const ref of Object.values(state.artifact_refs ?? {}).filter(Boolean)) {
    const doc = loadArtifactByRef(workflowId, ref);
    if (!doc) die(`snapshot cannot resolve committed artifact '${ref}'`);
    if (typeof doc.id === "string" && Array.isArray(doc.type)) byId.set(doc.id, doc);
    const idField = ID_FIELDS[doc.schema];
    if (idField && typeof doc[idField] === "string") byId.set(doc[idField], doc);
  }
  const briefPath = join(runDir(workflowId), "run-brief.json");
  const brief = existsSync(briefPath) ? readJson(briefPath) : null;
  const reviewPackets = {};
  for (const ref of state.open_review_packets ?? []) {
    const path = reviewPacketPath(workflowId, ref);
    if (existsSync(path)) reviewPackets[ref] = readFileSync(path, "utf8");
  }
  const drafts = draftDocs(workflowId);
  const uncommitted = computeTotals({
    state: { source_hashes: [] },
    toc: drafts["outcome.toc-extraction.v1"] ?? null,
    graph: drafts["outcome.causal-graph.v1"] ?? null,
    evidence: drafts["outcome.evidence-graph.v1"] ?? null,
    report: drafts["outcome.validation-report.v1"] ?? null,
  });
  const hasDrafts = Object.values(uncommitted).some((count) => count > 0);
  const snapshot = composeSnapshot(state, (ref) => byId.get(ref) ?? null, {
    brief,
    reviewPackets,
    generatedAt,
  });
  snapshot.control = {
    manifest_revision: manifestRevision,
    transition_commit_ref: transitionCommitRef,
    includes_uncommitted_work: hasDrafts,
    committed: snapshot.totals,
    uncommitted,
    reconciliation: {
      status: "reconciled",
      checked_refs: Object.values(state.artifact_refs ?? {}).filter(Boolean),
      mismatches: [],
    },
  };
  return snapshot;
}

function transitionCommitId({ workflowId, revision, from, to, taskRef, resultRef, envelopeRef, stateDigest }) {
  const digest = sha256(JSON.stringify({ workflowId, revision, from, to, taskRef, resultRef, envelopeRef, stateDigest }));
  return `urn:ixo:transition-commit:${digest}`;
}

function dimensionVerdicts(gateResults) {
  return Object.fromEntries(DIMENSIONS.map((dimension) => [
    dimension,
    gateResults.some((result) => result.dimension === dimension) ? "pass" : "not_applicable",
  ]));
}

function gateResult(criterionId, { status = "pass", evidenceRef, inputDigest, outputDigest, summary }) {
  const [dimension, method, executorRef, version] = CRITERIA[criterionId];
  return {
    criterion_id: criterionId,
    dimension,
    method,
    status,
    evidence_ref: evidenceRef ?? `internal:${criterionId}`,
    validator_ref: `${executorRef}@${version}`,
    input_digest: inputDigest ?? null,
    output_digest: outputDigest ?? null,
    summary,
  };
}

function saveImmutable(path, value) {
  const body = jsonBytes(value);
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, body, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") die(`cannot write immutable record '${path}': ${error.message}`);
    if (readFileSync(path, "utf8") !== body) {
      die(`immutable record '${path}' already exists with different content`);
    }
  }
  return { path, digest: sha256(body) };
}

function saveImmutableText(path, body) {
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, body, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") die(`cannot write immutable record '${path}': ${error.message}`);
    if (readFileSync(path, "utf8") !== body) {
      die(`immutable record '${path}' already exists with different content`);
    }
  }
  return { path, digest: sha256(body) };
}

function mergeRegistrations(previous, current) {
  const merged = new Map();
  for (const registration of [...(previous ?? []), ...(current ?? [])]) {
    merged.set(`${registration.artifact_kind}:${registration.artifact_ref}`, registration);
  }
  return [...merged.values()];
}

async function bootstrapRunControl(workflowId, state, brief = null) {
  const now = state.created_at;
  const revision = 1;
  const stateDigest = digestJson(state);
  const result = gateResult("legal_state_transition", {
    evidenceRef: "internal:init",
    inputDigest: stateDigest,
    outputDigest: stateDigest,
    summary: "init is the only authority allowed to create SOURCE_ACCEPTED",
  });
  const commitId = transitionCommitId({
    workflowId,
    revision,
    from: "SOURCE_ACCEPTED",
    to: "SOURCE_ACCEPTED",
    taskRef: "system:init",
    resultRef: "system:init",
    envelopeRef: "system:init",
    stateDigest,
  });
  const snapshot = await buildSnapshot(workflowId, state, {
    manifestRevision: revision,
    transitionCommitRef: commitId,
    generatedAt: now,
  });
  const snapshotDigest = snapshotProjectionDigest(snapshot);
  saveImmutable(artifactPath(workflowId, result.evidence_ref, "tasks"), result);
  const registrations = [{
    artifact_ref: "state.json",
    artifact_kind: "state_projection",
    digest: stateDigest,
    status: "verified",
    source_task_id: "system:init",
  }, {
    artifact_ref: result.evidence_ref,
    artifact_kind: "gate_result",
    digest: digestJson(result),
    status: "verified",
    source_task_id: "system:init",
  }];
  if (brief) {
    saveImmutable(artifactPath(workflowId, brief.brief_id), brief);
    registrations.push({
      artifact_ref: brief.brief_id,
      artifact_kind: brief.schema,
      digest: digestJson(brief),
      status: "accepted",
      source_task_id: "system:init",
    });
  }
  const commit = {
    schema: "outcome.transition-commit.v1",
    commit_id: commitId,
    workflow_id: workflowId,
    expected_manifest_revision: 0,
    manifest_revision: revision,
    previous_transition_commit_ref: null,
    state_before: "SOURCE_ACCEPTED",
    state_after: "SOURCE_ACCEPTED",
    gate_plan_ref: "system:init",
    task_ref: "system:init",
    result_ref: "system:init",
    verification_envelope_ref: "system:init",
    gate_results: [result],
    dimension_verdicts: dimensionVerdicts([result]),
    artifact_registrations: registrations,
    finding_refs: [],
    supersession_event_refs: [],
    state_projection_digest: stateDigest,
    snapshot_projection_digest: snapshotDigest,
    committed_at: now,
  };
  const validated = await validateControl(commit, "workflow-control.schema.json");
  if (validated.status !== "pass") die(`cannot initialise workflow control: ${validated.detail}`);
  const commitRecord = saveImmutable(artifactPath(workflowId, commitId, "commits"), commit);
  const projections = projectionPaths(workflowId, commitId);
  saveImmutable(projections.state, state);
  saveImmutable(projections.snapshot, snapshot);
  writeJson(join(runDir(workflowId), "state.json"), state);
  writeJson(join(runDir(workflowId), "snapshot.json"), snapshot);
  writeManifestAtomic(workflowId, {
    schema: "outcome.manifest-pointer.v1",
    workflow_id: workflowId,
    manifest_revision: revision,
    transition_commit_ref: commitId,
    transition_commit_digest: commitRecord.digest,
  });
}

// ---- commands --------------------------------------------------------------

async function cmdInit(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const dir = runDir(workflowId);
  if (existsSync(join(dir, "state.json"))) die(`run '${workflowId}' already exists`);

  const brief = a.brief ? readJson(resolve(a.brief)) : null;
  if (brief && (brief.schema !== "outcome.run-brief.v1" || brief.workflow_id !== workflowId || !brief.brief_id)) {
    die("--brief must be an outcome.run-brief.v1 bound to this workflow");
  }
  const targetTier = a["target-tier"] === undefined ? (brief?.target_tier ?? 3) : Number(a["target-tier"]);
  if (!Number.isInteger(targetTier) || targetTier < 0 || targetTier > 4 ||
      (brief?.target_tier !== undefined && brief.target_tier !== targetTier)) {
    die("--target-tier must be an integer from 0 to 4 and match the run brief when supplied");
  }
  const controllerDid = process.env._SKILL_CONTEXT_USER_DID;
  if (controllerDid && !/^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/.test(controllerDid)) {
    die("_SKILL_CONTEXT_USER_DID is not a valid DID");
  }
  const reviewKeyBase64 = process.env.OUTCOME_GRAPH_REVIEW_PUBLIC_KEY;
  let reviewVerificationKey = null;
  if (reviewKeyBase64) {
    try {
      const keyBytes = Buffer.from(reviewKeyBase64, "base64");
      const publicKey = createPublicKey({ key: keyBytes, format: "der", type: "spki" });
      if (publicKey.asymmetricKeyType !== "ed25519") throw new Error("key is not Ed25519");
      reviewVerificationKey = {
        algorithm: "Ed25519",
        public_key_spki_base64: reviewKeyBase64,
        fingerprint: sha256(keyBytes),
      };
    } catch (error) {
      die(`OUTCOME_GRAPH_REVIEW_PUBLIC_KEY is invalid: ${error.message}`);
    }
  }
  const now = new Date().toISOString();
  const state = {
    contract: "outcome.workflow-state.v1",
    workflow_id: workflowId,
    created_at: now,
    current_state: "SOURCE_ACCEPTED",
    target_tier: targetTier,
    source_hashes: [...new Set((brief?.sources ?? []).map((source) => source.sha256).filter(Boolean))],
    issuer_context: {
      outcome_domain: a.domain ?? "unspecified",
      // The oracle injects the caller's DID; a run knows who it belongs to without asking.
      ...(controllerDid ? {
        issuer: { did: controllerDid, name: "Portal controller", role: "run_controller" },
      } : {}),
      ...(reviewVerificationKey ? { review_verification_key: reviewVerificationKey } : {}),
    },
    artifact_refs: {
      toc_extraction: null,
      toc_semantic_review: null,
      causal_graph: null,
      evidence_graph: null,
      validation_report: null,
      issuance_request: null,
      certificate: null,
    },
    transitions: [
      {
        from: "SOURCE_ACCEPTED",
        to: "SOURCE_ACCEPTED",
        at: now,
        task_id: null,
        envelope_ref: null,
        approved_by: "orchestrator",
      },
    ],
    open_review_packets: [],
    retries: {},
  };

  mkdirSync(join(dir, "artifacts"), { recursive: true });
  mkdirSync(join(dir, "commits"), { recursive: true });
  mkdirSync(join(dir, "revisions"), { recursive: true });
  mkdirSync(join(dir, "tasks"), { recursive: true });
  mkdirSync(join(dir, "work"), { recursive: true });
  mkdirSync(join(dir, "review-packets"), { recursive: true });
  const releaseLock = acquireManifestLock(workflowId);
  try {
    if (existsSync(join(dir, "state.json")) || existsSync(join(dir, "manifest.json"))) {
      die(`run '${workflowId}' already exists`);
    }

    for (const [document, schema, label] of [
      [state, "contracts.schema.json", "initial workflow state"],
      ...(brief ? [[brief, "run-brief.schema.json", "run brief"]] : []),
    ]) {
      const checked = await validateControl(document, schema);
      if (checked.status === "fail") die(`${label} is invalid: ${checked.detail}`);
    }

    if (brief) writeJson(join(dir, "run-brief.json"), brief);
    await bootstrapRunControl(workflowId, state, brief);
  } finally {
    releaseLock();
  }

  const schemaValidation = await validationAvailable();
  return emit({
    ok: true,
    workflow_id: workflowId,
    current_state: state.current_state,
    run_dir: dir,
    schema_validation: schemaValidation ? "available" : "unavailable",
    ...(schemaValidation
      ? {}
      : {
          warning:
            "Schema validation is unavailable: run `npm install` in the capsule directory. " +
            "Until then every governed transition is blocked.",
        }),
  });
}

function cmdState(argv) {
  const workflowId = args(argv).workflow ?? die("--workflow is required");
  const releaseLock = acquireManifestLock(workflowId);
  try {
    const { manifest, commit } = reconcileRunIntegrity(workflowId);
    const { state } = loadState(workflowId);
    return emit({
      ok: true,
      workflow_id: state.workflow_id,
      current_state: state.current_state,
      target_tier: state.target_tier,
      artifact_refs: state.artifact_refs,
      open_review_packets: state.open_review_packets,
      transitions: state.transitions.length,
      last_transition: state.transitions.at(-1) ?? null,
      manifest_revision: manifest.manifest_revision,
      transition_commit_ref: commit.commit_id,
    });
  } finally {
    releaseLock();
  }
}

/** Freeze a candidate under work/. It becomes committed only through advance. */
function cmdRecord(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const source = a.artifact ?? die("--artifact is required");
  reconcileRunIntegrity(workflowId);

  const doc = readJson(resolve(source));
  const kind =
    classify(doc) ??
    die(
      doc?.schema
        ? `unknown artifact schema '${doc.schema}'`
        : "artifact declares no `schema`, and is not an OutcomeCertificate",
    );
  const { schema, idField } = kind;
  const id = doc[idField] ?? die(`artifact is missing '${idField}'`);

  // The filename is derived from the id, so recording the same artifact twice is idempotent
  // rather than a second copy that later reads as a second version.
  const committed = artifactPath(workflowId, id);
  const target = artifactPath(workflowId, id, "work");

  // An id is a promise about bytes. Transitions and verification envelopes already recorded
  // point at this id, so letting a second, different document take the same name would
  // silently rewrite what those references resolve to — the audit trail would still look
  // intact while no longer describing what was actually checked. Identical bytes are simply
  // the same record arriving twice; different bytes are a new artifact and need a new id.
  const body = `${JSON.stringify(doc, null, 2)}\n`;
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(committed)) {
    if (readFileSync(committed, "utf8") !== body) {
      die(`artifact '${id}' already exists with different committed content`);
    }
    return emit({
      ok: true,
      schema,
      artifact_id: id,
      path: committed,
      sha256: sha256(readFileSync(committed)),
      status: "committed",
    });
  }
  try {
    writeFileSync(target, body, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") die(`cannot record artifact '${id}': ${error.message}`);
    if (readFileSync(target, "utf8") !== body) {
      die(
        `artifact '${id}' already exists with different content — ` +
          "an id is content-addressed and immutable; give the revision its own id",
      );
    }
  }
  return emit({
    ok: true,
    schema,
    artifact_id: id,
    path: target,
    sha256: sha256(readFileSync(target)),
    status: "uncommitted_draft",
  });
}

/** Freeze a review packet under a path derived only from its full reference. */
function cmdRecordPacket(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const packetRef = a.packet ?? die("--packet is required");
  const source = a.file ?? die("--file is required");
  if (!/^urn:ixo:review-packet:[^\s]+$/.test(packetRef)) {
    die("--packet must be a non-empty urn:ixo:review-packet reference");
  }
  reconcileRunIntegrity(workflowId);
  const body = readFileSync(resolve(source), "utf8");
  if (!body.trim()) die("review packet must not be empty");
  const recorded = saveImmutableText(reviewPacketPath(workflowId, packetRef), body);
  return emit({
    ok: true,
    workflow_id: workflowId,
    packet_ref: packetRef,
    path: recorded.path,
    sha256: recorded.digest,
    status: "uncommitted_review_packet",
  });
}

function inputDigest(refs) {
  return sha256([...refs].sort().join("\n"));
}

function transitionInputRefs({
  workflowId,
  manifestRevision,
  state,
  candidate,
  semantic,
  supersessionEvent,
  packet,
  reviewDecision,
  issuanceAuthorization,
}) {
  const candidateKind = candidate ? classify(candidate) : null;
  const candidateId = candidateKind ? candidate[candidateKind.idField] : null;
  return [...new Set([
    `workflow:${workflowId}@${manifestRevision}`,
    ...Object.values(state.artifact_refs ?? {}).filter(Boolean),
    candidateId,
    candidate?.supersedes,
    semantic?.review_id,
    supersessionEvent?.event_id,
    packet,
    reviewDecision?.decision_id,
    issuanceAuthorization?.authorization_id,
  ].filter(Boolean))];
}

function sameStrings(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function cmdPlan(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const to = a.to ?? die("--to <STATE> is required");
  if (!STATES.includes(to)) die(`unknown state '${to}'`);
  const { manifest } = reconcileRunIntegrity(workflowId);
  const { state } = loadState(workflowId);
  const legal = LEGAL_PREDECESSORS[to] ?? [];
  if (!legal.includes(state.current_state)) {
    die(`cannot plan ${state.current_state} → ${to}: ${to} may only follow ${legal.join(", ")}`);
  }
  const required = STATE_ARTIFACT[to];
  const candidate = a.artifact ? readJson(resolve(a.artifact)) : null;
  if (required && classify(candidate)?.schema !== required.schema) {
    die(`plan for '${to}' requires --artifact with ${required.schema}`);
  }
  const semantic = a["semantic-review"] ? readJson(resolve(a["semantic-review"])) : null;
  if (["TOC_PARSED", "CLAIMS_STRUCTURED"].includes(to) && classify(semantic)?.schema !== "outcome.toc-semantic-review.v1") {
    die(`plan for '${to}' requires --semantic-review with outcome.toc-semantic-review.v1`);
  }
  const supersessionEvent = a["supersession-event"] ? readJson(resolve(a["supersession-event"])) : null;
  if (supersessionEvent) {
    const checked = await validateControl(supersessionEvent, "workflow-control.schema.json");
    if (checked.status !== "pass" || supersessionEvent.schema !== "outcome.supersession-event.v1") {
      die(`plan for '${to}' received an invalid --supersession-event: ${checked.detail ?? "wrong schema"}`);
    }
  }
  const lineage = supersessionLineageCheck({ workflowId, candidate, event: supersessionEvent });
  if (lineage.status !== "pass") die(`plan for '${to}' cannot bind repair lineage: ${lineage.summary}`);
  const reviewDecision = a["review-decision"] ? readJson(resolve(a["review-decision"])) : null;
  if (reviewDecision) {
    const checked = await validateControl(reviewDecision, "review-decision.schema.json");
    if (checked.status !== "pass") die(`plan for '${to}' received an invalid --review-decision: ${checked.detail}`);
    if (to !== "VALIDATED") die("--review-decision is only accepted for the VALIDATED transition");
  }
  const issuanceAuthorization = a["issuance-authorization"] ? readJson(resolve(a["issuance-authorization"])) : null;
  if (issuanceAuthorization) {
    const checked = await validateControl(issuanceAuthorization, "issuance-authorization.schema.json");
    if (checked.status !== "pass") die(`plan for '${to}' received an invalid --issuance-authorization: ${checked.detail}`);
    if (!["ISSUANCE_ELIGIBLE", "CERTIFICATE_ISSUED"].includes(to)) {
      die("--issuance-authorization is only accepted for issuance transitions");
    }
  }
  const candidateId = candidate ? candidate[ID_FIELDS[classify(candidate).schema]] : null;
  const refs = transitionInputRefs({
    workflowId,
    manifestRevision: manifest.manifest_revision,
    state,
    candidate,
    semantic,
    supersessionEvent,
    packet: a.packet,
    reviewDecision,
    issuanceAuthorization,
  });
  const taskId = a.task ??
    `task-${safeName(to.toLowerCase())}-${manifest.manifest_revision + 1}-${sha256(refs.join("\n")).slice(0, 8)}`;
  const criteria = requiredCriteria(state.current_state, to).map((criterionId) => {
    const [dimension, method, executorRef, version] = CRITERIA[criterionId];
    return {
      criterion_id: criterionId,
      dimension,
      required: true,
      executor: { method, executor_ref: executorRef, version, expected_output_schema: "outcome.gate-result.v1" },
      input_refs: refs,
      blocking_statuses: ["fail", "review_required"],
    };
  });
  const planSeed = JSON.stringify({ workflowId, taskId, from: state.current_state, to, criteria });
  const plan = {
    schema: "outcome.gate-plan.v1",
    plan_id: `urn:ixo:gate-plan:${sha256(planSeed)}`,
    workflow_id: workflowId,
    task_id: taskId,
    state_in: state.current_state,
    state_out_candidate: to,
    criteria,
  };
  const task = {
    contract: "outcome.task-contract.v2",
    task_id: taskId,
    workflow_id: workflowId,
    state_in: state.current_state,
    agent: AGENT_FOR_STATE[to] ?? "review-escalation",
    objective: `Produce and verify the candidate transition to ${to}`,
    gate_plan_ref: plan.plan_id,
    input_refs: refs,
    allowed_tools: ["scripts/run.mjs", "scripts/check-graph.mjs", "scripts/validate.mjs"],
    required_output_schema: required?.schema ?? "outcome.workflow-state.v1",
    success_criteria: criteria.map((criterion) => criterion.criterion_id),
    stop_conditions: ["required executor unavailable", "required criterion fails", "manifest revision changes"],
    escalation_target: "review-escalation",
    attempt: 1,
  };
  for (const [doc, schema] of [[plan, "workflow-control.schema.json"], [task, "contracts.v2.schema.json"]]) {
    const checked = await validateControl(doc, schema);
    if (checked.status !== "pass") die(`cannot create control plan: ${checked.detail}`);
  }
  const dir = join(runDir(workflowId), "work", "control", safeName(taskId));
  const planRecord = saveImmutable(join(dir, "gate-plan.json"), plan);
  const taskRecord = saveImmutable(join(dir, "task-contract.json"), task);
  return emit({
    ok: true,
    workflow_id: workflowId,
    state_in: state.current_state,
    state_out_candidate: to,
    expected_manifest_revision: manifest.manifest_revision,
    gate_plan: { path: planRecord.path, ref: plan.plan_id },
    task_contract: { path: taskRecord.path, ref: task.task_id },
    candidate_ref: candidateId,
    output_digest: candidate ? digestJson(candidate) : digestJson(state),
    criterion_inputs: Object.fromEntries(criteria.map((criterion) => [criterion.criterion_id, inputDigest(criterion.input_refs)])),
  });
}

function checkControlLinkage({
  workflowId,
  manifestRevision,
  state,
  to,
  candidate,
  semantic,
  supersessionEvent,
  packet,
  reviewDecision,
  issuanceAuthorization,
  plan,
  task,
  result,
  envelope,
}) {
  const requiredIds = requiredCriteria(state.current_state, to);
  if (plan.workflow_id !== workflowId || plan.task_id !== task.task_id || plan.state_in !== state.current_state || plan.state_out_candidate !== to) {
    die("gate plan does not match the active workflow transition");
  }
  if (task.workflow_id !== workflowId || task.state_in !== state.current_state || task.gate_plan_ref !== plan.plan_id) {
    die("task contract does not match the gate plan or committed state");
  }
  if (result.task_id !== task.task_id || result.gate_plan_ref !== plan.plan_id || result.state_out_candidate !== to) {
    die("result contract does not match the task or candidate state");
  }
  if (envelope.task_id !== task.task_id || envelope.gate_plan_ref !== plan.plan_id) {
    die("verification envelope does not match the task or gate plan");
  }
  if (envelope.verdict !== "approve_transition") die(`envelope verdict is '${envelope.verdict}' — the transition is blocked`);
  const candidateKind = candidate ? classify(candidate) : null;
  const candidateId = candidateKind ? candidate[candidateKind.idField] : null;
  const expectedOutputRef = candidateId ?? `workflow:${workflowId}@${manifestRevision}`;
  if (result.structured_output_ref !== expectedOutputRef) {
    die("result contract structured_output_ref does not identify the frozen candidate");
  }
  const expectedRefs = transitionInputRefs({
    workflowId,
    manifestRevision,
    state,
    candidate,
    semantic,
    supersessionEvent,
    packet,
    reviewDecision,
    issuanceAuthorization,
  });
  if (!sameStrings(task.input_refs, expectedRefs) || !sameStrings(result.provenance_refs, expectedRefs)) {
    die("task and result input refs do not match the host-derived frozen transition inputs");
  }
  if (result.agent !== task.agent || result.recommendation !== "pass") {
    die("result contract agent and recommendation do not authorize this transition");
  }
  const planned = new Map((plan.criteria ?? []).map((criterion) => [criterion.criterion_id, criterion]));
  const claimed = new Set(result.claims_made ?? []);
  const tasked = new Set(task.success_criteria ?? []);
  const checked = new Map((envelope.checks ?? []).map((check) => [check.criterion_id, check]));
  if (planned.size !== (plan.criteria ?? []).length || checked.size !== (envelope.checks ?? []).length ||
      planned.size !== requiredIds.length || checked.size !== requiredIds.length) {
    die("gate plan and verification envelope must not repeat criterion IDs");
  }
  if (!sameStrings(plan.criteria.map((criterion) => criterion.criterion_id), requiredIds) ||
      !sameStrings(task.success_criteria, requiredIds) || !sameStrings(result.claims_made, requiredIds)) {
    die("plan, task, result, and envelope must cover exactly the host-required criterion IDs");
  }
  const expectedAgent = AGENT_FOR_STATE[to] ?? "review-escalation";
  const expectedSchema = STATE_ARTIFACT[to]?.schema ?? "outcome.workflow-state.v1";
  const expectedTools = ["scripts/run.mjs", "scripts/check-graph.mjs", "scripts/validate.mjs"];
  if (task.agent !== expectedAgent || task.required_output_schema !== expectedSchema ||
      !sameStrings(task.allowed_tools, expectedTools)) {
    die("task contract does not match the host's agent, output schema, and tool boundary");
  }
  const expectedPlanId = `urn:ixo:gate-plan:${sha256(JSON.stringify({
    workflowId,
    taskId: task.task_id,
    from: state.current_state,
    to,
    criteria: plan.criteria,
  }))}`;
  if (plan.plan_id !== expectedPlanId) die("gate plan ID is not the content address of the supplied plan");
  for (const criterionId of requiredIds) {
    const criterion = planned.get(criterionId);
    if (!criterion?.required || !tasked.has(criterionId) || !claimed.has(criterionId) || !checked.has(criterionId)) {
      die(`required criterion '${criterionId}' is not covered by plan, task, result, and envelope`);
    }
  }
  for (const criterion of plan.criteria ?? []) {
    if (!criterion.required) continue;
    const known = CRITERIA[criterion.criterion_id];
    if (!known) die(`required executor for '${criterion.criterion_id}' is unavailable in this host`);
    const [dimension, method, executorRef, version] = known;
    if (criterion.dimension !== dimension || criterion.executor?.method !== method ||
        criterion.executor?.executor_ref !== executorRef || criterion.executor?.version !== version) {
      die(`criterion '${criterion.criterion_id}' does not name the host's versioned executor`);
    }
    if (!sameStrings(criterion.input_refs, expectedRefs)) {
      die(`criterion '${criterion.criterion_id}' does not name the host-derived frozen inputs`);
    }
    const check = checked.get(criterion.criterion_id);
    if (check?.status !== "pass") die(`criterion '${criterion.criterion_id}' has status '${check?.status ?? "missing"}'`);
    if (check.dimension !== dimension || check.method !== method || check.validator_ref !== `${executorRef}@${version}`) {
      die(`verification check '${criterion.criterion_id}' does not match its gate-plan executor`);
    }
    if (check.input_digest !== inputDigest(criterion.input_refs)) {
      die(`verification check '${criterion.criterion_id}' is not bound to the frozen gate inputs`);
    }
    if (envelope.dimension_verdicts?.[dimension] !== "pass") {
      die(`verification dimension '${dimension}' is not pass for required criterion '${criterion.criterion_id}'`);
    }
  }
  if (JSON.stringify(envelope.dimension_verdicts) !== JSON.stringify(dimensionVerdicts(envelope.checks))) {
    die("verification dimension verdicts are not derived from the supplied checks");
  }
  return requiredIds;
}

async function executeCriterion(criterionId, context) {
  const {
    workflowId,
    manifestRevision,
    state,
    to,
    candidate,
    semantic,
    supersessionEvent,
    reviewDecision,
    issuanceAuthorization,
    packet,
  } = context;
  switch (criterionId) {
    case "artifact_schema_valid": {
      if (!candidate) return { status: "pass", summary: "transition has no new domain artifact" };
      const checked = await validateArtifact(candidate, classify(candidate).schema);
      return checked.status === "pass"
        ? { status: "pass", summary: `${classify(candidate).schema} validates against the exact candidate bytes` }
        : { status: "fail", summary: checked.detail ?? "schema validator unavailable" };
    }
    case "legal_state_transition":
      return { status: "pass", summary: `${state.current_state} may transition to ${to}` };
    case "source_provenance_integrity":
      return sourceProvenanceCheck(candidate, workflowId);
    case "toc_role_semantics_reviewed":
      return semanticReviewCheck(candidate, semantic, workflowId);
    case "toc_proposition_node_coverage":
      return propositionCoverageCheck(loadArtifactByRef(workflowId, state.artifact_refs?.toc_extraction), candidate);
    case "intervention_to_claimable_node_reachability":
      return claimableReachabilityCheck(candidate);
    case "acyclicity": {
      const checked = checkGraph(candidate);
      return { status: checked.status, summary: checked.detail || "check-graph completed" };
    }
    case "edge_validation_status_policy":
      return edgeStatusPolicyCheck(candidate);
    case "provenance_reference_integrity":
      return referenceIntegrityCheck(state, candidate);
    case "validation_pass_completeness": {
      const report = candidate?.schema === "outcome.validation-report.v1"
        ? candidate
        : loadArtifactByRef(workflowId, state.artifact_refs?.validation_report);
      return validationCompletenessCheck(report, to);
    }
    case "attainable_tier_policy":
      return attainableTierCheck(state, candidate);
    case "issuance_policy":
      return issuancePolicyCheck(candidate);
    case "certificate_proof":
      return certificateProofCheck(candidate);
    case "governance_authority":
      if (to === "REVIEW_REQUIRED") {
        if (!packet) return { status: "fail", summary: "REVIEW_REQUIRED needs --packet <ref>" };
        const unresolved = (state.open_review_packets ?? []).filter((ref) => ref !== packet);
        if (unresolved.length) {
          return { status: "fail", summary: `resolve existing review packet '${unresolved[0]}' before opening another` };
        }
        if (!existsSync(reviewPacketPath(workflowId, packet))) {
          return { status: "fail", summary: `review packet '${packet}' was not recorded with record-packet` };
        }
        return { status: "pass", summary: `review packet '${packet}' records the escalation target` };
      }
      if (to === "VALIDATED") {
        return verifyReviewDecision({ decision: reviewDecision, state, to, manifestRevision, candidate });
      }
      if (["ISSUANCE_ELIGIBLE", "CERTIFICATE_ISSUED"].includes(to)) {
        return verifyIssuanceAuthorization({
          authorization: issuanceAuthorization,
          state,
          to,
          manifestRevision,
          candidate,
        });
      }
      const controller = state.issuer_context?.issuer?.did;
      if (!controller) return { status: "fail", summary: `${to} has no host-injected controller context` };
      return { status: "pass", summary: `run controller '${controller}' is recorded; issuance authority remains external` };
    case "artifact_registration_integrity":
      return { status: "pass", summary: "candidate and control records have exact byte digests for registration" };
    case "supersession_lineage_integrity":
      return supersessionLineageCheck({ workflowId, candidate, event: supersessionEvent, envelope: context.envelope });
    case "manifest_compare_and_swap":
      return { status: "pass", summary: "manifest lock is held and expected revision matches" };
    case "snapshot_reconciliation":
      return { status: "pass", summary: "state and snapshot projections are derived from the candidate transition" };
    default:
      return { status: "fail", summary: `required executor '${criterionId}' is unavailable` };
  }
}

/** Validate, independently execute, and atomically commit one transition. */
async function cmdAdvance(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const to = a.to ?? die("--to <STATE> is required");
  if (!STATES.includes(to)) die(`unknown state '${to}'`);
  const releaseLock = acquireManifestLock(workflowId);
  try {
    const { manifest, commit: previousCommit } = reconcileRunIntegrity(workflowId);
    const { state } = loadState(workflowId);
    const legal = LEGAL_PREDECESSORS[to] ?? [];
    if (!legal.includes(state.current_state)) {
      die(`cannot advance ${state.current_state} → ${to}: ${to} may only follow ${legal.join(", ")}`);
    }
    const expectedRevision = Number(a["expected-revision"]);
    if (!Number.isInteger(expectedRevision) || expectedRevision !== manifest.manifest_revision) {
      die(`manifest compare-and-swap failed: expected ${a["expected-revision"] ?? "missing"}, current ${manifest.manifest_revision}`);
    }
    for (const flag of ["gate-plan", "task-contract", "result", "envelope"]) {
      if (!a[flag]) die(`state '${to}' requires --${flag}`);
    }
    const plan = readJson(resolve(a["gate-plan"]));
    const task = readJson(resolve(a["task-contract"]));
    const result = readJson(resolve(a.result));
    const envelope = readJson(resolve(a.envelope));
    if (envelope.contract === "outcome.verification-envelope.v1") {
      die("v1 verification envelopes are readable history but cannot authorize a new transition");
    }
    const documents = [
      [plan, "workflow-control.schema.json", "gate plan"],
      [task, "contracts.v2.schema.json", "task contract"],
      [result, "contracts.v2.schema.json", "result contract"],
      [envelope, "contracts.v2.schema.json", "verification envelope"],
    ];
    for (const [doc, schema, label] of documents) {
      const checked = await validateControl(doc, schema);
      if (checked.status !== "pass") die(`${label} is not executable: ${checked.detail}`);
    }
    const required = STATE_ARTIFACT[to];
    const candidate = a.artifact ? readJson(resolve(a.artifact)) : null;
    if (required && classify(candidate)?.schema !== required.schema) {
      die(`state '${to}' requires --artifact with ${required.schema}`);
    }
    const semanticPath = a["semantic-review"] ? resolve(a["semantic-review"]) : null;
    const semantic = semanticPath ? readJson(semanticPath) : null;
    if (["TOC_PARSED", "CLAIMS_STRUCTURED"].includes(to)) {
      const checked = await validateArtifact(semantic, "outcome.toc-semantic-review.v1");
      if (checked.status !== "pass") die(`semantic review is not executable: ${checked.detail ?? "missing"}`);
    }
    const supersessionEvent = a["supersession-event"] ? readJson(resolve(a["supersession-event"])) : null;
    if (supersessionEvent) {
      const checked = await validateControl(supersessionEvent, "workflow-control.schema.json");
      if (checked.status !== "pass" || supersessionEvent.schema !== "outcome.supersession-event.v1") {
        die(`supersession event is not executable: ${checked.detail ?? "wrong schema"}`);
      }
    }
    const reviewDecision = a["review-decision"] ? readJson(resolve(a["review-decision"])) : null;
    if (to === "VALIDATED") {
      const checked = await validateControl(reviewDecision, "review-decision.schema.json");
      if (checked.status !== "pass") die(`review decision is not executable: ${checked.detail ?? "missing"}`);
    } else if (reviewDecision) {
      die("--review-decision is only accepted for the VALIDATED transition");
    }
    const issuanceAuthorization = a["issuance-authorization"]
      ? readJson(resolve(a["issuance-authorization"]))
      : null;
    if (["ISSUANCE_ELIGIBLE", "CERTIFICATE_ISSUED"].includes(to)) {
      const checked = await validateControl(issuanceAuthorization, "issuance-authorization.schema.json");
      if (checked.status !== "pass") die(`issuance authorization is not executable: ${checked.detail ?? "missing"}`);
    } else if (issuanceAuthorization) {
      die("--issuance-authorization is only accepted for issuance transitions");
    }
    const requiredIds = checkControlLinkage({
      workflowId,
      manifestRevision: manifest.manifest_revision,
      state,
      to,
      candidate,
      semantic,
      supersessionEvent,
      packet: a.packet,
      reviewDecision,
      issuanceAuthorization,
      plan,
      task,
      result,
      envelope,
    });
    const outputDigest = candidate ? digestJson(candidate) : digestJson(state);
    for (const check of envelope.checks) {
      if (requiredIds.includes(check.criterion_id) && check.output_digest !== outputDigest) {
        die(`verification check '${check.criterion_id}' is not bound to the frozen output bytes`);
      }
    }
    const gateResults = [];
    for (const criterionId of requiredIds) {
      const executed = await executeCriterion(criterionId, {
        workflowId,
        manifestRevision: manifest.manifest_revision,
        state,
        to,
        candidate,
        semantic,
        supersessionEvent,
        envelope,
        reviewDecision,
        issuanceAuthorization,
        packet: a.packet,
      });
      const criterion = plan.criteria.find((item) => item.criterion_id === criterionId);
      const checkRef =
        `urn:ixo:gate-result:${safeName(task.task_id)}-${criterionId}-${sha256(JSON.stringify(executed)).slice(0, 12)}`;
      const resultRecord = gateResult(criterionId, {
        status: executed.status,
        evidenceRef: checkRef,
        inputDigest: inputDigest(criterion.input_refs),
        outputDigest,
        summary: executed.summary,
      });
      saveImmutable(artifactPath(workflowId, checkRef, "tasks"), resultRecord);
      gateResults.push(resultRecord);
      if (executed.status !== "pass") die(`criterion '${criterionId}' blocked the transition: ${executed.summary}`);
    }

    const registrations = [];
    const register = (ref, kind, value, status = "verified") => {
      registrations.push({
        artifact_ref: ref,
        artifact_kind: kind,
        digest: typeof value === "string" ? sha256(value) : digestJson(value),
        status,
        source_task_id: task.task_id,
      });
    };
    const saveTask = (ref, kind, value) => {
      saveImmutable(artifactPath(workflowId, ref, "tasks"), value);
      register(ref, kind, value);
    };
    for (const gate of gateResults) register(gate.evidence_ref, "gate_result", gate);
    saveTask(plan.plan_id, "gate_plan", plan);
    saveTask(task.task_id, "task_contract", task);
    const resultRef = `urn:ixo:result-contract:${sha256(JSON.stringify(result))}`;
    saveTask(resultRef, "result_contract", result);
    saveTask(envelope.envelope_id, "verification_envelope", envelope);

    if (to === "REVIEW_REQUIRED" && a.packet) {
      register(a.packet, "review_packet", readFileSync(reviewPacketPath(workflowId, a.packet), "utf8"), "accepted");
    }
    if (reviewDecision) {
      saveImmutable(artifactPath(workflowId, reviewDecision.decision_id), reviewDecision);
      register(reviewDecision.decision_id, reviewDecision.schema, reviewDecision, "accepted");
    }
    if (issuanceAuthorization) {
      saveImmutable(artifactPath(workflowId, issuanceAuthorization.authorization_id), issuanceAuthorization);
      register(issuanceAuthorization.authorization_id, issuanceAuthorization.schema, issuanceAuthorization, "accepted");
    }
    if (supersessionEvent) {
      const lineage = supersessionLineageCheck({ workflowId, candidate, event: supersessionEvent, envelope });
      if (lineage.status !== "pass") die(`supersession event is not executable: ${lineage.summary}`);
      saveImmutable(artifactPath(workflowId, supersessionEvent.event_id, "revisions"), supersessionEvent);
      register(supersessionEvent.event_id, supersessionEvent.schema, supersessionEvent, "accepted");
      const predecessor = loadArtifactVersion(workflowId, supersessionEvent.predecessor_ref);
      if (predecessor.area === "artifacts") {
        const predecessorKind = classify(predecessor.doc);
        register(
          supersessionEvent.predecessor_ref,
          predecessorKind.schema,
          predecessor.doc,
          "superseded",
        );
      }
    }

    if (candidate) {
      const kind = classify(candidate);
      const id = candidate[kind.idField];
      saveImmutable(artifactPath(workflowId, id), candidate);
      register(id, kind.schema, candidate, "accepted");
      if (STATE_ARTIFACT[to]) state.artifact_refs[STATE_ARTIFACT[to].ref] = id;
      if (kind.schema === "outcome.toc-extraction.v1") {
        state.source_hashes = [...new Set((candidate.source_artifacts ?? []).map((source) => source.sha256))];
      }
    }
    if (semantic) {
      saveImmutable(artifactPath(workflowId, semantic.review_id), semantic);
      register(semantic.review_id, semantic.schema, semantic, "accepted");
      state.artifact_refs.toc_semantic_review = semantic.review_id;
    }

    const approvedBy = to === "VALIDATED"
      ? "human_reviewer"
      : ["ISSUANCE_ELIGIBLE", "CERTIFICATE_ISSUED"].includes(to)
        ? "host_authority"
        : "orchestrator";
    const now = new Date().toISOString();
    state.transitions.push({
      from: state.current_state,
      to,
      at: now,
      task_id: task.task_id,
      envelope_ref: envelope.envelope_id,
      approved_by: approvedBy,
    });
    state.current_state = to;
    if (to === "REVIEW_REQUIRED" && a.packet) {
      state.open_review_packets = [...new Set([...state.open_review_packets, a.packet])];
    }
    if (to === "VALIDATED") {
      state.open_review_packets = state.open_review_packets.filter((ref) => ref !== reviewDecision.packet_ref);
    }

    const revision = manifest.manifest_revision + 1;
    const stateDigest = digestJson(state);
    const commitId = transitionCommitId({
      workflowId,
      revision,
      from: previousCommit.state_after,
      to,
      taskRef: task.task_id,
      resultRef,
      envelopeRef: envelope.envelope_id,
      stateDigest,
    });
    const snapshot = await buildSnapshot(workflowId, state, {
      manifestRevision: revision,
      transitionCommitRef: commitId,
      generatedAt: now,
    });
    const snapshotDigest = snapshotProjectionDigest(snapshot);
    const transition = {
      schema: "outcome.transition-commit.v1",
      commit_id: commitId,
      workflow_id: workflowId,
      expected_manifest_revision: manifest.manifest_revision,
      manifest_revision: revision,
      previous_transition_commit_ref: previousCommit.commit_id,
      state_before: previousCommit.state_after,
      state_after: to,
      gate_plan_ref: plan.plan_id,
      task_ref: task.task_id,
      result_ref: resultRef,
      verification_envelope_ref: envelope.envelope_id,
      gate_results: gateResults,
      dimension_verdicts: dimensionVerdicts(gateResults),
      artifact_registrations: mergeRegistrations(previousCommit.artifact_registrations, registrations),
      finding_refs: gateResults.map((item) => item.evidence_ref),
      supersession_event_refs: supersessionEvent ? [supersessionEvent.event_id] : [],
      state_projection_digest: stateDigest,
      snapshot_projection_digest: snapshotDigest,
      committed_at: now,
    };
    const transitionCheck = await validateControl(transition, "workflow-control.schema.json");
    if (transitionCheck.status !== "pass") die(`transition commit is invalid: ${transitionCheck.detail}`);
    const commitRecord = saveImmutable(artifactPath(workflowId, commitId, "commits"), transition);
    const projections = projectionPaths(workflowId, commitId);
    saveImmutable(projections.state, state);
    saveImmutable(projections.snapshot, snapshot);
    writeJson(join(runDir(workflowId), "state.json"), state);
    writeJson(join(runDir(workflowId), "snapshot.json"), snapshot);
    writeManifestAtomic(workflowId, {
      schema: "outcome.manifest-pointer.v1",
      workflow_id: workflowId,
      manifest_revision: revision,
      transition_commit_ref: commitId,
      transition_commit_digest: commitRecord.digest,
    });
    if (candidate) rmSync(artifactPath(workflowId, candidate[classify(candidate).idField], "work"), { force: true });
    if (semantic) rmSync(artifactPath(workflowId, semantic.review_id, "work"), { force: true });
    return emit({
      ok: true,
      workflow_id: workflowId,
      current_state: to,
      approved_by: approvedBy,
      gate_results: gateResults,
      transition_commit_ref: commitId,
      manifest_revision: revision,
      artifact: candidate ? artifactPath(workflowId, candidate[classify(candidate).idField]) : null,
      supersession_event_ref: supersessionEvent?.event_id ?? null,
      envelope_ref: envelope.envelope_id,
    });
  } finally {
    releaseLock();
  }
}

/** Committed totals and draft totals, kept separate. */
async function cmdTotals(argv) {
  const workflowId = args(argv).workflow ?? die("--workflow is required");
  const releaseLock = acquireManifestLock(workflowId);
  try {
    const { manifest, commit } = reconcileRunIntegrity(workflowId);
    const { state } = loadState(workflowId);
    const snapshot = await buildSnapshot(workflowId, state, {
      manifestRevision: manifest.manifest_revision,
      transitionCommitRef: commit.commit_id,
      generatedAt: commit.committed_at,
    });
    writeJson(join(runDir(workflowId), "snapshot.json"), snapshot);

    return emit({
      ok: true,
      workflow_id: workflowId,
      current_state: state.current_state,
      manifest_revision: manifest.manifest_revision,
      includes_uncommitted_work: snapshot.control.includes_uncommitted_work,
      committed: snapshot.control.committed,
      uncommitted: snapshot.control.uncommitted,
      totals: snapshot.control.committed,
      attainable_tier: snapshot.overlay.attainable_tier,
      artifacts_dir: join(runDir(workflowId), "artifacts"),
      work_dir: join(runDir(workflowId), "work"),
    });
  } finally {
    releaseLock();
  }
}

/**
 * Compose the run into a single `outcome.run-snapshot.v1` and write it beside the run.
 *
 * This is the only file anything outside the sandbox ever sees. The agent turns the
 * printed path into a presigned URL with the sandbox's `artifact_get_presigned_url` tool
 * and hands that to the canvas; the canvas renders whatever it is given and asks for
 * nothing else. No service reaches into the run directory to assemble this itself.
 */
async function cmdSnapshot(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const releaseLock = acquireManifestLock(workflowId);
  try {
    const { manifest, commit } = reconcileRunIntegrity(workflowId);
    const { state } = loadState(workflowId);
    const snapshot = await buildSnapshot(workflowId, state, {
      manifestRevision: manifest.manifest_revision,
      transitionCommitRef: commit.commit_id,
      generatedAt: commit.committed_at,
    });
    const checked = await validateArtifact(snapshot, "outcome.run-snapshot.v1");
    if (checked.status !== "pass") die(`snapshot projection is invalid: ${checked.detail ?? "validator unavailable"}`);
    const path = join(runDir(workflowId), "snapshot.json");
    writeJson(path, snapshot);

    return emit({
      ok: true,
      workflow_id: workflowId,
      // The agent presigns this path and passes it to the canvas as dataHandle/fetchToken.
      artifact: { path, schema: snapshot.schema },
      current_state: snapshot.run.current_state,
      phase: snapshot.run.phase,
      totals: snapshot.totals,
      control: snapshot.control,
      attainable_tier: snapshot.overlay.attainable_tier,
      next: "Call artifact_get_presigned_url({ path }) and render it with the render_outcome_graph AG-UI action.",
    });
  } finally {
    releaseLock();
  }
}

function cmdReconcile(argv) {
  const workflowId = args(argv).workflow ?? die("--workflow is required");
  const releaseLock = acquireManifestLock(workflowId);
  try {
    const { manifest, commit } = reconcileRunIntegrity(workflowId, { repair: true });
    return emit({
      ok: true,
      workflow_id: workflowId,
      current_state: commit.state_after,
      manifest_revision: manifest.manifest_revision,
      transition_commit_ref: commit.commit_id,
      reconciliation: "reconciled",
    });
  } finally {
    releaseLock();
  }
}

// ---- entry -----------------------------------------------------------------

/**
 * One dispatch, usable two ways: from the command line, where a non-zero exit is how the
 * gate refuses a transition, and by import, where the returned payload is the answer.
 *
 * @param {string[]} argv  e.g. ["advance", "--workflow", "wf-1", "--to", "VALIDATED"]
 * @returns {Promise<object>} the same payload the CLI prints
 */
export async function main(argv = []) {
  const [command, ...rest] = argv;
  switch (command) {
    case "init":
      return await cmdInit(rest);
    case "state":
      return cmdState(rest);
    case "record":
      return cmdRecord(rest);
    case "record-packet":
      return cmdRecordPacket(rest);
    case "plan":
      return await cmdPlan(rest);
    case "advance":
      return await cmdAdvance(rest);
    case "totals":
      return await cmdTotals(rest);
    case "snapshot":
      return await cmdSnapshot(rest);
    case "reconcile":
      return cmdReconcile(rest);
    default:
      return die(`unknown command '${command ?? ""}' — expected init | state | record | record-packet | plan | advance | totals | snapshot | reconcile`);
  }
}

/**
 * Only run when invoked directly, so importing this module has no side effects.
 *
 * Compared as real paths rather than as URL strings: on macOS the temp and var
 * directories are symlinks (`/var` → `/private/var`), so `import.meta.url` and
 * `process.argv[1]` describe the same file with different spellings — and a string
 * comparison would leave the script silently doing nothing when run from one.
 */
function invokedDirectly() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    emit({ ok: false, error: error.message });
    process.exitCode = 1;
  }
}
