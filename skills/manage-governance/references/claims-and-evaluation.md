# Claims, evaluation, challenge and learning

## Start from the assertion, not a success label

Ask what is being claimed only if it is unclear. Separate:

- **Decision/process assertion:** the specified group made this decision under the evidenced process.
- **Execution assertion:** these specific actions occurred, with this compliance or deviation from the approved authority and conditions.
- **Outcome assertion:** this observed change met or failed the intended criteria for the stated population and period.

A chain approval supports the first, an authentic execution receipt may support the second, and measured evidence is required for the third. A claim may truthfully report failure, partial delivery, no observed change or an inconclusive outcome. Do not infer causation, value for money, beneficiary benefit or absence of harm from a transaction or Flow completion.

## Build an evidence-backed Draft

Use the [claim worksheet](../assets/claim-worksheet.md). Bind each assertion to the stable proposal reference and exact submitted proposal/resolution CIDs, DAO identifiers/decision evidence, relevant grant/node/run/receipt references, and the observation period. Identify claimant/subject and distinguish source facts, calculations, assumptions and model interpretations.

For execution claims, compare the authorisation with actual actors, recipients, amounts/denominations, resources/permissions, conditions, effective window, limits, ordering and effects. For outcome claims, compare observations with the accepted baseline, measure, target and evaluation method. Record missing and contradictory evidence, access limitations, measurement bias, unintended effects, plausible alternative explanations and uncertainty. “Insufficient evidence” is a useful conclusion.

Prefer original provider/chain/signed receipts and attributable observations. Verify integrity, provenance, actor/service authenticity, freshness, and binding; a hash proves byte integrity rather than truth. Preserve raw evidence and reproducible calculation inputs/method/version. Minimise sensitive data in the narrative; retain protected access references needed by authorised evaluators and challengers.

## Resolve the real claim contract

Resolve exactly one owning entity DID and collection ID for each claim binding, then its protocol DID, claim schema, governed rubric/version, submission and evaluation authorities, time windows, constraints, and dispute process. Read collection payment settings and any automatic submission/evaluation/approval effects. Keep unresolved selection visible; never invent a collection or create one incidentally. Different collections require separately bound claims.

The local worksheet is not a network claim payload. Map it to the actual current collection schema only after inspection. If available, use the discovered claims skill/service; otherwise stage a supported Portal claim form. Read the form's schema/context before filling and preserve exact option values. Form completion is not submission. Do not declare a claim valid because its narrative sounds plausible.

Use the protected transport declared by the adapter. VFS claim evidence lanes and existing claims-bot/Matrix references have their own access rules; ordinary governance documents and private claim bodies are not interchangeable. Never use an unprotected gateway, copy to a wider room, or introduce Cellnode to work around denied evidence access. If a required evaluator cannot read evidence, report the readiness blocker and seek the permitted disclosure route.

## Submit or evaluate only within authority

Before submission, verify claimant identity/acting-for scope, exact collection/schema, evidence availability, acceptance of the concrete assertion, and the existing SubmitClaim authorisation or equivalent declared contract. Reuse the person's explicit scoped request; do not repeatedly ask for permission already given. Native wallet or form review still applies. If only a staged form is available, stop at the user-visible submission step and say so.

After submission, reconcile/read back the real claim ID, entity/collection, content/evidence binding, transaction/service receipt, status and time. An unsigned Draft or submitted claim is not an accepted claim. Reconcile uncertain submissions before retrying, using the adapter's idempotency key or intent/transaction binding.

Before evaluation, verify the governed rubric and claim version, evidence access, evaluator DID/account and delegation from the proper controller, conflicts and required independence. A proposer, executor, claimant or companion does not become evaluator by involvement. If self-evaluation is explicitly permitted, disclose the relationship and limits; otherwise route to the authorised independent evaluator. A user's request to “approve my claim” cannot override these rules.

The agent may extract typed facts, calculate metrics and prepare criterion-by-criterion recommendations. An authoritative evaluation requires the real evaluation service's authorised, signed/read-back record and decision path (including UDID or on-chain evaluation where the deployment uses them). Show which result is a recommendation and which is authoritative. Do not manufacture `approved`, signed receipts, credentials or chain status from model output.

Evaluation-triggered payment, credential issuance and settlement must be understood before the consequential evaluation is submitted. Verify the exact action is covered, including those consequences. Never submit an evaluation through a payment-triggering path when the accepted scope permits only a non-effecting assessment. Credential issuance and settlement retain their own evidence; approval alone does not prove either.

## Challenge, reconsider and close

Retain the original claim, evidence version, evaluation record and decision. A correction or challenge links to them with new evidence and the proposed remedy. Follow the real collection/protocol deadline, eligible challenger and adjudicator rules; if those are missing, flag the blocker rather than appointing an adjudicator. Use a linked Claims, Evaluation or Incident Topic only via the appropriate host path and audience.

Do not rewrite the original rubric or voted resolution after observing outcomes. Apply existing correction/re-evaluation rules to a new version, or propose a prospective governance change. Distinguish evaluation reversal from action compensation and policy supersession; each needs its own authority. Revocation cannot undo completed off-chain effects.

At the accepted review date/event, summarise intended versus observed results, compliance, total evidenced costs, stakeholder feedback, harms, unresolved disputes and lessons. Record what is unknown and who owns it. Propose continuation, adjustment, reversal or supersession with evidence; initiate a new proposal when requested. Topic closure must follow its own current completion rule and authorised actor, not an inference from a successful claim or settled payment.
