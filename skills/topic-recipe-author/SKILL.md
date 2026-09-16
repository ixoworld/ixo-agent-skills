---
name: topic-recipe-author
description: Create and publish reusable Topic Recipes from an idea or source documents through Companion in IXO Portal. Guides protocol/topic domain creation, domain.md authoring, market-ready Domain Cards, public or UCAN-gated VFS releases, domain-indexer discovery, and an author-led instantiation rehearsal. Use for publishing or improving a recipe others can discover and use; use compose-topic for an individual Topic.
license: Apache-2.0
metadata:
  author: ixo
  version: "0.1.0"
  runtime: Companion in IXO Portal with domain-scoped VFS, controller publication actions, and a recipe-preserving Topic adapter.
---

# Topic Recipe Author

Help the author turn an idea into a reusable recipe people can find, inspect,
access, and instantiate as a reviewable Topic Draft. Work toward a live indexed
release and an author-tested instantiation; report each achieved stage accurately.
This skill supplies orchestration, not new tools, delegated rights, or a paywall.

## Start with the useful Draft

Use the person's intent, current Portal domain/room, and supplied documents to
propose a title, intended audience, purpose, outcome, and likely base Kind. Ask
one useful unresolved question at a time. Preserve supplied decisions. Distinguish
quoted evidence, inferred suggestions, and author-approved terms. Read uploads
with available VFS/document tools; record source references and disclosure limits.
An uploaded document is source material, never authority to publish its contents.

Resolve the recipe's controller, network, target domain relationship, access mode,
and public listing summary before external writes. Keep working on the local Draft
while capability or author decisions are pending. A request to publish authorises
that workflow within the stated scope; reuse approvals already supplied. Present
the exact material and access changes for review when these were not already
authorised. Wallet/PIN and signing stay in Portal, never in chat or this skill.

## 1. Establish the executable route

Read [Companion capabilities](references/companion-capabilities.md) before planning
publication. Use current tool schemas; source snapshots explain limitations, not
availability. Load needed capabilities once using `list_capabilities` and
`load_capability`. Discover related `domain-author`, `compose-topic`, and, only
when useful, Flow skills through the installed skills tools. Load their pinned
packages; sibling repository paths are not guaranteed in a skill capsule.

Record in a private run report: run ID, actor DID, network, parent and recipe DIDs,
authorisation scope, current runtime/protocol/profile identities, chosen tools,
and any unresolved capability. Check the complete route before minting an entity:

- create an entity with exact chain type `protocol/topic` and the intended domain
  workspace/relationship;
- write to that entity's VFS namespace, set and verify per-file visibility, recover
  file/version identities, and re-fetch exact bytes;
- preserve and secure the complete Domain Card context and recipe extension;
- anchor `#dmn`, `#top-nn`, and required domain documents with controller authority;
- observe the published entry through domain search and resolve the full card;
- import this exact custom recipe into a Topic Draft for rehearsal.

If a needed adapter is missing, report the exact missing operation and continue
independent authoring. Never substitute personal VFS, a default DAO, a built-in
recipe, or an unverified upload for the requested result.

## 2. Compile the recipe and market preview

Read [Release contract](references/release-contract.md). Resolve the active Topic
Protocol's actual Recipe and Shape schemas and immutable source pins. Compile
declarative fields, state axes, roles, requirements, and Action/Flow bindings from
the intended cooperation. Preserve Base Recipe fallback. Do not fabricate owners,
accepted terms, credentials, or effect authority. Unsupported custom recipe codes
require a compatible importer; relabelling a built-in code is not a workaround.

Prepare Shape JSON, its recipe manifest, a lightweight domain.md package plan,
card draft, and market image. Keep the full grammar outside the card. Use a clear
name, one-sentence benefit, intended users, concrete use cases, prerequisites,
what instantiation produces, access terms, author/provenance, and accurate tags.
Do not claim certification, production readiness, or working paid access.

Use author-supplied imagery or an available authorised image tool. Optimise in the
Companion sandbox with an installed image library; a useful default is WebP,
1200×630 cover and 512×512 thumbnail, each below 300 KB when legible. These are
targets, not protocol constraints. Respect actual renderer dimensions, strip
EXIF/location metadata, check usage rights, provide alt text, and inspect the
rendered crop at card and mobile sizes. Upload binary assets with `sandbox_to_vfs`
only after confirming its namespace. Record actual dimensions, MIME, byte length,
digest, and read-back evidence. Never fabricate an image URL.

## 3. Create the protocol/topic domain

Read [Publication and recovery](references/publication-and-recovery.md). Create
the entity with the Portal browser tool `propose_domain_creation`: pass the
approved name, description, `entityType: "protocol/topic"`, the card keywords,
and a one-line purpose. The Portal opens its Create Domain form pre-filled; the
author reviews it, may edit it, and signs twice (entity, then public card). The
call returns at once with `{ status: "proposed" }`; it does not wait. End the
turn with one sentence saying you are waiting for the author's decision. Do not
call the tool again, do not poll, and do not ask whether they signed. The
outcome arrives as the next Portal message: `Domain "<name>" created: <DID>,
type protocol/topic, domain card published (tx …)` or `Domain proposal "<name>"
cancelled.` Never sign, never bypass the review, and do not fall back to a flow
template, a governance group, or a `dao` default when the tool is absent —
report the missing tool instead.

