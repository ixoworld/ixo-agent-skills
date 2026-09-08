# GRS-001: Governed Flow authorisation

Version: 0.2.0 · Status: Proposed · Date: 2026-09-08

## 1. Purpose and conformance

This specification makes an organisational governance resolution a structured authorisation for named actors to perform bounded actions in a pinned Flow. The resolution projects into human-readable text, is approved through DAO DAO, and is mapped to signed UCAN delegations. Effects MAY occur on-chain, in IXO services, or through authorised connectors to off-chain systems.

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, and MAY are interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when capitalised. A SHOULD exception MUST have a recorded rationale and equivalent control.

Conformance is role-specific: author/projector, governance publisher, delegation issuer, Flow gateway, effect executor, and record keeper. A deployment MUST identify which components fulfil each role and demonstrate the applicable requirements. Passing this repository's schema and reference tests establishes document/projection compatibility only. It MUST NOT be represented as production authorisation conformance.

The normative structured resolution is defined by [resolution.schema.json](../schemas/resolution.schema.json). The decision binding and governance caveat schemas define the application-level mapping. None of these JSON documents is a signed UCAN token. In a conflict between prose and schema, an implementation MUST reject the disputed operation until the specification is corrected; it MUST NOT choose the more permissive interpretation.

[GRS-002](GRS-002-daodao-module-compatibility.md) supplies additional adapter requirements for legacy, v2.7.1 and mixed DAO DAO modules, including approval queues, multiple-choice selection, veto/pause and vote delegation. It preserves this profile's wire fields and does not confer additional execution rights.

## 2. Authority and records

The entity VFS retains pinned artifacts under `/governance`. A Topic coordinates their preparation, review, submission, and follow-through. DAO DAO's authoritative chain records establish the submitted proposal, votes, outcome, and applicable on-chain execution. An off-chain effect requires its own receipt and resulting-state evidence; a vote cannot establish that an external API call succeeded.

The following objects MUST remain distinct:

| Object | Meaning |
| --- | --- |
| Resolution | The machine-readable decision and permitted effects proposed for approval |
| Human projection | Deterministic readable rendering of the resolution, included in the proposal |
| Flow plan | Pinned action topology and contracts; not authority to execute |
| Proposal | The voter-facing document, rationale, evidence, resolution CID, and executable payload references |
| Decision binding | References connecting the exact artifacts to a particular on-chain proposal |
| UCAN delegation | A signed grant from an authorised issuer to an actor, bounded by the approved resolution |
| UCAN invocation | A signed request to exercise one capability at one executor |
| Effect receipt | Attributable evidence of an attempted or completed effect |

A DAO contract address MUST NOT be treated as a signing DID or assumed to possess a private key. An agent, Topic owner, model host, proposer, or Flow compiler MUST NOT gain issuance authority merely by producing or storing a resolution.

## 3. UCAN compatibility profile

This version defines the application profile `ixo-governance/0.2` over the capability model inspected in `@ixo/ucan` 2.1.0 and its ucanto dependencies: `can`, `with`, and `nb`, signed delegations and invocations, and CAR transport. The dependency lockfile pins the reference implementation. The inspected DAG-UCAN implementation uses version 0.9.1; this profile MUST NOT be advertised as UCAN 1.0 wire compatibility. See [source and compatibility notes](../guides/compatibility.md).

Issuer, audience, proofs, not-before, and expiration MUST be encoded by the selected UCAN library. Wire timestamps are integer Unix seconds, even where a UI stores milliseconds. A conforming adapter MUST reject infinite/absent expiration. It MUST preserve proof links and the signed caveats when serialising or transporting the token. A file CID for JSON MUST NOT be substituted for a UCAN delegation's DAG root CID.

`nb.gov` is a REQUIRED, critical application caveat introduced by this specification. An executor that does not understand this profile or any required caveat MUST reject it. Merely preserving an unknown field in a token does not enforce it. Human-readable intent, UCAN facts, and caveat descriptions MUST NOT substitute for authorisation checks.

