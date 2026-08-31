# Topic Protocol v1 composition profile

This reference translates the pinned Topic Protocol release candidate into rules for composition. It does not redefine the protocol.

## Pinned profile

- package: `@ixo/topic-protocol@1.0.0-rc.3`
- git source: `482139c37eed86387a7ff2609a8672c4216e28f4`
- root version: `4`
- contract body version: `4`
- Matrix state profile: `qi.topic-contract-state/v4`
- Matrix event types: unchanged from the protocol
- legacy policy: every non-v4 Topic is unsupported and is never migrated by this skill

The root, immutable contract body, and materialized state are version 4. The Effective Shape is resolved deterministically for each Topic from pinned sources; it is not another persisted protocol record.

## Contract body v4

A materialized body requires:

- `version: 4`;
- revision, author, and timestamp;
- one `kindRef`;
- `workingMode`;
- `baseRecipe`;
- optional digest-pinned `topicRecipeRef`;
- at least one `shapeSources` entry;
- `shapeDigest`; and
- optional singular `claimBinding: { entityDid, collectionId }`;
- optional partial `activationPolicy`; and
- optional `assentPolicy` only when mutual agreement is explicitly required.

The composition envelope may keep revision, author, and timestamp `null` until the host resolves them. Its semantic layer must already contain the Kind, Base Recipe, Shape sources, and digest before any write.

Lifecycle status is not body content. Proposed, effective, and superseded state belongs to contract heads and replayed operations. Editing writes a new immutable proposal, invalidates confirmations for that proposal, and leaves the prior effective revision in force until replacement.

The removed v0.8 `recipe` and `agents` fields are invalid in a v4 body. The body also never carries an Action definition, effect contract, evaluation kit, schedule, payment contract, or settlement contract.

## Setup, confirmation, assent, and disputes

The activation policy keeps authority choices explicit:

- `editors`: named actors or roles allowed to prepare setup revisions;
- `confirmation`: named subjects plus `any`, `all`, or threshold semantics;
- `lifecycle`: optional effective, review, and expiry times with fixed `onExpiry: pause-consequential`; and
- `dispute`: explicit resolvers and an optional Flow/resource process.

A Draft may omit any of these choices. It cannot become effective until Kind-required content and activation fields resolve, confirmation subjects resolve to actors, the required revision-bound confirmations exist, optional configured assent is satisfied, and configured time gates pass. Lifecycle timing and dispute authority are optional; an open dispute without a resolver projects a blocking resolver-assignment obligation.

Authorship is provenance only. Creator, owner, membership, role labels, and completion authority never grant setup confirmation. Confirmation permits progression and must never be called agreement. Optional assent is separate and is the only basis for signatory or agreement language.

`confirm-setup`, pre-effectiveness withdrawal, `record-assent`, assent withdrawal, `raise-dispute`, and `resolve-dispute` are append-only, revision-bound operations. Confirmation and assent evidence binds the contract revision, body hash, policy digest, actor, timestamp, ability, and authority proof.

An open dispute suppresses consequential moves. Resolution requires its own authority and does not confirm setup, approve an outcome, or complete the Topic.

## Kind and Base Recipe

| Kind | Base Recipe |
| --- | --- |
| `project` | `project` |
| `task` | `project` |
| `agent_task` | `flow` |
| `proposal` | `proposal` |
| `evaluation` | `evaluation` |
| `claims` | `claims` |
| `question` | `research` |
| `discussion` | `discussion` |
| `incident` | `incident` |

A custom Kind label must name one canonical `baseKind`; it does not introduce new permissions, schemas, projection logic, or renderers. A verified Kind Profile and typed resource may still refine that base Kind.

## Shape resolution

Resolve in this order:

1. Base Recipe Shape;
2. optional Topic Recipe Shape;
3. Kind Shape;
4. optional Topic-local overlay.

Every source has `kind`, immutable `id`, `version`, and SHA-256 `digest`. Sort and digest through the protocol resolver. Copy the resolved source list and Effective Shape digest into both the root and contract proposal.

The host persists only:

- the Shape digest and pinned sources;
- the reproducible progress summary;
- Topic and contract revisions; and
- durable operations, records, bindings, and receipts.

