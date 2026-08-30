---
name: compose-topic-evaluation
description: Compose the Evaluation specialization of a Topic Protocol v1 Draft for criteria-based assessment, comparison, verification, or decision support.
license: Apache-2.0
metadata:
  author: IXO
  version: "2.0.0"
  parent-skill: compose-topic
  topic-kind: evaluation
---

# Compose an Evaluation Topic

Use only after the parent skill selects `evaluation`.

## Fixed protocol choices

- Kind: `evaluation`
- Base Recipe: `evaluation`
- Default Shape axes: contract, work, verification, Topic completion
- Seed Topic Recipe: none

## Compose

Capture:

1. the evaluation question;
2. objects or options being evaluated;
3. criteria and method;
4. evidence requirements;
5. evaluator and decision authority only when supplied;
6. treatment of uncertainty and missing evidence;
7. the expected evaluation record; and
8. the completion rule.

If weighted scoring is used, provide all weights and make them sum to 1; otherwise omit all weights.

An evaluation result is not automatically a decision, external effect, or Topic completion. Preserve those boundaries.

## Smallest setup questions

Ask what is being evaluated, which criteria decide whether the evaluation is adequate, who performs or owns the evaluation, who confirms the Topic setup, and who may record any later decision. Do not infer any of these actors from the creator or room membership.

## Evaluation kit boundary

The evaluation kit is the governed IXO protocol entity containing constitutional rules, claim schema, rubric, and parent UCAN capability reference. It is not copied into the Topic contract.

When a claim collection is involved, bind one `entityDid` and one `collectionId`. Resolve protocol DID and rubric as read-only evidence. The entity controller's delegation to the evaluation service and oracle is the authorization source; a Topic role is not.

If the evaluation adapter is unavailable, expose the verification phase and navigate to the linked Flow/resource rather than inventing an evaluation result.
