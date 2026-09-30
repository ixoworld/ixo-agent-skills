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

## Workers runtime change required

The runtime does not do this today. `ctx.ucan.mintInvocation` hard-codes `facts: [{ nonce }]`, and nothing lists a user's grants for a service. The patch `qiforge-workers-search-gateway-authorize.patch` (against ixoworld/qiforge `e61b285`) makes three changes.

**1. Facts passthrough.**

- `ctx.ucan.mintInvocation(target, { can, facts })` and `createInvocationFromDelegation(…, { facts })` merge caller facts into the invocation.
- The host still generates `nonce` last, so a caller cannot choose it.
- Files: `do/ucan-service.ts`, `do/ambient.ts`, `core/runtime-context.ts`, `plugin-api/types.ts`.

**2. `ctx.ucan.listAudienceGrants(userDid, { storeUrl, audienceDid })`.**

- Returns every active UCAN-store delegation that the user issued **to that audience**, at most 20.
- Issuer and audience are checked on the token itself. The existing `getServiceDelegation` matches store rows by capability only, and could hand back the user's oracle delegation instead.

**3. New `search-gateway` plugin** (`plugins/search-gateway/`), bundled in `BUNDLED_WORKERS_PLUGINS`.

- It contributes one request-time tool, `search_gateway_authorize({ requestDigest })`, only when the oracle has a signing key.
- The tool:
  1. resolves the gateway DID from `SEARCH_GATEWAY_URL`, or from the `NETWORK` defaults: `search.ixo.earth`, `testnet.search.ixo.earth`, `devnet.search.ixo.earth`;
  2. mints `search/authenticate` on `ixo:search` with facts `{ iat, rd }`;
  3. appends the user's gateway grants, read from `UCAN_STORE_URL`;
  4. stores the Bearer value in the user-scoped blob store with a 300 s TTL;
  5. returns `{ blobId, writeTo, audience, grantCount }`.
- Error text tells the agent whether the user is missing the authentication capability or the gateway grants.

Verified on a local clone of qiforge `e61b285`:

- `tsc --noEmit`, ESLint (no new findings) and Prettier are clean.
- The core suite passes: 52 files, 391 tests, including 4 new tests for the tool.
- The workerd suite passes: 105 files, 785 tests.
