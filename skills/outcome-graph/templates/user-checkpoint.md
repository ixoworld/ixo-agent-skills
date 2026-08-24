# User checkpoint patterns

Read `references/user-guidance.md` before using these patterns. They are guides, not forms to fill
mechanically. Omit anything that does not help the user understand the causal story or decide what
to do next.

The normal response does not show machine states, manifest revisions, schema names, file paths,
commands, artifact identifiers, or raw run totals. If the user asks for them, add a short
`Technical details` section after the user-facing answer.

When the Outcome Graph canvas is available, render it after the written explanation. Do not list
its route in the main response or use the picture as a substitute for explaining what the graph
means.

## Starting the analysis

### Ready to understand [the outcome or decision]

[Say what source was accepted and what real-world question the analysis will examine. State
clearly that this begins an analysis, not a finding or certificate.]

[Summarise the early change story in two or three concrete sentences if the source makes it clear.
Use actors and verbs. If it is not yet clear, say what you will identify next.]

**What I will test next**

[Name the causal work in ordinary language: which changes are expected to lead to which outcome,
why that might happen, what conditions the story depends on, and what evidence could confirm or
challenge it.]

[If no action is needed: `You do not need to do anything yet. I will pause if a choice would
materially change the model.` Otherwise ask one precise question.]

## Learning checkpoint

### [Direct statement of what was learned]

[In two to four sentences, explain what changed in the analysis and why it matters for the user's
goal. Start with the result, not the work performed.]

When a causal path is the useful result, use this compact form:

1. [Action or condition] changes [the first observable response].
2. That could lead to [later outcome] because [mechanism in the real world].
3. The chain depends on [most important condition] and could be confused by [credible alternative
   cause, when relevant].

**Reality check**

[Distinguish what the source says, what the model proposes, what evidence shows, and what is still
unknown. Name the one uncertainty most likely to change the conclusion. Explain what observation
or comparison would reduce that uncertainty.]

**Next**

[Say what the analysis will do next. Ask for one user action only if a real decision or missing
input blocks progress. Include the exact reply needed when asking.]

## Decision checkpoint

### A decision is needed about [plain-language issue]

[Explain why this decision changes the causal interpretation or the strength of the claim. Name
the authorised role when authority matters.]

**The choice**

[Ask one answerable question.]

**What the evidence suggests**

[Give the recommendation and the strongest reason for it. Also state the strongest credible reason
to choose differently.]

**What each option changes**

- [Option 1]: [effect on the model, evidence need, or claim wording].
- [Option 2]: [effect on the model, evidence need, or claim wording].
- [Optional third option only when materially distinct].

**Next**

[Give the exact response format or name the evidence to provide. If this person is not authorised,
say who should receive the decision packet.]

## Final or paused handoff

### [What the analysis can and cannot establish]

[State the strongest conclusion in ordinary language. Make the boundary explicit: plausible story,
evidence of contribution, evidence that supports causation, or governed certificate.]

**Why**

[Explain the strongest causal pathway and the most credible evidence in a few sentences.]

**What limits the conclusion**

[Name the main assumption, alternative explanation, missing comparison, evidence gap, disclosure,
or authority requirement. Explain its real-world consequence.]

**Next**

[Name the person or role that owns one next action. If the analysis is complete for its stated
purpose, say so without inventing more work.]

## Optional technical details

Add this only when requested, when troubleshooting, or when an authority record must be inspected.
Keep it short.

### Technical details

- Run status: [friendly step and machine state]
- Saved record: [committed or draft status, with revision only if useful]
- Checks: [brief pass or blocker summary]
- Files: [up to four relevant links]
- Canvas: [/domain/<entityDid>/app/outcome-graph, only when available]
