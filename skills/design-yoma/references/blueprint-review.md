# Blueprint Review

One independent review of the complete blueprint, after all five phases are committed.

## What this is not

Specialist references validate individual documents **during authoring** — that a rubric path
resolves, that a bid field is necessary, that a grant expires. That work is real and it is not the
review.

The review asks a different question, and only one reviewer asks it:

> **Is the Deed a young person would actually encounter the same Deed these documents describe?**

Twenty-five individually valid documents can still add up to something incoherent: a listing that
promises what the rubric will not accept, instructions that omit a rule that rejects, a determination
model whose human capacity the claim volume will swamp. No per-document check catches those, because
none of them is a defect *in* a document.

## When it runs

After all five phase commitments. Not before — a review of an unfinished blueprint reviews the wrong
thing, and re-reviewing after every change is how review becomes ceremony.

A re-commitment after the review passed **invalidates it**. A reviewed blueprint that then changed has
not been reviewed. Say so plainly rather than carrying a stale pass forward.

## Independence

The reviewer must not be the person who authored the blueprint. Where the provider is small enough
that this is difficult, the reviewer must at least be someone who did not make the design decisions —
and that constraint is worth stating to the provider rather than quietly relaxing.

The reviewer needs the whole blueprint, the accepted-for-later list, and the pilot record. They do not
need the authoring history.

## What the reviewer assesses

Six questions. Each looks across controls, not at one.

### 1. Coherence

Do the documents agree with each other?

- Does the listing promise only what the rubric will accept?
- Do the instructions disclose every rule that can reject a claim?
- Does the bid form ask for everything eligibility actually tests?
- Does the evidence registry produce every field the rubric reads?
- Does capacity fit the funded runway?

### 2. The young person's path

Walk it as a participant, not as a designer. Find the opportunity, apply, get accepted, do the work,
submit, get judged, get paid — and separately, get rejected.

- At each step, does the young person know what is happening and what comes next?
- Is anything a surprise that should not be?
- Does the rejection path leave them with something they can act on?

### 3. Proportionality

- Is the reward defensible against the effort, said out loud?
- Do the fraud controls cost honest youth more than they cost cheats?
- Is the evidence burden proportionate to the reward?
- Is the safeguarding tier honest, or convenient?

### 4. Capacity realism

- Can the named humans actually determine claims at the expected volume, within the stated time?
- Is there a real person behind every named responder, or a role with nobody in it?
- What happens on the week the coordinator is away?

### 5. Failure behaviour

- What happens when the budget runs out mid-Deed?
- What happens when a claim is disputed?
- What happens when a safeguarding incident occurs?
- What happens when the evidence is genuine but the rubric rejects it?

### 6. Accepted-for-later review

Every deferred item, examined together. Individually reasonable deferrals can add up to a Deed that is
not ready. Ask: would a young person notice these are missing?

## Review rounds

Rounds are **immutable**. A round is a record of what was found, not a working document.

```yaml
review_round:
  round: 1
  blueprint_hash:            # the exact blueprint reviewed
  reviewer:
  independent_of_author: true
  reviewed_at:
  findings:
    - id: R1-01
      question: coherence | youth_path | proportionality | capacity | failure | deferred_items
      severity: required_change | recommendation
      finding: <what is wrong>
      consequence_for_youth: <who is hurt, and how>
      controls_implicated: []
  outcome: changes_required | passed
  hash:
```

**`consequence_for_youth` is required on every finding.** A finding that cannot name who it hurts is
a preference, not a review finding — record it as a recommendation or drop it.

## Resolving findings

| Severity | Must be |
|---|---|
| `required_change` | Resolved before compilation. Amend the implicated controls, propagate re-checks, re-commit affected phases, open a new round. |
| `recommendation` | Either resolved, or accepted-for-later with a named owner. Never silently dropped. |

A new round reviews the **changed blueprint**, and records its own hash. Rounds accumulate; earlier
rounds are never edited. The review passes when a round returns `passed` with no open
`required_change`.

## What the review cannot do

- It cannot waive a publication blocker. Blockers are closed, and the reviewer is not an authority
  over them.
- It cannot grant safeguarding sign-off.
- It cannot authorise publication — that is a separate, external act.
- It cannot approve a Deed it has not seen at its current hash.

## What to tell the provider

Do not present a review as a verdict on their work. It is the last chance to catch something that
would land on a young person, and the findings are usually about coherence rather than competence.

Play it back as: what was found, what it would mean for a participant, what changes, and what happens
next. Group findings by the young person's path rather than by control id — a provider can act on
"someone who's rejected has no way to ask why" far more readily than on "C17 dispute_path
insufficient".
