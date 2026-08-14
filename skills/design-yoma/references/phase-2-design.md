# Phase 2 · Design

**The provider is designing the work, the proof, and who may do it.**

Eight controls: C6 `task_design`, C7 `accessibility_inclusion`, C8 `youth_instructions`,
C9 `evidence_capture`, C10 `bid_and_eligibility`, C11 `claim_and_rubric`, C12 `rights_and_consent`,
C13 `deed_flow`.

The longest phase, and the one that decides whether the Deed actually works. Each control narrows what
the next can decide — a rubric cannot read a field evidence capture never produces, and an eligibility
rule cannot test something the bid form never asks.

## Opening the phase

> "Design is the big one. We'll work out exactly what someone does, what they send you to prove it,
> who's allowed to take part, and how you'll decide whether to pay. Most of the questions here are
> about your work rather than the system — you know this part better than I do."

## C6 · `task_design`

**Settles:** what the young person actually does.

**Ask:** talk me through it from their side — what's the first thing they do, then what, how long does
it really take, what usually goes wrong.

| Check | Passes when |
|---|---|
| Startable | A first-timer knows what to do first without asking |
| Bounded | Effort and elapsed time stated, and honest |
| Self-contained | No step needs provider staff available in real time |
| Skill-bearing | They end with something nameable for their digital CV |
| Exception-covered | What happens when a step fails or is impossible |

**Blockers:** effort materially understated against the reward (check explicitly at C16); a step
requiring staff availability with no stated response time; no exception path for the likeliest
failure; prerequisites that only become visible after starting.

## C7 · `accessibility_inclusion`

**Settles:** whether the youth this targets can actually reach it. Full test battery in
`accessibility.md`.

**Ask:** what phone do they have, is it theirs or shared, is there signal where the work happens, what
languages do they read.

**Shared devices are the case most often missed.** A young person borrowing a phone for twenty minutes
cannot complete a fifty-minute uninterrupted session.

| Check | Passes when |
|---|---|
| Device floor | Stated, and the task works at it |
| Bandwidth | Capture and submission work at the floor |
| Offline | Work done away from signal can be captured and sent later |
| Data cost | Estimated in MB and money, as a stated share of reward |
| Language | Instructions, bid form and **rejection reasons** translated, not translatable |
| Disability | An accommodation path, or an explicit note on why none is possible |

**Blockers:** youth bear a net cost to participate; evidence capture needs a device class they do not
have; instructions only in a language they do not read; offline-performed work cannot be captured.

## C8 · `youth_instructions`

**Settles:** what the young person reads. The artifact that decides whether the Deed works.

**Ask:** if you were standing next to them, what would you tell them? What do people get wrong?

| Check | Passes when |
|---|---|
| Readable | Plain language, at the reading level of the target youth |
| Actionable | Every instruction names an action, not a goal |
| Evidence-anchored | Each evidence item has a worked example |
| Failure-honest | Says plainly what gets a claim rejected, **before** they start |
| Localised | Translated |

**Blockers:** instructions describe outcomes rather than actions; rejection reasons not disclosed up
front; no worked example for an evidence item; written for staff rather than participants.

> A youth who cannot predict rejection cannot avoid it. Every rule that can reject a claim must appear
> here before the work begins — this is what C11 is checked against.

## C9 · `evidence_capture`

**Settles:** what they submit to prove the work.

**Ask:** what would convince you they'd actually done it? What could they capture without extra effort?

| Check | Passes when |
|---|---|
| Natural | Produced by doing the work, not by extra effort after |
| Cheap | Within the C7 data budget |
| Probative | Actually distinguishes done from not-done |
| Offline-capturable | Where the work happens offline |
| **Minimal** | **Every item is consumed by a rule or a metric** |

Minimality is a hard rule. Collecting youth data "in case it's useful later" is a failure, not a
precaution.

**Blockers:** evidence identifying third parties (especially other minors) with no consent basis;
evidence no rule consumes; evidence uncapturable at the device floor; biometric or precise-location
data with no stated necessity and retention limit.

## C10 · `bid_and_eligibility`

**Settles:** who may do this, and what they tell you to apply. Full mechanics in `bid-design.md`.

**This is an authorization decision, not a signup.** Approving a bid grants
`SubmitClaimAuthorization` on the collection — it is the act that lets a young person claim.

**Ask:** who's this for, is there anyone who shouldn't apply, how many can you take, what happens to
the ones you can't.

Every field must pass both tests: **necessary** (feeds an eligibility rule or safeguarding control)
and **answerable** (a youth in the target group can answer truthfully, now, without documents they
lack).

Fields that usually fail: formal address, bank details, national ID, CV, employer reference,
free-text motivation essay. Each excludes by resource access rather than suitability.

| Check | Passes when |
|---|---|
| Answerable | Truthfully, without documents they lack |
| Necessary | Every field feeds a rule |
| Non-excluding | No field excludes eligible youth by proxy |
| Checkable | Each criterion has a stated check |
| Capacity-bounded | A maximum, and what happens beyond it |
| Evaluator resolved | Named, **and in the controller set** |

**Blockers:** a field no rule consumes; exclusion by proxy without safeguarding justification;
unbounded capacity against a bounded reward pool; evaluator not in the controller set; no stated
outcome for rejected or waitlisted applicants.

## C11 · `claim_and_rubric`

**Settles:** the claim form and the rules that judge it. Full schema in `claim-and-rubric-design.md` —
read it before drafting.

