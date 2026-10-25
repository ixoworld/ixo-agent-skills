---
name: domain-author-pro-oracle
description: >-
  Author and revise governing domain.md packages for professional IXO decision oracles and QiForge agent services. Use when an expert wants to create a decision service, document its mandate and methods, adopt an existing oracle's constitution, or prepare a governed deployment handoff. New constitutional observations remain advisory.
---

# Author a professional decision oracle

Read the sibling [Domain Author skill](../domain-author/SKILL.md). Use its pinned specification,
constitutional interview, validation, source verification, and persistence rules. This skill adds a
professional-service profile and journey. It does not replace the base validator or grant publication authority.

## Establish the service

Reuse information already supplied. Ask one coherent group of questions at a time. Read
[the service interview](references/service-interview.md) for the decisions that affect the documents.

Identify whether the expert is creating a new oracle or amending an existing one. Identify the targets as
`decision-oracle`, `qiforge`, or both. Use a verified protocol template when applicable; otherwise choose
the base skill's standalone mode. Do not invent protocol lineage.

Inspect available MCP tools and their schemas before promising upload or resumption. Read
[the hosted journey](references/hosted-journey.md) when the user wants to save, adopt, publish, or deploy.
Cloud chat can prepare documents without a terminal. Deployment resumes in Codex or Claude Code with the
expert's hosting account. Preserve the interview and exact package revision in the handoff.

## Author the package

Use `domain.type: oracle`, `con:OracleConstitution`, and the base constitutional subject profile.
Record an oracle's service role independently of legal form. The
[professional profile](references/profile.md) adds `x-professional-oracle` version `1`.

Index the charter, governance procedures, operating procedures, evidence policy, methods, conflicts and
appeals, data policy, incident procedures, report templates, and agent policy where applicable. Reuse
base document roles; use extension roles only where necessary. Machine schemas, evaluation kits, and
implementations remain `resources`, not constitutional prose.

For each significant rule, record the intended practice, responsible role, evidence references, and
implementation status. An unimplemented check is an improvement opportunity, not an activation blocker.
Keep source documents private by default. Do not infer public disclosure from the service's public listing.

Use [the synthetic standalone example](examples/evidence-service/standalone/domain.md) for document shape.
Use [the derived example](examples/evidence-service/derived/domain.md) only to understand deterministic
template lineage. Its protocol, identities, and claims are fixtures, not real services or authority evidence.

## Preserve learning-first behavior

- Set `observation.mode: advisory` and `observation.modelAssessments: false` in this release.
- Describe actual constitutional execution. Use human interpretation and context loading where applicable;
  do not declare machine enforcement or `runtime` conformance merely because documents validate.
- Separate a possible rule violation, an ambiguous rule, insufficient evidence, and a suspected check error.
- Observations do not change verdicts, block effects, require additional review, or amend documents.
- Preserve existing permissions, claim-review separation, and transaction authorization.
- A fact-producing decision oracle follows the engine manifest. It does not reinterpret the commissioner's rubric.
- Do not add automatic model assessment, automatic abstention, control promotion, or a blanket enforcement switch.

## Validate and hand off

Install the base validator's locked dependencies, then validate the whole package through the specialist
wrapper. It invokes the canonical validator before checking the extension and local document references.
Run from the repository root:

```bash
npm ci --prefix skills/domain-author/scripts
node skills/domain-author-pro-oracle/scripts/validate-package.mjs <package-directory> --mode standalone
```

For a derived package, use `--mode derived --expected-class <verified-protocol-did>`. Structural errors
prevent describing a package as valid. They do not create a new runtime gate for an existing oracle.

Return the base handoff report plus runtime targets, service scope, advisory observation posture, document
review findings, and missing launch evidence. Distinguish validation, adoption, persistence, publication,
runtime loading, observation quality, and operational readiness.

Delegate adoption and publication to the discovered Domain Runtime with verified founding or incumbent
authority. Delegate deployment to the existing oracle-builder. Neither prose nor a successful upload is
approval. Preserve exact-byte receipts and uncertainty after partial writes. Do not claim cloud-client or
testnet acceptance from fixture tests.

For maintainers: run `node --test skills/domain-author-pro-oracle/tests/profile.test.mjs` from the
repository root. [Guided-authoring cases](tests/guided-authoring.json) require transcript-based evaluation
with the installed skills; their status is not run until those evaluations are recorded.
