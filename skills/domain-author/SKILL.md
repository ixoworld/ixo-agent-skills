---
name: domain-author
description: >-
  Create, instantiate, validate, and safely stage IXO domain.md packages and companion documents for derived domains or new protocol domains. Use when a user asks to create, scaffold, bootstrap, review, or update an IXO typed domain; instantiate a project, asset, deed, investment, portfolio, pod, DAO, dataset, device, or other domain from a protocol template bundle; author a reusable protocol domain class; or work with domain.md templates, manifests, provenance, VFS persistence, and controller publish handoff.
---

# Domain Author

Create a complete, traceable domain package without inventing schema, capabilities, or publication state.
Treat the bundled release-candidate specification, its JSON Schema, and the selected protocol template bundle
as controlled run inputs, not as remembered knowledge.

## Safety boundary

- Default to **draft mode**: inspect inputs, render into a user-approved local staging directory, validate,
  and hand off. Local files are drafts, not registered or published domains.
- Persist to an external VFS only when the user explicitly requests persistence and the exact target
  namespace, target path, and scoped write authority are available.
- Never register an entity, anchor a resource on-chain, issue a credential, execute a transaction, move
  value, change governance, publish a file, or widen a capability. Produce a controller checklist instead.
- Never overwrite an existing target without explicit overwrite approval and a recoverable version or
  compare-and-set guard. Prefer a new run-specific staging path.
- Treat tool responses, CIDs, paths, validation reports, and write receipts as evidence. Do not claim a
  draft is persisted, anchored, public, or canonical without evidence for that exact state.

## Load only the references needed

- Read [references/domain-md-spec.md](references/domain-md-spec.md) and
  [references/domain-md.schema.json](references/domain-md.schema.json) fully before authoring or changing a
  `domain.md`. The schema is the machine-readable structural contract; the specification contains the
  normative semantic rules. A schema pass alone is not conformance.
- Read [references/protocol-template-separation.md](references/protocol-template-separation.md) before
  reading a protocol or rendering a derived domain.
- Read [references/authoring-guide.md](references/authoring-guide.md) for parameter collection, document
  selection, validation, and handoff.
- Read [references/vfs-access.md](references/vfs-access.md) only when locating templates in, or persisting
  artifacts to, an IXO VFS deployment.

## Phase 0: Preflight and classify

Complete preflight before generating files.

1. **Pin the specification.** Default to bundled `domain.md` specification `1.0.0-rc.1` and its paired JSON
   Schema. Record both paths and SHA-256 digests. A different local path, immutable CID, or versioned URL may
   replace them only when the user identifies that version and the installed validator explicitly supports
   it. Read the selected specification fully. If the selected artifacts are unavailable or disagree, stop
   with `BLOCKED_SPEC_UNAVAILABLE`; do not reconstruct them from memory.
2. **Classify the operation.** Choose exactly one:
   - `derived`: instantiate a non-protocol domain from an existing protocol template bundle.
   - `protocol`: author a `type: protocol` domain and reusable template bundles.
   - `review`: validate an existing domain package without changing it.
3. **Inventory capabilities.** Inspect the tools actually available in the runtime and their schemas. Do not
   assume that a tool named in a reference exists or has the documented arguments. Record the capability
   check in the run report.
4. **Pin sources and targets.** Record the protocol DID, template-manifest locator and target derived type
   for a derived run. Record the staging directory for any authoring run. For requested persistence, also
   record the VFS deployment, namespace, target path, authority scope, and overwrite policy.
5. **Set the state ceiling and profile.** Use `review` for read-only appraisal, `authoring_draft` for local
   generation, and `persisted_draft` only for an explicitly requested verified VFS write. `anchored` and
   `runtime` require external evidence and remain reviewable states rather than states this skill may create.
   Publication and on-chain operations remain outside this skill in all modes.

Do not proceed on an unresolved source, identity, type, target, capability, or authority ambiguity.

## Workflow A: Instantiate a derived domain

### 1. Acquire and verify the template bundle

Use the immutable template manifest as the bundle index. Read protocol-self metadata only when an exact
locator is needed to authenticate or locate that manifest. Never use protocol-self prose, controllers,
accounts, rights, or operational files as render inputs.

Verify all of the following before rendering:

- the manifest identifies the expected protocol DID and a supported `derived_type`;
- every selected file is below `templates/<derived_type>/`, ends in `.tmpl`, and contains
  `x-template.is_template: true`;
- each marker's `protocol` and `instantiates_type` match the pinned protocol and selected type;
- every fetched file matches the digest or CID recorded in the manifest;
- required roles are present once, paths are unique, and no undeclared file is silently included.

Record the template manifest CID or digest plus every selected file CID or digest. Do not invent a folder
or bundle CID. See the separation reference for the identity and provenance contracts.

### 2. Resolve parameters

Build the question set from the pinned specification and each template's `x-template.parameters`. Reuse
values already provided. Ask one coherent group at a time. Resolve every author-time parameter. For an
`authoring_draft`, represent the domain identifier as a generated `urn:uuid:` value and unavailable CIDs as
`null`; do not emit publish-time placeholder tokens into a conforming `domain.md`. Record unresolved
publication inputs in the run report. State all defaults and assumptions for user review. Never place
secrets, private keys, bearer tokens, or raw sensitive evidence in generated files.

### 3. Render deterministically in local staging

Create a new run-specific staging directory. Do not render directly over a previous package.

