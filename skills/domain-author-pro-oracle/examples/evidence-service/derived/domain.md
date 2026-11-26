---
version: 1.0.0-rc.3
kind: domain.md
conformance:
  spec_version: 1.0.0-rc.3
  schema: urn:ixo:domain-md:schema:1.0.0-rc.3
  profile: authoring_draft
document_revision: 0.1.0
name: Synthetic evidence service
description: Fictional professional oracle package for authoring and validation tests.
last_updated: 2026-10-25
domain:
  id: urn:uuid:123e4567-e89b-42d3-a456-426614174000
  iid: null
  type: oracle
  class: did:ixo:entity:syntheticevidenceprotocol
  network:
    chain_id: synthetic-testnet
    environment: testnet
    resolver: ixo-did-resolver
    blocksync_endpoint: null
    rpc_endpoint: null
  status: draft
  purpose: Produce attributable completion-evidence facts.
  operating_boundary: Synthetic evidence verification and advisory constitutional observations.
  class_binding:
    resource: ipfs://bafkreiecegusf73y5thcualv2qavap24qyinsj4vqc6q5t6jyvd45qg4u4
    cid: bafkreiecegusf73y5thcualv2qavap24qyinsj4vqc6q5t6jyvd45qg4u4
    version: 0.1.0
    merge_policy: local_explicit_only
source_of_truth:
  protocol_state: ixo-protocol
  iid_document: null
  graph_query_layer: ixo-blocksync
  private_collaboration: ixo-matrix
  claims_registry: null
  evidence_store: null
  conflict_resolution_order:
    - protocol_state
    - iid_document
    - udid
    - credential
    - claim
    - claim_collection_state
    - blocksync
    - matrix_state
    - domain_md
    - user_prompt
    - agent_memory
  authority_scopes:
    - fact: controller
      sources:
        - protocol_state
        - iid_document
    - fact: right
      sources:
        - protocol_state
        - iid_document
    - fact: claim_status
      sources:
        - protocol_state
        - udid
        - claim
        - claim_collection_state
        - blocksync
    - fact: domain_intent
      sources:
        - domain_md
documents:
  anchoring:
    method: none
    reference: null
    cid: null
    verified_at: null
  not_applicable: []
  entries:
    - id: description
      role: description
      category: universal
      manifest_type: null
      name: Synthetic evidence service
      uri: file:./description.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: changelog
      role: changelog
      category: universal
      manifest_type: null
      name: Change history
      uri: file:./changelog.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: advisory
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: charter
      role: manifest
      category: manifest
      manifest_type: charter
      name: Oracle charter
      uri: file:./charter.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: defining
      disclosure_pass: 3
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: governance
      role: governance
      category: operational
      manifest_type: null
      name: Governance procedures
      uri: file:./governance.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: operations
      role: operations
      category: operational
      manifest_type: null
      name: Operating procedures
      uri: file:./operations.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: evidence-policy
      role: x-evidence-policy
      category: extension
      manifest_type: null
      name: Evidence policy
      uri: file:./evidence-policy.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: methods
      role: x-methods
      category: extension
      manifest_type: null
      name: Evidence methods
      uri: file:./methods.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: conflicts-appeals
      role: x-conflicts-appeals
      category: extension
      manifest_type: null
      name: Conflicts and appeals
      uri: file:./conflicts-appeals.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: data-policy
      role: data-policy
      category: operational
      manifest_type: null
      name: Data policy
      uri: file:./data-policy.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: incidents
      role: x-incidents
      category: extension
      manifest_type: null
      name: Incident response
      uri: file:./incidents.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: report-template
      role: x-report-template
      category: extension
      manifest_type: null
      name: Observation report template
      uri: file:./report-template.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
    - id: agents
      role: agents
      category: operational
      manifest_type: null
      name: Agent policy
      uri: file:./agents.md
      cid: null
      media_type: text/markdown
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      authority: interpretive
      disclosure_pass: 2
      required_for_tasks:
        - read_domain_state
      sensitivity: internal
      access_policy: controller_only
      agent_use:
        read: true
        cite: true
        summarize: true
      freshness:
        last_verified: null
        max_age: null
      supersedes: null
