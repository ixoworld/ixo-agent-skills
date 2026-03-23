---
name: create-flow
description: >
  Converts natural language workflow descriptions into valid BaseUcanFlow JSON documents.
  Supports 18 action types including bids, claims, payments, governance proposals, emails,
  notifications, and more. Use when the user mentions "create a flow", "build a flow",
  "design a flow", "new flow", "make a flow", or describes a multi-step workflow to automate.
license: Apache-2.0
compatibility: claude
metadata:
  author: ixo
  version: "1.0.0"
  category: flow-builder
---

# Create Flow from Natural Language

Use when the user wants to create a base UCAN flow plan from a text description. Triggers: "create a flow", "build a flow", "design a flow", "new flow", "make a flow", "flow for...", or when the user describes a multi-step workflow they want to automate.

## What This Skill Does

Converts a natural language description of a workflow into a valid `BaseUcanFlow` JSON document that the flow compiler can turn into an executable flow in the editor.

## Conversation Pattern

### Phase 1: Understand the Goal

Ask the user:
1. **What is this flow for?** (becomes `title` and `goal`)
2. **Walk me through the steps** — what happens first, then what, etc.

Do NOT ask for technical details upfront. Let the user describe it naturally.

### Phase 2: Map to Actions

For each step the user describes, map it to an action from the catalog below. If a step doesn't map to any action, tell the user and suggest alternatives.

Ask clarifying questions ONLY when needed:
- If a step involves evaluation/review: "Does this produce an approve/reject decision?"
- If a step has conditional branches: "What happens on approval vs rejection?"
- If a step needs a specific person: "Is there a specific DID that should handle this, or leave it open?"
- If a step involves forms/data collection: "Is this a bid submission (with collection/role) or a form?"

### Phase 3: Build the Plan

Construct the JSON. Present it to the user with a plain-language summary:
```
Here's your flow: "Partner Onboarding" (5 steps)

1. Submit Application (bid/submit)
2. Evaluate Application (bid/evaluate)
3. Create Entity (domain/create) — only if approved
4. Send Welcome Email (email/send) — only if approved
5. Notify Rejection (notification/push) — only if rejected

[JSON output]
```

### Phase 4: Iterate

Ask: "Want to adjust anything? Add audiences, change conditions, add steps?"

Iterate until the user is satisfied.

## Output Schema

Every output MUST conform to this exact structure:

```typescript
{
  kind: "qi.flow.base-ucan",     // always this value
  version: "1.0",                 // always this value
  flowId: "",                     // empty — set at instantiation
  title: string,                  // human-readable flow name
  goal?: string,                  // what this flow achieves
  meta: {
    rootIssuer?: string           // flow owner DID — set at instantiation if not known
  },
  capabilities: FlowCapability[]  // ordered list of steps
}
```

Each capability:

```typescript
{
  id: string,                     // stable kebab-case identifier, e.g., "submit-bid"
  can: string,                    // MUST be from the action catalog below
  nb?: Record<string, unknown>,   // inputs — shape depends on the action
  dependsOn?: string[],           // IDs of upstream steps this depends on
  condition?: {                   // conditional activation
    sourceId: string,             // ID of upstream step whose output is checked
    field: string,                // output field to inspect
    operator: "eq" | "neq" | "gt" | "lt" | "in" | "exists",
    value?: unknown               // value to compare against
  },
  parallelGroup?: string,         // steps with same group run concurrently
  phase?: string,                 // semantic grouping for layout
  aud?: string[],                 // DIDs delegated to execute this step
  ttl?: {                         // time constraints
    absoluteDueDate?: string,     // ISO 8601 date
    fromEnablement?: string,      // ISO 8601 duration, e.g., "P7D"
    fromCommitment?: string       // ISO 8601 duration, e.g., "PT2H"
  },
  title?: string,                 // display name (falls back to can)
  description?: string,           // what this step does
  icon?: string                   // icon identifier
}
```

## Validation Rules

Apply these BEFORE outputting the JSON:

