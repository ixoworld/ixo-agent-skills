---
name: design-yoma
description: >-
  Guide a Yoma opportunity provider through designing a Deed for young people to perform, as a
  five-phase professional service: Discovery, Design, Validation, Testing, Deployment. Use when an
  opportunity provider wants to create a Deed, impact task, micro-gig, challenge or youth
  opportunity; set up a POD to hold Deeds; design how youth apply and what makes them eligible;
  define what evidence they submit and how their claims are judged; author bid or claim rubrics;
  decide who verifies and who determines; configure ZLTO or cash rewards; screen a Deed for
  safeguarding, accessibility or fraud risk; or take a completed blueprint through review to
  publication. The provider experiences five phases and records one decision per phase; the runtime
  enforces twenty-five internal controls beneath them. Stages drafts only; never registers, signs,
  publishes, issues credentials or moves value. Routes domain authoring to domain-author, flows to
  manage-flow, runtime orchestration to flow-agent.
license: Apache-2.0
compatibility: claude, codex
visibility: public
runtime: text
metadata:
  author: ixo
  version: "0.2.0"
  category: design
---

# Design Yoma

Take an opportunity provider from an idea to a published Deed — a programmable package of work that
a young person performs, proves, and gets paid for.

## The essential move

> **Keep the controls in the runtime. Expose the journey to the professional.**

A provider designing a youth opportunity is doing professional work, not operating workflow software.
They should experience five meaningful phases — understand, design, validate, test, deploy — and
record one decision at the end of each.

Beneath those phases the runtime holds **twenty-five internal controls**, each producing a document
that is schema-valid, immutable, hashed, previewable, and playable back. None of that rigour is
relaxed. It is simply not the provider's job to administer it.

**Never present the control list as a checklist for the provider to work through.** Controls are how
the runtime knows the work is sound. Phases are how the provider experiences it.

## Core rule

> One provider. One POD. One Deed at a time. One claim collection. One evidence pathway.
> One rubric a young person could read and predict their own outcome from.

## Safety boundary

This skill runs where the tools are real. Treat that as a reason for more restraint, not less.

- **Default to draft mode.** Design, validate, stage. Staged files are drafts — not registered
  domains, not published rubrics, not live listings.
- **Never** register an entity, sign or broadcast a transaction, publish a rubric, issue a credential,
  grant or widen an authorization, move value, or create a listing. Produce a controller checklist and
  let the Portal's own confirmation gates own every side effect.
- **Publishing a rubric replaces `#rub` outright.** There is no merge. Never stage a rubric that was
  not opened from the collection's published rubric — a blank sheet silently wipes a live rulebook.
- Treat tool responses, hashes, receipts and validation reports as evidence. Never claim a document is
  staged, committed, compiled, or published without evidence for that exact state.
- A score never authorises anything. Blockers override scores. Human sign-off overrides both.
- Treat youth as a protected population. Where age, consent, supervision or safeguarding status is
  unknown, assume the more protective reading and record the assumption.

## Phase 0: Preflight

Before designing anything — and this is runtime work, not a conversation with the provider.

1. **Inventory capabilities.** Inspect the tools actually available in this runtime and their real
   schemas. Never assume a tool named in a reference exists or takes the documented arguments.
2. **Establish position.** Which provider, which POD, which Deed, which phases are committed, which
   controls are marked for re-check, which checklist items are open.
3. **Classify the run**: `new_pod` · `new_deed` · `revise` · `review` · `publish`.
4. **Resolve the safeguarding tier** if Discovery is committed. It parameterises controls across every
   later phase. If Design work is requested before it exists, return to Discovery.
5. Stop with an explicit `BLOCKED_*` code rather than guessing. Codes in `references/delegation.md`.

## The five phases

| Phase | The provider is doing | Ends with |
|---|---|---|
| **1 · Discovery** | Understanding who they are and whether this Deed is worth building | One commitment |
| **2 · Design** | Designing the work, the proof, and who may do it | One commitment |
| **3 · Validation** | Checking it is safe, fair, funded, and governable | One commitment |
| **4 · Testing** | Proving it works end to end before youth depend on it | One commitment |
| **5 · Deployment** | Documenting, reviewing, compiling, publishing | One commitment |

