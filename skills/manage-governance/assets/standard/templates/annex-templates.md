# Conditional annex templates

Current standard: v0.2.0. Annex B covers direct chain messages; Annex F covers delegated Flow effects. A proposal may require both, without duplicating the same effect.

Apply [GRS-002](../specs/GRS-002-daodao-module-compatibility.md) for the selected DAO module. For multiple choice, repeat action/delegation annexes per applicable option and pin the full ordered choices JSON; never merge alternatives into one executable list. Record approval-gate routing separately from the substantive decision.

Append each triggered annex to the proposal before obtaining the proposal-document CID. Multiple triggers can apply. These prompts supplement the short core; avoid duplicating it. Reference separately stored supporting files by CID and an authorised retrieval reference.

## Annex A — Financial commitment

**Trigger:** The decision spends, allocates, transfers, lends, guarantees, or otherwise commits organisational resources, including recurring or contingent commitments.

| Field | Complete with |
| --- | --- |
| Commitment | [Purpose, total amount, currency or chain denomination, and maximum exposure] |
| Units | [Display amount; integer base-unit amount and verified decimals for token actions] |
| Funding source | [Budget/fund; treasury account or DAO core; chain; restrictions] |
| Recipient | [Actor, verified receiving account, and evidence of recipient-account association] |
| Payment conditions | [What must be true before payment; who checks it; evidence] |
| Enforcement | [Which conditions the executable messages enforce; which require organisational checks; timing of those checks] |
| Recurring or contingent exposure | [Schedule, duration, renewal, termination, guarantees; or none] |
| Limits and charges | [Cap; fees; taxes if relevant; which budget pays; deposit and network fees accounted for separately] |
| Financial evidence | [Available-funds check, quotes/invoices, alternatives, unit assumptions; source dates/CIDs] |
| Accountability | [Budget owner, reconciliation evidence, reporting date, recovery or refund provisions] |

An immediate transfer cannot enforce a future delivery condition merely because that condition appears in the narrative. Resolve that mismatch before submission.

## Annex B — Executable actions

**Trigger:** The DAO DAO proposal contains one or more direct messages for on-chain execution.

| Field | Complete with |
| --- | --- |
| Executable file | [Entity VFS path; filename; file version] |
| Executable message CID | [CID returned for the exact final JSON file] |
| Retrieval | [Entity namespace/resolver context and authorised retrieval reference] |
| Execution context | [Chain ID; DAO core/executing account; proposal module; applicable contract versions] |
| Payload format | JSON array containing exactly the final ordered values for the proposal's `msgs` |
| Preparation evidence | [Who resolved the messages; configuration/query references and observation time; reviewer] |

| Order | Action and target | Amounts / permissions | Prerequisites and enforcement | Expected effect |
| --- | --- | --- | --- | --- |
| 1 | [Message type, target account/contract, readable action] | [Exact values or none] | [Condition; mechanism or actor] | [State change] |

**Encoded content:** [Decoded explanation of embedded messages; relevant ABI/protobuf schema references; or no encoded fields]. Keep final encoded values in the payload file.

**Failure and recovery:** [Who checks execution; expected failure modes; contract-specific retry rules; how duplicate actions are avoided; irreversible effects; whether a replacement proposal would be required]. Do not promise automatic rollback or retry without evidence from the applicable execution mechanism.

**Review evidence:** [Reviewer, date, checks that all actions match the resolution and that all required actions are present; known technical limitations].

The file contains no title, narrative, comments, submission envelope, wallet signature, or credentials. Do not include the proposal-document CID: the proposal references this file, so a reverse reference would create a circular content dependency.

## Annex C — Membership or delegated authority

**Trigger:** The decision appoints/removes members or officers, changes voting power, or grants, changes, or revokes authority for a human, organisation, or agent.