1. **`can` must be from the catalog.** Do not invent new `can` values.
2. **`dependsOn` must reference existing IDs.** Every ID in `dependsOn` must be the `id` of another capability in the same plan.
3. **`condition.sourceId` must be an upstream dependency.** It must appear in the same capability's `dependsOn` array.
4. **No circular dependencies.** If A depends on B, B cannot depend on A (directly or transitively).
5. **No `with` field.** The `with` is derived at runtime as `ixo:flow:{roomId}:{can}`. Never include it in the plan.
6. **`nb` keys should match the action's expected inputs.** Refer to the catalog for each action's `nb` shape.
7. **`id` values must be unique.** No two capabilities can share an `id`.
8. **`aud` is an array of DID strings.** Each DID results in a separate UCAN delegation at instantiation.

## Action Catalog

### bid/submit
**What it does:** Submit a bid/application to a collection.
**nb inputs:**
- `collectionId` (string) — the collection to submit to
- `role` (string) — "service_agent" or "evaluation_agent"
- `surveyAnswers` (object, optional) — form data for the bid
- `deedDid` (string, optional) — deed identifier

**Outputs:** `bidId`, `collectionId`, `role`, `submitterDid`, `deedDid`
**Side effect:** Yes | **Requires confirmation:** Yes

---

### bid/evaluate
**What it does:** Approve or reject a submitted bid.
**nb inputs:**
- `decision` (string) — "approve" or "reject"
- `reason` (string, optional) — rejection reason
- `bidId` (string) — the bid being evaluated
- `collectionId` (string) — the collection
- `deedDid` (string) — deed identifier
- `role` (string) — applicant's role
- `applicantDid` (string) — applicant's DID
- `applicantAddress` (string) — applicant's address
- `adminAddress` (string) — admin address for on-chain tx

**Outputs:** `bidId`, `decision`, `status`, `evaluatedByDid`, `evaluatedAt`, `reason`, `collectionId`, `role`, `deedDid`, `applicantDid`, `applicantAddress`
**Side effect:** Yes | **Requires confirmation:** Yes

**Common condition pattern:** Downstream steps often branch on `decision`:
```json
{ "sourceId": "evaluate-bid", "field": "decision", "operator": "eq", "value": "approve" }
```

---

### claim/submit
**What it does:** Submit an on-chain verifiable claim.
**nb inputs:**
- `deedDid` (string) — deed identifier
- `collectionId` (string) — claim collection
- `adminAddress` (string) — admin address for tx
- `surveyAnswers` (object, optional) — claim form data

**Outputs:** `claimId`, `transactionHash`, `collectionId`, `deedDid`, `submittedByDid`, `submittedAt`
**Side effect:** Yes | **Requires confirmation:** Yes

---

### claim/evaluate
**What it does:** Approve or reject a submitted claim.
**nb inputs:**
- `decision` (string) — "approve" or "reject"
- `claimId` (string) — the claim being evaluated
- `collectionId` (string) — claim collection
- `deedDid` (string) — deed identifier
- `adminAddress` (string) — admin address
- `verificationProof` (string) — proof CID
- `amount` (object, optional) — payment amount `{ denom, amount }`

**Outputs:** `claimId`, `decision`, `status`, `verificationProof`, `collectionId`, `deedDid`, `evaluatedByDid`, `evaluatedAt`
**Side effect:** Yes | **Requires confirmation:** Yes

**Common condition pattern:** Same as bid/evaluate — branch on `decision`.

---

### domain/create
**What it does:** Create an on-chain entity (domain card).
**nb inputs:**
- `entityType` (string) — e.g., "asset", "deed", "dao", "oracle"
- `surveyData` (object, optional) — entity metadata

**Outputs:** `entityDid`, `transactionHash`, `credentialId`, `entityType`
**Side effect:** Yes | **Requires confirmation:** Yes

---

### domain/sign
**What it does:** Sign/finalize a domain entity.
**nb inputs:**
- `domainCardData` (object, optional) — card metadata
- `entityType` (string, optional) — entity type
- `linkedEntities` (array, optional) — linked entity references

**Outputs:** `entityDid`, `transactionHash`
**Side effect:** Yes | **Requires confirmation:** Yes