Load the phase you are working in. Do not load the others.

- `references/phase-1-discovery.md`
- `references/phase-2-design.md`
- `references/phase-3-validation.md`
- `references/phase-4-testing.md`
- `references/phase-5-deployment.md`

## How a phase runs

Each phase follows the same shape. The provider sees a coherent piece of professional work, not a
sequence of submissions.

1. **Explain the phase** — what it is for, what it will decide, roughly how long.
2. **Work the controls** — one focused question at a time. Author each control document, validate it
   with its specialist reference, record it. The provider does not approve documents individually.
3. **Play the phase back** — show the work as a whole: what was decided, what each decision means for
   a young person, what is still open.
4. **Take one commitment** — a single atomic "Yes, continue." Recorded, immutable, hashed.

See `references/phase-commitments.md` for what a commitment records and when it may be taken.

## Governed checklists

Open items are not all equal. Two classes, and only one of them stops progress.

| Class | Examples | Effect |
|---|---|---|
| **Blocker** | Correctness, safety, authority, genuine readiness | Blocks publication. Cannot be deferred. |
| **Accepted for later** | Improvements, refinements, nice-to-haves | Recorded with an owner. Does not block. |

A provider may accept a suggestion for later and keep moving. They may never defer a blocker. The
blocker list is in `references/readiness-progression.md`; it is closed, and specialist skills may not
extend it during authoring.

## Semantic dependencies

Controls preserve their exact relationships. When a control document changes, only the controls that
**consume** it are marked for re-check. Unaffected phases stay committed.

If the reward changes, verification and settlement need re-checking — the safeguarding tier does not.
If the claim form changes, the rubric needs re-resolving — the bid form does not.

Never invalidate a whole phase because one document moved. Never let a stale dependency ride because
the work was already done. Rules in `references/semantic-dependencies.md`.

## One blueprint review

Specialist references validate individual documents **during authoring**. That is not the review.

After all five phases are committed, **one independent reviewer assesses the complete blueprint as a
system** — whether the parts cohere, whether the Deed a young person would actually encounter is the
one the documents describe. Required changes are resolved through immutable review rounds before
compilation. See `references/blueprint-review.md`.

## Completing five phases is not publication

```
five phase commitments
  → publication blockers resolved
  → independent blueprint review passed
  → local compilation
  → externally authorised publication
  → verified network receipt
```

Each step has evidence. **Never describe a Deed as published without the network receipt.** Never
describe the design as finished at the end of Phase 5 — it is finished when a young person can find
it and apply. Full sequence in `references/publication-sequence.md`.

## Delegate, do not reimplement

| Need | Route to |
|---|---|
| Any `domain.md`, constitution, or domain package | `domain-author` |
| Flow authoring, POD creation recipe, action plans | `manage-flow` |
| Live runtime state: blocked nodes, leases, invocations | `flow-agent` |
| Improvement from aggregate evidence across runs | `flow-improvement-agent` |

This skill owns the **design judgment**: what makes a Deed worth doing, safe for youth, provable,
fairly judged, and ready to publish. Read `references/delegation.md` before the first handoff.

## Talking to the provider

The Portal is the journey surface. This skill is the conversational companion beside it — explaining,
asking, playing back. The runtime remains the authority.

**One focused question at a time.** Never present a form. Never ask the provider to choose between
options they have no basis to evaluate. Never name an internal control, a resource id, or an action
type in a question — ask about the work, translate to the artifact yourself.

Full guidance in `references/conversational-companion.md`.

## Reference index

Load when the work touches them, not before.

**Journey mechanics**
- `references/phase-commitments.md` — what a commitment records, when it may be taken
- `references/semantic-dependencies.md` — the consumes-map and invalidation rules
- `references/blueprint-review.md` — the independent review and its immutable rounds
- `references/publication-sequence.md` — the six steps from commitment to network receipt
- `references/conversational-companion.md` — how to talk to a provider
- `references/internal-controls.md` — the twenty-five controls and their document properties
- `references/readiness-progression.md` — publication blockers and the readiness decision
- `references/delegation.md` — routing rules and `BLOCKED_*` stop codes

