#!/usr/bin/env node
/**
 * The run's deterministic state gate.
 *
 * In the Claude Code plugin, role isolation does part of this work: the orchestrator
 * dispatches to a specialist, and a separate agent's output is what advances the state.
 * A QiForge oracle runs one agent, so that separation is gone — and this script is what
 * replaces it. The model proposes; this decides.
 *
 * Nothing here trusts a claim of completion. `advance` re-validates the artifact against
 * its schema, re-runs the deterministic graph checks, and refuses any envelope that does
 * not carry an `approve_transition` verdict backed by tool evidence. The agent cannot
 * talk its way past it, because the agent is not the one checking.
 *
 * Usage:
 *   node scripts/run.mjs init --workflow <id> --domain <d> [--target-tier N] [--brief <file>]
 *   node scripts/run.mjs state  --workflow <id>
 *   node scripts/run.mjs record --workflow <id> --artifact <file>
 *   node scripts/run.mjs advance --workflow <id> --to <STATE> --envelope <file> [--task <id>]
 *   node scripts/run.mjs totals --workflow <id>
 *   node scripts/run.mjs snapshot --workflow <id>
 *
 * Runs live under $OUTCOME_GRAPH_RUNS, defaulting to the sandbox's output mount at
 * /workspace/data/output/outcome-graph — ordinary file writes, isolated to this user by
 * the sandbox. Nothing outside the sandbox reads these files directly: `snapshot` writes
 * the one artifact the agent hands to the canvas, via a presigned URL the sandbox mints.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

/** Which artifact a state must have produced, and where state.json records it. */
const STATE_ARTIFACT = {
  TOC_PARSED: { schema: "outcome.toc-extraction.v1", ref: "toc_extraction" },
  CLAIMS_STRUCTURED: { schema: "outcome.toc-extraction.v1", ref: "toc_extraction" },
  CAUSAL_GRAPH_DRAFTED: { schema: "outcome.causal-graph.v1", ref: "causal_graph" },
  EVIDENCE_GRAPH_LINKED: { schema: "outcome.evidence-graph.v1", ref: "evidence_graph" },
  VALIDATION_RUNNING: { schema: "outcome.validation-report.v1", ref: "validation_report" },
  ISSUANCE_ELIGIBLE: { schema: "outcome.issuance-request.v1", ref: "issuance_request" },
};

/** States the orchestrator may enter on its own — no specialist output to verify. */
const ORCHESTRATOR_STATES = new Set([
  "SOURCE_ACCEPTED",
  "VALIDATED",
  "REJECTED",
  "VERSION_ARCHIVED",
]);

/** Identity field per artifact schema, so an artifact_ref resolves to a document. */
const ID_FIELDS = {
  "outcome.toc-extraction.v1": "extraction_id",
  "outcome.causal-graph.v1": "graph_version_id",
  "outcome.evidence-graph.v1": "evidence_graph_id",
  "outcome.validation-report.v1": "report_id",
  "outcome.issuance-request.v1": "request_id",
  "outcome.geo-boundary.v1": "boundary_id",
  "outcome.run-brief.v1": "brief_id",
};

// ---- plumbing --------------------------------------------------------------

/**
 * Print the refusal and exit non-zero. The non-zero exit is the gate: a caller in a shell
 * must be able to tell a blocked transition from an allowed one without parsing stdout.
 */
const die = (message) => {
  emit({ ok: false, error: message });
  process.exit(1);
};

/** One JSON object on stdout: the agent reads this, never the files directly. */
function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function runDir(workflowId) {
  if (!/^[A-Za-z0-9._-]+$/.test(workflowId ?? "")) die(`invalid workflow id '${workflowId}'`);
  return join(RUNS_ROOT, "runs", workflowId);
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
  try {
    await import("ajv/dist/2020.js");
    await import("ajv-formats");
    return true;
  } catch {
    return false;
  }
}

/**
 * Schema validation, run here rather than taken on trust. If ajv is missing the check is
 * reported as unavailable — never silently as a pass. "Downgrade, don't pretend" applies
 * to the gate itself, not only to the evidence it weighs.
 */
