# Publication and recovery

## Order and authority

1. Prepare the complete local preview and verify that all necessary runtime paths
   exist. Resolve the network, controller, and exact `protocol/topic` operation.
2. Execute the authorised entity/domain creation through Portal, with human
   signing. Capture transaction, real DID, domain spaces, and checkpoint results.
   If bootstrap card publication is bundled, expose that to the author beforehand.
3. Obtain delegated write authority for the **new entity's** VFS namespace. Do
   not assume a parent domain or personal Files grant extends to it.
4. Render domain-author's package with real identifiers. Finalise recipe/Shape
   bytes, image, and public allowlist. Write fresh immutable paths under a release
   directory; persist domain.md after its companion references are resolved.
5. Verify each file's namespace, ID, version, MIME, exact bytes, and intended
   visibility. Default new working files private, inspect inherited public folder
   state, and never place private material under a public ancestor. Use explicit
   per-file public settings. Retain receipts on any partial failure.
6. Anchor the Shape and domain documents with controller authority, then compile
   and validate the final card from the verified bindings. Secure, upload, and
   anchor `#dmn` using a compatible route; never mutate the credential afterward.
7. Observe indexing through the actual domain-indexer service. If an authorised
   ingestion endpoint exists, use it; otherwise await the documented automatic
   index process. Do not invent a registry write API: the read-only search plugin
   does not submit cards. Verify both exact-DID resolution and search discovery.
8. Rehearse the candidate release with the author. Apply improvements as a new
   immutable version, rerun affected checks, then obtain the author's decision
   for production. Reissue the card if publication status changes, update its
   anchor, and verify the final live entry still resolves the rehearsed bytes.

## Privacy and UCAN acceptance

For a public release, test anonymous fetch of every required public document and
asset. Compare Shape and manifest bytes with the approved hashes. Avoid invoking
an authenticated browser session as the only evidence of public access.

For a private release, test the author's authorised fetch and an unauthorised
request with no credentials; neither an anonymous response nor an expired,
revoked, wrong-audience, or wrong-resource grant may disclose bytes. Use a test
user authorised by the author to validate an independently delegated reader. Do
not alter the author's live grant to test revocation; create bounded disposable
test grants through the supported controller service. With no test principal or
grant facility, mark that acceptance gate pending. Anonymous private access must
be denied, and public summaries/embeddings must not expose the private body.

Check actual ACL/visibility state in addition to a denied HTTP fetch; transport
errors and missing files are not evidence of correct gating. Verify the reader
can resolve a specific release after authorisation without widening scope to the
entire namespace. Public ledger metadata cannot conceal that a recipe exists.

## Retry rules

Use one stable run ID plus distinct operation IDs per intended effect. After a
timeout, query transaction/checkpoint/file state first. Reuse a completed entity
DID, file receipt, or invocation; do not create a duplicate because a UI timed out.
If there is no queryable result and retry is not demonstrably idempotent, return
`PARTIAL_PUBLICATION_UNCERTAIN` and the exact recovery action.

Never overwrite released `#top-nn` bytes. New content means a new version, new
resource fragment, new hashes, new approval, and a new rehearsal. Preserve old
pins for existing Topics. Updating the current card requires the host's safe
version/compare-and-set or recoverable update contract.

Indexer polling is read-only and bounded: follow any returned Retry-After, or
make up to three observations with increasing delay within the active session.
Then report `PENDING_INDEXING` with receipt, DID, query, and next check. Schedule
continued monitoring only when the user requested it and a scheduler is available.
Index lag never justifies republishing or recreating the entity.

Stop on failed authorisation and surface the runtime's scoped grant request.
Do not fall back from UCAN-gated to public. Do not delete partial public files or
chain resources automatically. Cleanup, withdrawal, and compensating actions
have their own authority and receipts; never claim rollback without evidence.

## Useful result states

Report the highest verified state plus all active blockers:
`draft`, `validated-local`, `entity-created`, `persisted-verified`,
`anchored-candidate`, `pending-indexing`, `indexed-candidate`, `rehearsed`,
`production-ready`, or `partial`.

Use specific blockers: `BLOCKED_ENTITY_TYPE`, `BLOCKED_DOMAIN_VFS_ADAPTER`,
`BLOCKED_VFS_RECEIPTS`, `BLOCKED_PRIVATE_DELEGATION`, `BLOCKED_CARD_PRESERVATION`,
`BLOCKED_LINKED_RESOURCE_ACTION`, `BLOCKED_RECIPE_IMPORT_ADAPTER`,
`BLOCKED_PROFILE_COMPATIBILITY`, or `BLOCKED_AUTHORITY`. Missing evidence should
stay visible alongside completed work rather than erasing successful receipts.