> **The rule a young person cares about:** they should be able to predict their own outcome before
> they submit.

**Ask:** if a photo is a bit blurry but you can still see it, pass or fail? What would make you say no
outright? What would make you want to look at it yourself?

Two hazards:

- **A rubric may only reference fields in the live `#vct` catalog.** A path that does not resolve is
  `BLOCKED_RUBRIC_DRIFT`. Catching it here is free; catching it at C20 is not.
- **Publication replaces `#rub` outright.** On a live collection, always open from the published
  rubric — a blank draft silently wipes live rules
  (`BLOCKED_RUBRIC_NOT_OPENED_FROM_PUBLISHED`).

| Check | Passes when |
|---|---|
| Resolvable | Every path resolves against the current `#vct` |
| Predictable | A youth reading the rules could predict their outcome |
| Reason-coded | Every rejection carries a reason they can act on |
| Complete | Gates and scoring cover every submission, including the empty one |
| Proportionate | Rejection classes match severity — not everything is `refuted` |
| **Disclosed** | **Every rule appeared in C8 instructions** |

**Blockers:** an unresolvable path; a rejection with no actionable reason; a rule C8 did not disclose;
a live-collection draft not opened from the published rubric; more `manual` nodes than C17 human
capacity can supply.

## C12 · `rights_and_consent`

**Settles:** who may see, hold and act on youth data, and on what authority.

Claims are submitted to the deed domain and land in the claim collection's **Matrix room**.

| Role | Authorization | Term | Quota |
|---|---|---|---|
| Service agent (`SA`) | `/ixo.claims.v1beta1.SubmitClaimAuthorization` | 3 years | 30 |
| Evaluation agent (`EA`) | `/ixo.claims.v1beta1.EvaluateClaimAuthorization` | 1 year | 10 |

Terms and quotas are platform-fixed. Grants **append** per collection — never design assuming a grant
is exclusive. The granter is always the admin account; a non-owner routes through the delegate path.

**Consent capacity ships as age-tiered** — under-18 requires verified guardian consent, 18+
self-consents. This is a configurable default pending provider decision; see `safeguarding.md`. Where
the age band is unknown, assume the protective reading and record it.

**Ask:** how long do you need to keep their photos, who needs to see them, what happens if someone
wants to withdraw.

**Blockers:** youth data readable beyond the stated need (check room membership, not intent); a grant
with no expiry or revocation path; minors' data with no verified guardian consent where the tier
requires it; retention with no deletion date or owner; consent bundled so participation requires
agreeing to unrelated processing.

## C13 · `deed_flow`

**Settles:** the flow that runs the Deed. **Route to `manage-flow`** — never hand-write the plan.
Canonical shape in `flow-composition.md`.

**The non-negotiable:**

> `claim/submit` must be unreachable without an approved `bid/evaluate`.

That edge is the authorization. A flow letting a youth claim without it sends them to do work whose
proof will be rejected on chain, after they have already done it.

| Check | Passes when |
|---|---|
| Bid edge intact | The approve condition gates `claim/submit` |
| Actors assigned | Every step has an `aud` with the authority it needs |
| Plan-time discipline | No runtime-only field in `nb`; no concrete DIDs or token configs at plan time |
| Branches terminate | **Every branch ends with something the youth is told** |
| Confirmations preserved | Every side-effecting step keeps its confirmation |

**Blockers:** `claim/submit` reachable without an approved bid; an unterminated branch; runtime-only
fields in `nb`; a stripped confirmation.

## Playing Design back

Walk the young person's path, not the control list.

> "Here's what someone experiences.
>
> They see the opportunity, and apply with four questions — their name, age, area, and when they're
> free. You take 60 people; anyone after that goes on a waiting list and gets told so. Because
> under-18s can apply, a parent signs before they start.
>
> They collect a seedling and a numbered tag, plant it, photograph it with the tag readable, and enter
> the number. That's about two hours. The photo works on a basic Android and queues if there's no
> signal — about 3MB, roughly R1.50 of data against R50 of pay.
>
> You'll reject if there's no photo. If the tag number doesn't match one you issued, it comes to you to
> look at rather than being rejected automatically. Both of those are in the instructions they read
> before they start, so nothing is a surprise.
>
> **Still open:** the Zulu translation of the rejection messages — parked, Nomsa owns it."

## Committing Design

All eight controls recorded, no blocker open, playback shown, nothing marked `needs_recheck`.

Before committing, confirm the two cross-checks that matter most:

- Every rubric rule appears in the instructions (C11 against C8)
- Every evidence item is consumed by a rule or metric (C9 against C11 and C5)

## Phase document

```yaml
design:
  task: { steps: [], effort: {}, prerequisites: [], skills_earned: [], exception_paths: [] }
  access: { device_floor:, bandwidth_floor:, offline_capable:, languages: [], data_cost: {}, accommodations: [] }
  instructions: { per_step: [], worked_examples: [], rejection_reasons_disclosed:, support_path:, localised: }
  evidence: { registry: [], minimality_checked: }
  bid: { form: {}, eligibility: [], capacity: {}, rubric: {}, evaluator: {}, rejection: {} }
  claim: { form: {}, rubric: {} }
  rights: { grants: [], room_permissions: [], consent: {}, retention: {}, portability: }
  flow: { plan:, steps: [], bid_edge_verified:, unterminated_branches: [], confirmations_preserved: }
  cross_checks:
    rules_disclosed_in_instructions:
    evidence_all_consumed:
  checklist:
    blockers: []
    accepted_for_later: []
```
