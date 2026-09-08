# From intent to a decision-ready proposal

## Make the first useful Draft

Preserve the original request. State the decision in one sentence and identify the next unknown that changes the proposal: the decision itself, governing group, scope, or authorised actor. Use known context before asking. Strategy, policy, budget, appointment and operational decisions all fit; an informational question may need an answer rather than a governance submission.

Start a working Draft even if authority or budget is unresolved. Use a stable proposal reference once the organisation's convention is known; a local temporary label must be labelled temporary. Do not fabricate an official reference. A Draft may have just a title, decision intent and visible questions. Missing facts become readiness blockers only for the stages that need them.

Resolve where work belongs. Prefer an existing matching Topic. Use a Proposal Topic for preparing something for approval, an Evaluation Topic for comparing evidence, and Claims work for later assertions. Follow the current Topic contract through its host; do not invent a new Topic Kind or treat Topic setup assent as DAO approval. Private intent must not silently become shared room content.

## Build the seven-section core

Use the bundled template, aiming for about two pages before annexes:

1. Record details: reference, title/version/date, entity DID, governing group, proposer, accountable owner, Topic, visibility.
2. Resolution: exact approval, actor/action, scope and limits, conditions and effective event/date; whether direct messages or delegated Flow actions are included.
3. Context and intended outcome: why now, stakeholders, observable success.
4. Options: credible alternatives including current position, criteria, recommendation, tradeoffs.
5. Evidence and consequences: supporting and conflicting sources, assumptions, uncertainty, benefit, cost, risk and mitigation.
6. Authority/process: actual mandate, eligible voters, quorum/threshold/timing/deposit and other applicable rules, consultation, conflicts and recusals. Cite the source and observation time; never supply defaults.
7. Implementation/accountability: responsible actors, milestones, resources, dependencies, completion evidence, review and actual reversal/reconsideration rules.

Attach each triggered annex: financial commitment; executable actions; membership/delegated authority; policy/governance changes; material impact/sensitive information. Include off-chain effects and recurring exposure even if the chain message list is empty. Keep negative evidence and objections visible through deliberation. Attribute edits and suggestions; verify factual claims against accessible sources.

## Design the evaluation before voting

Use the [evaluation plan](../assets/evaluation-plan.md) to specify expected execution evidence separately from intended outcomes. Propose measurable criteria, baseline, target, unit/population, observation window, evidence owner, collection/protocol/rubric when known, and authorised evaluator/decision path. Label suggestions proposed until accepted through the applicable process. Do not invent dates, authorities, rubric weights or success thresholds.

Identify who will be able to retrieve the evidence, who may submit claims and challenge findings, and any collection-triggered payment. Material uncertainty about whether success can be measured belongs in the proposal. Missing outcome data today is expected for future outcomes; missing a necessary measurement plan may block readiness. Do not change the criterion after seeing results to manufacture success.

## Make delegated resolutions machine-readable

Read the bundled GRS-001 and schemas before preparing a delegated Flow. Bind the real action registry version, Flow plan/topology, actor, gateway, executor, exact resource and pinned inputs. Include provider tenant/connection/operation/resource IDs for off-chain actions. Resolve issuer mandate, activation event, time window, conditions and evaluator evidence policies, revocation and shared usage limits.

Render the same authorisation as “Resolved that [group] approves [decision], authorises [actor/action], within [scope/limits], subject to [conditions], effective [date or precisely defined event].” Include every grant and material restriction in the readable projection or readable annex. Compare machine values and prose; neither may silently broaden the other. Validate against the bundled resolution schema using a declared validator if available; if unavailable, label manual review and leave machine validation pending.

GRS v0.2 fixes effect inputs by CID. Do not place unresolved expressions such as “all approved recipients”, runtime substitutions, or a mutable query in an executable grant. Split or revise the proposal when fixed authorisation cannot express the intended work. A generic Base UCAN Flow is a plan; unsigned delegation options are not a token. An action-free policy decision does not require a fabricated Flow or empty delegation.

## Readiness response

For each next step report `ready`, `blocked`, or `not applicable — reason` as a local assessment, with evidence and the actor who can resolve it. At minimum assess exact resolution, authority/process, material evidence/tradeoffs, owner/implementation, access, executable-message binding, delegated-runtime support and outcome evaluation plan. Separate a proposal ready for deliberation from one ready for submission or execution.

Missing production GRS enforcement prevents automatic governed execution. It does not prevent discussing a proposed design or submitting a clearly conditional implementation decision whose activation cannot occur until the approved requirements are met. Never tell voters execution is available when that is unverified.
