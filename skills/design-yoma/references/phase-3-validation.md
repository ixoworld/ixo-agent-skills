# Phase 3 · Validation

**The provider is checking that what they designed is safe, fair, funded, and governable.**

Five controls: C14 `fraud_resistance`, C15 `ai_assistance`, C16 `reward_and_settlement`,
C17 `verification_authority`, C18 `governance_risk`.

Design asked *does this work?* Validation asks *what happens when it doesn't* — when someone games it,
when the money runs short, when an agent gets it wrong, when a claim is disputed.

## Opening the phase

> "Now we pressure-test it. How could someone game this, what the AI is allowed to do, what you're
> actually paying and whether the money's there, who signs off on each claim, and what happens when
> something goes wrong. This is the phase that keeps you out of trouble."

## C14 · `fraud_resistance`

**Settles:** how this can be gamed, and what stops each way. Attack catalogue in
`fraud-resistance.md`.

**The tension:** every fraud control taxes honest participants. A control that catches one cheat and
frustrates fifty genuine youth is a bad control, even though it works.

> Prefer controls invisible to someone doing the work properly. State the honest-youth cost of each
> one — if you cannot estimate it, you do not understand the control well enough to ship it.

**Ask:** how would someone fake this? Has anyone tried? What would you notice?

Consider each: duplicate identity, fabricated evidence, AI-generated evidence, location spoofing,
collusion, farming. For each credible one, site a control in a real mechanism or record an accepted
risk with an owner.

**Two specifics worth holding firm on:**

- **Never auto-reject on an AI-detection signal.** False positives fall on honest youth who cannot
  prove a negative. Route to review.
- **Collusion is the one most often ignored**, because it implicates staff. Separating bid approval
  from claim determination is free to honest youth. There is little excuse for leaving it uncontrolled.

**Blockers:** a credible high-value fraud path with no control and no accepted-risk note; a control
rejecting honest youth at a rate the provider has not accepted; a control needing evidence C9 rejected
as excessive; collusion unaddressed where the provider both approves and determines.

## C15 · `ai_assistance`

**Settles:** what agents do, and what they cost.

> **Every agent is propose-only.** An agent may evaluate, score, flag and recommend. It may not
> determine, grant, pay or publish.

Escalating beyond propose-only requires a named human owner, a stated reason, a bounded scope, and a
governance entry at C18. It is not a configuration choice.

**Ask:** would you like the system to pre-check photos before you look at them? Who overrides it when
it's wrong?

| Check | Passes when |
|---|---|
| Propose-only | No agent determines, grants, pays or publishes |
| Scoped | Permitted context enumerated — domains, claims, resources, rooms |
| Budgeted | A token cap with a named owner |
| Exhaustion-defined | What happens when the budget runs out, and who is told |
| Overridable | A human can override any output, and it is recorded |
| Baseline-honest | Engine baseline checks are not treated as editable |

**Blockers:** an agent with determination, grant, payment or publication authority; no budget cap or a
cap with no owner; permitted context wider than the task; no override path; an agent acting on youth
data outside the C12 consent basis.

## C16 · `reward_and_settlement`

**Settles:** what the youth gets, on what rail, triggered by what, and what happens when the money
runs out.

This precedes verification because the reward is half of what sets the determination threshold — you
cannot decide who signs off on paying until you know what is paid.

### Listing is not gated on full escrow

A Deed may be listed without its full reward pool escrowed. What is **not** optional is disclosure:

> The funding position must be stated and the exhaustion behaviour defined **before any youth can
> bid.** A young person is entitled to know whether the money is there.

Escrow-before-listing would block most real programmes, which are funded in tranches. Silence about
funding would transfer the risk onto youth. Disclosure is the honest form of the constraint.

**Ask:** what are you paying, where's it coming from, how many can you fund right now, and what should
happen if you run out halfway.

| Check | Passes when |
|---|---|
| Reward stated | Per completion, per rail, in currency they understand |
| Effort-proportionate | **State the implied hourly rate against C6 effort** |
| Net-positive | Exceeds the C7 data cost by a stated margin |
| Trigger defined | What releases settlement, and how long it takes |
| Runway stated | How many completions are currently funded |
| Exhaustion defined | `close_deed` · `waitlist` · `continue_unfunded` — and youth are told which |
| Disclosed | The funding position appears in what youth see before bidding |

**Blockers:** reward promised with no funding position stated
(`BLOCKED_UNFUNDED_UNDISCLOSED`); implied hourly rate below what the provider would defend publicly;
reward not exceeding participation cost; no exhaustion behaviour, or one that strands youth mid-Deed;
settlement trigger with no time bound.

