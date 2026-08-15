# Topic Protocol and Portal adapter

The composer determines what the Topic should be. The host adapter performs canonical side effects.

## Required boundary

The adapter must use the deployed Topic Protocol runtime and Portal integration rather than reproducing Matrix envelopes, projection, authorization, Yjs persistence, or restart recovery in the skill.

A production host interface needs capabilities equivalent to:

```ts
type CommitContext = {
  roomId: string;
  actorId: string;
  now(): string;
  createTopic(input: {
    root: TopicRoot;
    anchor: TopicAnchor;
    firstRecord: ProposedRecord;
    idempotencyKey: string;
  }): Promise<{
    topicId: string;
    anchor: { roomId: string; rootEventId: string };
    stateRevision: string;
  }>;
  assembleCapsule(input: {
    topicId: string;
    expectedStateRevision?: string;
  }): Promise<TopicCapsule>;
  initializeCanvas(input: {
    topicId: string;
    roomId: string;
    rootEventId: string;
    compositionId: string;
    blocks: readonly CompositionBlock[];
  }): Promise<{ documentId: string; revision: string }>;
  appendRecord(input: {
    topicId: string;
    record: ProposedRecord;
    idempotencyKey: string;
  }): Promise<{ eventId: string }>;
  sendTopicMessage(input: {
    topicId: string;
    body: string;
    idempotencyKey: string;
  }): Promise<{ eventId: string }>;
  projectTopic(input: { topicId: string }): Promise<TopicProjection>;
  proposeContract(input: {
    topicId: string;
    previousRevision: string;
    nextRevision: string;
    bodyRef: ContractBodyReference;
    bodyHash: string;
    changedPaths: readonly string[];
    idempotencyKey: string;
  }): Promise<{ operationId: string }>;
  publishContractHead(input: {
    topicId: string;
    eventType: "ixo.topic.contract";
    stateKey: string;
    content: TopicContractStateContent;
    idempotencyKey: string;
  }): Promise<{ eventId: string }>;
  authorize(input: {
    roomId: string;
    topicId?: string;
    ability: string;
  }): Promise<boolean>;
};
```

These names are illustrative. Inspect deployed tool schemas before use.

## Preflight

Before any write:

1. validate the composition schema and semantic gates;
2. verify the pinned protocol/profile compatibility;
3. verify room audience and E2EE posture;
4. resolve actor and room;
5. verify `topic/create` for new Topics or the required write ability for an existing Topic;
6. compare `expectedStateRevision` when continuing or refining;
7. check the composition and call idempotency keys;
8. reject secrets and provider-private session IDs;
9. retain recovery state only in an approved encrypted store.

## New Topic transaction

Use this order:

1. persist a pending composition entry;
2. generate the stable Topic ID through the canonical runtime;
3. construct the complete root from `rootDraft` plus host-resolved identity and timestamps;
4. create or recover a native relation-free root, or retain the supplied root for an adopted anchor, and wait for the server event ID when needed;
5. write the exact accepted user-intent record as the first native thread child;
6. initialize the BlockNote/Yjs canvas idempotently;
7. append remaining proposed records;
8. send Qi's first Topic message;
9. project current Topic state;
10. optionally materialize the Topic Contract head after all required fields are resolved;
11. clear pending state.

Never thread against a local-echo event ID.

## Materialize the Topic Contract body

The skill returns a partial envelope and exact semantic body. The host resolves the envelope only at the trust boundary:

```ts
function materializeContractBody(
  composition: TopicComposition,
  input: {
    revision: string;
    authoredBy: string;
    authoredAt: string;
  },
): TopicContractBody {
  const draft = composition.contractDraft;
  if (draft.readiness === "blocked") {
    throw new Error("Contract draft is blocked");
  }
  return {
    version: 2,
    revision: input.revision,
    status: draft.envelope.status,
    authoredBy: input.authoredBy,
    authoredAt: input.authoredAt,
    ...draft.semantic,
  };
}
```

Before materialization, verify:

- exact intent fidelity;
- statement provenance and acceptance rules;
- selected decisions and achieved outcomes have record IDs;
- weighted criteria are complete and sum to 1;
- role assignees and agents resolve to participants;
- no unresolved suggested role was converted into an agent assignment.

## Build the state-event content

Only after root, canvas, and projection are available, construct:

```ts
const content: TopicContractStateContent = {
  version: 2,
  profile: "qi.topic-contract-state/v2",
  schema: TOPIC_CONTRACT_SCHEMA,
  topicId,
  anchor,
  manifest: originalRootManifest,
  contracts: safeContractHeads,
  projection: safeProjectionPayload,
  policy,
  bindings: {
    canvas: {
      provider: "ixo.matrix-crdt",
      format: "blocknote",
      collaboration: "yjs",
      roomId: anchor.roomId,
      documentId: canvas.documentId,
      contentEmbedded: false,
    },
    context: projectedContext,
    flows: resolvedFlowBindings,
  },
  provenance,
};
```

Validate cross-field invariants before publishing:

```text
state_key == content.topicId
manifest.id == content.topicId
room_id == anchor.roomId
projection topic, room, and root == identity and anchor
canvas.roomId == anchor.roomId
reference-only bodyHash == bodyRef.contentHash
embedded projection includes rootEventId in basedOnEvents
```

The host must additionally authenticate the Matrix sender, verify room power levels and Topic capability, reproduce the projection, verify referenced bytes and hashes, and enforce the event-size budget.

## Disclosure

- `inline`: only for compact, non-sensitive content below the configured budget.
- `reference-only`: required for confidential or restricted content and recommended for large contracts.
- Matrix or VFS references do not imply access authority.
- Never embed canvas content or provider-private session identifiers.

## Existing Topic refinement

For `continue` or `refine`:

1. assemble a fresh Topic Capsule;
2. compare its revision to `topic.expectedStateRevision` and `contractDraft.lifecycle.baseRevision`;
3. treat accepted state and explicit instructions as authoritative;
4. derive proposed records, supported Topic operations, and canvas changes;
5. do not treat a replacement state event as acceptance of semantic changes;
6. rebase or surface conflict when revision changed;
7. publish a new materialized head only after authoritative writes and projection complete.

Topic Protocol `0.5.0` records refinement through `update-contract` with previous and next revisions, the validated body reference and hash, and changed semantic paths. Never use a projected state-event replacement as the write operation. Acceptance and supersession remain separate capability-gated operations.

## Recovery

- root send failed before acceptance: retry through canonical runtime recovery;
- root may have succeeded but anchor is unknown: discover it and refuse duplicate creation;
- first record failed: retain a recoverable empty Topic;
- canvas failed: retain Topic and intent record, then retry with the same composition ID;
- first message failed: retain Topic and record the failure; do not roll back the root;
- contract-head publication failed: authoritative Topic history remains valid; retry idempotently after reprojection;
- stale revision: reassemble, recompose, or return conflict.

## Thin-tool warning

A tool that accepts only `roomId + title` is insufficient for production composition because it discards kind, context, Overview, first intent record, and recovery semantics.

Prefer a host-local adapter backed by the Topic runtime, or add a policy-gated `topic_composition_commit` surface that accepts the validated composition. It must not invite participants or execute external actions as part of creation.
