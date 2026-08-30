---
name: compose-topic-incident
description: Compose the Incident specialization of a Topic Protocol v1 Draft for urgent containment, recovery, and evidence-backed closure.
license: Apache-2.0
metadata:
  author: IXO
  version: "1.0.0"
  parent-skill: compose-topic
  topic-kind: incident
---

# Compose an Incident Topic

Use only after the parent skill selects `incident`.

## Fixed protocol choices

- Kind: `incident`
- Base Recipe: `incident`
- Default Shape axes: contract, work, Topic completion
- Seed Topic Recipe: none

## Compose

Capture:

1. observed failure and current impact;
2. affected systems, people, or outcomes;
3. immediate containment;
4. response owner only when supplied;
5. known facts, hypotheses, and unknowns separately;
6. evidence and event timeline;
7. recovery checks; and
8. explicit closure conditions.

Risks are Incident-only and Impact-only. Use description, status, optional Impact, owner, and mitigation. Do not emit likelihood.

## Urgency and authority

Urgency does not create authority. External containment Actions still require a registry Action/Flow contract, verified ability, gates, and confirmation. Composition may identify the needed handoff but may not execute it.

Waiting or blocking must name the source and exact target. A failed Action receipt produces a failed condition; do not hide it behind generic waiting.

Containment, recovery, and closure are distinct. A recovered service does not complete the Topic until the Shape's completion transition records the authorised closure.
