# Phase 1 · Discovery

**The provider is working out who they are in this system, and whether this Deed is worth building.**

Five controls: C1 `provider_onboarding`, C2 `pod_constitution`, C3 `deed_intent`,
C4 `safeguarding_screen`, C5 `impact_model`.

Discovery is where a weak idea should die cheaply. A provider caught here has lost an hour. A provider
caught at Deployment has lost weeks — and a young person may already have done the work.

## Opening the phase

> "Let's start with Discovery. We'll work out who's running this, what the opportunity actually is,
> whether it's safe for the young people you have in mind, and what you're trying to change. By the
> end you'll know whether it's worth building — and if it isn't, you'll know that cheaply."

## C1 · `provider_onboarding`

**Settles:** who the provider is, and who can act for them.

Every authorization later in the Deed is granted by the admin account. If that is unresolved, nothing
downstream can be trusted — stop with `BLOCKED_AUTHORITY_UNCLEAR`.

**Ask:** who runs this, who is accountable for the young people in it, how someone reaches you.

**Infer where possible:** the owner, admin account, and controller set are usually resolvable from the
entity rather than by asking.

| Check | Passes when |
|---|---|
| Legal standing | A real, identifiable organisation |
| Yoma membership | Committed to the Yoma Rules for the opportunity-provider role |
| Owner resolved | Entity NFT owner address known |
| Admin account | The `admin` account exists; its address is recorded |
| Controller set | `entity.controller[]` DIDs, plus GenericAuthorization holders |
| Youth accountability | **A named person**, not a role inbox |

**Blockers:** no identifiable legal entity; owner and admin account indistinguishable; no named human
accountable for youth outcomes; expectation of working with real youth data before any consent model.

## C2 · `pod_constitution`

**Settles:** the POD that will hold this provider's Deeds — purpose, roles, treasury, collections,
agents.

Route the domain package to `domain-author` and the POD creation flow to `manage-flow`. This control
produces the **decisions**, not the `domain.md`. The published package is C22, in Deployment.

**Ask:** what this POD is for in one sentence, who decides what, where the reward money sits and who
can release it.

| Decision | Guidance |
|---|---|
| Purpose | One sentence a young person would understand |
| Roles | Who holds `PO`; who may evaluate bids; who may determine claims |
| Treasury | Where reward funds sit, and who releases them |
| Claim collections | One per Deed family. Never multiplex unrelated Deeds into one. |
| Agents | Default every agent to **propose-only**. Escalation is C15's job. |
| Linked oracle | Required if any flow will have an agent step |

**Blockers:** no linked oracle where an agent step will exist (`BLOCKED_NO_ORACLE_LINKED`); treasury
with no named releasing authority; an agent granted determination authority at constitution time.

## C3 · `deed_intent`

**Settles:** whether this opportunity is worth designing. Scored, strictly.

This is an assessment, not encouragement. Explain what is weak and what would fix it — never inflate a
score to preserve momentum.

**The shape to reach:**

```text
We offer [youth in a place or situation] the opportunity to [specific action]
in exchange for [reward], which they prove by [evidence],
judged against [rules], achieving [impact].
```

Score what is known; mark missing fields explicitly. Never rewrite a failing idea into a passing one
unless the provider asks for revisions after seeing the score.

| Criterion | Weight | 0 | Full |
|---|---:|---|---|
| Youth value | 15 | Time poorly repaid | Real reward, real skill, real credential |
| Task clarity | 15 | "Help with our programme" | Could start unaided today |
| Provability | 15 | No way to tell it happened | Evidence natural, cheap, hard to fake |
| Judgeability | 15 | Judged on discretion | Rules a youth could predict from |
| Reachability | 10 | Needs a smartphone, data, travel, laptop | Works on what youth have |
| Repeatability | 10 | Bespoke each time | Many youth, same rules |
| Impact credibility | 10 | Asserted | Observable, attributable, evidenced |
| Settlement realism | 10 | Reward vague or unfunded | Reward, rail, trigger, funding stated |

