# User checkpoint patterns

Use these patterns for conversational updates. Replace every bracketed field. Omit a field only
when it genuinely does not apply. Keep artifact identifiers and file links under `Audit trail`.

When the run has a visual surface — the Outcome Graph portal app, embedded at
`/domain/<entityDid>/app/outcome-graph` — add one line to `Audit trail`:

```
View live: /domain/<entityDid>/app/outcome-graph
```

Omit it when there is no such surface, as in a local Claude Code run. The app shows the same
counts in the same order as the run totals below, so a user moving between the conversation
and the canvas is reading one run, not two accounts of it.

## Run brief

### Outcome Graph - Phase 1 of 7: Set the goal (`SOURCE_ACCEPTED`)

**Why:** [Decision or outcome claim this run will clarify.]

**What we will produce:** [Immediate output], followed by [likely later deliverables]. This is
[a diagnostic run / an issuance-targeted run]; [state what is not implied].

**How:** Read the theory, map its causal paths, connect evidence, validate the graph, route human
decisions, and only then evaluate or issue eligible claims.

**Who:** You [supply/confirm X]. The pipeline [extracts/checks Y]. [Reviewer or issuer] must decide
[governed action], if the run reaches that gate.

**When:** We are starting phase 1. [Phases that can proceed now]. Later phases depend on [evidence,
review, external authority].

**Where:** Source: [source description or count]. Durable run: `[runs/<workflow_id>/]`. External
systems: [none yet / named system later].

**How much:** [source count], [provisional target outcome count], target tier [provided / not yet
set]. Cost or effort: [known value / not estimated from available information].

**Control status:** Committed state `[MACHINE_STATE]` at manifest revision [N]. Reconciliation
[reconciled / mismatch]. Draft outputs [none / short list].

**Your next action:** [One instruction, or `No action needed - I am continuing to phase 2.`]

## Phase checkpoint

### Phase [N] of 7: [Friendly phase] (`[MACHINE_STATE]`)

**Why this step matters:** [One sentence.]

**What happened:** [Outcome-oriented summary.]

**Key results:**

- [Most decision-relevant count or finding.]
- [Strongest supported path or result.]
- [Most important ambiguity, evidence gap, or disclosure.]

**Control status:** Committed state `[MACHINE_STATE]` at manifest revision [N]. Reconciliation
[reconciled / mismatch]. [No uncommitted work / Draft outputs and why they are not committed.]
When draft work exists, show committed and uncommitted counts separately.

**What this means:** [Plain-language consequence for the intended claim or decision. Translate
technical status and tier language.]

**Your next action:** [One explicit action and a response example, or `No action needed - I am
continuing to phase [N+1].`]

**What happens next:** [Next phase and its advancement condition.]

**Audit trail:** [Up to four relevant artifact links.]

## Governed decision checkpoint

### Phase 6 of 7: Make the governed decision (`REVIEW_REQUIRED`)

**Status:** Paused for [reviewer role]'s decision. This is [not a failure / not completion]; the
pipeline cannot advance until the decision is recorded.

**Control status:** Committed state `REVIEW_REQUIRED` at manifest revision [N]. Reconciliation
[reconciled / mismatch]. Draft outputs [none / short list].

**Decision requested:** [Exact decision in plain language.]

**Recommendation:** [Recommended option and evidence-based reason.]

**If approved:** [Consequence and attainable claim scope.]

**If deferred:** [Missing evidence or condition and who can provide it.]

**If rejected:** [What changes or is excluded.]

**Your next action:** Reply with `[exact response shape]`, or provide `[named artifact]`. If you are
not the authorized reviewer, name or route this packet to `[reviewer role]`.

**Resume:** Use `--resume <workflow-id>` after the decision or evidence is available.

**Audit trail:** [Review packet], [validation report], [state record].

## Final or paused handoff

### Outcome Graph result - [status]

**Outcome:** [One sentence describing what the run established.]

**Claim readiness:** [Attainable tier in plain language, exact certificate scope if any, and what
the run explicitly does not establish.]

**Strongest basis:** [Most credible path and evidence.]

**Primary constraint:** [Highest-priority blocker or disclosure.]

**Next owner and action:** [Person or role] should [one action].

**Committed totals:** [sources], [propositions], [nodes], [edges], [evidence links], [gaps],
[passes], [warnings], [failures], [blockers].

**Uncommitted work:** [none / draft propositions, nodes, edges, findings, and the criterion that
blocked commitment].

**Control status:** Manifest revision [N]. Reconciliation [reconciled / mismatch].

**Audit trail:** [State], [ToC extraction], [causal graph], [evidence graph], [validation report],
[review packet or certificate as applicable].
