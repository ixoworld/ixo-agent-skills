# Patch Proposal Policy

Use this reference before producing any improvement proposal.

## Proposal-Only Rule

The Flow Improvement Agent must not directly mutate:

- BaseUcanFlow templates.
- FlowAgentService runtime state.
- Flow execution engine code.
- UCAN policies or delegations.
- Matrix/Yjs canonical state.

All outputs are proposals for review.

## Proposal Targets

- Flow design proposal: routes to human/governance approval, then `$manage-flow`.
- Runtime operating-rule proposal: routes to `$flow-agent` skill/runtime contract review.
- Runtime engine proposal: routes to engineering review.
- Governance proposal: routes to the appropriate approval process.

## Required Proposal Fields

- Proposal ID.
- Proposal type.
- Affected flow/template/runtime surface.
- Evidence summary.
- Supporting UDIDs or runtime observations.
- Expected benefit.
- Risk and rollback consideration.
- Approval requirement.
- Handoff target.
- Regression watch metric.
- `proposalOnly: true`.

## Rejection Conditions

Reject or revise proposals that:

- Lack UDID/runtime evidence.
- Rely on a single low-severity incident as a fleet conclusion.
- Directly call `setup_flow`, emit `AgentCommand`s, or patch engine code.
- Hide uncertainty or missing data.
- Combine unrelated design and engine changes into one broad patch.

