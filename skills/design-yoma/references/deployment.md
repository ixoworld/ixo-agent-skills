# Deployment

What happens after control C24 approves. **This skill does not execute any of it.** It produces a
controller checklist; a human runs it through the Portal's own confirmation gates.

Read this to design *toward* a deployable shape, and to write an accurate checklist.

## The chain

```
1. domain/card-build      entityType: "deed"      → domainCardData (unsigned VC)   no chain effect
2. domain/card-preview    oracle enrichment       → enriched card + human approval  no chain effect
3. domain/sign            MsgCreateEntity          → entityDid, transactionHash     IRREVERSIBLE
4. flow import            protocol Templates cloned into the domain's flow space
5. qi/eval.engine         preflight → register → publish #rub                       IRREVERSIBLE
6. listing                opportunity document to VFS + relatedDocument on the card
```

Steps 3 and 5 cannot be undone. Everything before them is recoverable. Order the checklist so every
recoverable check happens first.

## Domain instantiation

Entity creation runs in stages: `chain → space → flows → finalizing`. The flows stage clones the
protocol's `Template` resources into the new domain's flow space, stamped for idempotent re-runs.

Two dependencies to have satisfied before instantiation:

- **A linked oracle**, if any imported flow has an agent step. Without it the step is dead
  (`BLOCKED_NO_ORACLE_LINKED`). Established at control C2.
- **The flow exists as a `Template` on the protocol**, not as a one-off. Established at control C13.

Flow import is best-effort and non-fatal — it can partially succeed. The checklist must include
verifying which flows actually imported, rather than assuming.

## The domain card

`domain/card-build` collects the card survey and produces an **unsigned** W3C Verifiable Credential.
`domain/card-preview` passes it through oracle enrichment and presents it for human approval before
signing. Only `domain/sign` touches the chain.

Design the card content at control C24 so the human approving the preview is checking, not authoring.

## The Yoma listing

Cross-posting to yoma.world is a **field on the domain card**, not a separate publication. The card's
`@context` carries `"yoma": "https://w3id.org/yoma/vocab/v1/"` and defines
`relatedDocument` as `schema:subjectOf` with `@container: @set`.

```jsonc
"credentialSubject": {
  "relatedDocument": [{
    "type": ["schema:DigitalDocument", "ixo:OpportunityDocument", "yoma:Opportunity"],
    "id": "https://<VFS host>/public/id/<document uuid>",
    "description": "Additional opportunity information for mirroring on yoma.world",
    "mediaType": "application/vc+ld+json"
  }]
}
```

So the listing is two artifacts:

1. **The opportunity document** — the youth-facing detail, emitted to VFS at a **plain public URL**.
   Template at `templates/opportunity-document.jsonld`.
2. **The `relatedDocument` entry** on the domain card pointing at it.

Two things to get right:

- The `id` is a **plain VFS URL**, not a DID reference, not a CID URI. This changed recently; do not
  copy older examples.
- Mirroring to yoma.world is a **separate work stream**. This skill produces the link and the document
  in the right shape. It does not push to Yoma, and must not claim the opportunity is live on
  yoma.world.

## What goes in the opportunity document

The youth-facing view. It must agree with what the gates decided — a listing that promises more than
the rubric will accept is how young people get hurt.

| Content | Source control |
|---|---|
| What the young person does | C6 `task_design` |
| Time and effort required | 6 |
| Device, connectivity, data cost | C7 `accessibility_inclusion` |
| Languages available | 7 |
| Who can apply, and how | C10 `bid_and_eligibility` |
| Capacity and what happens if oversubscribed | 10 |
| What they must submit as proof | C9 `evidence_capture` |
| **What gets a claim rejected** | C11 `claim_and_rubric` |
| Reward, rail, and when it pays | C16 `reward_and_settlement` |
| **Funding position** | 18 |
| Skills or credential earned | 6 |
| Who to contact, and the dispute path | C17 `verification_authority` |

**Rejection reasons and funding position are not optional listing content.** A young person is
entitled to know what will fail and whether the money is there before they commit their time.

## The controller checklist

What control C24 hands to the human. Recoverable checks first.

```markdown
## Before anything irreversible
- [ ] Rubric preflight passed with the intended settings
- [ ] Rubric draft descends from the currently published #rub
- [ ] Claim schema snapshot matches the live #vct
- [ ] Collections sharing this protocol identified and their owners informed
- [ ] Oracle linked, if any imported flow has an agent step
- [ ] Deed flow exists as a Template on the protocol
- [ ] Safeguarding sign-off recorded, where the tier requires it
- [ ] Funding position and exhaustion behaviour stated in the listing
- [ ] Rejection reasons present in the listing, in the youth's languages
- [ ] Dispute path and determination time limit stated

## Card, then chain
- [ ] domain/card-build reviewed — content matches the committed control decisions
- [ ] domain/card-preview approved by a named human
- [ ] domain/sign executed  ← IRREVERSIBLE — record entityDid and transactionHash

## After instantiation
- [ ] Verify which flows actually imported (import is best-effort)
- [ ] qi/eval.engine executed by a human controller  ← IRREVERSIBLE at stages 2 and 3
- [ ] Verify #rub anchored and the rubric id recorded
- [ ] Opportunity document emitted to VFS; plain public URL recorded
- [ ] relatedDocument entry present on the card, typed yoma:Opportunity
- [ ] First bid tested end to end before opening to youth
```

## Never

- Execute any step of this chain from within this skill
- Report a staged payload as a completed deployment
- Claim an entity is registered, a rubric published, or a listing live without the transaction hash,
  rubric id, or URL as evidence
- State that an opportunity is live on yoma.world — that mirroring is a separate work stream