If a source cannot be reproduced, the Topic is readable but degraded. Privileged moves are suppressed.

## Progression semantics

The Shape defines independent axes, transitions, gates, evidence, confirmation, and consequence.

Phases:

`forming → working → verifying → deciding → effecting → settling → complete`

`dormant` is used for archived or redirected Topics.

Conditions, in precedence order:

1. `disputed`, `failed`, or `blocked`;
2. `waiting`;
3. `expired`;
4. `needs-input` or `needs-confirmation`;
5. `review-due`;
6. `on-track`.

Missing or incompatible Shape/history produces `degraded`.

The phase is the earliest incomplete required Shape stage; absent axes are skipped. Only the Shape transition with `completesTopic: true` completes the Topic. Outcome, verification, Action, and settlement axes remain independent.

Waiting and blocking require:

- a source record or operation;
- an explicit target of kind actor, Flow, resource, or external system; and
- a reason code.

Never infer the target from `ownerId`.

Projection receives time with source, trust, and freshness. Review is non-blocking. Expiry pauses verification, decision, effect, settlement, and Topic completion, while review, editing, evidence submission, dispute handling, and replacement confirmation remain available. Consequential moves require fresh trusted time and fail closed without it.

## Obligations and primary progress

Every unmet requirement and ready transition projects as a structured obligation with a stable code, phase, kind, status, priority, consequence, presentation keys, focused input path, responsibility selector, required ability, provenance, and what resolving it unlocks.

Primary obligation precedence is deterministic:

1. dormant or degraded safety;
2. dispute or failure;
3. expiry;
4. explicit block or wait;
5. earliest unmet requirement in the active phase;
6. ready legal transition; and
7. scheduled review.

The primary obstruction remains visible even when another actor owns it. The viewer overlay classifies it as `mine`, `theirs`, `unassigned`, `unauthorized`, or `unavailable`, and exposes only legal, authorized moves.

## Legal transitions and viewer attention

Every transition declares:

- predecessor and target axis/state;
- command;
- required ability;
- actor or role assignment;
- structured gates;
- confirmation policy;
- consequence class;
- required operation, record, or receipt; and
- optional Flow/resource handoff.

The Portal may show “Needs you” only when:

1. the transition is legal at the pinned Topic, contract, and Shape revisions;
2. its gates are satisfied;
3. it is assigned to the viewer;
4. Matrix transport permission is verified; and
5. the protocol/UCAN ability is verified.

Membership, ownership labels, role names, or Action references are not authority.

The private viewer cache key is the tuple `topicRevision + contractRevision + shapeDigest`. The composition skill does not generate viewer attention.

## State tags

Protocol state tags have stable codes, Shape provenance, priority, and tone. They are derived by the projector and must remain separate from user-authored search tags in `body.tags`.

## Claims and evaluation

The Topic contract binds exactly one IXO Entity DID and one claim collection ID. Any suitable IXO Entity may attach the collection and protocol.

Resolution follows:

`entity DID → collection ID → protocol DID → rubric`

The protocol and rubric are read-only resolution evidence, not copied constitutional terms. The collection's entity controller delegates evaluation authorization to the evaluation service and specific evaluation oracle DID/account. A role label in the Topic does not substitute for that delegation.

## Flow, Action, and settlement boundary

Action/effect contracts live in registry Action definitions and their Flow instantiations. UCAN carries `can`, caveats, and delegated authority. UDID references bind Topic progression to evaluation, decision, effect, and settlement contracts through the Flow.

A Topic can retain:

- a Flow binding;
- context/resource references;
- UDID references;
- Action requests;
- semantic records; and
- finality-bearing receipts.

If the adapter for an external stage is unavailable, expose the phase and a Flow/resource handoff. Never simulate success.

## Inference policy

The canonical Shapes allow non-effecting inferred facts, summaries, and classifications to auto-accept when the concrete record class is permitted.

The following always remain proposed:

- contract;
- outcome;
- authority;
- Action;
- claim;
- evaluation; and
- settlement.

Writing an allowed inferred record into Matrix Topic state is not an external side effect. Anything that changes an external system, issues an instrument, invokes an Action, transfers value, or settles requires the relevant contract, authority, gates, and confirmation.
