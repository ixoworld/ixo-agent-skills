# Professional oracle profile v1

The normative extension schema is [profile.schema.json](profile.schema.json). It is applied alongside
the sibling Domain Author validator. It does not change the domain.md specification or authorize runtime effects.

`x-professional-oracle` contains the following fields.

| Field | Meaning |
| --- | --- |
| `version` | The string `1`. |
| `runtimeTargets` | One or both of `decision-oracle` and `qiforge`. |
| `serviceScope` | Service summary, explicit exclusions, and supported protocol identifiers. An empty protocol list is an unresolved draft input, not unrestricted permission. |
| `methods` | Stable method IDs, governing document IDs, and machine-resource IDs. |
| `rulePractices` | Rule references, governing document IDs, intended practices, responsible roles, evidence references, and implementation status. |
| `observation` | `mode: advisory` and `modelAssessments: false`. |

Implementation status is `documented`, `manual`, `observed`, or `unimplemented`. These labels describe
evidence availability, not permission or a maturity score. A documented method need not have an automated
check. A successful observation does not establish compliance.

Method `documentRef` and rule-practice `documentRef` resolve exact `documents.entries[].id` values.
Method `resourceRefs` resolve exact `resources.entries[].id` values. Preserve document roles independently
of these references so multiple methods and SOPs cannot overwrite each other.

The profile contains no approval threshold, approver identity, grant, or execution permission. The domain's
existing constitutional governance and independently verified authority determine who can adopt amendments.
For a new domain, establish founding authority outside the candidate constitution before adoption.

Every source instrument and draft remains private unless disclosure was approved. Deployment credentials,
claim payloads, private evidence, and hidden reasoning do not belong in this extension or observation records.

The example fixture uses the base schema's required constitutional failure policy to describe handling of
unverified governance changes. It does not install that policy as a runtime block. The example declares
human-interpreted governance and context-only constitutional AI, with no machine enforcement points.
