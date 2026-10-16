# Publishing a Topic as a recipe

A recipe is a Topic Draft that other people can instantiate: the same rules
(Shape overlay) and the same starting text (brief), pinned by version and
digest on a `protocol/topic` domain. Compose the Topic first, exactly as for a
normal Draft; publishing is an extra exit, not a different skill.

The Portal owns every write. Three browser tools exist only while a Portal
conversation is connected; each returns at once and the outcome arrives as the
next Portal chat message. Never re-call a tool while its result is pending,
never poll, never ask whether the person signed. Only these three wait for the
person, so end your turn after each of them; reads such as
`resolve_published_recipe` answer in the same turn, so keep going after them.

A `protocol/topic` domain publishes one recipe and its versions: the domain
card carries a single `topicRecipe` block, and the recipe `id` is the domain
DID. A different recipe needs its own domain, named exactly like the recipe,
because lists show the card's name as the recipe title. A new version of the
same recipe goes to the same domain.

## The file the Portal accepts: `shape.json`

One JSON object of type `TopicRecipeV1` (the protocol artifact in
[source-lock.json](source-lock.json) defines the type), plus a `draft`
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
    "axes": [ /* empty unless the person asks for an extra step; then only axes the protocol already defines */ ],
    "transitions": [ /* empty unless the person asks for an extra step; then only commands the Portal already handles */ ],
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

The `draft` block is what the Portal copies into the Topic Draft: `intent`, `outcome`, `definitionOfDone` (string or list), `questions`, `scopeIncluded`, `scopeExcluded`, `constraints`, `assumptions`, and for Kind `project` the plan: `milestones` (name, optional evidence required to pass it) and `childWork` (title, optional child Kind from `task`, `agent_task`, `proposal`, `evaluation`, `claims`, `incident`, `question`, `discussion`). Leave `milestones` and `childWork` out for every other Kind: the Portal drops them. Never put people, dates, rooms or records in it: every instance gets its own.

Rules the Portal enforces before it lets the person sign:

