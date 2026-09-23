# Live acceptance and author rehearsal

Bind every result to the same network, recipe DID, recipe release/version, file
digest, and current card. A successful fixture or local schema pass cannot fill
an external evidence slot. Record observed/failed/pending, not guessed booleans.

| Gate | Required live evidence |
| --- | --- |
| Identity | Finalised/read-back entity of type `protocol/topic`; intended controller, parent relationship and domain workspace |
| Package | domain-author validation plus re-fetched required package files; exact domain VFS namespace |
| Shape | Real `#top-nn` ledger record, immutable file identity/version, matching bytes and hashes; valid pinned manifest/Shape and dependencies |
| Card | Full signed credential; issuer/validity verification; context and extension survive; `#dmn` resolves those bytes |
| Market preview | Image/thumbnail load, dimensions/size recorded, alt text, readable mobile crop, author-reviewed descriptive text and access terms |
| Access | Anonymous read for public; denied anonymous/wrong-scope reads and successful author plus delegated test-user read for private |
| Discovery | Domain search matches DID for title and use-case queries with exact `protocol/topic` filter; indexed summary contains no private source data |
| Import | Fetched exact release accepted by a compatible Portal adapter; no silent substitution with a built-in recipe |
| Author rehearsal | Correlated editor-render receipt, author review, actual created Draft/root ID when shared, reopen/read-back of preserved recipe and Shape pins |
| Production decision | Author accepts this exact release after feedback; final published card/index still targets rehearsed bytes; no unresolved material gate |

## Rehearsal conversation

Start from discovery as another user would. Let the author inspect what it promises,
retrieve the recipe, and create a Draft in an appropriate verified conversation
room. Check initial state, suggested terms, required inputs, role assignment,
first useful action, and completion criteria. For specialised requirements,
exercise an incomplete-input case and safe generic-client fallback as supported.
Do not perform real payments, claims, or other consequential actions merely to
test a recipe. Test adapters/simulated inputs must remain labelled and cannot
prove live effect execution.

Ask whether the resulting Draft matches the author's intent and what is confusing
or missing. Record feedback against field/behaviour and release digest. An editor
opening alone is not successful instantiation; an accepted tool request without
an observed render is not even an editor-opening receipt.

If the author declines to share the Draft, record a preview rehearsal and leave
the actual instantiation gate pending. If an importer omits Kind, resource pins,
or specialised terms, block instead of stripping them. Shared conversation tests
need an appropriate audience; private sources must not appear in shared drafts.

## Improve without rewriting history

Make author-approved changes to the local source, increment the recipe version,
allocate the next fragment, and repeat validation/access/discovery/rehearsal for
the changed release. Never rewrite the previous release or the rehearsal Topic's
accepted contract. A new card signature can change while tested Shape bytes stay
the same; recheck the signature/index binding, not unrelated Shape behaviour.

`production-ready` requires all applicable live gates and the author's decision.
A public/private recipe without paid acquisition may be ready independently of
x402. If the author requires purchase-to-access as part of launch, planned x402
is a launch blocker; never describe it as a working paid recipe.
