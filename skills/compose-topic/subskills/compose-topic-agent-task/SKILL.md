---
name: compose-topic-agent-task
description: Compose the Agent Task specialization of a Topic Protocol v1 Draft for bounded agent delivery through a verified Flow and Action boundary.
license: Apache-2.0
metadata:
  author: IXO
  version: "2.0.0"
  parent-skill: compose-topic
  topic-kind: agent_task
---

# Compose an Agent Task Topic

Use only after the parent skill selects `agent_task`.

## Fixed protocol choices

- Kind: `agent_task`
- Base Recipe: `flow`
- Base Shape axes: contract, work, Topic completion
- Optional seed Topic Recipe: `agent-delivery`

Select `agent-delivery` only when the Topic commissions agent work, reviews a delivery, records a decision, and may explicitly request or confirm an external Action. It adds verification, decision, and effect stages and still creates a Draft.

## Compose

Describe the assignment as a proposal:

- the agent's bounded delivery: what it must produce, in what form, and what is out of scope;
- the person responsible for the result, kept distinct from the agent that performs the work;
- supplied inputs and allowed context;
- exclusions and data classification;
- success criteria;
- stop condition;
- the setup confirmer, kept distinct from delivery responsibility and decision authority;
- expected Flow role; and
- what must happen if the Flow or adapter is unavailable.

Agent identity is not a contract-body field. Keep unresolved agent roles in `collaborationSuggestions`. A resolved agent still executes through a Flow/Action binding and verified UCAN authority outside the Topic contract.

## Smallest setup questions

Ask only the first unanswered question needed for an honest Draft:

1. What must the agent deliver?
2. Who is responsible for the result?
3. Who must confirm this setup before work progresses?
4. Is there an existing Flow the agent must use?

These answers are four different facts. Never copy the agent, creator, owner, or room member into another role. If any answer is absent, keep the matching obligation visible. The best missing Agent Task step is usually “Choose who is responsible for the result” after the delivery itself is known.

## Flow and consequence boundary

Never embed an Action definition, handler, capability grant, schedule, inputs contract, effect contract, or success receipt in `contractDraft.semantic`.

The host may bind a real Flow and UDID references after Topic identity exists. Requesting or confirming an external Action is a separate Shape transition with its own gate, confirmation, ability, operation, and receipt.

If the Flow adapter is unavailable, present the `effecting` stage and a Flow handoff. Do not simulate success.

## Portal handoff

The Portal derives the Now phase and legal moves from the resolved Shape. Suggested agent activation is never a viewer-assigned legal transition. Do not use room membership or an agent label as authority.
