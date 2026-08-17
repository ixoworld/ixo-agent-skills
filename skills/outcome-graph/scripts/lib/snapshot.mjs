/**
 * Composes one `outcome.run-snapshot.v1` — everything the Outcome Graph portal app needs
 * to render a run, resolved and overlaid server-side.
 *
 * Why server-side: the app never learns the artifact layout, and the skill (or, later,
 * the QiForge capsule) never learns the snapshot schema. The only contract between them
 * is the existing `outcome.*` artifacts plus the runs/<workflow_id>/ layout, so the
 * snapshot can change shape without touching the agent side.
 *
 * Pure and isomorphic: no fs, no fetch. Callers supply `readArtifact(ref)`.
 */

import { overlayForSnapshot } from "./overlay.mjs";
import { phaseForState, phaseProgress, PHASE_COUNT } from "./phases.mjs";

export const SNAPSHOT_SCHEMA = "outcome.run-snapshot.v1";

/** The ten run totals the guided checkpoints report, in the template's order. */
const EMPTY_TOTALS = {
  sources: 0,
  propositions: 0,
  nodes: 0,
  edges: 0,
  evidence_links: 0,
  gaps: 0,
  passes: 0,
  warnings: 0,
  failures: 0,
  blockers: 0,
};

/**
 * @param {object} state             outcome.workflow-state.v1 record (runs/<id>/state.json)
 * @param {(ref: string) => object|null} readArtifact  resolves an artifact ref to its doc
 * @param {object} [opts]
 * @param {object|null} [opts.brief]            outcome.run-brief.v1, when the run wrote one
 * @param {Record<string,string>} [opts.reviewPackets]  packet ref → markdown source
 * @param {string} [opts.generatedAt]           ISO timestamp; caller supplies for determinism
 * @returns {object} outcome.run-snapshot.v1
 */
export function composeSnapshot(state, readArtifact, opts = {}) {
  const refs = state.artifact_refs ?? {};
  const read = (ref) => (ref ? (readArtifact(ref) ?? null) : null);

  const toc = read(refs.toc_extraction);
  const graph = read(refs.causal_graph);
  const evidence = read(refs.evidence_graph);
  const report = read(refs.validation_report);
  const certificate = read(refs.certificate);

  // The overlay needs the same 4-method seam the oracle uses, but here it is backed by
  // the artifacts we just resolved rather than a directory scan.
  const store = {
    getLatestReportFor: (ref) =>
      report && report.graph_version_ref === ref ? report : undefined,
  };
  const overlay = graph
    ? overlayForSnapshot(store, graph.graph_version_id, graph)
    : { edge_statuses: {} };

  const phase = phaseForState(state.current_state);

  return {
    schema: SNAPSHOT_SCHEMA,
    generated_at: opts.generatedAt ?? null,
    run: {
      workflow_id: state.workflow_id,
      created_at: state.created_at ?? null,
      current_state: state.current_state,
      phase: phase ?? { number: 0, of: PHASE_COUNT, name: "Unknown phase", why: "" },
      phases: phaseProgress(state.current_state, state.transitions ?? []),
      target_tier: state.target_tier ?? null,
      issuer_context: state.issuer_context ?? null,
      transitions: (state.transitions ?? []).map((t) => ({
        from: t.from,
        to: t.to,
        at: t.at,
        task_id: t.task_id ?? null,
        envelope_ref: t.envelope_ref ?? null,
        approved_by: t.approved_by,
      })),
      open_review_packets: (state.open_review_packets ?? []).map((ref) => ({
        ref,
        markdown: opts.reviewPackets?.[ref] ?? null,
      })),
      brief: opts.brief ?? null,
    },
    toc,
    graph,
    evidence,
    report,
    certificate,
    overlay: {
      edge_statuses: overlay.edge_statuses,
      attainable_tier: report?.attainable_tier ?? null,
      // A report bound to an older graph version means the displayed statuses are stale:
      // the graph moved on and validation has not caught up.
      stale: Boolean(report && graph && report.graph_version_ref !== graph.graph_version_id),
    },
    lineage: graph
      ? [
          {
            graph_version_id: graph.graph_version_id,
            version: graph.version ?? null,
            status: graph.status ?? null,
            supersedes: graph.supersedes ?? null,
            superseded_by: graph.superseded_by ?? null,
          },
        ]
      : [],
    totals: computeTotals({ state, toc, graph, evidence, report }),
  };
}

/**
 * The run-totals row from templates/user-checkpoint.md, computed from whatever artifacts
 * exist. Absent artifacts contribute zero rather than being omitted, so the stat row has
 * a stable shape from phase 1 onward.
 */
export function computeTotals({ state, toc, graph, evidence, report }) {
  const totals = { ...EMPTY_TOTALS };

  totals.sources = toc?.source_artifacts?.length ?? state?.source_hashes?.length ?? 0;
  totals.propositions = toc?.propositions?.length ?? 0;
  totals.nodes = graph?.nodes?.length ?? 0;
  totals.edges = graph?.edges?.length ?? 0;
  totals.evidence_links = evidence?.links?.length ?? 0;
  // Only open gaps constrain the run; closed ones are history.
  totals.gaps = (evidence?.gaps ?? []).filter((g) => g.status === "open").length;

  const summary = report?.pass_summary;
  if (summary) {
    totals.passes = summary.passes ?? 0;
    totals.warnings = summary.warnings ?? 0;
    totals.failures = summary.failures ?? 0;
    totals.blockers = summary.blocking_count ?? 0;
  }
  return totals;
}