async function validateArtifact(doc, schemaName) {
  const schemaDir = join(CAPSULE, "schemas");
  let Ajv2020;
  let addFormats;
  try {
    ({ default: Ajv2020 } = await import("ajv/dist/2020.js"));
    ({ default: addFormats } = await import("ajv-formats"));
  } catch {
    return { status: "unavailable", detail: "ajv is not installed in this sandbox" };
  }

  const ajv = new Ajv2020({ strict: false, allErrors: true, allowUnionTypes: true });
  addFormats(ajv);
  for (const file of readdirSync(schemaDir).filter((f) => f.endsWith(".json"))) {
    try {
      ajv.addSchema(JSON.parse(readFileSync(join(schemaDir, file), "utf8")), file);
    } catch {
      /* the JSON-LD context is not a schema */
    }
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

/** The deterministic DAG checks. Blocking findings block the transition, full stop. */
function checkGraph(path) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [join(CAPSULE, "scripts", "check-graph.mjs"), path],
      { encoding: "utf8" },
    );
    return { status: "pass", detail: summariseFindings(stdout) };
  } catch (error) {
    const stdout = error.stdout?.toString() ?? "";
    return { status: "fail", detail: summariseFindings(stdout) || error.message };
  }
}

function summariseFindings(stdout) {
  try {
    const report = JSON.parse(stdout);
    const findings = report.findings ?? [];
    const blocking = findings.filter((f) => f.severity === "blocking");
    return `${findings.length} finding(s), ${blocking.length} blocking${
      blocking.length ? `: ${blocking.map((f) => f.check_id).join(",")}` : ""
    }`;
  } catch {
    return "";
  }
}

// ---- commands --------------------------------------------------------------

async function cmdInit(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const dir = runDir(workflowId);
  if (existsSync(join(dir, "state.json"))) die(`run '${workflowId}' already exists`);

  const now = new Date().toISOString();
  const state = {
    contract: "outcome.workflow-state.v1",
    workflow_id: workflowId,
    created_at: now,
    current_state: "SOURCE_ACCEPTED",
    target_tier: a["target-tier"] === undefined ? 3 : Number(a["target-tier"]),
    source_hashes: [],
    issuer_context: {
      outcome_domain: a.domain ?? "unspecified",
      // The oracle injects the caller's DID; a run knows who it belongs to without asking.
      ...(process.env._SKILL_CONTEXT_USER_DID ? { issuer: process.env._SKILL_CONTEXT_USER_DID } : {}),
    },
    artifact_refs: {
      toc_extraction: null,
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

  writeJson(join(dir, "state.json"), state);
  mkdirSync(join(dir, "artifacts"), { recursive: true });
  mkdirSync(join(dir, "tasks"), { recursive: true });
  mkdirSync(join(dir, "review-packets"), { recursive: true });

  if (a.brief) {
    const brief = readJson(resolve(a.brief));
    if (brief.schema !== "outcome.run-brief.v1") die("--brief must be an outcome.run-brief.v1");
    writeJson(join(dir, "run-brief.json"), brief);
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
            "Until then transitions record it as a warning rather than a pass, and artifacts advance unvalidated.",
        }),
  });
}

function cmdState(argv) {
  const { state } = loadState(args(argv).workflow ?? die("--workflow is required"));
  return emit({
    ok: true,
    workflow_id: state.workflow_id,
    current_state: state.current_state,
    target_tier: state.target_tier,
    artifact_refs: state.artifact_refs,
    open_review_packets: state.open_review_packets,
    transitions: state.transitions.length,
    last_transition: state.transitions.at(-1) ?? null,
  });
}

/** Persist an artifact into the run. Content-addressed by its own declared id. */
function cmdRecord(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const source = a.artifact ?? die("--artifact is required");
  loadState(workflowId);

  const doc = readJson(resolve(source));
  const schema = doc.schema ?? die("artifact has no `schema` field");
  const idField = ID_FIELDS[schema];
  if (!idField) die(`unknown artifact schema '${schema}'`);
  const id = doc[idField] ?? die(`artifact is missing '${idField}'`);

  // The filename is derived from the id, so recording the same artifact twice is idempotent
  // rather than a second copy that later reads as a second version.
  const name = `${String(id).replace(/[^A-Za-z0-9._-]/g, "-")}.json`;
  const target = join(runDir(workflowId), "artifacts", name);
  writeJson(target, doc);

  return emit({
    ok: true,
    schema,
    artifact_id: id,
    path: target,
    sha256: createHash("sha256").update(readFileSync(target)).digest("hex"),
  });
}

/**
 * The gate. Advancing is a claim about work being done, so everything the state requires
 * is re-checked here — against the artifact on disk, not against what the agent reported.
 */
