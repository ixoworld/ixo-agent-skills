# Cloud authoring and deployment handoff

Discover the connected Domain Runtime's tools, contract version, supported operations, and readiness.
Do not infer a live hosted service from an installed skill or a repository example. The decision oracle's
customer `upload_file` tool handles claim attachments; it is not a governing-package upload tool.

## Local implementation contract

The companion Domain Runtime implementation defines the following tools. Their presence in source does
not establish hosted availability: inspect `tools/list` and the returned schemas on the actual connection.

| Tool | Purpose and binding |
| --- | --- |
| `qi_domain_authority_request` | Before signed connection authority, call with `{}` to read the authenticated account's initial permission proposal; grants no rights |
| `qi_domain_professional_start` | Start a durable session; `name`, stable `requestId`, optional existing `targetDomainDid`, `expectedPredecessorCid`, and `operation` |
| `qi_domain_professional_source_pin` | Pin a verified protocol manifest for a derived session using `runId` and an immutable `ixo-vfs` locator |
| `qi_domain_professional_parameters_set` | Set the source templates' declared `values` for `runId` |
| `qi_domain_professional_render` | Render the pinned templates into an immutable revision for `runId` |
| `qi_domain_professional_status` | Read session state using `runId` |
| `qi_domain_professional_upload` | `runId`, `expectedRevisionId`, stable `requestId`, and `files` with exact `path`, UTF-8 `content`, SHA-256 `sha256` |
| `qi_domain_professional_read_file` | Read exact `runId`, `revisionId`, `path` for byte comparison |
| `qi_domain_author_validate` | Validate the current professional session revision using `runId`; retain the returned report |
| `qi_domain_professional_prepare` | Resolve final `domainDid` and content references for `runId`, `revisionId` before approval |
| `qi_domain_professional_approve` | Record exact-revision adoption under independently resolved governance |
| `qi_domain_professional_publish` | Publish that revision with applicable confirmation fields and live controller checks |
| `qi_domain_professional_reconcile` | Read back a known publication receipt and prepared files for `runId`, `revisionId`; never retry a transaction |
| `qi_domain_professional_record_status` | Record exact-revision, operator-reported deployment or launch evidence; does not establish independent verification |
| `qi_domain_professional_handoff` | Bind a credential-free deployment handoff to `runId`, `revisionId`, `network`, stable `requestId` |

The local HTTP implementation uses `/v1/mcp`, protected-resource metadata at
`/.well-known/oauth-protected-resource/v1/mcp`, and OAuth scope `domain:connect`. Use the operator's
configured host and authorization server; these paths do not establish a public service endpoint.
Hosted authentication injects `authorityRef`; never put bearer credentials in a handoff or authored package.
Start, upload and handoff retries reuse their original `requestId` and identical input; changing input
requires a new request. Do not retry a consequential publication merely because a request timed out.
Read actual tool limits before sending content (the local implementation bounds a package to 128 files
and 8 MiB). Upload creates an immutable revision; an idempotent retry must reuse the same request and bytes.
After upload or render, call `qi_domain_author_validate` and inspect its report before preparation.
Preparation may produce a new materialized revision: read status and use that final revision for adoption.
For a protocol-derived service, start with `operation: derived`, then call source pin, parameters set,
and render in that order. The source locator contains `kind: ixo-vfs`, `entityDid`, absolute VFS
`manifestPath`, immutable `cid`, and the verified deployment URL. An independently configured resolver
verifies protocol identity; the source manifest cannot establish its own authority. The VFS locator
`entityDid` must equal the manifest protocol identity. Set only parameters
declared by those templates. The derived type is `oracle`; do not call the legacy `protocol_bind`
operation for this route. Direct arbitrary content upload is supported for standalone sessions, not as
a substitute for verified derived rendering. If any required capability is absent from the connection,
retain the draft and hand off that step to the coding agent. Editing a prepared protocol source requires
a new amendment session under the incumbent procedure.

## Sign in and authorize the next operation

OAuth sign-in authenticates the actor and client. It does not grant authoring or publication rights.
Those operations require separately signed, exact-scope UCAN proofs. With valid OAuth but no registered
proof bundle, the local HTTP adapter advertises only the read-only `qi_domain_authority_request` tool.
Call it with `{}`. It returns `status: authorization_required`, `authoringAuthorized: false`, and a bounded
`authorizationRequired` object containing the configured Portal `reviewUrl`, broker/runtime identities,
and a safe proposal for connect and run-create permissions. All authoring tools remain unavailable
until signed connection authority is verified. Use the returned URL and proposal; do not invent a host or infer permission
from successful OAuth consent. The initial proposal contains no access token or authority reference.

