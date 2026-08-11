# Canvas recipes

Use these recipes as adaptive patterns, not rigid templates. Start with the smallest subset that advances the user's intent. All generated content must retain provenance.

## Common opening

Every canvas begins with:

1. `outcome`: the changed state the Topic should produce;
2. one recipe-specific working block that creates immediate leverage; and
3. `next-action`: the first concrete move.

A compact context callout may appear between the outcome and working block when the user's rationale or a critical constraint would otherwise be lost.

## Decision

Purpose: reach and explain a consequential choice.

Primary sections:

1. Decision to make
2. Outcome and decision deadline, when explicit
3. Options
4. Criteria
5. Evidence and assumptions
6. Recommendation or current view
7. Decision and next actions

Start with:

- a one-sentence decision question;
- known options only;
- 3–5 criteria only when explicit or clearly proposed as editable suggestions;
- the uncertainty most likely to change the choice.

Do not invent weights. Do not create fake precision. Keep recommendation separate from decision.

Progressively reveal:

- scenario analysis;
- stakeholder preferences;
- sensitivity analysis;
- dissent and minority view;
- provenance and decision record;
- verification or settlement.

## Research

Purpose: answer a bounded question with inspectable evidence.

Primary sections:

1. Research question
2. Answer standard
3. What is already known
4. Unknowns and hypotheses
5. Evidence map
6. Findings
7. Synthesis and implications

Start with the question, the decision or action the answer will inform, and the two most important unknowns.

Distinguish:

- user-provided facts;
- assumptions;
- retrieved sources;
- interpretations;
- unresolved uncertainty.

Progressively reveal methods, source quality, contradiction handling, and research log.

## Proposal

Purpose: produce a recommendation or artifact intended to persuade, align, or secure approval.

Primary sections:

1. Desired change
2. Audience and decision sought
3. Problem or opportunity
4. Proposed approach
5. Value and evidence
6. Trade-offs and risks
7. Draft, review, and approval

Start with the audience, the action they should take, and the strongest value proposition supported by the user's context.

Do not write a full polished proposal before the audience, decision sought, and constraints are understood. A useful first move may be a one-page narrative skeleton.

## Project

Purpose: coordinate work toward an outcome.

Primary sections:

1. Outcome and conditions of done
2. Scope
3. Workstreams or milestones
4. Immediate actions
5. Owners and dependencies
6. Risks and decisions
7. Progress and completion

Start with outcome, 2–5 completion conditions, and the next 3 actions. Do not build a large task hierarchy until the work requires it.

Use due dates and owners only when explicit or accepted.

## Evaluation

Purpose: assess an object, person, claim, application, proposal, or option against a standard.

Primary sections:

1. Evaluation question
2. Object and decision consequence
3. Criteria or standard
4. Evidence required
5. Findings by criterion
6. Exceptions and uncertainty
7. Judgment and next action

Start with the evaluation consequence and the evidence standard. Keep evidence, analysis, recommendation, and final judgment separate.

For people-related evaluation, avoid unsupported sensitive inferences and require human decision authority.

## Incident

Purpose: contain, understand, and resolve an urgent failure.

Primary sections:

1. Current impact
2. Status and incident lead, when explicit
3. Immediate containment
4. Timeline
5. Hypotheses and evidence
6. Recovery actions
7. Resolution and retrospective

Start with impact, what is known now, and the safest immediate containment action. Do not delay action to perfect the documentation.

Keep facts, hypotheses, actions, and decisions visibly distinct. Time-stamp material updates.

## Flow

Purpose: turn repeated work or expertise into an executable, reusable process.

Primary sections:

1. Outcome and customer
2. Trigger
3. Inputs and prerequisites
4. Steps and roles
5. Decision and quality gates
6. Exceptions and escalation
7. Outputs, measures, and reuse

Start by asking what successful output another person could reliably receive. Then capture one representative execution before abstracting the process.

Progressively reveal agent assignment, tools, permissions, claims, evaluation, credentials, payments, and publication as a Blueprint or POD.

## Discussion

Purpose: build shared understanding or alignment before a clearer decision or plan exists.

Primary sections:

1. Purpose
2. Framing question
3. Perspectives
4. Themes and tensions
5. Emerging agreements
6. Open disagreements
7. Decisions or next steps

Start with one framing question and the output expected from the discussion. Promote decisions, tasks, evidence, and branches as they emerge rather than forcing them at creation.

## Rendering to BlockNote today

The composition contract uses neutral block categories so it can render through the current editor without waiting for new custom blocks.

Suggested mapping:

| Composition block | BlockNote rendering |
| --- | --- |
| `heading` | heading block with level property |
| `paragraph` | paragraph block |
| `bullet-list` | bullet list items |
| `checklist` | checklist items |
| `table` | table block or structured fallback |
| `callout` | paragraph/callout supported by the current editor package |
| `divider` | divider or empty paragraph fallback |

Persist `semanticRole`, `basis`, `visibility`, and composition IDs in supported block properties or adjacent metadata managed by the canvas adapter. Do not encode critical semantics only in visual formatting.

## Progressive disclosure rules

Keep these visible on first open:

- outcome;
- the principal working object;
- one uncertainty or risk when material;
- next action.

Reveal the rest when:

- the user adds evidence;
- another participant joins;
- a decision becomes ready;
- work repeats and suggests a Flow;
- the outcome requires verification, credentials, payment, or governance.
