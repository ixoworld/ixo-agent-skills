---
name: manage-flow
description: >
  The single skill for ALL flow operations — create, read, inspect, update, modify, extend,
  rebuild, or delete steps in a BaseUcanFlow. Always invoke this skill the moment the user
  mentions anything flow-related: "flow", "create a flow", "build a flow", "design a flow",
  "new flow", "make a flow", "show me the flow", "what's in the flow", "read the flow",
  "update the flow", "edit the flow", "modify the flow", "add a step", "remove a step",
  "change the flow", "rebuild the flow", or describes any multi-step workflow to automate.
  Supports 18 action types including bids, claims, payments, governance proposals, emails,
  notifications, and more. Uses the `read_flow` and `setup_flow` browser tools to read and
  write flows in the editor room.
license: Apache-2.0
compatibility: claude
metadata:
  author: ixo
  version: "2.1.0"
  category: flow-builder
---

# Manage Flow (CRUD for BaseUcanFlow)

**This is THE skill for anything flow-related.** The moment the user mentions a flow — creating one, reading one, changing one, adding a step, removing a step, asking what's in it — invoke this skill immediately. Do not try to handle flow operations any other way.

Triggers include (but are not limited to): "create a flow", "build a flow", "design a flow", "new flow", "make a flow", "flow for...", "show me the flow", "what's in the flow", "read the flow", "inspect the flow", "update the flow", "edit the flow", "modify the flow", "change the flow", "add a step", "remove a step", "rebuild the flow", "fix the flow", or any multi-step workflow description.

## What This Skill Does

This skill is full CRUD for `BaseUcanFlow` documents in the editor room:

- **Create** — Convert a natural language description into a valid `BaseUcanFlow` JSON and write it into the room.
- **Read** — Fetch the current flow from the room so you can inspect, summarize, or reason about it.
- **Update** — Modify steps, add new ones, remove old ones, change conditions/audiences/dependencies, then write the changes back.
- **Rebuild** — Wipe and replace the flow entirely when the user wants to start over.

All reads and writes go through two browser tools — `read_flow` and `setup_flow` — documented in the **Browser Tools** section below. **Always use these tools.** Never just print JSON and stop.

## Choosing the Right Operation

| User intent | What to do |
|-------------|------------|
| "Create / build / make / design a flow for..." | Build new plan → `setup_flow({ plan })` |
| "Show me / what's in / read the current flow" | `read_flow({})` → summarize in plain language |
| "Add a step that..." | `read_flow({})` → append capability → `setup_flow({ plan, strategy: "merge" })` |
| "Change / update / fix the [step name] step" | `read_flow({})` → modify capability in place → `setup_flow({ plan, strategy: "patch" })` |
| "Remove the [step name] step" | `read_flow({})` → drop capability and clean up `dependsOn` → `setup_flow({ plan, strategy: "full" })` |
| "Rebuild / start over / replace the flow" | Build new plan → `setup_flow({ plan, strategy: "full" })` |

When in doubt: **read first**, reason about the current state, then write with the appropriate strategy.

## Conversation Pattern (Create Path)

Use this pattern when the user is creating a new flow from scratch. For updates, see the **Update Path** section further down.

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

### Phase 3: Ask What You Need to Know

You are the expert. The user doesn't know field names, action types, or what inputs are required. After mapping their steps to actions, ask **plain-language questions** about each step that needs configuration. Only ask what you can't infer from what they already told you.

**Never use field names, technical terms, or offer "leave blank to set in editor".** You are building this for them.

Use the question guide below. For each action in the flow, ask the relevant questions. Skip any question where the user already gave you the answer in their description.

**Question guide per action:**

