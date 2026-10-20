# Publishing a Topic as a recipe

A recipe is a Topic Draft that other people can instantiate: the same rules
(Shape overlay) and the same starting text (brief), pinned by version and
digest on a `protocol/topic` domain. Confirm the intended Kind first, then compose the Topic Draft; publishing is
an extra exit, not a different skill. This reference replaces the older
`topic-recipe-author` capsule. Do not load that obsolete skill alongside this one.

The Portal owns every write. Three browser tools exist only while a Portal
conversation is connected; each returns at once and the outcome arrives as the
next Portal chat message. Never re-call a tool while its result is pending,
never poll, never ask whether the person signed. `ask_user_question` also returns `awaiting_answer`; stop until the user’s
answer arrives. End your turn after each approval request; reads such as
`resolve_published_recipe` answer in the same turn, so keep going after them.

A `protocol/topic` domain publishes one recipe and its versions: the domain
card carries a single `topicRecipe` block, and the recipe `id` is the domain
DID. A different recipe needs its own domain, named exactly like the recipe,
because lists show the card's name as the recipe title. A new version of the
same recipe goes to the same domain.

## Five steps, one conversation

Use these as conversational steps in the existing cards; do not invent a separate
wizard tool or send five forms at once. Default to Guided view. Honour an explicit
Developer view preference, or ask “Would you like a guided view or technical
details?” when useful. Never choose the view silently from a model name.

1. **Describe and confirm Kind.** Restate the outcome the person wants. Recommend
   the supported Kind that governs that outcome; explain plausible alternatives.
   For “hire a provider”, recommend Proposal when the outcome is an authorised
   selection; Project is for coordinating delivery after selection; Evaluation
   assesses evidence against criteria. Ask with `ask_user_question`, setting
   `recipeIntent` to the purpose and option IDs to canonical Kinds. Use one
   single-select choice when the intent is unambiguous, or a few explained choices
   when ambiguous. Do not enable free text or multiple selection for this gate.
   Wait for an actual choice. Retain its `requestKey` as `kindConfirmationKey`.
   A rejection, silence, timeout, or model assertion never confirms a Kind.
2. **Preview.** Show the recipe name, purpose, outcome, how work finishes, and what
   people will fill in when using it. Explain the selected Kind in ordinary words.
   Describe narrative stages as guidance; do not add executable transitions merely
   because the brief has seven steps. Inherit the base Shape unless a supported
   change is necessary. If the purpose or Kind changes, confirm again and rebuild
   the preview before preparing files.
3. **Choose home.** Distinguish the recipe's publishing home (`protocol/topic`)
   from the organisation where people will use it. “Agency Procurement” may be
   the consumer domain, while “Agency Procurement — Hire a Service Provider” is
   the recipe's publishing domain. Verify the existing domain type and controller
   access, or use the existing domain-creation card. Confirm visibility in plain
   language. Use the actual publishing domain DID in the file after it exists.
4. **Publish.** Validate exact bytes, then request a file-write approval and await
   its receipt. Prepare the release from that receipt, await approval and signing.
   Explain what changes, what remains unchanged, and whether anyone can read it.
   Do not present a signature as a validation step. Invalid files must be repaired
   before an approval card exists.
5. **Use.** After a successful public release receipt, show
   “Published · Version <version> · Public · Ready to use”. Finish with the Portal action
   **Create a Topic from this recipe**. The person chooses their destination room;
   the Portal verifies the published pins and opens a reviewable Draft. Do not
   silently select a personal room, claim that a Topic already exists, or claim
   Agency Procurement has it installed without verifying that destination. For a
   private recipe, report “Published · Version <version> · Private · Access
   required”; do not promise instantiation until the host has an authorised
   fetch path. This change does not add a new delegation or private-use flow.

