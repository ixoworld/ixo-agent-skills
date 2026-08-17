/**
 * Deterministic structural checks for outcome.causal-graph.v1 artifacts — importable core.
 *
 * Consumers: scripts/check-graph.mjs (CLI) and service/checks.mjs (graph oracle's
 * graph-structurally-valid answer). Pure over the graph object: no I/O, no clock, no
 * randomness — identical input yields identical findings (adjudication-zone discipline).
 *
 * Checks: DAG-01 acyclicity · DAG-02 outcome reachability · DAG-03 temporal order ·
 * DAG-04 node-type coherence · DAG-05 referential integrity · ID-02 mediator-free
 * adjustment sets · EDGE-04 no descendant-of-target conditioning.
 */

const SPINE_RANK = { intervention: 0, activity: 1, output: 2, mediator: 3, outcome: 4, impact: 5 };
const AUX_TYPES = new Set(["context", "moderator", "confounder"]);
const SPINE_RELATIONS = new Set(["causes", "enables", "inhibits", "prevents", "contributes_to"]);

/**
 * Run all checks. Throws TypeError on a non-causal-graph input (callers map that to their
 * own unusable path). Returns { findings, pass_summary }.
 */
export function checkGraph(graph) {
  if (!graph || graph.schema !== "outcome.causal-graph.v1") {
    throw new TypeError(`schema is '${graph?.schema}', expected 'outcome.causal-graph.v1'`);
  }

  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const nodeById = new Map(nodes.map((n) => [n.node_id, n]));

  const findings = [];
  let seq = 0;
  function finding(check_id, target_kind, target_id, status, severity, summary) {
    findings.push({
      finding_id: `F-${String(++seq).padStart(3, "0")}`,
      check_id,
      layer: "semantic",
      target_kind,
      target_id,
      status,
      severity,
      summary,
      produced_by: "deterministic_tool",
    });
  }

  // ---- Referential integrity ----------------------------------------------
  {
    const seen = new Set();
    for (const n of nodes) {
      if (seen.has(n.node_id)) finding("DAG-05", "node", n.node_id, "fail", "blocking", `Duplicate node_id '${n.node_id}'.`);
      seen.add(n.node_id);
    }
    const seenE = new Set();
    for (const e of edges) {
      if (seenE.has(e.edge_id)) finding("DAG-05", "edge", e.edge_id, "fail", "blocking", `Duplicate edge_id '${e.edge_id}'.`);
      seenE.add(e.edge_id);
      for (const end of [e.source_node_id, e.target_node_id]) {
        if (!nodeById.has(end)) finding("DAG-05", "edge", e.edge_id, "fail", "blocking", `Edge references unknown node '${end}'.`);
      }
    }
  }

  // Adjacency over resolvable edges only.
  const validEdges = edges.filter((e) => nodeById.has(e.source_node_id) && nodeById.has(e.target_node_id));
  const succ = new Map(nodes.map((n) => [n.node_id, []]));
  for (const e of validEdges) succ.get(e.source_node_id).push(e.target_node_id);

  function reach(startIds, forward = true) {
    const pred = forward ? null : new Map(nodes.map((n) => [n.node_id, []]));
    if (!forward) for (const e of validEdges) pred.get(e.target_node_id).push(e.source_node_id);
    const adj = forward ? succ : pred;
    const seen = new Set(startIds);
    const queue = [...startIds];
    while (queue.length) {
      const cur = queue.shift();
      for (const nxt of adj.get(cur) ?? []) {
        if (!seen.has(nxt)) { seen.add(nxt); queue.push(nxt); }
      }
    }
    return seen;
  }

  // ---- DAG-01 acyclicity (Kahn) -------------------------------------------
  {
    const indeg = new Map(nodes.map((n) => [n.node_id, 0]));
    for (const e of validEdges) indeg.set(e.target_node_id, (indeg.get(e.target_node_id) ?? 0) + 1);
    const queue = nodes.map((n) => n.node_id).filter((id) => (indeg.get(id) ?? 0) === 0).sort();
    let visited = 0;
    const removed = new Set();
    while (queue.length) {
      const id = queue.shift();
      removed.add(id);
      visited++;
      for (const t of [...succ.get(id)].sort()) {
        indeg.set(t, indeg.get(t) - 1);
        if (indeg.get(t) === 0) queue.push(t);
      }
    }
    if (visited < nodes.length) {
      const cyclic = nodes.map((n) => n.node_id).filter((id) => !removed.has(id)).sort();
      finding("DAG-01", "graph", graph.graph_version_id ?? graph.graph_id ?? "graph", "fail", "blocking",
        `Cycle detected involving nodes: ${cyclic.join(", ")}. Model feedback as time-indexed node pairs, not cycles.`);
    } else {
      finding("DAG-01", "graph", graph.graph_version_id ?? graph.graph_id ?? "graph", "pass", "info", "Graph is acyclic.");
    }
  }

  // ---- DAG-02 outcome reachability ----------------------------------------
  {
    const interventions = nodes.filter((n) => n.node_type === "intervention").map((n) => n.node_id);
    const reachable = reach(interventions, true);
    for (const n of nodes) {
      if (n.node_type === "outcome" || n.node_type === "impact") {
        if (!reachable.has(n.node_id)) {
          finding("DAG-02", "node", n.node_id, "fail", "blocking",
            `Outcome '${n.node_id}' is not reachable from any intervention — an unsupported claim.`);
        } else {
          finding("DAG-02", "node", n.node_id, "pass", "info", `Outcome '${n.node_id}' reachable from an intervention.`);
        }
      }
    }
  }

  // ---- DAG-03 temporal order -----------------------------------------------
  for (const e of validEdges) {
    const a = nodeById.get(e.source_node_id)?.time_scope?.start;
    const b = nodeById.get(e.target_node_id)?.time_scope?.start;
    if (a && b) {
      if (new Date(a).getTime() > new Date(b).getTime()) {
        finding("DAG-03", "edge", e.edge_id, "fail", "blocking",
          `Temporal violation: source '${e.source_node_id}' starts ${a}, after target '${e.target_node_id}' (${b}).`);
      }
    } else {
      finding("DAG-03", "edge", e.edge_id, "warning", "warning",
        `Cannot verify temporal order for '${e.edge_id}': missing time_scope on ${a ? e.target_node_id : e.source_node_id}.`);
    }
  }

  // ---- DAG-04 node-type coherence ------------------------------------------
  for (const e of validEdges) {
    const st = nodeById.get(e.source_node_id).node_type;
    const tt = nodeById.get(e.target_node_id).node_type;
    if (e.relation_type === "moderates") {
      if (!AUX_TYPES.has(st)) {
        finding("DAG-04", "edge", e.edge_id, "fail", "blocking",
          `'moderates' edge must originate from a context/moderator/confounder node, not '${st}'.`);
      }
      continue;
    }
    if (SPINE_RELATIONS.has(e.relation_type)) {
      if (st === "confounder") continue; // confounders may point anywhere on the spine
      if (AUX_TYPES.has(tt)) {
        finding("DAG-04", "edge", e.edge_id, "warning", "warning",
          `Spine relation targets auxiliary node '${e.target_node_id}' (${tt}); model this as 'moderates' or restructure.`);
        continue;
      }
      if (st in SPINE_RANK && tt in SPINE_RANK && SPINE_RANK[st] > SPINE_RANK[tt]) {
        finding("DAG-04", "edge", e.edge_id, "fail", "blocking",
          `Type-order violation: ${st} → ${tt} runs backwards along the results chain.`);
      }
    }
  }

  // ---- ID-02 / EDGE-04 adjustment-set discipline ---------------------------
  for (const e of validEdges) {
    if (!Array.isArray(e.adjustment_set) || e.adjustment_set.length === 0) continue;
    const descOfSource = reach([e.source_node_id], true);
    descOfSource.delete(e.source_node_id);
    const ancOfTarget = reach([e.target_node_id], false);
    ancOfTarget.delete(e.target_node_id);
    const descOfTarget = reach([e.target_node_id], true);
    descOfTarget.delete(e.target_node_id);

    for (const z of e.adjustment_set) {
      if (!nodeById.has(z)) {
        finding("ID-02", "edge", e.edge_id, "fail", "blocking", `Adjustment set references unknown node '${z}'.`);
        continue;
      }
      if (descOfSource.has(z) && ancOfTarget.has(z)) {
        finding("ID-02", "edge", e.edge_id, "fail", "blocking",
          `Adjustment set contains mediator '${z}' (descendant of source, ancestor of target) — conditioning on it blocks the effect under estimation.`);
      }
      if (descOfTarget.has(z)) {
        finding("EDGE-04", "edge", e.edge_id, "fail", "blocking",
          `Adjustment set contains '${z}', a descendant of the outcome — collider/selection bias risk.`);
      }
    }
  }

  const pass_summary = {
    passes: findings.filter((f) => f.status === "pass").length,
    failures: findings.filter((f) => f.status === "fail").length,
    warnings: findings.filter((f) => f.status === "warning").length,
    blocking_count: findings.filter((f) => f.status === "fail" && f.severity === "blocking").length,
  };
  return { findings, pass_summary };
}
