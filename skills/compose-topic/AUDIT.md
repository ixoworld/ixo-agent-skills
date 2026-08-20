# Compose Topic production audit

Audit target: `compose-topic` `1.3.0`
Topic Protocol baseline: `0.8.0`
Topic Contract profile: `qi.topic-contract-state/v2`
Profile status: normative
Pinned protocol commit: `08339e19bc6cc891b8cad85713a58fd1ec7b0da4`

## Review scope

The audit covers:

- Agent Skills package structure and frontmatter;
- Topic Protocol identity, root, thread, record, projection, authority, confidentiality, and attachment boundaries;
- alignment with the v2 Topic Contract body and Matrix state-event profile;
- canonical standard Kind templates, fixed recipes, and acceptance fields;
- exact Kind Profile, typed resource, and safe fallback semantics;
- Protocol 0.8 Action-reference boundaries;
- provenance and acceptance semantics;
- stable participant, role, and agent identity;
- safe disclosure and Matrix event-size posture;
- revision and idempotency controls;
- decision and outcome authority;
- BlockNote/Yjs canvas boundaries;
- prompt-injection resistance, secret hygiene, and data minimisation;
- CLI scripts, exported `main()` functions, tests, examples, staged-refinement change sets, and behavioral eval coverage.

## Material findings and resolutions

### Contract model mismatch

Finding: the earlier skill used a generic `brief` rather than the proposed `TopicContractBody` semantics.

Resolution: `contractDraft.semantic` now maps directly to working mode, recipe, intent, outcome, scope, constraints, assumptions, questions, risks, optional decision and plan, participants, roles, agents, and completion. Host-resolved envelope and state-event fields remain explicit and nullable until materialisation.

### Kind selection and configuration drift

Finding: selecting a valid Kind and recipe did not prove that the resulting Draft initialised the structures needed for that Kind. The skill also predated canonical Kind Profiles and typed Kind resources.

Resolution: `topic-kind-templates.md` now defines all eight standard templates, their fixed recipes, draft structures, and acceptance fields. The composition validator requires the selected base Kind to match the root and enforces its Draft shape. Profiled Kinds must emit exact `kindRef`, `kindProfile`, and `kindResource` references together. The first-party Job profile and Job Card v1 envelope are pinned and validated explicitly.

### Action reference authority ambiguity

Finding: a profile-selected Action could be mistaken for executable automation or evidence of authority.

Resolution: Protocol 0.8 profile v2 Actions are treated only as manifest-verified palette references. They do not create a handler, grant, schedule, invocation, or receipt; every execution remains a separate capability-gated host operation.

### Unresolved agent identity

Finding: the earlier skill could describe an agent role in the same structure used for contract participants.

Resolution: unresolved roles are isolated under `collaborationSuggestions`. A contract agent requires a stable `agentId`, matching participant, matching role, and capability references supplied by the host.

### Capability syntax drift

Finding: earlier adapter examples used colon-form abilities such as `topic:create`.

Resolution: all skill output and examples use Topic Protocol slash syntax such as `topic/create`, `topic/read`, and `topic/write`. The validator rejects colon-form abilities.

### State-event authority ambiguity

Finding: a generated Topic Contract could be mistaken for authoritative Topic state.

Resolution: the normative profile is pinned to an exact Topic Protocol 0.8.0 commit. Every composition declares authoritative history as `topic-root+operations+records+projection` and the state event as `materialized-head-only`. Refine mode emits a successor proposal against an exact base revision.

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
- semantic validation with negative tests for provenance, disclosure, abilities, agents, decisions, outcomes, revision, staged refinement, external actions, secrets, canvas limits, and weights;
- package audit for structure, source locks, schema references, links, JSON, eval coverage, script standards, file limits, and secret patterns;
- behavioral eval cases covering all eight standard Kind templates, the canonical Job profile, routing, confidentiality, agents, Action boundaries, prompt injection, protocol lifecycle, and multi-turn existing-Topic refinement.

## Residual limits

The skill cannot prove deployed Matrix, E2EE, federation, VFS, UCAN, agent, Action runtime, Temporal, or state-event behavior. Those require host runtime conformance evidence. Protocol 0.8.0 defines the lifecycle and profile semantics, but deployment remains feature- and capability-gated.

Production use therefore requires the host to validate again at the trust boundary, verify current revision and capabilities, reproduce projection, resolve stable identities and bindings, and retain recovery receipts.