## 4. Structured resolution

A resolution MUST contain:

| Field | Meaning |
| --- | --- |
| `kind`, `version`, `id` | Fixed type/version and stable organisational proposal reference |
| `entityDid`, `governingGroup` | Entity and exact chain, DAO core, and proposal-module identifiers |
| `decision` | Decision summary and intended outcome; these are descriptive, not free-form executable instructions |
| `authority` | Issuer DID, pinned mandate, activation rule, token lifetime bounds, and revocation policy |
| `flow` | Stable Flow ID, pinned plan and action-manifest CIDs, and Flow gateway DID |
| `effective` | Earliest time and absolute expiry |
| `conditions` | Named attestation requirements, trusted evaluators, pinned evidence policies, and maximum evidence age |
| `grants` | Named actors, nodes, action types, exact capabilities/resources/inputs, executors, limits, and permitted onward audiences |

Each grant MUST identify one effect-bearing Flow node and one action contract. `can` and `with` MUST be exact identifiers, with no wildcard authority in this version. The pinned manifest MUST establish the relationship between `nodeId`, `actionType`, `can`, input schema, executor, and side effects. This profile does not register new production actions by declaring their names.

This version binds each action to an exact input-file CID. Inputs that affect targets, values, recipients, or permissions MUST be fully resolved before voting. Templates and unresolved runtime references MUST NOT be executed as approved inputs. A future profile MAY define bounded dynamic bindings; implementations MUST NOT silently add them to this version. Flow dependencies can still govern when these fixed actions become eligible.

Grant identifiers and node identifiers MUST be unique. Every condition reference MUST resolve within the document. Unknown properties, invalid identifiers, duplicate JSON object keys, non-finite numbers, unresolved placeholders, and unsupported versions MUST be rejected for live submission. A schema-valid DID/CID/address is not proof that the referenced actor, artifact, or chain resource exists.

## 5. Human-readable resolution

An author/projector MUST generate the normative resolution block from the structured document:

> Resolved that [governing group] approves [specific decision], authorises [actor and action], within [scope and limits], subject to [conditions], effective [date or precisely defined event].

The generated block MUST include the full grant list and identify every actor, executor, action, resource, input CID, execution limit, permitted onward audience/depth, effective window, and condition. It MUST disclose off-chain tenant/connection/resource boundaries and the relevant policy/manifest CIDs. The prose summary MAY be shorter, provided it is labelled a summary and links to the complete block.

The block MUST distinguish governance activation, permission to execute, and evidence of an achieved outcome. A compiler MUST NOT infer additional permissions from descriptions or prose. An author MAY add rationale, alternatives, impacts, and non-authorising organisational obligations outside the generated block. Any obligation that limits execution MUST also be encoded as an enforceable condition or constraint before submission.

A reviewer MUST compare the projection, structured resolution, pinned inputs, and any direct chain messages before submission. Any divergence in authorisation semantics blocks submission. After voting, neither the human text nor the structured artifact MAY be reinterpreted to expand authority.

## 6. Artifact assembly and governance publication

The publisher MUST build an acyclic artifact graph in this order:

1. Pin inputs, condition policies, issuer mandate, and action manifest.
2. Pin the Flow plan, referencing those inputs/contracts without embedding the later resolution or proposal CID.
3. Pin the structured resolution, which references the plan, manifest, policies, and inputs.
4. Generate its human projection and assemble the proposal narrative. Include the resolution CID and its authorised retrieval reference.
5. If the DAO DAO proposal includes direct executable messages, pin the exact ordered `msgs` array separately and reference its own CID in the narrative. Delegated Flow actions are not themselves DAO DAO `msgs`.
6. Pin the complete proposal and submit its title, summary, proposal-document CID, resolution CID, and optional direct-message CID through Portal. Attach the exact direct messages, or `[]` if supported and none are required.
7. Read back the authoritative submission and verify every reference and direct message. Capture the decision binding separately, after the proposal ID exists.

