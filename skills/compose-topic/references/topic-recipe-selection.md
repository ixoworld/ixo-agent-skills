# Topic Recipe selection

Topic Recipes are expert-honed, digest-pinned overlays over a Base Recipe. They are not the same thing as a Kind's Base Recipe.

## Current behavior

The skill has one controlled local catalog: [topic-shape-pins.json](topic-shape-pins.json). It contains the nine Base Recipe plus Kind resolutions and the five seed Topic Recipes published with Topic Protocol `1.0.0-rc.3`.

Every selection produces an editable Draft.

| Topic Recipe | Required Kind | Base Recipe | Use only when |
| --- | --- | --- | --- |
| `research-brief` | `question` | `research` | the Topic will frame a question, research it, verify sources, and explicitly close the brief |
| `agent-delivery` | `agent_task` | `flow` | the Topic commissions bounded agent work, reviews delivery, and may explicitly confirm an external Action through a Flow |
| `verified-work-payment` | `claims` | `claims` | the Topic binds one entity/collection, verifies work, records a decision, executes through a Flow, and observes settlement finality |
| `software-build` | `project` | `project` | the Project coordinates reviewed software implementation, verification, release, and operational-readiness work |
| `blueprint-design` | `project` | `project` | the Project produces an independently reviewed and explicitly accepted, decision-complete blueprint |

If none matches exactly, select only the Kind's Base Recipe.

Do not interpret “similar” as a verified match. Do not invent a recipe ID or digest. Do not change the Kind merely to make a preferred recipe fit.

Project Recipes configure only eligible suggestions, evidence presentation, and entry-points. They grant no authority, create no milestone or child Topic, and invoke no coding application or Design POD.

## Output requirements

`recipeSelection` records:

- the selected `baseRecipe`;
- `strategy: base-recipe` or `topic-recipe`;
- optional seed `topicRecipeCode` and exact `topicRecipeRef`;
- exact Shape sources and Effective Shape digest;
- `registryLookup: not-performed`;
- `registryReason: pinned-catalog-only`; and
- `reviewState: draft`.

The same base recipe, optional ref, and digest must appear in `rootDraft` and `contractDraft.semantic`.

## Future Marketplace lookup

Do not implement remote lookup until a useful recipe library and a verified registry interface exist.

When that adapter is introduced, it must:

1. search using the intended outcome, canonical Kind, Base Recipe, scope, consequence class, and required lifecycle axes;
2. return immutable recipe references with versions and digests;
3. expose provenance, sponsor/maintainer, applicability, and evidence of use;
4. verify the recipe through the protocol resolver;
5. present matches as suggestions, never silent selections;
6. preserve a blank Base Recipe path; and
7. still create a user-reviewable Draft.

An unavailable, partial, or empty Marketplace is not evidence that no recipe exists. Fall back to the Base Recipe and record that lookup was not performed or was incomplete.
