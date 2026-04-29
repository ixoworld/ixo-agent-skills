---
name: mcda
version: "1.1.0"
description: "Run deterministic Multi-Criteria Decision Analysis (MCDA) for Qi Flow Engine decisions. Use when an agent must compare alternatives against weighted benefit/cost criteria, validate decision inputs, rank options with min-max, z-score, vector, or target-based normalization, compare weighted-sum, weighted-product, and TOPSIS methods, run sensitivity or what-if analysis, and produce IPFS-backed governance evidence or decision reports."
license: Apache-2.0
schema_version: "1.0"
requirements:
  capabilities:
    - name: "mcda_read"
      parent: "did:ixo:entity:{entity-id}#cap-02"
      resource: "did:qi:decision:analysis"
      ability: "read"
      description: "Run read-only validation, sensitivity, scenario, and method-comparison analysis"
    - name: "mcda_report"
      parent: "did:ixo:entity:{entity-id}#cap-03"
      resource: "did:qi:decision:report"
      ability: "create"
      description: "Generate decision reports and store report evidence"
    - name: "mcda_execute"
      parent: "did:ixo:entity:{entity-id}#cap-04"
      resource: "did:qi:decision:analysis"
      ability: "create"
      description: "Execute MCDA analysis and store governance evidence"
    - name: "ipfs_store"
      parent: "did:ixo:entity:{entity-id}#cap-04"
      resource: "did:ipfs:content"
      ability: "write"
      description: "Persist governance artifacts and generated reports"
tools:
  - name: "validate_config"
    description: "Validate an MCDA configuration and return structured errors/warnings without executing analysis."
    handler: "src/handlers.ts#validateConfig"
    type: "read_only"
    required_auth: null
  - name: "run_analysis"
    description: "Rank options, generate a governance artifact, and store transition evidence to IPFS."
    handler: "src/handlers.ts#runAnalysis"
    type: "transition"
    required_auth: "mcda_execute"
  - name: "run_sensitivity"
    description: "Vary criterion weights and report ranking stability."
    handler: "src/handlers.ts#runSensitivity"
    type: "read_only"
    required_auth: "mcda_read"
  - name: "run_scenarios"
    description: "Run named what-if scenarios with weight and value overrides."
    handler: "src/handlers.ts#runScenarios"
    type: "read_only"
    required_auth: "mcda_read"
  - name: "compare_methods"
    description: "Compare normalization and aggregation method combinations and return consensus."
    handler: "src/handlers.ts#compareMethods"
    type: "read_only"
    required_auth: null
  - name: "generate_report"
    description: "Generate a Markdown or JSON report from a governance artifact and store report evidence to IPFS."
    handler: "src/handlers.ts#generateReport"
    type: "transition"
    required_auth: "mcda_report"
---

# Multi-Criteria Decision Analysis

Use this skill to make auditable, repeatable decisions where several alternatives must be compared across weighted criteria. The implementation is self-contained TypeScript in `src/`; it does not depend on external Python scripts or mutable process state.

## Operating Rules

1. Validate first with `validate_config` when input was produced by a user, another agent, or an upstream workflow.
2. Use `run_analysis` for the authoritative decision. It requires `mcda_execute` and `ipfs_store`; the returned `evidence_cid` is the governance record.
3. Use `run_sensitivity` when the decision is politically, financially, or operationally material. Treat `fragile` rankings as a review signal, not as a final recommendation.
4. Use `run_scenarios` when stakeholders have competing priorities or when future-state assumptions need explicit comparison.
5. Use `compare_methods` when method choice could influence the outcome. A plurality result is weaker evidence than unanimous or majority consensus.
6. Use `generate_report` only from a `run_analysis` governance artifact. It requires `mcda_report` and `ipfs_store`.

## Input Contract

```json
{
  "options": [
    {
      "id": "alpha",
      "name": "Alpha",
      "values": {
        "impact": 90,
        "cost": 40,
        "risk": 2
      },
      "metadata": {}
    }
  ],
  "criteria": [
    {
      "id": "impact",
      "name": "Impact",
      "weight": 0.5,
      "type": "benefit"
    },
    {
      "id": "cost",
      "name": "Cost",
      "weight": 0.3,
      "type": "cost"
    }
  ],
  "normalization": "min-max",
  "aggregation": "weighted-sum",
  "run_sensitivity": false,
  "scenarios": []
}
```

Validation requirements:

