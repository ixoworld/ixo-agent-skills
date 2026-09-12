# Release contract

Keep these identities separate: recipe entity DID; recipe version; resource
fragment; VFS file ID/version; byte digest; protocol-resolved Effective Shape
digest; card credential ID; rehearsal Topic ID. None substitutes for another.

## Card profile

Use [topic-recipe-domain-card.schema.json](topic-recipe-domain-card.schema.json),
an additive proposed Domain Card profile, version `1.1.0-proposed`. It evolves
the earlier `1.0.0-proposed` Topic Protocol proposal by including `project` and
enforcing the current pinned Kind/Base Recipe mapping. It is not a deployed
registry standard. Resolve an approved replacement if the target deployment uses
one; update and review the source lock/checker before claiming support for it.

Retain the original VC/IXO contexts and local mappings; append the protected
`topicRecipe` JSON literal term. Ordinary domain readers retain name, purpose,
function, keywords, images, offers, and `relatedDocument`. RDF processors see
the extension as an explicit JSON literal. Validate actual context expansion and
signing; a JSON parse/schema pass does not prove a secured credential.

Start from [public-card.example.json](../assets/public-card.example.json) or
[private-card.example.json](../assets/private-card.example.json). These unsigned
Draft examples contain illustrative DIDs, endpoints, file IDs, and all-zero
digests. They demonstrate field structure only; replace every binding with
observed values before publication. They do not represent a deployed recipe.

Card ID is `<recipe-did>#dmn`; subject ID is `<recipe-did>`, subject type includes
`ixo:protocol/topic`; `topicRecipe.entityType` is exactly `protocol/topic`.
`shapeResource.id` and one `relatedDocument.id` equal `<recipe-did>#top-01`.
Later immutable releases use `#top-02`, etc.; never repoint one to changed bytes.
Record exact recipe and protocol versions, Kind/Base Recipe, VFS tuple, and
`sha256:<hex>` of the uploaded Shape bytes. Shape version names the recipe
release containing it. Keep the semantic Effective Shape digest separate.

The `#top-nn` resource holds the actual Shape JSON accepted by the pinned resolver.
Keep `recipe.json` as its protocol-valid companion manifest, referencing or
embedding that same Shape according to the selected protocol contract. Publish
its locator and pin through the protocol's supported recipe reference mechanism;
do not turn the card extension into a competing Topic Recipe wire format. The
candidate schema embeds `recipe.shape`; its parsed value must equal shape.json.
Custom external manifests require an approved compatible schema/import adapter.

`publication` tracks recipe draft/published/deprecated/withdrawn, not a Topic
lifecycle. Public listing and private file access are independent. For a marketed
private recipe, publish only an approved public teaser card. Use
`shapeResource.access.mode: "ucan"` with the real delegation authority/request
endpoint, and `paywall: null` or `{protocol:"x402",status:"planned"}`. No token
belongs in these fields. Paid acquisition is unavailable until implemented;
existing valid grants can still authorise reads. The public alternative uses
`mode: "public", paywall: null`.

## Ledger projection

Use actual IXO `linkedResource` fields, not the card extension as a chain payload:

```json
{
  "type": "topicShape",
  "id": "<recipe-did>#top-01",
  "description": "<approved release description>",
  "mediaType": "application/json",
  "serviceEndpoint": "<verified public or authenticated VFS endpoint>",
  "proof": "<64 lowercase SHA-256 hex characters>",
  "encrypted": "false",
  "right": "<verified private access-policy DID URL, or empty for public>"
}
```

This is a field guide, not a submit-ready transaction. `encrypted` is a string
in the chain contract. Here `proof` is the hash of exact plaintext UTF-8 file
bytes after HTTP content decoding; it is not a signature. Protected VFS access
and managed at-rest encryption do not require `encrypted:"true"`. Do not support
application-encrypted Shape ciphertext without an explicit decryption/hash
profile. `right` references a separately configured access policy; it grants
nothing by itself. Re-fetch the actual ledger record after controller submission.

## Local bundle and resumable report

Stage five files for the offline checker:

- `card.json`: final unsigned or secured profile card, with real resolved IDs.
- `shape.json`: exact JSON bytes to upload under `#top-nn`.
- `recipe.json`: protocol-valid recipe manifest containing the same Shape.
- `ledger.json`: `{entity:{id,type},linkedResource:[...]}` projection, not a tx.
- `release.json`: `{entityDid,recipeVersion,protocolVersion,baseKind,baseRecipe,
  resourceId,shapeDigest,recipeDigest,vfs:{provider,resource,fileId,version}}`.

`release.shapeDigest` is the file-byte hash. `recipeDigest` hashes recipe.json
bytes; neither file embeds its own byte hash. Domain.md validation and its
document receipts remain in the domain-author package. Run its validator too.
Run full JSON Schema validation for the card and selected Recipe/Shape separately;
the dependency-free bundle checker only enforces local integrity and bindings.

Keep an additional private run report with author/source choices, capability
evidence, approved file allowlist, access policy, actions/checkpoint IDs, receipts,
index observations, rehearsal results, and unresolved blockers. Evidence records
bind network, entity DID, release version/digest, actor, operation, result,
observation time, and redacted receipt reference. Record only returned identities.
Do not include secrets or fabricated successful evidence. Hash approval content
and bind it to the reviewed access policy so changes invalidate approval.
