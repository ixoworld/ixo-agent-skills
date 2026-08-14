# Phase 5 · Deployment

**The provider is documenting, reviewing, compiling and publishing.**

Five controls: C21 `rubric_publication`, C22 `domain_documentation`,
C23 `vfs_packaging_and_listing`, C24 `launch_readiness`, C25 `operate_improve`.

Committing this phase is **not** publication. It is the point at which the blueprint is ready to go to
independent review, and then through the publication sequence. See `publication-sequence.md`.

## Opening the phase

> "Last phase. We package everything up, work out exactly what a young person sees when they find
> this, and set up how you'll keep an eye on it once it's running. Then it goes for review, and after
> that you — or whoever authorises publication — takes it live."

## C21 · `rubric_publication`

**Settles:** the `qi/eval.engine` configuration and the publication plan for the rules.

The read-only preflight already ran at C20. This control settles **how the irreversible stages will be
executed**, by whom, and what they will affect.

```
Stage 1  preflight    READ-ONLY      ← already passed at C20
Stage 2  register     IRREVERSIBLE   ← staged here, executed in publication
Stage 3  publish      REPLACES #rub  ← staged here, executed in publication
```

### The hazards this control exists to manage

| Hazard | What this control must record |
|---|---|
| Publication replaces `#rub` outright | That the draft descends from the published rubric |
| The rubric anchors on the **protocol** entity | The blast radius — every collection sharing that protocol |
| The rubric id is the content hash | The expected id, so the receipt can be verified |
| `executionOwner: human`, `cardinality: once` | The named controller who will execute it |

**Ask:** are there other opportunities using these same rules? Who's going to press the button?

**Blockers:** preflight not passed; a live-collection draft not descended from the published rubric;
snapshot drift; publication staged without naming the affected collections or their owners.

## C22 · `domain_documentation`

**Settles:** the domain package and the domain card content. **Route to `domain-author`.**

C2 settled the POD's *decisions*. This control produces the *documentation* — validated against the
pinned `domain.md` specification, which `domain-author` owns. Never author it from memory
(`BLOCKED_SPEC_UNAVAILABLE` if the spec cannot be resolved).

Also settles the **domain card** content that `domain/card-build` will collect — written now so the
human approving the preview is checking, not authoring.

**Blockers:** the domain package fails `domain-author` validation; card content contradicts a
committed control.

## C23 · `vfs_packaging_and_listing`

**Settles:** what a young person actually sees, and where it lives.

Two artifacts:

1. **The opportunity document** — youth-facing detail, emitted to VFS at a **plain public URL**.
   Template at `templates/opportunity-document.jsonld`.
2. **The `relatedDocument` entry** on the domain card pointing at it, typed `yoma:Opportunity`.

```jsonc
"relatedDocument": [{
  "type": ["schema:DigitalDocument", "ixo:OpportunityDocument", "yoma:Opportunity"],
  "id": "https://<VFS host>/public/id/<document uuid>",
  "description": "Additional opportunity information for mirroring on yoma.world",
  "mediaType": "application/vc+ld+json"
}]
```

The `id` is a **plain VFS URL** — not a DID reference, not a CID URI.

### Mandatory listing content

The listing must agree with the committed controls. A listing promising more than the rubric accepts
is how young people get hurt. Two items are **not optional**:

- **What gets a claim rejected**, in every language from C7
- **The funding position**, from C16

**Ask:** nothing new — this is compiled from what is already decided. If a question arises here, an
earlier control is incomplete; go back to it.

**Blockers:** rejection reasons absent or not localised; funding position absent; listing content
contradicting a committed control.

### The yoma.world caveat

Mirroring to yoma.world is a **separate work stream**. This control produces the document and the link
in the correct shape. It does not push to Yoma.

> **Never tell a provider their opportunity is live on yoma.world.** Tell them the listing is
> published and linked for mirroring, and that appearing there follows separately.

## C24 · `launch_readiness`

**Settles:** the readiness decision, its conditions, and the controller checklist.