| Action | What to ask (plain language) |
|--------|---------------------------|
| `bid/submit` | "What collection are applications submitted to?" and "Are applicants applying as service agents or evaluators?" |
| `bid/evaluate` | "Who reviews the applications?" (→ `aud`) |
| `claim/submit` | "What claim collection does this belong to?" |
| `claim/evaluate` | "Who evaluates the claims?" (→ `aud`) |
| `domain/create` | "What type of entity is being created — an asset, deed, dao, or oracle?" |
| `domain/sign` | "Who signs off on the entity?" (→ `aud`) |
| `credential/store` | "What should this credential be called?" (e.g., "vendor certificate", "KYC level 1") |
| `email/send` | "Who has to send the email for [step name]?" (→ `aud`), "What's the email about?" (→ `subject`), and "Which email template should it use?" (→ `templateName`) |
| `matrix/dm` | "What message should be sent?" and "Who sends it?" (→ `aud`) |
| `notification/push` | "How should the notification be sent — email or push?" and "What should it say?" |
| `http/request` | "What URL should it call?" and "Is it fetching data (GET) or sending data (POST)?" |
| `oracle/query` | "What should the AI be asked to do?" |
| `payment/execute` | "Who authorizes the payment?" (→ `aud`) |
| `proposal/create` | "What's the proposal about?" |
| `proposal/vote` | "Who gets to vote?" (→ `aud`) |
| `human/checkbox` | No questions needed. |
| `protocol/select` | No questions needed. |
| `form/submit` | No questions needed. |

