# Completing and publishing a governance proposal

Version 0.2.0 · Requirements of the proposed standard

This guide is for proposers, governance coordinators, reviewers, and agents assisting them. “Must” identifies a requirement of this standard. Local governance rules remain the source of decision authority.

For delegated Flow actions, [GRS-001](../specs/GRS-001-governed-flow-authorisation.md) supplies the normative machine-readable authorisation and UCAN mapping. Build the pinned inputs/policies/manifest, Flow plan, and resolution JSON first; generate the complete human resolution; then pin the enclosing proposal. Include its resolution CID in the on-chain description. After verified DAO DAO activation, an authorised issuer may create the bounded delegation. Off-chain effects require an enforcing connector and their own receipts. Direct DAO DAO messages remain separately pinned and must not duplicate delegated effects.

Apply [GRS-002](../specs/GRS-002-daodao-module-compatibility.md) before submission: resolve the selected module's actual version and route, preserve approval-queue IDs separately, pin multiple-choice options independently, and treat a vote on submission as an explicitly requested real vote. The single-choice sequence below must not flatten multiple-choice payloads or treat a veto timelock as executable approval.

## 1. Frame the decision

Give the proposal one stable reference, such as an organisation's existing numbering convention. Revisions retain that reference and increment the document version. A reference identifies the proposal across its history; a CID identifies particular content; the chain ID, proposal-module address, and proposal ID identify a particular governance submission.

Write the resolution first. Make approval's effects, limits, conditions, and timing explicit. Then complete the context, credible alternatives, evidence, decision authority, and follow-through. Include contrary evidence and the cost of maintaining the current position. Separate cited facts, assumptions, and recommendations.

Use all seven core sections. Append each triggered annex. Keep the core near two pages; move detailed evidence and technical analysis into annexes or separately pinned files. The page target is guidance, not a validity rule.

Unresolved material authority, evidence, recipient, amount, permission, or execution questions block submission. They do not prevent circulation as a draft. For each gap, name an owner and a next step. Non-material uncertainty can remain if disclosed and accepted through the applicable review process.

## 2. Establish authority and participation

Identify the entity and governing group, then verify the current mandate and relevant group configuration. Record the source/version, observation time, and reviewer. Include proposer eligibility, voting-power basis, quorum/threshold, voting period, revoting, deposit/refund rules, and execution permissions where applicable. Do not invent defaults or assume that another group's configuration applies.

Explain how conflicts and recusals are handled under those rules. A written recusal does not automatically remove on-chain voting power or change a quorum denominator. Resolve discrepancies between organisational requirements and technical configuration before submission.

Use the Topic for consultation, alternatives, objections, draft changes, and review actions. Keep Topic progress separate from DAO DAO proposal status. This standard introduces no Topic Protocol states or event types; use the adopted protocol and retain governance references through its supported mechanisms.

## 3. Assemble and pin the artifacts

Store artifacts within the entity's `/governance` directory. A suggested layout, subordinate to any existing entity convention, is:

```text
/governance/<proposal-reference>/
  proposal-v1.md
  executable-messages-v1.json       # only when executable actions exist
  evidence/
  records/submission-001.md
  records/update-001.md
```

These are VFS-relative paths, not local workspace paths. Filenames aid navigation; the recorded CIDs select the versions being considered.

1. **Pin supporting material.** Store referenced evidence or policy files and record their CIDs, provenance, dates, and access context. A mutable external source needs a retained snapshot or explicit version where reliance on its contents is material.
2. **Resolve executable actions.** If applicable, prepare the exact ordered message array for `msgs`, using the target chain, executing DAO core, resolved recipients/contracts, amounts, and relevant configuration. An intermediate `{type, data}` action list is not the final payload. If there are no executable actions, state that explicitly and use an empty `msgs` array at submission where the selected module supports it; no executable-file CID is required.
3. **Review and store the executable JSON.** Decode embedded payloads for review, retain the actual encoded values, and compare every action with the resolution. Store the final file and capture its returned CID. Never substitute an ordinary SHA-256 digest for a VFS CID.
4. **Reference the executable CID in the narrative.** Include the CID in section 2 and Annex B, with a readable account of its effects. Ensure the file is retrievable by authorised voters.
5. **Freeze the proposal document.** Finish the core and applicable annexes, remove unused prompts, store the exact document, and capture its CID. Record that CID in the Topic and a separate submission record. Do not add it inside the document it identifies.
6. **Confirm availability.** Test retrieval by CID in the intended entity context with voter-equivalent permissions. Confirm retention and access throughout voting and the organisation's record-retention period. Retain every submitted version; a latest-path link is insufficient.

