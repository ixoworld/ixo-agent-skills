# DAO DAO v2.7.1 and mixed-version DAOs

Read this before any DAO-specific submission, vote, issuance, execution or upgrade, and when resuming after a module change. Read bundled [GRS-002](../assets/standard/specs/GRS-002-daodao-module-compatibility.md) for the normative adapter requirements. Source anchor: Portal branch `feature/daodao-v271-upgrade` at `86797e5a81bffc4b001580eb12f86275de464de3`. This is source compatibility guidance, not a claim that this branch or GRS enforcement is deployed in the current oracle.

## Resolve and record

Resolve the actual network, core, selected enabled proposal module/kind, current pre-propose or approval module, voting module, delegation module if used, contract versions/code IDs and relevant admin identities. Use actual schemas and registry versions; the inspected Portal branch pins `@ixo/impactxclient-sdk` 3.1.0. A mixed DAO can have v2.7.1 core/proposal/pre-propose and legacy voting. Never assume a core upgrade upgrades every module.

Select the intended module explicitly, particularly when there are several enabled modules. The primary-module helper is for the primary route, not every proposal. Query `proposal_creation_policy` for the selected module; pre-propose addresses change during upgrades. Preserve chain/core/module/proposal ID together. Do not infer that a fixed 30-item listing is exhaustive or that a failed query returning zero means no pending proposals. Re-read relevant authoritative state after migration and before consequential calls; network changes invalidate previous scoped observations.

## Route the decision correctly

| Situation | Skill behavior |
| --- | --- |
| Legacy submission | Use `open_proposal_submission` only with the actual legacy pre-propose schema. |
| Modern submission | Read `submission_policy`, allow/deny lists, member toggle, `can_propose`, deposit and refund policy. Preserve fields not explicitly changed. |
| Voting-config change | Carry existing veto configuration and unrelated fields; a missing optional `veto` in full replacement can clear it. Never use builder defaults as organisational rules. |
| Approval-gated submission | Record approval-module/approval ID and `pending review`. Review belongs to the configured approver, possibly a parent POD decision. Then resolve the actual child voting proposal ID and verify content. Approval-to-enter-voting is not adoption. |
| Multiple-choice proposal | Pin full ordered choices and each option's executable payload/resolution mapping. Verify all options on read-back, actual option IDs, winner/tie/none result, and only the winning resolution. Do not flatten choices or execute losing options. |
| Vote on submission | Add the requested `yes`/`no`/`abstain` only with explicit voter instruction and the supported route. Verify the ballot separately; older/unknown pre-propose or zero own power can omit it. Report omissions honestly and preserve any valid instruction for a supported separate ballot. |
| Delegated voting power | Read own snapshot power and effective unvoted delegated power for this proposal; do not double count total delegation. Vote delegation is not UCAN action authority. |
| Veto timelock | Retain object/encoded status and expiration. A “Passed — veto window” label is not generic execution or off-chain issuance permission. Use actual chain clock, vetoer, early-execute policy and supported path. |
| Paused/inactive DAO | Check pause separately from proposal status and activity threshold separately from membership. A passed decision may still be non-executable. DAO pause does not automatically revoke UCANs or stop external providers. |
| Rewards claim | Treat the member-signed distributor `claim` as a financial operation, distinct from an IXO outcome/evidence claim. |

The inspected multiple-choice action's `parseOptions` retains title/description and drops `msgs`. Its underlying host builder can preserve messages, but the action route alone cannot. If any option has executable messages, require a declared, validated path that retains them before submission. Otherwise finish the payload and block that publication step; do not quietly submit a poll or use an undeclared API. Current branch supports 2–10 submitted options; use deployed limits.

For delegated multiple-choice outcomes, the frozen document must map each alternative to its exact candidate resolution CID. The post-decision GRS binding carries the selected resolution CID and canonical proposal CID/module/ID. Require the verifier to prove that selection matches the authoritative winner; do not add an unsupported `optionId` caveat field. If that adapter check is absent, keep issuance blocked while continuing voting/result/evidence work.

Keep `open`, `passed`, `veto_timelock`, `vetoed`, `rejected`, `executed`, `closed` and `execution_failed` distinct. Parse supported string/object/JSON representations using the actual host; unknown status never means success. An approval queue ID, transaction hash or action's optimistic output label does not replace authoritative read-back. Action-free policies use a submission/outcome record, not a fabricated machine-resolution binding.

## New action families and who signs

Discover the real manifest and handler before selecting these source-observed actions: `qi/governance.veto`, `.approval.review`, `.proposal.create-multiple`, `.delegation.setup` and member delegation actions, `.rewards.*`, `.nft.active-threshold`, `.dao.pause`, `.dao.unpause`, `.submission-policy`, and `.dao.upgrade`. These are registry action identifiers, not assumed top-level harness tool names. Many are human-owned actions with required confirmation; an oracle must not silently change their execution owner.

Veto belongs to the configured vetoer. Approval review belongs to the configured approver; parent-POD execution needs its own authorised route. Early unpause uses the DAO-level admin, distinct from the wasm admin for migration; a self-administered paused core cannot simply execute its own unpause proposal. Reward claims and delegate registration/delegation are member-signed. Setup, funding, module addition, pause and governance changes use the applicable proposal path. None grants the companion additional rights by name alone.

## Upgrade requests

Use the real planner and exact ordered messages. Never upgrade a DAO merely to make this skill's task work. Inspect all in-flight proposals/deposits and actual admins; preserve partial-plan exclusions. Core migration is a separate wasm-admin step where permitted. Optional cw4 voting migration removes the old member-change hook first. Proposal migration and fresh pre-propose replacement stay compatible and paired; re-resolve the changed pre-propose address. Do not migrate legacy pre-propose in place or use the unsafe legacy cw721 voting version-only migration. Leaving supported legacy voting intact is valid.

Verify post-upgrade functionality, old proposal/voting evidence, membership changes, policies/deposits and hooks, not only version labels. Pin instantiate2 code/salt/inputs and `initial_actions` when applicable; they can create immediate effects. Unknown module or enforcement evidence blocks only the dependent action. Read GRS-002 before preparing any upgrade annex.
