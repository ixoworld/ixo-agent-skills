# Rubric Authoring for the Live evals-engine

How impact claim classes become rubrics in the engine's live JSON-LD format. The structural
contract is `schemas/vendor/evals-engine-rubric.schema.json` (vendored from the engine —
provenance in `schemas/vendor/README.md`); a worked example is
`examples/clean-water/rubric.json`. Validate every authored rubric with `npm run validate`
before anchoring.

## The format in one paragraph

A rubric is a JSON-LD envelope (`type: "ixo:entity#rubric"`) whose `rubric` node binds ONE
claim-form template (`claimSchema` → protocol entity, `#vct`, form hash) and declares, in
closed vocabulary: `derived` expressions, external `sources` (HTTP+UCAN, results as
`ext.<name>.valid|score|reason`), `aiChecks` (engine-composed prompts, `ai.<name>.valid`),
`unique` (dedup) and `frequency` (rate limit) blocks, hard `gates`, weighted `scoring`
criteria, a `HumanReview` block, and `settlement`. At least one of gates/scoring is
mandatory. The rubric's id is the sha256 of its bytes and must equal the on-chain
LinkedResource proof (`#rub`) — **every byte is load-bearing; a retitle is a new rubric**.

## Design rules for impact rubrics

1. **The engine checks claims; the graph oracle checks the graph.** Rubric conditions see
   only the claim body, attachments, ctx tokens, and declared source/AI answers. Anything
   requiring graph computation — admissibility of the evidence subgraph, DAG discipline,
   edge validation status, attainable tier — enters as an `ExternalSource` call to the
   outcome-graph oracle (tools/outcome-graph-source.md), whose answers are `server_verified`
   provenance. One question per source (v1 `expect` is `boolean | score` only).
2. **Gates carry the five failure classes.** Use `invalid_evidence` for malformed/pin
   failures, `out_of_authority` for authorization scope, `refuted` for disproof,
   `insufficient_evidence` / `requires_human_review` (with `onFail: "review"`) for gaps and
   judgment calls. A failed gate can never mint an approval.
3. **Criteria are author-defined** — there are no fixed dimensions. Use codes
   `OGC-1xx-NAME` (criteria) / `OGL-0xx-NAME` (gates) matching `^[A-Z0-9]+-[0-9]+-[A-Z0-9-]+$`.
   `weight` (1–5) matters only under `method: "weighted_average"`. Mark issuance-critical
   criteria `critical: true` with a `min` — below it the claim rejects regardless of total.
4. **Thresholds are the tier boundary at claim level**: `approveAt` (→ approve),
   `partialFloor` (→ partial, prorated settlement), `reviewFloor` (→ review); order
   `approveAt > partialFloor >= reviewFloor` is enforced by the engine's parse (not the
   JSON Schema — validate.mjs re-checks).
5. **Trust is expressed per criterion**: `requireSource: "server_verified"` on criteria fed
   by the graph oracle; `trustCap` (e.g. 8000) on criteria fed by claimant-supplied
   (`client_assisted`) answers. This replaces the old independence-cap idea at the engine
   boundary; the real independence computation stays in our admissibility pass.
6. **Judgment goes to authored review, not prose**: contested-edge questions become
   `ManualScore` criteria + `ReviewTask`s with enumerable answers (`boolean` or `enum`) and a
   complete `map` to approve/partial/reject. Route via `assignTo.role`/`assigneeDid` or a
   Matrix room; set `slaHours` + `onTimeout: "reject"` (fail closed). Free-text judgment is
   not reviewable and not expressible — design the question so the answer is enumerable.
7. **AiChecks are for bounded semantic checks** on claim content (e.g. "the mechanism text
   describes a process, not a restatement"). Write `instructions[]` as rules, never prompts;
   `expect` is boolean-only in v1; always set `onError` (absent ⇒ review; never approve).
8. **Dedup and rate-limit by design**: one edge claim per graph version —
   `unique.by: ["$graphVersionRef", "$edgeId"]`; add `frequency` where claim classes invite
   spam. Rejected priors never block resubmission (the honest-fix path).
9. **Claim-supports-claim travels as receipt CIDs in the body**: the claim form carries a
   `supportingReceipts` array field; gates check presence/count; the graph oracle verifies
   the receipts' JWS + verdict classes server-side. (If/when the engine lands a native
   `linkedClaims` block — our upstream RFC — move verification into it.)
10. **Stay off the v2 surface** (owner-confirmed 2026-08-16, holding for ~2 quarters —
    rfc-005 §5): `withinBoundary`, `withinRadius`, `geo` fields, and `ctx.submitter.prior*`
    tokens parse but bind `unusable` today. Do not author them into anything you anchor.
    **Geo checks go through the oracle instead**: `within-boundary` / `within-radius`
    (tools/outcome-graph-source.md) over a content-addressed boundary artifact — pin the
    boundary's `urn:ixo:geo-boundary:` address in a gate (geometry inside the rubric hash),
    pin the radius as a `send` literal, send coordinates as integer micro-degrees, and route
    GPS drift to review, not reject. Worked example:
    `examples/clean-water/rubric-site-visit.json`; its native-operator twin lives in
    `examples/clean-water/v2-pending/` (validates, deliberately un-anchorable) ready for
    activation day.

## Claim-form catalog discipline

The rubric's `$refs` bind against the claim class's form catalog (`#vct`). For each impact
claim class, the form is designed WITH the rubric (see
`examples/clean-water/claim-form.catalog.json`): every field a condition reads must exist in
the catalog with the right kind, and the form hash goes into `claimSchema.proof`. Form drift
(re-publishing the form) breaks the pin — the binder rejects with `BIND_FORM_DRIFT` and the
rubric must be re-authored against the new form hash. Canonicalize claim bodies (sorted
keys) so `claimId = CIDv1(body)` is reproducible.

## Standard blocks per impact claim class

| Claim class | Gates | Criteria | Review |
|---|---|---|---|
| Output achieved (node) | graph-pin format; admissibility (oracle) | indicator coverage bands; measurement freshness | optional |
| Causal link holds (edge) | graph-pin; admissibility (oracle); supporting receipts present | graph-oracle validation score (critical); mechanism AiCheck; comparison coverage bands; analyst ManualScore | analyst task on the effect evidence |
| Outcome achieved (node) | graph-pin; admissibility; outcome-node semantic status | indicator measurement bands; independent-source flag | on weak independence |
| Graph validated (version) | check-graph exit 0 attested by oracle; expert review recorded | coverage of blocking findings (must be 0 → BooleanScore) | on any waived finding |

## Authoring workflow

1. Draft the form catalog and rubric together; validate rubric against the vendored schema
   (`npm run validate`) and re-check the four Zod-only rules.
2. Dry-run every `ExternalSource` against the deployed oracle with the engine's
   `POST /v1/rubric-source-preview` harness.
3. Preview resolution end-to-end with `POST /v1/collections/:id/rubric/preview`.
4. Anchor: upload rubric bytes, set the LinkedResource `#rub` proof to their sha256; pin the
   form hash in `claimSchema.proof`.
5. Keep `allowChainEvaluation` off until real claims have exercised every gate and criterion;
   review the first evaluations by hand before enabling chain writes.
