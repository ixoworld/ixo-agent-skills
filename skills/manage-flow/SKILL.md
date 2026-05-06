---
name: manage-flow
description: >
  The single skill for BaseUcanFlow authoring operations — create, read, inspect, validate,
  update, modify, extend, rebuild, or delete flow template steps through the editor's
  `read_flow` and `setup_flow` tools. Use for "create a flow", "build a flow", "design a
  flow", "new flow", "show me the flow template", "read the flow template", "update the
  flow", "edit the flow", "add a step", "remove a step", "change the flow", "rebuild the
  flow", accepted config proposals, or multi-step workflow template authoring. Do not use
  for live runtime orchestration: blocked or overdue nodes, FlowAgentService, Ralph Loop
  operation, UCAN policy checks, leases, outbox, ledger, pending invocations, UDID watching,
  archive/restart, or runtime actor assignment; route those to flow-agent. Also handles POD
  (Programmable Organisational Domain) creation templates — triggers include "create a pod",
  "set up a pod", "new pod", "pod setup", "programmable organisational domain" — using the
  built-in POD recipe.
  Supports 24 action types including bids, claims, payments, governance proposals, emails,
  notifications, POD setup steps, and more. Uses the `read_flow` and `setup_flow` browser
  tools to read and write BaseUcanFlow templates in the editor room.
license: Apache-2.0
compatibility: claude
metadata:
  author: ixo
  version: "2.4.0"
  category: flow-builder
---

# Manage Flow (CRUD for BaseUcanFlow Templates)

Use this skill for BaseUcanFlow template authoring. It creates, reads, validates, updates, rebuilds, and deploys flow templates in the editor room. It does not operate live Ralph Loop runtime state.

Triggers include (but are not limited to): "create a flow", "build a flow", "design a flow", "new flow", "make a flow", "flow template for...", "show me the flow template", "what's in the flow template", "read the flow template", "inspect the flow template", "update the flow", "edit the flow", "modify the flow", "change the flow", "add a step", "remove a step", "rebuild the flow", "fix the template", "apply the accepted config proposal", or any multi-step workflow template description.

**POD-specific triggers** route to the POD recipe (see **Flow Recipes** below): "create a pod", "set up a pod", "new pod", "pod setup", "make a pod", "build a pod", "pod for...", "programmable organisational domain", "programmable org domain", "new organisational domain", "spin up a pod".

## Skill Boundary

`$manage-flow` and `$flow-agent` are complementary and must not be merged.

| Intent | Use |
|---|---|
| Authoring: create, inspect template, add/remove/reorder steps, configure `nb`, `aud`, `trigger`, `condition`, POD recipe | `$manage-flow` |
| Runtime: node state, pending invocation, blocked/overdue, assignment, notify/escalate, UCAN proof, lease, outbox, ledger, execute action, validate external state, submit claim, watch UDID, archive/restart | `$flow-agent` |
| Cross-boundary: stale config at runtime | `$flow-agent` proposes; `$manage-flow` applies only after approval |

Same words can refer to different layers. In this skill, `claim/submit`, `notification/push`, `aud`, `trigger`, `condition`, and "assign" mean template fields that will be compiled into a BaseUcanFlow. In `$flow-agent`, they mean live runtime command execution and actor coordination.

### Runtime Handoff

Stop and route to `$flow-agent` when the user asks about live execution or Ralph Loop operation, including blocked nodes, overdue nodes, pending invocations, FlowAgentService, UCAN policy checks, missing or expired delegations, leases, agent outbox, audit ledger, replay, external mutation validation, claim submission monitoring, UDID watching, memory records, archiving, or restarting a completed cycle.

Accepted `propose_config_change` outputs from `$flow-agent` may be implemented here only after human or governance approval. Diagnosis and proposal generation belong to `$flow-agent`; applying an accepted template change belongs to `$manage-flow`.

## What This Skill Does

This skill is full CRUD for `BaseUcanFlow` documents in the editor room:

- **Create** — Convert a natural language description into a valid `BaseUcanFlow` JSON and write it into the room.
- **Read** — Fetch the current flow from the room so you can inspect, summarize, or reason about it.
- **Update** — Modify steps, add new ones, remove old ones, change conditions/audiences/dependencies, then write the changes back.
- **Rebuild** — Wipe and replace the flow entirely when the user wants to start over.

