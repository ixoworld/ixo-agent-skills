# Review Packet — {{workflow_id}} / graph {{graph_version_id}}

> Assembled by the review agent when validation cannot auto-pass, when normative assumptions
> need a human decision, or when issuance thresholds are near-miss. The authorized reviewer's
> decision is recorded against this packet and gates the `REVIEW_REQUIRED → VALIDATED | REJECTED`
> transition. Nothing in this packet is advisory boilerplate: every section must be filled or
> explicitly marked `n/a — <reason>`.

## 1. Decision requested

- **Decision type:** [ approve graph version | resolve contested edge(s) | accept assumption(s) | approve tier-N issuance | reject ]
- **Requested by:** {{agent}} at state {{state}}
- **Deadline / staleness note:** evidence freshness expires {{date}}

## 2. What is being claimed

One paragraph, plain language, written for the reviewer — the outcome claim exactly as it
would appear in the certificate, including tier (see `references/claim-tiers.md`).

## 3. The subgraph under review

- Graph version: `{{graph_version_id}}` (immutable ref)
- Issuance-critical path(s): `{{node}} → {{node}} → {{node}}`
- Render/attachment: link to graph diff vs. previously approved version, if any.

## 4. Contested or blocking findings

| Finding id | Check | Target | Severity | Summary | Validator recommendation |
|---|---|---|---|---|---|
| | | | | | |

## 5. Assumptions requiring human acceptance

For each: the assumption verbatim, why it cannot be tested with available data, what would
falsify it, and the consequence for the claim if it is wrong.

## 6. Evidence gaps

Open `EvidenceGap` objects on the issuance-critical subgraph: what is missing, who could
produce it, and the tier attainable with vs. without it.

## 7. Alternatives to approval

- Issue at lower tier: [attainable tier and what it would say]
- Defer pending evidence: [which gap, expected availability]
- Reject: [what in the theory of change would need to change]

## 8. Reviewer decision (completed by reviewer, not by agents)

- **Decision:**
- **Rationale:**
- **Conditions attached:**
- **Reviewer identity / authority ref:**
- **Date:**
