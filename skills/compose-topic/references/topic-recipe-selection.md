# Topic Recipe selection

Topic Recipes are expert-honed, digest-pinned overlays over a Base Recipe. They are not the same thing as a Kind's Base Recipe.

## Current behavior

There is no bundled catalog. [topic-shape-pins.json](topic-shape-pins.json) carries the nine Base Recipe plus Kind resolutions and nothing else; the sample recipes shipped inside `@ixo/topic-protocol` are neither offered by this skill nor accepted by the Portal, which rejects any handoff that pins one.

The only recipe source is a recipe published on chain by a `protocol/topic` domain, and it is available only when the host supplies it. The person names it (a domain DID, usually with a version, for example from the Portal's shelf); you call `resolve_published_recipe` once. The Portal fetches the file from the domain's `#top-nn` resource, verifies the bytes, registers it for its resolver and returns the exact `topicRecipeRef` (id = the domain DID), the recipe's brief, and per compatible Kind the `shapeSources` and `shapeDigest` it will require. Copy them verbatim. If the tool reports the file is a brief without rules, compose on the Base Recipe and say so.

Do not search for published recipes, resolve their files, or compute their digests yourself; see [topic-recipe-publishing.md](topic-recipe-publishing.md) for how one is written and published. Do not interpret “similar” as a verified match. Do not invent a recipe ID or digest. Do not change the Kind merely to make a preferred recipe fit.

Every selection produces an editable Draft. Project Recipes configure only eligible suggestions, evidence presentation, and entry-points. They grant no authority, create no milestone or child Topic, and invoke no coding application or Design POD.

## Output requirements

`recipeSelection` records:

- the selected `baseRecipe`;
- `strategy: base-recipe`, with `registryLookup: not-performed` and `registryReason: pinned-catalog-only`; or
- `strategy: topic-recipe`, with `topicRecipeCode` = the published recipe's code, its exact `topicRecipeRef`, `registryLookup: host-supplied` and `registryReason: portal-published-recipe`;
- exact Shape sources and Effective Shape digest; and
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
