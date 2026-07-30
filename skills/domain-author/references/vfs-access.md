# VFS deployment and persistence guide

Use this guide only when a run needs IXO VFS reads or writes. Treat every exact endpoint, tool name,
argument, CID rule, namespace rule, and retention behavior as deployment-specific until verified from the
live tool schema or authoritative deployment documentation.

## Preflight capability contract

Record a capability matrix before the first read or write:

| Need | Verify live | Safe fallback |
| --- | --- | --- |
| Read immutable content by path or CID | tool name, argument schema, paging, returned identity | Ask for an exported immutable bundle or stop. |
| Enumerate templates | path normalization, glob/list semantics, pagination | Use only manifest-declared exact paths. |
| Write text bytes | encoding, create/replace semantics, returned CID/digest | Keep the package local. |
| Prevent lost updates | atomic batch, transaction, expected version, ETag, or if-match | Write to a new run-specific staging path. |
| Re-fetch exact bytes | version/CID addressing and content response | Do not call the write verified. |
| Promote/rename staging | atomicity, collision behavior, rollback evidence | Leave staging in place for a controller. |
| Publish or delete | authorization and reversibility | Never invoke from this skill. |

If a required behavior is absent or ambiguous, stop with `BLOCKED_CAPABILITY_UNAVAILABLE`. Do not map an
unknown tool to a remembered VFS API by name alone.

## Authority model

Use separate capabilities:

- **Template read:** immutable CID-scoped access when supported; otherwise read-only access restricted to
  the exact `templates/` subtree or manifest-declared paths.
- **Target write:** write access restricted to a new target-domain staging path in the controller's
  namespace. Do not request protocol-tree access, root namespace access, publish, delete, or on-chain rights.

Inspect the effective scope, expiry, audience, namespace, and path before use. Reject a grant that is too
broad when a narrower route is available. Never print or persist bearer tokens, private keys, authorization
headers, or complete capability proofs in artifacts or logs.

## Template retrieval

1. Obtain an immutable template-manifest locator from the user, registry, or exact protocol metadata record.
2. Fetch the manifest and record its returned CID/digest plus the deployment identity.
3. Select one declared `derived_type`; normalize and validate its exact file paths locally.
4. Fetch only the allowlisted files. Compare returned bytes to every declared CID/digest.
5. Apply the path/suffix/marker/protocol/type identity gate from the separation reference.
6. Record identities and verification results without recording credentials.

Do not perform a broad search of protocol-self files. A path-scoped read that cannot reach them is preferred.
If protocol metadata must be read to locate the manifest, use an exact resource locator and treat the result
as metadata evidence only, never as render input.

## Persistence protocol

External writes are not the default. Require an explicit persistence request and a recorded target contract.

### Conflict and idempotency gate

- Generate a unique run ID and use it as the idempotency/audit key when the deployment supports one.
- Inspect the target. If it exists, require an expected version/ETag or explicit overwrite approval plus a
  recoverable prior version. Otherwise stop with `BLOCKED_TARGET_CONFLICT`.
- Prefer an atomic transaction. When unavailable, write to a new path such as
  `<target>/.staging/<run-id>/` or another controller-approved versioned path; do not emulate atomicity.

### Ordered writes

1. Write each companion document as exact UTF-8 bytes and capture the full receipt: logical role, target
   path, version/ETag, returned CID/digest, timestamp, and tool request ID when available.
2. Re-fetch by immutable identity or exact version and compare bytes. A successful write response without
   a matching re-fetch is not verified persistence.
3. Insert only the verified companion identities into the staged `domain.md` documents model.
4. Re-run the bundled schema and semantic validation on the updated local package.
5. Write `domain.md` last, capture its returned CID/digest, and re-fetch exact bytes.
6. Write or update `provenance.yaml` and the run report after all receipts are known. These audit files are
   not part of `domain.md`'s self-identity unless the canonical spec explicitly models them.
7. Re-fetch the complete staged set and run
   `npm exec --prefix scripts -- tsx scripts/validate-render.ts <staged-dir> --mode <derived-or-protocol> --expected-profile persisted_draft`
   with the applicable expected identity arguments, plus deployment-specific CID/resolver checks.

Call the returned identity `domain.md CID` unless the deployment contract explicitly defines a package root.
Do not call it a folder root, claim it is byte-identical across storage systems, or claim it is anchorable
on-chain until the deployment contract verifies the CID codec, hashing, chunking, and linked-resource rules.

### Promotion

Promote a verified staging set only when the user explicitly requested that action and the live deployment
offers a safe promotion primitive. Record the before/after target identity and promotion receipt. If
promotion is not atomic, leave the verified staging set and provide controller instructions.

## Partial failure

On any failure after a successful write:

1. Stop further writes unless a narrowly scoped retry is provably idempotent.
2. Mark the run `partial` with `PARTIAL_PERSISTENCE`.
3. Record every successful and failed operation, exact target, returned identity, and re-fetch status.
4. Preserve local staged artifacts and external receipts.
5. Provide recovery options: resume with the same run ID, promote verified staging, supersede with a new
   run, or request explicit cleanup.

Do not automatically delete, overwrite, publish, hide, or roll back artifacts. A compensating action is a
new external mutation and requires authority and evidence of its result.

## State vocabulary

- `local-draft`: rendered only in local staging.
- `vfs-draft-unverified`: at least one write returned success but re-fetch/validation is incomplete.
- `vfs-draft-verified`: persisted bytes were re-fetched and both validation gates passed.
- `anchored`: controller supplied verifiable on-chain anchoring evidence for the exact `domain.md` CID.
- `public`: controller supplied verifiable disclosure evidence for specified nonsensitive files.

Never collapse these states into a generic "published" label.
