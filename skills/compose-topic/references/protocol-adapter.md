# Topic Protocol v1 and Portal adapter

The adapter is the trust boundary between a side-effect-free composition and the real Topic runtime. Use it only for commit or refine.

## Host responsibilities

The host, not the skill:

- allocates Topic and record IDs;
- creates or adopts the Matrix root;
- resolves the Effective Shape with @ixo/topic-protocol 1.0.0-rc.3;
- creates body references and hashes;
- computes the activation-policy digest;
- appends operations and records;
- projects v4 Matrix state;
- verifies Matrix write permission and protocol/UCAN abilities;
- binds the BlockNote/Yjs document;
- resolves claim protocol/rubric evidence;
- binds Flows and UDID references; and
- executes or observes external Actions and receipts.

Reject v0.8/v2 inputs. Do not migrate them.

## Preflight

Before a write:

1. validate the composition and source lock;
2. require `routing.roomResolution.status: resolved`, one verified `!roomId`, and direct room evidence as defined in [room-resolution.md](room-resolution.md);
3. confirm that `execution.hostContext.roomId` is the same resolved room and that a Domain DID was not substituted for it;
4. confirm root/body/state version 4 and profile qi.topic-contract-state/v4;
5. reproduce the exact Shape sources and digest;
6. confirm the inferred Kind, root Kind, contract Kind, Base Recipe, optional Topic Recipe, and Shape agree;
7. verify that the host creation path preserves that Kind instead of opening a default Discussion;
8. confirm the new root is Draft and the immutable body has no lifecycle status;
9. verify room/audience and E2EE policy;
10. verify Matrix write permission;
11. verify every proposed call's UCAN ability and caveats;
12. bind all calls to the current Topic revision, contract revision, body hash, policy digest, and Shape digest;
13. reject secrets, provider-private session IDs, and over-sized inline bodies; and
14. acquire or verify each idempotency key.

A missing Shape source makes the Topic degraded and non-executable. A role or owner label cannot repair an authority failure.

A resolved Domain is not a resolved room. If the person requests a new conversation room, create and verify it through a separate explicitly confirmed host capability before beginning this Topic create sequence. Page/template room creators are incompatible. If the host cannot carry the selected Kind or return one verified room ID, keep the Draft in preview and return the corresponding blocked state.

`routing.roomResolution.evidence` records how composition selected the room; it is not an authorization token or a host attestation. Before every write, the host must independently verify the exact room ID, joined membership, audience suitability, Topic-management permission, actor, and freshness. Never authorize a Matrix write from caller-supplied evidence labels or from a successful composition-validation result alone.

## Create sequence

Use one recoverable transaction identity:

1. resolve Shape and freeze its pins;
2. create or recover the relation-free v4 root in Draft status;
3. append the exact verbatim intent as the first accepted memory record;
4. store the immutable contract body and append `propose-contract`;
5. initialise or bind the canvas;
6. append proposed questions or assumptions;
7. project progress with projectTopicProgress;
8. write the v4 materialized Matrix projection; and
9. send the first Topic message.

Do not create a second root after an uncertain send. Recover by idempotency key.

The root and body both retain baseRecipe, optional topicRecipeRef, and the Effective Shape digest. The body also retains the pinned source list. Do not persist a separate Effective Shape event.

## Contract mapping

Merge the composition envelope and semantic body with version 4, the host revision, actor DID, timestamp, and the validated semantic fields. Do not add lifecycle status to the body. Proposal, effective, and superseded state belongs to contract heads and replayed operations.

Retain the partial activation policy exactly as reviewed. Missing editors, confirmation subjects, lifecycle policy, or dispute resolvers remain obligations and prevent effectiveness. Do not repair them from creator, owner, completion authority, membership, or role labels.

The semantic body must not contain:

- recipe;
- agents;
- Action or effect definitions;
- schedules or automation contracts;
- evaluation-kit contents;
- claim protocol/rubric resolution;
- settlement terms;
- progress, state tags, or viewer attention.

## Claims

The contract may contain only claimBinding with entityDid and collectionId.

The host resolves the entity and collection, then exposes:

- protocol DID;
- rubric ID and optional digest; and
- resolution provenance.

Keep this evidence read-only in the projection. Verify the entity controller's delegation to the evaluation service and oracle before offering an evaluation transition.

## Flow and external stages

Flow bindings, UDID references, Action requests, and receipts remain runtime artifacts outside the contract body.

For evaluation, decision, effect, or settlement:

- run only a legal Shape transition;
- verify gates and exact evidence requirements;
- require the transition's confirmation policy;
- verify the actor assignment and UCAN ability;
- append the required operation/record/receipt; and
- reproject.

If the adapter is unavailable, do not append success evidence. Return a blocked/degraded handoff to the bound Flow or resource.

## Viewer-specific Now

After protocol progress is projected, call projectTopicNow with the viewer ID, Matrix write permission, verified abilities, and explicit role assignments.

Cache private viewer facts by the tuple topicRevision + contractRevision + shapeDigest.

Never persist viewer attention in shared Topic state. Never offer privileged moves for dormant or degraded Topics.

Pass each structured obligation through to Portal presentation. Keep every active blocker available and the primary blocker visible even when another actor owns it. Offer only authorized actions and wait for the durable operation plus refreshed projection before announcing completion.

## Confirmation, assent, time, and disputes

Before `confirm-setup`, `withdraw-setup-confirmation`, `record-assent`, assent withdrawal, `raise-dispute`, or `resolve-dispute`, revalidate the exact contract revision, body hash, policy digest, actor, Matrix permission, required ability, and authority proof. Withdrawal is legal only before effectiveness.

Use Matrix-synchronised time for display. Before every consequential move, verify expiry using a fresh trusted source and fail closed when time is unavailable or stale. An open dispute suppresses consequential moves. Dispute resolution never implies setup confirmation, assent, outcome approval, or Topic completion.

## Refine sequence

1. verify v4 and exact Topic revision, contract revision, body hash, policy digest, and Shape digest;
2. apply only the reviewed change set;
3. preserve stable field and question IDs;
4. resolve a new Shape if Kind or Topic Recipe changed;
5. store the successor body;
6. append update-contract with changed paths and the prior/new hashes;
7. append the successor as proposed while leaving the prior effective revision in force; and
8. reproject.

`confirm-setup` is a separate revision-bound legal transition with separate authority. It is not agreement unless an independent assent policy is also satisfied.

## Failure and recovery

Return stable recovery details for partial writes. At minimum retain:

- composition ID;
- idempotency keys;
- room/root event IDs if allocated;
- Topic ID if allocated;
- last successful stage;
- Topic and contract revisions;
- Shape digest; and
- recoverable body/canvas references.

Never report external success without the exact finality-bearing receipt required by the Shape.