async function cmdAdvance(argv) {
  const a = args(argv);
  const workflowId = a.workflow ?? die("--workflow is required");
  const to = a.to ?? die("--to <STATE> is required");
  if (!STATES.includes(to)) die(`unknown state '${to}'`);

  const { path, state } = loadState(workflowId);
  const checks = [];
  let envelope = null;

  if (a.envelope) {
    envelope = readJson(resolve(a.envelope));
    if (envelope.contract !== "outcome.verification-envelope.v1") {
      die("--envelope must be an outcome.verification-envelope.v1");
    }
    if (envelope.verdict !== "approve_transition") {
      die(`envelope verdict is '${envelope.verdict}' — the transition is blocked`);
    }
    if (!Array.isArray(envelope.checks) || envelope.checks.length === 0) {
      die("envelope carries no checks");
    }
    // Tool-backed checks must cite their evidence. An assertion is not a check.
    for (const check of envelope.checks) {
      if (
        ["deterministic_tool", "schema_validation"].includes(check.method) &&
        !check.evidence_ref
      ) {
        die(`check '${check.claim}' claims ${check.method} but cites no evidence_ref`);
      }
    }
    checks.push({ claim: "envelope verdict is approve_transition", method: "schema_validation", status: "pass" });
  } else if (!ORCHESTRATOR_STATES.has(to)) {
    die(`state '${to}' requires --envelope (only ${[...ORCHESTRATOR_STATES].join(", ")} do not)`);
  }

  // Re-verify the artifact this state is supposed to have produced.
  const required = STATE_ARTIFACT[to];
  let artifactPath = null;
  if (required) {
    const ref = a.artifact ? resolve(a.artifact) : findArtifact(workflowId, required.schema);
    if (!ref) die(`state '${to}' requires an ${required.schema} artifact — record it first`);
    artifactPath = ref;

    const doc = readJson(ref);
    if (doc.schema !== required.schema) die(`artifact is ${doc.schema}, expected ${required.schema}`);

    const schemaCheck = await validateArtifact(doc, required.schema);
    checks.push({
      claim: `${required.schema} validates against its schema`,
      method: "schema_validation",
      status: schemaCheck.status === "pass" ? "pass" : schemaCheck.status === "fail" ? "fail" : "warning",
      evidence_ref: schemaCheck.detail ?? ref,
    });
    if (schemaCheck.status === "fail") die(`artifact is schema-invalid: ${schemaCheck.detail}`);

    if (required.schema === "outcome.causal-graph.v1") {
      const graphCheck = checkGraph(ref);
      checks.push({
        claim: "check-graph reports no blocking findings",
        method: "deterministic_tool",
        status: graphCheck.status,
        evidence_ref: graphCheck.detail,
      });
      if (graphCheck.status === "fail") die(`check-graph blocked the transition: ${graphCheck.detail}`);
    }

    state.artifact_refs[required.ref] = doc[ID_FIELDS[required.schema]] ?? null;
  }

  // A human decision is a human's to make. The agent records it; it never stands in for one.
  const approvedBy = to === "VALIDATED" && state.current_state === "REVIEW_REQUIRED"
    ? "human_reviewer"
    : "orchestrator";
  if (approvedBy === "human_reviewer" && !a.reviewer) {
    die("leaving REVIEW_REQUIRED needs --reviewer <did-or-name>: a reviewer decision is never simulated");
  }

  const envelopeRef = a.envelope ? saveEnvelope(workflowId, envelope, checks) : null;
  state.transitions.push({
    from: state.current_state,
    to,
    at: new Date().toISOString(),
    task_id: a.task ?? null,
    envelope_ref: envelopeRef,
    approved_by: approvedBy,
  });
  state.current_state = to;
  if (to === "REVIEW_REQUIRED" && a.packet) {
    state.open_review_packets = [...new Set([...state.open_review_packets, a.packet])];
  }
  if (to === "VALIDATED") state.open_review_packets = [];

  writeJson(path, state);
  return emit({
    ok: true,
    workflow_id: workflowId,
    current_state: to,
    approved_by: approvedBy,
    checks,
    artifact: artifactPath,
    envelope_ref: envelopeRef,
  });
}

function saveEnvelope(workflowId, envelope, extraChecks) {
  const merged = { ...envelope, checks: [...envelope.checks, ...extraChecks] };
  const id = envelope.envelope_id ?? `urn:ixo:verification-envelope:${createHash("sha256")
    .update(JSON.stringify(merged))
    .digest("hex")
    .slice(0, 32)}`;
  merged.envelope_id = id;
  writeJson(join(runDir(workflowId), "tasks", `${id.replace(/[^A-Za-z0-9._-]/g, "-")}.json`), merged);
  return id;
}