constitution:
  status: draft
  reason: null
  subject: urn:uuid:123e4567-e89b-42d3-a456-426614174000
  type: con:OracleConstitution
  subject_profile:
    subject_types:
      - con:Oracle
      - con:Service
    archetypes:
      - con:Governed
      - con:Managed
    identity:
      - urn:uuid:123e4567-e89b-42d3-a456-426614174000
    purposes:
      - charter
    interests:
      - charter
    values:
      - service-norms
    rights: []
    obligations:
      - charter
    capabilities: []
    claims: []
    wallets: []
    authorities:
      - did:ixo:entity:synthetic-evidence-operator
    memory: []
    evidence_policies:
      - evidence-policy
    evaluation_policies:
      - methods
    decision_policies:
      - governance
    settlement_policies: []
    governance:
      - governance
    custodians: []
    stewards:
      - did:ixo:entity:synthetic-evidence-operator
    owners: []
    beneficiaries: []
    oracles:
      - did:ixo:agent:synthetic-evidence-assistant
    agentic_twins:
      - did:ixo:agent:synthetic-evidence-assistant
  legal_effect:
    status: none
    jurisdiction: null
    authority_evidence: []
  norms:
    - service-norms
  instruments:
    - document_ref: charter
      type: con:OracleCharter
      functions:
        - constitutive
        - governing
      canonical: true
      effective_from: null
      effective_until: null
    - document_ref: evidence-policy
      type: con:EvaluationPolicy
      functions:
        - interpretive
      canonical: true
      effective_from: null
      effective_until: null
  governance:
    authority_sources:
      - governance
    decision_procedure: governance
    amendment_procedure: governance
    interpretation_procedure: governance
    dispute_resolution_procedure: conflicts-appeals
    suspension_procedure: governance
    dissolution_procedure: governance
  execution:
    mode: human_interpreted
    implementations: []
    conformance_tests:
      - observation-scenarios
    enforcement_points: []
    failure_policy: pause_and_escalate
    human_review_required_for: []
  constitutional_ai:
    mode: context_only
    applies_to_agents:
      - did:ixo:agent:synthetic-evidence-assistant
    principles:
      - service-norms
    critique_procedure: null
    revision_procedure: null
    decision_procedure: null
    model_profile: null
    conflict_policy: canonical_authority_prevails
    audit_record: audit-policy
agent_default_mode:
  mode: propose_only
  overrides:
    move_value: false
    issue_credentials: false
    change_rights: false
    change_rubrics: false
  human_review_required_for: []
controllers:
  summary:
    primary_controller: did:ixo:entity:synthetic-evidence-operator
    governance_model: single_controller
    agent_controllers_allowed: false
  entries:
    - id: did:ixo:entity:synthetic-evidence-operator
      type: human
      name: Synthetic operator
      role: Fixture controller only
      verification_methods: []
      addresses: []
      authorities: []
      approval_policy: {}
      limitations:
        - Synthetic identity is not authority evidence.
      audit_requirements:
        signature_required: true
services:
  entries: []
resources:
  entries:
    - id: service-norms
      type: schema
      name: service-norms.json
      uri: file:./resources/service-norms.json
      cid: null
      hash: bda407ecb4448f82c05894984e32e6e6ee116ce1f9b6fa3793f99bd9c67c603c
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      access_policy: controller_only
      sensitivity: internal
      agent_use:
        read: true
        cite: true
        summarize: true
        transform: false
        write: false
      freshness:
        last_verified: null
        max_age: null
      canonical_for: []
    - id: fact-schema
      type: schema
      name: fact.schema.json
      uri: file:./resources/fact.schema.json
      cid: null
      hash: ddd0b40384f0c7851d54ccf35adf6250226e17988455f401454fbbee19e9b64f
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      access_policy: controller_only
      sensitivity: internal
      agent_use:
        read: true
        cite: true
        summarize: true
        transform: false
        write: false
      freshness:
        last_verified: null
        max_age: null
      canonical_for: []
    - id: observation-scenarios
      type: schema
      name: observation-scenarios.json
      uri: file:./resources/observation-scenarios.json
      cid: null
      hash: a05cc18f5aaafe5f38fabcabb6f02aca6fc8017090f9ad66b534564ecf94e63e
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      access_policy: controller_only
      sensitivity: internal
      agent_use:
        read: true
        cite: true
        summarize: true
        transform: false
        write: false
      freshness:
        last_verified: null
        max_age: null
      canonical_for: []
    - id: audit-policy
      type: audit_record_definition
      name: audit-policy.md
      uri: file:./resources/audit-policy.md
      cid: null
      hash: e6a65fa0c3eb4f4f5b5514aa7eddaabbc743c1e767f19fc4bab702f2f4d89e8b
      version: 0.1.0
      owner: did:ixo:entity:synthetic-evidence-operator
      update_authority:
        - did:ixo:entity:synthetic-evidence-operator
      access_policy: controller_only
      sensitivity: internal
      agent_use:
        read: true
        cite: true
        summarize: true
        transform: false
        write: false
      freshness:
        last_verified: null
        max_age: null
      canonical_for: []