**Rules:**
- Ask all questions for the flow in ONE message, grouped naturally.
- If the user's description already answers a question, don't re-ask. Use what they said.
- For `aud` questions, accept DIDs, names, or "anyone" / "the flow owner". If they give a name without a DID, note it in the description but leave `aud` off (they'll assign in the editor).
- If the user doesn't know an answer, fill in a sensible default or leave the field empty — don't stall the flow creation.

**Example conversation:**

```
You: I see your flow has 4 steps. Let me get the details:

1. For the bid submission — what collection are applications going to,
   and are applicants service agents or evaluators?

2. For the review step — who's responsible for reviewing applications?
   If you have their DID, I can pre-assign them.

3. For the welcome email — what should the subject line say, and which
   email template should it use?

4. For the rejection notification — what message should rejected
   applicants receive?

User: Collection is abc123, service agents. Our evaluator is
      did:ixo:entity:evaluator1. Email subject "Welcome to the program",
      use template "partner-welcome". For rejections just say
      "Your application was not successful."
```

### Phase 4: Build the Plan

After collecting answers, construct the JSON and present a **plain-language summary only** — no field names, no technical details:

```
Here's your flow: "Partner Onboarding"

1. Submit Application — applicants apply as service agents to collection abc123
2. Review Application — did:ixo:entity:evaluator1 reviews and approves or rejects
3. Create Entity — an asset entity is created for approved applicants
4. Send Welcome Email — "Welcome to the program" using partner-welcome template
5. Notify Rejection — rejected applicants get "Your application was not successful"

[JSON output]
```

### Phase 5: Iterate

After presenting the flow, ask a simple open-ended question:

"Does this look right, or would you like to change anything?"

Do NOT list options like "add audiences, change conditions" — the user will tell you what they want in their own words. You translate their intent into the right changes.

## Conversation Pattern (Update / Read Path)

Use this pattern whenever the user wants to inspect or modify an existing flow.

### Step 1: Read First

Always call `read_flow({})` before answering any question about the current flow or making any change. Never assume what the flow contains.

If `read_flow` returns `null`, the room has no flow yet — switch to the **Create Path** above.

### Step 2: Understand the Ask

- **Inspection ("show me / what's in the flow"):** Summarize the flow in plain language — title, goal, and an ordered list of steps with what each one does. Do NOT dump JSON unless asked.
- **Modification ("add / change / remove..."):** Identify exactly which capability/capabilities the user wants to touch. Ask one focused clarifying question only if you genuinely cannot tell.

### Step 3: Reason and Modify

Build the updated plan from the result of `read_flow`. Apply the principle of least change:

- **Adding a step:** Append a new capability with a unique kebab-case `id`. Wire `dependsOn` to the right upstream step. If it branches off a decision, set `condition`.
- **Modifying a step:** Change only the fields the user asked about. Keep the existing `id` so `patch` strategy can target it.
- **Removing a step:** Drop the capability AND remove its `id` from any other capability's `dependsOn`. Re-wire downstream steps to the removed step's upstream parent if needed. Use `full` strategy after a removal so stale state cannot linger.

Re-validate against the **Validation Rules** below before writing.

### Step 4: Write with the Right Strategy

| Change type | Strategy |
|-------------|----------|
| Adding new steps, leaving existing ones alone | `merge` |
| Modifying specific existing steps in place | `patch` |
| Removing steps, or any structural rebuild | `full` |
| Creating from scratch | `full` (default) |

### Step 5: Confirm in Plain Language

Tell the user what changed in plain language — never field names or JSON. Example:

> Done. I added a "Send approval email" step after the review step, using the `partner-welcome` template.

Then ask: "Anything else to change?"

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
  dependsOn?: string[],           // IDs of upstream steps — VISUAL TOPOLOGY ONLY (see Triggers section)
  condition?: {                   // conditional visibility/enable in the editor UI
    sourceId: string,             // ID of upstream step whose output is checked
    field: string,                // output field to inspect
    operator: "eq" | "neq" | "gt" | "lt" | "in" | "exists",
    value?: unknown               // value to compare against
  },
  trigger?: {                     // when and how this block fires (see Triggers section)
    type: "manual" | "flow.start" | "block.event",
    sourceBlockId?: string,       // required when type === "block.event"
    eventName?: string            // required when type === "block.event"
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

## Triggers and Events (CRITICAL — read this before wiring sequential flows)

The flow engine has two ways to wire blocks together. They look similar but mean different things, and getting them wrong is the most common mistake the agent makes.

### `dependsOn` is visual topology, not execution gating

`dependsOn` says "step B comes after step A in the visual layout and the topological sort." It does **not** gate when B runs. After the activation system was removed, every block is available from the moment it appears in the document — `dependsOn` just affects how the canvas draws the flow and the order steps are presented.

Use `dependsOn` for: visual organization, documentation of intent, constraining the topological sort, catching dependency cycles at compile time.

**Do NOT** use `dependsOn` to mean "B should fire automatically after A finishes." For that, use a `trigger`.

### `trigger` is how event-driven blocks actually fire

A small set of action types are **eligible** to be wired as listeners. When you set `trigger: { type: "block.event", sourceBlockId: "X", eventName: "Y" }` on one of these blocks, it becomes a listener that fires every time block X emits the named event. Each emission queues a separate "pending invocation" on the listener — frozen with the event payload from the moment of emission — and the listener's assigned actor (`aud`) is DM'd to invoke it.

**Eligible action types** (use `trigger` on these):
- `email/send`
- `http/request`

All other action types are user-driven only. They cannot be wired as event listeners. Setting a `block.event` trigger on a non-eligible action is a compile error.

### Action types that emit events (use these as `sourceBlockId`)

Each emitter declares a vocabulary of named events with payload schemas. When you wire a listener, the `eventName` must match a declared event on the source.

| Source action | Events emitted | Payload fields |
|---|---|---|
| `claim/evaluate` | `approved` | `claimId`, `collectionId`, `deedDid`, `evaluatedByDid`, `evaluatedAt`, `verificationProof` |
| `claim/evaluate` | `rejected` | `claimId`, `collectionId`, `deedDid`, `evaluatedByDid`, `evaluatedAt` |

The agent should treat this list as authoritative. If a user asks for a pattern like "send an email after every approved claim," map it to a `claim/evaluate` source with `eventName: "approved"`.

### Event-driven blocks have no manual run path

Once a block has `trigger.type === "block.event"`, the user **cannot** run it manually. The only way to act on it is to invoke a queued pending invocation. The block's panel shows a list of pending invocations and an Invoke button per row, frozen to that emission's payload. There is no "click to run" affordance and no fallback.

This means:
- A triggered listener with no pending invocations is correctly inert. Don't worry that the user "can't act on it" — that's the model.
- The listener's `aud` is mandatory. The compiler hard-errors if a `block.event`-triggered block has no assignee.

### Trigger payload references (`{$ref: "trigger.payload.X"}`)

Inside an event-triggered listener's `nb`, you can reference fields from the triggering event's payload using a special ref form:

```json
{ "$ref": "trigger.payload.evaluatedByDid" }
```

This is captured by value at emission time. Each pending invocation gets its own frozen copy of the payload, so 10 queued invocations resolve to 10 distinct values even if Mike acts on them all hours later.

You can also still reference other blocks' outputs via the existing `{$ref: "blockId.output.fieldPath"}` form. The runtime captures snapshots of these at queue time, so they too are frozen per pending invocation.

### Worked example: send an email after every approved claim

```json
{
  "id": "evaluate-claim",
  "can": "claim/evaluate",
  "nb": { "decision": "" },
  "aud": ["did:ixo:evaluator"]
},
{
  "id": "send-approval-email",
  "can": "email/send",
  "trigger": {
    "type": "block.event",
    "sourceBlockId": "evaluate-claim",
    "eventName": "approved"
  },
  "aud": ["did:ixo:email-sender"],
  "nb": {
    "to": { "$ref": "trigger.payload.evaluatedByDid" },
    "subject": "Your claim was approved",
    "templateName": "claim-approved",
    "variables": {
      "claimId": { "$ref": "trigger.payload.claimId" }
    }
  }
}
```

What happens at runtime: every time `evaluate-claim` is run with decision `approve`, the runtime emits an `approved` event, queues a pending invocation on `send-approval-email` with the frozen payload, and DMs `did:ixo:email-sender` to invoke it. Rejected claims do not produce a pending invocation. The email sender invokes each pending invocation in turn — each email goes to its own evaluator with its own claim id.

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
9. **Trigger eligibility.** A `block.event` trigger may ONLY be set on action types marked eligible (`email/send`, `http/request`). Setting one on any other action type is a compile error.
10. **Trigger references must exist.** `trigger.sourceBlockId` must be the `id` of another capability in the plan, and `trigger.eventName` must be a declared event of that source action (see the Triggers section's emitter table).
11. **Triggered listeners require `aud`.** Any block with `trigger.type === "block.event"` must declare `aud` with at least one DID. The runtime DMs that actor when pending invocations are queued.
12. **No trigger cycles.** If A's trigger fires B, B's trigger cannot transitively fire A. Compile error.

## Action Catalog

Each action lists its `nb` fields in two categories:
- **Plan-time** — set in the JSON plan. Use `""` for strings, `{}` for objects, `[]` for arrays when the value will be configured in the editor UI after compilation.
- **Runtime** — filled automatically during execution from upstream outputs, the actor's context, or the UI. NEVER include these in `nb`.

---

### bid/submit
**What it does:** Submit a bid/application to a collection.
**Plan-time nb:**
- `collectionId` (string, REQUIRED) — the collection to submit to. Set to `""` if configured in editor.
- `role` (string, REQUIRED) — `"service_agent"` or `"evaluation_agent"`

**Runtime (do NOT put in nb):** `surveyAnswers` (filled by user in form UI), `deedDid` (from flow context)

**Outputs:** `bidId`, `collectionId`, `role`, `submitterDid`, `deedDid`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "collectionId": "", "role": "service_agent" }
```

---

### bid/evaluate
**What it does:** Approve or reject a submitted bid.
**Plan-time nb:**
- `decision` (string) — set to `""`. User picks approve/reject in UI at execution time.
- `reason` (string, optional) — set to `""`. Filled on rejection.

**Runtime (do NOT put in nb):** `bidId`, `collectionId`, `deedDid`, `role`, `applicantDid`, `applicantAddress`, `adminAddress` — all come from the upstream `bid/submit` output or flow context.

**Outputs:** `bidId`, `decision`, `status`, `evaluatedByDid`, `evaluatedAt`, `reason`, `collectionId`, `role`, `deedDid`, `applicantDid`, `applicantAddress`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "decision": "", "reason": "" }
```

**Common condition pattern:** Downstream steps branch on `decision`:
```json
{ "sourceId": "evaluate-bid", "field": "decision", "operator": "eq", "value": "approve" }
```

---

### claim/submit
**What it does:** Submit an on-chain verifiable claim.
**Plan-time nb:**
- `collectionId` (string, REQUIRED) — claim collection. Set to `""` if configured in editor.

**Runtime (do NOT put in nb):** `deedDid`, `adminAddress`, `surveyAnswers`, `pin` — from flow context, user form, and PIN prompt.

**Outputs:** `claimId`, `transactionHash`, `collectionId`, `deedDid`, `submittedByDid`, `submittedAt`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "collectionId": "" }
```

---

### claim/evaluate
**What it does:** Approve or reject a submitted claim.
**Plan-time nb:**
- `decision` (string) — set to `""`. User picks approve/reject in UI.

**Runtime (do NOT put in nb):** `claimId`, `collectionId`, `deedDid`, `adminAddress`, `verificationProof`, `amount`, `granteeAddress` — from upstream `claim/submit` output and flow context.

**Outputs:** `claimId`, `decision`, `status`, `verificationProof`, `collectionId`, `deedDid`, `evaluatedByDid`, `evaluatedAt`

**Emits events** (use as `sourceBlockId` in another block's trigger):
- `approved` — fires on approval. Payload: `claimId`, `collectionId`, `deedDid`, `evaluatedByDid`, `evaluatedAt`, `verificationProof`
- `rejected` — fires on rejection. Payload: `claimId`, `collectionId`, `deedDid`, `evaluatedByDid`, `evaluatedAt`

**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "decision": "" }
```

**Common condition pattern:** Same as bid/evaluate — branch on `decision`. But for "do X after every approval," prefer wiring an event listener via `trigger: { type: "block.event", sourceBlockId: "...", eventName: "approved" }` on the downstream block instead of relying on `condition` + `dependsOn`. See the Triggers and Events section above.

---

### domain/create
**What it does:** Create an on-chain entity (domain card).
**Plan-time nb:**
- `entityType` (string, REQUIRED) — `"asset"`, `"deed"`, `"dao"`, or `"oracle"`

**Runtime (do NOT put in nb):** `surveyData` — filled from domain creator form in UI.

**Outputs:** `entityDid`, `transactionHash`, `credentialId`, `entityType`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "entityType": "asset" }
```

---

### domain/sign
**What it does:** Sign/finalize a domain entity.
**Plan-time nb:** None required. All inputs come from the upstream `domain/create` step and the UI.

**Runtime (do NOT put in nb):** `domainCardData`, `entityType`, `linkedEntities` — from upstream domain/create output and editor UI.

**Outputs:** `entityDid`, `transactionHash`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{}
```

