# Changelog

All notable changes to `design-yoma` are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-08-14

Restructured from a gate sequence into a five-phase professional methodology, matching the evolution
the Design POD went through.

### The essential move

> Keep the controls in the runtime. Expose the journey to the professional.

Twenty-two visible gates became **five phases the provider experiences** and **twenty-five internal
controls the runtime enforces**. Nothing was relaxed — every control still produces a document that is
schema-valid, immutable, hashed, previewable and played back. It is simply no longer the provider's
job to administer them.

### Changed

- **Phases renamed and regrouped** to the professional-service arc: Discovery (5 controls), Design (8),
  Validation (5), Testing (2), Deployment (5). Replaces Onboard/Qualify/Blueprint/Configure/Launch.
- **Per-artifact approvals → phase commitments.** One atomic decision per phase, taken after a
  playback, binding to the document hashes it commits to. Blockers cannot be committed past; an
  accepted-for-later item can, and travels forward.
- **Linear chain → semantic dependencies.** A changed document marks only the controls that *consume*
  it, by hash. Unaffected phases stay committed. A reward change no longer invalidates the
  safeguarding tier.
- **Per-gate review → one blueprint review.** Specialist references still validate documents during
  authoring; a single independent reviewer then assesses the whole blueprint as a system, through
  immutable rounds. Every finding must name its consequence for a young person.
- **Blocking → governed checklists.** The blocker list is closed and covers correctness, safety,
  authority and genuine readiness. Everything else is accepted-for-later with a named owner.
- **"Finished design" → evidence-backed deployment.** Six explicit steps from phase commitments to
  verified network receipt. Nothing is described as published without the receipt.
- Two new controls the phase structure required: `integrated_blueprint_check` (Testing) and
  `domain_documentation` split from `pod_constitution` (Deployment).
- `reward_and_settlement` (C16) precedes `verification_authority` (C17), preserving the ordering fix
  from 0.1.0.

### Added

- `references/internal-controls.md` — the twenty-five controls, their consumes-map, and the document
  envelope with its hash-binding.
- `references/phase-commitments.md`, `references/semantic-dependencies.md`,
  `references/blueprint-review.md`, `references/publication-sequence.md`,
  `references/conversational-companion.md`.
- `templates/phase-commitment.yaml`, `templates/review-round.yaml`.
- `scripts/lint-structure.sh` — replaces `lint-gates.sh`; also checks that no gate-era numbering
  survives outside genuine rubric-schema contexts.
- A third negative fixture, `stale-review.yaml`, covering a blueprint changed after review passed and
  a phase committed with a blocker open.

### Notes

- Twenty-five controls, not the seventeen of the professional-services methodology. The difference is
  the youth-protection work professional services does not need: safeguarding tiering, accessibility,
  fraud resistance, bid design as an authorization decision, and instructions that disclose every rule
  that can reject. These are not collapsed to reach a rounder number.
- `qi/eval.engine` stage 1 preflight moved into Testing, so a rules error surfaces before any
  irreversible publication work.

## [0.1.0] — 2026-08-14

Initial scaffold.

### Added

- `SKILL.md` — registry-conformant entry point: safety boundary, Phase 0 preflight with capability
  inventory, delegation rules, five-phase model, twenty-two-gate routing table, canonical Deed flow,
  and the `design_decision` output shape.
- Five phase references (`phase-1-onboard` … `phase-5-launch`) carrying gate criteria, scored rubrics,
  critical-fail flags, and gate-to-progress conditions.
- Eleven cross-cutting references: `deed-model`, `risk-tiering`, `safeguarding`, `accessibility`,
  `bid-design`, `claim-and-rubric-design`, `fraud-resistance`, `flow-composition`, `deployment`,
  `readiness-progression`, `delegation`.
- Templates: `deed-blueprint-output.yaml`, `bid-form.json`, `bid-rubric.yaml`, `claim-rubric.yaml`,
  `deed-flow-plan.json`, `opportunity-document.jsonld`.
- Scripts: `validate-blueprint.ts`, `lint-gates.sh`.
- Fixtures covering the tree-planting worked example and two negative cases.

### Design notes

- Gate discipline adapted from the IXO/Qi Design POD suite (16 stages), retargeted to Deeds and
  extended with `safeguarding_screen`, `accessibility_inclusion`, `fraud_resistance`,
  `pod_constitution`, `bid_and_eligibility`, and `rubric_publication`.
- Participation is gated by **bids**, not by escrow. Bid approval is what grants a youth
  `SubmitClaimAuthorization` on the claim collection.
- Rubric publication binds to `qi/eval.engine` and preserves its three-stage order: read-only
  preflight must fail before any irreversible registration or publication work.
- Yoma listing is expressed as a domain card `relatedDocument[]` entry typed `yoma:Opportunity`
  pointing at a plain VFS URL, per `ixoworld/domainCards`.
- `reward_and_settlement` was moved ahead of `verification_authority` in Phase 4 (gates 16 and 17).
  Determination is tiered by risk *and value*, so the reward has to be settled before the threshold
  that depends on it. The original ordering was a circular dependency, caught by
  `scripts/validate-blueprint.ts` against the worked example.
- `qi/eval.engine` is in the editor's action registry but not in `manage-flow`'s published catalog.
  `references/flow-composition.md` records this gap and the fallback rather than assuming it away.

### Unresolved

- Consent capacity policy at control C12 `rights_and_consent` ships as a configurable default (age-tiered: under-18 requires
  verified guardian consent, 18+ self-consents) pending an explicit provider-side decision.

[0.1.0]: https://github.com/ixoworld/ixo-agent-skills/tree/main/skills/design-yoma
