# Organisation, sharing, recovery, and protected artifacts

Contents: move and rename; trash and restore; sharing and revocation;
failure recovery; canonical and immutable content.

## Move and rename

Resolve the exact source and destination in the same authorized namespace.
Use `vfs_move` for a file move or rename; do not emulate it with copy-and-delete.
An explicit instruction to move the resolved file is sufficient authority for
that reversible operation. Check destination collisions; do not trash or
replace an occupant to make a move succeed without authorization.

For a cross-namespace transfer, folder creation, or recursive folder operation,
first verify a capability with the required semantics. Establish destination
access and disclosure scope. The pinned agent tool descriptions are broader
than their file-ID handlers; they are not evidence of recursive support.
Do not manufacture placeholder files to create folders without user intent.

## Trash and restore

Use `vfs_delete` only for the resolved files the user asked to delete. Treat its
effect as moving to trash, not permanent removal. If the user provided an exact
set and explicitly requested deletion, do not ask for the same authorization
again; resolve vague instructions such as "clean up old drafts" into a concrete
set before asking. Read any stricter live tool confirmation requirements.

Inspect missing/skipped files and per-item failure details. Do not say "all
deleted" after partial completion or assume descendants were included.
The current agent has no trash-restore or purge tool. Portal's trash restore
is not historical-version restoration. Never delete versions automatically to
work around a version limit, even if an error string suggests it.

For "restore version 3", first resolve the exact file, the requested version,
and whether the user wants to inspect it or make it current. Invoke a verified
version-restore capability only when available and authorized; pass its current
version guard if provided. Otherwise explain the unavailable operation. If the
user supplies historical bytes, an authorized replacement from that export is
a new write, not proof that native history was restored.

## Sharing and revocation

Separate a private grant to named recipients from public disclosure.

- `vfs_share({path, public: true})` makes content downloadable by anyone with
  the link. Use it only when this audience is explicit or already established.
  "Share with Jev" or "let the PathGen team read it" does not authorize it.
- For private sharing, resolve recipients, scope, rights and duration through
  the owning access-management capability. If unavailable, give the Portal
  Access handoff. Do not claim a grant exists or send a message unless that
  action was requested and its result verified.
- Merely asking for an open/download link does not authorize changing access.
  Prefer an existing authenticated reference. Ask one audience question if the
  only available link route requires public publication.
- Resolve a publication target before calling `vfs_share`. Its handler falls
  back to treating an unresolved file as a folder. Never turn a missing or
  ambiguous file into a broader folder publication.
- For folder publication, establish the intended subtree and disclose that
  folder visibility cascades. Inspect effective/inherited visibility through a
  capable metadata surface. Hidden files are not necessarily private.
- Use `public: false` for an authorized public unpublish, not for revoking a
  private UCAN grant. An inherited public ancestor or another access route may
  still expose the file. Verify effective visibility before saying "private";
  if the tools cannot inspect it, report the flag change and that limitation.

Never silently broaden a folder scope, change on-chain controllers, or publish
a file to bypass a permission error. Do not print signed URLs, proofs, private
keys or bearer tokens. A returned public link may be shown only after the
authorized publication or when the user requested that existing public link.

## Failures and recovery

| Observation | Response |
| --- | --- |
| No delegation / access denied | Explain the access boundary and required grant; do not label the file missing. |
| 404 / no match | Distinguish not found from not accessible within this scope; do not search other namespaces without authority. |
| Existing destination | Keep the existing file; reuse explicit replacement intent or resolve copy/replace with the user. |
| `oldString` mismatch / multiple matches | Re-read, include exact context, and keep `replaceAll` false unless every match is intended. |
| Concurrent modification | Re-read and reassess; no blind whole-file retry. A separate draft is the safe fallback when a guard is unavailable. |
| Version limit | Preserve the original; offer a separate revision or owner-managed history cleanup. Do not purge versions yourself. |
| Rendering stub / unsupported or oversized binary | Use a supported parser via the bridge, or state that content could not be inspected. |
| Timeout / unknown write outcome | Inspect the exact destination before retrying; report uncertainty if the result cannot be established. |
| Some batch items fail | Record successes, failures and unattempted steps; retry only identified safe operations. |
| Transfer succeeds but source deletion fails | Report copy/save success and cleanup failure separately. Do not retry the entire transfer. |

## Canonical and immutable content

The Portal Library includes files alongside flows, Topic templates, skills and
apps. A displayed Library entry need not be an ordinary file. Identify its type
from trusted metadata and route canonical changes to the owning capability.
Do not patch a projection/export and claim the underlying object was updated.

Keep signed decisions, accepted claim evidence, issued credentials, and
registered domain resources intact unless their owning protocol explicitly
permits the requested revision. Preserve the evidence/version reference used
by an evaluation. A file edit is not a credential reissue, evidence supersession,
chain update, Topic acceptance, or payment authorization.

Use `domain-author` for domain-document authoring, and `compose-topic` or
`facilitate-topic` for Topic actions when those skills are installed. Their
specific validation and persistence rules remain applicable; this Library
workflow does not override them.
