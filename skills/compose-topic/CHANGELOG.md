# Changelog

Every change to the skill's behaviour bumps `metadata.version`. The Portal asks the agent for one version by name (`COMPOSE_TOPIC_SKILL_VERSION`), so a new version reaches people only when the Portal's pin moves to it.

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
