# Canonical Topic kind templates

Use this reference whenever composing or refining a Topic. It is derived from
Topic Protocol `0.8.0` at the commit pinned in `source-lock.json`.

## Selection contract

Select the coordination behaviour before drafting fields:

1. Identify the user's primary coordination job, not merely nouns in the
   request.
2. Select exactly one standard base Kind and its fixed recipe.
3. Select a pinned Kind Profile only when the intent matches that profile's
   domain object and the exact profile document, schema, version, and digest
   are available.
4. Instantiate the selected template's draft structures. Populate only values
   supported by explicit or accepted context; represent unknown acceptance
   fields as focused questions or unresolved paths.
5. Validate the draft against the base Kind first, then any recognised profile.

Do not use a Kind for its icon, card layout, or a keyword alone. When two
behaviours are independently completable, split or branch instead of combining
their schemas.

## Standard templates

The recipe is fixed by the base Kind and cannot be overridden.

| Kind | Choose when the Topic primarily needs to | Recipe | Draft structures to initialise | Required before contract acceptance |
| --- | --- | --- | --- | --- |
| `task` | deliver a finite piece of accountable human or mixed work | `project` | outcome, plan with milestones, completion, target when explicit | intent, outcome, owner |
| `agent_task` | run bounded work by a resolved agent or flow, possibly on a schedule | `flow` | outcome, agent assignment list, activation/output/stop conditions, completion | intent, outcome, at least one resolved agent assignment |
| `proposal` | propose a change that another authority may approve | `proposal` | outcome, approval decision model, completion | intent, outcome, approval model |
| `evaluation` | compare or assess options/evidence against criteria to reach a decision | `evaluation` | outcome, decision question, criteria, method, deciders and approvers | intent, outcome, criteria and authority in the decision model |
| `claims` | organise a deed, claim collection, claim evidence, or claim decision path | `claims` | outcome, attachment or typed binding list, completion | intent, outcome, deed or claim-collection attachment/binding |
| `question` | investigate a question and produce an answer or research output | `research` | outcome describing the intended answer/output, open questions, completion | intent, outcome |
| `discussion` | deliberate or maintain shared context without a decision, task, or investigation yet | `discussion` | completion placeholder; temporal mode when known; closure definition when finite; review point when ongoing and explicit | intent; finite discussions also require a closure rule |
| `incident` | contain, respond to, and close an urgent failure or harmful condition | `incident` | response owner when known, completion/closure conditions, Impact-only risk list | intent, response owner, closure conditions |

All accepted contracts must contain intent. Outcome requirements in the table
come from Topic Protocol `contractCompleteness`. Drafts remain partial and may
omit unresolved values.

### Task

Use for a deliverable, implementation, launch, migration, repair, or other
finite accountable work. Initialise `plan.milestones`, even when it is empty.
Put the overall target in `outcome.target`; milestone dates belong on their
milestones. Do not invent the owner or dates.

Do not select Task when the main output is an answer (`question`), approval of
a proposed change (`proposal`), comparative judgement (`evaluation`), or urgent
containment (`incident`).

### Agent Task

Use only when the requested result is bounded agent work and the draft can
state purpose, output, activation mode, and stop condition. A suggested agent
role belongs in `collaborationSuggestions` until the host resolves a stable
agent participant, role, and capabilities. An accepted Agent Task requires a
real `semantic.agents` assignment.

Kind selection never creates a schedule, raw cron string, Action handler,
Temporal ID, grant, or successful run. Profile v2 Action references may be
used only from a verified Action manifest supplied by the host.

### Proposal

Use when the primary object is a proposed change. Initialise `decision` as an
approval model: the proposal question, available approval choices or rule,
method `approval` when appropriate, and authority. Empty authority arrays are
allowed in a Draft and must remain visibly unresolved.

Do not mark an option selected without an authorised decision record.

### Evaluation

Use when the work is to assess, verify, score, compare, or choose using
criteria. Initialise `decision.question`, `options`, `criteria`, `method`, and
`authority`. Do not fabricate weights, options, evaluators, or thresholds.
When using `weighted_score`, every criterion has a weight and the weights sum
to 1.

