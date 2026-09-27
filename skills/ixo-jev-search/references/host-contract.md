# Host contract: minting the gateway authorization

The skill never holds a key. For each search, the host (the QiForge oracle runtime) mints one single-use authorization. It does this after `prepare` and before `search`. This page gives the exact contract. The normative spec is the gateway's `docs/authorization/http-envelope-v1.md`, in the section on delegated authentication.

## Signed once by the user (Portal)

1. **Authentication delegation** (user → oracle):
   - `issuer`: the user's DID
   - `audience`: the oracle's DID
   - `capabilities`: exactly `[{ can: "search/authenticate", with: "ixo:search" }]`, with **no `nb`**
   - no proofs
   - a finite expiration (the user chooses it)
2. **Gateway grants** (user → gateway DID). Each grant has exactly one capability, and its `nb` carries the full caveats object:

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

   `relevanceEvaluation: true` on the VFS grant is the user's explicit opt-in to let the relevance classifier score their private files. Leave it out, and private files are returned **unscored**.

   Keep `maxResults: 20`. Jev ranking over-fetches up to the smallest `maxResults` across the grants, which gives the reranker more to choose from.

The gateway checks all of these. The agent can only authenticate searches that the user's own grants already allow. Revoking the authentication delegation stops the agent immediately.

## Minted by the host for each request

The skill's `prepare` prints `mint.audience` and `mint.facts.rd`. Using them, the host creates:

```ts
const invocation = await createInvocation({
  issuer: oracleSigner,                     // the agent
  audience: mint.audience,                  // gateway DID from /.well-known/did.json
  capability: { can: "search/authenticate", with: "ixo:search" },
  proofs: [userAuthenticationDelegation],   // exactly one proof
  expiration: now + 120,                    // short; single-use regardless
  facts: [{ nonce: crypto.randomUUID(), iat: now, rd: mint.facts.rd }],
});
const bearer = [
  await serializeInvocation(invocation),
  ...userGatewayGrants,                     // base64 CARs, as stored
].join(".");
// write `bearer` to mint.authorizationFile (opaque write; never through the LLM)
```

- A new `prepare` means a new `rd`, which means a new mint. Invocations are consumed atomically, and a mismatched `rd` is rejected with 401 before anything is spent.
- The skill deletes the authorization file after each `search`, whether it succeeded or failed.

## Required QiForge change (drafted, not applied)

`UcanService.mintInvocation` in `packages/oracle-runtime-workers/src/do/ucan-service.ts` (and its Node counterpart) currently hard-codes `facts: [{ nonce }]` and returns only the invocation. For this skill it needs two additions:

1. **A facts passthrough.** It must accept an optional `facts` record and merge it with the generated nonce:

   ```diff
   -      facts: [{ nonce: crypto.randomUUID() }],
   +      facts: [{ nonce: crypto.randomUUID(), iat: nowSeconds, ...(options.facts ?? {}) }],
   ```

   Keep `nonce` host-generated: a caller-supplied `nonce` must be ignored.

2. **Bearer assembly.** It must append the user's stored gateway grants (from the UCAN store, matched by gateway DID) after the invocation, separated by `.`. It then writes the result through the existing opaque blob write (`sandbox_write_blob`) to `/workspace/data/ixo-jev-search/authorization`.

The existing `mintInvocation` checks still apply: the delegation audience must equal the oracle DID, and the lifetime is capped by the delegation.
