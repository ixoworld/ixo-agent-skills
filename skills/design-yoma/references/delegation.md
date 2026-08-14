# Delegation and Stop Codes

Read before the first handoff to another skill, and whenever a run must stop.

## The rule

This skill owns **design judgment**. It does not own authoring formats, flow compilation, runtime
state, or cross-run analysis. Four skills already own those, and each validates against contracts this
skill cannot see. Reimplementing their output here produces artifacts that look right and fail
validation.

> If another skill owns the format, produce the *decisions* and hand them over.
> Never produce the artifact.

## Routing table

| Trigger | Route to | Hand over | Never do here |
|---|---|---|---|
| Any `domain.md`, constitution, subject profile, or domain package | `domain-author` | Purpose, roles, members, treasury model, claim collections, agents and their authority | Author or edit `domain.md` from memory; guess at spec fields |
| Flow authoring, step add/remove/reorder, POD creation | `manage-flow` | The step sequence, actor per step, conditions, and which actions are needed | Hand-write BaseUcanFlow JSON or `nb` blocks |
| Blocked nodes, overdue actions, leases, pending invocations, UCAN checks on a *running* flow | `flow-agent` | The flow id and the symptom | Diagnose or repair live runtime state |
| Recurring defects across many runs, cohort UDID analysis | `flow-improvement-agent` | The pattern observed and the runs it came from | Generalise from a single run |

## Handoff shape

Hand over decisions with enough context to act, and nothing the receiving skill will re-derive.

```yaml
handoff:
  to: domain-author | manage-flow | flow-agent | flow-improvement-agent
  from_control: <control_id>
  purpose: <one sentence>
  decisions: {}          # what this skill settled
  constraints: []        # what must hold in the output
  open_questions: []     # what the receiving skill must ask the user
  do_not: []             # anything explicitly out of scope for this handoff
  return_to_control: <control_id> # where this run resumes
```

Two rules that prevent most bad handoffs:

- **Never send a draft as if it were approved.** Mark every unapproved input `draft: true`. A control
  that has not been recorded is not a dependency another skill may rely on.
- **Never send concrete DIDs, addresses, or contract values that are runtime picker inputs.**
  `manage-flow` in particular treats member DIDs, blueprint DIDs, contract addresses, and token
  configs as runtime inputs; writing them into a plan at design time is an error.

## Stop codes

Stop with an explicit code rather than guessing or degrading silently. State the code, what is
missing, and who can supply it.

| Code | Meaning | Resolution |
|---|---|---|
| `BLOCKED_CAPABILITY_UNAVAILABLE` | A tool required for this control does not exist in this runtime | Stage the payload; name the tool and the human who can run it |
| `BLOCKED_SPEC_UNAVAILABLE` | The pinned `domain.md` spec or schema cannot be resolved | Route to `domain-author`; do not reconstruct the spec from memory |
| `BLOCKED_TIER_UNASSESSED` | Design work requested before `safeguarding_screen` ran | Return to control C4 |
| `BLOCKED_SAFEGUARDING_SIGNOFF` | Risk tier requires named sign-off that is absent | Name the required role; do not proceed on self-attestation |
| `BLOCKED_NO_CLAIM_SCHEMA` | Rubric work requested with no live `#vct` to draw fields from | Return to control C11 |
| `BLOCKED_RUBRIC_DRIFT` | Rubric field paths no longer resolve against the current `#vct` | Re-open the rubric against the current catalog; re-check every path |
| `BLOCKED_RUBRIC_NOT_OPENED_FROM_PUBLISHED` | A rubric was drafted without loading the collection's existing `#rub` | Load the published rubric first — publishing replaces it outright |
| `BLOCKED_UNFUNDED_UNDISCLOSED` | Reward promised with no funding position stated | Record the funding position and exhaustion behaviour; disclosure, not escrow, is the requirement |
| `BLOCKED_AUTHORITY_UNCLEAR` | Owner, controller set, or admin account cannot be resolved | Return to control C1 |
| `BLOCKED_CONSENT_CAPACITY` | Participant age band or consent capacity is unresolved | Return to control C12; assume the protective reading meanwhile |
| `BLOCKED_NO_ORACLE_LINKED` | A flow with an agent step targets a domain with no linked oracle | Link an oracle before instantiation, or remove the agent step |
| `BLOCKED_HUMAN_APPROVAL_REQUIRED` | The next act has a side effect | Emit the controller checklist and stop |

## What always requires a human

Never stage these as automatic, never describe them as done because a payload exists:

- Registering an entity or broadcasting any transaction
- Granting, widening, or revoking an authorization
- Publishing a rubric — it replaces `#rub` outright, with no merge
- Issuing a credential
- Executing a payment or moving value
- Creating or updating a public listing
- Any determination on a claim above the tier's automatic-settlement threshold
- Safeguarding sign-off where the risk tier requires it

## Reading tool availability

Phase 0 requires inventorying the tools that actually exist in this runtime. Do this by inspection,
not assumption — a reference naming a tool is not evidence the tool is present or that its arguments
match. When a capability is missing, stage the exact payload the human would submit and say plainly
that the platform action did not run. Never report a staged payload as a completed action.
