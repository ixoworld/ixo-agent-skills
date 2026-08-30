# Compose Topic production audit

Audit target: `compose-topic` `2.0.0`
Topic Protocol baseline: `@ixo/topic-protocol@1.0.0-rc.1`
Topic Contract profile: `qi.topic-contract-state/v3`
Pinned protocol commit: `db925bece7269a3c11e3081f301c7e7d7dd7bab4`
Published package shasum: `962da70e62f7a705b159edf2b55e03ca443f72d1`

## Review scope

The audit covers:

- root/body/state version 3 and v0.8 exclusion;
- canonical Kind to Base Recipe mapping;
- Effective Shape resolution and digest pins;
- three Draft-producing seed Topic Recipes;
- eight progressively loaded Kind sub-skills;
- singular claim binding and read-only protocol/rubric resolution;
- Flow, Action, UDID, evaluation, effect, and settlement boundaries;
- Matrix plus UCAN authority requirements;
- deterministic progress and viewer-specific Now separation;
- inference auto-accept boundaries;
- provenance, disclosure, revision, idempotency, and secret controls;
- Portal-compatible Draft creation and refinement;
- schemas, examples, scripts, tests, and behavioral eval coverage.

## Material findings and resolutions

### v0.8 body fields survived composition

Finding: the earlier skill emitted `recipe` and could write resolved agents into the Topic Contract.

Resolution: v3 uses `baseRecipe`, optional digest-pinned `topicRecipeRef`, `shapeSources`, and `shapeDigest`. The schema and validator reject `recipe`, `agents`, Action/effect contracts, evaluation-kit contents, schedules, progress, state tags, viewer attention, and settlement contracts.

### Kind guidance was too broad for progressive loading

Finding: one large reference held all Kind rules, increasing reader load and encouraging generic composition.

Resolution: the root is a shared router and each of the eight canonical Kinds has a focused sub-skill. The selected sub-skill defines its required structures, progression boundaries, evidence posture, and Portal handoff.

### Topic Recipe and Base Recipe were conflated

Finding: “recipe” meant the fixed Kind recipe and offered no governed path for expert-honed Topic Recipes.

Resolution: Base Recipe is reserved for the canonical Kind model. The skill pins the three published seed Topic Recipes, verifies their Base Recipe and digest, and keeps every instantiation a Draft. Marketplace lookup is explicitly not performed until a verified registry and useful library exist.

### Shape state was not reproducible

Finding: the earlier output could not prove which progression model the Portal should project.

Resolution: every work composition carries the exact source list and Effective Shape digest. Root and contract pins must agree. The host persists pins and projected progress, not a separate Effective Shape record. Missing pins degrade the Topic and suppress privileged moves.

### Claims admitted ambiguous bindings

Finding: attachment alternatives could obscure the authoritative entity and collection.

Resolution: `claimBinding` contains exactly one IXO Entity DID and one collection ID. Protocol DID and rubric resolution is read-only evidence outside the contract body. Evaluation authorization comes from the entity controller's delegation, not Topic roles.

### Action and authority boundaries were too weak

Finding: agent assignments or Action references could be mistaken for executable authority.

Resolution: agents, Action/effect contracts, and settlement contracts live in registry Actions and Flow instances. Commit requires verified Matrix write permission and every call's protocol/UCAN ability. Owner, membership, role, and Action labels do not grant authority.

### Lifecycle and completion were conflated

Finding: Action success, an achieved outcome, evaluation, or settlement could be mistaken for Topic completion.

Resolution: progression remains axis-specific. Only the resolved Shape transition marked `completesTopic` completes the Topic. The Portal derives Now phase, condition, state tags, and legal viewer moves; the skill does not author them.

### Inference acceptance lacked consequence classification

Finding: the earlier rule treated all generated records alike.

Resolution: Shape-permitted non-effecting fact, summary, and classification records may auto-accept. Contract, outcome, authority, Action, claim, evaluation, and settlement suggestions always remain proposed.

## Automated gates

The package includes:

- five valid v1 examples, including all three seed Topic Recipes;
- negative tests for v0.8, Shape pins, recipe mismatch, claims, Action/effect leakage, authority, inference, decisions, outcomes, secrets, canvas bounds, and refinement pins;
- package audit for root and nested skill frontmatter, links, source locks, local digests, schemas, examples, eval coverage, scripts, and secret patterns; and
- behavioral evals covering all eight Kinds, three seed recipes, future Marketplace posture, Portal viewer authority, legacy exclusion, and Flow/Action boundaries.

## Residual limits

The skill cannot prove deployed Matrix, E2EE, VFS, UCAN, Entity/claim resolution, Flow execution, evaluation, payment, settlement, or receipt finality. The host must validate those boundaries and reproject current state.

The recipe Marketplace lookup is intentionally not implemented. The local catalog is sufficient only for the eight Base Recipe compositions and three seed Topic Recipes pinned to the release candidate.