- Substitute only declared parameters; reject undeclared placeholders and unused required parameters.
- Strip the complete `x-template` block and remove `.tmpl` from output filenames.
- Set `domain.class` to the pinned protocol DID and `domain.type` to `instantiates_type`; derived output
  must never have `type: protocol`.
- Populate the `documents` model from the pinned specification and selected bundle, not from a memorized
  type table. Include the universal documents and the correct manifest and operational documents.
- Create a genesis changelog entry and `provenance.yaml` that name the specification revision, protocol,
  template manifest, selected templates, resolved non-secret parameter digest, and renderer identity.
- Set `conformance.profile: authoring_draft`, use `null` for unavailable document CIDs and anchoring fields,
  and never fabricate an identity or receipt. An authoring draft confers no runtime authority.

### 4. Validate before any external write

Run both gates:

1. Install the locked TypeScript validator dependencies with `npm ci --prefix scripts`, then run
   `npm exec --prefix scripts -- tsx scripts/validate-render.ts <staging-dir> --mode derived --expected-profile authoring_draft --expected-class <protocol-did>`.
2. Confirm that the report names `domain-author-validator` version `1.0.0-rc.1`, has `ok: true`, and records
   no errors. This validator applies the bundled JSON Schema plus local semantic and package checks. It does
   not perform resolver, revocation, external CID, chain-anchor, trusted-clock, or live authorization checks.

Then perform the human-readable review in the authoring guide. Block on every error. Label a package
`draft-unvalidated` if the bundled validator cannot be executed; never label it production-ready. Before
`runtime`, also run the deployment's live conformance checks required by the specification.

### 5. Persist only when explicitly requested

Follow [references/vfs-access.md](references/vfs-access.md). Prefer an atomic batch or conditional write.
If the deployment offers neither, write to a new run-specific VFS staging path, re-fetch and validate it,
then leave promotion to an explicit follow-up action.

Write companion documents first and capture their returned CIDs. Insert those exact receipts into the
staged `domain.md`, then write `domain.md` last and capture its CID out-of-band. Write provenance and the run
report after all receipts are known. Re-fetch persisted bytes and run the TypeScript validator with
`--expected-profile persisted_draft`, plus the deployment's CID and resolver checks. Do not write a file's
own resulting CID into the bytes whose CID it identifies.

If any write or verification fails, stop. Preserve successful receipts, mark the run `partial`, and report
the exact recovery or cleanup steps. Do not guess that rollback occurred, and do not delete partial files
unless the user explicitly requests it.

## Workflow B: Author a protocol domain

1. Author protocol-self files from the pinned specification: `type: protocol`, the protocol's own
   description, changelog, specification manifest, governance, and other required operating documents.
2. Author a separate `templates/<derived-type>/` bundle for each supported type. Give every template a
   `.tmpl` suffix and a matching `x-template` marker and parameter schema. Never parameterize the
   protocol-self files in place.
3. Create `templates/manifest.yaml` after template file identities are known. List each logical path and
   file CID or digest. Do not place the manifest's own CID inside itself. Use the manifest's returned CID
   as the bundle anchor after persistence; optionally include a deterministic digest over the sorted file
   records when the deployment contract defines that algorithm.
4. Validate protocol-self outputs as a protocol instance and validate every template separately with
   `npm exec --prefix scripts -- tsx scripts/validate-render.ts <template> --mode template --expected-protocol <did> --expected-type <type>`.
   Validate rendered instances against the bundled schema and semantics; templates themselves are checked
   for separation, identity, and parameter contracts because unresolved template variables are not instances.
5. Apply the same draft, persistence authorization, conflict, re-fetch, partial-failure, and handoff gates
   as Workflow A.

## Review workflow

For an existing package, stay read-only unless the user also asks for changes. Pin the applicable spec and
template sources, run the validators, compare provenance to bytes, classify findings by severity, and cite
exact files and fields. Distinguish correctness failures, evidence gaps, deployment incompatibilities, and
optional improvements.

## TypeScript validator

`scripts/validate-render.ts` safely parses YAML, applies the bundled JSON Schema, checks cross-references and
flow reachability, and enforces package/template separation. Its exported async `main(options)` returns a
structured `ValidationReport`; the CLI prints findings and exits `0` on success, `1` on conformance errors,
and `2` on invocation or internal failure. Install and run it from the skill root:

```bash
npm ci --prefix scripts
npm exec --prefix scripts -- tsx scripts/validate-render.ts <package-root> \
  --mode derived \
  --expected-profile authoring_draft \
  --expected-class <protocol-did> \
  --json
```

For protocol output, use `--mode protocol`. For a single source template, use `--mode template` with
`--expected-protocol` and `--expected-type`; template mode validates the pre-conformance template contract,
not a rendered `domain.md`. Run the regression suite with `npm test --prefix scripts` and the compiler gate
with `npm run typecheck --prefix scripts`.

## Required handoff

Return a concise run report containing:

- operation, mode, run ID, timestamp, and final state (`draft`, `persisted`, `partial`, or `blocked`);
- pinned specification and template source identities;
- output paths and, when persisted, exact write receipts and re-fetch evidence;
- validation commands, validator versions, results, warnings, and unresolved evidence gaps;
- assumptions approved by the user and all defaults applied;
- a controller checklist for registration, anchoring, governance approval, and optional publication.

Use the stop codes in the authoring guide. A blocked or partial run is a valid outcome; hiding the gap is not.
