# Semantic Dependencies

When a control document changes, only the controls that **consume** it are marked for re-check.
Unaffected phases stay committed.

## The principle

A linear chain would invalidate everything downstream of any change. That is wrong in both
directions: it forces needless rework, and — because rework is expensive — it quietly encourages
people to avoid making corrections at all.

So the runtime tracks what each document actually depended on, by hash. A change propagates exactly
as far as its real consequences reach, and no further.

> If the reward changes, verification and settlement need re-checking. The safeguarding tier does not.
> If the claim form changes, the rubric needs re-resolving. The bid form does not.

## The consumes-map

Read as: *when the left column changes, mark the right column `needs_recheck`.*

| Changed control | Marks for re-check |
|---|---|
| C1 `provider_onboarding` | C2, C10, C12, C13, C17 |
| C2 `pod_constitution` | C10, C13, C15, C16, C21 |
| C3 `deed_intent` | C5, C6, C16 |
| C4 `safeguarding_screen` | C7, C10, C12, C16, C17, C19 |
| C5 `impact_model` | C9, C11, C25 |
| C6 `task_design` | C8, C9, C16 |
| C7 `accessibility_inclusion` | C8, C9, C10, C11, C23 |
| C8 `youth_instructions` | C11, C23 |
| C9 `evidence_capture` | C11, C14 |
| C10 `bid_and_eligibility` | C12, C13, C14, C16 |
| C11 `claim_and_rubric` | C13, C14, C17, C20, C21 |
| C12 `rights_and_consent` | C13, C15, C20 |
| C13 `deed_flow` | C19, C20, C21 |
| C14 `fraud_resistance` | C18, C20, C25 |
| C15 `ai_assistance` | C17, C18 |
| C16 `reward_and_settlement` | C17, C18, C23 |
| C17 `verification_authority` | C19, C24, C25 |
| C18 `governance_risk` | C24 |
| C19 `pilot_run` | C20, C24 |
| C20 `integrated_blueprint_check` | C24, review |
| C21 `rubric_publication` | C24, publication |
| C22 `domain_documentation` | publication |
| C23 `vfs_packaging_and_listing` | publication |
| C24 `launch_readiness` | publication |
| C25 `operate_improve` | — |

Propagation is **transitive**. If C4 changes, C16 is marked; because C16 is marked, C17 and C18 are
marked; because C17 is marked, C19, C24 and C25 are marked. Walk the graph until it stops.

Do not shortcut this by marking a whole phase. Do not shortcut it by marking only the direct
consumers.

## The four changes worth naming

These propagate widely enough to be worth flagging to the provider before they make them.

| Change | Reaches | Say this |
|---|---|---|
| **Safeguarding tier** | Accessibility, bids, consent, reward, determination, pilot — nearly everything | "Changing the tier means we re-check how young people apply, what consent we need, and who signs off on each claim." |
| **Accessibility floor** | Instructions, evidence, bids, rubric, listing | "If we change the device we're designing for, the evidence and the instructions both need another look." |
| **Claim form** | Rubric, flow, fraud controls, determination, publication | "Changing what they submit means the rules that judge it have to be re-checked against it." |
| **Reward** | Determination threshold, governance, listing | "Changing the reward changes who has to sign off on each claim." |

## Hash binding

Invalidation works because a document records the **hashes** of what it consumed, not just the names:

```yaml
consumes:
  - control: C7
    name: accessibility_inclusion
    hash: sha256-abc...      # the version this was designed against
```

At any point the runtime can compare recorded hashes against current ones. A mismatch is a stale
dependency — precisely locatable, not guessed at.

This is also what catches the failure mode that matters most: a rubric authored against one claim form
and published against another. The hash mismatch surfaces it before publication rather than after a
young person's claim is wrongly rejected.

## Resolving a re-check

A `needs_recheck` mark is a question, not a verdict. Three outcomes:

| Outcome | When | Result |
|---|---|---|
| **Confirmed unaffected** | The change genuinely does not alter this document | Re-record at the same content with updated consumed-hashes. Note why. |
| **Amended** | The document needs to change | New version, new hash. Propagate onward from it. |
| **Blocked** | The change breaks something that cannot be resolved here | Raise a blocker; return to the control that caused it. |

"Confirmed unaffected" is a real and common outcome — but it must be an actual judgment, recorded with
a reason. Never clear a re-check mark by asserting it is fine.

## Phase consequences

- A phase holding any `needs_recheck` control is `recommitment_required`.
- A phase holding none stays committed, even if an earlier phase was re-committed.
- Re-commitment plays back **the delta**, not the whole phase.
- The independent blueprint review is invalidated by any re-commitment after it passed. A reviewed
  blueprint that then changed has not been reviewed.

## What is never marked

Two things never take a re-check mark, because they are records of what happened rather than design
decisions:

- **`pilot_run`** — a pilot that ran, ran. If the design changed enough to invalidate its evidence,
  that is a blocker requiring a new pilot, not a re-check of the old one.
- **Safeguarding sign-off** — a person signed. If the design changed materially, the sign-off is
  void and must be given again, not amended.
