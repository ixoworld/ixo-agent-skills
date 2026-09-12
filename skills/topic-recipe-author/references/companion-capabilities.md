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
| Flow authoring | `list_actions`, `describe_action`, `requirements`, `validate_flow`, `create_template`, `read_flow`, `connect_steps` | Templates only. User runs/signs in Portal. Use live registry types and ports. |

## VFS namespace and authorisation are real gaps

The inspected VFS auth asks for the current user's delegation over
`ixo:filesystem` and mints a fresh short-lived invocation for `fs/read`, `fs/list`,
`fs/write`, or `fs/delete`. Tool inputs have no domain DID/resource selector.
They therefore do **not** establish access to a newly minted domain's namespace.
Writing `/domains/<did>/...` in personal Files does not change that namespace.

Require a deployed domain-scoped VFS tool/Portal adapter that resolves the selected
entity's namespace and delegated authority. Record its real schema and receipts.
If unavailable, prepare sandbox files and return `BLOCKED_DOMAIN_VFS_ADAPTER` for
domain persistence. Do not manually mint tokens, request root grants, or introduce
an ad-hoc HTTP uploader to bypass the plugin. Metadata/version/visibility receipts
and an exact-byte read are also required if the write wrapper omits them.

The shipped VFS surface consumes the user's existing delegation; it has no tool
to sell access or issue a new user's delegation. Use the controller's supported
grant UI/service for private readers, with user DID audience, exact domain
resource/file scope, read ability, expiry, caveats, and revocation checks. No
available grant path means private third-party access remains blocked, even if
the author can read. Managed VFS encryption is not end-to-end encryption.

## Registry-backed entity creation

The editor registry contains `qi/domain.card-preview` and `qi/domain.sign`.
The latter accepts `domainCardData`, explicit `entityType`, optional governance
and parent configuration, and an invocation/checkpoint identity. It creates the
entity, signs/uploads a public card, attaches it, sources domain spaces, and may
import templates. These are distinct checkpointed effects, not one atomic commit.

Its schema-type inference falls back to `dao/pod`; explicitly bind
`entityType: "protocol/topic"` and verify the Portal handler preserves it. A
string-valued port alone does not prove the underlying handler accepts this type.
Do not let the older manage-flow POD recipe's `dao` default override it.

The signing action rebuilds the credential envelope with `buildVerifiableCredential`
before signing and always uploads the card publicly. It may discard a custom
top-level context/schema. Verify preservation before using it for the final
recipe card; use a compatible controller signing route when it cannot preserve
the proposed profile. A restricted card must not use that public upload route.
Do not patch signed JSON after signing. Adding `#top-nn` requires a supported
linked-resource action/handler; domain.sign's built-in `#dmn` attachment does not
automatically register the Shape.

## Optional publication Flow

Use the runtime's Flow tools when useful; use manage-flow only with its compatible
editor surface. Discover each action and its requirements first. A possible
dependency graph is:

```text
review bootstrap -> create entity -> domain documents and release upload
  -> access verification -> review final card -> sign and anchor
  -> index verification -> author rehearsal -> production decision
```

Only turn a stage into a Flow action when a registry entry and its executor exist.
Keep unavailable operations as explicit human/controller handoffs with evidence
requirements. Do not invent `qi/topic.publish`, an upload action, or an x402 action.
Use `requirements` to expose unresolved inputs. Configure forms with
`set_form_schema`; connect real outputs to inputs using `connect_steps`.
Preserve existing IDs on edits. Validate, author under the runtime's plan-review
rules, and read back. A created template is not an executed publishing workflow.
Keep consequential review/publication human-only unless a separately authorised
Flow runtime explicitly supports delegated execution. Carry run, release, and
operation identities through each real action; never restart a partial mint as a
new invocation. The runtime Flow builder cannot execute these steps itself.

## Topic importer compatibility

The inspected compose-topic source pins a candidate `1.0.0-rc.4` contract with
nine Kinds. `task -> project`, `agent_task -> flow`, and `question -> research`
are Base Recipe mappings. That candidate Recipe schema admits only five built-in
codes and the skill explicitly does not search a marketplace. Do not claim
arbitrary authored recipes work through it today. Require a compatible live
importer/schema/resolver preserving the external recipe pin, then use compose-topic
for room resolution and honest Draft composition. Otherwise return
`BLOCKED_RECIPE_IMPORT_ADAPTER` with the published/staged artifacts retained.
