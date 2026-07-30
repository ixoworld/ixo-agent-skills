---
name: ixo-yellowcard
description: >
  YellowCard payment disbursement skill for paying recipients across Africa.
  Supports payouts to bank accounts and mobile money (M-Pesa, MTN, Airtel, etc.)
  in 20+ African countries and 50+ currencies. Use when the user mentions
  "pay", "payout", "disburse", "send funds", "task payment", "mobile money",
  "yellowcard", or needs to send money to recipients in Africa. Batch-native:
  every call accepts 1..N payouts in one request.
version: 3.0.0
author: ixo
license: MIT
compatibility: Node.js 18+
allowed-tools: shell
secrets:
  oracle: []
  user: []
context:
  - _SKILL_CONTEXT_USER_DID
  - _SKILL_CONTEXT_SANDBOX_ID
  - _SKILL_CONTEXT_TIMESTAMP
---

# YellowCard Payout Skill

## Purpose

Pay recipients via YellowCard's payment infrastructure through the **ixo-yellowcard-worker** (a Cloudflare Worker). All YellowCard API credentials and HMAC signing happen server-side in the worker — no payment secrets are exposed to the skill sandbox. Authentication is via UCAN.

**The worker is batch-only.** Every request body wraps an array; a single payout is a batch of length 1. This is intentional — the editor's payment block holds a worklist of rows, and the oracle's job is to translate "operator selected these N rows and clicked Propose / Execute / Check" into one batch call.

## Trigger Conditions

Activate when the user:
- Wants to pay one or more people via YellowCard
- Asks about available payment channels or networks in a country
- Wants to check payment status (one or many at a time)
- Asks about exchange rates for African currencies
- Is operating a payment block in an editor flow (companion prompt carries `Verb`, `Payment block ID`, `Row IDs`, `UCAN delegation CID`)

## Safety Rules

1. **NEVER** log, echo, or print the UCAN token contents.
2. **NEVER** skip the propose step. Always propose before executing; the worker rejects executes whose `proposal_id` doesn't match a stored hash.
3. **NEVER** execute a payout without explicit user (or operator) confirmation that the proposal is correct.
4. **NEVER** modify a proposal after generation — create a new one instead. Even a single byte changed in `transfer_payload` invalidates the integrity hash.
5. **One UCAN invocation authorizes one batch call.** Don't try to reuse a minted invocation across propose → execute → check — each protected request needs a fresh mint.

## UCAN Auth — mint a fresh invocation per protected call

The editor's payment block hands you a **delegation CID** (user → this oracle), not a pre-signed invocation. Worker invocations are single-use (D1-backed replay protection), so mint a fresh one before each protected call.

### Workflow per protected command

For every call to `balance`, `propose-payout`, `execute-payout`, or `check-payout`:

1. **Read the companion prompt** for:
   - `UCAN delegation CID: <cid>` — the user-signed delegation to you
   - `Worker base URL: <url>` — pass on every command (see *Worker URL* below)
2. **Mint a fresh UCAN invocation** with:
   - `delegationCid: "<cid from prompt>"`
   - `serviceUrl: "<workerBaseUrl from prompt>"`
   - `can: "<route capability — see table below>"`
   - `withResource: "ixo:yellowcard"`

   How the host exposes the minting tool is host-specific. Always pass the delegation CID — never type out a base64 CAR yourself.
3. **Ensure the directory exists** — once per session — by running `mkdir -p /workspace/data/ixo-yellowcard` in the sandbox.
4. **Write the minted invocation** to `/workspace/data/ixo-yellowcard/ucan_token`. Use whatever mechanism your host provides for opaque-value file writes; if it supports blob-keyed writes (so the CAR never crosses the LLM), prefer that.
5. **Run the protected command** — the script reads the file and sends it as `Authorization: Bearer …`.

If the write reports the value is no longer available (e.g. expired between mint and write), simply re-mint and retry. Invocations are cheap.

### Route → capability mapping

| Command | HTTP route | `can` capability |
|---|---|---|
| `balance` | `GET /balance` | `yellowcard/balance` |
| `propose-payout` | `POST /payouts/propose` (batch) | `yellowcard/payouts` |
| `execute-payout` | `POST /payouts/execute` (batch) | `yellowcard/payouts` |
| `check-payout` | `POST /payouts/status` (batch) | `yellowcard/payouts` |

`withResource` is always `ixo:yellowcard`. Public commands (`discover`, `rates`) require no UCAN.

### What NOT to do

- Don't improvise a token from a delegation — only a freshly minted invocation is worker-acceptable.
- Don't mint once and reuse across propose/execute — the second call gets a `REPLAY` rejection.
- Don't substitute the raw delegation CAR for the invocation token.
- Don't skip the prompt's delegation CID — never invent one from your own knowledge.

## Worker URL — always forward