---

### credential/store
**What it does:** Store a verifiable credential in Matrix.
**nb inputs:**
- `credentialKey` (string) — key name, e.g., "vendor-cert"
- `credential` (object, optional) — the credential data
- `roomId` (string, optional) — Matrix room ID

**Outputs:** `credentialKey`, `cid`, `storedAt`, `duplicate`
**Side effect:** Yes | **Requires confirmation:** Yes

---

### email/send
**What it does:** Send an email via the email service.
**nb inputs:**
- `to` (string) — recipient email
- `subject` (string) — email subject
- `templateName` (string) — email template identifier
- `templateVersion` (string, optional) — template version
- `variables` (object, optional) — template variables
- `cc` (string, optional) — CC recipients
- `bcc` (string, optional) — BCC recipients
- `replyTo` (string, optional) — reply-to address

**Outputs:** `messageId`, `sentAt`
**Side effect:** Yes | **Requires confirmation:** Yes

---

### matrix/dm
**What it does:** Send a direct message via Matrix.
**nb inputs:**
- `targetDid` (string) — recipient DID
- `message` (string) — message content

**Outputs:** `roomId`, `sentAt`
**Side effect:** Yes | **Requires confirmation:** No

---

### notification/push
**What it does:** Send a notification via configured channel (email, push, etc.).
**nb inputs:**
- `channel` (string) — "email", "push", etc.
- `to` (array of strings, optional) — recipients
- `subject` (string, optional) — notification subject
- `body` (string) — notification body
- `bodyType` (string, optional) — "text" or "html"
- `from` (string, optional) — sender
- `replyTo` (string, optional) — reply-to

**Outputs:** None defined
**Side effect:** Yes | **Requires confirmation:** Yes

---

### http/request
**What it does:** Make an HTTP request to an external API.
**nb inputs:**
- `endpoint` (string) — full URL, e.g., "https://api.example.com/data"
- `method` (string) — "GET", "POST", "PUT", "DELETE", "PATCH"
- `headers` (array of `{key, value}`, optional) — request headers
- `body` (array of `{key, value}`, optional) — request body fields (ignored for GET)
- `responseSchema` (object, optional) — `{ fields: [{ path, displayName, type, description }] }`

**Outputs:** `status`, `data`, `response` (JSON string)
**Side effect:** No | **Requires confirmation:** No

**Note:** `headers` and `body` are arrays of `{key, value}` objects, NOT plain objects.

---

### oracle/query
**What it does:** Send a prompt to the AI companion.
**nb inputs:**
- `prompt` (string) — the question or instruction

**Outputs:** `prompt`
**Side effect:** No | **Requires confirmation:** No

---

### payment/execute
**What it does:** Execute a payment transaction.
**nb inputs:**
- `paymentConfig` (object) — payment configuration

**Outputs:** `transactionId`, `status`, `proposal` (object), `summary` (object)
**Side effect:** Yes | **Requires confirmation:** Yes

---

### proposal/create
**What it does:** Create an on-chain governance proposal.
**nb inputs:**
- `coreAddress` (string) — DAO core contract address
- `title` (string) — proposal title
- `description` (string) — proposal description
- `actions` (array) — proposal actions

**Outputs:** `proposalId`, `status`, `proposalContractAddress`, `coreAddress`, `createdAt`
**Side effect:** Yes | **Requires confirmation:** Yes

---

### proposal/vote
**What it does:** Cast a vote on a governance proposal.
**nb inputs:**
- `proposalId` (string) — proposal to vote on
- `vote` (string) — "yes", "no", "no_with_veto", "abstain"
- `rationale` (string, optional) — vote rationale
- `proposalContractAddress` (string) — proposal contract

**Outputs:** `vote`, `rationale`, `proposalId`, `votedAt`
**Side effect:** Yes | **Requires confirmation:** Yes

---

### human/checkbox
**What it does:** A manual checkbox step — human confirms by checking it.
**nb inputs:**
- `checked` (boolean, optional) — defaults to true when executed

**Outputs:** None defined
**Side effect:** Yes | **Requires confirmation:** No