---

### credential/store
**What it does:** Store a verifiable credential in Matrix.
**Plan-time nb:**
- `credentialKey` (string, REQUIRED) — key name, e.g., `"vendor-cert"`, `"kycamllevel1"`

**Runtime (do NOT put in nb):** `credential` (built from upstream outputs), `roomId` (from flow context).

**Outputs:** `credentialKey`, `cid`, `storedAt`, `duplicate`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "credentialKey": "vendor-onboarding-cert" }
```

---

### email/send
**What it does:** Send an email via the email service.
**Plan-time nb:**
- `to` (string) — recipient email. Set to `""` if dynamic. Can be a `{$ref: "trigger.payload.X"}` for triggered listeners.
- `subject` (string, REQUIRED) — email subject line
- `templateName` (string, REQUIRED) — email template identifier
- `variables` (object, optional) — template variables. Use `"{{fieldName}}"` syntax for dynamic values, or `{$ref: ...}` refs.
- `cc` (string, optional) — CC recipients
- `bcc` (string, optional) — BCC recipients
- `replyTo` (string, optional) — reply-to address

**Runtime (do NOT put in nb):** `templateVersion` — resolved by the email service.

**Eligible for event triggers:** YES. Set `trigger: { type: "block.event", sourceBlockId: "...", eventName: "..." }` on this block to make it fire automatically when an upstream event occurs. The listener's `aud` is required and gets DM'd per pending invocation.

**Outputs:** `messageId`, `sentAt`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{
  "to": "",
  "subject": "Your application has been approved",
  "templateName": "vendor-approved",
  "variables": { "vendorName": "{{applicantName}}" }
}
```

