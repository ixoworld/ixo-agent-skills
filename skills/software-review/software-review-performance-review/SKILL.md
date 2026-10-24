---
name: software-review-performance-review
description: Author bounded performance and agent cost review asks using comparable task measurements, variance, correctness, permissions and user-agreed budgets.
license: MIT
metadata:
  namespace: software-review
  author: IXO
  version: "1.0.0"
  provenance-kind: adapted-skill-import
---

# Performance and cost review asks

Adapted import of Addy Osmani's `performance-optimization` SKILL.md. Retained
measurement routing and bottleneck tables support a specialist review ask;
implementation, installs, fixed budgets and automatic keep/revert/commit actions
have been removed. See [PROVENANCE.json](PROVENANCE.json).

Read [the ask contract](references/ask-contract.md) first. Name the user's task,
version/environment and symptom or decision. Capture missing baselines, budget,
permissions and payment/follow-up inputs as `needs-input`; do not invent targets
or provider prices. The output is an ask, not an optimisation or benchmark run.

## Measurement plan

Measure before recommending changes. Profile first, identify a supported
bottleneck hypothesis, then request the smallest bounded experiment. Record:

- Primary user-facing metric with units and owner-agreed acceptance/failure.
- Baseline and candidate builds, model/prompt/tool config, workload/dataset,
  concurrency, device/connectivity, cache state, warm-up and measurement window.
- Fixed request/time/spend limits, sample count, repetitions and stop conditions.
- Median/tail/distribution and run-to-run variance where supported by sample size.
  A change inside the noise is inconclusive; do not manufacture a gain.
- Correctness and permission checks alongside speed/cost: skipping required work
  or bypassing authorisation cannot count as an improvement.

Use synthetic controlled measurements for reproducibility and consented,
aggregated field evidence when available. Field data access requires its own
permission and privacy terms; missing field data is a limitation, not a reason to
scrape production. Equivalent conditions are required for competitor comparisons.

### Where to Start Measuring

Use the symptom to decide what to measure first:

```
What is slow?
├── First page load
│   ├── Large bundle? --> Measure bundle size, check code splitting
│   ├── Slow server response? --> Measure TTFB in DevTools Network waterfall
│   │   ├── DNS long? --> Inspect connection setup time for approved origins
│   │   ├── TCP/TLS long? --> Record protocol, edge routing and connection reuse
│   │   └── Waiting (server) long? --> Profile backend, check queries and caching
│   └── Render-blocking resources? --> Check network waterfall for CSS/JS blocking
├── Interaction feels sluggish
│   ├── UI freezes on click? --> Profile main thread, look for long tasks (>50ms)
│   ├── Form input lag? --> Check re-renders, controlled component overhead
│   └── Animation jank? --> Check layout thrashing, forced reflows
├── Page after navigation
│   ├── Data loading? --> Measure API response times, check for waterfalls
│   └── Client rendering? --> Profile component render time, check for N+1 fetches
└── Backend / API
    ├── Single endpoint slow? --> Profile database queries, check indexes
    ├── All endpoints slow? --> Check connection pool, memory, CPU
    └── Intermittent slowness? --> Check for lock contention, GC pauses, external deps
```

### Bottleneck hypotheses to investigate

Common bottlenecks by category:

**Frontend:**

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Slow LCP | Large images, render-blocking resources, slow server | Check network waterfall, image sizes |
| High CLS | Images without dimensions, late-loading content, font shifts | Check layout shift attribution |
| Poor INP | Heavy JavaScript on main thread, large DOM updates | Check long tasks in Performance trace |
| Slow initial load | Large bundle, many network requests | Check bundle size, code splitting |

**Backend:**

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Slow API responses | N+1 queries, missing indexes, unoptimized queries | Check database query log |
| Memory growth | Leaked references, unbounded caches, large payloads | Heap snapshot analysis |
| CPU spikes | Synchronous heavy computation, regex backtracking | CPU profiling |
| High latency | Missing caching, redundant computation, network hops | Trace requests through the stack |


## Agent cost and resource evidence

For an agent task, request end-to-end latency plus model/tool/retrieval breakdown,
retries and failed attempts, token counts, cache hits, tool calls and correctness.
State the measurement source and whether counts are observed, estimated or absent.
Use the user's dated provider rate card, currency and billing units to calculate
cost per attempted task and per successful task; include failure/retry costs.
Keep measured usage apart from price assumptions, quotas and the review fee.
Without a verified rate card, report usage and request pricing rather than invent
money. Do not run paid model evaluations to fill gaps.

## Requested output and follow-up

Produce the complete bounded ask with measurement protocol, comparable baseline,
hypotheses, evidence, reviewer expertise and agreed budgets. Ask the specialist to
report observed measurements, uncertainty, interpretation and proposed experiment
separately. Follow-up repeats the protocol on the named changed build and adds a
small regression check for correctness and permission. Release, code changes,
payment authorisation and settlement are separate decisions.