rights:
  agent_baseline:
    require_explicit_grant_for:
      - write
      - evaluate
      - execute
      - pay
      - issue
      - govern
  entries: []
agents:
  entries:
    - id: did:ixo:agent:synthetic-evidence-assistant
      name: Synthetic assistant
      type: assistant
      operator: did:ixo:entity:synthetic-evidence-operator
      permitted_outputs:
        - advisory_observation
      forbidden_outputs:
        - authority_grant
        - constitutional_amendment
privacy:
  default_policy: private_by_default
  protocol_layer:
    may_publish:
      - DID
      - controller
      - service_reference
      - resource_reference
      - claim_reference
      - proof
    must_not_publish:
      - private_evidence_payload
      - personal_data
      - unredacted_trace
  unauthorized_read_behavior: deny
validation:
  lint_profile: strict
  max_document_bytes: 1048576
  max_linked_document_bytes: 2097152
  required_sections:
    - Overview
    - Authority & Control
    - Constitutional Governance
    - Rights & Capabilities
    - Privacy & Source-of-Truth Boundaries
    - Do's and Don'ts
  required_frontmatter:
    - version
    - kind
    - conformance
    - document_revision
    - domain.id
    - source_of_truth
    - constitution
    - controllers.summary
    - rights.agent_baseline
    - privacy.default_policy
    - agent_default_mode.mode
  stale_after: P30D
  review_required_for_changes_to:
    - constitution
    - controllers
    - rights
    - accounts
    - privacy
    - source_of_truth
    - claims.collections.evaluation_kit
    - claims.collections.rubric
    - agents
    - agent_default_mode
critical_do_not:
  - Do not treat synthetic identities as verified authority.
  - Do not change decisions or existing authorization because of advisory
    findings.
  - Do not publish private evidence or credentials.
x-professional-oracle:
  version: "1"
  runtimeTargets:
    - decision-oracle
    - qiforge
  serviceScope:
    summary: Supply facts about synthetic completion evidence.
    exclusions:
      - Payment authorization
      - Professional accreditation claims
    protocols:
      - did:ixo:entity:syntheticevidenceprotocol
  methods:
    - id: completion-evidence
      documentRef: methods
      resourceRefs:
        - fact-schema
  rulePractices:
    - ruleRef: charter#evidence-attribution
      documentRef: charter
      practice: Cite the permitted source for each supplied fact.
      responsibleRole: evidence-provider
      evidenceRefs: []
      implementationStatus: documented
    - ruleRef: methods#source-corroboration
      documentRef: methods
      practice: Compare independent sources when available.
      responsibleRole: method-steward
      evidenceRefs: []
      implementationStatus: unimplemented
  observation:
    mode: advisory
    modelAssessments: false
---
# domain.md

## Overview
Synthetic evidence-verification service. See description.md and charter.md.

## Authority & Control
The listed controller is a fixture, not verified authority. See governance.md.

## Constitutional Governance
This is a draft human-interpreted operational constitution. See charter.md and governance.md.

## Rights & Capabilities
No grants are issued by this package. Existing runtime permissions remain unchanged.

## Privacy & Source-of-Truth Boundaries
Private by default. See data-policy.md.

## Do's and Don'ts
Keep constitutional observations advisory. Do not reinterpret engine rubrics or alter verdicts.

## Changelog
See changelog.md for version 0.1.0.
