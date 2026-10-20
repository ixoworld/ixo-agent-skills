# Changelog

Every change to the skill's behaviour bumps `metadata.version`. The Portal asks the agent for one version by name (`COMPOSE_TOPIC_SKILL_VERSION`), so a new version reaches people only when the Portal's pin moves to it.

## 3.5.3

- Continue directly from a successful write dry run to its single approval in
  the same turn; stop on pending results, not on synchronous validation.

- Guide recipe creation through Kind confirmation, preview, publishing home,
  validated publication, and a destination-specific Topic Draft.
- Default to plain language, with explicit developer preference independent of model.
- Use verified source artifacts and host preflight before approvals; preserve
  receipts and stop on pending questions, approvals, and uncertain outcomes.
- Keep the 3.5.2 composition handoff and rc.7 protocol unchanged. Requires the
  Portal's `kindConfirmationKey` and deferred question support; publish the
  capsule after those host tools are deployed.

## 3.5.2

- The purpose is its own text, a verb phrase that finishes "This Topic exists to". The Portal template put the person's request into the purpose and asked for it to match the request byte for byte, which overrode 3.5.0's rule, so a Topic from a recipe still read "It exists to start a Project in this room from the published recipe … (did:…)". The request is now copied only into the intent record; a purpose in the person's own words keeps explicit provenance, a written one is a suggestion.

## 3.5.1

- A published recipe's overlay stays empty unless the person asks for a step the Kind does not have. A lead or reviewer accepting the result is the Kind's own acceptance; the FPS example's evaluator verification step is added only when asked. 3.5.0's agent copied that step into every recipe, so even a Task's lead acceptance needed `claim/evaluate` rights.
- `milestones` and `childWork` go into a recipe's `draft` for Kind project only; the Portal drops them for every other Kind.
- One `protocol/topic` domain publishes one recipe and its versions, so a new domain is named exactly like the recipe. When the person renames the domain in the Portal, the new name becomes the recipe label.
- A new version keeps every field the person did not ask to change and must be a version the domain has not published; the Portal refuses a repeated one before anything is signed.
- Only `propose_domain_creation`, `write_domain_files` and `publish_recipe_release` wait for the person. After a read such as `resolve_published_recipe` the agent keeps going instead of asking to continue.

## 3.5.0

- A new Draft open in the Portal editor is filled with `stage_topic_changes` and its `editSessionId` alone. The refine preconditions (Topic ID, revisions, digests) now apply only to a saved Topic; 3.4.1's agent refused to touch a Draft because it had none.
- People keep the roles the person gave: "Mike should do it" is who does the work, "I accept" is the acceptor. Someone named without a Matrix user ID is usually not in the room: the agent says they must be invited first, and the opening message never asks the room to assign people.
- After staging, the reply is two or three plain sentences: what was drafted and what still needs the person. No composition IDs, room IDs, field paths, obligation codes, "setup obligation" or "Matrix user ID".
- Texts finish the Portal's sentences: purpose after "This Topic exists to", outcome as a noun phrase after "When it is done there will be", completion after "It is done when" without repeating "Done when", scope, constraints and assumptions as noun phrases.
- A choice a few people make by talking it through is a Question or an Evaluation; a Proposal is for a group that must formally approve or vote.
- A Topic composed from a published recipe puts the same `topicRecipeRef` in `rootDraft` and `contractDraft.semantic`, copies the recipe's milestones and child work into the Project plan, and fills its texts from the recipe's `draft` instead of using the person's request as the purpose. 3.4.1's Project from a recipe came out with an empty plan.

## 3.4.1

- The Portal template gives the item shape for `scope.included`, `scope.excluded` and `constraints` (statement objects) and for `assumptions` (a wrapped statement). 3.4.0 showed only empty arrays, so the agent wrote plain strings and the Portal rejected the handoff.
- The template says to pass no `destinationEvidenceToken`; 3.4.0's agent invented one.
- The validator rejects plain-text list items and unwrapped assumptions or questions instead of skipping them.

## 3.4.0

- Pins the published `@ixo/topic-protocol@1.0.0-rc.7` (commit `808c9aa`) instead of the unpublished rc.4 candidate: new Shape pins for all nine Kinds, a new bundled tarball and source lock. rc.4 pins are kept in `references/topic-shape-pins-rc4.json`; existing rc.3 and rc.4 Topics keep their pins during refinement.
- rc.7 refuses to confirm a setup until it names who does the work (`ownerId`) and who accepts the result (`completion.acceptanceAuthorityIds`) for every Kind except Project, and a Project's lead and closer. The template carries ready-made `setup.owner`, `setup.acceptor`, `setup.answer-reviewer`, `setup.project-lead` and `setup.project-closer` obligations, and the validator requires each one to stay visible until the person names that person by Matrix user ID.
- A Project's closer is now needed before the setup is confirmed, not only before closing.
- A Discussion may be `temporalMode: ongoing`; it then needs no acceptor.
- Knows the Portal tools `read_open_topic`, `update_topic` and `start_topic_composition`, and `stage_topic_changes`'s `set-people` (the bundled refine change-set schema and validator accept it).
- A published recipe's `shapeSources` have three entries (base recipe, Kind, `topic-recipe`); a recipe may use `topic.record-flow-run`, and `publish_recipe_release` names `protocolVersion: "1.0.0-rc.7"`.
- The scripts load rc.7 with a `node:crypto` stand-in for `@noble/hashes`, so they stay dependency-free. The audit compares locked hashes as LF text, so it also passes on a Windows CRLF checkout.

## 3.3.2

The version string 3.3.2 was published from several commits between 2026-09-11 and 2026-09-21, including removing the bundled Topic Recipe catalog, adding `resolve_published_recipe` and recipe publishing, and dropping participants, roles, plan and attachments from the handoff. Pinned Topic Protocol 1.0.0-rc.4.
