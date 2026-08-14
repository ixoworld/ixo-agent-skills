# Accessibility and Inclusion

Governs control C7. The question is not whether the Deed is technically usable — it is whether the young
people it targets can actually reach it with the device, connection, money, and language they have.

A Deed that only the best-resourced youth can complete is not an opportunity. It is a filter.

## The device floor

State the minimum device the Deed works on, then verify the task against it rather than against the
designer's phone.

| Class | Assume | Implication |
|---|---|---|
| Feature phone | SMS/USSD only, no app, no camera or very poor camera | Photo evidence is impossible; text-only claims |
| Entry Android | 2 GB RAM, small screen, old OS, low-quality camera | Heavy web forms fail; large uploads fail |
| Mid Android | Workable camera, adequate browser | Most designs work; still check upload size |
| Shared device | Not the participant's own; limited private time | Long sessions, saved state, and privacy all fail |

**Shared devices are the case most often missed.** If a young person borrows a phone for twenty
minutes, a Deed requiring a fifty-minute uninterrupted session is unreachable for them, and every
form must survive being resumed.

## Bandwidth and offline

| Check | Test |
|---|---|
| Form loads | On 2G/3G, within a tolerable wait |
| Evidence uploads | A photo at the stated quality uploads on the bandwidth floor without failing |
| Resumability | An interrupted upload resumes rather than restarting |
| Offline capture | Work done away from signal can be captured and submitted later |
| Queue integrity | Queued submissions survive the app or browser closing |

If the work happens where there is no signal — a field, a river, a rural clinic — **offline capture is
mandatory, not a nice-to-have**. A Deed that requires connectivity at the moment of work excludes the
places that most need it.

## Data cost

The most common way a Deed quietly costs youth money.

```
data_cost:
  per_completion_mb:        # form load + evidence upload + confirmation
  local_cost_per_mb:
  money_per_completion:
  share_of_reward:          # money_per_completion / reward_per_completion
```

**Hard rule:** a youth must not bear a net cost to participate. If `share_of_reward` is material, the
provider either reduces the payload, reimburses data, or raises the reward. Stating it and moving on
is not a resolution.

Reduce payload before raising reward — a smaller photo is cheaper for everyone than a larger payment.

## Language

| Check | Passes when |
|---|---|
| Instructions | Translated into the languages the target youth actually read |
| Bid form | Same |
| Claim form | Same |
| Rejection reasons | Same — this is the one most often left in English |
| Support | Someone answers in those languages |

Translation, not translatability. "It could be translated" means it is not.

**Rejection reasons in a language the youth does not read are functionally no reason at all.** They
cannot fix what they cannot understand, and they cannot dispute it either.

## Disability

At minimum, consider and record:

- **Visual** — screen reader compatibility, contrast, no meaning conveyed by colour alone, text
  alternatives for image instructions
- **Hearing** — captions or transcripts for any audio or video instruction
- **Motor** — no precise-timing or fine-gesture requirements; adequate touch targets
- **Cognitive** — plain language, one instruction per step, no time pressure, resumable progress
- **Physical task access** — where the task itself is physical, an alternative path or an explicit,
  justified note on why none exists

An explicit "no accommodation is possible for this task because it requires X, and here is why X is
essential" is an acceptable outcome. Silence is not.

## Equity

Beyond individual access, check who is structurally excluded:

| Dimension | Ask |
|---|---|
| Gender | Does timing, location, or travel disadvantage one group? Is lone travel at dusk safe for everyone? |
| Geography | Is this reachable outside major centres? |
| Documentation | Does eligibility require ID, an address, or a bank account that eligible youth lack? |
| Prior access | Does it assume prior training, a laptop, or an existing account? |
| Care responsibilities | Does the session length assume nobody is caring for someone else? |
| Connectivity poverty | Does the design assume home internet? |

Eligibility criteria that exclude by proxy are a control C10 critical fail. The test is not intent — it is
effect.

## Recording

```yaml
access:
  device_floor: feature_phone | entry_android | mid_android
  shared_device_supported: true | false
  bandwidth_floor:
  offline_capable: true | false
  offline_required: true | false
  resumable: true | false
  data_cost:
    per_completion_mb:
    money_per_completion:
    share_of_reward:
    resolution: reduced_payload | reimbursed | reward_raised | none
  languages: []
  rejection_reasons_localised: true | false
  accommodations: []       # each: { dimension, provision } or { dimension, none_possible_because }
  equity_review: []        # each: { dimension, finding, action }
```

## Control C7 fails when

- Data cost is material and unresolved
- Offline capture is required by the work and absent
- Rejection reasons are not in the youth's language
- The device floor is stated but the task does not work at it
- An eligibility criterion excludes by proxy without safeguarding justification