Compute the hourly rate and say it out loud. "That's about R25 an hour" lands differently from "R50
per tree", and it is the number a provider should be willing to defend.

## C17 · `verification_authority`

**Settles:** who determines a claim. Tiered by **risk and value** — the C4 tier and the C16 reward
together set where the line falls.

| Condition | Determination |
|---|---|
| Low risk **and** low value | Oracle determination may settle automatically |
| Medium risk **or** medium value | Oracle proposes; human determines above the threshold |
| High risk **or** high value | Human determines every claim |
| Any safeguarding flag on the claim | Human determines, regardless of tier |
| Any dispute | Human determines |

Set the value threshold **in money, with a rationale**. "High value" is meaningless without a number,
and the number should reflect what the reward means to the youth, not to the provider.

**Ask:** who's going to look at these? How many a week can they realistically do? What happens if
someone thinks you got it wrong?

| Check | Passes when |
|---|---|
| Threshold numeric | Stated in currency, with a rationale |
| Evaluators authorised | Each holds, or will hold, `EvaluateClaimAuthorization` |
| **Human path real** | **The named human has capacity for the expected volume** |
| Dispute path | A youth can contest, and someone must answer |
| Safeguarding override | Any flag forces human determination |
| Timeliness | A maximum time to determination, and what happens if it lapses |

**Blockers:** automatic settlement at the high tier; a human path with no capacity to meet volume —
youth wait indefinitely; no dispute path; evaluators who will not hold evaluation authority; no time
limit on determination.

Capacity is the one most often waved through. Multiply expected claims by minutes per determination
and check it against a real person's week.

## C18 · `governance_risk`

**Settles:** the consolidated risk position and the approval gates.

**Ask:** what keeps you up at night about this one?

| Check | Passes when |
|---|---|
| Consolidated | Risks from C4, C12, C14, C15, C16, C17 all appear |
| Owned | Every risk has a **named person**, not a team |
| Residual stated | What remains after mitigation is written down and accepted |
| Approval-gated | Which acts need which human approval |
| Escalation | Who is told when something goes wrong, and how fast |
| Youth-visible | Risks that affect youth are disclosed **to youth** |

**Blockers:** an unresolved critical risk; a risk with no owner or a team as owner; residual risk
unaccepted or unrecorded; a youth-affecting risk disclosed only internally.

## Playing Validation back

> "Here's the pressure test.
>
> **Gaming it.** The numbered tags stop double-claiming, and you'll spot-check one in ten in the
> field. Someone could fake a small number of photos and get away with it — you've accepted that, and
> Nomsa owns the decision. Importantly, the person approving applications isn't the person judging
> claims, so nobody can wave through their own.
>
> **The AI.** It pre-checks photos and suggests a decision. It can't decide anything — a person always
> does. If its budget runs out it just stops and everything comes to you.
>
> **The money.** R50 plus 100 ZLTO per tree, about R25 an hour for two hours' work. After their data
> cost they're up R48.50. You've got 60 funded, and if it runs out the opportunity closes rather than
> leaving anyone stranded — and they can see that before applying.
>
> **Who decides.** Because it's high risk, Thandi looks at every claim, within five working days. If
> someone disagrees, they message the support line and you review within five days.
>
> **What could go wrong.** Two big ones on the register: someone getting hurt on the riverbank —
> daylight only, buddy pairs, sign in and out — and a guardian not actually consenting, which is why
> no seedling goes out without the countersignature."

## Committing Validation

All five controls recorded, no blocker open, playback shown, nothing marked `needs_recheck`.

## Phase document

```yaml
validation:
  fraud:
    threats: []     # { threat, credible, control, sited_in, honest_youth_cost, residual, accepted_risk_owner }
  agents:
    register: []
    all_propose_only:
    escalations: []
    token_budget: {}
    override_path:
  reward:
    per_completion: []
    implied_hourly_rate:
    net_of_data_cost:
    settlement_trigger:
    time_to_settlement:
    runway_completions:
    funding_position:
    on_exhaustion:
    disclosed_to_youth:
  verification:
    value_threshold: {}
    determination: []
    evaluators: []
    human_capacity_checked:
    dispute_path:
    max_time_to_determination:
    safeguarding_override: true
  governance:
    risk_register: []
    approval_gates: []
    escalation_path:
    youth_visible_risks: []
  checklist:
    blockers: []
    accepted_for_later: []
```
