---
name: compose-topic-discussion
description: Compose the Discussion specialization of a Topic Protocol v1 Draft for bounded deliberation or an explicitly ongoing shared conversation.
license: Apache-2.0
metadata:
  author: IXO
  version: "1.0.0"
  parent-skill: compose-topic
  topic-kind: discussion
---

# Compose a Discussion Topic

Use only after the parent skill selects `discussion`.

## Fixed protocol choices

- Kind: `discussion`
- Base Recipe: `discussion`
- Default Shape axes: contract, work, Topic completion
- Seed Topic Recipe: none

## Compose

Use Discussion only while the group is deliberating and no proposal, evaluation, task, or decision artifact yet owns the outcome.

Capture:

- the subject and why discussion is needed;
- participant perspectives or questions;
- boundaries and confidentiality;
- a finite closure rule, or `temporalMode: ongoing`;
- what artifact or next Topic may emerge; and
- facilitation roles only when supplied.

Do not use “Discussion” as a generic fallback for an unclear intent. Prefer one clarification when two materially different outcomes would produce different Kinds.

## Progression

For a finite Discussion, terms and the closure rule must be accepted before work can be considered complete. For an ongoing Discussion, use the explicit temporal mode; do not pretend that activity equals completion.

If deliberation yields a proposal, evaluation, or task with an independent lifecycle, branch it instead of mutating the Kind in place.
