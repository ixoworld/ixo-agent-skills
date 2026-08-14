# Fraud Resistance

Governs control C14. Name how the Deed can be gamed, decide what stops each, and state what each control
costs an honest young person.

## The design tension

Every fraud control taxes honest participants. A control that catches one cheat and frustrates fifty
genuine youth is a bad control, even though it works.

> Prefer controls that are invisible to someone doing the work properly.

State the honest-youth cost for every control. If you cannot estimate it, you do not understand the
control well enough to ship it.

## Proportionality

Control strength should track reward value and risk tier, not anxiety. A Deed paying a small ZLTO
amount for a photo does not warrant identity verification. A Deed paying meaningful cash for
unsupervised fieldwork does.

Over-controlling a low-value Deed is not caution — it excludes the youth with the least documentation,
who are usually the ones the programme exists for.

## The attack catalogue

Consider each. For every credible one, either site a control or record an accepted risk with an owner.

### Duplicate identity / sybil

One person, many accounts, many rewards.

| Control | Honest-youth cost |
|---|---|
| One approved bid per identity per collection | None — bid approval already gates claiming |
| Device or account age signals at bid evaluation | Excludes youth on new or shared devices — **check this** |
| Payout rail uniqueness (one bank/wallet per participant) | Excludes youth sharing a guardian's account |
| Human review of bids at approval | Evaluator capacity |

The bid approval step is the natural chokepoint. Because approval grants the authorization, controlling *who
gets approved* is cheaper and fairer than policing claims afterwards.

### Fabricated evidence

Work not done; proof manufactured.

| Control | Honest-youth cost |
|---|---|
| Evidence that is hard to produce without doing the work | None, if chosen well |
| Geotag or timestamp requirements | Fails on old devices and indoors — see `accessibility.md` |
| Cross-referencing two independent evidence items | More submission effort, more data cost |
| Sampling: human-verify a random share | None for most; delay for the sampled |
| Site or supervisor attestation | Requires someone present — changes the risk tier |

Sampling is usually the best value: it deters at low honest cost, and it scales.

### AI-generated evidence

Increasingly cheap, increasingly convincing.

| Control | Honest-youth cost |
|---|---|
| Require capture-in-app rather than upload-from-gallery | Blocks legitimate offline capture unless the app queues properly |
| Provenance or capture metadata checks | Fails on stripped metadata, which is common and innocent |
| AI-detection check via `aiChecks` | False positives on genuine photos — **must route to review, not reject** |
| Contextual specificity: evidence unique to time and place | Slightly more instruction to follow |

**Never auto-reject on an AI-detection signal.** The false-positive rate falls on honest youth who
cannot prove a negative. Route to `onFail: review`.

### Location spoofing

| Control | Honest-youth cost |
|---|---|
| Geotag plus a site-specific visual detail | Small |
| Cross-check against the declared district from the bid | None |
| Mock-location detection | False positives on some devices |

Weigh whether precise location is needed at all. Control C9 minimality applies: if no rule uses it beyond
fraud, consider whether a cheaper control suffices.

### Collusion

Applicant and evaluator cooperating. The one most often ignored, because it implicates staff.

| Control | Honest-youth cost |
|---|---|
| Evaluator cannot determine claims from participants they approved | None |
| Rotation or random assignment of evaluators | None |
| Sampling audit of approved claims by a second party | None for most |
| Separation of bid approval from claim determination | None |

All four are free to honest youth. There is little excuse for leaving collusion uncontrolled where the
provider both selects and judges.

### Farming

Gaming volume rather than faking any single claim — doing the minimum viable version many times.

| Control | Honest-youth cost |
|---|---|
| `frequency` limit in the rubric | Punishes fast genuine workers — set it from observed honest pace |
| Quality criteria in scoring, not just completion gates | None if disclosed |
| Diminishing reward beyond a threshold | Reduces earnings for the most productive |
| Capacity cap per participant | None if communicated up front |

Farming often signals a design problem rather than bad faith: if the minimum viable version passes,
the rubric is not asking for what actually matters.

## Where controls live

Site every control in a real mechanism. A control that is asserted but not placed does not exist.

| Mechanism | Good for |
|---|---|
| Bid eligibility rule | Identity, duplication, capacity |
| Bid evaluation (human) | Anything requiring judgement |
| Evidence requirement (control C9) | Making fabrication expensive |
| Rubric gate | Hard, unambiguous failures |
| Rubric `unique` / `frequency` | Duplication and farming |
| `aiChecks` → review | Signals too uncertain to auto-reject |
| Human determination (control C17) | High value, high risk, anything flagged |
| Sampling audit (control C25) | Deterrence at low cost |

## The honest-youth ledger

Sum the cost. If a genuine participant faces several controls at once, the total burden may exceed
what any single one suggested.

```yaml
threats:
  - threat: fabricated_evidence
    credible: true
    control: sampling audit at 10% plus geotag requirement
    sited_in: rubric_gate + operate_review
    honest_youth_cost: geotag fails indoors; ~1 in 10 face a short delay
    residual: low-volume fabrication may pass
    accepted_risk_owner: <named person>
```

## Control C14 fails when

- A credible high-value fraud path has no control and no accepted-risk note
- A control rejects honest youth at a rate the provider has not accepted
- A control requires evidence control C9 rejected as excessive
- Collusion is unaddressed where the provider both approves bids and determines claims
- An AI-detection signal drives automatic rejection
