---
name: mcda
version: "1.1.0"
description: >
  Multi-Criteria Decision Analysis (MCDA) Qi Skill for the Qi Flow Engine.
  Performs deterministic, auditable decision analysis with cryptographic evidence.
  Evaluates options against weighted criteria using multiple normalization methods
  (min-max, z-score, vector, target-based) and aggregation methods (weighted-sum,
  weighted-product, TOPSIS). Produces ranked recommendations with sensitivity analysis,
  what-if scenarios, and IPFS-stored governance artifacts.
  Use when: (1) Complex decisions with multiple competing objectives,
  (2) Systematic alternative comparison with audit trails,
  (3) Traceable recommendations for Qi Flow state machines,
  (4) Trade-off analysis with sensitivity testing,
  (5) Governance-grade decision documentation with cryptographic proofs.

schema_version: "1.0"

requirements:
  capabilities:
    - name: "mcda_execute"
      parent: "did:ixo:entity:{entity-id}#cap-04"
      resource: "did:qi:decision:analysis"
      ability: "create"
      description: "Execute MCDA analysis and store governance evidence to IPFS"

    - name: "mcda_read"
      parent: "did:ixo:entity:{entity-id}#cap-02"
      resource: "did:qi:decision:analysis"
      ability: "read"
      description: "Read-only operations: sensitivity analysis, what-if scenarios, method comparison"

    - name: "mcda_report"
      parent: "did:ixo:entity:{entity-id}#cap-03"
      resource: "did:qi:decision:report"
      ability: "create"
      description: "Generate decision reports and store to IPFS"

    - name: "ipfs_store"
      parent: "did:ixo:entity:{entity-id}#cap-04"
      resource: "did:ipfs:content"
      ability: "write"
      description: "Store governance artifacts and reports to IPFS"

tools:
  - name: "validate_config"
    description: >
      Validate an MCDA configuration without running the analysis.
      Checks option/criteria completeness, weight sums, duplicate IDs,
      method compatibility, and returns warnings for suspicious inputs.
    handler: "src/handlers.ts#validateConfig"
    type: "read_only"
    required_auth: null

  - name: "run_analysis"
    description: >
      Execute full MCDA analysis: normalize values, aggregate scores,
      rank options, and generate governance artifact with tamper-detection hash.
      Stores governance evidence to IPFS and returns CID.
    handler: "src/handlers.ts#runAnalysis"
    type: "transition"
    required_auth: "mcda_execute"

  - name: "run_sensitivity"
    description: >
      Perform sensitivity analysis by varying criterion weights.
      Tests how rankings change under weight perturbations (±5%, ±10%, ±20%).
      Identifies fragile rankings and pivot points.
    handler: "src/handlers.ts#runSensitivity"
    type: "read_only"
    required_auth: "mcda_read"

  - name: "run_scenarios"
    description: >
      Execute what-if scenarios with alternative weight and value configurations.
      Tests different stakeholder priorities, models future improvements,
      explores constraint changes.
    handler: "src/handlers.ts#runScenarios"
    type: "read_only"
    required_auth: "mcda_read"

  - name: "compare_methods"
    description: >
      Run the same configuration across multiple normalization and aggregation
      method combinations. Returns consensus rankings and method-specific results
      to validate robustness.
    handler: "src/handlers.ts#compareMethods"
    type: "read_only"
    required_auth: null

  - name: "generate_report"
    description: >
      Generate a comprehensive Markdown or JSON decision report from analysis results.
      Includes executive summary, rankings, detailed contributions, sensitivity results,
      scenarios, governance trail, and confidence indicators. Stores report to IPFS.
    handler: "src/handlers.ts#generateReport"
    type: "transition"
    required_auth: "mcda_report"
---

# Multi-Criteria Decision Analysis (MCDA) — Qi Skill

Deterministic, auditable decision analysis engine for the Qi Flow Engine. Evaluates options against weighted criteria, produces ranked recommendations with cryptographic evidence, and stores governance artifacts to IPFS.

## Qi Flow Engine Principles

This skill conforms to the four pillars of Qi Flow Engine development:

