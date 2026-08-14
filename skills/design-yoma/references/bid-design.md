# Bid Design

Governs control C10. A bid is how a young person applies to do a Deed — and bid approval is what grants
them the authority to claim.

## What approval actually does

> Approving a bid grants the applicant `SubmitClaimAuthorization` on the claim collection.

It is not an administrative acknowledgement. It is an authorization decision with an on-chain
consequence. Design the bid form and its evaluation as you would design an access grant, because that
is what it is.

## Where the form lives

The bid form is **SurveyJS JSON**, stored off-chain, anchored as a LinkedResource on the **protocol**
entity — not the Deed.

| Form | Resource id | Type |
|---|---|---|
| Contributor bid (the youth) | `{id}#bco` | `bidContributor` |
| Evaluator bid | `{id}#bev` | `bidEvaluator` |
| Claim form | `{id}#vct` | `surveyTemplate` |

Resolution walks `deedDid → collection → collection.protocol → protocolDid → linkedResource`. So
changing `#bco` affects **every collection pointing at that protocol**. Establish the blast radius
before staging a change.

## Roles

| Role | Normalises to | Gets on approval | Term | Quota |
|---|---|---|---|---|
| `service_agent` | `SA` | `/ixo.claims.v1beta1.SubmitClaimAuthorization` | 3 years | 30 |
| `evaluation_agent` | `EA` | `/ixo.claims.v1beta1.EvaluateClaimAuthorization` | 1 year | 10 |

Youth performing the Deed are **always `service_agent`**. Terms and quotas are platform-fixed; they
are not design inputs. Do not promise a youth more claims than the quota permits.

Grants **append** to existing constraints per collection rather than replacing them. Never design on
the assumption that a grant is exclusive or that re-approval resets anything.

## Who may evaluate a bid

The **controller set**: the entity NFT owner, any DID in `entity.controller[]`, and any address
holding a `GenericAuthorization` from the admin account. The **granter** is always the admin account.

A common design error: assuming a programme officer can approve bids because they run the programme.
Check whether they are actually in the controller set. If they are not, either add them or route
approval to someone who is — a bid approved by an unauthorised evaluator fails.

## Designing the form

### The two tests

Every field must pass both:

1. **Necessary** — it feeds an eligibility rule or a safeguarding control. If no rule consumes it, cut
   it. "Useful for reporting" is not a rule.
2. **Answerable** — a young person in the target group can answer it truthfully, now, without
   documents they do not have.

### Fields that usually fail

| Field | Why it fails |
|---|---|
| Formal residential address | Excludes informal settlements; rarely used by any rule |
| Bank account details | Not needed to apply; excludes the unbanked |
| National ID number | Excludes undocumented youth; collect only if a rule genuinely requires it |
| CV or qualifications | Excludes by prior access; usually irrelevant to a task-based Deed |
| Employer reference | Excludes the unemployed — often the target group |
| Free-text motivation essay | Filters for writing ability, not task suitability; expensive to evaluate fairly |

### Fields that usually earn their place

- Age band or date of birth — where consent capacity or a safeguarding trigger depends on it
- Location at the granularity the task needs, and no finer
- Device and connectivity — so an unreachable applicant is not approved into failure
- Language preference
- Availability within the Deed window
- Task-specific capability, stated as a task, not a credential
- Accessibility needs, so accommodations can be arranged
- Guardian contact — **only** where the tier requires guardian consent

## Eligibility

Every criterion needs a stated check. "Must be a young person in the area" is not a criterion.

```yaml
eligibility:
  - criterion: Aged 18-35
    check: date_of_birth field, computed at bid evaluation
    excludes_by_proxy: false
  - criterion: Located within the project district
    check: district field, self-declared, verified at first claim by geotag
    excludes_by_proxy: false
```

Flag `excludes_by_proxy: true` on anything that filters by resource access rather than by suitability,
and justify it or remove it.

## Capacity

Bounded capacity is a control C10 requirement. Unbounded approval against a bounded reward pool strands
youth who did the work.

```yaml
capacity:
  max_approved:
  rationale:               # tie this to control C16 runway
  overflow_behaviour: waitlist | close_bidding | reject_with_reason
  waitlist_communicated: true | false
```

Whatever the overflow behaviour, **applicants must be told**. A young person who applies and hears
nothing has been failed, even if no work was lost.

## Bid rubric — optional

Bids may be scored by the Evaluation Engine against a rubric, using the same structure as claim
rubrics (see `claim-and-rubric-design.md`). Use one when:

- Applications materially exceed capacity, and consistency matters
- Selection criteria are objective enough to encode
- The provider needs to show selection was fair

Do **not** use one when selection genuinely rests on human judgement about a young person's
circumstances. An unfair rubric applied consistently is worse than honest human selection, because it
launders the unfairness.

If a rubric is used, the same rules apply: fields must resolve against the live `#bco` catalog, and
rejection reasons must be actionable.

## What a rejected applicant receives

Design this explicitly. It is the most common gap.

- A reason they can act on — not "unsuccessful"
- Whether they may apply again, and when
- Whether they are waitlisted
- Where to ask a question

## Recording

```yaml
bid:
  form:
    resource: "#bco"
    protocol_did:
    affected_collections: []
    fields: []             # each: { name, type, necessary_for, answerable, localised }
  role: service_agent
  eligibility: []
  capacity: {}
  rubric:
    used: true | false
    rationale:
    resource:
  evaluator:
    name:
    in_controller_set: true | false
  rejection:
    reason_given: true | false
    reapply_policy:
    question_path:
```

## Control C10 fails when

- A field is collected that no rule consumes
- A criterion excludes by proxy without safeguarding justification
- Capacity is unbounded against a bounded reward pool
- The evaluator is not in the controller set
- Rejected or waitlisted applicants have no stated outcome
