# Protocol and template separation

Keep a protocol's own operating files separate from the blueprints used to create derived domains.

## Trust model

| Property | Protocol-self files | Derived-domain templates |
| --- | --- | --- |
| Purpose | Describe and govern the protocol entity | Define parameterized inputs for a derived domain |
| Typical type | `protocol` | `x-template.instantiates_type` such as `project` |
| Typical location | protocol root and `docs/` | `templates/<derived-type>/` |
| Template suffix/marker | Neither | `.tmpl` and `x-template.is_template: true` |
| Render input | Never | Yes, after identity and integrity verification |
| Metadata use | Exact protocol metadata may locate/authenticate the bundle | Manifest and file identities drive rendering |

The prohibition is against using protocol-self content as instance content. Reading an exact protocol
metadata record only to authenticate the protocol DID, compatible types, or immutable template-manifest
locator is allowed when necessary and recorded. Do not broaden that read into its descriptions, controllers,
accounts, rights, or operational documents.

## Layout contract

Confirm the actual deployment layout before relying on these conventional paths:

```text
<protocol-root>/
├── domain.md
├── docs/
│   ├── description.md
│   ├── changelog.md
│   └── specification.md
└── templates/
    ├── manifest.yaml
    ├── project/
    │   ├── domain.md.tmpl
    │   ├── description.md.tmpl
    │   └── charter.md.tmpl
    └── asset/
        ├── domain.md.tmpl
        ├── description.md.tmpl
        └── dossier.md.tmpl
```

## Template marker

Require a marker equivalent to:

```yaml
x-template:
  is_template: true
  instantiates_type: "project"
  protocol: "did:ixo:entity:protocol:verified-services"
  template_version: "1.0.0"
  parameters:
    - name: "name"
      type: "string"
      required: true
      fill_at: "author"
```

Require `instantiates_type` to be a non-protocol type. Require `protocol` to equal the pinned protocol DID.
Strip the entire block from every rendered output.

## Template manifest

Use the manifest as the selected bundle's allowlist:

```yaml
template_manifest:
  protocol: "did:ixo:entity:protocol:verified-services"
  protocol_version: "1.0.0"
  bundles:
    - derived_type: "project"
      bundle_version: "1.0.0"
      files:
        - role: "domain.md"
          path: "templates/project/domain.md.tmpl"
          cid: "bafy..."
          required: true
        - role: "description"
          path: "templates/project/description.md.tmpl"
          cid: "bafy..."
          required: true
        - role: "manifest"
          path: "templates/project/charter.md.tmpl"
          cid: "bafy..."
          required: true
          manifest_type: "charter"
```

Do not require a manifest to contain its own CID. After persistence, use the returned manifest CID as the
bundle anchor. If a portable `bundle_digest` is needed, define and version a canonicalization algorithm in
the deployment contract; never improvise one during a run.

## Identity gate

Require every selected template to pass all checks:

1. Its normalized logical path is below `templates/<derived-type>/`; reject absolute paths, `..`, symlinks,
   encoded traversal, duplicate normalized paths, and case-colliding paths.
2. Its filename ends in `.tmpl`.
3. Its parsed frontmatter has `x-template.is_template: true`.
4. Its `instantiates_type` equals the selected derived type and is not `protocol`.
5. Its `protocol` equals the pinned protocol DID.
6. Its bytes match the manifest CID or digest.
7. Its role is declared once and all required manifest roles are present.

Halt on any disagreement. Do not search for a similarly named fallback and do not use protocol-self files.

## Deterministic rendering

For each allowlisted template:

1. Parse frontmatter safely; do not execute template content or embedded code.
2. Substitute only declared parameters. Escape or quote values according to the destination syntax; do not
   use blind text substitution for structured YAML values.
3. Reject unresolved author-time and unknown placeholders. Convert safe draft identities to `urn:uuid:` and
   unavailable persistence/anchor receipts to `null`; record other publish-time inputs in the run report.
4. Remove `x-template`, remove `.tmpl`, set the pinned class and selected type, and preserve all other
   spec-valid instance content.
5. Verify that output paths remain inside the run staging root and that no two outputs collide.
6. Generate the documents model, changelog, and summaries according to the pinned spec.

## Provenance contract

Write provenance without secrets. Include at minimum:

```yaml
provenance:
  run_id: "<unique-run-id>"
  state: "authoring_draft"
  specification:
    locator: "<path-cid-or-versioned-url>"
    revision: "<revision>"
    digest: "sha256:<digest>"
  instantiated_from:
    protocol: "did:ixo:entity:protocol:verified-services"
    protocol_metadata_cid: "<optional-exact-metadata-cid>"
    template_manifest:
      locator: "<immutable-locator>"
      cid: "<manifest-cid>"
    derived_type: "project"
    templates:
      - role: "domain.md"
        path: "templates/project/domain.md.tmpl"
        cid: "<template-cid>"
        template_version: "1.0.0"
  render:
    parameters_digest: "sha256:<non-secret-canonical-parameter-digest>"
    draft_domain_id: "urn:uuid:<uuid>"
    unresolved_publication_inputs: ["canonical domain DID", "document CIDs"]
  persisted: null
```

After persistence, update `state`, target namespace/path, document write receipts, `domain.md` CID, re-fetch
digests, validator results, and partial-failure details. Do not put tokens, credentials, or raw private
parameter values in provenance.

## Non-negotiable invariants

- Render only allowlisted templates; never protocol-self content.
- Use separate least-authority read and write grants when persistence is requested.
- Never mutate template sources during instantiation.
- Never allow template markers, `.tmpl` names, placeholder tokens, or fabricated CIDs in a rendered instance.
- Never claim persisted, anchored, canonical, or public state without matching evidence.