1. **The Harness is Sovereign**: All transition tools require UCAN authorization via `mcda_execute`, `mcda_report`, or `ipfs_store` capabilities
2. **Intent is Authority**: Permissions derived from UCAN token matching `did:ixo:entity:{entity-id}#cap-<nn>` parent capabilities
3. **State is Immutable**: All handlers are stateless — the Python engine produces deterministic outputs from inputs with no side effects
4. **Evidence is Required**: Transition tools (`run_analysis`, `generate_report`) store governance artifacts to IPFS and return CIDs as cryptographic proof

## Capability DID Pattern

Capabilities use DID fragment paths derived from the parent entity:

```
did:ixo:entity:<entity-id>#cap-<nn>

Mappings:
did:ixo:entity:<entity-id>#cap-02  → mcda_read (read/observe rights)
did:ixo:entity:<entity-id>#cap-03  → mcda_report (propose rights)
did:ixo:entity:<entity-id>#cap-04  → mcda_execute, ipfs_store (settle rights)
```

## Quick Start

### Validate → Analyze → Report Pipeline

```typescript
// Step 1: Validate configuration (no auth required)
const validation = await validateConfig({ config });
// → { data: { valid: true, warnings: [...] }, summary: "Config valid: 3 options, 4 criteria" }

// Step 2: Run analysis (requires mcda_execute capability)
const analysis = await runAnalysis({ config, timestamp: context.requestTime });
// → { data: { rankings, governance }, evidence_cid: "bafkrei...", summary: "Alpha ranked #1 (0.847)" }

// Step 3: Generate report (requires mcda_report capability)
const report = await generateReport({ governance: analysis.data.governance, format: "markdown" });
// → { data: { report }, evidence_cid: "bafkrei...", summary: "Report generated: 3 options, 4 criteria" }
```

## Tool Reference

### validate_config

Validates an MCDA configuration without running the analysis. No authorization required.

**Input:**
```typescript
{
  config: {
    options: [
      { id: "opt1", name: "Option 1", values: { crit1: 8, crit2: 6 } }
    ],
    criteria: [
      { id: "crit1", name: "Quality", weight: 0.6, type: "benefit" },
      { id: "crit2", name: "Cost", weight: 0.4, type: "cost" }
    ],
    normalization?: "min-max",    // default: "min-max"
    aggregation?: "weighted-sum"  // default: "weighted-sum"
  }
}
```

**Output:**
```typescript
{
  data: {
    valid: boolean,
    errors: string[],
    warnings: string[],   // e.g., "Single-option analysis", "Extreme weight concentration"
    config_summary: {
      option_count: number,
      criteria_count: number,
      weight_sum: number,
      normalization: string,
      aggregation: string
    }
  },
  summary: "Config valid: 3 options, 4 criteria"
}
```

### run_analysis

Executes the full MCDA analysis pipeline. **Transition tool — requires `mcda_execute` capability.**

**Input:**
```typescript
{
  config: { /* same as validate_config */ },
  timestamp?: string  // ISO timestamp, defaults to context.requestTime
}
```

**Output:**
```typescript
{
  data: {
    rankings: [
      {
        rank: 1,
        option_id: "opt1",
        option_name: "Option 1",
        raw_score: 0.847,
        normalized_score: 1.0,
        criterion_contributions: { crit1: 0.6, crit2: 0.4 }
      }
    ],
    governance: { /* full GovernanceArtifact */ },
    confidence: "high" | "medium" | "low"
  },
  evidence_cid: "bafkrei...",   // Governance artifact stored to IPFS
  summary: "Option 1 ranked #1 (score: 0.847, confidence: high)"
}
```

### run_sensitivity

Performs sensitivity analysis by varying criterion weights. **Requires `mcda_read` capability.**

**Input:**
```typescript
{
  config: { /* same as validate_config */ },
  weight_deltas?: number[]  // default: [-0.20, -0.10, -0.05, 0.05, 0.10, 0.20]
}
```

**Output:**
```typescript
{
  data: {
    baseline_rankings: [...],
    sensitivity: {
      [criterion_id]: [
        { weight_change: 0.05, new_rankings: [...], rank_changes: {...} }
      ]
    },
    stability_assessment: "stable" | "sensitive" | "fragile"
  },
  summary: "Rankings stable under ±10% weight changes"
}
```

### run_scenarios