An artifact MUST NOT contain its own CID. The resolution MUST NOT contain a future proposal ID, proposal-document CID, or delegation CID. Those references belong in the later decision binding and token caveats.

The publisher MUST verify voter access to all material pinned artifacts and retention of submitted versions. A CID is neither an access grant nor an availability guarantee. Proposal text and direct messages on a public chain MUST be treated as public; delegated tokens and private inputs SHOULD remain access-controlled.

A direct chain action and a delegated Flow action MUST NOT represent the same side effect unless an explicitly approved design prevents duplicate execution. A passed proposal MAY authorise an off-chain Flow with no chain messages, subject to the mandate and chosen module. Where activation requires an on-chain grant/registry action, it MUST appear in the separately pinned `msgs`, and the resolution MUST select `executed` activation. This specification introduces no fictional on-chain bridge contract or message type.

## 7. Activation and delegated issuer authority

`authority.activation` MUST be `passed` or `executed`. `passed` requires the particular proposal to have reached an approval state valid under its actual module rules and finality policy. `executed` additionally requires successful execution of its direct messages. An expired, rejected, cancelled, unknown, mismatched, or insufficiently finalised decision MUST NOT activate a grant. A raw status-name comparison without module-aware interpretation is insufficient.

The issuer MUST verify all of the following before signing:

- The exact proposal and resolution CIDs occur in the authoritative submitted proposal and resolve to matching content.
- The governing group's chain, core, and proposal module match the resolution and decision binding.
- The proposal's actual approval procedure and activation requirement have been satisfied.
- The mandate identifies this issuer, permitted resources/capabilities, key-resolution rules, governance finality policy, and applicable revocation authority. The entity/resource owner has authorised the group to grant those rights.
- The recipient, requested capabilities, conditions, Flow plan, manifest, and lifetime are within the approved resolution.

The issuer mandate MUST be anchored in an already trusted resource-owner/governance policy. A mandate supplied only by the requester MUST NOT establish its own trust. DID control, contract administration, and operational credential ownership MUST NOT be assumed to imply each other.

Where the issuer is not the trusted resource authority, it MUST present a valid pre-existing UCAN proof chain covering the rights it delegates. An on-chain approval reference is governance evidence, not a substitute for a signed UCAN proof. Effect executors MUST validate both the capability authority and the governance activation. An issuer's signature alone MUST NOT bypass the DAO decision.

## 8. Mapping to UCAN

For each approved grant, the issuer creates a delegation addressed to its `actorDid`. The delegation MUST contain both capabilities below, with the same `nb.gov` value:

| Purpose | `can` | `with` |
| --- | --- | --- |
| Execute the Flow node | `flow/block/execute` | `ixo:flow:<flow.id>:<grant.nodeId>` |
| Perform its effect | The grant's exact `can` | The grant's exact `with` |

The effect capability MUST NOT itself be `flow/block/execute`. Possession of the Flow capability alone MUST NOT authorise an external API operation. An executor MUST select and validate the relevant capability, rather than treating the first token capability as sufficient for all operations.

The REQUIRED `nb.gov` value contains:

| Field | Requirement |
| --- | --- |
| `profile` | Exactly `ixo-governance/0.2` |
| `resolutionCid`, `proposalCid` | Exact approved artifact identifiers |
| `decision` | Chain ID, core address, proposal-module address, and proposal ID |
| `flow` | Flow ID, plan CID, manifest CID, and gateway DID |
| `grant` | Complete grant, including input CID, actor/executor, limits, conditions, and off-chain binding if any |
| `effective`, `authority`, `conditions` | Full resolution constraints; no implicit default values |

