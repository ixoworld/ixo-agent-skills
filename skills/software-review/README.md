# Software review skills

A small pack for AI-guided authoring of bounded specialist review asks for software
and agents, informed by the public [IXO developer page](https://asks.ixo.world/developers)
(canonical link in the retrieved page: [IXO Expert Reviews](https://reviews.ixo.world/developers)).
It supports human judgement and repeatable follow-up. It does not approve releases,
post asks, run evaluators, authorise payment or settle funds.

## Selection and coverage

| Canonical skill | Kind | Coverage |
| --- | --- | --- |
| [software-review-scenario-planning](software-review-scenario-planning/SKILL.md) | Original IXO adapter | Scenario selection, evaluation planning, expert findings to regression and bounded follow-up. |
| [software-review-agent-review](software-review-agent-review/SKILL.md) | Original IXO adapter | Observable tool trajectories, privacy, safety and authority boundaries on authorised fixtures. |
| [software-review-accessibility-review](software-review-accessibility-review/SKILL.md) | Adapted upstream SKILL.md import | Accessibility/usability; localisation reference covers language, culture, device/connectivity and assistive technology. |
| [software-review-performance-review](software-review-performance-review/SKILL.md) | Adapted upstream SKILL.md import | Controlled performance, usage/cost, variance and correctness; comparable competitor conditions only when alternatives are identified. |

Two actual upstream skills are imported in adapted form. Two original IXO workflows
use scenario/documentation/code references and are **not** vendor SKILL.md imports.
Select dimensions only when relevant. Localisation and regression are supporting
references instead of overlapping standalone skills.

Each skill has a local `references/ask-contract.md` so independent capsules are
self-contained; tests require identical copies. Every ask requires defined user/task,
build/environment, scope, success/failure, evidence, reviewer qualifications,
permissions, payment and follow-up terms. Missing inputs stay explicit. Observation,
interpretation, authoritative evaluation, payment authorisation and settlement stay
separate. No automated accessibility certification or arbitrary production testing.

## Provenance and licenses

[Source catalog](software-review-scenario-planning/references/source-catalog.json) records all 15 candidates, full revisions,
observed root licenses, inspected paths, selection decisions and limitations.
Each skill's `PROVENANCE.json` records selected exact paths, commit, Git blob,
SHA-256, license path, bundled license, upstream identity and modifications.
Downloaded source/license bytes were checked against pinned Git blob IDs.
Ancestor licenses/NOTICE paths were inspected; no additional applicable NOTICE was
found for selected paths. No upstream endorsement is implied.

| Selected upstream | Exact revision | Use / license |
| --- | --- | --- |
| [Anthropic knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/tree/33d3dea41a341b341d4f5da2e8801ae0c89be2b8) | `33d3dea41a341b341d4f5da2e8801ae0c89be2b8` | Accessibility skill adaptation; Apache-2.0. |
| [Addy Osmani agent-skills](https://github.com/addyosmani/agent-skills/tree/aeac41d4d005999432bb7312f7ff06383a91d59d) | `aeac41d4d005999432bb7312f7ff06383a91d59d` | Performance skill adaptation; MIT. |
| [Microsoft scenario library](https://github.com/microsoft/ai-agent-eval-scenario-library/tree/04fc731937cd2bb8b9ef5195540c6f53914f52a5) | `04fc731937cd2bb8b9ef5195540c6f53914f52a5` | Original adapter source concepts; MIT. |
| [Microsoft eval-guide](https://github.com/microsoft/eval-guide/tree/7a22a8957ced79a35fd7b4634fd5b5eac56c308e) | `7a22a8957ced79a35fd7b4634fd5b5eac56c308e` | Planning/findings concepts; MIT. |
| [LangChain agentevals](https://github.com/langchain-ai/agentevals/tree/946ad15b9f2ce9bc9843edd2bb773bd07d78ca7e) | `946ad15b9f2ce9bc9843edd2bb773bd07d78ca7e` | Python trajectory semantics, including Python-scoped MIT license; no code imported. |

Original IXO adapters use Apache-2.0 with upstream MIT notices retained. The
performance import retains MIT and its copyright notice; the accessibility import
retains Apache-2.0. Full license texts travel with every skill. Entry points and
provenance mark modifications. The accessibility adaptation corrects the source's
44px criterion to AAA and removes its unsupported automated-coverage percentage.

## Deferred and excluded candidates

Waza, AWS sample-agent-skill-eval, OpenEvals and rubric-eval are future harness
options; installation/evaluator execution is outside this pack. The wshobson,
magnus919 and charlieviettq collections add overlapping roles; sebastianwessel's
spec review serves a different implementation workflow. Their pinned README/tree/
root-license evidence is recorded without claiming per-file clearance or importing
content. No upstream install script, tool, evaluator or paid external model was run.

`darkrishabh/agent-skills-eval` and `microsoft/skills` are excluded: network timeouts
prevented pinning/reading source and applicable licenses. Licensing is unverified
here; no content was used and no license assumed.

## Validation and namespace dependency

This pack depends on the **separate namespace discovery/packaging change** in task
`01a16b73-44dc-76e2-89f2-2aca4fd9600a`. No pipeline implementation is included here.
Do not merge until that dependency supports these leaf paths. Current main treats
`skills/software-review` as one skill: validation fails and publication would
package the container incorrectly. Archives must contain one canonical skill root
with its resources, without a namespace wrapper or siblings.

From the repository root:

```bash
for skill in skills/software-review/software-review-*; do
  bash scripts/validate-skill.sh "$skill"
done
python3 -m unittest discover -s skills/software-review/software-review-scenario-planning/tests -v
```

Maintainer fixtures/tests and the source catalog live inside the planning skill,
so all non-documentation resources have a leaf owner. The offline suite checks four authored complete candidates, 19 insufficient/unsafe/
misattributed variants, CLI error behavior, local references, contract copies,
source/license identity and four canonical tar archive dry runs. The archive smoke
test checks layout and does not duplicate namespace discovery/publication logic.

[Behavior fixtures](software-review-scenario-planning/evals/behavior-cases.json) contain seven prompts/assertions;
these are **not executed model evaluations**. Deterministic checks validate
candidate structure/resources, not model adherence, permission truth or product
correctness. [Verification](VERIFICATION.md) records exact commands, results and
skipped/blocked checks.
