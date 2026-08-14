# Risk Tiering

The tier is assigned at control C4 and parameterises controls C7, C10, C12, C16, C17 and C19. Nothing in Design or later
may proceed without it (`BLOCKED_TIER_UNASSESSED`).

## The question

Not "is this dangerous?" — almost nothing sounds dangerous when a provider describes it. Ask instead:

> **What is the worst realistic outcome for one young person doing this alone, and who would know?**

The second half matters as much as the first. A moderate hazard with a supervisor present is a
different Deed from the same hazard with nobody watching.

## Triggers

Tier is set by the **highest** trigger that fires. Triggers do not average.

### High

Any one of these:

- Participants are or may be **under 18**
- **In-person work at a location the provider does not control**
- **Lone working** — no other participant or adult present
- Travel required, especially outside the participant's home area
- Work outside daylight hours
- Physical hazard: heights, water, machinery, chemicals, traffic, animals
- Contact with **other minors, patients, or vulnerable people**
- Collection of **biometric data, health data, or precise location** about identifiable people
- Handling money or goods of material value
- Any activity requiring a licence, permit, or regulated qualification
- Reward high enough to create pressure to participate against better judgement

### Medium

Any one of these, and no high trigger:

- In-person work at a **provider-controlled** site with others present
- Photography or recording in public places
- Collection of location data about the participant only
- Contact with the general public
- Participant-supplied equipment of material value
- Reward large relative to local income for the effort involved
- Participants aged 18–20 in a first-work context

### Low

All of:

- Fully remote or digital, or in-person only at the participant's own choosing and location
- No third-party personal data collected
- No physical hazard
- Participants confirmed 18+
- Reward proportionate and modest

## What each tier changes

| | Low | Medium | High |
|---|---|---|---|
| **Control C4** sign-off | Provider self-attestation, spot-audited | Named safeguarding contact attests | **Named safeguarding officer signs off** |
| **Control C12** consent | Self-consent; standard notice | Self-consent; explicit processing notice | **Verified guardian consent where under 18**; narrow retention |
| **Control C16** reward | Standard disclosure | Standard disclosure | Disclosure plus a check that reward is not coercive |
| **Control C17** determination | Oracle may settle automatically | Oracle proposes; human above threshold | **Human determines every claim** |
| **Control C19** pilot | Synthetic data sufficient | Synthetic plus one supervised real run | **Supervised real run with a named observer** |
| Incident response | Standard | Named responder | **Named responder with a stated response time** |

## Spot audit — what "self-attestation" means at low tier

Low tier does not mean unchecked. Self-attestation is accepted at design time and **audited on a
sample** during control C25 operation. If an audit finds a Deed self-attested at low tier that should have
been medium or high, that is a governance incident, not a correction.

State the audit rate at control C18.

## Re-tiering

The tier is not fixed for the life of the Deed. Re-run control C4 when:

- The task changes location, timing, or supervision
- The participant age band changes
- Evidence requirements start touching third parties
- Reward increases materially
- A safeguarding incident occurs — **always re-tier after an incident**

A re-tier upward invalidates the controls it parameterises. C7, C10, C12, C16, C17 and C19 must be re-checked
against the new tier before the Deed continues.

## Recording

```yaml
risk_tier:
  tier: low | medium | high
  triggers_fired: []       # each: { trigger, evidence, tier_implied }
  assessed_by:
  assessed_at:
  signoff:                 # required at medium and high
    required: true | false
    by:
    role:
    at:
  audit:
    rate:                  # low tier only
    last_audited:
  retier_history: []       # each: { at, from, to, reason }
```

Never record a tier without recording which triggers fired. A tier with no trigger record cannot be
audited, and cannot be re-checked when the Deed changes.