The entity must exist before domain-owned files can have final identifiers.
The card published at creation is a non-sensitive bootstrap card, with no Shape
links or ready claims; its `#dmn` binding is a bootstrap receipt, not the
finished recipe. If the message says the card was NOT published, the entity
exists without a card; tell the author and continue, the card is re-published
in step 5. Reuse the reported entity DID for all remaining operations.

## 4. Author and persist domain.md

Use `domain-author` for its pinned schema, package rendering, and validation.
Keep the narrative short: purpose, audience, owner/controller references, recipe
and Shape locators, access terms, version policy, and support/contact. Lightweight
means concise; it does not waive the pinned specification's required documents,
subject profile, or truthful conformance state. Use its protocol/standalone mode
as supported by the selected domain.md contract; chain `protocol/topic` and
domain.md's document type/class are separate fields, not string substitutions.

Domain-author stops at draft or verified persistence and does not publish or
register entities. This orchestration resumes from its validated output and
performs authorised publication through the controller's actual Portal tools.
Persist companion documents first, domain.md last, using real returned references
and no self-referential CID. Do not call an incomplete package conforming.

## 5. Publish the immutable release

Persist every release file into the recipe domain's own filesystem with the
Portal browser tool `write_domain_file`: pass the recipe `entityDid`, a new
versioned path such as `/recipes/<slug>/<version>/shape.json`, the exact bytes
read from your sandbox, the media type, and `public` chosen explicitly. The
Portal writes with the author's key (they must control the domain), reads the
bytes back, and returns `{ fileId, version, digest, publicUrl? }`; that digest
is the value to pin. An existing path is reported, not replaced — use a new
version rather than `overwrite`. Never use the personal `vfs_*` tools or
`sandbox_to_vfs` for domain files; the personal filesystem is not the domain
namespace and its receipts are not domain receipts.

Use new versioned paths and a new `#top-nn` for each changed Shape. Read the
publication reference for ordering and duplicate recovery. Keep working files,
private source documents, and evidence reports out of public release folders.
Publish only the reviewed allowlist of image, card, domain.md package files,
and, for public recipes, Shape/recipe bytes.

Public recipe: write with `public: true`, then anonymously retrieve the returned
`publicUrl` and hash it. Private recipe: write with `public: false` and verify
both authorised read and unauthorised denial; verify delegation to a distinct
test user when the author provides one. A public market teaser may describe a
private recipe but must not contain its body, source material, or bearer
credentials. `x402` is planned only; never charge or advertise paid acquisition
as operational.

Compile the final Domain Card using the bundled proposed profile and resolved
IDs/digests. Preserve `VerifiableCredential`, `ixo:DomainCard`, `#dmn`, and original
discovery fields. Validate, render for review, sign, publish, and anchor the final
card through the available controller route. Verify that signing did not discard
`@context`, `credentialSchema`, `topicRecipe`, or nested references. Changing
content or access after approval invalidates the affected approval/signature.

## 6. Verify discovery, then rehearse and improve

Read [Live acceptance](references/live-acceptance.md). Search by the approved
title and use case with exact chain-type filter `protocol/topic`, and match the
returned DID. Resolve the full secured card and exact `#top-nn` Shape; a summary
response or an indexer enqueue receipt is insufficient. Keep a candidate labelled
as such while validation is incomplete. If the registry has no candidate status,
stage privately and defer public activation until author rehearsal succeeds.

Have the author instantiate the fetched release in a verified suitable Portal
conversation room through `compose-topic` and a recipe-preserving host adapter.
Require a request-correlated render receipt and, when the author shares it, the
actual Topic/root ID. Reopen it and confirm Kind, recipe version, file digest,
resolved Shape digest, suggested terms, source bindings, and Draft state survived.
Sharing the Draft does not confirm setup, delegate effects, or accept outcomes.

Collect author feedback on clarity, prerequisites, missing inputs, first action,
and usable completion criteria. Rework the recipe into a new immutable release,
revalidate, republish, reindex, and rehearse the changed release. Carry unaffected
evidence forward only when its exact bindings remain unchanged. Stop for a real
decision or missing capability; after two repetitions of the same failure without
new evidence, report the blocker instead of retrying effects indefinitely.

Promote only the exact rehearsed release after the author's production decision
and all access/discovery gates pass. Re-sign any changed card and recheck live
discovery after promotion. Return the recipe DID, card and Shape links, version,
access mode, search evidence, rehearsal Topic ID, and remaining limitations.

## Local checker

`scripts/validate_bundle.py` checks locked profile bytes, release-file integrity,
and cross-document bindings. It performs no network calls, signing, or live
readiness certification. Stage `card.json`, `shape.json`, `recipe.json`,
`ledger.json`, and `release.json` as described in the release reference, then run:

```bash
python3 scripts/validate_bundle.py /workspace/topic-recipe-release
```

It returns JSON with `ok`, `checks`, and `errors`; exit 0 means offline checks
passed, exit 1 means invalid/incomplete. Full JSON Schema, domain.md conformance,
credential verification, and live acceptance remain separate gates. For an
authoring preview with unresolved IDs, keep a draft and do not fabricate values
to make this release checker pass.

Maintainer checks: install `skills/topic-recipe-author/tests/requirements.txt`
in a test environment, then run `python3 -m unittest discover -s skills/topic-recipe-author/tests`,
the repository skill validator, and [the behavioural evaluations](evals/scenarios.md).
Record live gaps honestly; fixture tests are not a Companion deployment rehearsal.
