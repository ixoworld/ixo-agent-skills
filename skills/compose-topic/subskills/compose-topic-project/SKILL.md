---
name: compose-topic-project
description: Compose a Project Topic when the outcome is delivered through coordinated milestones and reviewed child Topics; do not use for one bounded deliverable.
license: Apache-2.0
metadata:
  parent-skill: compose-topic
  topic-kind: project
  base-recipe: project
---

# Compose Project

Use Project for multi-stage work whose progress is derived from named
milestones and linked child Topics. Use Task for one bounded human deliverable,
Agent Task for one bounded agent delivery, Deed when parties owe performance,
and Opportunity when nobody is bound and people may join or bid.

## Smallest useful Draft

Preserve the outcome verbatim or as a proposed statement. Initialise
`semantic.project` with `version: 1`; omit every value the person has not
supplied or accepted.

Ask only the smallest unresolved questions:

1. What exists when this is done? This is required for the Draft.
2. Who is the lead? This is required before setup can become effective.
3. What first named milestone would count as progress? This is optional.
4. Who may close the Project by accepting remaining risk? Ask, but never default.
5. If the outcome is contested, who resolves it? This is optional until a dispute exists.

The lead maintains the plan and progress narrative, identifies the current
blocking child obligation, and coordinates work. The lead does not thereby own
child work, confirm setup, accept milestones, close the Project, or resolve a
dispute.

## Work structure

Allowed child Kinds are Task, Agent Task, Proposal, Evaluation, Claims,
Incident, Question, and Discussion. Record listed work as unmet child
obligations unless the person explicitly reviews a child Draft and its Kind.
Never create a child automatically. Never create a recursive Project child; a
larger related Project uses an explicit relation and separate lifecycle.

Milestone suggestions are proposed recipe provenance and require acceptance.
Do not turn a heading, checklist item, issue, repository, or tracker project
into a milestone or Topic without review. A materialized milestone records
explicit or contextual accepted field provenance at
`/project/milestones/{index}`. A selected child Kind records the same at
`/project/childObligations/{index}/kind`.

## Lifecycle and Now

Project lifecycle is `proposed → effective → closing → closed`. Outcome, lead,
setup confirmation, optional configured assent, and configured time gates must
pass before work starts. Naming the lead only makes setup reviewable.

Use Project-aware Now intent:

- mine: “Assign a lead to this Project so its setup can be reviewed and confirmed.”
- theirs: “{name} needs to assign the Project lead before its setup can be confirmed.”
- unassigned: “This Project needs an authorised setup editor to assign its lead before setup can be confirmed.”
- after lead: “{confirmer} must review and confirm this Project’s setup before work can start.”

The host still derives viewer classification and the actual obligation from the
protocol projector. Do not author these sentences when the projected obligation
is different.

## Closing

The closer is an independent subject in `project.closer`.
Closing requires explicit remaining-risk acceptance bound to the effective
contract revision and digest, Shape digest, activation-policy digest, actor,
ability, authority proof, and recipe-required evidence.

A child success, Action receipt, evaluation, settlement, or external tracker
terminal state cannot close the Project.

## Project Type routing

Generic Project has no `topicRecipeRef`. Read exactly one additional sub-skill
when a matching Project Type is selected:

- [Software Build](../compose-project-software-build/SKILL.md)
- [Blueprint Design](../compose-project-blueprint-design/SKILL.md)
