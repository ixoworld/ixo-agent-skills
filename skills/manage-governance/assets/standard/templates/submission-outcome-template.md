# [Proposal reference] — [Submission or update reference]

Keep this record outside the voted proposal. Create dated, attributable updates and retain previous versions. These labels are document conventions, not a machine schema. Leave facts not yet observed explicitly pending.

## Artifact and review references

| Field | Value |
| --- | --- |
| Record author / date | [Actor] / [ISO timestamp with time zone] |
| Entity / coordinating Topic | [DID and context] / [Topic reference] |
| Proposal reference / version / CID | [Stable reference] / [version] / [proposal CID] |
| Executable file CID | [CID; or none because there are no executable messages] |
| Structured resolution / Flow plan / manifest CIDs | [Approved v0.2.0 artifact references; or not applicable] |
| Retrieval and retention | [VFS namespace/context, retrieval references, permissions check, retention owner/policy] |
| Readiness review | [Reviewer/date; decision to submit or blockers; evidence reference] |
| Agent contribution | [Agent-assisted work and human review; or none] |
| Previous record / supersession links | [Prior update CID; related proposals and nature of relationship] |

## Submission and read-back

| Field | Value |
| --- | --- |
| Chain ID / DAO core address | [Verified identifiers] |
| Proposal module / proposal ID | [Verified identifiers; together with chain ID they locate this proposal] |
| Module kind and versions | [Selected single/multiple module; core/proposal/pre-propose/voting identities and network-specific versions] |
| Approval gate, where applicable | [Approval module / approval ID / review status; parent decision and actual child voting proposal linkage, kept distinct] |
| Submission transaction | [Hash and authoritative retrieval reference] |
| Observation | [Block height; time; query source; raw response reference] |
| Submitted title and description | [Exact text or retained response CID] |
| Observed message array | [Retained response/file reference] |
| Multiple-choice payload, where applicable | [Full choices CID; per-option payload/resolution CIDs; canonical option-ID mapping from read-back] |
| Document CID comparison | [Match / mismatch / pending; evidence] |
| Payload comparison | [Match / mismatch / not applicable / pending; evidence] |
| Mismatch or uncertain submission | [Issue, owner, reconciliation/correction route; or none observed] |

## Governance decision

| Field | Value |
| --- | --- |
| Raw on-chain status | [Observed value; block/time] |
| Decision interpretation | [Pending / approved / rejected / other outcome under actual module rules] |
| Governing rules | [Policy and configuration references relevant to this submission] |
| Votes / tally evidence | [Authoritative query or transaction references; eligibility/voting-power basis; observation time] |
| Vote during submission | [Explicit instruction and requested choice; actual ballot read-back or omission/failure, separately from proposal submission] |
| Multiple-choice result | [Authoritative winner/tie/none result; exact selected resolution CID and verified option mapping, or none] |
| Veto, pause and activity | [Raw status/expiration, vetoer/early-execute policy, independent core pause and voting activity observations] |
| Voting close / finality basis | [Actual deadline and module rules; interim or final observation] |
| Conditions / effective date | [From voted resolution; evidence that conditions are satisfied or pending] |
| Disputes / challenges | [References, status, authorised response; or none recorded] |

## Execution and organisational outcome

| Field | Value |
| --- | --- |
| Execution status | [Not applicable / pending / successful / failed / unknown; raw chain status separately] |
| Execution evidence | [Transaction, resulting-state query, block/time, relevant observations] |
| Failure or recovery | [What failed; uncertainty; responsible actor; authorised next step] |
| Organisational implementation | [Milestones, responsible actors, completion evidence, unresolved obligations] |
| Outcome assessment | [Measure, result, evidence, assessor, date; achieved / not achieved / inconclusive / pending] |
| Review and supersession | [Review date; later approved decision identifiers and effective date; or no supersession established] |

## Delegated Flow records, where applicable

| Field | Value |
| --- | --- |
| Governance activation and issuer mandate | [Actual passed/executed evidence, finality observation, trusted mandate and proof chain] |
| Delegation | [Signed UCAN CID, issuer, audience, exact critical caveat, not-before and expiry; protected retrieval reference] |
| Flow invocation | [Actor, gateway, node, run ID, invocation/proof CIDs, authorisation observations] |
| Effect invocation | [Actor, effect executor, grant, operation ID, invocation/proof CIDs, exact input CID] |
| Conditions and revocation | [Authenticated observations, evidence references, checkpoint times and freshness] |
| Execution budget | [Shared resolution/grant key, reservation, pending/used/released state and evidence] |
| Effect receipt | [Denied/pending/succeeded/failed/unknown; authenticated receipt; provider request and resulting-state evidence] |
| Recovery | [Uncertain-result reconciliation; duplicate prevention; any separately authorised compensation] |

Do not equate an approved proposal with successful execution, an executed message with delivered impact, or a replacement draft with an approved superseding decision.
