# Shared Topic host contract

This is an integration requirement for the skill, not a new Topic Protocol event schema or an authorization grant. The skill cannot establish these facts by prompting itself.

## Required before responding in a shared thread

The host resolves:

- One exact `roomId`, Topic ID, immutable thread root and current Topic revision from supported Topic records.
- One active facilitator identity authorized for that Topic, with a verified binding source and current ability to read and post in the room.
- The triggering Matrix event ID, its actual sender, and the actor whose permissions apply to this turn.
- Shared Topic records and thread history, with event IDs, authors, revisions, edits and redactions preserved. A participant's private checkpoint is not the shared transcript.
- A deduplication key and a serialized turn queue for the shared thread. Replies from different people remain separately attributed; one person's words must never be appended under another's identity.

Resolve these server-side. Model-supplied identifiers can select a proposed target for verification but cannot establish the binding or the actor. A room-oracle participation record identifies an oracle; its display fields and authorization labels are not a substitute for verified Topic abilities.

Fail closed for a missing, ambiguous, revoked, unsupported or stale binding. Do not relax the general group-chat mention guard to make every room message trigger a facilitator. A recognized, authorized Topic thread is the specific additional route.

## Context and capabilities

The runtime should reuse Companion model and skill infrastructure while providing a shared conversation scope. Do not open the sender's private Companion checkpoint, VFS, user-memory search, credentials or private browser state for this scope. Read shared attachments only through the room's authorized attachment route.

Expose only capabilities verified for this turn. At minimum the facilitator needs a shared Topic read and an attributed reply to its bound thread. Staging, confirmation, execution, evaluation, completion and settlement require their own host capabilities and authority checks. With only reading and replying available, discuss and draft; never claim an edit or transition occurred.

The shared `propose_topic_changes` capability publishes proposed field values only. Its `ixo.topic.change_proposal` envelope includes the exact Topic, room, thread, revision and projection event. Portal verifies the PA publisher and refreshes source-message, membership and projection state before opening the existing authoring review. It carries the freshly verified contract revision, body hash, Shape digest and policy digest into staging. Saving remains a separate participant action under the existing Topic authority checks. The shared message event ID is retained as proposal provenance.

Tools return receipts containing the exact target, operation ID, idempotency key, resulting revision or event ID and status. If reconciliation remains inconclusive, retain the operation as unknown and stop the affected mutation; use the host's recovery path or ask the operator to reconcile it. A timeout does not establish failure or justify a new operation identity. Before retrying an uncertain mutation, reconcile its idempotency key. Before publishing an answer based on a long-running read or tool call, check that its binding and question/revision still apply.

## Suggested replies and feedback

An ongoing suggestion needs an authenticated producer and an envelope binding its text to the Topic, room, thread, question and revision. The host decides whether the question is still current and whether the local composer is empty. Suggestions are disposable; a stale answer should disappear rather than move to another question.

Feedback collection is optional and scope-bound. It must distinguish local acceptance from a send and a send from an achieved outcome. Store only authorized case material; do not use private Companion material as room evidence or room material as global training data. Candidate changes need versioned evaluation, approval and rollback before deployment.

## Current integration boundary

Portal's private Compose Topic handoff deliberately sets `doNotJoinSharedRoom` and stages changes for review. The optional opening suggestion is supported by the creation handoff. Neither path activates a shared facilitator.

The current Personal Agent integration target is QiForge's `feat/workers-runtime` branch. Personal turns use a Durable Object keyed by participant DID, which owns the private checkpoint, VFS copy and delegation. The local Topic integration adds an opt-in `TopicChatDO` keyed by oracle, room and thread. Configured Topic turns use verified shared history, a serialized queue and a context-only agent. The gateway rechecks history before publication; persisted receipts prevent duplicate replies and an uncertain send stops later replies pending reconciliation.

This local route has not been activated on devnet. Its shared agent bundles the reviewed skill and this host contract as versioned instructions, with per-file source hashes; it does not discover or load participants' private skills. The `suggest_topic_reply` tool can prepare an answer attached to the exact question in the agent's final message. The host supplies the room, Topic, thread and revision in `ixo.topic.reply_suggestion` metadata. Portal accepts this metadata only from its configured Personal Agent while that agent is joined and can post; the enclosing event identifies the question. This enables a local editable suggestion, not a participant message or lifecycle authority. Lifecycle mutation tools and reviewed learning remain to be connected. General Matrix group-chat support and Node's channel-memory plugin are separate. Do not use the deprecated Companion repository to infer or implement this wiring.
