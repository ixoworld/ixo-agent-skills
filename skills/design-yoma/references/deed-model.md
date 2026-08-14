# The Deed Model

Read this before designing any new Deed. It fixes the vocabulary, the entity bindings, and the
boundary between what is designed here and what exists on chain.

## What a Deed is

A **Deed** is a programmable package of work: a unit a young person performs, proves, and gets paid
for. It packages instructions, claims, evaluation rubrics, service integrations, governance
mechanisms, rights and permissions, AI agents and their token budgets, group messaging, and the
accounts that hold funds for implementation.

It is not a job posting. A job posting describes work. A Deed *runs* it — it carries the rules that
decide whether the work was done, the authority that lets the youth submit proof, and the settlement
that pays them.

## The load-bearing fact

> **A Deed is the entity that owns a claim collection.**

In the claims action registry, `deedDid` and `entityDid` are the same value. Every claim a youth
submits is submitted *into a collection*, and that collection belongs to a Deed. This is why the Deed
is the natural unit of design: it is the smallest thing that has its own rules, its own proof, and its
own money.

## Entity bindings

| Concept | ixo binding | Notes |
|---|---|---|
| Deed blueprint (a template) | `protocol/deed` | A blueprint class; other domains instantiate from it |
| Deed instance (an opportunity) | `deed/request` | Categorised under "Discover opportunities" |
| Deed as a domain document | `domain.type: deed` | Manifest document type is `terms`, not `charter` |
| Provider POD | `domain.type` per `domain-author` | Created via the `manage-flow` POD recipe, `entityType: "dao"` |
| The work's proof | claim collection owned by the Deed | `collectionId` is the subject of both bids and claims |

The `domain.type: deed` block requires:

```yaml
deed:
  mode: request | offer | agreement | fulfillment
  requester:
  provider:
  terms_resource:
  claim_collection:
  fulfillment_flow:
```

Do not author this by hand. Route to `domain-author`, which validates against the pinned `domain.md`
specification. See `delegation.md`.

## Where the parts live

This trips people up constantly. The Deed does not hold its own forms and rules — the **protocol
entity** does.

| Artifact | Resource id | Type | Anchored on |
|---|---|---|---|
| Claim form | `{id}#vct` | `surveyTemplate` | **Protocol** entity |
| Contributor bid form | `{id}#bco` | `bidContributor` | **Protocol** entity |
| Evaluator bid form | `{id}#bev` | `bidEvaluator` | **Protocol** entity |
| Published rubric | `{id}#rub` | `rubric` | **Protocol** entity |

Resolution at runtime walks: `deedDid → claim collection → collection.protocol → protocolDid →
linkedResource`. So when a control says "design the bid form", the artifact it produces will be anchored
on the protocol the collection points at, not on the Deed itself.

Two consequences worth carrying:

- Changing a form or rubric affects **every** collection pointing at that protocol. Check the blast
  radius before staging a change.
- A rubric's field paths are drawn from the live `#vct` catalog. If `#vct` changes after a rubric was
  authored, the rubric drifts and will be rejected at publication. See `claim-and-rubric-design.md`.

## The Yoma vocabulary bridge

**No Yoma-facing document uses the word "Deed."** Yoma says *opportunity*, *impact task*,
*challenge*, *gig*. The Yoma glossary defines an **opportunity provider** as "a Yoma role that is
fulfilled by any Yoma member that recruits youth participants to undertake their opportunities."

Hold both vocabularies and translate at the boundary:

| Yoma / provider-facing | This skill / ixo-facing |
|---|---|
| Opportunity, impact task, challenge, gig | Deed |
| Opportunity provider | Deed controller / provider POD |
| Youth participant | Service agent (`role: "service_agent"`, `SA`) |
| Applying for an opportunity | Submitting a bid |
| Being accepted | Bid approved → `SubmitClaimAuthorization` granted |
| Submitting proof of completion | Claim submission into the collection |
| Verification | Claim evaluation against the rubric |
| Reward, ZLTO, payout | Settlement |
| Digital CV, YoID | Credential issued on approved claim |

**Speak the provider's language in every user-facing sentence.** An opportunity provider designing a
tree-planting task should never have to learn the word "collection" to answer a question. Use the ixo
terms in staged artifacts and payloads, where they must be exact.

## The lifecycle this skill sits in

```
DESIGN  ──►  INSTANTIATE  ──►  RECRUIT  ──►  PERFORM  ──►  VERIFY  ──►  SETTLE
  │              │                │             │            │            │
this skill   domain-author    bid/submit    claim/submit  claim/    payment/
             + manage-flow    bid/evaluate                evaluate   execute
                                                                    credential/store
```

This skill owns **DESIGN** and stages the handoff to INSTANTIATE. Everything to the right of that is
runtime, owned by the Portal, the controller, and `flow-agent`.

## Roles

| Role | Code | What it is |
|---|---|---|
| Provider / owner | `PO` | Collection controller. Entity NFT owner. |
| Service agent | `SA` | The youth performing the Deed. Submits claims. |
| Evaluation agent | `EA` | Evaluates claims. May be human, oracle, or both. |
| Investor | `IA` | Funds the Deed. |

**Controller** — who may evaluate a bid or determine a claim — resolves as the union of: the entity
NFT owner, any DID listed in `entity.controller[]`, and any address holding a `GenericAuthorization`
granted by the admin account. The **admin account** is the entity account named `admin`; it is the
granter for all authorizations.

There is no on-chain "approved" flag for a participant. Approval *is* the existence of an
authorization grant, plus a status flip in the bid room. Design accordingly: if you want to know
whether a youth may claim, the answer is read off the grants, not off a field.

## What "designing a Deed" actually decides

By the end of the five phases, these are settled and staged:

1. **Who** may do it — eligibility, bid form, capacity, risk tier.
2. **What** they do — task steps, effort, duration, instructions, skills earned.
3. **What proves it** — evidence types, capture method, claim schema.
4. **How it is judged** — rubric gates, scoring, who determines, when a human must.
5. **What they get** — reward, rails, settlement trigger, credential.
6. **What protects them** — safeguarding tier, consent, access, fraud controls, rights.
7. **How it goes live** — flow, instantiation, listing.

If any of the seven is missing at `launch_readiness`, the Deed is not ready, regardless of score.