Every command targets `DEFAULT_WORKER_BASE_URL` baked into the skill unless overridden by `--worker-url=<url>`. When the editor's payment block has `inputs.workerBaseUrl` set, **forward it on EVERY command**. The user's UCAN audience is bound to that worker's `did:web`; calls split across two workers get a 401.

## Commands

All commands output JSON to stdout (and a copy to `/workspace/output/<command>.json` for downstream consumption). Errors are `{ "error": true, "message": "..." }`.

**All payment commands are batch.** Pipe an `items` / `ids` / `countries` / `currencies` array on stdin. The skill also accepts CLI fallbacks (`--countries=NG,KE`, `--currencies=NGN,KES`, `--ids=id1,id2`, `--country=NG`, `--currency=NGN`, `--id=<single>`) for one-off CLI invocations.

The response envelope is uniform across every batch route:

```json
{
  "success": true,
  "count": <N>,
  "successful": <K>,
  "failed": <N-K>,
  "results": [
    { "index": 0, "success": true,  /* per-item success shape */ },
    { "index": 1, "success": false, "error": "...", "message": "...", "status": 502, /* ... */ }
  ]
}
```

The `index` field on each result entry is the position in the request array — use it to map results back to the items you sent (or, equivalently, results come back in the same order as the input).

### 1. `discover` — Find payment channels and networks (batch)

```bash
# Stdin form (preferred when scripted)
echo '{"countries":["NG","KE","GH"]}' | node scripts/yellowcard.js discover

# CLI fallback (single or comma-separated)
node scripts/yellowcard.js discover --countries=NG,KE
node scripts/yellowcard.js discover --country NG
```

**Public** — no UCAN required. Up to 20 countries per batch. Runs in parallel inside the worker.

Per-item success shape:

| Field | Description |
|---|---|
| `country` | The country code that was looked up |
| `channels` | Active withdraw channels (`id` → `channelId`, `name`, `accountType` `bank`/`momo`, `currency`, `minAmount`, `maxAmount`) |
| `networks` | Banks / mobile providers (`id` → `networkId`, `name`, `code`, `channelId`) |

### 2. `rates` — Get current exchange rates (batch)

```bash
echo '{"currencies":["NGN","KES"]}' | node scripts/yellowcard.js rates
node scripts/yellowcard.js rates --currencies=NGN,KES
node scripts/yellowcard.js rates --currency NGN
```

**Public** — no UCAN required. Up to 20 currencies per batch. Parallel.

Per-item success shape: `{ currency, rates: [{ buy, sell, code, channelId }, ...] }`.

### 3. `balance` — Org float balance

```bash
node scripts/yellowcard.js balance
```

**Requires UCAN** (`yellowcard/balance`). Not batched — there's only one org balance. Returns `{ invoker_did, accounts }`.

### 4. `propose-payout` — Validate and prepare payouts (batch)

```bash
echo '{"items":[ <item1>, <item2> ]}' | node scripts/yellowcard.js propose-payout
```

**Requires UCAN** (`yellowcard/payouts`). Up to 100 items per batch. Pure CPU on the worker side (validates + hashes each); no money moves. Items succeed or fail independently — one bad item doesn't abort the rest.

Each item is the single-payout shape:

```json
{
  "channelId": "<string>",
  "currency": "<NGN / KES / GHS / … — destination LOCAL currency, never USD>",
  "amount": "<number — USD amount; mutually exclusive with localAmount>",
  "localAmount": "<number — local amount; mutually exclusive with amount>",
  "reason": "<string, optional>",
  "customerType": "<string, optional, default retail>",
  "recipientDid": "<did:ixo:..., REQUIRED — DID of the person being paid out; worker uses as YC customerUID. Worker rejects with 400 if empty; NEVER inferred from the invoker.>",
  "sender": {
    "name":"<string>", "country":"<US/...>",
    "phone":"<optional>", "email":"<optional>",
    "address":"<optional>", "dob":"<MM/DD/YYYY optional>",
    "idType":"<optional — ignored when country=NG, worker forces 'NIN'>",
    "idNumber":"<optional — when country=NG, this MUST be the NIN>",
    "additionalIdNumber":"<REQUIRED when country=NG — Bank Verification Number (BVN)>"
    // NOTE: never pass `additionalIdType`. The worker stamps it as
    // "BVN" automatically when country=NG and omits the pair entirely
    // otherwise.
  },
  "destination": {
    "accountName":"<string>", "accountNumber":"<string>",
    "accountType":"<bank|momo>", "networkId":"<from discover>",
    "country":"<ISO 3166-1 alpha-2>", "accountBank":"<optional>"
  }
}
```

