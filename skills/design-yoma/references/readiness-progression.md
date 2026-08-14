# Readiness and Publication Blockers

The closed blocker list, the readiness score, and how they relate. Loaded at C24 `launch_readiness`,
and again at step 2 of the publication sequence.

The dependency chain lives in `semantic-dependencies.md`. The six-step publication path lives in
`publication-sequence.md`. This reference is about one thing: **what stops a Deed going live.**

## Blockers override the score

A blueprint scoring 94 with any blocker present is **blocked**. Never trade one against the other, and
never present a score to a provider as if it were permission.

The score exists to say *how good is this*. The blocker list exists to say *may this reach a young
person*. They are different questions and only the second one gates publication.

## The blocker list is closed

**Specialist references may not extend it during authoring.** A specialist that finds something
serious raises it as a finding for the blueprint review, or as an accepted-for-later item with an
owner — it does not invent a new blocker.

This matters because an open-ended blocker list makes publication unpredictable, and unpredictable
gates get worked around.

### Safety and safeguarding

- Safeguarding sign-off absent where the tier requires it
- Consent capacity unresolved for the target age band
- Guardian consent required and unverified
- Youth data readable beyond the stated need
- Retention with no deletion date, or no owner

### Correctness

- A rubric field path that does not resolve against the live `#vct`
- A rubric draft on a live collection not descended from the published `#rub`
- A rule that can reject a claim but was not disclosed in the instructions
- An unterminated flow branch
- Rejection reasons absent from the listing, or not in the youth's languages

### Authority

- `claim/submit` reachable without an approved `bid/evaluate`
- Any agent holding determination, grant, payment, or publication authority
- An evaluator who will not hold `EvaluateClaimAuthorization`
- A bid evaluator outside the controller set

### Genuine readiness

- Reward promised with no funding position disclosed
- Youth bear a net cost to participate
- No dispute path, or no time limit on determination
- Human determination required by tier with no capacity to meet claim volume
- An unresolved critical risk
- A credible high-value fraud path with no control and no accepted-risk owner
- The pilot did not exercise a rejection path
- A blueprint review round with `outcome: passed` whose `blueprint_hash` does not match the current
  blueprint

Four categories, and they are the four the phrase "correctness, safety, authority, and genuine
readiness" names. Everything else is a checklist item.

## Accepted-for-later items

Suggestions, refinements and improvements travel forward with their phase commitments and surface
again here — the last point at which the provider can decide one of them should have been a blocker.

**Show them at C24.** A provider who deferred five small things during Design may not realise they add
up to a Deed that is not ready. Present them together, and ask.

Each needs a named owner. An accepted-for-later item with no owner is not deferred, it is dropped.

## Readiness scoring

| Criterion | Weight |
|---|---:|
| Deed intent approved | 8 |
| Safeguarding tier assigned and satisfied | 12 |
| Impact model sound | 8 |
| Task, instructions, and accessibility complete | 12 |
| Evidence model minimal and probative | 8 |
| Bid form and eligibility ready | 10 |
| Claim schema and rubric resolvable | 12 |
| Fraud controls sited | 6 |
| Rights, consent, and retention set | 10 |
| Flow staged with the bid edge intact | 6 |
| Reward disclosed with runway and exhaustion | 5 |
| Pilot completed including a rejection | 3 |

`90–100` launch approved · `80–89` approved with conditions · `65–79` internal demo only ·
`0–64` block

The weights concentrate on safeguarding, accessibility, the rubric and rights — the four places where
getting it wrong lands on a young person rather than on the provider.

## Conditions

`approved with conditions` requires every condition to have a **named owner** and a **due point**. A
condition with neither is a blocker wearing a disguise.

```yaml
conditions:
  - condition: Second evaluator onboarded before volume exceeds 20 claims/week
    owner: <named person>
    due_point: before public listing
    evidence_required: evaluator holds EvaluateClaimAuthorization
```

## Re-entry

Readiness is not one-way. Return to an earlier control when:

- The safeguarding tier changes — C7, C10, C12, C16, C17 and C19 must be re-checked
- The claim form changes — C11 rubric paths must be re-resolved
- Reward or funding changes materially — C3 and C17
- A safeguarding incident occurs — C4, always
- Claim volume exceeds what C17's human capacity assumed

Re-entry propagates through the consumes-map, not through the whole blueprint. See
`semantic-dependencies.md`. A re-commitment after the blueprint review passed invalidates that review.

## Record shape

```yaml
readiness:
  blueprint_hash:
  score:
    total:
    by_criterion: {}
  blockers:
    present: []            # any entry forces block
    resolved: []           # { blocker, resolution, resolved_by, at }
  accepted_for_later: []   # { item, owner, raised_at_control, shown_at_readiness: true }
  decision: launch_approved | approved_with_conditions | internal_demo_only | block
  conditions: []
  controller_checklist: staged | absent
  next_owner:
```
