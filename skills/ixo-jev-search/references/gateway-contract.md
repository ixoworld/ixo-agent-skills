# Gateway contract (what this skill sends and reads)

The source of truth is the ixo-search-gateway repository: `docs/contracts/search-v1.md` and `docs/relevance/jev-ranking-v1.md`.

## Request: `POST /search`

```json
{ "schemaVersion": "ixo.search.v1",
  "requestId": "req_jev_…",
  "query": { "text": "…", "mode": "hybrid" },
  "categories": ["domains"],
  "scope": { "kind": "actor_default" },
  "include": { "outputLevel": "metadata", "facets": [], "explanations": true },
  "page": { "limit": 10 },
  "ranking": { "strategy": "jev", "minRelevance": 0.25 } }
```

- `Authorization: Bearer <invocation>.<delegation>[.<delegation>…]`
- The invocation's `rd` fact is sha256 over the canonical JSON of:

  ```
  { schemaVersion: "ixo.search.authorization.v1", requestId, audienceDid,
    operation: "search", searchRequest, requestedScope, categories (with "all" expanded),
    mode, outputLevel, limit, facets }
  ```

  Object keys are sorted, and undefined members are dropped. `scripts/lib/request.js` implements this. The tests check it against the gateway's published vectors.
- `ranking` is optional and has no default. If you omit it, the deployment default applies.

## Response (200)

| Field | Meaning |
| --- | --- |
| `status` | `complete`, or `partial` (at least one source failed; see `connectorOutcomes`) |
| `results[]` | Up to `page.limit` results. Each carries `ranking.score` plus, under jev ranking, `ranking.relevanceScore` (0..1) and `ranking.relevanceTier` (`relevant`, `lead` or `unscored`) |
| `relevance` | `{ strategy: "jev", status: "complete" \| "partial" \| "fallback", followUps? }` |
| `relevance.followUps[]` | Up to 3 of `{ fromResultId, query: { text: <DID>, mode: "keyword" }, categories: ["transactions","claims","messages"] }` |
| `receiptId` | The signed receipt for this search. It records a digest-only relevance block and never any text |
| `results[].resultRef` | A signed `sr1.…` reference for `/search/lookup` and `/search/open`. These routes need a self-issued invocation; delegated authentication covers search only |

## Ranking order

1. exact identifier, path or hash matches
2. `relevant` (p > 0.5)
3. `unscored` (deterministic source order)
4. `lead` (`minRelevance` < p ≤ 0.5)

Results at or below `minRelevance` are dropped. A classifier failure never fails a search: it returns `relevance.status: "fallback"` with the federated ranking.

## Errors

The error body is `{ schemaVersion, correlationId, requestId, error: { code, message, retryable } }`. The status codes are 400, 401, 403, 413, 429 and 503. Denials are opaque by design.
