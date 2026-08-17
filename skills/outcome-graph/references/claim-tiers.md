# Tiered Claim Model

Different projects can honestly support different epistemic standards. The Outcome Graph
preserves those distinctions in credential semantics instead of collapsing them into one badge.
A certificate always names its tier; a higher tier is never implied by narrative quality.

## The four tiers

### Tier 1 — Narrative plausibility
**Claim form:** "This theory of change is coherent and expert-reviewed."
**Requires:**
- Full graph extracted from source artifacts with provenance (`SEM-06` clean).
- All semantic checks passed (Pass 1).
- Structural checks passed (`DAG-01`–`DAG-05`).
- Human expert review recorded on the graph version.
**Does NOT assert:** that any outcome occurred or that the program caused anything.
**Certificate subject:** the `CausalGraphVersion` itself.

### Tier 2 — Evidence-backed contribution
**Claim form:** "The program plausibly contributed to observed changes in the named outcomes."
**Requires everything in Tier 1, plus:**
- Every issuance-critical node has linked indicators with actual measurements (not just plans).
- Evidence artifacts pass admissibility (integrity, authority, freshness, completeness — see `evidence-admissibility.md`).
- Issuance-critical edges at `plausible` or better; contribution story survives `EDGE-03` confounder scan with disclosed assumptions.
- Alternative explanations enumerated and addressed narratively (contribution analysis).
**Does NOT assert:** an estimated causal effect size.

### Tier 3 — Causally supported outcome
**Claim form:** "The program caused the named outcomes, with stated identification assumptions."
**Requires everything in Tier 2, plus:**
- Issuance-critical edges at `supported`: declared estimand (`ID-03`), defensible adjustment set or design (`ID-01`), regime-admissible estimation (`EMP-01`), sensitivity analysis (`EMP-02`).
- Identification assumptions listed verbatim in the credential's evidence section.
- Effect estimates carried with uncertainty intervals, never point estimates alone.

### Tier 4 — Issuance-ready certified outcome
**Claim form:** "A governed authority certifies the Tier-3 (or explicitly-scoped Tier-2) claim."
**Requires everything in the underlying tier, plus:**
- Issuance policy thresholds met (rubric scores ≥ policy minimums).
- Governance sign-off recorded (authorized reviewer decision on the review packet).
- Dispute window and revocation conditions attached.
- Credential signed by an authorized issuer; certificate references the exact graph version + evidence bundle hash.

## Tiers are NOT engine autonomy controls

The tier ladder is ours; the evals-engine governs autonomy with different, simpler machinery
(it deliberately removed its earlier maturity-rung ladder — "the ladder never gated
anything"). Keep the two apart:

- **Tier** = epistemic strength of the *claim* (how much the certificate asserts). Computed
  by this pipeline, carried in the certificate.
- **Engine autonomy** = whether an evaluation may act without a human, controlled by:
  (a) `enrolled_collections.allowChainEvaluation` — off by default; until enabled, verdicts
  never write to chain; and (b) the rubric's authored `HumanReview` block — pending review
  tasks downgrade approve/partial to `review`, and the reviewer's answers fold
  deterministically into the frozen decision (digest-bound replay, never a re-evaluation).

Consequences for issuance:

1. A Tier-3 certificate needs `supported` verdict classes on its issuance-critical claims —
   which, where the rubric includes ManualScore/HumanReview criteria, already implies the
   named reviewers answered. Design impact rubrics so contested judgments are authored
   review tasks, not out-of-band conversations.
2. Tier-4's governance sign-off is OUR gate, layered on top of the engine's review fold: the
   engine proves the evaluation; the issuance authority still signs the certificate decision.
3. New impact claim classes should launch with `allowChainEvaluation` off and review-heavy
   rubrics, relaxing toward autonomy only as calibration accumulates — same discipline the
   old rung ladder gestured at, now enforced where it actually holds.

## Rules for the orchestrator

1. **Tier is computed, never chosen.** The policy evaluator derives the maximum attainable tier
   from edge statuses and evidence states; agents may not propose a higher tier.
2. **Downgrade is always available.** If Tier 3 fails validation, offer Tier 2 issuance (if its
   gates pass) rather than blocking entirely — honest contribution beats blocked perfection.
3. **Tier appears in the credential type.** e.g. `OutcomeCertificate` with
   `assessmentTier: 2` and a human-readable tier label in `credentialSubject`.
4. **Mixed graphs issue at the minimum.** If the claim-evidence subgraph for a certificate
   spans edges at different statuses, the certificate tier is capped by the weakest
   issuance-critical edge.
5. **Re-issuance on evidence change.** New evidence can raise or lower the attainable tier;
   the graph version and credential are superseded, never edited in place.