Open the configured Portal `/domain/authorise` page, paste the returned proposal, and review the displayed
actor, controller, domain, action, run, revision and client. The operator confirms the review and signs
through the existing Portal PIN/signing flow. The page registers proofs; keys and recovery material stay
out of chat. Return to the cloud agent and refresh or reconnect tool discovery using the same OAuth
identity; clients may cache the initial bootstrap-only inventory. The next authenticated request
exchanges the signed proof bundle and advertises normal tools. Then continue the authorized operation.
A signature grants only the exact reviewed scope, not general authority over a future domain.

New run IDs, prepared revision hashes or source paths may require additional exact-scope permissions.
Use the next-operation proposal and the same review flow. Renewal can preserve previous valid proofs
for the same actor and OAuth binding while replacing matching scopes. An expired prior bundle requires
a fresh complete required set. The OAuth exchange selects the renewed bundle, so a cloud user need not
copy a bearer reference back into chat. Any optional local CLI reference is private and must never enter
a deployment handoff. Invalid or expired OAuth credentials require refresh; unavailable authorization
infrastructure leaves authoring pending without changing an existing oracle's runtime behavior.

This is the local Portal/Runtime integration contract. Verify the configured deployment supports it;
local tests do not establish a completed browser, provider or testnet journey.

## Draft and save

Author in chat or an available document workspace. A cloud client sends bounded file content to the
operator-authorized authoring service and retains the returned durable session and exact revision. Never
send a cloud client a server-local path or ask it to pretend a shared filesystem exists.

Before mutation, show the target domain, operation, and reviewed content. Reuse authorization already given
for that operation. The runtime verifies exact scope and predecessor revision. Keep session references free
of bearer tokens and credentials. Re-fetch the saved revision and compare validation and receipt evidence.

If the connected service lacks hosted content upload, keep the draft and prepare a downloadable package.
Explain that upload has not occurred. Continue the authoring work and carry the package into the terminal
handoff; do not substitute customer attachment upload or a guessed endpoint.

## Review and adopt

Read the current governance procedure for an existing domain. A proposed replacement cannot approve its
own weaker procedure. For a new domain, independently verify founding authority. Apply independent review
only when the applicable procedure requires it.

Provision a new identity inactive when necessary. Resolve identities and all document references before
final adoption. Approval covers the exact materialized revision. Any subsequent content change requires a
new revision and the applicable approval. Upload, review, adoption, and publication are separate records.

Use the discovered runtime's publication operation for the exact adopted revision. Retain successful
receipts after partial failure. Use the read-only reconcile operation to check a known transaction
receipt and prepared-file readback. A missing transaction receipt remains unknown; reconciliation does
not authorize resubmission. Do not claim rollback, overwrite
an existing domain, or delete partial files without the corresponding authority.

Keep three identities distinct: the oracle entity DID identifies the governed domain; the `did:web`
identity identifies the hosted service; the runtime chain account DID identifies the signer used for
existing evaluation transactions. Bind the correct references during preparation and deployment. None
of these identities grants the other identities' authority. Preserve all existing identities on updates.

## Resume deployment

Pass a durable handoff reference to Codex or Claude Code. Include the package revision, runtime targets,
network, already completed steps, and unresolved launch work. Do not put hosting credentials in it.
Authenticate again through the existing sign-in flow when required. Resume the existing oracle-builder
steps against the expert's hosting account and preserve existing configuration.

Verify constitutional `#dom` publication separately from discovery `#dmn`, the deployed endpoint, service
offer, engine registration, and commercial grants. A successful setup command or document upload does not
prove those conditions. Run a test claim through the existing system and retain its receipt.

Use `qi_domain_professional_record_status` to retain `deployment_binding`, `runtime_loading`, `discovery`,
`commercial_registration`, or `test_claim` evidence. Its inputs bind `runId`, `revisionId`, stable
`requestId`, `runtimeTarget`, the implementation's SHA-256 `implementationDigest`, actual
`observedRevisionId` (or null), `status` (`configured`, `observed`, or `failed`), and `evidenceRefs`.
Supply receipt/content references supported by the discovered schema, not credentials or private payloads.
These records retain operator-reported provenance. They do not independently prove deployment,
observation quality or live acceptance, even when their status is `observed`.

## Report learning honestly

Report the configured revision and actual loaded revision separately. A fallback or missing document is
an observation, not an implicit amendment. New constitutional findings do not stop delivery, require extra
review, alter decisions, or trigger additional model charges during replay.

Report local tests, authenticated cloud-client acceptance, and testnet outcomes separately. Leave any
unexecuted acceptance case marked not run.