`85–100` proceed · `70–84` proceed with conditions · `50–69` revise · `0–49` block

**Refusals** — these are not scoring inputs. Any one caps at `revise`; starred ones block outright.

- No reward, or one the provider cannot fund or fund-plan ★
- Youth cannot prove completion by any means available to them ★
- The task exposes youth to risk the provider has not named ★
- The work substitutes for paid employment at below-market compensation ★
- Judgement rests entirely on unstructured provider discretion
- Youth bear a net cost to participate
- The task is unreachable for the youth it targets
- The provider cannot say what changes if it succeeds

## C4 · `safeguarding_screen`

**Settles:** the safeguarding tier — the single most consequential output of Discovery. It
parameterises accessibility, bid design, consent, reward and determination across every later phase.

Full trigger tables, sign-off authority and the incident path are in `safeguarding.md` and
`risk-tiering.md`. Read them.

**The question is not** "is this dangerous?" — almost nothing sounds dangerous when described. It is:

> **What is the worst realistic outcome for one young person doing this alone, and who would know?**

**Ask:** where the work happens, whether anyone else is there, what age range, whether they travel,
what could go wrong on a bad day.

**Produces:** tier (`low` · `medium` · `high`), the trigger record, and sign-off where the tier
demands it.

**Blocker:** a tier requiring sign-off without a named person having given it. Self-attestation never
substitutes (`BLOCKED_SAFEGUARDING_SIGNOFF`).

Never record a tier without recording which triggers fired — an unrecorded tier cannot be audited or
re-checked when the Deed changes.

## C5 · `impact_model`

**Settles:** what changes in the world, how it is measured, what a funder would accept.

**Ask:** what is different because this happened, how you would know, what would count as it not
working.

| Check | Passes when |
|---|---|
| Observable | Can be seen, not inferred from intent |
| Attributable | This Deed's contribution is separable |
| Collectable | Comes from evidence the youth already submits |
| Baselined | A starting point, or an explicit note that none exists |
| Falsifiable | There is a result that would count as failure |

**Blockers:** a metric that counts activity and calls it impact with no outcome behind it; a metric
requiring youth to do extra unpaid work; impact the Deed could not plausibly have caused; no stated
failure condition.

## Playing Discovery back

Three things, in the provider's language:

> "Here's where we've got to.
>
> **What we decided.** You're running this as Riverside Trust, with Nomsa accountable for the young
> people in it. The opportunity is planting an indigenous tree and photographing it, for R50 and some
> ZLTO. It scored 88 — strong. Because under-18s might apply and it's outdoors on land you don't
> control, it's high risk, so Thandi has signed it off as safeguarding officer.
>
> **What this means for a young person.** Someone doing this spends about two hours, needs a phone
> with a camera, and gets paid within a week of you approving their photo. Because they might be under
> 18, we'll need a parent or guardian to agree before they start.
>
> **What's still open.** You wanted to check whether the depot can handle 60 people — parked, and
> Nomsa owns it."

## Committing Discovery

All five controls recorded, no blocker open, playback shown, nothing marked `needs_recheck`. Then one
decision.

> "Ready to build on this?"

**The hard interlock:** no Design work proceeds without the safeguarding tier. If a provider wants to
jump ahead, explain why — the tier changes how young people apply, what consent is needed, and who
signs off on each claim. Designing before it is set means designing twice.

## Phase document

```yaml
discovery:
  provider:
    name:
    did:
    yoma_membership:
    accountable_human:
    support_channel:
  authority:
    owner_address:
    admin_account_address:
    controllers: []
  pod:
    purpose:
    roles: []
    treasury: {}
    claim_collections: []
    agents: []
    linked_oracle:
  intent:
    statement:
    decision:
    score:
    refusals_triggered: []
    youth_value:
  safeguarding:
    tier:
    triggers_fired: []
    signoff: {}
  impact:
    statement:
    baseline:
    target:
    metrics: []
    acceptance_criteria: []
    failure_condition:
  checklist:
    blockers: []
    accepted_for_later: []
```
