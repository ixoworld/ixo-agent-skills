# Phase 4 · Testing

**The provider is proving it works end to end, before young people depend on it.**

Two controls: C19 `pilot_run`, C20 `integrated_blueprint_check`.

Short phase, high value. Everything so far has been designed. This is where it meets reality.

## Opening the phase

> "Before anyone relies on this, we run it once ourselves — all the way through, including a
> rejection. Then I'll cross-check the whole design for anything that contradicts itself. It usually
> turns up one or two things, and they're much cheaper to fix now."

## C19 · `pilot_run`

**Settles:** that the whole path works, proven rather than assumed.

### What must actually be proven

Not "the flow compiles". Six things:

1. A bid submitted against the real `#bco` form
2. A bid evaluated, and the resulting authorization **observed to exist on chain**
3. A claim submitted into the collection by the approved participant
4. The claim evaluated against the published rubric, with the reason code returned
5. Settlement executed, and the credential stored
6. **At least one rejection path, end to end, with the reason a youth would receive**

> A pilot that only exercises the happy path has not proven the Deed. Most of what goes wrong for
> young people happens on the rejection path.

### Data rules

- **Synthetic by default.**
- Real youth may take part only with explicit informed consent, the C12 consent basis in force, and
  the knowledge that this is a pilot.
- **Pilot participants who do real work get paid.** A pilot is not an unpaid trial.
- High tier requires a named observer.

**Ask:** who can run through this for us? Can we plant one tree and take it all the way, including
one we deliberately reject?

| Check | Passes when |
|---|---|
| Full path | All six steps executed |
| Authorization observed | The grant exists on chain, not inferred from bid status |
| Rejection proven | At least one, with its reason code |
| Timings recorded | Actual time to determination and to settlement |
| Defects logged | Everything that surprised anyone, with an owner |
| Participants paid | Any real work was compensated |
| Tier respected | Determination followed the C17 model |

**Blockers:** happy path only; real youth without informed consent or without payment; authorization
assumed rather than verified; determination or settlement materially slower than disclosed; a
youth-affecting defect with no owner.

## C20 · `integrated_blueprint_check`

**Settles:** that the controls agree with each other, and that the rubric will publish cleanly.

This is **not** the blueprint review. It is an automated cross-check — mechanical, catching
contradictions no single-document validation can see, because none of them is a defect *in* a
document. The independent human review comes in Phase 5.

### The cross-checks

| Check | Catches |
|---|---|
| Every rubric rule appears in C8 instructions | A youth rejected by a rule they were never told |
| Every rubric field path resolves against the live `#vct` | Schema drift that would fail at publication |
| Every evidence item is consumed by a rule or metric | Youth data collected for no reason |
| Every eligibility criterion has a bid-form field | A rule that cannot be evaluated |
| Capacity does not exceed funded runway | Youth approved into unfunded work |
| `manual` rubric nodes fit C17 human capacity | Claims queueing behind a person who cannot keep up |
| Listing promises only what the rubric accepts | A Deed that advertises more than it delivers |
| Rejection reasons exist in every C7 language | A reason a youth cannot read |
| Data cost is a disclosed, resolved share of reward | Youth paying to work |
| Every flow branch terminates | A young person left waiting |

### Rubric preflight

C20 also carries the **read-only preflight** of `qi/eval.engine` — stage 1 only.

```
Stage 1  preflight    READ-ONLY     ← this belongs here
Stage 2  register     IRREVERSIBLE  ← Phase 5, publication
Stage 3  publish      REPLACES      ← Phase 5, publication
```

> A rules error must fail at preflight, before any irreversible work.

Running preflight here means a drift or rules problem surfaces during Testing, when it is cheap,
rather than mid-publication when stage 2 may already have run.

**Blockers:** any cross-check failing; preflight failing; snapshot drift against the live `#vct`.

**Note honestly:** a cross-check failure is usually an earlier defect surfacing, not a Testing problem.
Amend the control that caused it, let the re-check propagate, and re-commit the affected phase — do
not patch it here.

## Playing Testing back

> "We ran it properly.
>
> Sipho applied, you approved him, and his permission to submit claims showed up on chain — we checked
> rather than assumed. He planted a tree, sent the photo, Thandi approved it in two days and he was
> paid in three. We also ran one deliberately bad submission — no photo — and it came back with 'No
> photo was submitted. Add a photo of the planted tree with the tag visible.' That's what a real
> rejection will look like.
>
> Sipho did real work, so he was paid for it.
>
> One thing came up: the tag numbers are hard to read in low light. Not a blocker — the Field
> Coordinator owns getting reflective tags, and it's parked.
>
> The cross-check came back clean, and the rules will publish without drift."

## Committing Testing

Both controls recorded, no blocker open, playback shown, nothing marked `needs_recheck`.

After this commitment the blueprint is complete and goes to independent review. Say so:

> "That's the design done. Next it goes to someone who wasn't part of building it, to look at the
> whole thing as one piece — then we can publish."

## Phase document

```yaml
testing:
  pilot:
    completed:
    path_proven: []          # bid, bid_evaluate, claim, claim_evaluate, settle
    rejection_proven:        # required
    authorization_verified:  # observed on chain
    data: synthetic | real_with_consent
    participants_paid:
    observer:                # required at high tier
    timings: { to_determination:, to_settlement: }
    defects: []              # { defect, severity, owner }
  integrated_check:
    rules_disclosed:
    paths_resolve:
    evidence_all_consumed:
    eligibility_has_fields:
    capacity_within_runway:
    manual_nodes_within_capacity:
    listing_matches_rubric:
    reasons_localised:
    data_cost_resolved:
    branches_terminate:
    rubric_preflight: pass | fail | not_run
    failures: []
  checklist:
    blockers: []
    accepted_for_later: []
```
