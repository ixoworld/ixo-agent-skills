# Source and compatibility notes

Inspected 8 September 2026. These findings identify the source basis for v0.2.0; they do not verify deployment or adoption.

## Existing IXO contracts

The Portal source snapshot inspected was commit `0056a4f0db33e3ab8547c5e561e49f6ddeca562a` in [ixoworld/ixo-portal](https://github.com/ixoworld/ixo-portal/tree/0056a4f0db33e3ab8547c5e561e49f6ddeca562a).

| Source within that snapshot | Relevant observation |
| --- | --- |
| `packages/editor/src/core/types/baseUcan.ts` | `BaseUcanFlow` is a planning intermediate representation. Capabilities carry `id`, `can`, `with`, and `nb`; topology, actor constraints, and TTL are separate. |
| `packages/editor/src/core/types/ucan.ts` | Signed delegations/invocations use CAR storage. Capabilities have `can`, `with`, and `nb`; proof references and execution records remain distinct. |
| `packages/editor/src/core/services/ucanService.ts` | Delegation mapping passes issuer, audience, capabilities, proofs, and expiration to the UCAN library. UI milliseconds are converted to wire seconds. |
| `packages/editor/src/core/lib/flowEngine/authorization.ts` | Node authorisation uses `flow/block/execute` on a Flow-node resource. Legacy bypasses exist; governed execution must require signed authorisation explicitly. |
| `lib/blocknote/handlers.ts` and `transformActionsToMsgs.ts` | Proposal creation resolves action inputs into `title`, `description`, and final ordered `msgs`. This does not establish a pinned-input governance bridge. |

The local VFS CID implementation computes content identifiers over file bytes using CIDv1, SHA-256, raw leaves and a UnixFS layout for larger files. The repository's small-file reference helper only covers files at most 1 MiB. Use the real VFS encoder and upload/read-back for live artifacts.

## UCAN implementation profile

The installed and pinned [`@ixo/ucan` 2.1.0 package](https://www.npmjs.com/package/@ixo/ucan/v/2.1.0) is built on ucanto. Its manifest pins `@ucanto/core` 10.4.6 and `@ucanto/validator` 10.0.1. Its inspected DAG-UCAN dependency uses version 0.9.1. The lockfile records the versions and integrity hashes actually used by repository tests.

The [upstream UCAN specification](https://github.com/ucan-wg/spec) now describes version 1.0 and separate delegation/invocation specifications. That is not evidence that the inspected IXO package implements the same wire format. GRS-001 explicitly profiles the existing ucanto capability model; migration to another wire format requires an explicit compatibility profile and conformance evidence.

The library's `defineCapability` supports custom caveat schemas and `derives` checks. GRS-001 requires an actual derivation check for `nb.gov`; generic signature acceptance is insufficient. Its `createDelegation` helper supports `notBefore`; the inspected `createInvocation` convenience wrapper does not expose that option. The cryptographic tests use the underlying exported `UcantoClient.invoke` to retain not-before in invocations.

The inspected generic validator has permissive resource self-issuance paths and a no-op authorisation-status callback. Its default replay store is in memory. Therefore it is not, on its own, a conforming governance authoriser, resource-local revocation verifier, or distributed replay/budget service. Production integrations must enforce the exact issuer/mandate, selected proof path, decision activation, caveats, and durable concurrency controls independently.

## Governance context

The [IXO POD guidance](https://docs.ixo.world/articles/pods) explains the organisational context for roles, governed workflows, and bounded agent authority. The [DAO DAO single-choice module](https://github.com/DA0-DA0/dao-contracts/tree/main/contracts/proposal/dao-proposal-single) distinguishes voting from execution. Actual voting, deposit, revoting, execution, and finality rules must come from the selected group's deployed configuration and mandate.

## New requirements introduced here

GRS-001 introduces the structured resolution, critical `nb.gov` caveat, dual Flow/effect capability mapping, post-decision issuance requirements, fixed-input profile, deterministic projection, and off-chain shared-budget/receipt rules. These are proposed requirements, not claims about current Portal, Topic Protocol, VFS, or connector behaviour.

The `example/crm.set-status` action and `example-crm/update` capability are fictional. A production integration must map to a real versioned action registry and an enforcing executor. No new Topic event type, DAO contract, or connector API is asserted by these examples.
