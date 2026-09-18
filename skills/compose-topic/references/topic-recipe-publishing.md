# Publishing a Topic as a recipe

A recipe is a Topic Draft that other people can instantiate: the same rules
(Shape overlay) and the same starting text (brief), pinned by version and
digest on a `protocol/topic` domain. Compose the Topic first, exactly as for a
normal Draft; publishing is an extra exit, not a different skill.

The Portal owns every write. Three browser tools exist only while a Portal
conversation is connected; each returns at once and the outcome arrives as the
next Portal chat message. Never re-call a tool while its result is pending,
never poll, never ask whether the person signed.

## The file the Portal accepts: `shape.json`

One JSON object of type `TopicRecipeV1` (see
[topic-shape-pins.json](topic-shape-pins.json) for the built-in five and the
protocol artifact in [source-lock.json](source-lock.json)), plus a `draft`
block the Portal copies into the Topic Draft. Both halves are pinned under one
digest, so a change to either is a new version.

```json
{
  "version": 1,
  "code": "fps-game-build",
  "id": "did:ixo:entity:<recipe-domain-did>",
  "recipeVersion": "1.0.0",
  "label": "FPS Game Build",
  "description": "Take a first-person shooter from concept to a playable vertical slice.",
  "baseRecipe": "project",
  "creates": "draft",
  "shape": {
    "version": 1,
    "code": "recipe/fps-game-build",
    "axes": [ /* only axes the protocol already defines */ ],
    "transitions": [ /* only transitions with commands the Portal already handles */ ],
    "progressRules": [],
    "inferredRecordPolicy": { "autoAccept": [], "neverAutoAccept": [] }
  },
  "draft": {
    "intent": "…",
    "outcome": "…",
    "definitionOfDone": ["…", "…"],
    "questions": ["…"],
    "milestones": [{ "name": "…", "evidenceRequired": ["…"] }],
    "childWork": [{ "title": "…", "kind": "task" }]
  }
}
```

The `draft` block is what the Portal copies into the Topic Draft: `intent`, `outcome`, `definitionOfDone` (string or list), `questions`, `scopeIncluded`, `scopeExcluded`, `constraints`, `assumptions`, and for Kind `project` the plan: `milestones` (name, optional evidence required to pass it) and `childWork` (title, optional child Kind from `task`, `agent_task`, `proposal`, `evaluation`, `claims`, `incident`, `question`, `discussion`). Never put people, dates, rooms or records in it: every instance gets its own.

Rules the Portal enforces before it lets the person sign:

