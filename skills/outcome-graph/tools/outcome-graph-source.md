# Tool: outcome-graph-source

> **Implementation:** [../service/](../service/README.md) — dependency-free Node, 9 checks,
> did:web identity, offline receipt verifier, full test suite. This document remains the
> normative contract; the service README covers running and deploying it.

## Purpose

The graph oracle: a `did:web` HTTP service implementing the live evals-engine's
`ExternalSource` contract, so that engine rubrics can ask graph-level questions the claim
body cannot answer — admissibility of an edge's evidence subgraph, structural validation
status, open gaps, attainable tier. This is how the Outcome Graph reaches the engine **today,
with zero engine changes**; if/when the `linkedClaims` rubric block lands upstream (RFC
WS-D1), receipt verification moves in-engine and this service keeps the graph-only questions.

## The ExternalSource contract (engine side, fixed)

Per the live engine (`src/lib/rubric/schema.ts` ExternalSource + `facts.ts` resolver):

- The rubric declares `{name, endpoint, audience, send, expect, provenance, onError, timeoutMs}`.
- The engine POSTs the `send` payload (keyed refs resolved from the claim — never the whole
  claim) with a **self-signed UCAN invocation** addressed to our `audience` `did:web`
  (default capability `{can: "*", with: "ixo:external-source"}`).
- We answer within the per-attempt timeout (≤30s; 3 attempts, ~30s total budget):
  - `expect: "boolean"` → `{ "valid": true|false }` (+ optional `"reason"`)
  - `expect: "score"` → `{ "score": 0..10000 }` (integer bps; + optional `"reason"`)
- Results freeze into the FactSet before `decide()` — our answer is part of the immutable,
  replayable trace. Unreachable after retries ⇒ the rubric's `onError` (`review` default —
  never approve).
- **The endpoint URL is inside the rubric hash**: repointing the oracle is a new rubric.
  Version question semantics in the path, never by mutating behavior behind a URL.

## Service requirements

1. **Identity**: serve `/.well-known/did.json` for `did:web:<host>` (discoverable via the
   engine's `POST /v1/rubric-source-did`); verify inbound UCAN invocations against our DID.
2. **Determinism**: answers derive ONLY from content-addressed pipeline artifacts (graph
   versions, evidence graphs, validation reports) named in the question payload. Same
   payload + same artifacts ⇒ same answer, always — the engine's replay depends on it.
   Never answer from mutable working state; if the referenced artifact version is unknown,
   fail (engine folds to `onError`), don't guess.
3. **Provenance**: our answers are declared `provenance: "server_verified"` in rubrics —
   the strongest class. That privilege is earned by 1–2; treat it as a compliance duty.
4. **Verification-envelope backing**: every answer must be reconstructible from a stored
   validation report / admissibility record; the `reason` field carries the artifact refs
   (report id + finding/link/gap ids) so an auditor can trace the score.

## Question catalog (v1 — one question per endpoint path, `expect` fixed per path)

| Path | expect | Answer semantics |
|---|---|---|
| `/v1/checks/edge-evidence-admissible` | boolean | Every link cited by the edge is `admissible` or `admissible_with_disclosures`, and no open `EvidenceGap` blocks the edge at the tier in question |
| `/v1/checks/edge-validation-score` | score | Edge status projection from the latest validation report: `supported` → 10000; `plausible` → 7000; `contested`/`unidentified` → 4000; `hypothesized` → 2000; `rejected` → 0 (score, not status, so rubrics can band it) |
| `/v1/checks/graph-structurally-valid` | boolean | `scripts/check-graph.mjs` exit 0 on the named graph version (blocking findings = false) |
| `/v1/checks/graph-expert-reviewed` | boolean | The named graph version carries a recorded expert review with verdict approved / approved_with_conditions |
| `/v1/checks/receipts-verified` | boolean | Every receipt CID in the payload dereferences, its JWS verifies against its engine's issuer keys, and its verdict class ∈ {supported} (or the payload's allowed set) |
| `/v1/checks/attainable-tier-at-least` | boolean | `ValidationReport.attainable_tier.tier >= payload.tier` for the named graph version |
| `/v1/checks/open-gap-count` | score | `min(10000, open gaps on the named target × 1000)` — rubrics band it (0 = none) |
| `/v1/checks/within-boundary` | boolean | Claim point lies within the content-addressed program boundary (rfc-005 `ExternalSource` plan; owner read 2026-08-16 — the geo path for ~2 quarters). Integer micro-degree point-in-polygon per `scripts/lib/geo.mjs` (on-boundary within, holes respected, MultiPolygon any-ring, antimeridian pre-split); the `boundaryRef` urn is re-derived from the stored artifact's canonical `boundary` bytes and verified before every answer |
| `/v1/checks/within-radius` | boolean | Claim point within `radiusMeters` of a registered reference point named by `pointId` inside the same digest-verified boundary artifact; pinned integer equirectangular math (cos at the center's latitude), on-circle within |

Standard `send` payload keys: `graphVersionRef`, `edgeId`/`nodeId`, `supportingReceipts`
(joined string or repeated keys — values must be string/number/boolean per the contract),
`tier`; geo checks: `boundaryRef`, `pointId`, `lat`/`lon` (**integer micro-degrees**, 1e-6°
— float degrees are rejected with `400`), `radiusMeters` (integer, typically a rubric-hash
literal in `send`).

## Guardrails

- Answer only from artifacts this pipeline produced and stored; never fetch third-party
  URLs at question time (our determinism boundary mirrors the engine's freeze).
- Reject payloads referencing artifacts that are not content-addressed or not found —
  `4xx`, letting the engine's `onError` policy decide the claim's fate.
- Rate-limit and log per rubric consumer; every answer's inputs and value are appended to
  the run's audit trail with the inbound invocation's audience and the claim context sent.
- Dry-run every new question path with the engine's `POST /v1/rubric-source-preview`
  harness before anchoring any rubric that references it.
- Never expand a path's semantics in place — new semantics = new path = new rubric hash.
