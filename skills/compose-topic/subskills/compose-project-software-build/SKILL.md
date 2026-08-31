---
name: compose-project-software-build
description: Configure a Project Draft with the pinned Software Build recipe for reviewed implementation, verification, release, and operational-readiness work.
license: Apache-2.0
metadata:
  parent-skill: compose-topic-project
  topic-kind: project
  topic-recipe: software-build
---

# Compose Software Build Project

Select the pinned `software-build` Topic Recipe only when the Project outcome
is delivered through coordinated software work. Keep Project as the Kind and
`project` as the Base Recipe.

The recipe may expose reviewed coding-application entry-points, Task or Agent
Task child composition, repository and provider-neutral tracker binding slots,
and prompts for implementation, verification, release, and operational
readiness evidence.

It must not create a milestone, repository, branch, agent, deployment, child
Topic, or tracker item. Present every entry-point as eligible and reviewable;
rendering or selecting the Project Type is not permission to invoke it.

Repository, release, deployment, and production actions retain their own
authority and confirmation gates. Software completion and external issue
completion can make a child obligation or handoff ready; neither closes the
Project.