A VFS CID provides content identity and integrity, not permission or guaranteed availability. Do not grant public access merely to simplify voting. If confidentiality prevents the required electorate from reviewing material evidence, resolve the governance/access arrangement before submission.

## 4. Check readiness and submit through Portal

Before submission, a named reviewer must confirm:

- The resolution, authority, accountable owner, alternatives, evidence, and material consequences are explicit.
- Applicable annexes are complete; blockers have been resolved and consultations recorded.
- Voters can retrieve the pinned proposal, executable payload, and required evidence.
- The title and summary faithfully describe the pinned document, including conditions and executable effects.
- The intended group, network, proposal module, configuration, and submission permissions are verified.
- The exact final messages match the pinned executable file, and all prerequisites that must hold before submission have been checked.

Use this text structure in the DAO DAO description; these are human-readable labels, not new contract fields:

```text
Proposal reference: <stable reference>
Document version: <version>
Summary: <decision, scope, limits, conditions, effective date>
Proposal document CID: <CID>
Document access: <entity context and authorised retrieval reference>
Executable message CID: <CID, or None — no executable messages>
Executable effects: <ordered summary, or None>
```

Set the proposal title separately. Add the exact payload array to `msgs`. Retain the summary and document/payload references in the external submission record as well.

The Portal handler inspected for this standard builds final messages from action inputs during submission. This standard requires review of those resolved messages before signing and comparison with the pinned file. If the available interface cannot expose or preserve them, mark the proposal blocked for that submission route. Do not claim that preparing this template adds that capability.

Text conditions do not constrain a contract by themselves. If the submitted messages permit effects beyond the resolution, revise the proposal or its execution design before signing.

## 5. Read back and reconcile

After submission, query the authoritative chain record and record the chain ID, DAO core, proposal-module address, proposal ID, submission transaction, and observation block/time. Do not identify a proposal by title alone. Store the observed title, description, document CID, and messages in the submission record.

Compare the recorded CIDs exactly. Verify retrieved file bytes against their CIDs using the VFS-compatible encoder. For the payload comparison, parse the pinned JSON and on-chain `msgs`: object-key order and whitespace may differ; array order, JSON types, values, amounts, targets, and all fields must match. Reject duplicate object keys in the prepared file. Verify encoded binary values by decoded bytes, and decode nested content for human review using the appropriate schema. Unknown or undecodable executable content is a review blocker.

If read-back differs from what was reviewed, mark the submission as a mismatch in the Topic and external record. Escalate to the authorised coordinator and follow the group's available cancellation, rejection, or replacement process. A chain submission remains real even if the local record flags an error; this standard cannot cancel it. Do not edit the voted file to make it agree after the fact.

If submission confirmation is uncertain, reconcile the candidate transaction and proposal record before retrying. A missing UI confirmation does not prove that no proposal was created.

## 6. Record decision and follow-through

Use the [submission and outcome template](../templates/submission-outcome-template.md) to create separately versioned updates. Keep the voted proposal and payload unchanged.

| Observation | Record it as |
| --- | --- |
| Proposal is open | Submitted; decision pending, with observation block/time |
| Proposal is rejected | Rejected under the observed on-chain status/rules; retain tally and evidence |
| Proposal passes | Approved according to the chain record; execution and outcome remain separately tracked |
| Approved action has not run or has failed | Execution pending or failed, with the authoritative status/transaction evidence and next authorised step |
| Execution succeeds | Executed, with transaction and resulting-state evidence; organisational outcome still requires its own evidence |
| Intended outcome is assessed | Outcome achieved, not achieved, or inconclusive, with measures, evidence, assessor, and date |
| A later decision replaces this one | Supersession link to the later approved governance record, including its effective date |

These descriptions are reporting conventions, not replacement DAO DAO or Topic enums. Store raw observed statuses as well. Label interim tallies with the observation time and relevant voting deadline; follow the actual module's rules for finality and revoting.

Every changed proposal requires a new document version and CID. Changed executable messages also require a new payload CID. Once submitted, amendments require a new governance submission under the group's rules. A replacement draft is only a proposed replacement until the later decision establishes otherwise. Never erase a rejected, failed, or superseded record.

## Agent authoring boundary

An assisting agent can organise supplied context, retrieve permitted sources, draft resolutions and alternatives, identify missing information, explain payloads, and propose readiness findings. Record its contribution and the accountable human reviewer in the external review record.

The future generation skill must not invent authority, votes, quorum, evidence, CIDs, addresses, or execution receipts. Its output remains a draft or recommendation until reviewed. This package grants no right to submit, vote, sign, execute, change permissions, or publish restricted evidence. Those actions require their own existing authority and operational tooling.
