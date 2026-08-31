# Canonical Topic Kind index

Kind-specific composition now lives in independently loadable sub-skills. The parent skill routes to exactly one of them:

| Kind | Base Recipe | Sub-skill |
| --- | --- | --- |
| `project` | `project` | [Project](../subskills/compose-topic-project/SKILL.md) |
| `task` | `project` | [Task](../subskills/compose-topic-task/SKILL.md) |
| `agent_task` | `flow` | [Agent Task](../subskills/compose-topic-agent-task/SKILL.md) |
| `proposal` | `proposal` | [Proposal](../subskills/compose-topic-proposal/SKILL.md) |
| `evaluation` | `evaluation` | [Evaluation](../subskills/compose-topic-evaluation/SKILL.md) |
| `claims` | `claims` | [Claims](../subskills/compose-topic-claims/SKILL.md) |
| `question` | `research` | [Question](../subskills/compose-topic-question/SKILL.md) |
| `discussion` | `discussion` | [Discussion](../subskills/compose-topic-discussion/SKILL.md) |
| `incident` | `incident` | [Incident](../subskills/compose-topic-incident/SKILL.md) |

Use this file as a compatibility index only. Read the chosen sub-skill for the complete composition rules.

Project Type is optional configuration, not another Kind. Software Build and Blueprint Design use pinned Topic Recipes; Generic Project has no `topicRecipeRef`.

Custom labels extend exactly one base Kind. The canonical Job Profile remains a Task specialization with Base Recipe `project`; it does not become another protocol Kind.

`Thread` remains virtual Portal presentation and must not be persisted.
