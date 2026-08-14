# Publication Sequence

Completing five phases does not mean the Deed is published.

```
five phase commitments
  → publication blockers resolved
  → independent blueprint review passed
  → local compilation
  → externally authorised publication
  → verified network receipt
```

Six steps. Each produces evidence. **Never describe a Deed as published without the network receipt**,
and never describe the design as finished at the end of Phase 5 — it is finished when a young person
can find it and apply.

## Step 1 · Five phase commitments

All five phases committed, in order, each with a playback shown and no blocker open within it.

**Evidence:** five immutable commitment records, each hashed, each binding to the document hashes it
committed to.

**Fails when:** any phase is `recommitment_required` because a control it holds is marked
`needs_recheck`.

## Step 2 · Publication blockers resolved

The blocker list is closed and lives in `readiness-progression.md`. Blockers span phases — that is why
they are checked here rather than inside any one phase.

Accepted-for-later items surface again at this step. They do not block, but they are shown, because
this is the last point at which the provider can decide one of them should have been a blocker.

**Evidence:** a blocker check against the compiled blueprint, with each blocker either absent or
resolved with its resolution recorded.

**Fails when:** any blocker is open. Blockers cannot be deferred, waived, or traded against a score.

## Step 3 · Independent blueprint review passed

One reviewer, not the author, assesses the blueprint as a system. Rounds are immutable and accumulate.
See `blueprint-review.md`.

**Evidence:** a review round with `outcome: passed`, carrying the blueprint hash it reviewed.

**Fails when:** the passing round's `blueprint_hash` does not match the current blueprint. A blueprint
that changed after review has not been reviewed.

## Step 4 · Local compilation

The committed documents are compiled into the deployable artifacts. This is mechanical — compilation
does not make decisions, and anything that requires a decision at this point is a defect earlier.

Produces:

| Artifact | From | Destination |
|---|---|---|
| Domain package | C22 `domain_documentation` via `domain-author` | staged |
| Domain card content | C22 | `domain/card-build` |
| Opportunity document | C23 `vfs_packaging_and_listing` | VFS |
| Rubric envelope | C11 + C21 | `qi/eval.engine` |
| Flow template | C13 via `manage-flow` | protocol `Template` |
| Controller checklist | C24 `launch_readiness` | the human |

**Evidence:** a compilation record listing every artifact with its hash, and the blueprint hash it
compiled from.

**Fails when:** compilation requires a value no control settled. Return to the control, do not invent
it.

Compilation is still **local**. Nothing has left the machine.

## Step 5 · Externally authorised publication

A human controller executes the publication chain through the Portal, with its own confirmation gates.
**This skill does not execute any of it.** It produces the checklist and stops.

Order matters — everything recoverable happens before anything irreversible:

```
domain/card-build      entityType: "deed"    → unsigned VC        recoverable
domain/card-preview    oracle enrichment      → human approval     recoverable
domain/sign            MsgCreateEntity        → entityDid, txHash  IRREVERSIBLE
flow import            protocol Templates cloned into the domain   best-effort
qi/eval.engine         stage 1 preflight                           read-only
                       stage 2 register                            IRREVERSIBLE
                       stage 3 publish #rub                        REPLACES
opportunity document   emitted to VFS at a plain public URL
relatedDocument        entry added to the domain card
```

Two hazards that belong to this step specifically:

- **Flow import is best-effort and can partially succeed.** Verify which flows actually imported.
  Never assume.
- **`qi/eval.engine` stage 3 replaces `#rub` outright.** The blast radius — every collection sharing
  the protocol — was recorded at C21. Confirm the affected owners were told.

**Evidence:** `entityDid`, `transactionHash`, the imported-flow list, the `rubricId`, and the VFS URL.

**Fails when:** authorisation is claimed rather than evidenced. A staged payload is not a completed
action, and must never be reported as one.

## Step 6 · Verified network receipt

The last step, and the one most often skipped. Publication is not complete because a transaction was
submitted — it is complete when the network confirms the state, read back independently.

Verify, by reading rather than assuming:

- The entity resolves at its DID
- The `#rub` LinkedResource is anchored on the protocol, with `proof` matching the rubric id
- The opportunity document is retrievable at its public VFS URL
- The domain card carries the `relatedDocument` entry typed `yoma:Opportunity`
- The flow template is present in the domain's flow space
- A test bid can be submitted end to end

**Evidence:** the read-back result for each, with the source it was read from.

**Fails when:** any read-back disagrees with what was submitted. A submitted transaction that did not
land is a failure, not a delay.

## The yoma.world caveat

Mirroring to yoma.world is a **separate work stream**. This sequence produces the opportunity document
and the `relatedDocument` link in the correct shape. It does not push to Yoma.

**Never tell a provider their opportunity is live on yoma.world.** Tell them the listing is published
and linked for mirroring, and that appearing on yoma.world follows separately.

## Recording

```yaml
publication:
  stage: designing | blockers_open | in_review | compiled | authorised | published
  blueprint_hash:
  steps:
    phase_commitments:   { complete: , evidence: [] }
    blockers_resolved:   { complete: , open: [] }
    review_passed:       { complete: , round: , reviewed_hash: }
    compiled:            { complete: , artifacts: [] }
    authorised:          { complete: , entity_did: , tx_hash: , rubric_id: , vfs_url: }
    receipt_verified:    { complete: , read_backs: [] }
  yoma_mirror: not_this_workstream
```

## Rollback

Steps 1 to 4 are reversible: amend the control, propagate re-checks, re-commit, recompile.

Steps 5 and 6 are not. An entity cannot be unregistered; a published rubric cannot be unpublished,
only replaced. This asymmetry is the reason the whole sequence exists — everything checkable is
checked while checking is still free.

If something is wrong after step 5, the honest path is a corrective publication with its own
authorisation, recorded as such. Never quietly overwrite and present it as the original.
