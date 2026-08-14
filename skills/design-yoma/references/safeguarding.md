# Safeguarding

Youth are a protected population. This reference governs control C4 and constrains controls C7, C10,
C12, C16, C17, C19 and C25.

## The standing rule

> When age, consent, supervision, or safeguarding status is unknown, assume the more protective
> reading and record the assumption.

Recording matters as much as assuming. An unrecorded protective assumption cannot be revisited when
better information arrives, and cannot be audited.

## Sign-off authority

| Tier | Who signs | Acceptable evidence |
|---|---|---|
| Low | Provider self-attestation | A named individual attests; audited on a sample |
| Medium | Named safeguarding contact | Named person, role stated, attestation recorded |
| High | **Named safeguarding officer** | Named person with safeguarding responsibility in the organisation, sign-off recorded with date |

Self-attestation never substitutes for required sign-off (`BLOCKED_SAFEGUARDING_SIGNOFF`). "The
programme manager is fine with it" is not safeguarding sign-off unless the programme manager holds
that responsibility.

## What sign-off is attesting to

Not that the Deed is safe. That the person signing has:

1. Read the task as the youth will experience it
2. Identified the realistic worst outcome for one participant
3. Confirmed the controls that reduce it are actually in place
4. Accepted the residual risk on the organisation's behalf
5. Named who responds when something goes wrong, and how fast

If the signer cannot answer all five, the sign-off is not valid.

## Consent capacity — the configurable default

Ships as **age-tiered**:

| Age band | Consent |
|---|---|
| Under 18 | **Verified guardian consent required**, plus the young person's own assent |
| 18+ | Self-consent |
| Unknown | Treat as under 18 until established |

> **This is a default pending provider decision.** It was not settled during design. Two live
> alternatives: (a) *guardian-by-default* — assume minors unless the provider proves an 18+ cohort;
> (b) *jurisdictional* — capacity follows the law of the participant's country, which varies. Raise
> this with the provider at control C12 and record what they choose.

Where the choice blocks a decision, stop with `BLOCKED_CONSENT_CAPACITY`.

### Assent is not consent

A minor's agreement to participate is **assent**. It does not replace guardian consent, and guardian
consent does not replace it. A Deed where a guardian consents but the young person does not want to
participate is not authorised.

## Design constraints that follow from safeguarding

These bind other controls. They are not advisory.

| Constraint | Control | Why |
|---|---|---|
| No lone working at high tier without a check-in mechanism | C6 `task_design` | Nobody would know |
| Third-party personal data needs a consent basis, especially other minors | C9 `evidence_capture` | The subject did not agree |
| Bid form may not collect data used only for exclusion-by-proxy | C10 `bid_and_eligibility` | Excludes the youth who most need the opportunity |
| Reward may not be so large it overrides a young person's judgement about risk | C16 `reward_and_settlement` | Coercive by design |
| Any safeguarding flag on a claim forces human determination | C17 `verification_authority` | An oracle cannot weigh a welfare signal |
| Pilot at high tier needs a named observer | C19 `pilot_run` | Untested risk should not first appear at scale |
| Any incident pauses the Deed | C25 `operate_improve` | Continuing while investigating repeats the harm |

## Incident path

An incident is anything where a participant was harmed, nearly harmed, or reported feeling unsafe —
including reports that turn out to be unfounded.

```
report received
   → Deed paused for affected participants        (immediate, no approval needed)
   → named responder notified                     (within the tier's stated response time)
   → participant contacted and supported
   → facts recorded; no determination made on the participant's claim meanwhile
   → review: was the tier right? were controls in place? did they work?
   → re-tier                                       (always, after any incident)
   → resume, modify, or close the Deed             (governance decision, recorded)
```

Two rules that are easy to get wrong:

- **Pausing does not require approval.** Anyone may pause. Resuming requires a governance decision.
- **A paused participant's claim is not rejected.** Their work still happened. Determination waits;
  it does not default to no.

## Never design

- A Deed that puts a young person somewhere no one knows they are
- Evidence requirements that photograph or identify other minors without a consent basis
- Rewards structured so that declining on safety grounds costs the youth materially
- A rejection path that leaves a participant unpaid for work that was actually performed
- Retention of youth data with no deletion date
- Rule changes mid-flight that disadvantage youth already participating

## Recording

```yaml
safeguarding:
  tier: low | medium | high
  signoff:
    required: true | false
    by: <named person>
    role:
    at:
    five_questions_answered: true | false
  consent:
    capacity_model: age_tiered | guardian_default | jurisdictional
    provider_decision_recorded: true | false
    guardian_verification_method:
    assent_captured: true | false
  constraints: []         # each: { constraint, control_id, in_place }
  incident_response:
    responder:
    response_time:
    escalation:
  incidents: []           # each: { at, summary, paused, retiered_to, outcome }
```
