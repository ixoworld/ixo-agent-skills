# GRS-002: DAO DAO module compatibility

Status: proposed adapter requirements, 0.1.0, 8 September 2026. Applies with [GRS-001](GRS-001-governed-flow-authorisation.md), including governance profile `ixo-governance/0.2`. This addendum constrains interpretation and verification of existing decision bindings; it adds no UCAN wire fields, execution rights, default governance rules or automatic migration.

MUST, MUST NOT, SHOULD and MAY have the normative meanings used by GRS-001. The source basis is Portal branch `feature/daodao-v271-upgrade`, inspected at commit `86797e5a81bffc4b001580eb12f86275de464de3`, and the upstream DAO DAO v2.7.1 release. Branch implementations, tests, reported live fixtures and actual deployment evidence MUST remain distinguishable.

## 1. Resolve the exact module

A publisher/verifier MUST bind chain/network, DAO core, selected proposal-module address and kind, its current pre-propose/approval route, and each relevant module's contract identity/version. Legacy v2.0.3, v2.7.1 and mixed DAOs coexist. A core version, `isLatest` aggregate, code ID on another network or the first item in an address-sorted list MUST NOT stand in for the selected module's identity.

Implementations MUST resolve enabled modules and current `proposal_creation_policy` from authoritative state for consequential operations. They SHOULD use the network-specific SDK code registry and cw2/contract-info evidence. Unknown versions or failed queries MUST remain unknown. Discovery adapters with a fixed result limit MUST NOT claim exhaustive enumeration without pagination/completeness evidence. The primary single-choice resolver is not a selector for every multiple-choice or approval module.

The exact module address and proposal ID identify a proposal; a core plus numeric ID alone is ambiguous. Cache entries MUST be scoped to network and relevant contract, and refreshed after migration/module replacement or before a stale binding could affect an operation. Indexed configuration is discovery evidence until current binding is verified.

## 2. Submission policy, deposits and voting during submission

Legacy pre-propose config uses `open_proposal_submission`; v2.5+ uses `submission_policy` with `anyone` or `specific`, `dao_members`, allowlist and denylist fields. Builders MUST select the target pre-propose module's actual schema, preserve restrictions and deposit/refund configuration, and check `can_propose` or equivalent authoritative eligibility. Full voting-config replacement MUST preserve current veto and other fields unless their change is explicitly included in the resolution. A UI/builder default MUST NOT be treated as an organisation's adopted rule.

Single-choice `voteOnSubmission` / nested `propose.vote` on supported pre-propose modules is a real vote. It MUST be omitted without the proposer's explicit vote instruction. A combined submit-and-vote request MUST retain the exact choice and any rationale and verify both proposal and vote after broadcast. If legacy/unknown version or zero own voting power causes the host to omit that vote, the result MUST say the proposal was submitted without a verified vote; a separate vote requires the still-applicable instruction and valid voting path. A swallowed eligibility error or console warning is not evidence a vote occurred.

DAO vote delegation (`dao_vote_delegation`) MUST remain distinct from UCAN action delegation. Voter eligibility/power MUST use the selected proposal's snapshot and the applicable own plus effective unvoted delegated power, without double-counting total delegated power. Registration, delegation, undelegation and a ballot are separately authorised actions. Holding delegated votes grants no Flow/provider or claim-evaluation authority.

## 3. Approval queues and parent/child decisions

An approval-gated submission MUST be recorded with its approval-module address and approval ID while awaiting review. This is not yet the proposal module's canonical voting proposal ID. `extension.msg.approve` / `reject` requires the configured approver's actual authority. A parent POD acting as approver requires its own valid decision/execution path; a parent's approval decision is not the child's substantive governance outcome.

After review, the adapter MUST resolve and verify the actual child proposal ID, module, immutable document and messages/choices, linking it to the original queued submission and any parent decision. Approval IDs MUST NOT be copied or guessed as voting proposal IDs. Rejection at the approval queue, rejection by voters, and later veto MUST remain distinct. Deposit handling MUST follow the actual policy.

A GRS decision-binding document MUST NOT be constructed for a queued submission without a real voting proposal. Action-free policy records MAY use the submission/outcome worksheet without a fabricated resolution CID.

## 4. Single-choice and multiple-choice payloads

Single-choice proposals retain an exact ordered `msgs` array. Multiple-choice proposals contain ordered `choices.options`, each with its own title, description and ordered `msgs`; an adapter MUST NOT flatten options into one message list or execute all alternatives.

For multiple choice, the proposal document MUST bind an immutable option map: exact submitted position/content, each independent message-payload CID where actions exist, and each candidate resolution CID where delegated Flow authority is proposed. An effect-free option MUST say so explicitly. The full final choices JSON MUST be pinned independently and referenced in the narrative, and every option/message/encoded payload MUST be compared on read-back. Returned canonical option IDs and any contract-added none-of-the-above option MUST be recorded with their verified relationship to submitted options, without guessing IDs from labels or positions.

The final result MUST come from the actual module's strategy, quorum, revoting and winner rules, including ties and none-of-the-above. Before UCAN issuance or dispatch, the verifier MUST prove that the exact `resolutionCid` in the existing GRS binding maps unambiguously to the authoritative winning option in the frozen proposal. The binding's proposal CID, module/ID and resolution CID together identify that selection; they MUST NOT be accepted merely because some option passed. Losing alternatives, rejected/none-of-the-above results, ambiguous mappings and unverified winners MUST NOT activate grants. Do not add an unrecognised `optionId` field to the strict v0.2 caveat schema.

