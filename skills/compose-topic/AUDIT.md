# Compose Topic production audit

Audit target: `compose-topic` `3.1.0`
Topic Protocol baseline: `@ixo/topic-protocol@1.0.0-rc.3`
Topic Contract profile: `qi.topic-contract-state/v4`
Pinned protocol commit: `482139c37eed86387a7ff2609a8672c4216e28f4`
Published package git head: `81f62ef47f7a54b6237deb9fe8e12435f71122c6`
Published package shasum: `74bd726618060b507243ae5c6fa2493a8948f755`
Published package integrity: `sha512-lH/CeNSEb5hopumtphP0iGmtYtUD9e1uQiDQSOn/0D7nOi4FN0ipiD0oxbHqecNL/1lBlL9HtPEqnWYW1VgRIA==`

## Review scope

The audit covers:

- root/body/state version 4 and all legacy-version exclusion;
- canonical Kind to Base Recipe mapping;
- Effective Shape resolution and digest pins;
- five Draft-producing seed Topic Recipes;
- nine progressively loaded Kind sub-skills, plus focused Software Build and Blueprint Design routes;
- singular claim binding and read-only protocol/rubric resolution;
- Flow, Action, UDID, evaluation, effect, and settlement boundaries;
- Matrix plus UCAN authority requirements;
- deterministic progress and viewer-specific Now separation;
- immutable body revisions, activation confirmation, optional assent, expiry, and dispute boundaries;
- structured setup obligations and Kind-specific focused questions;
- inference auto-accept boundaries;
- provenance, disclosure, revision, idempotency, and secret controls;
- Portal-compatible Draft creation and refinement;
- schemas, examples, scripts, tests, and behavioral eval coverage.

## Material findings and resolutions

### v0.8 body fields survived composition

Finding: the earlier skill emitted `recipe` and could write resolved agents into the Topic Contract.

Resolution: v4 uses `baseRecipe`, optional digest-pinned `topicRecipeRef`, `shapeSources`, and `shapeDigest`. The schema and validator reject `recipe`, `agents`, Action/effect contracts, evaluation-kit contents, schedules, progress, state tags, viewer attention, and settlement contracts.

### Kind guidance was too broad for progressive loading

Finding: one large reference held all Kind rules, increasing reader load and encouraging generic composition.

Resolution: the root is a shared router and each of the nine canonical Kinds has a focused sub-skill. Project may additionally load Software Build or Blueprint Design guidance after the user selects that Project Type. The selected sub-skill defines its required structures, progression boundaries, evidence posture, and Portal handoff.

### Topic Recipe and Base Recipe were conflated

Finding: “recipe” meant the fixed Kind recipe and offered no governed path for expert-honed Topic Recipes.

Resolution: Base Recipe is reserved for the canonical Kind model. The skill pins the five published seed Topic Recipes, verifies their Base Recipe and digest, and keeps every instantiation a Draft. Marketplace lookup is explicitly not performed until a verified registry and useful library exist.

### Project coordination could collapse distinct authorities

Finding: treating the Project lead as a generic owner could silently make that person the setup confirmer, child-work owner, closer, or dispute resolver. External issue completion could also be mistaken for Project completion.

Resolution: Project has an explicit lead subject whose authority is limited to plan coordination and blocker identification. Lead assignment, setup confirmation, optional assent and time gates, child progress, dispute resolution, and closer acceptance remain separate. Project Recipes only configure eligible suggestions. Closing requires the named closer's revision-, digest-, actor-, authority-, evidence-, and remaining-risk-bound acceptance record; child, Action, evaluation, settlement, and tracker states never substitute for it.

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

### Generic terms did not tell a person what to do

Finding: a partial Draft could collapse specific missing content and authority choices into an unexplained count or a request to complete “terms.”

Resolution: every composition emits a partial activation policy and structured setup obligations that name the choice, purpose, responsibility state, focused path, priority, and what resolving it unlocks. Agent Tasks distinguish delivery, result responsibility, setup confirmation, and external Flow binding.

### Authorship could be mistaken for setup authority

Finding: creator, owner, membership, and completion authority could silently become confirmation or dispute authority.

Resolution: named setup editors, confirmers, signatories, dates, and dispute resolvers require explicit or accepted-context provenance. The validator rejects owner-as-authority fallback, invented lifecycle dates, invalid thresholds, and agreement signatories on solo Topics. Confirmation authorizes progression only; optional assent is separate.

### Contract lifecycle lived in mutable body content

Finding: body status blurred immutable setup content with proposal effectiveness and supersession.

Resolution: v4 bodies carry no lifecycle status. Contract heads and append-only operations project proposed, effective, and superseded state. Editing creates a new proposal, invalidates its earlier confirmations, and leaves the prior effective revision in force until replacement.

### Inference acceptance lacked consequence classification

Finding: the earlier rule treated all generated records alike.

Resolution: Shape-permitted non-effecting fact, summary, and classification records may auto-accept. Contract, outcome, authority, Action, claim, evaluation, and settlement suggestions always remain proposed.

## Automated gates

The package includes:

- five valid v4 examples, including the Generic Project path, three established seed Topic Recipes, and explicit unresolved setup obligations;
- negative tests for v3 and older Topics, Shape pins, policy provenance, owner fallback, assent, expiry, thresholds, claims, Action/effect leakage, authority, inference, decisions, outcomes, secrets, canvas bounds, and refinement pins;
- package audit for root and nested skill frontmatter, links, source locks, local digests, schemas, examples, eval coverage, scripts, and secret patterns; and
- behavioral evals covering all nine Kinds, five seed recipes, Project lead/child/close boundaries, future Marketplace posture, Portal viewer authority, legacy exclusion, and Flow/Action boundaries.

## Residual limits

The skill cannot prove deployed Matrix, E2EE, VFS, UCAN, Entity/claim resolution, Flow execution, evaluation, payment, settlement, or receipt finality. The host must validate those boundaries and reproject current state.

The recipe Marketplace lookup is intentionally not implemented. The local catalog is sufficient only for the nine Base Recipe compositions and five seed Topic Recipes pinned to the release candidate.
