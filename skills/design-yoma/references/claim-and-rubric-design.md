# Claim and Rubric Design

Governs control C11, and constrains control C21. Read before drafting any rubric.

## The one rule a young person cares about

> A youth reading the rules should be able to predict their own outcome before they submit.

Everything below serves that. A rubric that is technically valid but unpredictable to the person being
judged has failed, whatever it scores.

## Where things live

| Artifact | Resource | Type | Anchored on |
|---|---|---|---|
| Claim form | `{id}#vct` | `surveyTemplate` | **Protocol** entity |
| Published rubric | `{id}#rub` | `rubric` | **Protocol** entity |

Both live on the protocol, not the Deed. Every collection pointing at that protocol is affected by a
change. Establish the blast radius first.

## Two hazards, before anything else

**1. Publication replaces `#rub` outright.** There is no merge. A draft that was not opened from the
currently published rubric will silently wipe live rules when published. On any live collection,
always open from the published rubric first — `BLOCKED_RUBRIC_NOT_OPENED_FROM_PUBLISHED`.

**2. The field catalog is the only source of pickable fields.** A rubric may only reference fields
that exist in the live `#vct`. If `#vct` changed after the rubric was authored, publication fails with
schema drift — `BLOCKED_RUBRIC_DRIFT`. Catching drift at control C11 is free; catching it at control C21 is
not.

## The claim form

Design `#vct` before the rubric — the rubric can only reference what the form collects.

| Check | Passes when |
|---|---|
| Evidence-aligned | Every field maps to an item in the control C9 evidence registry |
| Minimal | Every field is consumed by a rubric gate, criterion, or impact metric |
| Capturable | Answerable at the control C7 device floor, offline where required |
| Unambiguous | Two honest youth would answer the same situation the same way |
| Localised | Present in the languages from control C7 |

Field kinds available include text, number, date, choice, multichoice, boolean, file, signature,
keyed choice, cells, rows, keyed text, and geo. Prefer structured kinds over free text — free text
cannot be evaluated consistently and forces human review that may not have capacity.

## Rubric structure

```yaml
# RubricEnvelope
"@context": {ixo, "@id", type, "@protected"}
type: "ixo:entity#rubric"
rubric:
  "@type": Rubric
  title:
  description:
  claimSchema:               # REQUIRED
    "@type": ClaimSchemaBinding
    protocol:                # the protocol DID
    resource: "#vct"
    proof:                   # the form's content hash
  derived: []                # named pure computations, referenced as ~name
  sources: []                # external checks, read as ext.<name>.*
  aiChecks: []               # AI checks, read as ai.<name>.*
  unique: {}                 # duplicate-claim detection
  frequency: {}              # submission-rate limit
  gates: []                  # hard pass/fail, in document order
  scoring: {}                # weighted judgement
  review: {}                 # human review policy
  settlement: {}             # what an outcome pays
```

Requires `@type`, `claimSchema`, and **at least one of** `gates` or `scoring`.

The envelope deliberately carries **no `@id`** and **no fixtures**. The rubric id *is* the SHA-256 of
the canonical bytes — a document cannot contain its own hash, and anything that changes the bytes for
a non-rule reason changes the id. Identical rules produce an identical id.

## Gates

Gates run **first, in document order. The first failure is terminal.** Order them so the cheapest and
most common failure is caught first — a youth should not wait on an AI check to be told they left a
required photo out.

```yaml
- "@type": Gate
  code: TREE-01-PHOTO-MISSING     # ^[A-Z0-9]+-[0-9]+-[A-Z0-9-]+$
  reason: No photo of the planted tree was submitted.
  appliesWhen: {}                 # optional guard
  when: {}                        # the failing condition
  onFail: reject | review
  class: refuted | invalid_evidence | out_of_authority | insufficient_evidence | requires_human_review
```

Choosing `class` honestly matters. `refuted` means the evidence shows the work was *not* done.
`insufficient_evidence` means it might have been, but the proof is missing. These land very
differently on a young person, and only one of them suggests they should try again.

Prefer `onFail: review` over `reject` wherever a human could reasonably resolve it. Rejection should
be for the unambiguous cases.

## Scoring

```yaml
scoring:
  method: weighted_average | all_pass | minimum | quorum
  approveAt:               # basis points, 0..10000
  partialFloor:
  reviewFloor:
  quorum:
  criteria:
    - code:
      reason:
      weight:              # 1..5
      min:
      score: {}            # boolean | bands | linear | levels | map | deductions | manual
```

Thresholds are in basis points — `8000` is 80%. Set `reviewFloor` so that borderline claims reach a
human rather than being rejected by a margin the youth cannot see.

A `manual` score node forces human involvement. Every one you add consumes evaluator capacity that
control C17 must actually have.

## Reason codes

Every rejection path needs a reason a young person can act on.

| Bad | Good |
|---|---|
| "Claim rejected" | "The photo does not show the whole tree. Retake it standing back about 3 steps." |
| "Insufficient evidence" | "We need the photo taken at the planting site. Yours has no location attached." |
| "Failed validation" | "The date you entered is before the task started." |

Rules that were not disclosed in the control C8 instructions must not appear here. A youth cannot be
rejected for breaking a rule they were never told. Cross-check every gate and criterion against the
instructions.

## Unique and frequency

```yaml
unique:      # duplicate-claim detection — which fields make a claim the same claim
frequency:   # submission-rate limit — how often one participant may claim
```

Both are fraud controls (control C14) and both tax honest youth. A frequency limit set too tight punishes
a fast, genuine worker. State the honest-youth cost.

## AI checks and external sources

`aiChecks` are read as `ai.<name>.*`, `sources` as `ext.<name>.*`. Both are subject to control C15: an AI
check may **propose**, never determine. Where an AI check drives a rejection, route it through
`onFail: review` unless the tier explicitly permits automatic settlement.

Where the engine provides baseline checks, treat them as **locked**. They are re-verified
byte-identically at registration; a modified baseline fails. The editor is convenience, never
authority.

## Drift

Re-check every field path against the current `#vct` catalog before staging publication. Drift
sources:

- The claim form was edited after the rubric was authored
- The rubric was copied from another Deed with a different form
- A field was renamed rather than added

Catch it here. Control C21's preflight will catch it too, but by then the provider has been told they are
ready.

## Recording

```yaml
claim_and_rubric:
  claim_form:
    resource: "#vct"
    protocol_did:
    proof:
    fields: []             # each: { name, kind, evidence_item, consumed_by }
    localised: true | false
  rubric:
    opened_from_published: true | false | n/a
    published_rubric_id:   # the id the draft descends from
    gates: []              # each: { code, reason, onFail, class, disclosed_in_instructions }
    scoring: {}
    review: {}
    settlement: {}
    unique: {}
    frequency: {}
    ai_checks: []
    manual_nodes_count:    # each one consumes control C17 human capacity
    all_paths_resolve: true | false
    catalog_snapshot:
  blast_radius:
    affected_collections: []
```

## Control C11 fails when

- Any field path does not resolve against the current `#vct`
- A rejection has no reason code, or one a youth cannot act on
- A rule appears that control C8 did not disclose
- A draft on a live collection was not opened from the published rubric
- A `manual` node count exceeds the evaluator capacity control C17 can supply
