# Evidence-backed practices and limits

Extraction baseline: `impactsai/evaluation-kits@9f62f30506091c2964a29aed584f15ff9e11ff4c` and `impactsai/alpha-asks@19a926fef75a1ab640f5302494f43d4bc42e6901`. Read source at these revisions when checking the historical rationale. Reinspect current contracts before implementation.

**Conformance** below means a property is implemented and exercised by repository tests. **Recorded pilot** means checked-in deployment documentation records the observation; private audit artifacts and a current live run were not independently reverified for this skill. **Design requirement** is a defensible authoring/calibration requirement, not an empirical claim of model quality. At development commit `697aeeb` in the local evaluation-kit builder branch, structure checks verified 1,194 frozen files, the pinned engine replayed 136 synthetic cases, and 112 repository tests passed. These results validate existing kit mechanics, not this new skill's behavior; fresh-context agent trials remain pending.

| Practice | Supporting evidence | What can be reused; limit |
|---|---|---|
| Keep acquisition, interpretation, facts and deterministic policy separate | Conformance: [registered adapters][adapters], [Alpha transforms][transforms], [Alpha tests][alpha-tests] | Reuse the separation and explicit contracts. A deterministic engine can consistently decide on incorrect facts; it does not validate source truth by itself. |
| Refuse missing semantics and bind every schema to the selected kit/version | Conformance: [adapter contracts][adapter-tests], [kit isolation][isolation], [authoring contract][authoring] | A scaffold with `adapter: none` must not claim evaluation support. Same schema IDs across kits must not collide. A new version may need explicit adapter support. |
| Preserve historical evidence and version corrections | Conformance: [repository tests][repository-tests]; requirement: [authoring][authoring] | Retain frozen labels, raw model outputs, requests and import locks. Repeated runs and corrected labels are new evidence, not replacement history. |
| Eligibility is distinct from identity, qualification and quality | Recorded pilot: [NVIDIA revision 2][deployment]; implementation: [selection verifier][selection] | Signed asker selection was accepted for this approved brief, without external qualification. It is not a universal credential substitute. The frozen Alpha kit's oracle skill still describes a credential route; the live adapter introduced a separately authorized selection route. Reconcile such differences explicitly rather than silently editing frozen policy. |
| Derive risk labels from structured, cited findings | Conformance at the Alpha revision: [assurance implementation][assurance], [regression tests][assurance-tests] | The confirmed/no-risk contradiction must hold for review. Model suspicion is not proof of misconduct. Deterministically prohibited evidence and authorized rejection retain their force. Clear means no finding in reviewed supplied evidence, not absence of all risk. |
| A source hash is necessary but insufficient for reproduction | Conformance: [assurance tests][assurance-tests]; replay method: [source reproducer][reproducer]; recorded pilot: [deployment][deployment] | Preserve source bytes, exact extractor, selectors, units, transformations and commands. The pilot reproduced 31 curated fields, including anchored normalizations; this did not make all values verbatim extracts or verify historical availability. |
| Separate deterministic replay from new model inference | [Historical replay implementation][replay] and recorded [deployment][deployment] | The 14-fact replay used a frozen assessment and historical authorization context. It did not reproduce the stochastic model by calling it again, consume a nonce, or authorize another live submission. |
| Bind authorization and results to exact content | Implementation: [selection verifier][selection], [replay][replay]; recorded [signed result verification][deployment] | Verify role, scope, version/content, issuer, audience, expiry and replay controls as appropriate. Old approval must not migrate to changed bytes. A receipt establishes the verified signer's determination, not universal correctness. |
| Validate real runtime envelopes and separate failure classes | Conformance: [API integration tests][api-tests], [assessment tests][assessment-tests]; recorded [deployment][deployment] | Capture missing/malformed/tampered envelope regressions. Distinguish provider failure from evidence uncertainty. A compact transport retry succeeded, but the earlier 503's exact cause is unconfirmed; do not infer proven token overflow. |
| Report acceptance is not prediction, final approval or payment | [Kit manifest][alpha-manifest], [calibration plan][alpha-calibration], recorded [deployment][deployment] | A score derived from passing criteria is not a market probability. The NVIDIA run made no respondent payment or on-chain claim transaction. A signed mainnet API result is not either event. |
| Evaluate critical errors, coverage and calibration independently | Design requirements: [report calibration][report-calibration], [Alpha calibration][alpha-calibration], [validation limits][validation] | Synthetic labels and repeatability do not establish independent human validity. Proposed sample counts and error thresholds need domain/owner decisions; no general production-ready claim follows from this pilot. |

## What this extraction does not validate

It does not validate a universal rubric, source-count minimum, model, credential issuer, market forecast or autonomous production release. It does not transfer NVIDIA's six gates, eight criteria, 14 facts, provider choice, or account/network configuration to other Asks. Nonfinancial examples in this skill are proposed specialization exercises, not deployed protocols. Current manifests explicitly remain experimental/nonproduction with no payment authority.

[adapters]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/src/kit/adapters.ts
[transforms]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/src/alpha/transforms.ts
[alpha-tests]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/test/alpha.test.ts
[adapter-tests]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/test/adapter-contract.test.ts
[isolation]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/test/kit-isolation.test.ts
[repository-tests]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/test/repository.test.ts
[authoring]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/docs/authoring.md
[alpha-manifest]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/kits/alpha-market-intelligence/0.1.0/kit.json
[alpha-calibration]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/kits/alpha-market-intelligence/0.1.0/calibration.md
[report-calibration]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/kits/ixo-report-approval/0.1.1/calibration.md
[validation]: https://github.com/impactsai/evaluation-kits/blob/9f62f30506091c2964a29aed584f15ff9e11ff4c/docs/validation.md
[deployment]: https://github.com/impactsai/alpha-asks/blob/19a926fef75a1ab640f5302494f43d4bc42e6901/alpha-oracle/DEPLOYMENT.md
[selection]: https://github.com/impactsai/alpha-asks/blob/19a926fef75a1ab640f5302494f43d4bc42e6901/alpha-oracle/src/verifier/selection.ts
[assurance]: https://github.com/impactsai/alpha-asks/blob/19a926fef75a1ab640f5302494f43d4bc42e6901/alpha-oracle/src/verifier/assurance.ts
[assurance-tests]: https://github.com/impactsai/alpha-asks/blob/19a926fef75a1ab640f5302494f43d4bc42e6901/alpha-oracle/test/assurance.test.ts
[reproducer]: https://github.com/impactsai/alpha-asks/blob/19a926fef75a1ab640f5302494f43d4bc42e6901/alpha-oracle/scripts/reproduce-sources.py
[replay]: https://github.com/impactsai/alpha-asks/blob/19a926fef75a1ab640f5302494f43d4bc42e6901/alpha-oracle/scripts/replay-research.ts
[api-tests]: https://github.com/impactsai/alpha-asks/blob/19a926fef75a1ab640f5302494f43d4bc42e6901/alpha-oracle/test/api-lane.test.ts
[assessment-tests]: https://github.com/impactsai/alpha-asks/blob/19a926fef75a1ab640f5302494f43d4bc42e6901/alpha-oracle/test/assessment.test.ts
