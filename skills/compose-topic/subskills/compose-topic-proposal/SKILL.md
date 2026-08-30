---
name: compose-topic-proposal
description: Compose the Proposal specialization of a Topic Protocol v1 Draft for an artifact or course of action that requires an explicit approval decision.
license: Apache-2.0
metadata:
  author: IXO
  version: "1.0.0"
  parent-skill: compose-topic
  topic-kind: proposal
---

# Compose a Proposal Topic

Use only after the parent skill selects `proposal`.

## Fixed protocol choices

- Kind: `proposal`
- Base Recipe: `proposal`
- Default Shape axes: contract, work, Topic completion
- Seed Topic Recipe: none

## Compose

Capture:

- the proposed changed state;
- intended audience and decision authority;
- the artifact or recommendation to be produced;
- scope, constraints, and assumptions;
- options or governance proposal when supplied;
- approval criteria;
- what revision or evidence the reviewer will receive; and
- the explicit closure rule.

Do not collapse “produce the proposal” and “approve the proposal” into one state. A recommendation is not a decision. A selected option or approval requires an accepted decision record and verified authority.

Keep unresolved approvers as suggestions. A role name does not grant the ability to accept terms or record a decision.

## Progression

The Base Recipe supports forming and working. If the use case needs formal verification, decision, effect, or settlement axes, use a verified Topic Recipe or Shape overlay supplied by the host; do not invent one.

Approval of an external Action must be handled by the linked Flow/Action contract, not by embedding effect terms in the Topic body.