---

### matrix/dm
**What it does:** Send a direct message via Matrix.
**Plan-time nb:**
- `message` (string, REQUIRED) — message content
- `targetDid` (string) — recipient DID. Set to `""` if resolved from upstream.

**Outputs:** `roomId`, `sentAt`
**Side effect:** Yes | **Requires confirmation:** No

**Example nb:**
```json
{ "targetDid": "", "message": "Welcome aboard! Your application has been approved." }
```

---

### notification/push
**What it does:** Send a notification via configured channel.
**Plan-time nb:**
- `channel` (string, REQUIRED) — `"email"`, `"push"`, etc.
- `subject` (string, optional) — notification subject
- `body` (string, REQUIRED) — notification body

**Runtime (do NOT put in nb):** `to`, `from`, `replyTo`, `cc`, `bcc`, `bodyType` — configured in editor UI or from flow context.

**Outputs:** None defined
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "channel": "email", "subject": "Application update", "body": "Unfortunately your application was not approved at this time." }
```

---

### http/request
**What it does:** Make an HTTP request to an external API.
**Plan-time nb:**
- `endpoint` (string, REQUIRED) — full URL. **IMPORTANT: this field is `endpoint`, NOT `url`.**
- `method` (string, REQUIRED) — `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, `"PATCH"`
- `headers` (array of `{key, value}`) — request headers. Use `[]` if none.
- `body` (array of `{key, value}`) — request body fields. Use `[]` if none or GET.
- `responseSchema` (object, optional) — define expected response shape: `{ "fields": [{ "path": "data.id", "displayName": "ID", "type": "string", "description": "" }] }`

