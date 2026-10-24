---
name: software-review-performance-review
description: "Draft a request (an ask) for a qualified human specialist to measure the performance or running cost of software or an AI agent through IXO Expert Reviews: a comparable baseline, controlled repeated measurements and variance, correctness and permission checks, token and tool usage priced only from a dated rate card, and agreed budgets. Use when someone wants an expert performance, latency, load or agent cost review commissioned, wants to know what a reviewer should measure for a slow page, API or agent, or wants a fair comparison with a named competitor, even if they never say ask. Not for profiling or optimising code yourself, running benchmarks or paid model evaluations, or quoting savings without measurements. For accessibility use software-review-accessibility-review; for agent tool behaviour use software-review-agent-review."
license: MIT
metadata:
  namespace: software-review
  author: IXO
  version: "1.0.0"
  provenance-kind: adapted-skill-import
---

# Performance and cost review asks

An ask is a request, posted through IXO Expert Reviews, for a qualified human
specialist to review a named build. This skill drafts the ask for measuring speed
and cost; the output is an ask, not an optimisation or a benchmark run.

Read [the ask contract](references/ask-contract.md) and start from the blank draft
that `scripts/check_ask.py --template` prints (see the end of this file). Name the
user's task, version/environment and symptom or decision. Keep missing baselines,
budget, permissions and payment/follow-up inputs null with a question in
`missing_inputs`, and leave the draft `needs-input`. Do not invent targets or
provider prices: a made-up budget or rate turns into a claimed saving nobody
measured.

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

## Checking the draft

`scripts/check_ask.py`, in this skill's folder, checks a JSON ask offline against
the contract, this skill's pinned source identity and the draft-only decisions.
Call it by its full path, since the working directory is usually the user's
project:

```bash
python3 /path/to/software-review-performance-review/scripts/check_ask.py --template > ask.json
python3 /path/to/software-review-performance-review/scripts/check_ask.py ask.json
```

It prints `ready-for-approval` (exit 0) or `needs-input` with the failing fields
(exit 1). Passing is a structural check; it measures nothing.

Adapted from Addy Osmani's `performance-optimization` SKILL.md (MIT): measurement
routing and bottleneck tables kept; implementation, installs, fixed budgets and
automatic keep/revert/commit actions removed. Details: [PROVENANCE.json](PROVENANCE.json).
