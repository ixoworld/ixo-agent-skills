# Namespaced skills

Existing `skills/<name>/SKILL.md` packages keep their canonical name and archive
layout. New skills can be grouped in namespace containers:

```text
skills/
  software-review/
    README.md
    software-review-security-review/
      SKILL.md
      scripts/
      references/
    software-review-quality-review/
      SKILL.md
```

The container has **no SKILL.md**. Each independent leaf has a globally unique
canonical name matching its folder, including the namespace prefix. Names still
use 1–64 lowercase alphanumeric characters and single hyphens. Nested namespaces
are supported: `skills/software/review/software-review-security/` has namespace
`software/review` and canonical name `software-review-security`.

Example leaf frontmatter (an authoring example, not an installed review skill):

```yaml
---
name: software-review-security-review
description: Review software changes for security issues.
metadata:
  namespace: software-review
  version: "1.0.0"
---
```

`metadata.namespace` is derived from the source path and inserted into namespaced
capsules if omitted. If supplied, it must match the path. Flat capsules remain
byte-for-byte unchanged by packaging. Version records `metadata.version`, or
`null` when omitted; the tooling does not invent a version. Namespace is organizational
metadata: it grants no permissions and adds no registry filter or runtime schema.

All resources must live inside their owning skill. Namespace Markdown/text files,
including an otherwise empty namespace's README, are documentation and do not
publish capsules. Orphan scripts/assets fail validation. Namespace documentation
is not copied into child capsules; duplicate needed resources inside each leaf.

An independent skill cannot contain another independent skill root. Existing
`<skill>/subskills/**/SKILL.md` files remain bundled instructions owned and
published by the parent skill. They are not namespace members. Changes to their
scripts, prompts or instructions select the parent capsule.

## Local checks and dry runs

Use Python 3.9 or later and install the small validation dependency:

```bash
python3 -m pip install -r scripts/requirements.txt
python3 -m unittest discover -s tests -v
python3 scripts/skill_catalog.py validate
./scripts/validate-skill.sh skills/software-review/software-review-security-review
python3 scripts/skill_catalog.py plan --base BASE_SHA --head HEAD --output .publication/plan.json
python3 scripts/skill_catalog.py package --plan .publication/plan.json --output-dir .publication/archives --manifest .publication/manifest.json
```

`validate` checks every identity, namespace, root and canonical-name collision.
`validate-skill`, planning and packaging also check the selected skills' content,
including description length and string-only `allowed-tools`. This keeps existing
catalog identities compatible without making unrelated old content issues block
every namespace change. `validate --all-content` audits unchanged content too.
The shell wrapper accepts existing flat skills and examples as before.

Both workflows run this test suite when skills, helpers, tests or workflows change.
PRs only dry-run packaging. A helper-only change runs checks
and produces an empty publication plan.
Branch pushes and PR events cannot publish: the publisher's trigger and job guard
both require a push to this repository's `main` branch.
The push publisher uses the entire
`github.event.before` → `github.sha` range, not just the last commit. Missing,
unavailable or all-zero base SHAs fail explicitly. Restore the comparison commit
before retrying; the publisher never guesses a range or publishes the full catalog.

Change detection uses both the base and current trees. A script-only change, a
resource deletion or a bundled-subskill edit selects its owning skill. Renames
report both the old source and the new leaf. Removing a skill is recorded in
`removed`; it **does not retire or delete an existing registry capsule**. Retirement
requires a separate, explicitly authorized operation.

Each archive contains only `<canonical-name>/SKILL.md` and that skill's resources,
including bundled subskills. Siblings and namespace documentation are excluded.
Tracked files and non-ignored new resources are included; ignored local files and
symlinks are excluded or rejected. Existing skill paths are not relocated.

## Publication records

The workflow stores plan, package and result JSON as repository-scoped Actions
artifacts. Entries map `source_path`, `namespace`, `canonical_name`, `version`,
archive and returned `cid`. A packaged dry run has `cid: null`; successful uploads
add the returned CID. Removal records remain in the same artifact for review.

Only the explicit `publish` command uploads planned archives to the configured
registry. PR checks validate and package without uploading. Uploads are not
automatically retried. If a response fails or lacks a CID, inspect the result
mapping and registry before retrying because the upload may already have succeeded.
