# Evidence Admissibility

Rules the evidence mapper and validator apply before any artifact may back a claim node or
edge. An artifact that fails admissibility is not "weak evidence" — it is **not evidence**,
and the dependent edge keeps (or reverts to) its prior validation status.

Admissibility is evaluated per `(artifact, claim)` pair and recorded on the
`ClaimEvidenceLink`, never globally: the same dataset can be admissible for an output claim
and inadmissible for an outcome claim.

## The five gates

Evaluate in order; stop at the first hard failure.

### 1. Integrity
- Content hash recorded at ingestion matches current content; hash and location are stored on the `EvidenceArtifact`.
- Signed artifacts: signature verifies against the producer's key/DID document.
- Derived artifacts (cleaned datasets, transcripts, OCR output) reference their parent artifact and the transformation applied; a derivation with no parent ref fails.

### 2. Authority
- The producer is identified (DID, account, or named organization) and is authorized for this artifact class — e.g. field measurements from the delivery partner are admissible as monitoring data but not as independent verification.
- Independence requirement: Tier 3 issuance-critical edges need at least one artifact whose producer is independent of the implementing party. Self-reported data alone caps the edge at `plausible`.
- Independence is computed by THIS pipeline (the live evals-engine has no independence
  computation): build an origin graph over corroborating sources with edges joining artifacts
  that share any `origin_keys` value (`submitter`, `device`, `api_origin`, `issuer`,
  `funding_source`, `pipeline_run`); effective source count = connected components. Two
  datasets from the same funder are one source.
- Provenance classes use the engine's live ordinal vocabulary: `server_verified` >
  `attested` > `client_assisted`. Data the claimant helped produce is `client_assisted`;
  when authoring rubrics, express the consequence with the engine's per-criterion
  `requireSource` (provenance floor) and `trustCap` (bps ceiling) — e.g. cap
  client_assisted-only criteria at 8000 bps. Note the engine's realism: nearly all claim-form
  answers are `client_assisted`; `ExternalSource` results (our graph oracle included) are the
  server-verified inputs.
- C2PA: for image evidence, the engine verifies C2PA provenance and short-circuits proven
  AI-generated images out of the AI lane — link admissibility should record C2PA status when
  present rather than re-deriving it.
- Conflicts of interest are declared on the link, not hidden in prose.

### 3. Freshness
- Every artifact carries an observation/collection time (not just an upload time).
- The issuance policy declares a freshness window per claim class (default: outcome measurements ≤ 24 months old at issuance; context data ≤ 36 months). Stale artifacts downgrade to background/context status.
- Freshness is re-evaluated at re-issuance, not inherited.

### 4. Relevance & completeness
- The artifact actually measures the indicator on the linked node (construct match), for the claimed population and period (coverage match).
- Partial coverage is recorded as a coverage fraction on the link; silent extrapolation from a subsample to the whole population fails this gate.
- For edges: evidence must bear on the *relationship* (comparison, dose-response, mechanism trace), not merely on the level of one endpoint. Endpoint-only evidence supports nodes, not edges.

### 5. Provenance chain
- The chain from raw observation → processing → artifact → claim link is recorded and resolvable.
- Any human judgment step (coding, cleaning decisions, exclusions) is attributed.
- Missing chain links are declared as assumptions on the link, and cap the dependent edge at `plausible`.

## Finding vocabulary note

Admissibility findings use the outcome-graph layer taxonomy (`integrity`, `authority`,
`schema`, `semantic`, `cross_evidence`, `quality`, `adversarial`) with statuses
`pass|fail|warning` and severities `blocking|warning|info`. This taxonomy is OURS — the live
engine's check vocabulary is different (gate classes, gate outcomes, bind errors) and our
findings do not export into it. Where an admissibility conclusion must reach the engine, it
travels as a graph-oracle `ExternalSource` answer (see tools/outcome-graph-source.md), not as
a findings document. The five gates map to layers as: integrity → `integrity`; authority and
provenance chain → `authority`; freshness → `quality`; relevance & completeness →
`semantic` / `cross_evidence`; evidence-shopping and self-certification (below) →
`adversarial`.

## Admissibility outcomes

Each evaluated link gets exactly one of:

- `admissible` — all five gates pass for this claim.
- `admissible-with-disclosures` — passes with declared assumptions/COIs that MUST surface in the credential's evidence section.
- `inadmissible` — a hard gate failed; reason recorded; artifact remains in the graph as an inadmissible-link record (for audit), carrying zero evidential weight.

## Evidence gaps are first-class

Where a required artifact does not exist, create an `EvidenceGap` object (see
`schemas/evidence-link.schema.json`): which node/edge it blocks, what artifact class would
fill it, who could produce it, and the tier attainable with vs. without it. Gaps flow into
the review packet and the issuance decision; they are never demoted to prose notes.

## Anti-gaming rules

- **No evidence shopping:** if multiple artifacts measure the same indicator, all must be linked; selecting favorable ones and omitting others is recorded as a validation failure (`EMP-04` multiplicity risk).
- **No self-certification loops:** an artifact produced by an agent in this pipeline (e.g. an AI summary) is never evidence for a claim; it is working material. Only external-world observations and attestations are evidence.
- **No admissibility by volume:** many inadmissible artifacts never sum to one admissible artifact.
