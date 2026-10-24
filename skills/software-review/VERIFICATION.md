# Verification record

Base: `ixoworld/ixo-agent-skills` main
`fb3d3bfb294a2447fa3e7dc7434dd8b1194bf7fb`. Only this namespace is changed.
Research downloads and the independent bare repository are outside this worktree
and are not included in the PR. No private repository content, credentials or
actual user data is included. All ask fixtures are synthetic.

## Completed offline checks (at `e3dfe82`)

- Repository validator: `bash scripts/validate-skill.sh <leaf-path>` — 4/4 pass.
- Local skill-creator `scripts/quick_validate.py <leaf-path>` with cached
  PyYAML 6.0.2 — 4/4 pass.
- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/software-review/software-review-scenario-planning/tests -v`
  — 8 tests pass, including 4 complete authored candidate asks, 19 negative
  variants, CLI valid/incomplete/malformed JSON behavior, local references,
  identical contract copies, source/license identity, and 4 canonical tar dry runs.
- Ruff 0.15.12 `check --no-cache skills/software-review` and
  `format --check --no-cache skills/software-review` — pass.
- `git diff --check` — pass.
- Pinned source/README/license downloads were compared with GitHub's recorded
  Git blob IDs before adaptation. Exact selected paths and SHA-256 hashes are
  in per-skill `PROVENANCE.json`. All 13 pinned candidate README/root-license
  files also passed blob verification. Two candidates remain excluded/unverified.

## Namespace integration

Current-main container validation was run explicitly:
`bash scripts/validate-skill.sh skills/software-review` exits 1 because the
namespace intentionally has no `SKILL.md`. This is the known dependency, not a
leaf frontmatter defect. The legacy publisher was not run.

The pending namespace task's public helper was used **read-only** against this
worktree. Its `validate` command passes for all **35 independent skill identities**
(31 existing + 4 new), including global name uniqueness. No helper/workflow files
were copied into this PR. The helper's SHA-256 for this run was
`744f2413fd4464643edf8b4ea0089732ecc2c561b973649373bc567ed6a677be`.

Read-only integration commands (helper supplied by the separate infrastructure
checkout; output paths are local evidence, never an upload):

```bash
python3 "$NAMESPACE_HELPER" --repo "$PACK_REPO" validate
python3 "$NAMESPACE_HELPER" --repo "$PACK_REPO" plan \
  --base fb3d3bfb294a2447fa3e7dc7434dd8b1194bf7fb --head HEAD \
  --output "$EVIDENCE/namespace-plan.json"
python3 "$NAMESPACE_HELPER" --repo "$PACK_REPO" package \
  --plan "$EVIDENCE/namespace-plan.json" \
  --output-dir "$EVIDENCE/capsules" --manifest "$EVIDENCE/capsule-manifest.json"
```

The plan selected exactly 4 leaves, version `1.0.0`, namespace `software-review`,
with no removals. README/verification were classified as namespace documentation.
Packaging produced 4 independent local archives. Tar inspection confirmed:

| Skill | Files | Result |
| --- | --- | --- |
| Accessibility review | 6 | Canonical root, entrypoint, resources/licenses, no siblings. |
| Agent review | 7 | Canonical root, entrypoint, resources/licenses, no siblings. |
| Performance review | 5 | Canonical root, entrypoint, resources/licenses, no siblings. |
| Scenario planning | 13 | Canonical root, fixtures/tests/resources/licenses, no siblings. |

All manifests have `status: packaged` and `cid: null`; no publish command ran.
This uses an unmerged helper snapshot, so it is provisional dependency integration
evidence rather than a claim that current-main CI supports namespaces.

## Skill optimisation patch (2026-10-24)

Review fixes applied on top of `e3dfe82`: per-skill checker copies with
`--template`, a typed ask shape in the contract, trigger-oriented descriptions,
leaner SKILL.md bodies, and behaviour evals moved to skill-creator case folders.
Checks run on the patched tree:

- `bash scripts/validate-skill.sh <leaf-path>` — 4/4 pass (descriptions 790–855 chars).
- skill-creator `scripts/quick_validate.py <leaf-path>` with PyYAML 6.0.2 — 4/4 pass.
- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/software-review/software-review-scenario-planning/tests -v`
  — 11 tests pass. With the previous `check_ask.py` copied into every skill, 7
  subtests fail (template, null `planned_actions`, reordered sources, broad target).
- Ruff 0.15.12 `check` and `format --check` on `skills/software-review` — pass.
- `git diff --check` — pass.

Not re-run: the namespace helper (it lives in the separate infrastructure
checkout), so the per-archive file counts above are for `e3dfe82`. Each archive
now also carries `scripts/check_ask.py` and that skill's `evals/` cases. The seven
behaviour evals were not run against a model.

## Limits and skipped checks

- Seven behavior prompts/assertions are supplied as `evals/<case>/` folders in
  the skills they exercise; no external model was run. Candidate structure
  checks do not prove model adherence, factual permission or product quality.
- No paid model evaluations, upstream installers/evaluators, target tests,
  production scans, live capsule uploads, merges or deployments were performed.
- `darkrishabh/agent-skills-eval` and `microsoft/skills` commit lookup timed out.
  Their exact source/license is unverified; neither contributes content.
- Exact-head GitHub CI is checked after opening the draft PR. The unchanged
  current-main workflow is expected to need the namespace infrastructure change.