### Claims

Use when the Topic coordinates a deed, claim collection, claim evidence, or a
claim decision. Initialise `attachments` for reference-only deed or
claim-collection bindings. A reference does not grant access to bytes or the
referenced resource.

Do not infer eligibility, approval, evaluation, settlement, or payment from a
Claims Topic. Those require their own governed records and authority.

### Question

Use when the durable outcome is an answer, finding, diagnosis, or research
artifact. State the intended answer/output in `outcome.statement`. Put
subsidiary unknowns in `questions`; do not turn every open question in another
kind into a Question Topic.

### Discussion

Use only when conversation and shared understanding are the current job and
there is not yet a more specific decision, task, proposal, evaluation, or
question. Initialise `completion` as an empty object when the closure mode is
not known. Select `finite` with `completion.definition`, or `ongoing`, only
when supported by the request or accepted context. Do not invent an outcome or
temporal mode merely to make the contract look complete.

### Incident

Use for an active or reviewable failure requiring containment, response, and
closure. Initialise `risks`, including an empty list when none are known. Each
risk has description, status, optional Impact, owner, and mitigation. Missing
Impact means `Unassessed`; never add likelihood or default Impact to Medium.

Risks are normally omitted from every other standard template.

## Custom labels and Kind Profiles

A custom Kind is a namespaced label over one standard base Kind. The base Kind
still determines recipe, lifecycle, acceptance, authority, generic rendering,
and safe fallback behaviour.

When a verified Kind Profile is selected, emit all three together:

- `kindRef`: custom ID, label, and standard `baseKind`;
- `kindProfile`: exact profile ID, version, schema URI, and SHA-256 digest; and
- `kindResource`: a typed, versioned resource whose `profile` equals the same
  exact reference.

Never invent a profile from a label. Unknown profiles must remain lossless,
must fall back to their base Kind, and must not enable profile-specific
acceptance, completion, automation, or privileged actions.

## Canonical Job profile

Select the first-party Job profile only for a digital job card or work order,
not for every Task or every use of the word "job".

```json
{
  "kindRef": {
    "source": "custom",
    "customId": "org.ixo.job-card",
    "label": "Job",
    "baseKind": "task"
  },
  "kindProfile": {
    "id": "https://topic-protocol.ixo.world/profiles/job-card",
    "version": "1.0.0",
    "schema": "https://topic-protocol.ixo.world/schemas/topic-kind-profile.schema.json",
    "digest": "sha256:0991eb565e1253c5caf92e7f06a392edacda6d9d90c3b3111ebfa6bf65b8eaf5"
  }
}
```

The bound Job Card resource uses type `org.ixo.job-card`, version `1`, and the
same profile reference. Initialise its `value` with only known fields:

- required envelope: `version: 1`, `type: org.ixo.job-card`, and stable `id`;
- optional draft fields: job number, phase, priority, instructions, scheduled
  window, site, asset, requester, and assignees;
- required before profile-aware acceptance: `jobNumber` and `phase`, in
  addition to the base Task acceptance fields.

Valid phases are `requested`, `scheduled`, `dispatched`, `in_progress`,
`ready_for_review`, `completed`, and `cancelled`. Valid priorities are `low`,
`normal`, `high`, and `urgent`. Do not default either value.

The Job Card phase is not the Topic status. For example, a Job may be
`dispatched` while its Topic is `active`.

## Profile v2 Action references

A Protocol 0.8 Kind Profile may select Action Types from one exact Action
manifest. Preserve `actionManifest` and ordered `actions` only when the host
supplies and verifies the manifest version and digest. Action references are
presentation and compatibility constraints; they are not handlers, grants, or
execution receipts.

Reject or leave unresolved:

- unknown Action Types;
- manifest digest or version mismatches;
- Actions incompatible with the profile's base Kind; and
- Actions whose required Topic ability is not declared by the profile.

The composer proposes structure. Action execution remains a separate
capability-gated host operation with an append-only receipt.