Scoring is in `readiness-progression.md`, along with the closed blocker list.

**Blockers override the score.** A blueprint scoring 94 with any blocker present is blocked. Never
trade one against the other, and never present a score as if it were permission.

Accepted-for-later items surface here — the last point at which the provider can decide one of them
should have been a blocker. Show them.

**Produces:**

- Readiness score and decision
- Conditions, each with a **named owner and a due point**. A condition with neither is a blocker
  wearing a disguise.
- The controller checklist for the human who will execute publication

**This control does not publish.** It produces a decision and a checklist.

## C25 · `operate_improve`

**Settles:** how the Deed is watched once young people are in it. A **design-time** control — the
operating model, settled before youth arrive rather than after.

| Signal | Escalate when |
|---|---|
| Rejection rate | Above the rate disclosed at C8 — high rejection means the rules were not knowable |
| Time to determination | Exceeds the C17 limit — youth waiting unpaid |
| Disputes upheld | Any pattern — upheld disputes mean the rubric is wrong |
| Drop-off after approval | Materially above expectation — the task is harder than described |
| **Safeguarding incidents** | **Immediately, every time** |
| Fraud signals | Honest-youth rejections detected |
| Runway | Approaching the exhaustion trigger |
| Youth feedback | Any theme repeating — the only signal that catches what metrics miss |

**Two standing rules:**

- **Any safeguarding incident escalates immediately and pauses the affected Deed** pending review.
  Anyone may pause; resuming is a governance decision. A paused participant's claim is not rejected —
  their work still happened.
- **A rubric change after launch is a new publication.** It replaces `#rub` outright and changes the
  rules under youth already participating. Youth who bid under the old rules should be judged under
  them.

**Ask:** who's watching this week to week? Who gets called if something happens on a Saturday?

**Blockers:** no named incident responder; no review cadence; no owner on a watch signal.

## Playing Deployment back

> "Everything's packaged.
>
> **What someone sees.** A page with what they'd do, that it's about two hours, what to bring, what
> they get paid, and plainly what gets a photo rejected — in English, Zulu and Xhosa. It also says
> you've funded 60 places, so nobody applies not knowing.
>
> **Where it lives.** The opportunity page sits at a public link, and the domain card points at it so
> it can be mirrored to yoma.world later. That mirroring is a separate piece of work — it won't appear
> there the moment you publish.
>
> **Readiness.** Scored 94, no blockers. One thing parked: the reflective tags.
>
> **Once it's running.** Thandi's the incident contact. You'll look at it weekly for the first month.
> If more than 15% get rejected, that's a signal the instructions aren't clear enough rather than that
> people are doing it wrong.
>
> **Next:** review by someone who wasn't part of building this, then publication."

## Committing Deployment

All five controls recorded, no blocker open, playback shown, nothing marked `needs_recheck`.

Then be explicit about what has and has not happened:

> "That's all five phases committed. Nothing is live yet — nothing has been registered, published or
> listed. Next is the independent review, then compiling, then someone with authority takes it live,
> and then we check the network actually has it."

## Phase document

```yaml
deployment:
  rubric_publication:
    preflight_passed:        # from C20
    opened_from_published:
    protocol_did:
    affected_collections: []
    affected_owners_told:
    expected_rubric_id:
    controller:
    settings: {}
  domain_documentation:
    package: staged | validated
    validated_by: domain-author
    card_content: {}
  listing:
    opportunity_document: staged | absent
    vfs_url:
    related_document_entry: staged | absent
    rejection_reasons_present:
    rejection_reasons_localised:
    funding_position_present:
    yoma_mirror: not_this_workstream
  readiness:
    score:
    decision:
    blockers_present: []
    conditions: []           # { condition, owner, due_point, evidence_required }
    controller_checklist: staged | absent
  operate:
    review_cadence:
    incident_responder:
    watch: {}                # signal → { threshold, owner }
    backlog: []
  checklist:
    blockers: []
    accepted_for_later: []
```