**IMPORTANT:** `headers` and `body` are arrays of `{"key": "...", "value": "..."}` objects, NOT plain `Record<string, string>` objects.

**Eligible for event triggers:** YES. Set `trigger: { type: "block.event", sourceBlockId: "...", eventName: "..." }` to make this fire automatically when an upstream event occurs. The listener's `aud` is required and gets DM'd per pending invocation.

**Outputs:** `status`, `data`, `response` (JSON string)
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{
  "endpoint": "https://api.example.com/vendors",
  "method": "GET",
  "headers": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
  "body": []
}
```

---

### oracle/query
**What it does:** Send a prompt to the AI companion.
**Plan-time nb:**
- `prompt` (string, REQUIRED) — the question or instruction

**Outputs:** `prompt`
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{ "prompt": "Analyze the submitted application and suggest an approval decision" }
```

---

### payment/execute
**What it does:** Execute a payment transaction.
**Plan-time nb:**
- `paymentConfig` (object) — payment configuration. Shape depends on payment provider. Set to `{}` if configured in editor.

**Outputs:** `transactionId`, `status`, `proposal` (object), `summary` (object)
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "paymentConfig": {} }
```

---

### proposal/create
**What it does:** Create an on-chain governance proposal.
**Plan-time nb:**
- `coreAddress` (string) — DAO core contract address. Set to `""` if configured in editor.
- `title` (string) — proposal title. Set to `""` if dynamic.
- `description` (string) — proposal description. Set to `""` if dynamic.

**Runtime (do NOT put in nb):** `actions` — built from proposal form in UI.

**Outputs:** `proposalId`, `status`, `proposalContractAddress`, `coreAddress`, `createdAt`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "coreAddress": "", "title": "", "description": "" }
```

---

### proposal/vote
**What it does:** Cast a vote on a governance proposal.
**Plan-time nb:**
- `vote` (string) — set to `""`. User selects `"yes"`, `"no"`, `"no_with_veto"`, or `"abstain"` in UI.
- `rationale` (string, optional) — set to `""`. User fills in UI.

**Runtime (do NOT put in nb):** `proposalId`, `proposalContractAddress` — from upstream `proposal/create` output.

**Outputs:** `vote`, `rationale`, `proposalId`, `votedAt`
**Side effect:** Yes | **Requires confirmation:** Yes

**Example nb:**
```json
{ "vote": "", "rationale": "" }
```

---

### human/checkbox
**What it does:** A manual checkbox step — human confirms by checking it. No `nb` needed.
**Plan-time nb:** None. Omit `nb` entirely or use `{}`.

**Outputs:** None defined
**Side effect:** Yes | **Requires confirmation:** No

**Use for:** Manual approval gates, confirmations, checklists.

---

### protocol/select
**What it does:** Select a protocol from the protocol registry.
**Plan-time nb:** None. User selects in UI. Omit `nb` or use `{}`.

**Runtime (do NOT put in nb):** `selectedProtocolDid`, `selectedProtocolName`, `selectedProtocolType` — from picker UI.

**Outputs:** `selectedProtocolDid`, `selectedProtocolName`, `selectedProtocolType`
**Side effect:** No | **Requires confirmation:** No

---

### form/submit
**What it does:** Submit a form with structured answers.
**Plan-time nb:** None. Form structure is defined in the editor, answers filled by user. Omit `nb` or use `{}`.

**Runtime (do NOT put in nb):** `answers` — from form UI.

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

### Triggered Listener (event-driven, the new pattern)
```
claim/submit → claim/evaluate ━━event:approved━━▶ email/send (listener)
                              ━━event:rejected━━▶ notification/push (manual)
```

The double-arrow `━━event:X━━▶` denotes a `block.event` trigger, NOT a `dependsOn`. The email block has `trigger: { type: "block.event", sourceBlockId: "evaluate-claim", eventName: "approved" }`, fires per emission with the frozen payload, and DMs its assignee. The notification block on the rejection branch is a regular manual block — `notification/push` is not eligible for triggers, so the user invokes it after the rejection (or wires it via `condition` instead).

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

