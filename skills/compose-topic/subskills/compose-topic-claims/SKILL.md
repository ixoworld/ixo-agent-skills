---
name: compose-topic-claims
description: Compose the Claims specialization of a Topic Protocol v1 Draft with one authoritative IXO Entity and claim collection binding.
license: Apache-2.0
metadata:
  author: IXO
  version: "2.0.0"
  parent-skill: compose-topic
  topic-kind: claims
---

# Compose a Claims Topic

Use only after the parent skill selects `claims`.

## Fixed protocol choices

- Kind: `claims`
- Base Recipe: `claims`
- Base Shape axes: contract, work, verification, decision, Topic completion
- Topic Recipe: none bundled; only a recipe published by a `protocol/topic` domain that the Portal resolves

A published recipe may add effect and settlement axes when the lifecycle genuinely includes an external effect through a Flow and settlement finality; it still creates a Draft.

## Compose

Capture:

- the deed, work, or assertion being claimed;
- the expected evidence and submitter;
- one IXO Entity DID;
- one claim collection ID;
- unresolved selection paths when either binding field is absent;
- evaluation and decision authority only when supplied;
- expected records and receipts; and
- explicit Topic completion.

The Portal should present entity and collection selection explicitly. Do not encode multiple alternative entities or collections in `claimBinding`.

## Resolution and authority

Resolve:

`entity DID → collection ID → protocol DID → rubric`

Keep protocol DID and rubric read-only and outside the contract body. Never copy the evaluation kit, rubric, oracle account, or UCAN document into Topic setup.

The entity controller delegates evaluation authorization to the evaluation service and specific oracle DID/account. Do not infer that authorization from room membership, owner, evaluator label, or a collection reference.

## Payment and settlement boundary

Payment and settlement contracts live in registry Actions and Flow instances. The Topic carries bindings, UDID references, requests, records, and receipts.

Verification, approval, Action success, and final settlement remain independent stages. None independently completes the Topic.

## Smallest setup questions

Ask what is being claimed, which one Entity and collection govern it, who is responsible for submitting the evidence, who confirms the Topic setup, and who may resolve disputes. Keep evaluation-oracle authorization and any payment Flow as separately resolved external bindings.

## rc.4 lifecycle contract

The standard Claims Shape requires verification through accepted `ixo.evaluation` with status `verified`, then accepted `ixo.decision` with status `approved`. Verify `claim/evaluate` and `claim/decide` independently. A negative decision does not enable an external effect. All claim bodies and attachments remain Matrix-only.