- `id` is the recipe domain DID, exactly as `propose_domain_creation` reported it. Not the `#top-nn` resource, not a URL.
- `recipeVersion` equals the `version` passed to `publish_recipe_release`. A changed file is a new version and a new `#top-nn`.
- `baseRecipe` matches the Kind the recipe is for (`task`/`project` → `project`, `question` → `research`, `agent_task` → `flow`, otherwise the Kind's own name).
- `shape` is an overlay: it lists only what it adds or replaces. The resolver merges it over the base recipe by `code`, then applies the Kind overlay.
- The merged Shape must resolve: every transition has a full `presentation`, exactly one transition carries `completesTopic: true` (the base provides it; do not add another), every gate names a real axis and state.
- A `project` block (entry points, allowed child Kinds, close evidence) is accepted only for Kind `project`.
- A file without a `shape` block is a brief. The Portal can still show its text but refuses to publish it as a recipe.

## What an overlay may use

The Portal renders nothing new for a recipe. Build from these parts only; anything else has no handler, no phase, or no translation.

| Part | Allowed values |
| --- | --- |
| Axes | `contract`, `work`, `topic` (always present in the base); add `verification`, `decision`, `effect`, `settlement` |
| Phases | `forming`, `working`, `verifying`, `deciding`, `effecting`, `settling`, `complete`, `dormant` |
| Transition commands | `topic.edit-setup`, `topic.confirm-setup`, `topic.record-assent`, `topic.raise-dispute`, `topic.resolve-dispute`, `topic.start-work`, `topic.answer-question`, `topic.change-due-date`, `topic.unblock`, `topic.record-outcome`, `topic.complete`, `topic.close-project`, `topic.request-action`, `topic.confirm-action`, `topic.record-verification`, `topic.record-decision`, `topic.record-settlement` |
| Gates | `axis` (another axis in given states), `field` / `field-any` (paths present or accepted), `record` (a record type in the thread), `receipt`, `binding` (a bound flow), `condition` |
| Confirmation | `none`, `viewer`, `authority` |
| Evidence | `operation`, `record` (with `finality`), `receipt` |
| Presentation keys | the built-in `topic.action.<transition-code>.label|prompt|purpose|unlocks` keys; copy the whole `presentation` block from a built-in transition |

The safe way to add a stage is to copy its axis and transition verbatim from a built-in recipe (`record-verification` from `blueprint-design`, `record-decision`, `request-action`, `confirm-action` from `agent-delivery`, `record-settlement` from `verified-work-payment`) and then change only `gates`, `assignedTo`, `confirmation` or `presentation.priority`.

What a recipe cannot do: invent an axis, a command, a role name, a record type, a phase or a locale key; change the base transitions' codes; add a second completing transition.

## Validate before you write

Run the bundled checker on the exact bytes you intend to upload:

```bash
node scripts/validate-recipe.mjs /workspace/recipe/shape.json --did <recipe-domain-did> --version 1.0.0 --kind project
```

It resolves the merged Shape with the pinned protocol artifact and prints the canonical `topicRecipeRef` the Portal will pin on Topics, the sha256 of the bytes the chain will anchor, and the resolved sources. Fix every error; the Portal runs the same resolution and refuses a file it cannot resolve.

## Publish through the Portal, in this order

1. `propose_domain_creation({ requestKey, name, description, entityType: "protocol/topic", tags?, purpose?, image? })`. Skip when the person attached or named an existing `protocol/topic` domain they control. Outcome message: `Domain "<name>" created: <DID> …` or `… cancelled.` Use that DID as the recipe `id`; write the file only now, because the id is part of the bytes.
2. `write_domain_files({ requestKey, entityDid, public, files: [{ path, content, mimeType }] })` with `shape.json` (and any companion files) under `/recipes/<slug>/<version>/`. Outcome message carries one receipt per file: `fileId`, `version`, `digest`, `publicUrl`. An existing path is reported, not replaced: use a new version folder rather than `overwrite`.
3. `publish_recipe_release({ requestKey, entityDid, recipe: { version, protocolVersion, baseKind, baseRecipe, listingVisibility }, shape: { fileId, path, version, digest, mediaType, publicUrl? }, access })` with the `shape.json` receipt verbatim. The Portal downloads the file, checks the bytes against `digest`, resolves it as a recipe for `baseKind`, then asks for two signatures: the Domain Card re-issued with a `topicRecipe` block, and the `#top-nn` linked resource whose proof is the byte digest. Outcome message: `Recipe release "<requestKey>" published … Shape anchored as <DID>#top-nn …`, `… declined`, or `… failed (card_failed | shape_failed)`. A `card_failed` whose message names the file means the file, not the signature: fix the file, write a new version, release again.

After step 3 the recipe is discoverable: the Portal's Settings → Topics lists it under "Published recipe", the shelf pins it, and a Topic created from it carries `topicRecipeRef: { id: <DID>, version, digest }` where `digest` is the canonical Shape digest the checker printed, not the byte digest.

## Publishing from an existing Topic

When the person says "save this Topic as a recipe", read the Topic once, take its Kind, Base Recipe, optional pinned recipe overlay and its contract text (intent, outcome, definition of done, open questions) as the brief, strip everything personal (owners, assignees, dates, room, records), and continue from step 1. The Topic itself is not modified.
