# Conformance and validation

Conformance requirements are normative in [GRS-001](../specs/GRS-001-governed-flow-authorisation.md). This page separates locally demonstrated properties from integration work that remains.

## Checks implemented in this repository

`npm run check` checks schemas, internal links, generated projection drift, CID references, and the example's pinned Flow/manifest/input relationships. `npm test` includes positive and negative document/mapping tests and signed UCAN tests using temporary identities.

| Property | Evidence |
| --- | --- |
| Machine document shape and semantic references | Strict schema rejection, unique nodes/grants/conditions, valid time windows, and condition/delegation checks |
| Human projection | Golden generated text; changing an effect-bearing scope changes the projection |
| Artifact pinning | Exact-byte local CID recomputation and resolution/proposal mapping; no self-reference |
| Caveat propagation | Separate Flow/effect capabilities carry the same full governance binding |
| Restricted attenuation | Tests reject broader count/depth/audience, changed inputs/tenant/executor, removed conditions, and unknown profile |
| Actual UCAN serialisation | Signed delegation CAR round-trip preserves capabilities, caveats, and time bounds |
| Basic cryptographic invocation checks | Tests accept an in-scope synthetic proof and reject wrong audience, untrusted self-issue, expiry, widened/dropped caveats, tampering, and sequential replay |

These checks do not establish that a proposal was approved. The signed tests use in-memory keys and a synthetic trust root. They do not use organisational keys, create live governance grants, or call a provider.

## Required integration evidence before live authorisation

| Component | Required demonstrations |
| --- | --- |
| Publisher | VFS upload and voter-authorised retrieval; pinned proposal/resolution/direct-message references; actual Portal signing and authoritative read-back; mismatch recovery |
| Issuer | Exact group/chain/proposal approval and configured finality; trusted pre-existing mandate; issuer key and resource authority; bounded recipient/expiry; executed activation where required |
| Gateway | Mandatory signed node invocation; exact pinned Flow/manifest/input mapping; applicable condition attestation checks; no legacy bypass |
| Effect executor | Correct action capability, invocation audience, inputs, actor/delegation path, connector tenant, provider credentials, and critical caveat enforcement |
| Delegation/revocation | Audience allowlist and per-hop depth consumption; every selected proof ancestor checked; authenticated fresh revocation and resolution suspension; no renewal bypass |
| Shared accounting | Atomic replay claims under concurrency; one shared execution budget across descendants, renewals, replicas, and runs; no double reservation between node/effect layers |
| Provider recovery | Timeout after possible commit; replay-safe reconciliation; preserved reservations; prevention of unsafe duplicates; separately authorised compensation |
| Records | Authenticated receipts, provider read-back, restricted evidence access, and distinct approval/execution/outcome states |

For each row, retain the implementation version, environment, inputs, expected rejection/acceptance, actual result, and evidence reference. Do not mark a row passed from schema validation alone.

## Implementation boundaries of reference helpers

`draftDelegation()` returns unsigned options and checks local mappings. It does not authenticate the decision binding or issuer mandate. `assertAttenuation()` compares caveat constraints; it does not verify signatures, terminal audiences, per-hop depth consumption, token lifetime, revocation, or shared use counters. The signed tests exercise the library separately and do not close those runtime gaps.

The local CID helper is deliberately limited to small fixture files. Example IDs and chain addresses are synthetic, and the source policy files explicitly state that no mandate or trusted evaluator is established. Validating them must never activate production execution.