Executes what-if scenarios with alternative configurations. **Requires `mcda_read` capability.**

**Input:**
```typescript
{
  config: { /* base config */ },
  scenarios: [
    {
      name: "Cost-Focused",
      weight_overrides?: { cost: 0.6, quality: 0.2, speed: 0.2 },
      value_overrides?: { opt1: { quality: 95 } }
    }
  ]
}
```

### compare_methods

Runs the same configuration across multiple method combinations. **No authorization required.**

**Input:**
```typescript
{
  config: { /* same as validate_config */ },
  normalizations?: string[],  // default: ["min-max", "z-score", "vector"]
  aggregations?: string[]     // default: ["weighted-sum", "weighted-product", "topsis"]
}
```

### generate_report

Generates a comprehensive decision report. **Transition tool — requires `mcda_report` capability.**

**Input:**
```typescript
{
  governance: { /* GovernanceArtifact from run_analysis */ },
  format?: "markdown" | "json"  // default: "markdown"
}
```

## Configuration Guide

### Options

Each option represents an alternative to evaluate:

```json
{
  "id": "unique_identifier",
  "name": "Human-readable name",
  "values": {
    "criterion_id_1": 8.5,
    "criterion_id_2": 42.0
  },
  "metadata": { "notes": "optional context" }
}
```

**Validation rules:**
- Every option must have values for ALL criteria (enforced)
- Values must be numeric (enforced)
- IDs must be unique — duplicates raise `ValueError` (enforced in v1.1)
- Metadata is optional

### Criteria

Each criterion represents a decision factor:

```json
{
  "id": "unique_identifier",
  "name": "Human-readable name",
  "weight": 0.35,
  "type": "benefit",
  "target": null
}
```

**Fields:**
- `weight`: Importance (0–1, must sum to 1.0 across all criteria)
- `type`: Either `"benefit"` (higher is better) or `"cost"` (lower is better)
- `target`: Optional target value for target-based normalization

**Warnings issued for suspicious-but-valid configurations:**
- Single-option analysis (trivial ranking)
- Single-criterion analysis (single-metric decision)
- Zero-weight criteria (dead criteria)
- Extreme weight concentration (≥0.95 on one criterion)

### Methods

**Normalization methods:**

| Method | Use When | Degenerate Case |
|--------|----------|-----------------|
| `min-max` | General purpose, preserves relative distances | Identical values → 0.5 |
| `z-score` | Data has outliers or wide variance | Zero variance → 0.5 |
| `vector` | Relative magnitude matters | All zeros → 0.5 |
| `target` | Specific target values exist (requires `target` field) | All at target → 1.0 |

**Aggregation methods:**

| Method | Compensation | Notes |
|--------|-------------|-------|
| `weighted-sum` | Full compensation between criteria | Most common, linear |
| `weighted-product` | Partial compensation | Near-zero values heavily penalized (epsilon: 1e-10) |
| `topsis` | Distance from ideal/anti-ideal | Considers best AND worst cases |

### Governance Artifacts

Every `run_analysis` produces a complete governance artifact stored to IPFS:

- **analysis_id**: Content-addressable SHA-256 hash (deterministic — same inputs always produce the same ID)
- **timestamp**: Injectable ISO timestamp for Qi Flow Engine determinism
- **input_hash**: SHA-256 of all inputs for tamper detection
- **method_config**: Normalization and aggregation methods used
- **options_snapshot / criteria_snapshot**: Complete input data for round-trip verification
- **results**: Full rankings with criterion contributions
- **sensitivity_analysis / what_if_scenarios**: Optional additional analysis

**Verification:** Recomputing `SHA-256(input_snapshot)` must match `input_hash`, proving inputs haven't been altered post-analysis.

## Architecture

### File Structure

```
mcda/
├── SKILL.md                        # This file — skill manifest + documentation
├── src/
│   ├── handlers.ts                 # TypeScript Qi Flow Engine handlers
│   └── types.ts                    # Zod schemas for all tool arguments
├── scripts/
│   ├── mcda_engine.py              # Core Python MCDA engine (v1.1, hardened)
│   └── generate_report.py          # Report generation
├── references/
│   ├── methodology.md              # Detailed method documentation
│   └── examples.md                 # Configuration examples
└── tests/
    └── test_mcda_engine.py         # 73 tests across 10 categories
```

