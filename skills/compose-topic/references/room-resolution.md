# Matrix room and Domain resolution

Use this reference when the host has not supplied one exact current `roomId`, the person names a room or Domain, or they may want a new room.

## Keep identifiers separate

| Identifier | What it proves | What it does not prove |
| --- | --- | --- |
| Matrix room ID such as `!abc:example.org` | one concrete Matrix room | that the actor may write there or that its audience is appropriate |
| Matrix room name | a human-facing label | uniqueness or stable identity |
| Matrix alias such as `#team:example.org` | a resolvable room alias | a joined room until the host resolves and verifies it |
| IXO Entity DID such as `did:ixo:entity:...` | one Domain or entity context | a Matrix room ID or membership relationship |

Never derive a room ID from a DID, a similar-looking room name, an entity profile, or a navigation route. Never pass a DID into `roomId`.

## Resolution sequence

1. Parse the target separately from the Topic subject. “Create this here” selects the supplied current room; “in Yoma Design Studio SC” may name a room, a Domain, or both and must be resolved.
2. Inventory the actual host tools and current context. Do not assume a tool from this reference is installed.
3. If an explicit `!roomId` is supplied, verify joined membership, Topic management permission, and audience suitability.
4. If a room name is supplied, list joined Topic-capable conversation rooms. Compare an exact normalized name first, then bounded partial matches. One verified match resolves the room; several plausible matches require a user picker with both name and `!roomId`.
5. If the label is also or instead an entity name, resolve it separately. Rank bookmarked candidates first. A single entity match may establish `domainDid`; multiple matches require a user choice. Profile lookup may confirm the entity type, but it still does not resolve a room.
6. Map a verified Domain to rooms only through host-supplied Domain/space membership metadata. A resolved `named-domain` target must preserve both its verified `domainDid` and `domain-room-graph` evidence for the selected `!roomId`. If that relationship is unavailable, show suitable joined room candidates or offer to create a new conversation room under the Domain.
7. Call the Topic proposal or host adapter only after `routing.roomResolution.status` is `resolved` with one real `!roomId`.

Do not loop on a failed entity-profile request. Retry once only when the host marks the failure transient. Otherwise preserve the entity candidate, keep the room unresolved, and move to a concise user choice or a useful preview.

## Portal tools when available

| Tool | Correct use | Boundary |
| --- | --- | --- |
| `list_rooms` | list joined Topic-capable conversation rooms with names and room IDs | use this for room identity; a missing name is not proof that the named Domain has no room |
| `findEntity` | resolve a Domain/entity name to bookmark-first DID candidates | names are not unique; one DID is not a room |
| `getEntityProfileDomain` | confirm the selected entity's type and profile | timeout or success does not establish Domain-to-room membership |
| `propose_topic` | open a new Topic Draft in one resolved joined room and run its duplicate check | `roomId` is preferred; `roomName` is safe only when it resolves to exactly one joined room |

The current thin `propose_topic` surface may carry narrative fields without carrying the selected Kind. Treat that as a Kind-handoff capability gap: do not claim the inferred Kind was instantiated, and do not let the editor silently default to Discussion. Use a Kind-preserving Topic adapter or stage the selected Kind through a host capability before commit.

`create_page_room` and `create_template_room` create BlockNote page or Flow-template rooms. They are not substitutes for a Topic-capable conversation-room creator.

## New room under a Domain

Create a new room only when the person explicitly requested it or accepted the new-room option. Room creation is a separate external mutation before Topic creation.

Before invoking an available conversation-room creation tool, resolve:

- the exact parent Domain DID and Domain/space relationship;
- the proposed room name;
- the intended audience or the Domain's explicit default membership policy;
- E2EE and federation policy;
- the actor's room-creation permission; and
- explicit confirmation of the room-creation side effect.

The tool must create a normal conversation room, attach it to the verified Domain/space, and return its actual `!roomId`. Verify joined membership and Topic management permission from the returned room before setting `roomResolution.status: resolved` and proposing the Topic.

If no such tool exists, keep the Topic as a useful preview and return `BLOCKED_ROOM_CREATION_UNAVAILABLE`. Tell the person that the Domain is resolved but a conversation-room creation capability is missing; do not divert the work into a personal, page, or template room.

Record room-specific failure details in `routing.roomResolution.blockedCode` and preserve the same failure in `quality.blockers`. Keep any independent Kind-handoff, authority, or host-capability blockers as additional entries rather than replacing the room blocker.

## Decision table

| Observed state | Result |
| --- | --- |
| current `roomId`, “here”, audience fits | resolve from `current-context` |
| one exact joined room-name match | resolve from `list-rooms` |
| several joined room matches | `needs-user-choice`; show bounded candidates |
| one entity match, no verified Domain-to-room relationship | keep `domainDid`, room `unresolved`; offer existing-room picker or new room |
| several entity matches | `needs-user-choice`; show bookmark-first Domain candidates |
| person chooses new Domain room and tool exists | confirm, create, verify returned room, then resolve from `room-creation-result` |
| person chooses new Domain room and tool is absent | `BLOCKED_ROOM_CREATION_UNAVAILABLE`; no Topic commit |
| no room can satisfy the audience boundary | `BLOCKED_CONFIDENTIALITY_BOUNDARY`; no Topic commit |

Entity evidence alone is never sufficient for `status: resolved`. Direct room evidence is one of: a verified current context, a user-supplied and verified room ID, `list_rooms`, an explicit Domain-to-room graph result, a user choice among verified candidates, or a room-creation result.
