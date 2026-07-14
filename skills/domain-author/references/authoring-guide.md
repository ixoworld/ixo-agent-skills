# Authoring and validation guide

Use this guide after pinning the bundled `domain.md` specification and JSON Schema. The normative prose wins
over this guide. A conflict between the normative prose and schema is a specification defect and must fail
closed rather than being guessed around.

## Parameter interview

Derive the question set from required spec fields and `x-template.parameters`. Ask one group at a time,
skip known values, and show defaults as assumptions rather than facts.

| Group | Collect | Control |
| --- | --- | --- |
| Identity | name, purpose, boundary, lifecycle state, target type | Confirm the type before selecting templates. |
| Authority | controller DIDs, governance, quorum, timelock, agent-controller policy | Reject private keys and signing secrets. |
| Network and truth | chain/environment, resolvers, canonical registries, evidence stores | Mark authoritative vs convenience endpoints. |
| Services and resources | endpoints, authentication boundary, schemas, rubrics, datasets, sensitivity | Store references, not credentials or raw evidence. |
| Rights | actor, resource, action, constraints, expiry, escalation | Default deny; grant least authority. |
| Claims and flows | claim types, schemas, evidence, rubric, outcomes, review/dispute states | Require a human-review path for consequential outcomes. |
| Accounts | address/reference, purpose, spending/authz policy, settlement triggers | Never collect seed phrases or signing keys. |
| Agents | role, operator, capability ceiling, permitted/forbidden outputs, escalation | Default to propose-only unless the spec requires less. |
| Privacy | classification, access policy, retention, public surfaces, not-applicable surfaces | Default private; do not infer public consent. |
| Documents | universal, manifest, and operational roles required by the pinned spec | Require one authoritative role mapping. |

Resolve all `fill_at: author` values before rendering. In an `authoring_draft`, convert identity values that
can safely be generated to `urn:uuid:` identifiers and represent unavailable CIDs or anchoring receipts as
`null`. Keep remaining publication inputs in the run report, not as placeholder tokens in `domain.md`.
Reject every unresolved `{{parameter}}` or `<<FILL_AT_PUBLISH:...>>` after rendering.

## Document selection

Use the type-to-manifest mapping in the pinned specification. Do not rely on a hard-coded table when the
spec is available. For every package:

- include the universal description and changelog roles required by the spec;
- include exactly one defining manifest role for the selected type;
- include operational roles for every live surface, or record the spec-compliant not-applicable reason;
- assign authority, disclosure, sensitivity, access, freshness, and anchoring fields from the spec;
- use `null` for unavailable CIDs in `authoring_draft`, and fill identities only from verified persistence
  receipts when moving to `persisted_draft`.

## Validation gates

Run the bundled TypeScript validator. It applies the release-candidate JSON Schema, semantic checks, and
package invariants. For `persisted_draft`, `anchored`, or `runtime`, also run the live deployment checks the
specification requires. Record command, validator and spec versions, input digest, timestamp, exit status,
errors, warnings, and external checks that were not attempted.

Treat these as errors:

- invalid or missing frontmatter, required spec fields, document roles, manifests, or identifiers;
- an unresolved author-time parameter, undeclared placeholder, duplicate role/path, or unknown template;
- template markers or `.tmpl` filenames in rendered output;
- a derived output with `domain.type: protocol`, a missing/mismatched `domain.class`, or protocol-self
  controller/account/right content copied into the instance;
- a template path, marker, protocol, type, CID, or digest mismatch;
- a sensitive payload marked public, an authority grant without constraints, or a signing secret;
- a profile/identity mismatch, duplicate identifier, unresolved reference, unreachable flow state, missing
  right gate, or claim contract that lacks its required evidence, scoring, review, or next-action semantics;
- a persisted document with a missing/fabricated CID, or persisted bytes that fail re-fetch verification;
- a schema or semantic validator failure, or provenance that does not match actual sources and outputs.

Treat these as warnings unless the canonical spec makes them errors:

- missing human review or dispute handling for consequential outcomes;
- missing authentication boundaries, sensitivity labels, freshness policy, or change rationale;
- an unanchored persisted draft, stale source, non-atomic persistence path, or convention not confirmed for
  the target deployment.

## Stop codes

Use one primary code and include actionable evidence:

| Code | Stop condition |
| --- | --- |
| `BLOCKED_SPEC_UNAVAILABLE` | The paired specification/schema cannot be pinned, read, or reconciled. |
| `BLOCKED_TEMPLATE_UNAVAILABLE` | The immutable template manifest or a required template cannot be read. |
| `BLOCKED_TEMPLATE_MISMATCH` | Path, suffix, marker, protocol, type, CID, digest, or role identity disagrees. |
| `BLOCKED_PARAMETER_UNRESOLVED` | A required author-time value remains unknown. |
| `BLOCKED_CAPABILITY_UNAVAILABLE` | A required runtime tool or validator is absent or incompatible. |
| `BLOCKED_AUTHORITY` | The requested read/write scope is missing or too broad to use safely. |
| `BLOCKED_TARGET_CONFLICT` | The target exists and overwrite/promotion policy is unresolved. |
| `BLOCKED_VALIDATION` | A local or canonical validation error remains. |
| `PARTIAL_PERSISTENCE` | At least one external write succeeded before a later failure. |

## Controller handoff

Keep these outside the skill's execution boundary:

1. Register or select the canonical entity/IID and resolve publication identifiers.
2. Re-render from controlled inputs and revalidate when replacing draft identifiers or `null` receipts.
3. Anchor the exact persisted `domain.md` CID using the deployment's verified linked-resource procedure.
4. Bind companion document identities when required by the canonical spec or chain contract.
5. Approve security-sensitive blocks through the applicable governance policy and record the proof.
6. Validate canonical state after anchoring and resolve conflicts according to the pinned spec.
7. Publish selected nonsensitive files only with explicit controller consent.

Until anchoring evidence exists, call the artifact a local or VFS draft, never a published domain.