### Handler Architecture

TypeScript handlers wrap the hardened Python engine:

```
User Request
    ↓
[Zod Schema Validation] ← src/types.ts
    ↓
[TypeScript Handler]     ← src/handlers.ts
    ↓
[Python Engine]          ← scripts/mcda_engine.py (subprocess, JSON IPC)
    ↓
[IPFS Evidence Storage]  ← context.ipfs.save()
    ↓
ToolResult { data, evidence_cid, summary }
```

**Why Python + TypeScript wrapper?**
The Python MCDA engine is numerically intensive, well-tested (73 tests), and battle-hardened. A full TypeScript rewrite would risk introducing numerical bugs. The TypeScript handlers provide Qi Flow Engine conformance (Zod validation, UCAN authorization, IPFS evidence storage) while delegating computation to the proven Python core.

### Determinism Guarantees

| Component | Mechanism |
|-----------|-----------|
| Timestamps | Injected from `context.requestTime` or explicit parameter |
| Analysis ID | Content-addressable: `SHA-256("mcda-v1.1-" + input_hash)` |
| Input hash | `SHA-256(JSON.stringify(inputs, sort_keys=true))` |
| Scoring | Pure functions: same inputs → identical scores to 12 decimal places |
| Governance | Complete snapshot enables independent verification |

## Confidence Indicators

Based on score distribution:

| Level | Score Range | Meaning |
|-------|------------|---------|
| **HIGH** | > 0.3 | Clearly differentiated options |
| **MEDIUM** | 0.1 – 0.3 | Moderate differentiation |
| **LOW** | < 0.1 | Marginal differences — consider additional criteria |

## Integration Patterns

### Qi Flow State Machine Triggers

Use MCDA scores to drive Qi Flow state transitions:

```typescript
const analysis = await runAnalysis({ config, timestamp: context.requestTime });
const topScore = analysis.data.rankings[0].normalized_score;
const confidence = analysis.data.confidence;

if (topScore >= 0.7 && confidence === "high") {
  // Propose settlement — high confidence, clear winner
  await context.flow.transition("propose_settlement", {
    recommendation: analysis.data.rankings[0],
    evidence_cid: analysis.evidence_cid
  });
} else if (confidence === "low") {
  // Request additional evaluation criteria
  await context.flow.transition("request_review", {
    reason: "Low confidence — options insufficiently differentiated",
    evidence_cid: analysis.evidence_cid
  });
}
```

### Audit Trail Integration

Every analysis produces IPFS-stored evidence that can be independently verified:

```typescript
// Verify governance artifact integrity
const artifact = await context.ipfs.get(analysis.evidence_cid);
const governance = JSON.parse(artifact.toString());

// Recompute input hash from snapshot
const recomputed = sha256(JSON.stringify({
  options: governance.options_snapshot,
  criteria: governance.criteria_snapshot,
  normalization: governance.normalization_method,
  aggregation: governance.aggregation_method
}, { sortKeys: true }));

assert(recomputed === governance.input_hash);  // Tamper-proof
```

## Changelog

### v1.1.0 (Phase 2 — Qi Skill)
- Restructured as Qi Flow Engine skill with UCAN capabilities
- Added TypeScript handlers with Zod validation
- IPFS evidence storage for governance artifacts
- Content-addressable analysis IDs (deterministic)
- Injectable timestamps for Qi Flow Engine determinism
- DID fragment capability pattern: `did:ixo:entity:{entity-id}#cap-<nn>`

### v1.1.0 (Phase 1 — Engine Hardening)
- Fixed silent data loss on duplicate option IDs
- Fixed duplicate criterion ID masking
- Removed unimplemented ELECTRE from aggregation enum
- Replaced deprecated `datetime.utcnow()` with timezone-aware UTC
- Standardized vector normalization degenerate cases (→ 0.5)
- Added minimum count validation, input bounds warnings
- Documented weighted-product epsilon behavior
- 73 comprehensive tests across 10 categories

### v1.0.0
- Initial Python MCDA engine
- Min-max, z-score, vector, target normalization
- Weighted-sum, weighted-product, TOPSIS aggregation
- Sensitivity analysis and what-if scenarios
- Governance artifact generation
