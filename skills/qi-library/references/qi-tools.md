# Qi file tool contract

Use this mapping after inspecting the live tool schemas. It describes the
QiForge Workers implementation pinned in `source-lock.json`; it does not
declare new tools or guarantee that a particular deployment has enabled them.
The `vfs` plugin requires an agent signing key and a valid user delegation.
Sandbox bridges additionally require the sandbox integration.

Contents: verified inputs; path and identity rules; access boundaries;
capabilities requiring discovery; examples.

## Verified inputs

Question marks below mean optional arguments, not literal parameter names.
All VFS paths are absolute within the selected namespace, not host paths.

| Tool | Arguments | Use / result |
| --- | --- | --- |
| `vfs_search` | `q`, `path?` | Concepts in indexed contents. Returns paths and sometimes line ranges; reports lexical fallback. |
| `vfs_grep` | `q`, `path?` | Literal words/identifiers in files; not a regex contract. |
| `vfs_glob` | `pattern` | Names/paths, e.g. `/notes/*.md`; returns matching paths. |
| `vfs_list` | `path?` | Direct children of a folder; defaults to `/`. |
| `vfs_read` | `path`, `offset?`, `limit?` | Text windows or model transcription of supported binaries; inspect continuation/stub output. |
| `vfs_write` | `path`, `content`, `mimeType?`, `overwrite?` | Creates text; overwrite defaults false. Replacement resolves the existing file ID internally. |
| `vfs_edit` | `path`, `oldString`, `newString`, `replaceAll?` | Exact unique string replacement by default. |
| `vfs_move` | `from`, `to` | Move/rename a resolved file within the active namespace. |
| `vfs_delete` | `paths` | Trash up to 1,000 supplied file paths; results can be partial. |
| `vfs_share` | `path`, `public?` | Anyone-with-link publication; `public` defaults true. Always pass it explicitly. |
| `vfs_to_sandbox` | `vfsPath`, `sandboxPath`, `deleteSource?` | Copy bytes into `/workspace/data/`; default keeps the Library source. |
| `sandbox_to_vfs` | `sandboxPath`, `vfsPath`, `overwrite?`, `deleteSource?` | Save generated/edited bytes; defaults keep source and reject collisions. |

Search queries and glob patterns are capped at 512 characters in this snapshot.
Read offsets start at 1; the default read window is configured by the runtime
(2,000 lines by default), with a 5,000-line upper bound in the handler.
Use the exact continuation offset returned in the text footer. No cursor or
limit argument is exposed on the search, glob, or list tools: never invent one
or claim their returned set is exhaustive.

## Path and identity rules

- Reject empty paths, paths longer than 1,024 characters, NUL, `//`, trailing
  slash except `/`, and `.` or `..` segments. Reject root as a file target.
- Use patterns only for discovery. The pinned client also resolves file paths
  through glob and selects the first match. Paths containing glob syntax such
  as `*`, `?`, `[]` or `{}` cannot be assumed literal. Do not read or mutate an
  ambiguous target through that resolver; use a verified literal/ID-addressed
  capability or ask for a Portal rename. Do not invent escaping semantics.
- Reuse a resolved namespace and exact path. An ID, a mutable path, a content
  CID, a version, and a public link are different coordinates.
- In the pinned bridge, `sandbox_to_vfs` labels `created.id` as `cid` in its
  JSON receipt. Treat that field as an opaque file identifier, not a verified
  IPFS CID. Obtain a real content CID from a capability that explicitly returns
  and identifies one before using it as immutable evidence.
- The current read/write tool responses discard much of the underlying
  metadata, including versions. Never synthesize that missing metadata.

## Access and namespace boundaries

QiForge's pinned auth helper obtains the user's delegation for
`ixo:filesystem`, then attenuates requests to the granted resource. Its tool
schemas expose no `entityDid`, namespace switch, CID read, or grant-management
argument. A Portal Library also supports entity namespaces, but that is a
separate client capability. Do not prefix a domain DID to a file path as a
substitute for verified entity access.

Use the active runtime's authority resolution; do not implement UCAN signing,
fetch credentials, or call raw HTTP routes from this skill to fill tool gaps.
For denied access, relay the returned Portal Access steps with the actual agent
DID if supplied, narrowed to the required rights, folder and duration.

## Capabilities that must be discovered separately

| Feature | Status in pinned Qi agent tools | Required behavior |
| --- | --- | --- |
| Expected-version / ETag writes | Not exposed; internal 409 retry is not an agent-visible precondition. | Avoid unsafe concurrent whole-file overwrites; stage a separate draft. |
| Version list/read/restore | Not exposed. | State the gap; use a verified owning capability or request a historical export. |
| Trash listing/restore/purge | Not exposed to the agent; Portal has trash operations. | Hand off to Portal or a newly discovered authorized tool. |
| Private recipient grants/revocation | Not exposed by `vfs_share`. | Use verified Access controls; never substitute public publication. |
| Folder creation, recursive moves/deletion | No dedicated agent primitive. Move/delete descriptions mention folders, but handlers resolve file IDs through glob. | Do not assume recursive semantics; require verified support and exact scope. |
| Entity Library selection | Present in Portal, absent in the pinned agent schema. | Establish a correctly scoped runtime capability first. |
| CID / exact-version read | Not exposed in this agent surface. | Do not substitute latest-path bytes for a pinned reference. |
| Resumable large-file upload | Portal has a transport; these bridge tools buffer files. | Respect live size limits; do not promise resumability or invent chunk/finalize calls. |

## Examples

The following are tool argument objects, not host API calls. Use them only if
the corresponding tool is exposed and the paths are authorized and resolved.

`vfs_glob`:

```json
{"pattern":"/PathGen/briefs/*.md"}
```

`vfs_read`:

```json
{"path":"/PathGen/briefs/surveillance.md","offset":1,"limit":120}
```

`vfs_edit` after reading the exact text:

```json
{"path":"/notes/launch.md","oldString":"Status: Draft","newString":"Status: Ready for review","replaceAll":false}
```

`vfs_to_sandbox`:

```json
{"vfsPath":"/models/youth-payments.xlsx","sandboxPath":"/workspace/data/library-input/youth-payments.xlsx","deleteSource":false}
```

`sandbox_to_vfs`:

```json
{"sandboxPath":"/workspace/data/library-output/youth-payments.xlsx","vfsPath":"/models/youth-payments.xlsx","overwrite":true,"deleteSource":false}
```

The last example requires an authorized replacement and the concurrency check
in `SKILL.md`; otherwise save a disclosed separate draft with overwrite false.
