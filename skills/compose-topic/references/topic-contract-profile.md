# Topic Contract profile alignment

This skill targets two separately governed layers.

## Normative Topic Protocol baseline

Topic Protocol `0.5.0` defines the durable Topic identity, relation-free Matrix root, native thread messages, append-only operations and records, deterministic projection, Topic Capsule, room-policy boundary, agent participation, Topic-scoped authority, discovery, and VFS references.

The composer must preserve these invariants:

- stable Topic identity uses `ixo:topic:<UUIDv7>`;
- a live Topic has one canonical native or adopted Matrix anchor `{ mode, roomId, rootEventId, manifestSource }`;
- a native root is a relation-free `m.room.message`; an adopted anchor retains an existing thread root and sources its manifest from state;
- Topic messages are native `m.thread` children of the root;
- current state is projected from authenticated and authorised append-only operations;
- accepted records retain source-event provenance;
- room membership controls confidentiality;
- Topic capabilities restrict action authority but do not create a private subset inside the room;
- VFS references do not grant file-byte access;
- user preferences and provider-private external-session identifiers are not shared Topic state.

## Normative Topic Contract profile

`qi.topic-contract-state/v2` is pinned to the Topic Protocol `0.5.0` commit:

```text
71a6b7fe77a0d75a73a5412179080f2364ea48ce
```

The profile defines a Matrix state-event projection:

```text
type:      ixo.topic.contract
state_key: ixo:topic:<UUIDv7>
```

Its architectural role is a materialized contract head or pointer. It is not authoritative semantic history and does not replace the root, thread, operations, records, or projection.

The contract body contains:

```text
version
revision
status
authoredBy
authoredAt
workingMode
kindRef
recipe
intent
outcome
scope
constraints
assumptions
questions
risks
decision?
plan?
participants
roles
agents
completion
```

Draft bodies may omit unresolved semantic fields. Accepted bodies must pass the completeness rules for the standard base kind. Custom kinds inherit one standard base kind and cannot introduce new permissions, automation, schemas, or renderers. Risks are an Impact-only Incident structure; `likelihood` is legacy history and is never copied into v2.

The composer returns a `contractDraft` rather than a complete Matrix state event because these host-resolved values may not exist yet:

- stable Topic ID;
- room ID and server-assigned root event ID;
- exact projected state revision;
- author and trusted timestamp;
- canvas document binding;
- current deterministic projection;
- publication capability and state-event target.

## Composition-to-contract mapping

| Composition field | Topic Contract field or role |
| --- | --- |
| `sourceIntent.verbatim` | `semantic.intent.text` and first accepted intent memory record |
| `contractDraft.envelope` | contract body version, revision, status, author, and timestamp |
| `contractDraft.semantic` | exact semantic contract body |
| `topic.rootDraft` | proposed immutable root envelope, completed by the host |
| `canvas` | BlockNote/Yjs initialization plan; only its binding may enter state |
| `collaborationSuggestions` | unresolved suggestions; not contract participants or agents |
| `records` | append-only Topic record proposals |
| `execution.stateEventPlan` | optional materialized-head publication plan |
| `protocolBinding` | version, source pin, and authority posture |

## Acceptance rules

A proposition has one basis:

- `explicit`: directly stated by the user;
- `contextual`: directly present in accepted supplied Topic context;
- `inferred`: a reasonable interpretation not accepted by the user;
- `suggested`: new structure or action proposed by Qi;
- `retrieved`: obtained from a permitted source.

Only explicit or directly confirmed contextual propositions may be accepted by composition. Inferred, suggested, and retrieved content remains proposed.

A selected option does not become a final decision unless the contract contains `decisionRecordId` backed by an authorised decision record or operation. An achieved outcome requires `outcomeRecordId` backed by an accepted outcome record.

## Agent identity boundary

The Topic Contract profile requires `agentId` and `roleId`. A role suggested by the composer has neither deployed identity nor authority.

Therefore:

```text
collaborationSuggestions.agentRoles
        ↓ host resolves stable identity and policy
participants + roles + agents
        ↓ Topic Contract proposal
agent invocation
        ↓ separate capability-gated runtime action
```

Do not invent an `agentId`, convert a role label into an identity, or treat a capability reference as proof that a grant is valid.

## Disclosure boundary

The profile supports:

- `inline`: compact, non-sensitive contract body in state;
- `reference-only`: hash and encrypted Matrix-message or application-encrypted VFS reference.

Use reference-only for confidential or restricted work. The state event never embeds BlockNote/Yjs document content or provider-private session identifiers.

## Contract lifecycle

Topic Protocol `0.5.0` defines append-only `propose-contract`, `update-contract`, `accept-contract`, and `supersede-contract` operations. The state event exposes separate proposed and effective heads.

- this skill emits a proposal, never an implicit acceptance;
- every proposed change names the exact prior revision, body reference, body hash, and changed semantic paths;
- acceptance and supersession require separate authorised operations;
- a projected state event is not itself evidence that terms were accepted; and
- refine mode must name the exact base revision and rebase or surface conflict when it changes.
