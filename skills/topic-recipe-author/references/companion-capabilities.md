# Companion capability bindings

Source inspection: Companion `abf051d70706b814f95a7996a9c884bf0ee14f84`,
`@ixo/oracle-runtime@1.93.0`, and its `@ixo/editor@6.0.1` dependency. Exact
provenance and local profile hashes are in [source-lock.json](source-lock.json).
Load current schemas before invoking a tool; no source snapshot proves deployment.

## Tools that exist in the inspected runtime

| Need | Plugin/tool | Binding and limitation |
| --- | --- | --- |
| Capability discovery | `list_capabilities`, `load_capability({names:[...]})` | Load available `vfs`, `sandbox`, `flows`, `domain-indexer`, `skills` as needed; avoid repeated loads. |
| Read supplied documents | `vfs_search`, `vfs_read({path,offset?,limit?})` | Read is line-windowed; PDF/image output may be transcribed. Not an exact-byte integrity read. |
| Text persistence | `vfs_write({path,content,mimeType?,overwrite?})` | New path by default. Returns prose, not a complete file/version/namespace receipt. |
| Binary transfer | `sandbox_to_vfs({sandboxPath,vfsPath,overwrite?,deleteSource?})` | Needs sandbox configuration. Keep overwrite/delete false. Its output field `cid` is populated with `created.id`; treat as a file ID until codec evidence proves a CID. |
| Byte retrieval into sandbox | `vfs_to_sandbox({vfsPath,sandboxPath,deleteSource?})` | Destination under `/workspace/data/`; copy, then hash exact bytes. Same namespace limitation as other VFS tools. |
| Visibility | `vfs_share({path,public:true|false})` | Defaults to true if omitted: always send the boolean. Publishing a folder may expose descendants. Use exact release files, never an authoring folder. |
| Domain search | `domain_indexer_search` | Use nonempty `query`, `scopes:"domain_cards"`, `filters:{"dc.entity_type":"protocol/topic"}`. Compound types are exact strings. |
| Domain summary | `get_domain_card({did})` | Intentionally strips fields to summary/name/type/FAQ. It cannot verify the complete secured card or recipe extension. |
| Portal interaction | `portal` request tools | Browser supplies descriptors each turn. No connected Portal means no browser tools. Names from another session are not callable proof. |
| Domain file persistence | `write_domain_files({requestKey,entityDid,public,overwrite?,files:[{path,content,mimeType}]})` | Portal browser tool. Parks the batch behind one approval card and returns `{status:"awaiting_approval"}` immediately. On approval the Portal writes each file into `ixo:filesystem/<entityDid>` with the author's key (controller check on-chain), reads it back, and sends a chat message with one receipt per file: `written, fileId, version, digest, publicUrl` or `NOT written (exists / permission_denied / not_found / verification_failed)`. Up to 12 text files, 512 KB each, 1 MB total; binaries not yet. Never re-call while pending. |
| Entity creation | `propose_domain_creation({requestKey,name,description,entityType,tags?,purpose?,image?})` | Portal browser tool. Opens the Create Domain form pre-filled; the author reviews and signs entity + public card. Returns `{status:"proposed"}` immediately; the decision arrives later as a Portal chat message (`Domain "<name>" created: <DID> …` / `… cancelled.`, with `metadata.domainProposal`). Never re-call or poll. `entityType` is written to chain as passed. |
| Flow authoring | `list_actions`, `describe_action`, `requirements`, `validate_flow`, `create_template`, `read_flow`, `connect_steps` | Templates only. User runs/signs in Portal. Use live registry types and ports. |

## Domain files go through the Portal, not the vfs plugin

The runtime's `vfs_*` tools mint invocations from the user's delegation over
`ixo:filesystem`, the personal namespace; their inputs have no domain DID or
resource selector, so they cannot reach a domain's namespace, and a grant made
to the agent in the Portal does not change that. Writing `/domains/<did>/...`
in personal Files is not the domain namespace either.

`write_domain_files` is the domain-scoped adapter: it is a Portal browser
tool, so it exists only while a Portal conversation is connected. Every write
is gated by the author's click on one approval card per batch, and the Portal
performs it with the author's own key after the VFS worker confirms they
control the domain. The receipts (fileId, version, byte digest of the
read-back, public URL) arrive as the next chat message and are the domain
receipts. If the tool is absent, prepare sandbox files and return
`BLOCKED_DOMAIN_VFS_ADAPTER`; do not mint tokens, request root grants, or
introduce an ad-hoc uploader.

The shipped VFS surface consumes the user's existing delegation; it has no tool
to sell access or issue a new user's delegation. Use the controller's supported
grant UI/service for private readers, with user DID audience, exact domain
resource/file scope, read ability, expiry, caveats, and revocation checks. No
available grant path means private third-party access remains blocked, even if
the author can read. Managed VFS encryption is not end-to-end encryption.

## Entity creation through the Portal

`propose_domain_creation` is the only supported route. It is a Portal browser
tool, so it exists only while a Portal conversation is connected. The Portal
creates the entity with the author's wallet (`MsgCreateEntity`, type exactly as
passed), provisions the domain's Matrix space, then builds the public Domain
Card from name, description, tags, purpose and image, uploads it, and attaches
it as `#dmn` (`MsgAddLinkedResource`). Each transaction is a separate PIN
confirmation and takes the author minutes, longer than the runtime keeps a
browser tool call open, so the tool returns `{status:"proposed"}` at once and
the Portal reports the decision as the next chat message. Treat that message
as the tool result; never re-call the tool while it is pending.

The bootstrap card carries only the fields above. It does not carry
`topicRecipe`, `#top-nn`, or a custom context; those are added in step 5 through
the card-update route. Adding `#top-nn` still requires a supported
linked-resource action/handler; the bootstrap `#dmn` attachment does not register
the Shape.

The editor registry also contains `qi/domain.card-preview` and `qi/domain.sign`
(flow actions that a person runs from a flow template). They are not a fallback
for this skill: they default to `dao/pod`, require the author to open and run a
template by hand, and rebuild the credential envelope before signing. If
`propose_domain_creation` is absent, report `BLOCKED_DOMAIN_CREATION_TOOL` and
continue with independent authoring.

## Topic importer compatibility

The inspected compose-topic source pins a candidate `1.0.0-rc.4` contract with
nine Kinds. `task -> project`, `agent_task -> flow`, and `question -> research`
are Base Recipe mappings. That candidate Recipe schema admits only five built-in
codes and the skill explicitly does not search a marketplace. Do not claim
arbitrary authored recipes work through it today. Require a compatible live
importer/schema/resolver preserving the external recipe pin, then use compose-topic
for room resolution and honest Draft composition. Otherwise return
`BLOCKED_RECIPE_IMPORT_ADAPTER` with the published/staged artifacts retained.