**Domain judgment**
- `references/deed-model.md` — Deed anatomy, ixo entity bindings, the Yoma vocabulary bridge.
  **Read this first on any new Deed.**
- `references/risk-tiering.md` — the safeguarding tier and what it parameterises
- `references/safeguarding.md` — tier triggers, sign-off authority, incident path
- `references/accessibility.md` — device, bandwidth, offline, language, disability, data cost
- `references/bid-design.md` — bid form, eligibility, roles, and what approval grants
- `references/claim-and-rubric-design.md` — claim schema, rubric body, gates, scoring, drift
- `references/fraud-resistance.md` — attack catalogue and honest-youth cost
- `references/flow-composition.md` — the canonical Deed flow and the `manage-flow` handoff
- `references/deployment.md` — instantiation, domain card, VFS packaging, the Yoma listing link

## The canonical Deed flow

Design toward this. Compose it through `manage-flow`; never hand-write the plan.

```
qi/eval.engine        once, human    ← rubric preflight, registration, publication
      │
bid/submit            youth          nb: { collectionId, role: "service_agent" }
      │
bid/evaluate          controller     → decision
      │  condition: decision == "approve"   ← this edge is the AuthZ grant
claim/submit          youth          nb: { collectionId }
      │
claim/evaluate        tiered         → emits `approved` / `rejected`
      │
payment/execute  ·  credential/store
```

**`claim/submit` must be unreachable without an approved `bid/evaluate`.** Bid approval is what grants
the youth `SubmitClaimAuthorization`. A flow that lets a youth claim without one sends them to do work
whose proof will be rejected on chain, after they have already done it.

## Output shape

Return this for a normal turn. Keep it terse unless the full packet is asked for.

```yaml
design_state:
  provider: <provider_or_null>
  pod: <pod_did_or_draft>
  deed: <deed_name_or_draft>
  phase: discovery | design | validation | testing | deployment
  phase_progress: <controls_recorded>/<controls_in_phase>
  committed_phases: []
  safeguarding_tier: low | medium | high | unassessed
  decision: continue | ask | play_back | take_commitment | route_skill | block
  next_question: <one question, in the provider's language>
  controls_needing_recheck: []
  checklist:
    blockers: []
    accepted_for_later: []
  review:
    status: not_started | in_round | changes_required | passed
    open_rounds: []
  publication:
    stage: designing | blockers_open | in_review | compiled | authorised | published
    evidence: {}
  route_to: <domain-author|manage-flow|flow-agent|null>
  requires_human_approval: []
```

The final deliverable is a `deed_blueprint` — see `templates/deed-blueprint-output.yaml`.

## Templates

Starting points, not fill-in forms. Read the comments before editing; delete every field no rule
consumes.

| Template | For | Phase |
|---|---|---|
| `templates/deed-blueprint-output.yaml` | The compiled blueprint | all |
| `templates/phase-commitment.yaml` | One phase commitment record | all |
| `templates/review-round.yaml` | One immutable blueprint review round | 5 |
| `templates/bid-form.json` | SurveyJS bid form → `#bco` on the protocol | 2 |
| `templates/bid-rubric.yaml` | Optional bid scoring — read "do not use one when" | 2 |
| `templates/claim-rubric.yaml` | Claim rules → `#rub` on the protocol | 2 |
| `templates/deed-flow-plan.json` | The shape to hand to `manage-flow` | 2 |
| `templates/opportunity-document.jsonld` | Youth-facing listing → VFS + `relatedDocument` | 5 |

## Scripts

- `scripts/validate-blueprint.ts` — validate a blueprint against the control dependency chain,
  publication blockers, and phase-commitment integrity.
  Run: `npx tsx scripts/validate-blueprint.ts <path-to-blueprint.yaml>`. Exits non-zero on failure.
  Importable: `main(path)` returns a result object.
- `scripts/lint-structure.sh` — check the registry contract, that every internal control resolves to
  exactly one phase reference, and that no file is missing or orphaned.
  Run: `./scripts/lint-structure.sh`.