| Field | Complete with |
| --- | --- |
| Affected actors | [Names, identities, current roles, and proposed roles] |
| Rights changed | [Before/after voting power, permissions, duties, or capabilities] |
| Scope and limits | [Entity, assets, actions, expenditure ceilings, and excluded powers] |
| Duration | [Start, expiry, renewal conditions] |
| Technical enforcement | [Exact contract/configuration/delegation changes; applicable Annex B references; or organisational-only appointment] |
| Oversight | [Responsible supervisor; required approvals; reporting and evidence] |
| Conflicts and separation | [Conflicts, recusals, and independent review requirements] |
| Revocation and handover | [Who can revoke; procedure; access removal; replacement or continuity arrangements] |

## Annex D — Policy or governance change

**Trigger:** The decision creates, amends, suspends, or replaces an organisational policy or governance rule.

| Field | Complete with |
| --- | --- |
| Existing rule | [Exact provision and pinned version, or no current rule] |
| Proposed rule | [Complete replacement wording here, or separate policy file CID and exact provisions] |
| Rationale | [Why this change; alternatives and stakeholder effects] |
| Governing authority | [Provision authorising this amendment; required approvals] |
| Affected decisions | [Which actors/processes are covered; treatment of decisions already underway] |
| Transition | [Owner, communication, training, configuration changes, and dependencies] |
| Effective date | [Date/event; prerequisites; expiry if temporary] |
| Review | [Review date, success measures, amendment or repeal route] |

Changes to voting rules are decided under the currently applicable rules, unless a verified governing provision establishes another valid process. Do not apply proposed thresholds to their own approval.

## Annex E — Material impact or sensitive information

**Trigger:** The decision creates material stakeholder, safety, environmental, operational, or rights impacts, or uses sensitive/confidential evidence.

| Field | Complete with |
| --- | --- |
| Affected parties and effects | [Benefits, burdens, severity, likelihood, uncertainty, and distribution] |
| Consultation | [Who was consulted; method; objections; responses; unrepresented interests] |
| Evidence access | [Who must review each file; access mechanism; availability/retention owner] |
| Disclosure | [What may appear publicly on-chain; what remains restricted; redacted summaries and source references] |
| Safeguards | [Preventive measures, monitoring, named owners, and escalation triggers] |
| Challenge arrangements | [Who can challenge; recipient/process; applicable window; response owner] |

DAO DAO proposal text and executable messages placed on a public chain are public. A private VFS document does not make its on-chain summary, CID, recipient address, or executable messages private. Resolve any disclosure conflict before submission.

## Annex F — Delegated Flow authorisation

**Trigger:** Governance grants an actor authority to perform actions in a Flow, including off-chain systems.

| Field | Complete with |
| --- | --- |
| Structured resolution | [v0.2.0 JSON; VFS path; resolution CID; authorised retrieval reference] |
| Human projection | [Complete generated resolution block; reviewer and comparison evidence] |
| Flow and contracts | [Flow ID, plan CID, manifest CID, node/action identifiers, gateway and effect executors] |
| Inputs and scope | [Exact input CIDs; actor DIDs; capabilities/resources; off-chain provider, tenant, connection, operations and resource IDs] |
| Conditions and timing | [Governance activation: passed or executed; bounded effective window; evaluator/policy/evidence requirements] |
| Issuance authority | [Named issuer DID; pinned mandate; existing resource-owner trust anchor and proof chain] |
| Limits and delegation | [Shared maximum logical executions; permitted onward audiences/depth; token lifetime bounds] |
| Revocation | [Resource-local authority, source, maximum staleness, resolution suspension and key-state policy] |
| Enforcement readiness | [Gateway/connector versions; caveat support; atomic replay and budget controls; conformance evidence] |
| Off-chain recovery | [Idempotency support, uncertain-result reconciliation, separate compensation authority] |
| Records | [Delegation/invocation references; attributable receipts; provider read-back; accountable reviewer] |

Complete the checks in [GRS-001](../specs/GRS-001-governed-flow-authorisation.md). A JSON draft, ordinary Flow plan, Topic state, or agent recommendation is not a signed delegation. Existing provider credentials do not waive the approved action limits. If an enforcement boundary cannot honour the caveats, mark the execution route blocked.
