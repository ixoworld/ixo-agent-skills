# Verification record

Base: `ixoworld/ixo-agent-skills` main
`fb3d3bfb294a2447fa3e7dc7434dd8b1194bf7fb`. Only this namespace is changed.
Research downloads and the independent bare repository are outside this worktree
and are not included in the PR. No private repository content, credentials or
actual user data is included. All ask fixtures are synthetic.

## Completed offline checks

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
were copied into this PR. Plan/package dry-run details will be recorded after
committing the pack so the helper can use an exact Git range.

## Limits and skipped checks

- Seven behavior prompts/assertions are supplied in the planning skill's
  `evals/behavior-cases.json`; no external model was run. Candidate structure
  checks do not prove model adherence, factual permission or product quality.
- No paid model evaluations, upstream installers/evaluators, target tests,
  production scans, live capsule uploads, merges or deployments were performed.
- `darkrishabh/agent-skills-eval` and `microsoft/skills` commit lookup timed out.
  Their exact source/license is unverified; neither contributes content.
- Exact-head GitHub CI is checked after opening the draft PR. The unchanged
  current-main workflow is expected to need the namespace infrastructure change.
