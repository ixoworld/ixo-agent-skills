---
name: compose-topic-task
description: Compose the Task specialization of a Topic Protocol v1 Draft when people must coordinate, implement, launch, or deliver a bounded outcome.
license: Apache-2.0
metadata:
  author: IXO
  version: "2.0.0"
  parent-skill: compose-topic
  topic-kind: task
---

# Compose a Task Topic

Use only after the parent skill selects `task`.

## Fixed protocol choices

- Kind: `task`
- Base Recipe: `project`
- Default Shape axes: contract, work, Topic completion
- Seed Topic Recipe: none

Do not upgrade a Task to `agent_task` merely because an agent may help. Select `agent_task` only when the Topic's primary job is to commission bounded agent execution.

## Compose

Capture:

1. the changed-state outcome;
2. included and excluded scope;
3. an owner only when supplied or accepted;
4. a plan with the smallest useful milestones;
5. constraints and dependencies;
6. observable success criteria; and
7. the Topic's explicit completion definition and authority.

Title plus Kind is a valid initial Draft. Missing outcome or owner remains visible and proposed; do not fabricate either.

The first canvas should show the outcome, the next milestone or work breakdown, open questions, and one next action.

## Smallest setup questions

Ask for the intended result, the person responsible for it, the completion rule, and who must confirm the setup. Ask timing, review, expiry, and dispute questions only when the use case calls for them. Do not turn the owner into the confirmer or dispute resolver unless the person explicitly selects that same actor for both responsibilities.

## Progression

Setup must be confirmed before `start-work` becomes legal. Confirmation permits progression; it is not mutual agreement. Work submission is evidence for the work axis, not Topic completion. Completion still requires the Shape's `complete-topic` transition.

If waiting or blocked, require a source, reason, and explicit target. A dependency may target an actor, Flow, resource, or external system; never default it to the owner.

## Do not emit

- arbitrary status changes;
- a hidden owner;
- a schedule contract;
- an Action/effect contract;
- inferred completion; or
- viewer-specific “Needs you” claims.
