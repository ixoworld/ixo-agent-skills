---
name: compose-project-blueprint-design
description: Configure a Project Draft with the pinned Blueprint Design recipe for discovery, design, validation, rehearsal, independent review, and blueprint acceptance.
license: Apache-2.0
metadata:
  parent-skill: compose-topic-project
  topic-kind: project
  topic-recipe: blueprint-design
---

# Compose Blueprint Design Project

Select the pinned `blueprint-design` Topic Recipe when the outcome boundary is
an independently reviewed and explicitly accepted, decision-complete blueprint.
Keep Project as the Kind and `project` as the Base Recipe.

The recipe may expose method-manifest binding, discovery, design, validation,
rehearsal, and acceptance checkpoints, artifact previews, and independent
review. Checkpoints are suggestions until the person accepts them; they are not
automatically milestones or child Topics.

Bind a method manifest only from an immutable supplied or verified reference.
Record explicit or contextual accepted field provenance at
`/project/methodManifestRef`; otherwise leave the binding unset.
When the binding is `design-yoma/v1`, preserve its five governed phase
commitments and evidence boundaries. Do not rewrite or collapse them into a
generic checklist.

A completed Yoma blueprint is a Project artifact. It is not an effective Deed,
deployed service, production action, or operational proof. Blueprint close
requires independent-review evidence plus the closer's explicit acceptance of
remaining risk.
