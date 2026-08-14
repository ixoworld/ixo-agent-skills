# Phase Commitments

One atomic decision per phase, replacing per-document approvals.

## Why this shape

Asking a provider to review and approve twenty-five documents makes designing a youth opportunity
feel like operating workflow software. It also produces worse decisions: twenty-five shallow
approvals are not equivalent to one considered one.

So the runtime still records every document — schema-valid, immutable, hashed. But the provider
reviews the phase **as a coherent piece of work** and records one decision: *yes, continue*.

## What a commitment is

A commitment is the provider saying: **I have seen this phase as a whole and I am willing to build on
it.** It is not a claim that everything is perfect. Accepted-for-later items travel with it.

It is immutable. Re-deciding produces a new commitment that supersedes the old one, with a reason.

## When a commitment may be taken

All four must hold. Never take a commitment to keep momentum.

1. **Every control in the phase has a recorded document.** Not drafted — recorded, with a hash.
2. **No blocker is open in this phase.** Blockers cannot be committed past. Accepted-for-later items
   can.
3. **The phase has been played back** and the provider has actually seen it.
4. **No control in this phase is marked `needs_recheck`.** A stale dependency must be resolved before
   the phase can be committed on top of it.

If any fails, say which and what would resolve it. Never take a partial commitment, and never
describe a phase as committed when it is not.

## The playback

Before the commitment, show the phase as a whole. This is the moment the provider actually
understands what they have built, so it deserves care.

Structure it as:

1. **What this phase decided** — in the provider's language, not the control's. Not
   `bid_and_eligibility: recorded` but "Anyone aged 18 to 35 in the district can apply, and you'll
   take 60 people."
2. **What it means for a young person** — the consequence, stated plainly. "Someone who applies and
   isn't selected will be told why, and can apply again next round."
3. **What is still open** — accepted-for-later items, with who owns each.
4. **What happens next** — the phase ahead, briefly.

Offer the documents themselves for anyone who wants them, but never require reading them. A provider
who wants to see the rubric should be able to; a provider who does not should not be made to.

**Never play back a phase as a list of control names.** If a decision cannot be stated in a sentence a
provider would recognise, it is not ready to commit.

## Record shape

```yaml
phase_commitment:
  phase: discovery | design | validation | testing | deployment
  deed:
  pod:
  committed_by:              # a named person
  committed_at:
  documents:                 # every control in the phase, with the hash committed to
    - control: C11
      name: claim_and_rubric
      version: 1
      hash:
  playback_shown: true       # must be true
  checklist:
    blockers: []             # must be empty
    accepted_for_later:      # travel forward with the commitment
      - item:
        owner:
        raised_at_control:
  supersedes: <commitment hash or null>
  reason_for_recommitment:   # required when superseding
  hash:                      # of this commitment record
```

The `documents` list is what makes invalidation work: a commitment binds to specific hashes, so a
later change to any of them is detectable rather than silent.

## Re-commitment

When a control changes after its phase was committed:

1. The changed document gets a new version and hash.
2. Controls that consume it are marked `needs_recheck` — only those. See `semantic-dependencies.md`.
3. The phase holding any `needs_recheck` control is marked `recommitment_required`.
4. Downstream phases stay committed **unless** they hold a control that consumes the changed
   document. A change to the reward does not invalidate the safeguarding tier.
5. Re-commitment needs a fresh playback of what changed — not the whole phase again, just the delta
   and its consequences.

Never silently carry a commitment forward across a change. Never invalidate a whole phase because one
document moved.

## What a commitment does not do

- It does not publish anything.
- It does not approve a side effect. Actions requiring confirmation still require it, separately.
- It does not substitute for safeguarding sign-off, which is a distinct act by a distinct person.
- It does not substitute for the independent blueprint review.
- It does not make accepted-for-later items disappear. They travel forward and surface again at
  readiness.

## Phase order

Phases commit in order. Discovery, then Design, then Validation, then Testing, then Deployment.

Work may run ahead informally — a provider thinking aloud about rewards during Discovery is fine, and
capturing it is fine. But the document is not recorded into a later phase's control until that phase
is reached, and no phase commits before the one before it.

The one hard interlock: **no Design work proceeds without a safeguarding tier**, because the tier
parameterises accessibility, bid design, consent, reward and determination. Discovery must be
committed first.