- `options` and `criteria` must each contain at least one item.
- Option IDs and criterion IDs must be unique.
- Every option must provide one finite numeric value for every criterion and no unknown criterion values.
- Criterion weights must be finite numbers from `0` to `1` and sum to `1.0`.
- Criterion `type` must be `benefit` when higher values are better or `cost` when lower values are better.
- `target-based` normalization requires a finite `target` on every criterion.
- Scenario overrides may only reference known option and criterion IDs.

## Methods

Normalization:

- `min-max`: General-purpose scaling to `0..1`; identical values become `0.5`.
- `z-score`: Standardizes first, then scales to `0..1`; zero variance becomes `0.5`.
- `vector`: Vector-normalizes values, then scales to `0..1`; all-zero values become `0.5`.
- `target-based`: Scores closeness to each criterion target; all values at target become `1.0`.

Aggregation:

- `weighted-sum`: Linear compensation across criteria.
- `weighted-product`: Partial compensation; uses epsilon `1e-10` to avoid zero-product collapse.
- `topsis`: Scores closeness to the ideal point and distance from the anti-ideal point.

Tie handling is deterministic: equal raw scores share the same rank and are ordered by option ID.

## Tool Details

### validate_config

Input:

```typescript
{ config: MCDAConfig }
```

Output includes `valid`, `errors`, `warnings`, and `config_summary`. This tool returns structured validation failures instead of throwing for invalid MCDA inputs.

### run_analysis

Input:

```typescript
{
  config: MCDAConfig,
  timestamp?: string
}
```

Output includes:

- `rankings`: ranked options with raw score, normalized score, and criterion contributions.
- `governance`: complete audit artifact with input hash, method config, snapshots, and optional sensitivity/scenario results.
- `confidence`: `high`, `medium`, or `low` based on score spread.
- `evidence_cid`: IPFS CID for the stored governance artifact.

Use `timestamp` or `context.requestTime` for reproducibility. The same config and timestamp produce the same `input_hash` and `analysis_id`.

### run_sensitivity

Input:

```typescript
{
  config: MCDAConfig,
  weight_deltas?: number[]
}
```

Each delta adjusts one criterion weight at a time and redistributes the remaining weight proportionally across other criteria. Output includes baseline rankings, per-criterion rank changes, adjusted weights, and a `stable`, `sensitive`, or `fragile` stability assessment.

### run_scenarios

Input:

```typescript
{
  config: MCDAConfig,
  scenarios: [
    {
      name: "Cost focused",
      weight_overrides: { "impact": 0.2, "cost": 0.6, "risk": 0.2 },
      value_overrides: { "alpha": { "cost": 35 } }
    }
  ]
}
```

Scenario weight overrides are normalized to sum to `1.0` after applying overrides.

### compare_methods

Input:

```typescript
{
  config: MCDAConfig,
  normalizations?: ["min-max", "z-score", "vector", "target-based"],
  aggregations?: ["weighted-sum", "weighted-product", "topsis"]
}
```

Output includes rankings for each method combination and a consensus block with top-option vote counts.

### generate_report

Input:

```typescript
{
  governance: GovernanceArtifact,
  format?: "markdown" | "json"
}
```

Output includes report content and an `evidence_cid` for the stored report artifact.

## Evidence Model

`run_analysis` stores:

```json
{
  "type": "mcda_governance_artifact",
  "governance": "...",
  "ucan": {
    "issuer": "...",
    "audience": "..."
  },
  "stored_at": "ISO timestamp"
}
```

`generate_report` stores:

```json
{
  "type": "mcda_decision_report",
  "format": "markdown",
  "report": "...",
  "analysis_id": "...",
  "input_hash": "...",
  "generated_at": "ISO timestamp"
}
```

## Implementation Files

- `src/types.ts`: Zod schemas, Qi context, tool result, and governance types.
- `src/engine.ts`: deterministic normalization, aggregation, ranking, sensitivity, scenarios, and stable hashing.
- `src/report.ts`: governance validation and Markdown/JSON report generation.
- `src/handlers.ts`: Qi tool handlers, capability checks, and IPFS evidence persistence.
- `tests/mcda.test.ts`: Node test coverage for validation, analysis, authorization, sensitivity, method comparison, and report evidence.

## Local Verification

From this skill directory:

```bash
npm install
npm test
```

From the repository root:

```bash
./scripts/validate-skill.sh skills/mcda
```
