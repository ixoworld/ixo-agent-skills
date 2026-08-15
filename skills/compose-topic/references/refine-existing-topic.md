# Refine an existing Topic

Use this branch when the host supplies a Topic ID or edit-session ID, or when the person asks to apply, make, or save changes proposed earlier in the same Topic conversation.

## Refinement loop

1. Inventory `read_topic` and `stage_topic_changes`. Existing identity selects refinement; creation is a separate user intent.
2. Read through `editSessionId` when present so unsaved form data is authoritative. Otherwise read through `topicId`.
3. Bind suggestions to the returned Topic ID, state revision, body hash, stable entry IDs, and edit session.
4. Return [the refine change-set schema](../schemas/topic-refine-change-set.schema.json). Keep provider-private session identity host-local.
5. When the person says to make or apply the proposed changes, pass that same change set to `stage_topic_changes`. Staging reopens the same editor and writes no Topic state.
6. The person reviews the staged diff and uses the Portal Save action. The host verifies revision, hash, authority, schema, and append-only operation semantics before writing.

Completion means the change set is either staged in the matching edit session or a precise blocked/conflict result is returned. A tool error is not permission to switch to creation.

## Semantic edits

- Change a scalar through its allowed semantic path.
- Answer a question with `answer-question` and the existing question statement ID. Preserve the statement and set its answer/status separately.
- Preserve unsupported body fields and stable IDs. Send changed paths, not a reconstructed replacement contract.
- Generated values remain suggested until the person stages, edits, or saves them through the host UI.

## Follow-up routing

| Person says                             | Action                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| “Suggest/refine this”                   | Return a revision-bound change set.                                                               |
| “Make/apply those changes”              | Stage the same change set in the same edit session.                                               |
| “Save/update the Topic”                 | Stage the exact diff and direct the person to the host confirmation; the skill performs no write. |
| “Create a separate Topic instead”       | Re-enter normal creation routing with the existing Topic recorded as context.                     |
| Required read/stage tool is unavailable | Return `BLOCKED_HOST_CAPABILITY` and name the missing tool.                                       |
| Revision or body hash changed           | Return `STALE_TOPIC_REVISION`; reread and rebase before staging.                                  |

An existing Topic context makes `propose_topic` inapplicable. Duplicate detection is a creation safeguard, not an update mechanism.