Supported Kind → Base Recipe mappings: `project` → `project`, `task` → `project`,
`proposal` → `proposal`, `evaluation` → `evaluation`, `claims` → `claims`,
`question` → `research`, `discussion` → `discussion`, `incident` → `incident`.
Offer only Kinds enabled by the host; `agent_task` → `flow` is not available when
marked coming soon. “Decision” may be a display label, never the wire Kind or
Base Recipe. Do not infer Kind just from a title containing “project” or “task”.

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
    "axes": [],
    "transitions": [],
    "progressRules": [],
    "inferredRecordPolicy": { "autoAccept": [], "neverAutoAccept": [] }
  },
  "project": {
    "version": 1,
    "compatibleKind": "project",
    "compatibleShapeVersion": 1,
    "allowedChildKinds": ["task", "proposal", "evaluation", "question"],
    "entryPoints": [],
    "milestoneSuggestions": []
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

It resolves the merged Shape with the pinned protocol artifact and prints the canonical `topicRecipeRef` the Portal will pin on Topics, the sha256 of the bytes the chain will anchor, and the resolved sources. This one file check is allowed for recipe publishing; repository audits and
composition test suites remain maintainer work. Fix actionable errors once, then
stop and explain any remaining blocker. Use the same verified file throughout;
never regenerate its JSON while copying it into a tool call.

Save the file as a sandbox download artifact. Supply its HTTPS download URL,
SHA-256 of the exact UTF-8 bytes, and byte count as `sourceArtifact: { url, digest,
sizeBytes }`. Do not use a viewer page, placeholder, or guessed digest. First call
`write_domain_files` with `dryRun: true` and `kindConfirmationKey`. A `validated`
result permits the same input without `dryRun`; it does not mean anything was
written. If the source changes or expires, create a fresh verified artifact and
validate it again. Inline `content` is supported for small complete files, never
for truncating a large artifact.

Translate errors into fixes: a namespace mismatch means choose the correct
publishing home; version mismatch means align the new version folder and recipe;
Kind mismatch means return to the confirmed outcome; digest/byte mismatch means
use the original verified artifact; unreadable current listing means wait and
retry its read, not replace it with an empty listing. Put raw diagnostics in
Advanced details. Changing a request key never fixes invalid content.

## Publish through the Portal, in this order

1. `propose_domain_creation({ requestKey, name, description, entityType: "protocol/topic", tags?, purpose?, image? })` with `name` exactly the recipe's name. Skip when the person attached or named an existing `protocol/topic` domain they control. Outcome message: `Domain "<name>" created: <DID> …` or `… cancelled.`; when it says the person renamed the domain, use the new name as the recipe `label`. Use that DID as the recipe `id`; write the file only now, because the id is part of the bytes.
2. `write_domain_files({ requestKey, kindConfirmationKey, entityDid, public, files: [{ path, sourceArtifact: { url, digest, sizeBytes }, mimeType }] })` with `shape.json` (and any companion files) under `/recipes/<slug>/<version>/`. Outcome message carries one receipt per file: `fileId`, `version`, `digest`, `publicUrl`. An existing path is reported, not replaced: use a new version folder rather than `overwrite`.
3. `publish_recipe_release({ requestKey, kindConfirmationKey, entityDid, recipe: { version, protocolVersion: "1.0.0-rc.7", baseKind, baseRecipe, listingVisibility }, shape: { fileId, path, version, digest, mediaType, publicUrl? }, access })` with the `shape.json` receipt verbatim. The Portal downloads the file, checks the bytes against `digest`, resolves it as a recipe for `baseKind`, then asks for two signatures: the Domain Card re-issued with a `topicRecipe` block, and the `#top-nn` linked resource whose proof is the byte digest. Outcome message: `Recipe release "<requestKey>" published … Shape anchored as <DID>#top-nn …`, `… declined`, or `… failed (card_failed | shape_failed)`. A `card_failed` whose message names the file means the file, not the signature: fix the file, write a new version, release again. A `card_failed` that says the version is already published means the same: pick the next version.

After step 3, use the release card’s action or the publishing domain’s recipe card. Public discovery can lag and private recipes require access; verify a listing before claiming it is discoverable. A Topic created from the verified recipe carries `topicRecipeRef: { id: <DID>, version, digest }` where `digest` is the canonical Shape digest the checker printed, not the byte digest.

## A new version of a published recipe

Load the current release with `resolve_published_recipe`, change only what the person asked for, and keep every other field exactly as it was. Bump `recipeVersion`, write the file under a new `/recipes/<slug>/<version>/` folder, and release it to the same domain.

## Publishing from an existing Topic

When the person says "save this Topic as a recipe", read the Topic once, take its Kind, Base Recipe, optional pinned recipe overlay and its contract text (intent, outcome, definition of done, open questions) as the brief, strip everything personal (owners, assignees, dates, room, records), and continue from step 1. The Topic itself is not modified.


## Recovery

Reuse the same operation key for an identical pending request and wait for its
host result. Never send repeated approval cards to make progress. If the page
reloads and the host no longer has the Kind confirmation or preview, explain
that it needs a fresh confirmation and revalidate; do not reconstruct approval
from a chat message. If the listing signature succeeds but the Shape signature
fails, preserve the receipt and prepare the same release again. The host checks
the current listing and resumes the missing signature when it matches. A changed
listing or file needs a fresh preview. Never claim publication on the strength
of the first signature alone.
