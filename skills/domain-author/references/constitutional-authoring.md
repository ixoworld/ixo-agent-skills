# Constitutional authoring

Use this reference when a domain is created, migrated, or reviewed under `domain.md` `1.0.0-rc.3`.
The bundled specification and schema are normative. The constitutional vocabulary is
`https://w3id.org/ixo/vocab/v1/constitution#` (`con:`); its legal-form-independent subject catalogue is
`https://w3id.org/ixo/vocab/v1/constitution/subjects`.

## Contents

- [Model the subject](#model-the-subject)
- [Discover existing instruments](#discover-existing-instruments)
- [Draft a de-novo constitution](#draft-a-de-novo-constitution)
- [Prove legal effect](#prove-legal-effect)
- [Operationalize governance](#operationalize-governance)
- [Configure Constitutional AI](#configure-constitutional-ai)
- [Model claims, wallets, and recursive twins](#model-claims-wallets-and-recursive-twins)
- [Validate and hand off](#validate-and-hand-off)

## Model the subject

Do not begin with legal form. First determine what enduring thing is being governed. A
`con:ConstitutionalSubject` may be an entity, event, process, relationship, information object, normative
object, or capability. It may be a person, organisation, asset, commodity, financial instrument, property
right, agreement, deed, project, work item, protocol, service, oracle, claim, credential, evidence item,
decision, outcome, place, biological subject, disease outbreak, network, or agentic twin.

Record:

1. `constitution.subject`, exactly equal to `domain.id`.
2. One or more `subject_profile.subject_types` IRIs. Multiple classifications are normal.
3. Any non-exclusive archetypes: `con:Stewarded`, `con:Owned`, `con:Managed`, `con:Governed`,
   `con:Regulated`, `con:Verified`, or `con:Settled`.
4. Every uniform subject-profile facet, using an empty array only when the facet is genuinely absent.

Record legal form and jurisdiction when they exist, but keep them as jurisdictional context rather than
using them as the root subject classification. A forest, claim, protocol, or disease outbreak may have no
legal form and may still be a constitutional subject.

Keep classifications orthogonal. `domain.type` selects a coarse serialization and manifest profile;
`subject_types` provide semantic identity; archetypes provide reusable governance patterns; the
constitutional `type` classifies the normative system. A deed, claim, wallet, oracle, or agent is not
automatically a constitution merely because it is associated with one.

For each subject, ask who or what supplies identity, purpose, interests, values, rights, obligations,
capabilities, claims, wallets, authority, memory, evidence/evaluation/decision/settlement policy,
governance, custody, stewardship, ownership, beneficiaries, oracles, and agentic twins. Resolve bare IDs to
the correct local collection. Use immutable external identifiers only when the source truly lies outside
the package.

## Discover existing instruments

Inventory instruments before drafting. For each document or executable artifact, capture:

- exact title, aliases, jurisdiction, issuing or adopting authority, version, effective period, and
  supersession chain;
- immutable URI/CID when available, owner, update authority, sensitivity, and access policy;
- instrument type and one or more orthogonal functions: `constitutive`, `governing`, `amending`,
  `interpretive`, or `executable`;
- the constitutive, prescriptive, and procedural norms it embodies;
- adoption, amendment, suspension, and current-effect evidence.

Create one `documents.entries[]` record with a unique `id` for every constitutional instrument. Point
`constitution.instruments[].document_ref` to that ID; do not duplicate document metadata. Document roles
remain independent: a charter may still have the `manifest` or `governance` role while its constitutional
function is `constitutive` and `governing`.

Normalize titles without asserting jurisdiction-independent legal equivalence. A trust deed, articles,
charter, bylaws, operating agreement, protocol specification, policy, smart contract, or model prompt is an
instrument or mechanism, not the constitution itself. Preserve local legal terminology as labels or aliases
and select the canonical semantic type from the specification catalogue.

When an instrument is amended or replaced, link `documents.entries[].supersedes`, set accurate effective
periods, and ensure that a superseded instrument and its replacement are not simultaneously canonical.

## Draft a de-novo constitution

Use a de-novo operational constitution when no existing instrument adequately establishes the subject's
governance. Draft the normative system before choosing its document title:

1. Constitutive norms: subject identity, offices or roles, membership, valid institutional facts, and the
   acts that count as decisions.
2. Prescriptive norms: permissions, prohibitions, duties, rights, limits, and review gates.
3. Procedural norms: decision, amendment, interpretation, dispute, suspension, and dissolution processes.
4. Authority sources: the documents, resources, controllers, approvals, or canonical state that make each
   procedure effective.
5. Operational mechanisms: implementations, tests, enforcement points, failure policy, and escalation.

Create an instrument document for the resulting expression, classify its functions, and reference the
norms and procedures as governed resources. A de-novo constitution has operational effect by default;
set `legal_effect.status` to `none`, `claimed`, or `unknown` unless legal competence has been independently
verified.

## Prove legal effect

Separate operational effect from legal effect. Do not infer legal effect from a title, signature,
deployment, CID, smart contract, or model instruction.

Use `legal_effect.status: verified` only when:

- `jurisdiction` is an IRI;
- every `authority_evidence` reference resolves;
- the evidence identifies the competent authority, adoption act, applicable instrument, and current
  effectiveness; and
- runtime verification can still check amendments, revocation, suspension, and jurisdiction.

Static validation establishes structure and local resolution only. If evidence is incomplete, preserve the
gap as `claimed` or `unknown`; do not convert it into a verified fact or legal advice.

## Operationalize governance

For `machine_executable` or `hybrid` execution, and for any instrument with the `executable` function,
require:

- immutable implementation references;
- conformance-test resources;
- authorized enforcement-point services;
- `failure_policy: deny` or `pause_and_escalate`;
- explicit human-review gates for consequential, high-value, irreversible, disputed, or authority-changing
  actions.

Treat executable code as an implementation of constitutional norms, never as its own authority. The
runtime sequence is:

`Load → Resolve Constitution → Resolve Live Authority → Constitutional Evaluate → Authorize → Act → Record → Escalate or Amend`.

At every stateful step, current protocol state, IID/controller state, rights, capabilities, approvals,
revocation, Flow state, and other canonical sources prevail. A constitutional document, smart contract,
agentic twin, wallet reference, or model evaluation cannot self-authorize an action.

## Configure Constitutional AI

Choose the narrowest mode that fits:

- `none`: no model-based constitutional processing;
- `context_only`: supply identified principles as context;
- `critique_and_revise`: critique a proposal and produce a revised proposal;
- `policy_evaluate`: return an evaluation against identified policy;
- `hybrid`: critique/revise plus policy evaluation.

For an active mode, bind named principle resources, the declared agents and agent controllers, required
procedures, a model profile when used, `conflict_policy: canonical_authority_prevails`, and an audit-record
schema. Agentic domains require an active mode.

Instructions supplied to a model must:

1. identify applicable principle and procedure IDs;
2. distinguish a proposed or revised action from an authorized action;
3. require independent resolution of live identity, capability, approval, and enforcement state;
4. fail closed or escalate on missing, ambiguous, conflicting, or superseded authority;
5. emit outcome, reason codes, evidence references, and execution receipts;
6. never request or expose hidden chain-of-thought.

Store decision-relevant facts and reproducible rationale, not private model reasoning. Constitutional-AI
evaluation may constrain or revise behavior; it never grants identity, rights, capabilities, approvals, or
execution authority.

## Model claims, wallets, and recursive twins

Claims and wallets are uniform facets, not proofs. A declared claim does not establish truth. A wallet
reference does not prove control, ownership, balance, or spending authority. Bind claims to local collection,
nested claim-type, or linked-claim IDs when local; bind wallets to declared account names or addresses when
local. Runtime still resolves their current canonical state.

An `con:AgenticTwin` is itself a constitutional subject. Keep the parent and twin identities distinct.
Declare the twin in `agents` or `linked_entities`, reference it through `subject_profile.agentic_twins`, and
include it in `constitutional_ai.applies_to_agents`. Give the twin its own constitution, claims, wallet,
memory, world model, decision engine, capability tokens, and constitutional governor where those surfaces
exist. Never let the twin's internal evaluation grant authority to act for its parent.

Use the IXO cycle as an authoring and reasoning aid:

`Identity → Constitution → Claims → Evidence → Evaluation → Decision → Capability → Action → Settlement → Memory`.

No stage self-authorizes the next.

## Validate and hand off

Every rc.3 domain declares constitutional status and a complete `subject_profile`.

- Require a complete package for `dao`, `organisation`, `project`, `protocol`, `marketplace`, or `pod`
  domains; any domain with agents or agentic twins; agent controllers; or `bounded_evaluate` /
  `bounded_execute`.
- Allow `not_applicable` only for a passive domain with no agent/controller agency or executable governance,
  using `read_only` or `propose_only`, and require a reason.
- Treat `domain.type: deed` as a deed subject, not automatically as a constitution.

Run the bundled schema and semantic validator. Resolve every instrument, subject facet, authority-evidence,
governance, execution, and Constitutional-AI reference. Report static evidence separately from live
adoption, authority, revocation, state, and execution checks. Hand controllers an explicit checklist for
approvals, anchoring, capability grants, deployment, and runtime verification rather than performing those
actions implicitly.
