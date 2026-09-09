# Refine an existing Topic

Refinement changes a v4 Topic in place. It never creates a replacement Topic unless the person explicitly chooses to branch.

## Preconditions

Require:

- root/body/state version `4`;
- profile `qi.topic-contract-state/v4`;
- stable Topic ID;
- exact Topic revision;
- exact contract revision;
- exact body hash;
- exact activation-policy digest;
- exact Effective Shape digest;
- private edit-session ID; and
- current accepted/proposed contract heads.

If any version is legacy, return `BLOCKED_LEGACY_TOPIC`. If a revision or digest changed, return `BLOCKED_STALE_REVISION` and rebase visibly.

## Staged loop

1. Load the exact v4 body and Shape pins.
2. Identify changed semantic paths.
3. Preserve unchanged IDs and provenance.
4. Mark generated changes `suggested/proposed`.
5. Produce a `TopicRefineChangeSet`.
6. Let the person accept, edit, or reject.
7. Revalidate against the current revisions and Shape digest.
8. Stage `update-contract`; setup confirmation remains a separate authorised transition.

Answer a question with `answer-question` and its stable statement ID. Preserve the question statement.

Changing Kind or Topic Recipe requires resolving a new Effective Shape and digest before staging. Never carry an inherited pinned Shape across a Kind/Base Recipe mismatch.

Changing effective setup creates a new proposed immutable revision and invalidates confirmations for that proposal. The previous effective head remains in force until the replacement is explicitly confirmed and becomes effective.

Do not persist the private edit-session ID, personal-agent session data, viewer attention, or cache facts into shared Matrix state.

## Preserve an existing release

Keep the existing Shape sources and digest during refinement, including rc.3 pins. The bundled [rc.3 Shape pins](topic-shape-pins-rc3.json) provide compatibility references. Opening an editor does not upgrade the protocol release. An explicit upgrade proposes a new setup with rc.4 pins and explains new obligations. It requires fresh confirmation and assent, and it resets revision-bound work and Project progress.

## Incomplete refinement preview

When the current body, revision pins, edit-session ID, reviewer, or authority is unresolved, return `TopicRefinePreview` instead of inventing a ready-to-stage change set. Retain verbatim source intent, explicitly proposed changes, assumptions, and every unresolved obligation. A preview does not stage an edit. After the host reads the complete current body, merge text while preserving existing requirements, resolve assignments explicitly, recheck all heads, and then construct the normal bound change set. Owner does not imply answer reviewer.
