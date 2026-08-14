# Internal Controls

The twenty-five controls the runtime enforces beneath the five phases.

**This reference is runtime-facing.** Never show this list to a provider, never ask them to work
through it, never name a control in a question. They experience five phases. The controls are how the
runtime knows the work is sound.

## Document properties

Every control produces exactly one document, and every document is:

| Property | Meaning |
|---|---|
| **Schema-valid** | Conforms to its shape in the phase reference. Validated at authoring, not at commitment. |
| **Immutable** | Once recorded, never edited. A change produces a new version with a new hash. |
| **Hashed** | Content-addressed. The hash is what a phase commitment actually commits to. |
| **Previewable** | Can be rendered for the provider in plain language, on demand. |
| **Played back** | Shown as part of the phase playback before a commitment is taken. |

A document that cannot be previewed in language a provider understands is not finished, however valid
its schema.

## The controls

### Phase 1 · Discovery — 5 controls

| # | Control | Produces | Consumed by |
|---|---|---|---|
| C1 | `provider_onboarding` | Provider identity, owner, admin account, controller set, support channel | C2, C10, C12, C13, C17 |
| C2 | `pod_constitution` | POD purpose, roles, treasury, collections, agent register, linked oracle | C10, C13, C15, C16, C21 |
| C3 | `deed_intent` | Scored intent, youth value statement | C5, C6, C16 |
| C4 | `safeguarding_screen` | **Safeguarding tier**, trigger record, sign-off | C7, C10, C12, C16, C17, C19 |
| C5 | `impact_model` | Metrics, baseline, target, acceptance, failure condition | C9, C11, C24 |

### Phase 2 · Design — 8 controls

| # | Control | Produces | Consumed by |
|---|---|---|---|
| C6 | `task_design` | Steps, effort, duration, prerequisites, skills earned, exceptions | C8, C9, C16 |
| C7 | `accessibility_inclusion` | Device floor, bandwidth, offline, languages, data cost, accommodations | C8, C9, C10, C11, C22 |
| C8 | `youth_instructions` | What the youth reads, worked examples, disclosed rejection reasons | C11, C22 |
| C9 | `evidence_capture` | Evidence registry, capture method, sensitivity, retention | C11, C14 |
| C10 | `bid_and_eligibility` | Bid form `#bco`, eligibility, capacity, evaluator | C12, C13, C14, C16 |
| C11 | `claim_and_rubric` | Claim form `#vct`, rubric draft, reason codes | C13, C14, C17, C20, C21 |
| C12 | `rights_and_consent` | Authz plan, room permissions, consent, retention | C13, C15, C20 |
| C13 | `deed_flow` | Flow plan, actor assignment, conditions, branch completeness | C19, C20, C21 |

### Phase 3 · Validation — 5 controls

| # | Control | Produces | Consumed by |
|---|---|---|---|
| C14 | `fraud_resistance` | Threat list, controls, siting, honest-youth cost | C18, C20, C24 |
| C15 | `ai_assistance` | Agent register, propose-only scope, token budget, override path | C17, C18 |
| C16 | `reward_and_settlement` | Reward per rail, capacity, runway, funding position, exhaustion | C17, C18, C22 |
| C17 | `verification_authority` | Determination map, thresholds, dispute path, time limit | C19, C23, C24 |
| C18 | `governance_risk` | Risk register, approval gates, residual risk, escalation | C23 |

`reward_and_settlement` precedes `verification_authority`: determination is tiered by risk **and
value**, so the reward must be settled before the threshold that depends on it.

### Phase 4 · Testing — 2 controls

| # | Control | Produces | Consumed by |
|---|---|---|---|
| C19 | `pilot_run` | Pilot record, path proven including a rejection, timings, defects | C20, C23 |
| C20 | `integrated_blueprint_check` | Cross-control coherence result, rubric preflight result | C23, review |

`integrated_blueprint_check` is not the blueprint review. It is an automated cross-check that the
controls agree with each other — that the listing does not promise what the rubric will not accept,
that the instructions disclose every rule that can reject, that capacity does not exceed runway. The
independent review comes later and looks at the Deed as a whole.

It also carries the **read-only preflight** of `qi/eval.engine`, so a rules error surfaces here rather
than during publication.

### Phase 5 · Deployment — 5 controls

| # | Control | Produces | Consumed by |
|---|---|---|---|
| C21 | `rubric_publication` | Engine configuration, publication plan, blast radius, controller checklist | C23, publication |
| C22 | `domain_documentation` | Domain package via `domain-author`, domain card content | publication |
| C23 | `vfs_packaging_and_listing` | Opportunity document, VFS target, `relatedDocument` entry | publication |
| C24 | `launch_readiness` | Readiness decision, conditions with owners, publication blockers | publication |
| C25 | `operate_improve` | Operating model: watch signals, thresholds, incident responder, cadence | post-publication |

`operate_improve` is a **design-time control**, not the operating itself. It settles who watches what,
at what threshold, and who responds — before youth are in the Deed, not after.

## Control document envelope

```yaml
control_document:
  id: C11
  control: claim_and_rubric
  phase: design
  version: 1
  hash: <sha256 of the canonical body>
  authored_at:
  authored_by:
  supersedes: <hash or null>
  status: draft | recorded | needs_recheck | superseded
  consumes: []            # control ids this document depended on, with their hashes
  body: {}                # the control's own shape, per its phase reference
  preview: <plain-language rendering for the provider>
  checklist:
    blockers: []
    accepted_for_later: []
```

`consumes` carries the **hashes** it depended on, not just the ids. That is what makes invalidation
precise: if a consumed document's hash changes, this document is marked `needs_recheck`. See
`semantic-dependencies.md`.

## Counting honestly

Twenty-five, not the seventeen of the professional-services methodology. The difference is the
youth-protection work that professional services does not need:

- `safeguarding_screen` — tier assignment, and the sign-off it demands
- `accessibility_inclusion` — device, bandwidth, language, and data-cost reachability
- `fraud_resistance` — with the honest-youth cost of every control stated
- `bid_and_eligibility` — because participation is an authorization decision, not a signup
- `youth_instructions` — because a rule a young person was not told cannot fairly reject them

Do not collapse these to reach a rounder number. Each one exists because leaving it out lands on a
young person rather than on the provider.
