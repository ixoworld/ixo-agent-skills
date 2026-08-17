/**
 * The edge-status overlay: a causal graph version is immutable, so an edge's *current*
 * status is the status recorded on the edge overlaid by the latest validation report's
 * `edge_status_changes`. Anything that displays or scores an edge — the oracle's
 * ExternalSource checks, the portal app's run snapshot — must apply this same overlay,
 * or it reports statuses the validation run already moved on from.
 *
 * Kept here (not in service/) so both the service and the snapshot composer import one
 * implementation. The bps map is part of the contract: it is what
 * `edge-validation-score` returns to the evaluations engine.
 */

export const EDGE_STATUS_BPS = {
  supported: 10000,
  plausible: 7000,
  contested: 4000,
  unidentified: 4000,
  hypothesized: 2000,
  rejected: 0,
};

/**
 * Current edge statuses = the immutable graph overlaid by the latest validation report.
 *
 * @param {{ getLatestReportFor: (ref: string) => object|undefined }} store
 * @param {string} ref graph_version_id
 * @param {{ edges: Array<{edge_id: string, validation_status: string}> }} graph
 * @returns {{ statuses: Map<string, string>, report: object|undefined }}
 */
export function effectiveEdgeStatuses(store, ref, graph) {
  const statuses = new Map(graph.edges.map((e) => [e.edge_id, e.validation_status]));
  const report = store.getLatestReportFor(ref);
  for (const change of report?.edge_status_changes ?? []) {
    if (statuses.has(change.edge_id)) statuses.set(change.edge_id, change.to);
  }
  return { statuses, report };
}

/**
 * The overlay in the shape the run snapshot publishes: per edge, the base status from the
 * graph, the effective status after the report, its bps score, and the report's stated
 * basis for the change (absent when nothing changed).
 *
 * @returns {{ edge_statuses: Record<string, {status: string, base: string, bps: number|null, basis: string|null}>, report: object|undefined }}
 */
export function overlayForSnapshot(store, ref, graph) {
  const { statuses, report } = effectiveEdgeStatuses(store, ref, graph);
  const basisByEdge = new Map(
    (report?.edge_status_changes ?? []).map((c) => [c.edge_id, c.basis ?? null]),
  );

  const edge_statuses = {};
  for (const edge of graph.edges) {
    const status = statuses.get(edge.edge_id);
    edge_statuses[edge.edge_id] = {
      status,
      base: edge.validation_status,
      bps: EDGE_STATUS_BPS[status] ?? null,
      basis: basisByEdge.get(edge.edge_id) ?? null,
    };
  }
  return { edge_statuses, report };
}
