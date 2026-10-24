# Host contract: QiForge Workers runtime

The skill never holds a key. For each search, the host mints one single-use authorization, after `prepare` and before `search`. This page covers QiForge's Workers runtime (`packages/oracle-runtime-workers`) only.

Normative spec: the gateway's `docs/authorization/http-envelope-v1.md`, in the section on delegated authentication.

## Agent flow for one search

1. `node scripts/jev-search.js prepare …` prints `mint.facts.rd`.
2. `search_gateway_authorize({ requestDigest: <mint.facts.rd> })` returns `{ blobId, writeTo }`.
3. `sandbox_write_blob({ blobId, path: writeTo })` writes the Bearer value to `/workspace/data/ixo-jev-search/authorization`. The value never passes through the conversation.
4. `node scripts/jev-search.js search`

A new `prepare` produces a new `rd`, so step 2 has to run again. Each authorization works for exactly one request.

## What the user authorizes (Portal)

The Workers runtime keeps **one** delegation per user and oracle. It is deposited with `POST /delegation` (or the `ucan_delegation` room state), and every plugin mints from it.

**1. Search authentication, added to that oracle delegation.** Add one capability:

```json
{ "can": "search/authenticate", "with": "ixo:search" }
```

`search/*` on `ixo:search` is also accepted. The capability must carry no `nb`.

The delegation keeps its other capabilities, such as `* ixo:filesystem/.oracles` and `skills/* ixo:skills`, and it may have no expiry. The gateway requires:

- exactly one `ixo:search` capability;
- that capability grants authentication;
- no other capability names an `ixo:search/…` resource;
- no proofs on the delegation;
- the delegation is addressed to the oracle that signs the invocation.

**2. Gateway grants, deposited in the UCAN store.** These are separate delegations:

- issuer: the user;
- audience: the **gateway DID**;
- each has exactly one capability, whose `nb` holds the full caveats.

| `can` | `with` | Needed for |
| --- | --- | --- |
| `search/query` | `ixo:search` | every search |
| `search/semantic` | `ixo:search` | `hybrid` or `semantic` mode |
| `search/list` | `ixo:search/domains/<domain-indexer did>` | domains |
| `search/list` | `ixo:search/blocksync/<blocksync did>` | transactions, claims, messages (the follow-ups) |
| `search/list` | `ixo:search/vfs/<vfs did>` | the user's private files |
| `fs/read` (bare, no `nb`) | `ixo:filesystem` | the user's private files (paired with the VFS list grant) |

Caveats (`nb`):

```json
{ "categories": ["domains", "transactions", "claims", "messages", "files"],
  "connectors": ["domains", "blocksync", "vfs"],
  "modes": ["keyword", "semantic", "hybrid"],
  "maxResults": 20, "maxRuntimeMs": 5000, "facetKeys": [],
  "maxDisclosure": "snippets", "openActions": [], "allowExistenceSignal": false,
  "relevanceEvaluation": true }
```

- `relevanceEvaluation: true` on the VFS grant is the user's opt-in to let the relevance classifier score their private files. Without it, private files come back **unscored**.
- Keep `maxResults: 20`. Jev ranking over-fetches up to the smallest `maxResults` across the grants.

The skill binds the gateway to its origin: `prepare` accepts a gateway only if its did:web DID matches its host, and `search` refuses to send the credential to any other origin. An authorization minted for the real gateway DID therefore can't be relayed through a look-alike URL.

The gateway only honours grants that the user issued to the gateway, so the oracle can only authenticate searches the user already allowed. The receipt records the oracle as `actorDid` and the user as `rootActorDid`. Revoking the oracle delegation stops the oracle at once, because the gateway revocation-checks the hop.

## Source dependencies and installed compatibility

The delegated route is implemented by the existing source changes below:

- [QiForge PR 325](https://github.com/ixoworld/qiforge/pull/325), commit `4e2765565d065d85c5c369047435d7a7c636efd6`, supplies the request-digest-bound host authorizer.
- [Search gateway PR 12](https://github.com/ixoworld/ixo-search-gateway/pull/12), commit `f8d06e3377813269faa16ea96626462ecb509d5f`, supplies delegated gateway verification.

These are source pins, not evidence that a deployment contains either change. The earlier patch against `e61b285` is historical and is not an installation route. Do not implement or apply a second authorizer from this skill.

Before execution, the host must expose `search_gateway_authorize` and `sandbox_write_blob` with write scheduling effects. Missing either tool is a concrete block. The gateway must independently prove delegated, request-digest-bound verification and denial of missing, revoked, or mismatched grants. A self-issued-only gateway cannot satisfy this route.

`delegated-search-v1` names this requirement in `skill-contract.json`. The current Workers gate has no installed service-profile evidence and blocks this requirement. Source tests or an unpublished archive cannot clear that block.