The issuer MUST derive this caveat from the approved artifact, not from caller-supplied copies. Executors MUST compare it with the resolved approved artifact. Tokens MUST have `nbf >= effective.notBefore` and `exp <= effective.expiresAt`. Delegations MUST also expire no later than issuance time plus `maxDelegationSeconds` and every applicable parent expiry. Invocations MUST expire no later than issuance time plus `maxInvocationSeconds` and the effective proof-chain expiry.

An actor signs a node invocation addressed to the Flow gateway, and an effect invocation addressed to the grant's executor. A runtime signing on behalf of a human MUST possess an explicit delegated capability; it MUST NOT impersonate that human. Co-located gateways and executors MAY use one service DID but MUST enforce both boundaries.

The invocation MUST retain `nb.gov` and bind its actual request to the approved input CID. It MUST include signed request facts `runId` and `operationId`; these identify execution attempts, not additional authority. Unknown facts MUST NOT expand rights. A stable logical operation identifier MUST be reused when reconciling uncertain attempts.

## 9. Attenuation and onward delegation

This initial profile uses deliberately narrow attenuation rules:

- A child MAY reduce `maxExecutions`, narrow the onward-audience set, reduce remaining delegation depth, shorten expiry, or move not-before later.
- Every other governance caveat field MUST remain equal to its parent. A different approved input, target, tenant, actor identity, executor, Flow plan, manifest, condition, or decision requires a new governance artifact/approval, not reinterpretation of the existing grant.
- An onward delegation's audience MUST be explicitly allowed by the approved grant and its parent. Each actor-to-actor delegation MUST consume one unit of remaining depth. Initial issuer-to-actor issuance does not consume that depth.
- The effect invocation's issuer MUST be the original actor or the terminal audience of a valid permitted delegation chain. The original `grant.actorDid` remains unchanged as the accountability anchor.
- Capabilities MAY be removed, never added. A removed caveat or broader resource MUST be rejected, not treated as unrestricted.

Custom derivation and independent request checks are REQUIRED. A generic library that accepts a signature but ignores `nb.gov` is not conformant. Limits are shared across descendants and reissued tokens; narrowing a token does not allocate a new budget.

## 10. Conditions, time, and revocation

Each named condition requires an authenticated evaluator attestation checked against the pinned `evidencePolicyCid`. It MUST bind the resolution CID, applicable grant, exact input CID, predicate result, evidence references, issuance time, and validity interval. The evaluator DID and maximum age MUST match the approved condition. A caller-supplied `approved: true`, mutable Topic label, or unverified model output MUST NOT satisfy a condition.

The Flow gateway and effect executor MUST evaluate relevant conditions at their own boundary. Immediately before dispatch, the executor MUST check time, the current authoritative governance/mandate status, and revocation for every delegation on the selected proof path. Cached state MUST respect the approved `maxStalenessSeconds`; zero requires a current authoritative check. Unavailable or stale required state MUST fail closed.

The named revocation authority and resource MUST be rooted in the trusted mandate. The revocation mechanism MUST identify exact delegation CIDs and provide authenticated freshness evidence. A child token cannot hide a revoked ancestor. Resource policy MUST also support suspension of an entire resolution so that reissuance cannot bypass revocation. Supersession MUST have an explicit effective revocation/suspension action when old grants are to stop; a new document alone does not revoke signatures.

Revocation prevents new dispatch after the enforced observation boundary. It cannot reverse effects already committed or guarantee cancellation of an in-flight external request. Those facts MUST be preserved in the receipt. Execution MUST NOT resume from a legacy optional-UCAN Flow path when governed checks fail.

## 11. Off-chain enforcement and accounting

An off-chain grant MUST bind `provider`, `tenant`, `connectionId`, permitted operations, and exact resource identifiers. The connection identifier is an opaque configured binding, not an OAuth token or secret. The connector MUST resolve it within the approved entity/tenant and MUST enforce the action contract's mapping from pinned inputs to those resources and operations. It MUST NOT substitute another tenant or use a broadly privileged credential to exceed the grant.

