# Use the host's existing services

## Discover, bind, invoke, verify

Discover the current capability catalog using the host's declared discovery tools (for example `list_capabilities` and `load_capability` when exposed). Inspect the returned tool schemas and descriptions. Record the selected tool, operation, user/oracle identity, entity/network scope, permission evidence, and whether it reads, stages, commits, signs, or dispatches. Refresh after a reconnect, identity change, or missing-tool response.

These names are inspected integration anchors, not guaranteed tools in every deployment:

| Need | Observed route | Required behavior |
| --- | --- | --- |
| Discover/load this skill | `skills`: `search_skills` with `q`, or `list_skills`; `sandbox`: `load_skill` with returned `cid` | Select the intended version and source; private discovery can degrade to public-only. A missing private result does not prove absence. Read the returned skill path through `sandbox_run` with the same CID. |
| Portal context and UI actions | `portal`: `call_portal_agent`, available when browser tools arrive with the request | Pass a bounded objective and fixed identifiers. The Portal agent must inspect current browser tool schemas. No connected Portal means no assumed browser mutation. |
| Entity and governance discovery | Domain indexer tools and current Portal entity tools | Read real entity DIDs, group relations, network, deployed module config, mandate and indexed references. Verify authoritative chain state for a decision or consequential action; stale indexes are discovery evidence. |
| Topics | Portal `search_topics`, `read_topic`, `list_topic_destinations`, `resolve_domain_topic_rooms`, `stage_topic_composition`, `stage_topic_changes`, `propose_topic` when declared | Read before revise; preserve revision/Kind/Shape bindings. Staging is not creation. Resolve exact room separately from entity and let the declared host path commit. |
| Documents and VFS | Current upstream sandbox/artifact tools or a declared VFS adapter; editor tools for document authoring | Inspect the actual namespace and persistence contract. `/workspace/data` scratch files and generic artifacts are not automatically entity VFS `/governance` publications. Require returned entity/path/CID and authorised read-back. |
| DAO DAO proposal and votes | Current Portal governance/editor transaction path and declared chain queries | Resolve final ordered `msgs`, inspect exact deployed module and wallet workflow, then verify transaction and proposal read-back. Do not invent a `submit_governance` tool. |
| Flow design/runtime | Discover `manage-flow` and `flow-agent` skills when available, plus the real registry and host adapters | Composition belongs to Flow authoring; execution belongs to its authorised runtime. Skill command names are not necessarily callable tool names. Require GRS enforcement evidence for governed execution. |
| Provider side effects | Declared enforcing Flow executor/connector, including Composio only when appropriate | Connected credentials do not confer governance rights. Require provider/tenant/resource binding, limits, caveat enforcement and receipts before dispatch. |
| Claims and evaluation | Current collection/protocol resolver, claim/evaluation service, or Portal claim/evaluation panels | Resolve actual collection schema, rubric, permissions, payment behavior and transport. Use the service's real payload schema and signer route. |
| Open claim/evaluation forms | Portal `list_open_surveys` then `fill_open_survey` | Read schema, context, allowed values and validation first. Filling does not submit; the inspected tool requires the user to review and submit. Read back applied/rejected values. |
| Future monitoring | A discovered scheduler/watch tool with a real persistence contract | Set up only within accepted scope; retain schedule/watch ID, actor, expiry and cancellation path. No receipt means no active watch. Do not infer scheduling from a plugin name. |

The skill is instructions consumed by the oracle. Its sandbox files have no direct access to the host's plugin objects. The host performs service calls and passes only the necessary, permitted results to any local computation. This capsule contains no signing or networking scripts and requires no new environment secrets.

## Service-specific boundaries

VFS publication requires both integrity and availability. Read the upload response, compare retrieved bytes, retain namespace/access context, and check representative eligible-voter retrieval through an authorised test or attestation. Do not impersonate voters. A CID or shareable-looking URL is not permission.

Claim bodies and attachments use the collection's currently supported protected transport. Inspected Portal source includes a VFS claims evidence lane `/.claims/<collectionId>` under the owning entity, with collection-scoped authorisation, and recognises existing claims-bot media references. Do not move claim bodies or evidence to ordinary `/governance` storage just to get a CID. Use the declared claims adapter to choose the correct transport, retaining namespace and access requirements. Do not add Cellnode fallback. Do not assume a source feature is deployed in the current oracle.

Flow execution, claim submission, evaluation, credential issuance, and payment have separate contracts. Resolve the service DID, actor/acting-for binding, scopes and proof chain through the existing harness. A grant to read evidence does not authorise writing an evaluation. A delegated evaluation may trigger payment under the collection's settings; make those effects part of the exact action handoff.

## If a capability is missing

Name the dependent step and precise missing capability, permission, identifier or enforcement evidence. Preserve a reviewable Draft/handoff, continue independent work, and offer the existing Portal path where one is actually available. Never claim a service integration, background watch, write, signature or deployment completed without its receipt and read-back.

Related skills are optional dependencies. Discover and read an available version before handing off to `compose-topic`, `manage-flow`, or `flow-agent`. If absent, continue with this skill's worksheets; do not guess their schemas or simulate their execution.