**Use for:** Manual approval gates, confirmations, checklists.

---

### protocol/select
**What it does:** Select a protocol from the protocol registry.
**nb inputs:**
- `selectedProtocolDid` (string) — protocol DID
- `selectedProtocolName` (string) — protocol display name
- `selectedProtocolType` (string) — protocol type

**Outputs:** `selectedProtocolDid`, `selectedProtocolName`, `selectedProtocolType`
**Side effect:** No | **Requires confirmation:** No

---

### form/submit
**What it does:** Submit a form with structured answers.
**nb inputs:**
- `answers` (object) — form answer data

**Outputs:** `form.answers` (JSON string), `answers` (object)
**Side effect:** Yes | **Requires confirmation:** No

**Use for:** Data collection steps, surveys, structured input.

---

## Common Flow Patterns

### Bid-based Onboarding
```
bid/submit → bid/evaluate → (approve) domain/create → domain/sign → credential/store
                           → (reject)  notification/push
```

### Claim Verification
```
claim/submit → claim/evaluate → (approve) credential/store + email/send
                               → (reject)  notification/push
```

### API Integration
```
http/request → form/submit → email/send
```

### Governance
```
proposal/create → proposal/vote → (passed) domain/create
```

### Manual Approval with Notification
```
form/submit → human/checkbox → email/send
```

## Default Icons by Action

| can | icon |
|-----|------|
| bid/submit | gavel |
| bid/evaluate | check-circle |
| claim/submit | file-check |
| claim/evaluate | clipboard-check |
| email/send | mail |
| notification/push | bell |
| matrix/dm | message-circle |
| proposal/create | scroll |
| proposal/vote | vote |
| domain/create | globe |
| domain/sign | feather |
| credential/store | shield |
| payment/execute | credit-card |
| http/request | cloud |
| protocol/select | git-branch |
| human/checkbox | check-square |
| form/submit | file-text |
| oracle/query | cpu |

## Example Output

User says: "I need a flow where we fetch data from an API, then someone reviews it and either approves to create an entity or rejects with a notification"

```json
{
  "kind": "qi.flow.base-ucan",
  "version": "1.0",
  "flowId": "",
  "title": "Data Review and Entity Creation",
  "goal": "Fetch external data, review it, and create an entity if approved",
  "meta": {},
  "capabilities": [
    {
      "id": "fetch-data",
      "can": "http/request",
      "nb": {
        "endpoint": "",
        "method": "GET",
        "headers": [],
        "body": []
      },
      "phase": "intake",
      "title": "Fetch external data",
      "description": "Retrieve data from external API for review"
    },
    {
      "id": "review-data",
      "can": "human/checkbox",
      "dependsOn": ["fetch-data"],
      "phase": "review",
      "title": "Review fetched data",
      "description": "Reviewer checks the data and confirms it is valid"
    },
    {
      "id": "create-entity",
      "can": "domain/create",
      "nb": {
        "entityType": "asset"
      },
      "dependsOn": ["review-data"],
      "phase": "execution",
      "title": "Create entity",
      "description": "Create the on-chain entity from reviewed data"
    },
    {
      "id": "notify-complete",
      "can": "email/send",
      "nb": {
        "to": "",
        "subject": "Entity created successfully",
        "templateName": "entity-created",
        "variables": {}
      },
      "dependsOn": ["create-entity"],
      "phase": "completion",
      "title": "Send completion notification",
      "description": "Notify stakeholders that the entity was created"
    }
  ]
}
```

## Important Reminders

- Never include `with` on capabilities — it is derived at runtime
- Never include `actor` — use `aud` (array of DIDs) instead
- Leave `flowId` empty — set at instantiation
- Leave `nb` input values empty (e.g., `""`, `{}`, `[]`) when they are filled at runtime by the user or upstream outputs
- Only include `aud` when the user specifies who should handle a step
- Only include `condition` when there is a decision point with branching logic
- Only include `ttl` when the user specifies time constraints
- Use descriptive `id` values in kebab-case that reflect what the step does
- The `phase` field is for visual grouping — common values: "intake", "review", "execution", "onboarding", "completion"
