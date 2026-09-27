# Framing queries for Jev relevance

Jev is a classifier. For every released result it answers one question: does this item concretely answer or directly serve the information need in the query? That shapes how you should write queries.

## Describe the need, not keywords

The query is passed verbatim to the sources and to the classifier. The gateway never rewrites it; jevgrep's study found that rewriting did not help end results. So write the query the way you would brief a researcher.

| Instead of | Write |
| --- | --- |
| `solar kenya` | `solar mini-grid operators serving rural communities in Kenya` |
| `carbon credits cookstove` | `projects issuing carbon credits for clean cookstove distribution` |
| `my report` | `my Q3 impact report draft for the water project` (with `--categories files`) |

## Identifiers go in verbatim, in keyword mode

- DIDs: `did:ixo:entity:…`, `did:ixo:ixo1…`
- Addresses: `ixo1…`
- Transaction hashes: 64 hex characters
- Claim ids

Pass the identifier as the whole query with `--mode keyword` and the matching categories, for example `transactions,claims,messages` for the chain catalog. Exact matches always rank first, ahead of any classifier score.

## Pick categories on purpose

- The Domain Indexer only answers `hybrid`.
- The chain catalog only answers `keyword` identifiers.

One request cannot do both. Use the returned `followUps` to go from a relevant domain to its on-chain activity. That is one extra round, with a fresh mint.

## Tuning

- **Too few results?** Lower `--min-relevance` (for example to `0.1`) to keep more leads.
- **Too many weak results?** Leave the default of `0.25`, and answer only from the `relevant` tier.
- **Want text evidence?** Use `--output-level snippets` if the grants allow it. Snippets come back ordered by relevance too.
