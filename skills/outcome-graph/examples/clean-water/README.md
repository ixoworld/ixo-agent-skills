# Worked example: Safe Water for Kitui

A minimal but complete pass through the pipeline for a WASH program:
borehole rehabilitation → functional water points → household use of safe water →
reduced under-5 waterborne disease, with seasonal rainfall as a measured confounder.

## Files

| File | Artifact | Produced at state |
|---|---|---|
| [run-brief.json](run-brief.json) | `outcome.run-brief.v1` — why the run exists, what it covers, its sources and its target tier (3). The canvas reads it for the phase-1 card; everything downstream is measured against the target it names | `SOURCE_ACCEPTED` |
| [toc-extraction.json](toc-extraction.json) | `outcome.toc-extraction.v1` — 7 typed propositions with provenance; note p-06 is `ai_inferred` (the rainfall confounder, absent from the narrative) and p-03 carries an unresolved ambiguity | `TOC_PARSED` |
| [causal-graph.json](causal-graph.json) | `outcome.causal-graph.v1` — 5 nodes, 5 edges; e3-use-disease is the issuance-critical outcome edge with `adjustment_set: [n-rainfall]` and `estimand: att`; e4/e5 model the back-door path the adjustment blocks | `CAUSAL_GRAPH_DRAFTED` |
| [evidence-graph.json](evidence-graph.json) | `outcome.evidence-graph.v1` — 3 artifacts (implementing-party maintenance log with client_assisted disclosure, independent DHIS2 surveillance, and a **verified_claim artifact carrying a UDID receipt — the claim-supports-claim link**), 4 links with per-link admissibility, 1 open gap (household survey) that caps the run at Tier 2 | `EVIDENCE_GRAPH_LINKED` |
| [validation-report.json](validation-report.json) | `outcome.validation-report.v1` — 8 findings across all three passes; promotes e3 to `plausible` on the admissible comparison evidence; `attainable_tier: 2` capped by the household-survey gap; records the output claim's engine evaluation (receipt CID) | `VALIDATION_RUNNING` |
| [issuance-request.json](issuance-request.json) | `outcome.issuance-request.v1` — the eight issuance gates evaluated one by one, and the decision they force: `issue_at_lower_tier`. Target tier 3, `computed_tier` 2 from the report's `attainable_tier`, because the cited subgraph cannot include the hypothesized `e2-functional-use` that the open household-survey gap sits on | `ISSUANCE_ELIGIBLE` |
| [outcome-certificate.json](outcome-certificate.json) | The signed `OutcomeCertificate` — a W3C VC 2.0 document (`id` + `type[]`, **no `schema` field**, which is why `run.mjs record` classifies it by shape). Tier 2 `evidence-backed-contribution`, certifying the output edge only, with the four disclosures that make a capped tier honest. Its `proof` is an obvious placeholder: this is a fixture, not a credential | `CERTIFICATE_ISSUED` |
| [rubric.json](rubric.json) | Live evals-engine rubric (JSON-LD `ixo:entity#rubric`) for the edge-claim class: 4 gates (incl. graph-oracle admissibility via `ExternalSource` and supporting-receipt count), 4 weighted criteria (graph-oracle validation score, mechanism `AiCheck`, comparison-coverage bands, analyst `ManualScore`), a `HumanReview` task, dedup keyed on (graph version, edge), and prorated settlement. Validates against the vendored engine schema | anchored as `#rub` on the claim class's protocol entity |
| [claim-form.catalog.json](claim-form.catalog.json) | The edge-claim form's field catalog — every `$ref` in rubric.json binds against these fields; the deployed form's hash goes into `claimSchema.proof` | the `#vct` side of the dual pin |
| [geo-boundary.json](geo-boundary.json) | `outcome.geo-boundary.v1` — the program catchment as canonical integer micro-degree geometry (concave polygon + quarry exclusion hole) plus registered water points; `boundary_id` is the **real** CIDv1 of the canonical `boundary` bytes, digest-verified by the oracle before every geo answer | anchorable as a collection LinkedResource |
| [rubric-site-visit.json](rubric-site-visit.json) | Site-visit (output-claim) rubric using the oracle's `within-boundary`/`within-radius` geo checks — the rfc-005 `ExternalSource` plan (owner read 2026-08-16: native geo is ~2 quarters out). Boundary address pinned in gate `OSV-001` (geometry inside the rubric hash), 250 m radius pinned in `send`, GPS drift routed to review | anchorable today |
| [claim-form.site-visit.catalog.json](claim-form.site-visit.catalog.json) | The site-visit form catalog — coordinates as integer micro-degree number fields | pairs with rubric-site-visit.json |
| [v2-pending/](v2-pending/) | The **native-geo twin** (rubric + catalog with `geo`-kind fields): same checks as `withinBoundary`/`withinRadius` operators against `ctx.collection.projectBoundary` — the rfc-005 §4.2 devnet rubric. Validates against the served schema today; the binder rejects it (`BIND_V2_SURFACE`). **Do not anchor** until activation | staged for activation day |

## What this example demonstrates

- **Honest inference marking**: the rainfall confounder was not in the program narrative; it
  enters as `ai_inferred` with rationale, and the graph models both halves of the back-door
  path (e4, e5) so the adjustment set on e3 is justified rather than decorative.
- **Evidence bearing on relationships**: the surveillance dataset links twice — to the outcome
  node (levels) and to edge e3 with `bears_on_relationship: true` (program-vs-comparison
  catchments). The maintenance log links only to the output node; it can't support an edge.
- **The tier math**: gap g-1 records `tier_with: 3, tier_without: 2` — without household
  water-use measurement, edge e2 stays unevidenced and the program honestly certifies
  evidence-backed contribution (Tier 2), not a causal effect (Tier 3).
- **The engine boundary**: the rubric never sees the graph. Structural and admissibility
  verdicts reach it as `ExternalSource` answers from the outcome-graph oracle
  (tools/outcome-graph-source.md); claim-supports-claim travels as receipt CIDs in the
  `supportingReceipts` form field; judgment lives in an authored review task with enumerable
  answers, not prose.
- **Geo as admissibility, twice**: the site-visit rubric binds the claim to place — inside
  the digest-verified catchment (`out_of_authority` when not) and within 250 m of the
  registered water point (review on GPS drift) — through the oracle today, with the
  byte-identical native-operator twin staged in `v2-pending/` for the day the engine
  activates its geo surface. Same integer math either way (`scripts/lib/geo.mjs`), so
  migration is a re-hash, not a re-design.

## Run it

```bash
npm run validate
```

```bash
node scripts/check-graph.mjs examples/clean-water/causal-graph.json
```

The first validates every schema and these artifacts against them; the second runs the
deterministic structural checks (expects exit 0, findings all `pass`).