**`amount` vs `localAmount` vs `currency`** — pick exactly one of `amount` / `localAmount` per item:
- `currency` is always the **destination local currency** (`NGN`, `KES`, ...), never `USD`.
- `amount: 20` (no localAmount) = "send 20 USD worth"; YellowCard converts at the live rate.
- `localAmount: 2000, currency: "NGN"` = "recipient receives exactly 2,000 NGN"; YellowCard computes the USD cost.

Mobile-money account numbers use international phone format: `+{countryCode}{number}`.

Per-item success shape (per the worker's `ProposalResponseSchema`):

| Field | Description |
|---|---|
| `proposal_id` | SHA-256 hash of the transfer payload (integrity verification) |
| `requester_did` | DID of the invoker who created the proposal |
| `sequenceId` | UUID for idempotency |
| `transfer_payload` | Full YC API request body (includes `forceAccept: true`) — **passed verbatim to execute** |
| `summary` | Human-readable display block |
| `created_at` | ISO timestamp |

Per-item failure shape: `{ index, success: false, error, message, status }`.

### 5. `execute-payout` — Submit confirmed payouts (batch)

```bash
echo '{"items":[ <proposal-result1>, <proposal-result2> ]}' | node scripts/yellowcard.js execute-payout
```

Each item is the trio `{ proposal_id, requester_did, transfer_payload }` from a successful propose result. The script accepts:
- `{ "items": [...] }` (preferred wrapped form)
- A bare array `[...]` (gets wrapped automatically)
- A single object `{...}` (wrapped as a 1-item batch)
- Full propose-response items (with `summary`, `sequenceId`, etc.) — the script strips to the trio.

**Requires UCAN** (`yellowcard/payouts`). Up to 100 items per batch. Worker processes **sequentially** (YellowCard rate-limits `/business/payments`). Items succeed or fail independently — earlier items may have moved money even if later ones fail.

Worker pre-flight per item:
1. **Hash integrity** — recomputes SHA-256(`transfer_payload`) and rejects if it doesn't match `proposal_id` (rejection: per-item failure, `status: 400`).
2. **DID match** — only the original proposer can execute (rejection: per-item failure, `status: 403`).
3. **YellowCard call** — `POST /business/payments`. On 4xx/5xx upstream, returns per-item failure with `status: 502` and `details`.

Per-item success shape: `{ proposal_id, payment_id, sequenceId, status, requester_did, recipient_did, raw, executed_at }`.

### 6. `check-payout` — Check payment statuses (batch)

```bash
echo '{"ids":["<payment_id1>","<payment_id2>"]}' | node scripts/yellowcard.js check-payout
node scripts/yellowcard.js check-payout --ids=id1,id2
node scripts/yellowcard.js check-payout --id <single-id>
```

**Requires UCAN** (`yellowcard/payouts`). Up to 100 ids per batch. Runs in parallel (read-only).

Per-item success shape: `{ payment_id, status, amount, currency, localAmount, rate, recipient_did, raw }`.

Map each YellowCard `status` value to the editor's row-level state:

| YellowCard `status` | Row state in editor |
|---|---|
| `CREATED`, `PROCESS` | `submitted` |
| `PROCESSING`, `PENDING` | `processing` |
| `COMPLETE` | `completed` |
| `FAILED` | `failed` |

## Editor flow execution (REQUIRED when running inside a flow with a Payment block)

The companion prompt from the payment block looks like this:

```
Make payout proposals for the rows listed below.   ← (verb-specific opener; "Execute the previously-proposed payouts..." or "Check status for the rows listed below.")
Read the flow context and the payment block to find the worker base URL, sender info, defaults, and the rows. Follow the skill's SKILL.md for the workflow.
Payment block ID: <uuid>
Verb: propose | execute | check
Row IDs (in this batch): <row1>, <row2>, <row3>
Skill name: ixo-yellowcard
Skill CID: <cid>
UCAN delegation CID: <cid>
```

**Quick decision tree** — run BEFORE deliberating:

1. **Is there a `UCAN delegation CID: <cid>` line?** No → reply "This payment block has no UCAN delegation yet. Please click Create on the payment block." STOP. Yes → continue.
2. **Is there a `Payment block ID: <uuid>` line?** No → reply "I didn't get a payment block ID — re-trigger from the payment block UI." STOP.
3. **Is there a `Verb: <verb>` line with one of `propose | execute | check`?** No → reply "I didn't get an action verb — re-trigger from the payment block UI." STOP.
4. **Read the payment block.** Get `block.props.inputs` (worker URL, sender, defaults) AND `block.props.payments` (the rows array). Filter to the row IDs from the prompt. If any row IDs from the prompt aren't in the block, surface that mismatch to the user.
5. **Read `block.props.inputs.workerBaseUrl`.** Empty → reply that the operator needs to set the worker URL in template config. STOP.
6. **Proceed to the verb-specific section below.**

### Reading the rows

The payment block's `block.props.payments` is an array of `PaymentRow`:

```jsonc
{
  "id": "pay_<hex>",
  "source": "claim" | "manual",
  "claimId": "<claim id when source=claim>",
  "evaluateBlockId": "<originating evaluate block id when source=claim>",
  "createdAt": <ms>,
  "fields": {
    "accountName": "...",  "accountNumber": "...",
    "accountType": "bank" | "momo",
    "bankName": "Capitec Bank", // REQUIRED — must match a YC network name for the country.
                                 // The skill resolves this to networkId in step 4.
    "networkId": "...",    "country": "NG",
    "bvn": "...",          "channelId": "...",
    "amount": "20",        "currency": "NGN",
    "reason": "other",     "recipientDid": "did:ixo:..."
  },
  "status": "filled" | "proposed" | "submitted" | "processing" | "completed" | "failed",
  "proposalId": "...",        // set after propose
  "transferPayload": { ... }, // set after propose
  "sequenceId": "...",        // set after propose
  "summary": { ... },         // set after propose
  "paymentId": "...",         // set after execute
  "workerStatus": "...",      // set after check
  "lastSyncedAt": <ms>,
  "error": "..."              // set on failure
}
```

The block's `block.props.inputs` has the recipient-agnostic settings shared across all rows:

```jsonc
{
  "workerBaseUrl": "https://...",
  "sender": { /* PaymentSender fields */ },
  "defaultReason": "other",
  "customerType": "retail",
  "fieldTemplate": { /* refs; already resolved into row.fields by the bridge */ },
  "requiredFields": ["accountName","accountNumber","accountType","bankName","country","amount","currency"]  // bankName is required so the skill can resolve the correct networkId from YC's networks list — sending to the wrong bank routes funds to the wrong clearing system. networkId and channelId are intentionally NOT here; the oracle resolves them in the batch discovery step (see Verb: propose, step 4).
}
```

### Building a propose-payout item from a row

For each row in the batch, assemble the single-item payload by combining `block.props.inputs` (shared) + `row.fields` (per-row):

```js
{
  channelId: row.fields.channelId,
  currency: row.fields.currency,                  // destination LOCAL currency (NGN/KES/...), never USD
  // Decide between YellowCard's `amount` (USD) and `localAmount` (local)
  // from the row's own data — there is NO block-level toggle.
  //
  //   row.fields.outcomeCurrency = the currency the amount is denominated in
  //   row.fields.currency        = destination local currency (where money lands)
  //
  // Decision table (case-insensitive comparison):
  //   • outcomeCurrency empty OR "USD"          → send as `amount` (USD).
  //                                                YC converts to currency.
  //   • outcomeCurrency === currency            → send as `localAmount`.
  //                                                No FX, recipient gets exactly
  //                                                that amount.
  //   • otherwise (different non-USD pair)      → FAIL THIS ITEM. YC cannot
  //                                                route cross-local FX in one
  //                                                call. Mark the row failed
  //                                                with an explanatory error;
  //                                                do NOT include in the batch.
  //                                                Operator must edit
  //                                                outcomeCurrency or currency
  //                                                to align them.
  ...(() => {
    const outcome = (row.fields.outcomeCurrency || '').trim().toUpperCase();
    const dest = (row.fields.currency || '').trim().toUpperCase();
    if (!outcome || outcome === 'USD') {
      return { amount: Number(row.fields.amount) };
    }
    if (outcome === dest) {
      return { localAmount: Number(row.fields.amount) };
    }
    // Caller is expected to have filtered this row out before reaching here.
    throw new Error(
      `Incompatible currencies: outcome ${outcome} → destination ${dest}. ` +
      `Set outcomeCurrency to USD (YC converts) or to the destination ` +
      `(no FX) before proposing.`
    );
  })(),
  reason: row.fields.reason || inputs.defaultReason || "other",
  customerType: inputs.customerType || "retail",
  // recipientDid is REQUIRED — the worker rejects with 400 when empty
  // and explicitly does NOT fall back to the invoker DID. YC uses this
  // value as customerUID for per-recipient KYC tier tracking, so
  // substituting the invoker would attribute the payout to the operator
  // and corrupt the audit trail. If row.fields.recipientDid is empty,
  // fail the row in step 4 below — don't include it in the batch.
  recipientDid: row.fields.recipientDid,
  sender: inputs.sender,
  destination: {
    accountName: row.fields.accountName,
    accountNumber: row.fields.accountNumber,
    accountType: row.fields.accountType,        // "bank" or "momo"
    // networkId is REQUIRED by YellowCard for every active country
    // (the previous "ZA EFT has no networks" assumption was wrong —
    // it came from a jq path bug in discover.sh). Step 4 of the
    // propose verb resolves it from row.fields.bankName before this
    // template runs, so by the time we reach here row.fields.networkId
    // MUST be set. If it's empty here, the row should have been
    // filtered out in step 4 — treat this as a skill bug.
    networkId: row.fields.networkId,
    country: row.fields.country,
    // accountBank optional — not commonly set per row
  }
}
```

### Verb-specific workflow

**Across all verbs:** maintain a parallel `rowIds: string[]` in the same order as the items you build. The worker returns `results[i].index === i`, so `results[i]` maps to `rowIds[i]`.

#### Verb: `propose`

1. Read the rows; verify each is in status `filled` (skip + report any that aren't).
2. Per row, validate `inputs.requiredFields`. If any row is missing required fields, fail that row inline (don't include it in the batch) and record `error: "missing required fields: ..."` + `status: "failed"` for that row. **`recipientDid` is always required regardless of what `requiredFields` lists** — the worker rejects with `400` when it's empty and explicitly does NOT fall back to invoker DID (would break per-recipient KYC tracking and the audit trail). If `row.fields.recipientDid` is empty, fail the row with `error: "recipientDid is required — the DID of the actual person being paid out. The worker never infers this from the invoker."` + `status: "failed"`.
3. Per row, run the currency-compatibility check (see *"Building a propose-payout item from a row"* above). If `outcomeCurrency` is non-USD AND differs from `currency`, fail that row inline with `error: "incompatible currencies: outcome <X> → destination <Y>. Set outcomeCurrency to USD or align it with the destination, then re-propose."` + `status: "failed"`. Don't include it in the batch.
4. **Batch-deduplicate discovery (channelId + networkId).** This is the expensive lookup — collapse to one `discover` call across all unique countries in the batch, then look up each row from the cached results.

   1. **Collect missing.** Build `needsDiscovery = rows that have at least one of channelId / networkId empty`. If none → skip this whole step.
   2. **Unique countries.** Compute `uniqueCountries = [...new Set(needsDiscovery.map(r => r.country.toUpperCase()))]`.
   3. **One batch call.** Run discovery for all of them at once:
      ```bash
      echo '{"countries":<uniqueCountries>}' | node scripts/yellowcard.js discover --worker-url=<workerBaseUrl>
      ```
      The response shape is `{ success, count, successful, failed, results: [{ country, channels, networks }, ...] }`. Index it as `byCountry[country] = { channels, networks }` for O(1) lookups in the next step.
   4. **Per-row lookup + fill** (purely local, no more network calls):
      - Find `channel = byCountry[row.country].channels.find(c => c.accountType === row.accountType && (!row.currency || c.currency.toUpperCase() === row.currency.toUpperCase()))`.
        - If multiple match (rare), pick the first.
        - If none match (e.g. accountType `bank` not supported in that country) → fail this row inline with `error: "no <accountType> channel for country <country> currency <currency>"` + `status: "failed"`. Don't include in batch.
      - **Resolve `networkId` from `row.fields.bankName`.** This is the critical safety step — the same account number digits route to different banks depending on which `networkId` is sent, so picking the wrong network sends funds to the wrong clearing system. The matching rules below apply ONLY to the networks attached to the channel found above (so we can't accidentally match a `momo` network when the channel is `bank`):
        - Filter the candidate networks: `candidates = byCountry[row.country].networks.filter(n => n.status === 'active' && Array.isArray(n.channelIds) ? n.channelIds.includes(channel.id) : n.channelId === channel.id)`. (YC has used both `channelId` and `channelIds[]` across versions — handle both.)
        - **Operator override.** If `row.fields.networkId` is already set, trust it as an explicit override — leave it as-is and skip the rest of this resolution. Do NOT validate the override against bankName; the override is the operator's escape hatch.
        - **Otherwise bankName MUST be set.** If `row.fields.bankName` is empty → fail this row inline with `error: "bankName is required to resolve networkId — pick the recipient's bank from YellowCard's network list for <country>"` + `status: "failed"`. Don't include in the batch.
        - **Name match (primary).** Look for `network = candidates.find(n => normalize(n.name) === normalize(row.fields.bankName))` where `normalize(s) = s.trim().toLowerCase()`. If found → stamp `row.networkId = network.id`.
        - **Name match (loose fallback).** If no exact match, try a contains-either-direction comparison: `network = candidates.find(n => normalize(n.name).includes(normalize(row.fields.bankName)) || normalize(row.fields.bankName).includes(normalize(n.name)))`. This catches "Capitec" vs "Capitec Bank" / "First National Bank" vs "FNB". If found → stamp `row.networkId = network.id`.
        - **Code match (last fallback).** If still no match AND the bankName looks like a code (short, alphanumeric), try `network = candidates.find(n => n.code && normalize(n.code) === normalize(row.fields.bankName))`. If found → stamp `row.networkId = network.id`.
        - **No match found.** Fail this row inline with `error: "bankName \"<bankName>\" does not match any active YC network for <country>. Candidates: <comma-list of candidates' names>"` + `status: "failed"`. Don't include in batch and don't fabricate a networkId — this is the wrong-bank routing risk we are explicitly preventing.
        - **Candidates list empty.** If `candidates` is empty for this channel (very rare — would mean the channel has no banks behind it), fail the row with `error: "no networks available for <accountType> channel in <country>"` + `status: "failed"`.
      - Stamp `row.channelId = channel.id` if it was empty.
   5. **Persist the resolved IDs back to the block** via a single `edit_block` call patching `block.props.payments` for the rows that gained a channelId/networkId. After this step the UI shows the discovered values; subsequent verbs (execute, check) don't need to re-discover. Do NOT bump `status` here — rows stay `filled` until the propose response lands.
5. Build `items[]` from the valid rows (one item per row, per the shape above). Use the now-resolved `row.channelId` / `row.networkId`.
6. Mint a fresh UCAN invocation and write it to `/workspace/data/ixo-yellowcard/ucan_token`.
7. Run:
   ```bash
   echo '{"items":[ ... ]}' | node scripts/yellowcard.js propose-payout --worker-url=<workerBaseUrl>
   ```
8. For each `results[i]`:
   - Success → patch `block.props.payments` for `rowIds[i]`:
     ```jsonc
     {
       "status": "proposed",
       "proposalId": "<results[i].proposal_id>",
       "transferPayload": <results[i].transfer_payload>,
       "sequenceId": "<results[i].sequenceId>",
       "summary": <results[i].summary>,
       "error": ""
     }
     ```
   - Failure → patch:
     ```jsonc
     { "status": "failed", "error": "<results[i].message>" }
     ```
9. Reply to the user with a one-line summary: "Proposed N of M rows. M-N failed: <reasons>".

#### Verb: `execute`

1. Read the rows; verify each is in status `proposed` AND has `proposalId` + `transferPayload`.
2. Build `items[]` of `{ proposal_id, requester_did, transfer_payload }` per row.
   - `requester_did` MUST match the row's `proposalId` originator (the worker enforces this). Use the same DID that proposed.
3. Mint a fresh invocation, write to token file.
4. Run:
   ```bash
   echo '{"items":[ ... ]}' | node scripts/yellowcard.js execute-payout --worker-url=<workerBaseUrl>
   ```
5. For each `results[i]`:
   - Success → patch `block.props.payments` for `rowIds[i]`:
     ```jsonc
     {
       "status": "submitted",                                // literal string
       "paymentId": "<results[i].payment_id>",
       "workerStatus": "<results[i].status>",                // CREATED / PROCESS / …
       "lastSyncedAt": <Date.now()>,
       "error": ""
     }
     ```
   - Failure → patch:
     ```jsonc
     { "status": "failed", "error": "<results[i].message>" }
     ```
6. Reply with a summary, then proceed to **Verb: `check`** for the rows that just transitioned to `submitted` (poll until terminal).

#### Verb: `check`

1. Read the rows; collect `paymentId` from each row whose status is `submitted` or `processing`. Skip rows with no `paymentId`.
2. Build `{ "ids": [...] }`.
3. Mint a fresh invocation, write to token file.
4. Run:
   ```bash
   echo '{"ids":[ ... ]}' | node scripts/yellowcard.js check-payout --worker-url=<workerBaseUrl>
   ```
5. For each `results[i]`:
   - Success → translate `results[i].status` (YC) → row state via the mapping table above. Patch the row:
     ```jsonc
     {
       "status": "<mapped row state>",
       "workerStatus": "<results[i].status>",
       "lastSyncedAt": <Date.now()>,
       "error": "<results[i].raw.failureReason || ''>"   // populate on FAILED
     }
     ```
   - Failure (the lookup itself failed) → leave the row alone, log the issue. Don't flip an in-flight row to `failed` just because the status check couldn't reach the worker.

**Polling note:** when triggered after `execute`, poll automatically every 10s for the first minute, then every 20s, capping at 3 minutes total. Mint a fresh invocation per poll (each `check-payout` call consumes its invocation). When all rows are terminal (or the cap is hit), reply with a summary.

### Block update mechanics

How block props get updated is host-specific. The conceptual operation is: "patch `block.props.payments[i]` for the row whose `id === rowIds[i]`, merging in the result fields above without overwriting other fields on the row." Most hosts expose this via an editor sub-agent tool (`edit_block` or similar). If your host accepts a `payments` array as the patch, you can rewrite the array; if it accepts a per-row patch keyed by id, prefer that to avoid clobbering rows added concurrently.

**Always re-read the block** after a batch update to confirm the writes landed. If any row is missing the expected fields after a write, retry the patch.

## Conversation mode (no flow blocks)

The skill also works for one-off, ad-hoc usage from a normal chat. The oracle constructs a 1-item batch and follows the same workflow:

```bash
# discover
echo '{"countries":["NG"]}' | node scripts/yellowcard.js discover

# rates
echo '{"currencies":["NGN"]}' | node scripts/yellowcard.js rates

# propose for one recipient
echo '{"items":[{ /* single payload */ }]}' | node scripts/yellowcard.js propose-payout

# execute for the one proposal
echo '{"items":[{ proposal_id, requester_did, transfer_payload }]}' | node scripts/yellowcard.js execute-payout

# check
echo '{"ids":["<payment_id>"]}' | node scripts/yellowcard.js check-payout
```

In conversation mode, present the proposal summary as a clear confirmation prompt before executing, and never execute without explicit user confirmation.

## Payment Status Flow

```
CREATED → PROCESS → PROCESSING → PENDING → COMPLETE
                                         ↘ FAILED
```

| YellowCard status | Editor row state | Meaning |
|---|---|---|
| `CREATED` | `submitted` | Payment received by YC |
| `PROCESS` | `submitted` | YC accepted, beginning processing |
| `PROCESSING` | `processing` | Submitted to payment network |
| `PENDING` | `processing` | Awaiting final confirmation from network |
| `COMPLETE` | `completed` | Funds delivered |
| `FAILED` | `failed` | Check the raw response for details |

## KYC Thresholds + customerUID

YellowCard applies cumulative-spend KYC **per `customerUID`**. The worker derives `customerUID` from the row's `recipientDid` — which is REQUIRED and never falls back to the invoker DID. (Earlier versions of the worker did fall back; that was a data-integrity bug since it billed payments against the operator's KYC bucket rather than the actual recipient's. The worker now rejects with `400` if `recipientDid` is empty.) So all rows targeting the same recipient share one tier 0 bucket, and different recipients always get their own bucket.

| Threshold | Required sender fields |
|---|---|
| Under $200 USD cumulative | `name`, `country` (reduced KYC) |
| Over $200 USD cumulative | `name`, `country`, `address`, `dob`, `idType`, `idNumber` (full KYC) |
| Sender country = `NG` (any amount, retail) | All of the above PLUS `additionalIdType`, `additionalIdNumber` |

Per YC docs, full KYC bypasses tier 0. In practice on **sandbox** YC still rejects with `PaymentValidationError: Full KYC information is required for the transaction` when KYC values look fake (e.g. `idNumber: X0000000`, `phone: +10000000000`) AND the customerUID has accumulated past $200. For test cycling, vary `recipientDid` per run — that resets the tier 0 bucket. In production, use real KYC values.

Test runs accumulate against the same DID and cross $200 quickly — fill the full sender block in `block.props.inputs.sender` for test flows.

### Nigerian senders (NG regulatory NIN + BVN)

YC's `submit-payment` spec marks `sender.additionalIdType` and `sender.additionalIdNumber` as required when `customerType === 'retail'` AND `sender.country === 'NG'`. The Nigerian Central Bank requires both the National Identification Number (NIN) and the Bank Verification Number (BVN). YC's convention for NG is fixed:

- `sender.idType` is always `"NIN"` and `sender.idNumber` holds the NIN value
- `sender.additionalIdType` is always `"BVN"` and `sender.additionalIdNumber` holds the BVN value

**The skill only ever supplies the two NUMBERS.** The worker stamps `idType="NIN"` and `additionalIdType="BVN"` server-side whenever `sender.country === 'NG'`, so any `idType`/`additionalIdType` value the skill passes is ignored in the NG case. This protects against accidentally sending the wrong type code (e.g. `"passport"`) which YC would reject. For non-NG senders the worker leaves `idType` as whatever was passed and omits the `additional*` fields entirely.

The worker also rejects a propose with `400` if `customerType === 'retail'` and `sender.country === 'NG'` and either `idNumber` or `additionalIdNumber` is empty — fail-fast so a misconfigured NG sender block doesn't burn UCAN invocations on doomed YC calls. The editor's payment block gates the Send button on the same condition and only exposes two inputs for NG: "NIN (National Identification Number)" and "BVN (Bank Verification Number)" — the type fields are not operator-editable for NG.

This rule applies only to the **sender** side of payouts. The YC payout endpoint has no recipient-KYC slot at all, so NG **recipients** do NOT need NIN/BVN passed through — confirmed by the OpenAPI spec at `submit-payment` (no KYC fields on `destination`). The recipient-side NG NIN+BVN requirement lives on the `submit-collection-request` endpoint, which the worker does not currently expose.

This skill never has to set these fields itself — they live on `block.props.inputs.sender` and are configured once per block by the operator in the editor UI. Just pass `inputs.sender` through to `sender` on each propose item as already documented.

## Retry semantics

A row in `failed` status can be **reset** to `filled` via the editor's "Retry" button (single in the row detail, bulk on the Failed tab). The reset clears `proposalId`, `transferPayload`, `sequenceId`, `summary`, `paymentId`, `workerStatus`, `lastSyncedAt`, `error`. The row is then ready for a fresh `propose` cycle.

The worker DOES allow re-executing the same `proposal_id` after a YC rejection (the proposal isn't burned), so if a failure was transient and the operator hasn't edited the row, you can in principle execute the original proposal again. But `proposal_id` is a hash of the payload — any field edit on the row (e.g. swapping recipientDid to dodge tier 0) invalidates it. Always treat retry as "propose then execute again" — that's the simpler mental model and what the UI does.

## Sandbox Testing

| Scenario | Account Number |
|---|---|
| Bank SUCCESS | `1111111111` |
| Bank FAILURE | `0000000000` |
| Mobile Money SUCCESS | `+{countryCode}1111111111` (e.g. `+2341111111111` for NG) |
| Mobile Money FAILURE | `+{countryCode}0000000000` |

### Common country / currency pairs

| Country | Code | Currency | Methods |
|---|---|---|---|
| Nigeria | NG | NGN | Bank, Mobile Money |
| Kenya | KE | KES | M-Pesa (momo) |
| Ghana | GH | GHS | MTN Mobile Money, Bank |
| South Africa | ZA | ZAR | Bank Transfer |
| Uganda | UG | UGX | Mobile Money, Bank |

## Authentication

The skill reads a UCAN invocation Bearer token from `/workspace/data/ixo-yellowcard/ucan_token`. The token is short-lived (~60s) and single-use — the oracle mints a fresh one before every protected call.

How it works end-to-end:
- The user signs ONE delegation in the editor's payment block (audience = chat oracle DID, capability `yellowcard/*` on `ixo:yellowcard`, expires after a configurable window — default 1 hour).
- The companion prompt carries the delegation CID and worker base URL.
- For each protected batch call, the oracle mints an invocation against `<workerBaseUrl>/.well-known/did.json` (auto-resolved audience) and writes it to the token file.
- The worker validates the invocation, checks the route capability, and processes the batch under that single invocation.

The user's DID must be in the worker's `UCAN_ROOT_ISSUERS` allowlist for the proof chain to validate.

All YellowCard API authentication (HMAC-SHA256 signing) happens inside the worker — no payment API secrets are exposed to the skill sandbox.

## Input Files

| File | Required | Source | Description |
|---|---|---|---|
| `/workspace/data/ixo-yellowcard/ucan_token` | For protected commands | Oracle writes the fresh invocation here | Freshly-minted UCAN invocation (Base64 CAR) — single-use. Re-mint before every protected call. |

## Environment Variables

| Variable | Source | Description |
|---|---|---|
| `_SKILL_CONTEXT_USER_DID` | Skill context | Current user's DID |
| `_SKILL_CONTEXT_SANDBOX_ID` | Skill context | Sandbox identifier |
| `_SKILL_CONTEXT_TIMESTAMP` | Skill context | Request timestamp |

## Error Handling

All script errors are JSON: `{ "error": true, "message": "..." }`. Worker-side errors come back as either a top-level 4xx/5xx (batch-shape rejection) or as per-item failure entries (one bad item among a successful batch).

| Error | Cause | Fix |
|---|---|---|
| `Missing UCAN token at /workspace/data/ixo-yellowcard/ucan_token` | Oracle didn't mint + write a fresh invocation before the call | Mint and write before retrying. Run `mkdir -p /workspace/data/ixo-yellowcard` once if the dir doesn't exist. |
| `REPLAY` / `Invocation has already been used` | Reused an invocation across calls | Mint a fresh one. |
| `No items provided. Pipe JSON ...` | Stdin was empty / not JSON for a batch command | Pipe `{"items":[...]}` (or `{"ids":[...]}` / `{"countries":[...]}` / `{"currencies":[...]}`). |
| `Worker returned 400 ... Maximum N items per batch` | Batch exceeded the per-route cap (100 for payouts, 20 for channels/rates/status). | Split into multiple batches. |
| `Worker returned 401` | UCAN token invalid / expired / wrong capability | Re-mint with the correct `can` for the route. |
| `Worker returned 503` | Worker's did:web resolution temporarily unavailable | Retry after a short wait. |
| Per-item: `Either amount (USD) or localAmount is required` | Item supplied neither | Fix the item; re-batch. |
| Per-item: `Provide either amount or localAmount, not both` | Item supplied both | Fix the item; re-batch. |
| Per-item: `Proposal integrity check failed` | `transfer_payload` was modified after proposal creation | Re-propose the row, then re-execute. |
| Per-item: `DID mismatch` | Someone other than the proposer tried to execute | Same DID that proposed must execute. |