An adapter without winner-to-resolution verification MUST block delegated issuance for that multiple-choice submission. It MAY still support deliberation, truthful proposal publication, voting and result records. This is an additional integration requirement, not a claim that the current Portal is a GRS verifier.

The inspected Portal `qi/governance.proposal.create-multiple` action accepts option titles/descriptions and its `parseOptions` drops `msgs`, while the underlying host builder supports option messages. Therefore executable multiple-choice publication MUST use a declared path demonstrably preserving all messages, or remain blocked at publication with a complete payload handoff. It MUST NOT silently become an effect-free poll or route through an undeclared raw call. The inspected host supports 2–10 submitted options; deployments MUST use their actual supported limits.

## 5. Status, veto, pause and activation

Adapters MUST retain raw statuses and normalise the supported string, object and JSON-encoded representations before interpreting them. In the inspected branch these include `open`, `passed`, `veto_timelock`, `vetoed`, `rejected`, `executed`, `closed` and `execution_failed`. Unknown/malformed representations MUST NOT become `passed` or `executed`.

`{ "veto_timelock": { "expiration": ... } }` is not an executable final approval. Its chain height/time expiration MUST be preserved and evaluated using the contract's clock units. The Portal's generic execute path is not offered during that window. A configured `early_execute` right belongs to its specific contract-authorised actor/path; an agent MUST NOT generalise it into permission to bypass the window or issue off-chain grants. GRS issuance requires the selected approved activation event and compatible authoritative decision evidence. `vetoed` MUST NOT activate a grant.

Pause/inactivity MUST be read separately from proposal status. Proposing/voting may continue while a paused core prevents ordinary execution. The voting module's `is_active`/staking threshold may block proposal creation independently of member labels. Pausing the DAO MUST NOT be assumed to revoke already issued UCANs or halt external providers; off-chain suspension requires the actual GRS revocation/condition policy and enforcing runtime.

DAO-level admin authority for v2.7.1 `unpause` is distinct from the CosmWasm contract admin used for migration. Neither is inferred from a proposer, voter, creator label or UCAN issuer. A self-administered core cannot be assumed to unpause itself early through ordinary paused governance. Veto requires the configured vetoer and applicable window. All direct admin/veto/member transactions MUST follow the declared signer and host path.

`execution_failed` after approval MUST remain distinguishable from a rejected vote and from a failed off-chain node after successful chain execution. Later evaluation, supersession and Topic completion MUST not overwrite these facts.

## 6. Governance changes, upgrades and related effects

An upgrade or module setup MUST be an explicitly requested governance operation, never a side effect of drafting. Plans MUST resolve current versions, code IDs/checksums, admins, configuration, hooks and in-flight proposals, including passed-but-unexecuted and veto-window proposals. A short recent-proposal query or a query failure returned as zero is not a complete migration safety check.

For the inspected v2.0.3-to-v2.7.1 upgrade path:

- Core migration is a separate wasm-admin operation when actually permitted; do not put a wallet-admin core migration into a DAO proposal and expect it to execute.
- Optional cw4 voting migration MUST pair removal of the old voting module's member-change hook before migration. Retaining the legacy voting module is a valid mixed state.
- Proposal migration and replacement of its pre-propose module MUST remain compatible and correctly ordered. Legacy v2.0.3 pre-propose MUST NOT be migrated in place using the v2.7.1 path; replace it through `update_pre_propose_info`, preserve policy/deposits and re-resolve the changed address.
- Legacy `dao_voting_cw721_staked` MUST NOT be migrated via the unsafe version-only path described by the branch: the resulting state layout is incompatible even when the migration transaction succeeds.
- Verification MUST include functionality, historical proposal/voting evidence, membership updates and deposit handling, not only cw2 version strings. Preserve partial-plan exclusions and authority blockers.

Rewards distribution/setup/funding/withdrawal/member reward claims, delegation hooks, active-threshold changes, proposal-module addition and instantiate-time `initial_actions` are distinct financial or authority-bearing operations. Their inputs, permissions, atomic order and receipts MUST be covered by the applicable proposal or direct signer authority. A DAO rewards `claim` is not an IXO evidence/outcome claim and does not prove impact. Hook registration MUST avoid duplicate/unintended wiring. A predictable `instantiate2` address MUST be derived from exact approved code/salt/inputs through the real builder, not invented by an agent.

## 7. Compatibility evidence

Before asserting live compatibility, record target network/core/module versions; actual adapters and action-manifest versions; selected proposal/approval/option IDs; exact submission and read-back; vote receipts including auto-vote omissions; veto/pause state; and all required GRS enforcement evidence. Test legacy, native v2.7.1 and mixed versions, plus approval queues, multiple-choice winner binding and dropped-message rejection. Repository skill evaluations are simulated evidence only.

Source paths and hashes are in the [skill source lock](https://github.com/ixoworld/governance/blob/main/skills/manage-governance/references/source-lock.json). The upstream release resolves to commit [`92c44e593e6a0677a437e028514ce207efbd4d66`](https://github.com/DA0-DA0/dao-contracts/tree/92c44e593e6a0677a437e028514ce207efbd4d66); its multiple-choice proposal and execution logic distinguishes a single winner, ties, none-of-the-above and veto timelocks. Operational guidance is in the repository's manage-governance skill.