## Browser Tools

Two browser tools are available for reading and writing flows in the editor.

### read_flow

Read the current flow from a Matrix room as a BaseUcanFlow plan. Returns the same JSON structure the agent originally authored so it can inspect the document, reason about it, and decide what to change.

**Params:**
- `roomId` (optional) — Matrix room ID to read from. Defaults to the current editor room.

**Returns:** The BaseUcanFlow plan, or `null` if the room has no flow.

**Examples:**
```
read_flow({})                                    // current editor room
read_flow({ roomId: "!abc123:matrix.ixo.world" }) // specific room
```

### setup_flow

Compile a BaseUcanFlow plan and write the resulting flow graph into a Matrix room's Y.Doc.

**Params:**
- `plan` (REQUIRED) — A BaseUcanFlow JSON object with `kind`, `version`, `flowId`, `title`, and `capabilities[]`.
- `roomId` (optional) — Matrix room ID. Defaults to the current editor room.
- `creatorDid` (optional) — DID of the flow creator. Defaults to the current user's DID.
- `docId` (optional) — Override document ID. Defaults to `plan.flowId`.
- `strategy` (optional) — `"full"` (default), `"merge"`, or `"patch"`.
  - **full:** Clears all existing flow state and rebuilds from scratch.
  - **merge:** Existing nodes win on ID collision; new IDs are added. Edges and order recomputed.
  - **patch:** Incoming nodes win on ID collision (overwrite); new IDs added. Existing unmentioned nodes kept. Edges and order recomputed.

**Returns:** The compiled flow result with `compiled`, `flowId`, and `roomId`.

**Examples:**
```
setup_flow({ plan: <the JSON> })                           // new flow, full strategy
setup_flow({ plan: updatedPlan, strategy: "patch" })       // update specific steps
setup_flow({ plan: planWithNewSteps, strategy: "merge" })  // add steps without touching existing ones
```

## Deploying the Flow

After constructing the BaseUcanFlow JSON, you MUST call the `setup_flow` browser tool to deploy it into the user's editor. Pass the full JSON object as the `plan` argument. The `roomId` and `creatorDid` default to the current editor room and user if not specified.

```
1. Build the BaseUcanFlow JSON (this skill)
2. Call setup_flow({ plan: <the JSON> }) to write it into the editor
3. Confirm to the user that the flow has been created
```

Do NOT just output the JSON and stop. Always call `setup_flow` to complete the flow setup.

### Read → Reason → Write Pattern

When modifying an existing flow, use this pattern:

```
1. Call read_flow({}) to get the current plan
2. Inspect the capabilities, decide what to add or change
3. Call setup_flow({ plan: updatedPlan, strategy: "patch" }) to write changes back
```

Use `strategy: "patch"` when updating specific steps (incoming nodes overwrite on ID collision, unmentioned nodes are kept). Use `strategy: "merge"` when adding new steps without touching existing ones. Use `strategy: "full"` to rebuild from scratch.

## Important Reminders

- Never include `with` on capabilities — it is derived at runtime
- Never include `actor` — use `aud` (array of DIDs) instead
- Leave `flowId` empty — set at instantiation
- Leave `nb` input values empty (e.g., `""`, `{}`, `[]`) when they are filled at runtime by the user or upstream outputs
- Only include `aud` when the user specifies who should handle a step — **EXCEPT** for any block with `trigger.type === "block.event"`, where `aud` is mandatory
- Only include `condition` when there is a decision point with branching logic
- Only include `ttl` when the user specifies time constraints
- Use descriptive `id` values in kebab-case that reflect what the step does
- **`dependsOn` does not gate execution** — it is visual topology only. If you need a block to fire after an event, use `trigger`, not `dependsOn`
- **Only `email/send` and `http/request` are eligible for `block.event` triggers.** Setting one on any other action type is a compile error
- **Triggered listeners cannot be invoked manually.** Once `trigger.type === "block.event"`, the user can only act on queued pending invocations (one per source emission)
- Inside a triggered listener's `nb`, prefer `{$ref: "trigger.payload.X"}` over `{$ref: "blockId.output.X"}` when the field is in the event payload — both work but trigger payload refs are cleaner and document the listener's contract more clearly
- The `phase` field is for visual grouping — common values: "intake", "review", "execution", "onboarding", "completion"