All reads and writes go through two browser tools — `read_flow` and `setup_flow` — documented in the **Browser Tools** section below. These are template/editor tools, not runtime orchestration tools. **Always use these tools for template authoring.** Never just print JSON and stop.

## Choosing the Right Operation

| User intent | What to do |
|-------------|------------|
| "Create / build / make / design a flow for..." | Build new plan → `setup_flow({ plan, strategy: "full" })` |
| "Show me / what's in / read the current flow" | `read_flow()` → summarize in plain language |
| "Add a step that..." (order doesn't matter) | `read_flow()` (must succeed) → build a plan containing **ONLY the new capability** → `setup_flow({ plan, strategy: "merge" })` |
| "Add a step before/after [X]" (order matters) | `read_flow()` (must succeed) → build a **full plan** with all existing capabilities (preserving their original IDs) plus the new one in the right position → `setup_flow({ plan, strategy: "full" })` |
| "Change / update / fix the [step name] step" | `read_flow()` (must succeed) → build a plan containing **ONLY the modified capability** with its **original `id`** → `setup_flow({ plan, strategy: "patch" })` |
| "Remove the [step name] step" | `read_flow()` (must succeed) → build a full plan minus the dropped capability, cleaning up any `condition.sourceId` or `trigger.sourceBlockId` references to it → `setup_flow({ plan, strategy: "full" })` |
| "Rebuild / start over / replace the flow" | Build new plan → `setup_flow({ plan, strategy: "full" })` |
| "Create / set up / make a pod" | Use the **POD Creation recipe** (see Flow Recipes) → `setup_flow({ plan, strategy: "full" })` |

**Critical rules for any modify operation:**
1. `read_flow` MUST succeed. If it returns `null` and the user is modifying, STOP and ask — do not silently rebuild. See Step 2 of the Update Path for the full rule.
2. NEVER use `merge` strategy with a plan that contains both existing AND new capabilities. That is the duplicate-blocks bug. With `merge`, the plan must contain ONLY the additions.
3. NEVER invent fresh `id` values for blocks that already exist in the flow. The IDs from `read_flow` are the source of truth — preserve them character for character.

When in doubt: **read first**, preserve IDs, then write with the strategy that matches your plan's contents.

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
| `domain/card-build` | "What type of entity is being created — an asset, deed, dao, or oracle?" |
| `domain/card-preview` | — (no planning question; reads from upstream `domain/card-build`) |
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

### Step 1: Determine the user's intent BEFORE you read

Before calling `read_flow`, classify the user's request as one of:
- **CREATE** — "create a flow", "build a flow", "make a flow", "design a flow for X", "new flow", any phrasing where the user is starting fresh
- **INSPECT** — "show me", "what's in the flow", "summarize the flow", "list the steps"
- **MODIFY** — "add a step", "remove a step", "change the X", "fix the X", "update the X", "replace the X", any phrasing that references something the user expects to already exist

This classification controls how you handle Step 2.

### Step 2: Read the current flow

Always call `read_flow()` before answering any question about the current flow or making any change. Never assume what the flow contains.

**Then handle the result based on intent:**

| Intent | `read_flow` returns a plan | `read_flow` returns `null` |
|---|---|---|
| **CREATE** | The room already has a flow. Tell the user and ask whether to extend it or replace it. Do not silently overwrite. | Proceed to the Create Path. |
| **INSPECT** | Summarize the plan in plain language. | Tell the user "There is no flow in this room yet. Want me to create one?" Do not invent a summary. |
| **MODIFY** | Use the plan as the base for your edit. Preserve every existing `id`. | **STOP.** Do NOT switch to the Create Path. The user is referencing a flow you cannot see — that means either the room context is wrong, the flow exists in the editor but was never compiled, or there is a sync race. Tell the user: *"I tried to read the current flow but found nothing. Can you confirm we're in the right room, or send a fresh `setup_flow` first? I don't want to silently rebuild and lose anything."* Wait for the user to resolve it. |

**This is a hard rule:** never silently switch from MODIFY to CREATE when `read_flow` returns null. The bug it prevents — duplicate blocks because the agent rebuilt with new IDs and merged into an invisible existing flow — is the most common and most damaging failure mode of this skill.

### Step 3: Understand the Ask

- **Inspection ("show me / what's in the flow"):** Summarize the flow in plain language — title, goal, and an ordered list of steps with what each one does. Do NOT dump JSON unless asked.
- **Modification ("add / change / remove..."):** Identify exactly which capability/capabilities the user wants to touch. Ask one focused clarifying question only if you genuinely cannot tell.

### Step 4: Reason and Modify

Build the updated plan from the result of `read_flow`. Apply the principle of least change:

- **Adding a step:** Append a new capability with a unique kebab-case `id`. If it should fire automatically when an upstream block emits an event, set `trigger`. If it branches on a decision, set `condition`. Otherwise just append it — order in the `capabilities[]` array is the visual order.
- **Modifying a step:** Change only the fields the user asked about. **Keep the existing `id` exactly as it came back from `read_flow`.** Inventing a new id for an existing block is the duplicate-blocks bug.
- **Removing a step:** Drop the capability AND remove its `id` from any other capability's `condition.sourceId` or `trigger.sourceBlockId`. Use `full` strategy after a removal so stale state cannot linger.

**ID PRESERVATION IS NON-NEGOTIABLE.** When modifying a flow, every capability you carry forward from the previous `read_flow` result MUST keep its original `id`. The merge and patch strategies use `id` as the collision key. If you invent fresh ids for blocks that already exist, the merge strategy treats them as additions and you get duplicates. There is no recovery from this except `full` rebuild + asking the user to clean up.

Re-validate against the **Validation Rules** below before writing.

### Step 5: Write with the Right Strategy

The choice of strategy depends on **what your plan contains**, not just what the user asked for. Two distinct cases:

**Case A: Your plan contains ONLY the new/changed capabilities** (the "delta" approach):
| Change type | Strategy | Plan contents |
|---|---|---|
| Adding new step(s), leaving existing ones alone | `merge` | ONLY the new capability/capabilities |
| Modifying specific existing step(s) in place | `patch` | ONLY the modified capability/capabilities, with their original IDs |

**Case B: Your plan contains the FULL set** (the "rebuild" approach):
| Change type | Strategy | Plan contents |
|---|---|---|
| Reordering, removing, or any structural rebuild | `full` | ALL capabilities — both unchanged ones (with original IDs) and any new/modified ones |
| Creating from scratch | `full` (default) | The full new plan |

**Forbidden combination:** never use `merge` with a full plan that contains both existing AND new capabilities. That is the duplicate-blocks bug. If you have the full plan in hand, use `full` strategy. If you only want to add a step, your plan should contain ONLY that step and you use `merge`.

### Step 6: Confirm in Plain Language

Tell the user what changed in plain language — never field names or JSON. Example:

> Done. I added a "Send approval email" step after the review step, using the `partner-welcome` template.

Then ask: "Anything else to change?"

## Worked Example: Adding a Step to an Existing Flow

User has a 4-step flow and says: *"add a bid action before claim submission"*.

**Wrong approach (the duplicate-blocks bug):**
1. Call `read_flow()` → returns null for some reason
2. Decide to "rebuild" with 5 steps
3. Invent 5 fresh IDs
4. Call `setup_flow({ plan: <5 caps>, strategy: "merge" })`
5. Result: existing 4 + new 5 = 9 blocks. Disaster.

**Right approach when `read_flow` returns null:**
1. Call `read_flow()` → returns null
2. **STOP.** The user said "before claim submission" — they're referencing an existing flow. Tell the user: *"I tried to read your current flow but found nothing. Can you confirm we're in the right room, or run `setup_flow` first to make sure the flow is registered? I don't want to silently rebuild and create duplicates."*
3. Wait for the user to fix the read.

**Right approach when `read_flow` succeeds:**
1. Call `read_flow()` → returns the 4-capability plan
2. Read the IDs of the existing capabilities. Suppose claim submission is `submit-claim`.
3. Build a delta plan with ONLY the new bid capability (one item in `capabilities[]`):
   ```json
   { "id": "submit-bid", "can": "bid/submit", "nb": { "collectionId": "", "role": "service_agent" }, "title": "Submit Bid", ... }
   ```
4. Call `setup_flow({ plan: <1 cap>, strategy: "merge" })`. The merge strategy adds the new capability without touching the existing 4. Result: 5 blocks.
5. **About ordering:** with the delta-merge approach, the new capability is appended at the end of the array. If the user specifically said "before claim submission" and the visual order matters, you need the rebuild approach instead:
   - Build a FULL plan with all 5 capabilities — the 4 existing ones (with their original IDs from `read_flow`) plus the new bid in the right position
   - Call `setup_flow({ plan: <5 caps>, strategy: "full" })`. The full strategy replaces everything. Result: 5 blocks in the requested order.
6. Confirm in plain language: *"Done. I added a Submit Bid step before the claim submission."*

The two right approaches differ on ordering control. Use delta-merge when ordering doesn't matter. Use full-rebuild when it does. **Never mix the two** by using a full plan with merge strategy.

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

**Note:** There is no `dependsOn` field. The order of capabilities in the `capabilities[]` array is the visual order on the canvas. There is no inferred sequencing — express runtime relationships explicitly through `trigger` (for event-driven listeners) or `condition` (for visibility/enable gating).

## Triggers and Events (CRITICAL — read this before wiring sequential flows)

The flow engine has exactly two mechanisms for wiring blocks together at runtime: **triggers** (event-driven listeners) and **conditions** (visibility/enable gating in the editor UI). There is no other "B comes after A" field. If you want B to fire when A emits an event, use a `trigger`. If you want B to be visible/enabled only when A's output meets some criteria, use a `condition`. If neither — just place B after A in the `capabilities[]` array.

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
2. **`id` values must be unique.** No two capabilities can share an `id`.
3. **No `with` field.** The `with` is derived at runtime as `ixo:flow:{roomId}:{can}`. Never include it in the plan.
4. **No `dependsOn` field.** It does not exist on `FlowCapability`. Do not write it. Sequencing is the array order; runtime relationships are `trigger` and `condition`.
5. **`nb` keys should match the action's expected inputs.** Refer to the catalog for each action's `nb` shape.
6. **`aud` is an array of DID strings.** Each DID results in a separate UCAN delegation at instantiation.
7. **`condition.sourceId` must reference a capability that exists in the plan.** No other constraint on ordering — there is no `dependsOn` array to check against.
8. **Trigger eligibility.** A `block.event` trigger may ONLY be set on action types marked eligible (`email/send`, `http/request`). Setting one on any other action type is a compile error.
9. **Trigger references must exist.** `trigger.sourceBlockId` must be the `id` of another capability in the plan, and `trigger.eventName` must be a declared event of that source action (see the Triggers section's emitter table).
10. **Triggered listeners require `aud`.** Any block with `trigger.type === "block.event"` must declare `aud` with at least one DID. The runtime DMs that actor when pending invocations are queued.
11. **No trigger cycles.** If A's trigger fires B, B's trigger cannot transitively fire A. Compile error.
12. **POD recipe constraints.** When building a POD creation flow: `domain/card-build.nb.entityType` must be `"dao"`; `pod/governance-config.nb.groupType` must be `""` or one of `categorical | multisig | nftStaking | tokenStaking`; never write concrete member DIDs, blueprint DIDs, contract addresses, or token configs into `nb` at plan time — those are runtime picker inputs. See the **POD Creation Recipe** in the Flow Recipes section.

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

**Common condition pattern:** Same as bid/evaluate — branch on `decision`. But for "do X after every approval," prefer wiring an event listener via `trigger: { type: "block.event", sourceBlockId: "...", eventName: "approved" }` on the downstream block. The triggered listener fires per emission with a frozen payload — that's the right model for "fire X after Y." See the Triggers and Events section above.

---

### domain/card-build
**What it does:** Collect the domain card survey (name, description, tags, image, etc.) and produce an unsigned W3C Verifiable Credential describing the entity. No on-chain effect.
**Plan-time nb:**
- `entityType` (string, REQUIRED) — `"asset"`, `"deed"`, `"dao"`, or `"oracle"`

**Runtime (do NOT put in nb):** `surveyData` — filled from the domain creator form in the UI.

**Outputs:** `domainCardData` (unsigned W3C VC), `entityType`
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{ "entityType": "dao" }
```

---

### domain/card-preview
**What it does:** Pass `domainCardData` through oracle enrichment and present it to the user for human approval before signing.
**Plan-time nb:** None required. Reads `domainCardData` from the upstream `domain/card-build` output.

**Runtime (do NOT put in nb):** `domainCardData` — wired from upstream.

**Outputs:** `domainCardData` (enriched), `approved` (boolean)
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{}
```

---

### domain/sign
**What it does:** Sign and broadcast `MsgCreateEntity` (and, in the POD recipe, `MsgCreateGroup` atomically in the same transaction).
**Plan-time nb:** None required. All inputs are wired from upstream at runtime:
- `domainCardData` from `domain/card-build` (or `domain/card-preview` if used)
- Blueprint/protocol DID from `pod/domain-single-selection` (POD recipe only)
- `linkedEntities` from the governance-group after-create hooks (POD recipe only)

**Runtime (do NOT put in nb):** `domainCardData`, `entityType`, `linkedEntities`.

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

### pod/domain-indexer-lookup
**What it does:** AI-assisted intent capture that queries the Domain Indexer for matching POD Blueprint candidates. Step 1 of the POD creation recipe.
**Plan-time nb:**
- `userMessage` (string) — the user's plain-language description of what the POD is for. Set to `""` if it will be filled at runtime by the user.
- `agentMessage` (string, optional) — set to `""`.

**Runtime (do NOT put in nb):** none — the user types `userMessage` at execution time if left empty.

**Outputs:** `purposeDescription`, `blueprintCandidates` (array of `{did, name, description}`)
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{ "userMessage": "" }
```

---

### pod/domain-single-selection
**What it does:** Single-select a Blueprint (protocol entity) from the candidate list produced by `pod/domain-indexer-lookup`. Step 2 of the POD creation recipe.
**Plan-time nb:** None. The user picks in the UI from the upstream candidates. Omit `nb` or use `{}`.

**Runtime (do NOT put in nb):** `selectedBlueprintDid`, `selectedBlueprintName`, `selectedBlueprintDescription` — from picker UI.

**Outputs:** `selectedBlueprintDid`, `selectedBlueprintName`, `selectedBlueprintDescription`
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{}
```

---

### pod/entity-single-selection
**What it does:** Optional parent-organisation picker. Lists IXO entities where the current user holds a controller role. The user may skip to leave `parentDID` as null. Step 3 of the POD creation recipe.
**Plan-time nb:** None. Omit `nb` or use `{}`.

**Runtime (do NOT put in nb):** `selectedEntityDid`, `selectedEntityName`, `skipped` — from picker UI.

**Outputs:** `selectedEntityDid` (string or null when skipped), `selectedEntityName`, `skipped` (boolean)
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{}
```

---

### pod/governance-config
**What it does:** Configure the Cosmos group type and decision policy for the POD. Step 4 of the POD creation recipe. The chosen `groupType` determines what `pod/member-multi-select` collects next.
**Plan-time nb:**
- `groupType` (string) — set to `""` so the user picks in the UI. Valid values: `"categorical"`, `"multisig"`, `"nftStaking"`, `"tokenStaking"`.
- `governance` (object) — decision policy. Set to `{}` to be filled in the UI. Fields vary by group type:
  - All types: `votingPeriod` (ISO 8601 duration, REQUIRED at runtime), `minExecutionDelay`, `executor`
  - `categorical`, `nftStaking`, `tokenStaking`: `quorum` (0–1 decimal string), `threshold` (0–1), `vetoThreshold` (0–1). Constraint: `threshold + vetoThreshold ≤ 1`.
  - `multisig`: `threshold` (positive integer — minimum signers)
  - `nftStaking`, `tokenStaking`: `unstakingDuration` (ISO 8601 duration)

**Runtime (do NOT put in nb):** the concrete values inside `governance` — all filled by the UI against the selected `groupType`.

**Outputs:** `groupType`, `governance`
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{ "groupType": "", "governance": {} }
```

---

### pod/member-multi-select
**What it does:** Configure POD membership. The shape of the member list depends on `groupType` from the upstream `pod/governance-config`. Step 5 of the POD creation recipe.
**Plan-time nb:**
- `groupType` (string) — set to `""`. Wired from upstream `pod/governance-config.output.groupType` at runtime, or left for the UI to inherit.

**Runtime (do NOT put in nb), varies by groupType:**
- `categorical`: `members[]` (each `{did, role, votingPower}`). At least one member must have role `"admin"`. No duplicate DIDs. Voting power must be a positive integer.
- `multisig`: `members[]` (each `{did}`) + `multisigThreshold` (positive integer, `≥1` and `≤` member count).
- `nftStaking`: `nftContractAddress` (bech32 contract address).
- `tokenStaking`: `tokenConfig` object. If `isExistingToken: true`, requires `tokenAddress`. Otherwise requires `tokenName`, `tokenSymbol`, `tokenSupply` (positive integer).

**Outputs:** `members`, `multisigThreshold`, `nftContractAddress`, `tokenConfig` (only the subset relevant to the chosen groupType is populated)
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{ "groupType": "" }
```

---

### pod/list-domain-flows
**What it does:** Multi-select Flow Templates from the blueprint protocol entity. Zero selections is a valid state (protocol-default flows are still included). Step 6 of the POD creation recipe.
**Plan-time nb:** None. Omit `nb` or use `{}`.

**Runtime (do NOT put in nb):** `selectedFlowDids` (array) — from picker UI.

**Outputs:** `selectedFlowDids`
**Side effect:** No | **Requires confirmation:** No

**Example nb:**
```json
{}
```

---

## Common Flow Patterns

### Bid-based Onboarding
```
bid/submit → bid/evaluate → (approve) domain/card-build → domain/card-preview → domain/sign → credential/store
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
proposal/create → proposal/vote → (passed) domain/card-build → domain/card-preview → domain/sign
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

The double-arrow `━━event:X━━▶` denotes a `block.event` trigger. The email block has `trigger: { type: "block.event", sourceBlockId: "evaluate-claim", eventName: "approved" }`, fires per emission with the frozen payload, and DMs its assignee. The notification block on the rejection branch is a regular manual block — `notification/push` is not eligible for triggers, so the user invokes it after the rejection (or wires it via `condition` instead).

### POD Creation
```
pod/domain-indexer-lookup → pod/domain-single-selection
  → pod/governance-config → pod/member-multi-select
  → domain/card-build → domain/card-preview → domain/sign
```

See the **Flow Recipes** section below for the full canonical skeleton.

## Flow Recipes

Recipes are canonical, named flows that this skill knows how to build as a unit. When the user's request matches a recipe's triggers, build the recipe's capability list directly instead of running the generic Phase-1/2 question pattern. Ask only the recipe's specific questions, then present the plain-language summary and write it with `setup_flow({ plan, strategy: "full" })`.

### POD Creation Recipe

**Use when the user says:** "create a pod", "set up a pod", "new pod", "pod setup", "make a pod", "build a pod", "pod for …", "programmable organisational domain", "new organisational domain", "spin up a pod".

**What a POD is** (for user-facing explanations only — do not dump this into the plan): A sovereign, on-chain organisational workspace represented by an IXO entity + Cosmos group. Created by two on-chain transactions — `MsgCreateEntity` (authored via `domain/card-build` → `domain/card-preview` → `domain/sign`) and `MsgCreateGroup` (configured by `pod/governance-config` + `pod/member-multi-select`, executed atomically by `domain/sign`).

#### Questions to ask before building

Ask these in **one** message, plain language, grouped naturally. Skip any the user already answered.

1. **Purpose** — "What's the pod for?" (feeds `pod/domain-indexer-lookup.userMessage` and seeds `title` / `goal`)
2. **Governance model** — "How should decisions be made — weighted voting by member (categorical), multi-signature threshold (multisig), NFT staking, or token staking?" (feeds `pod/governance-config.groupType`)
3. **Publish?** — "Should the pod be publicly listed once created, or kept private?" (sets whether the final `human/checkbox` defaults on)

**Do NOT ask** for blueprint DID, member DIDs, voting period, quorum, thresholds, domain card name/description, NFT contract address, or token config. All of that is collected at **runtime** by the POD block UIs. Your job is to author a plan with correct `can` values, IDs, and minimal `nb` scaffolding. The user fills the rest in the editor.

#### Canonical capability skeleton

Build this exact shape. IDs are stable kebab-case and must be preserved if the flow is later modified.

```json
{
  "kind": "qi.flow.base-ucan",
  "version": "1.0",
  "flowId": "",
  "title": "<from purpose, e.g. 'Reforestation Carbon POD'>",
  "goal": "<one-line summary of the pod's purpose>",
  "meta": {},
  "capabilities": [
    {
      "id": "lookup-blueprint",
      "can": "pod/domain-indexer-lookup",
      "nb": { "userMessage": "" },
      "phase": "intake",
      "title": "Describe the POD purpose",
      "description": "User describes what the POD is for; the indexer returns matching blueprint candidates"
    },
    {
      "id": "select-blueprint",
      "can": "pod/domain-single-selection",
      "nb": {},
      "phase": "intake",
      "title": "Select a Blueprint",
      "description": "Pick a blueprint from the candidates returned by the previous step"
    },
    {
      "id": "configure-governance",
      "can": "pod/governance-config",
      "nb": { "groupType": "", "governance": {} },
      "phase": "governance",
      "title": "Configure governance",
      "description": "Pick group type (categorical/multisig/nftStaking/tokenStaking) and decision policy"
    },
    {
      "id": "configure-members",
      "can": "pod/member-multi-select",
      "nb": { "groupType": "" },
      "phase": "governance",
      "title": "Configure members",
      "description": "Add members or staking config appropriate to the selected group type"
    },
    {
      "id": "build-card",
      "can": "domain/card-build",
      "nb": { "entityType": "dao" },
      "phase": "execution",
      "title": "Build the POD domain card",
      "description": "Fill the POD survey (name, description, tags, image) — produces an unsigned W3C VC in runtime.output.domainCardData"
    },
    {
      "id": "preview-card",
      "can": "domain/card-preview",
      "nb": {},
      "phase": "execution",
      "title": "Preview and approve",
      "description": "Oracle enriches the domain card; user reviews and approves before signing"
    },
    {
      "id": "sign-domain",
      "can": "domain/sign",
      "nb": {},
      "phase": "execution",
      "title": "Sign and submit",
      "description": "Sign MsgCreateEntity + MsgCreateGroup — consumes domainCardData from build-card, blueprint DID from select-blueprint, and linkedEntities from the governance-group after-create hooks"
    }
  ]
}
```

#### Recipe-specific rules

1. **`entityType` is `"dao"`** on `domain/card-build`. A POD is a DAO-class entity. Do not use `"asset"`, `"deed"`, or `"oracle"`.
2. **Leave all POD-block runtime fields empty.** That includes `groupType`, `governance`, member DIDs, NFT contract addresses, token configs, and blueprint DIDs. They are picker-UI inputs, not plan-time values. The only non-empty plan-time `nb` field in the POD-specific steps is `userMessage: ""` on `pod/domain-indexer-lookup` (which is deliberately empty — the user types into it at runtime).
3. **Never add `aud` to any POD recipe block** unless the user names a specific actor. None of the POD actions (including `domain/card-build`, `domain/card-preview`, and `domain/sign` in this recipe) require `aud` — the runtime does not need to DM a named actor.
4. **`domain/sign` consumes three upstream sources atomically.** It reads `domainCardData` from `build-card.output`, the blueprint DID from `select-blueprint.output`, and `linkedEntities` from the governance-group after-create hooks (emitted once `pod/governance-config` + `pod/member-multi-select` resolve). All three are runtime wiring — do not write any of them into `nb` at plan time.
5. **Always write with `strategy: "full"`** when creating a POD flow from scratch. If the user asks to modify an existing POD flow, follow the normal Update Path — `read_flow` first, preserve all IDs, then apply the delta rules.
6. **Group-type branching is runtime, not plan-time.** Do not build four different recipes. One plan with `pod/governance-config` + `pod/member-multi-select` handles all four group types — the member-select block reads `groupType` from the upstream governance block at execution time and adapts its UI.

#### Plain-language summary to present

After building, summarise the flow to the user like this (adjust the purpose line):

```
Here's your pod setup flow: "<title>"

1. Describe what the pod is for → the system suggests matching blueprints
2. Pick a blueprint
3. Pick a governance model and set the decision policy
4. Add members (or set staking config) for that governance model
5. Fill out the domain card survey (name, description, tags, image)
6. Preview the enriched card and approve it
7. Sign — creates the POD entity and group on-chain in one transaction
```

Then ask: "Does this look right, or would you like to change anything?"

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
| domain/card-build | globe |
| domain/card-preview | eye |
| domain/sign | feather |
| credential/store | shield |
| payment/execute | credit-card |
| http/request | cloud |
| protocol/select | git-branch |
| human/checkbox | check-square |
| form/submit | file-text |
| oracle/query | cpu |
| pod/domain-indexer-lookup | search |
| pod/domain-single-selection | list-checks |
| pod/entity-single-selection | building |
| pod/governance-config | landmark |
| pod/member-multi-select | users |
| pod/list-domain-flows | workflow |

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
      "phase": "review",
      "title": "Review fetched data",
      "description": "Reviewer checks the data and confirms it is valid"
    },
    {
      "id": "build-card",
      "can": "domain/card-build",
      "nb": {
        "entityType": "asset"
      },
      "phase": "execution",
      "title": "Build entity card",
      "description": "Collect the entity survey and produce an unsigned W3C VC"
    },
    {
      "id": "preview-card",
      "can": "domain/card-preview",
      "nb": {},
      "phase": "execution",
      "title": "Preview entity card",
      "description": "Oracle enriches the card; user approves before signing"
    },
    {
      "id": "sign-entity",
      "can": "domain/sign",
      "nb": {},
      "phase": "execution",
      "title": "Sign and submit",
      "description": "Sign MsgCreateEntity and broadcast on-chain"
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

Read the current flow from the editor as a BaseUcanFlow plan. Returns the same JSON structure the agent originally authored so it can inspect the document, reason about it, and decide what to change.

**Takes no parameters.** The editor instance already knows which flow you're working on — there is no roomId, no matrixClient, no nothing to pass. Always call it as `read_flow()`.

**Returns:** The BaseUcanFlow plan, or `null` ONLY if the editor has no flow state at all.

**Example:**
```
read_flow()
```

**About `null` returns:** if `read_flow()` returns null, it means the editor's Y.Doc has zero flow state — no nodes, no meta, nothing. This is genuinely rare. It does NOT mean "the flow is empty" or "I'm in the wrong room" — those are different failure modes the editor's API does not produce. If you got `null` and the user is referencing an existing flow they expect you to see, something is wrong with the editor session, not with the flow. STOP and tell the user — do not silently rebuild. See Update Path Step 2 for the full decision tree.

### setup_flow

Compile a BaseUcanFlow plan and write the resulting flow graph into the editor's Y.Doc.

**Params:**
- `plan` (REQUIRED) — A BaseUcanFlow JSON object with `kind`, `version`, `flowId`, `title`, and `capabilities[]`.
- `strategy` (optional) — `"full"` (default), `"merge"`, or `"patch"`.
  - **full:** Clears all existing flow state and rebuilds from scratch.
  - **merge:** Existing nodes win on ID collision; new IDs are added.
  - **patch:** Incoming nodes win on ID collision (overwrite); new IDs added. Existing unmentioned nodes are kept.

The editor already knows its room and creator DID — do not pass them. Just `plan` and optionally `strategy`. Leave `flowId: ""` in the plan; the runtime fills it in.

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
1. Call read_flow() to get the current plan
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
- **There is no `dependsOn` field.** Do not write it. Sequencing is the order of capabilities in the array. Runtime relationships go in `trigger` or `condition`
- **NEVER invent fresh `id` values for blocks that already exist.** When modifying a flow, every capability you carry forward from `read_flow` must keep its original `id` exactly. Inventing new IDs is the duplicate-blocks bug
- **NEVER use `merge` strategy with a plan containing both existing and new capabilities.** Merge is for delta plans (additions only). If you have the full plan in hand, use `full`. The combination of "full plan + merge strategy" creates duplicates because the merge keeps the existing version of every collision and adds your "rebuilt" version alongside it
- **If `read_flow` returns null and the user is modifying, STOP.** Do not silently switch to create mode. The user is referencing a flow you cannot see — ask them to confirm the room or run `setup_flow` first. See the Update Path Step 2 table for the full decision tree
- **Only `email/send` and `http/request` are eligible for `block.event` triggers.** Setting one on any other action type is a compile error
- **Triggered listeners cannot be invoked manually.** Once `trigger.type === "block.event"`, the user can only act on queued pending invocations (one per source emission)
- Inside a triggered listener's `nb`, prefer `{$ref: "trigger.payload.X"}` over `{$ref: "blockId.output.X"}` when the field is in the event payload — both work but trigger payload refs are cleaner and document the listener's contract more clearly
- The `phase` field is for visual grouping — common values: "intake", "review", "execution", "onboarding", "completion", "governance", "setup"
- **When the user asks to create a POD**, use the POD Creation recipe in the Flow Recipes section. Do not run the generic Phase-1/2 question pattern and do not improvise the capability list — the recipe is the contract.
