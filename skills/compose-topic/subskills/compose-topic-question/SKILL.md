---
name: compose-topic-question
description: Compose the Question specialization of a Topic Protocol v1 Draft for investigation, research, diagnosis, or a durable answer.
license: Apache-2.0
metadata:
  author: IXO
  version: "2.0.0"
  parent-skill: compose-topic
  topic-kind: question
---

# Compose a Question Topic

Use only after the parent skill selects `question`.

## Fixed protocol choices

- Kind: `question`
- Base Recipe: `research`
- Base Shape axes: contract, work, Topic completion
- Topic Recipe: none bundled; only a recipe published by a `protocol/topic` domain that the Portal resolves

A published recipe may add a verification axis (research, verify sources, explicitly close the brief); it still creates a Draft.

## Compose

Capture:

- one answerable primary question;
- intended answer format or research output;
- subsidiary questions;
- scope and exclusions;
- source and evidence expectations;
- uncertainty or confidence treatment;
- acceptance authority; and
- the closure rule.

Do not answer the question in place of composing the Topic unless persistence provides no value.

The first canvas should put the intended answer first, then the research frame, evidence/source plan, open questions, and one next action.

## Smallest setup questions

Ask the primary question, the expected answer or brief, who will review the answer, and who must confirm the setup. The answer reviewer, setup confirmer, researcher, and Topic completion authority may be different people; leave each unresolved unless supplied.

## Evidence and completion

A summary is not verified merely because an agent produced it. Preserve citations and provenance. When a published recipe adds a verification axis, verification must be represented by the Shape's accepted evaluation/evidence record.

An answered question or verified brief still requires the Shape's Topic completion transition.

## rc.4 lifecycle contract

After work submission, `topic.record-verification` requires an accepted `ixo.topic.answer-acceptance` record with status `accepted` from the assigned completion authority using `topic/accept-answer`. A published recipe with a verification axis first requires source verification through `ixo.evaluation` with status `verified`. Both axes must finish before explicit Topic completion.