The off-chain provider MAY use OAuth, API keys, or another native mechanism instead of UCAN. In that case the connector is the REQUIRED UCAN enforcement boundary. The organisation MUST separately authorise the connector's provider credentials. A UCAN does not grant rights the organisation lacks in the provider system. Credentials MUST NOT be embedded in public proposals, payload files, UCAN facts, or receipts.

Immediately before a side effect, its executor MUST atomically reserve one logical execution against a durable shared budget keyed by `(resolutionCid, grant.id)`. All tokens, descendants, proposals approving that same resolution content, processes, and replicas MUST share this budget. `maxExecutions` counts logical effects, including pending/unknown dispatches, not merely signed invocation tokens. Refreshing a token or changing `runId` MUST NOT reset it.

The executor MUST atomically claim the invocation CID to prevent concurrent replay. Replay control and operation idempotency are separate requirements. An operation ID reused with different inputs, grant, or target MUST be rejected. A prior operation MAY return its existing receipt without redispatch.

Provider idempotency keys SHOULD be used where supported. If a request times out after possible dispatch, the reservation MUST remain consumed and the outcome MUST be `unknown` until reconciled. A retry MUST NOT dispatch again unless the provider's idempotency semantics make it safe or authoritative read-back proves the original effect did not occur. If neither is possible, require operator reconciliation; do not claim exactly-once execution. A reservation MAY be released only with evidence that no side effect occurred.

The gateway's node invocation MUST NOT consume a second effect budget unit. The approved executor owns the side-effect reservation. A Flow with multiple external systems MUST NOT claim cross-system atomicity. Compensation is a separate side effect requiring its own approved grant and receipt.

## 12. Receipts and lifecycle

Each attempted effect MUST produce an attributable receipt containing: resolution/proposal CIDs; chain proposal identifiers; Flow/plan/manifest/node/grant identifiers; actor and executor DIDs; invocation and selected proof CIDs; run and operation IDs; exact input CID; condition results and evidence references; governance/revocation observation evidence and freshness; budget reservation; attempt time; outcome; and provider transaction/request/resulting-state references where available.

Outcomes MUST distinguish `denied`, `pending`, `succeeded`, `failed`, and `unknown`. A successful API response alone is sufficient only if the action contract defines it as final completion evidence. Receipts MUST be authenticated by the executor or its approved audit mechanism and retained with appropriate access controls. A secret-bearing raw API response MUST be redacted or separately restricted.

The Topic MAY project these records for users. It MUST NOT replace the canonical DAO decision or effect evidence. Approval, delegation issuance, node execution, provider effect, and achievement of the organisational outcome MUST remain separately inspectable. Corrections and later supersession MUST append references instead of overwriting voted artifacts or previous receipts.

## 13. Required conformance scenarios

An implementation MUST demonstrate acceptance of a correctly approved, in-scope, unexpired invocation and rejection of: an unapproved/wrong-chain decision; an untrusted issuer; a fabricated proof; the wrong audience; broader capability/resource/input/tenant; dropped or unknown caveats; broadened limits or onward delegation; stale/false/forged conditions; expired tokens; stale/unavailable revocation state; a revoked ancestor; concurrent replay; and exhausted shared budgets.

It MUST also demonstrate that an uncertain external response does not trigger an unsafe duplicate, compensation has separate authority, direct chain messages are not duplicated in the Flow, and human projection divergence blocks publication. The [conformance guide](../guides/conformance.md) distinguishes repository tests from integration evidence still required.

## 14. Versioning

This is a proposed application profile. Implementers MUST identify the exact supported specification, schemas, and UCAN library versions. Unknown versions MUST fail closed. Changes to permission semantics, interpretation, or caveat attenuation require a new profile version and new reviewed artifacts; they MUST NOT change the meaning of existing signed delegations.

The archived v0.1 document templates remain historical artifacts. New delegated resolutions use the updated templates and this specification. A future agent skill MAY generate these artifacts and run repository checks, but generating a conforming draft grants no issuance or execution authority.