function findArtifact(workflowId, schema) {
  const dir = join(runDir(workflowId), "artifacts");
  if (!existsSync(dir)) return null;
  const matches = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => join(dir, f))
    .filter((p) => {
      try {
        return JSON.parse(readFileSync(p, "utf8")).schema === schema;
      } catch {
        return false;
      }
    })
    .sort();
  return matches.at(-1) ?? null;
}

/** The ten run totals the checkpoint reports, computed rather than remembered. */
function cmdTotals(argv) {
  const workflowId = args(argv).workflow ?? die("--workflow is required");
  const { state } = loadState(workflowId);
  const dir = join(runDir(workflowId), "artifacts");

  const load = (schema) => {
    const path = findArtifact(workflowId, schema);
    return path ? readJson(path) : null;
  };
  const toc = load("outcome.toc-extraction.v1");
  const graph = load("outcome.causal-graph.v1");
  const evidence = load("outcome.evidence-graph.v1");
  const report = load("outcome.validation-report.v1");
  const summary = report?.pass_summary ?? {};

  return emit({
    ok: true,
    workflow_id: workflowId,
    current_state: state.current_state,
    totals: {
      sources: toc?.source_artifacts?.length ?? state.source_hashes?.length ?? 0,
      propositions: toc?.propositions?.length ?? 0,
      nodes: graph?.nodes?.length ?? 0,
      edges: graph?.edges?.length ?? 0,
      evidence_links: evidence?.links?.length ?? 0,
      gaps: (evidence?.gaps ?? []).filter((g) => g.status === "open").length,
      passes: summary.passes ?? 0,
      warnings: summary.warnings ?? 0,
      failures: summary.failures ?? 0,
      blockers: summary.blocking_count ?? 0,
    },
    attainable_tier: report?.attainable_tier ?? null,
    artifacts_dir: dir,
  });
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
  const { state } = loadState(workflowId);
  const dir = runDir(workflowId);

  const { composeSnapshot } = await import("./lib/snapshot.mjs");

  const byId = new Map();
  let recordedBrief = null;
  const artifactsDir = join(dir, "artifacts");
  if (existsSync(artifactsDir)) {
    for (const file of readdirSync(artifactsDir).filter((f) => f.endsWith(".json"))) {
      const doc = readJson(join(artifactsDir, file));
      // Certificates are W3C VCs: `id` and `type[]`, no outcome.* schema field.
      if (typeof doc.id === "string" && Array.isArray(doc.type)) {
        byId.set(doc.id, doc);
        continue;
      }
      if (doc.schema === "outcome.run-brief.v1") recordedBrief = doc;
      const idField = ID_FIELDS[doc.schema];
      if (idField && typeof doc[idField] === "string") byId.set(doc[idField], doc);
    }
  }

  // A brief reaches a run two ways — `init --brief` writes it beside state.json, and
  // `record` files it with the artifacts. Either counts; the canvas should not depend on
  // which route the agent happened to take.
  const briefPath = join(dir, "run-brief.json");
  const brief = existsSync(briefPath) ? readJson(briefPath) : recordedBrief;

  const reviewPackets = {};
  for (const ref of state.open_review_packets ?? []) {
    const stem = String(ref).split(":").pop();
    const path = join(dir, "review-packets", `${stem}.md`);
    if (existsSync(path)) reviewPackets[ref] = readFileSync(path, "utf8");
  }

  const snapshot = composeSnapshot(state, (ref) => byId.get(ref) ?? null, {
    brief,
    reviewPackets,
    generatedAt: process.env._SKILL_CONTEXT_TIMESTAMP ?? new Date().toISOString(),
  });

  const path = join(dir, "snapshot.json");
  writeJson(path, snapshot);

  return emit({
    ok: true,
    workflow_id: workflowId,
    // The agent presigns this path and passes it to the canvas as dataHandle/fetchToken.
    artifact: { path, schema: snapshot.schema },
    current_state: snapshot.run.current_state,
    phase: snapshot.run.phase,
    totals: snapshot.totals,
    attainable_tier: snapshot.overlay.attainable_tier,
    next: "Call artifact_get_presigned_url({ path }) and render it with the render_outcome_graph AG-UI action.",
  });
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
    case "advance":
      return await cmdAdvance(rest);
    case "totals":
      return cmdTotals(rest);
    case "snapshot":
      return await cmdSnapshot(rest);
    default:
      return die(`unknown command '${command ?? ""}' — expected init | state | record | advance | totals | snapshot`);
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
  await main(process.argv.slice(2));
}
