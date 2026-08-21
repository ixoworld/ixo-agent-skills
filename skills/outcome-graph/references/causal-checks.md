# Causal Validation Checks

Deterministic and judgment-based checks the validator runs against a candidate causal graph.
Run the three passes **in order**: semantic → structural/causal → empirical. A later pass never
compensates for a failure in an earlier one — a beautifully identified estimate over an
underspecified variable is still invalid.

Every check emits a `ValidationFinding` (see `schemas/validation-report.schema.json`) with:
the check id, a `layer` from the outcome-graph taxonomy (`integrity` | `authority` | `schema`
| `semantic` | `cross_evidence` | `quality` | `adversarial`), the node/edge it targets, a
status (`pass` | `fail` | `warning`), a severity (`blocking` | `warning` | `info`), and the
evidence or reasoning behind the result. This taxonomy is internal to the pipeline; where a
validation conclusion must reach the evals-engine it travels as a graph-oracle answer
(tools/outcome-graph-source.md), never as a findings export.

## Pass 1 — Semantic validation (per node)

Most weak theories of change fail here. Each node must satisfy ALL of:

| Check id | Test |
|---|---|
| `SEM-01` variable-definition | The node names a variable, not a vibe. "Community resilience" fails until operationalized; "households with ≥2 weeks food reserve" passes. |
| `SEM-02` measurability | At least one indicator with a measurement method, unit, and data source is attached or explicitly declared missing. |
| `SEM-03` unit-of-analysis | The node states WHO/WHAT changes (individual, household, facility, ecosystem, cohort). Mixed units on one node → split the node. |
| `SEM-04` temporal-placement | The node has a time scope (when it is expected to hold/change) consistent with its position in the graph. |
| `SEM-05` jurisdiction-context | Geographic/population scope is stated or inherited unambiguously from the graph context. |
| `SEM-06` provenance | The node traces to at least one source passage/artifact region in the original theory of change, or is explicitly tagged `ai-inferred` with rationale. |

Severity guidance: `SEM-01`/`SEM-02` failures on outcome nodes are `blocking` for issuance;
on context nodes they are `warning`. All Pass-1 checks map to the engine's `semantic` layer
except `SEM-06`, which is `authority`.

## Pass 2 — Structural / causal validation (graph + per edge)

### Graph-level (deterministic — run via tools, never by eyeball)

| Check id | Test |
|---|---|
| `DAG-01` acyclicity | No directed cycles. Feedback loops must be modeled as time-indexed node pairs (X_t → Y_t+1 → X_t+2), not cycles. |
| `DAG-02` connectivity | Every outcome node is reachable from at least one intervention node. Orphan outcomes are unsupported claims. |
| `DAG-03` temporal-order | For every edge A→B, time-scope(A) ≤ time-scope(B). Violations are `blocking`. |
| `DAG-04` node-type-coherence | Edge endpoints respect the type lattice: intervention → {output, mediator}; output → {mediator, outcome}; context/moderator nodes attach as effect modifiers, not on the causal spine. |
| `DAG-05` referential-integrity | Node and edge ids are unique; every edge endpoint resolves inside the candidate graph. |
| `DAG-06` single-graph-version | Checks and findings bind to one immutable graph digest; mixed-version evidence is void. This is a transition-bundle check, not part of `scripts/check-graph.mjs` yet. |

### Edge-level (judgment-based — validator reasons, then records)

| Check id | Test |
|---|---|
| `EDGE-01` mechanism-stated | The edge carries a mechanism narrative answering "by what process does A change B?" — not just "A leads to B". |
| `EDGE-02` directness | Is this edge direct, or should it be mediated? If a plausible mediator M exists and matters for measurement or intervention design, require A→M→B and mark the direct edge `contested`. |
| `EDGE-03` confounder-scan | Enumerate plausible common causes of A and B. Each becomes either a measured node, a declared assumption (`no-unmeasured-confounding` with rationale), or an open risk that caps the edge's validation status at `plausible`. |
| `EDGE-04` collider-discipline | No adjustment set may condition on a collider or a descendant of the outcome. Flag any indicator/covariate list that does. |
| `EDGE-05` polarity-and-dose | Causal polarity (increases/decreases/prevents/enables) is stated; where dose matters, the expected functional shape (monotone, threshold, saturating) is stated or declared unknown. |
| `EDGE-06` counterfactual-comparator | The edge states what the comparison state is (no intervention, business-as-usual, alternative program). "Compared to what?" must have an answer. |
| `EDGE-07` assumption-register | Every assumption the edge depends on is listed on the edge (`assumptions[]`), each tagged testable / monitorable / untestable. |
| `EDGE-08` homogeneity-transport | If the graph will be reused across sites/populations, note effect modifiers that threaten transportability. |