- `id` is the recipe domain DID, exactly as `propose_domain_creation` reported it. Not the `#top-nn` resource, not a URL.
- `recipeVersion` equals the `version` passed to `publish_recipe_release`. A changed file is a new version and a new `#top-nn`. The Portal refuses a version the domain already published, before anything is signed.
- `baseRecipe` matches the Kind the recipe is for (`task`/`project` → `project`, `question` → `research`, `agent_task` → `flow`, otherwise the Kind's own name).
- `shape` is an overlay: it lists only what it adds or replaces. The resolver merges it over the base recipe by `code`, then applies the Kind overlay.
- Leave the overlay empty (`axes`, `transitions` and `progressRules` all `[]`) unless the person asks for a step the Kind does not have. A lead, reviewer or acceptor approving the result is the Kind's own acceptance, not an overlay. The FPS example's `verification` axis and `record-verification` transition need an evaluator with `claim/evaluate` rights and an evaluation Flow; add them only when the person asks for that kind of check.
- The merged Shape must resolve: every transition has a full `presentation`, exactly one transition carries `completesTopic: true` (the base provides it; do not add another), every gate names a real axis and state.
- Kind `project` requires a `project` block and no other Kind may carry one. The minimum is `{ "version": 1, "compatibleKind": "project", "compatibleShapeVersion": 1, "allowedChildKinds": [...], "entryPoints": [], "milestoneSuggestions": [] }`; `requiredCloseEvidenceTypes` lists record types that must exist in the thread before the project can close (only types the Portal can record, such as `ixo.evaluation`). Entry points and milestone suggestions need targets the Portal knows; leave them empty unless the person names one.
- A file without a `shape` block is a brief. The Portal can still show its text but refuses to publish it as a recipe.

## What an overlay may use

The Portal renders nothing new for a recipe. Build from these parts only; anything else has no handler, no phase, or no translation.

| Part | Allowed values |
| --- | --- |
| Axes | `contract`, `work`, `topic` (always present in the base); add `verification`, `decision`, `effect`, `settlement` |
| Phases | `forming`, `working`, `verifying`, `deciding`, `effecting`, `settling`, `complete`, `dormant` |
| Transition commands | `topic.edit-setup`, `topic.confirm-setup`, `topic.record-assent`, `topic.raise-dispute`, `topic.resolve-dispute`, `topic.start-work`, `topic.answer-question`, `topic.change-due-date`, `topic.unblock`, `topic.record-outcome`, `topic.complete`, `topic.close-project`, `topic.request-action`, `topic.confirm-action`, `topic.record-flow-run`, `topic.record-verification`, `topic.record-decision`, `topic.record-settlement` |
| Gates | `axis` (another axis in given states), `field` / `field-any` (paths present or accepted), `record` (a record type in the thread), `receipt`, `binding` (a bound flow), `condition` |
| Confirmation | `none`, `viewer`, `authority` |
| Evidence | `operation`, `record` (with `finality`), `receipt` |
| Presentation keys | the built-in `topic.action.<transition-code>.label|prompt|purpose|unlocks` keys; copy the whole `presentation` block from a built-in transition |

The safe way to add a stage is to copy its axis and transition verbatim from one of the sample recipes inside the `@ixo/topic-protocol` package (`record-verification` from `blueprint-design`, `record-decision`, `request-action`, `confirm-action` from `agent-delivery`, `record-settlement` from `verified-work-payment`; source material only, the Portal never pins them) and then change only `gates`, `assignedTo`, `confirmation` or `presentation.priority`.

What a recipe cannot do: invent an axis, a command, a role name, a record type, a phase or a locale key; change the base transitions' codes; add a second completing transition.

## Validate before you write

Run the bundled checker on the exact bytes you intend to upload:

```bash
node scripts/validate-recipe.mjs /workspace/recipe/shape.json --did <recipe-domain-did> --version 1.0.0 --kind project
```

It resolves the merged Shape with the pinned protocol artifact and prints the canonical `topicRecipeRef` the Portal will pin on Topics, the sha256 of the bytes the chain will anchor, and the resolved sources. Fix every error; the Portal runs the same resolution and refuses a file it cannot resolve.

## Publish through the Portal, in this order

1. `propose_domain_creation({ requestKey, name, description, entityType: "protocol/topic", tags?, purpose?, image? })` with `name` exactly the recipe's name. Skip when the person attached or named an existing `protocol/topic` domain they control. Outcome message: `Domain "<name>" created: <DID> …` or `… cancelled.`; when it says the person renamed the domain, use the new name as the recipe `label`. Use that DID as the recipe `id`; write the file only now, because the id is part of the bytes.
2. `write_domain_files({ requestKey, entityDid, public, files: [{ path, content, mimeType }] })` with `shape.json` (and any companion files) under `/recipes/<slug>/<version>/`. Outcome message carries one receipt per file: `fileId`, `version`, `digest`, `publicUrl`. An existing path is reported, not replaced: use a new version folder rather than `overwrite`.
3. `publish_recipe_release({ requestKey, entityDid, recipe: { version, protocolVersion: "1.0.0-rc.7", baseKind, baseRecipe, listingVisibility }, shape: { fileId, path, version, digest, mediaType, publicUrl? }, access })` with the `shape.json` receipt verbatim. The Portal downloads the file, checks the bytes against `digest`, resolves it as a recipe for `baseKind`, then asks for two signatures: the Domain Card re-issued with a `topicRecipe` block, and the `#top-nn` linked resource whose proof is the byte digest. Outcome message: `Recipe release "<requestKey>" published … Shape anchored as <DID>#top-nn …`, `… declined`, or `… failed (card_failed | shape_failed)`. A `card_failed` whose message names the file means the file, not the signature: fix the file, write a new version, release again. A `card_failed` that says the version is already published means the same: pick the next version.

After step 3 the recipe is discoverable: the Portal's Settings → Topics lists it under "Published recipe", the shelf pins it, and a Topic created from it carries `topicRecipeRef: { id: <DID>, version, digest }` where `digest` is the canonical Shape digest the checker printed, not the byte digest.

## A new version of a published recipe

Load the current release with `resolve_published_recipe`, change only what the person asked for, and keep every other field exactly as it was. Bump `recipeVersion`, write the file under a new `/recipes/<slug>/<version>/` folder, and release it to the same domain.

## Publishing from an existing Topic

When the person says "save this Topic as a recipe", read the Topic once, take its Kind, Base Recipe, optional pinned recipe overlay and its contract text (intent, outcome, definition of done, open questions) as the brief, strip everything personal (owners, assignees, dates, room, records), and continue from step 1. The Topic itself is not modified.
