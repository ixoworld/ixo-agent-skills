# Compose Topic production audit

Audit target: `compose-topic` `1.2.0`
Topic Protocol baseline: `0.5.0`
Topic Contract profile: `qi.topic-contract-state/v2`
Profile status: normative
Pinned protocol commit: `71a6b7fe77a0d75a73a5412179080f2364ea48ce`

## Review scope

The audit covers:

- Agent Skills package structure and frontmatter;
- Topic Protocol identity, root, thread, record, projection, authority, confidentiality, and attachment boundaries;
- alignment with the v2 Topic Contract body and Matrix state-event profile;
- provenance and acceptance semantics;
- stable participant, role, and agent identity;
- safe disclosure and Matrix event-size posture;
- revision and idempotency controls;
- decision and outcome authority;
- BlockNote/Yjs canvas boundaries;
- prompt-injection resistance, secret hygiene, and data minimisation;
- CLI scripts, exported `main()` functions, tests, examples, and behavioral eval coverage.

## Material findings and resolutions

### Contract model mismatch

Finding: the earlier skill used a generic `brief` rather than the proposed `TopicContractBody` semantics.

Resolution: `contractDraft.semantic` now maps directly to working mode, recipe, intent, outcome, scope, constraints, assumptions, questions, risks, optional decision and plan, participants, roles, agents, and completion. Host-resolved envelope and state-event fields remain explicit and nullable until materialisation.

### Unresolved agent identity

Finding: the earlier skill could describe an agent role in the same structure used for contract participants.

Resolution: unresolved roles are isolated under `collaborationSuggestions`. A contract agent requires a stable `agentId`, matching participant, matching role, and capability references supplied by the host.

### Capability syntax drift

Finding: earlier adapter examples used colon-form abilities such as `topic:create`.

Resolution: all skill output and examples use Topic Protocol slash syntax such as `topic/create`, `topic/read`, and `topic/write`. The validator rejects colon-form abilities.

### State-event authority ambiguity

Finding: a generated Topic Contract could be mistaken for authoritative Topic state.

Resolution: the normative profile is pinned to an exact Topic Protocol 0.5.0 commit. Every composition declares authoritative history as `topic-root+operations+records+projection` and the state event as `materialized-head-only`. Refine mode emits a successor proposal against an exact base revision.

### Sensitive inline state

Finding: the earlier composition did not fully constrain inline disclosure.

Resolution: confidential and restricted contracts require reference-only disclosure and E2EE. Canvas content and provider-private session identifiers are prohibited from state-event output. The inline application budget is capped at 49,152 bytes.

### Decision and outcome laundering

Finding: recommendation, selection, and completion could be conflated.

Resolution: selected options require a decision record ID; achieved outcomes require an outcome record ID. Generated statements and records cannot be accepted unless their basis is explicit or directly contextual.

### Prompt injection and secrets

Finding: source content needed an explicit untrusted-data boundary.

Resolution: the skill treats messages, documents, retrieved content, and attachments as data, rejects embedded control instructions, scans structured output for common credential patterns, and defines `BLOCKED_SECRET_DETECTED`.

## Automated gates

The package includes:

- three protocol-aligned valid examples;
- semantic validation with negative tests for provenance, disclosure, abilities, agents, decisions, outcomes, revision, external actions, secrets, canvas limits, and weights;
- package audit for structure, source locks, schema references, links, JSON, eval coverage, script standards, file limits, and secret patterns;
- twenty behavioral eval cases covering routing, confidentiality, agents, actions, prompt injection, and protocol lifecycle.

## Residual limits

The skill cannot prove deployed Matrix, E2EE, federation, VFS, UCAN, agent, Temporal, or state-event behavior. Those require host runtime conformance evidence. Protocol 0.5.0 defines the lifecycle semantics, but deployment remains feature- and capability-gated.

Production use therefore requires the host to validate again at the trust boundary, verify current revision and capabilities, reproduce projection, resolve stable identities and bindings, and retain recovery receipts.