### Identification (per issuance-critical edge)

| Check id | Test |
|---|---|
| `ID-01` adjustment-set | A defensible adjustment set exists in the graph (back-door criterion) OR the edge is explicitly tagged `unidentified`. |
| `ID-02` no-mediator-conditioning | The proposed adjustment set contains no mediators of the effect being estimated. |
| `ID-03` estimand-declared | The target estimand (ATE, ATT, dose-response, distributional) is declared before any estimate is admitted as evidence. |

## Pass 3 — Empirical validation (per edge, evidence-regime dependent)

Match the method to the evidence regime; never upgrade an edge beyond what its regime supports.

| Regime | Admissible methods | Max attainable edge status |
|---|---|---|
| Randomized / natural experiment data | Design-based estimation, ITT/LATE | `supported` |
| Rich observational data | Matching, weighting, double ML, diff-in-diff, synthetic control — with declared assumptions | `supported` (with sensitivity analysis) or `plausible` |
| Monitoring data only (outputs, uptake) | Contribution analysis, dose-exposure correlation, process tracing | `plausible` |
| Literature / expert priors only | Evidence synthesis citing external studies, transportability argument | `plausible` |
| No evidence | — | `hypothesized` |

Mandatory checks where estimation is performed:

| Check id | Test |
|---|---|
| `EMP-01` regime-method-match | The method used is admissible for the actual data regime (table above). |
| `EMP-02` sensitivity | Report robustness to unmeasured confounding (e.g., E-value, Rosenbaum bounds, placebo/negative-control tests). Absent sensitivity analysis → cap at `plausible`. |
| `EMP-03` prediction≠causation | Predictive accuracy of a model is never admitted as causal evidence for an edge. |
| `EMP-04` multiplicity | If many edges are tested on one dataset, findings note the multiplicity risk. |
| `EMP-05` freshness | Evidence used is within the freshness window declared by the evidence-admissibility policy. |

## Edge validation status vocabulary

The only admissible values of `CausalEdge.validation_status`:

- `hypothesized` — extracted/proposed; no validation performed.
- `plausible` — passed semantic + structural checks; mechanism credible; empirical support weak, indirect, or literature-only.
- `supported` — passed all three passes with regime-admissible empirical evidence and sensitivity analysis.
- `contested` — checks produced conflicting findings, or a reviewer dissents; must carry the dispute record.
- `unidentified` — structurally valid but no defensible identification strategy exists with current graph + data.
- `rejected` — a check failed decisively (temporal violation, refuted by evidence, incoherent mechanism).

Only `supported` and (policy-permitting, with disclosure) `plausible` edges may sit on the
claim-evidence subgraph cited by an issued credential. `contested`, `unidentified`,
`hypothesized`, and `rejected` edges never may.

## Mapping engine verdicts onto edge statuses

When a node/edge claim is evaluated by the evals-engine (discovered via its cron after
on-chain submission), the result carries three layers: a coarse `Verdict`
(`approve | partial | reject | review`), a semantic `VerdictClass` (seven values), and a
chain status (`1 | 2 | 5`). Edge status updates branch on the **VerdictClass**:

| VerdictClass | Verdict | Chain | Edge status effect |
|---|---|---|---|
| `supported` | approve | 1 | → `supported` |
| `partial` | partial | 1 (prorated settlement) | → `plausible` with a scope disclosure: part of the claimed relationship held; the certificate wording must carry the partial scope |
| `refuted` | reject | 2 | → `rejected` |
| `invalid_evidence` | reject | 2 | unchanged; the offending `ClaimEvidenceLink` → `inadmissible`; fix evidence, submit a NEW claim (new body ⇒ new CID — the engine never re-evaluates a claimId) |
| `out_of_authority` | reject | 2 | unchanged; fix collection authorization/enrolment, submit a new claim |
| `insufficient_evidence` | review | 5 | stays at `hypothesized`/`plausible`; open an `EvidenceGap` |
| `requires_human_review` | review | 5 | → `contested` until the engine's review fold (or our review packet) resolves it |

Never branch on the chain status alone — code `2` aggregates three distinct classes, and
code `5` two. A `review` verdict is not terminal: the engine's `HumanReview` fold replays
the frozen decision with the reviewer's answers and lands on approve/partial/reject, so the
edge status update waits for the folded result, not the interim flag.

## Downgrade-not-pretend rule

When evidence is missing or weak, the correct action is ALWAYS to downgrade the edge status
and record the gap as a first-class `EvidenceGap` object — never to soften the claim wording,
widen the confidence interval prose, or let narrative coherence substitute for identification.
