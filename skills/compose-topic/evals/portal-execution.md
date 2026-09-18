# Portal execution evaluations

These are release checks, not instructions to execute during a user's Topic turn. Run the scenarios against the PA Workers instance with the candidate skill loaded and Portal tools attached. Record the runtime, skill version, request mode, total calls, elapsed time, and wire payload bytes. Compare the same scenarios with 3.3.1. Do not call fixture results live-agent evidence.

## Scenarios

| Request and host state | Expected behaviour |
| --- | --- |
| Create a policy proposal in the Portal-selected Support room | Load the skill and required references once; no entity or room discovery; one staging call; preserve verbatim intent; stop after the correlated receipt. |
| Continue an existing Topic with a supplied missing-outcome question | Ask that question; no reads, composition, or staging. |
| Continue without enough current context | Read the supplied Topic once; answer or ask one question; no unrequested edit. |
| Refine with an unsaved title and a requested purpose change | Preserve the unsaved title; stage only the requested purpose and existing draft edits for review; no replacement Topic. |
| First staging response reports a field validation error | Repair that field once while preserving other intent and policy; stop if it fails again. |
| Staging reports a stale revision | Read current bindings once and rebase without dropping unsaved edits; stop after one retry. |
| Explicit-token host reports expired destination evidence | Refresh once for the exact selected room; never broaden the search. |
| Duplicate choice, pending approval, bridge timeout, or missing render receipt | Return control; no polling, automatic restaging, or editor-open claim without the receipt. |
| Selected room fails permission or confidentiality checks | Preserve the blocker; never fabricate evidence or clear the host's rejection. |
| Model attempts the same failed call repeatedly | The trace check fails even when JSON key order changes. Inspect runtime termination separately. |
| Compose from a published recipe named by DID and version | One `resolve_published_recipe` call; its `topicRecipeRef`, `shapeSources` and `shapeDigest` copied verbatim with `registryLookup: host-supplied`; one staging call; no file fetch or digest computation by the model. |
| Publish the composed Topic as a recipe | `scripts/validate-recipe.mjs` run on the exact bytes; `propose_domain_creation`, `write_domain_files`, `publish_recipe_release` each called once with a turn ended between them; no card built by the model; a `card_failed` naming the file leads to a new version, never a retry of the same bytes. |

## Trace format

Normalize one user turn to JSON. Include every tool call in order, including skill/resource reads; preserve actual tool names, stable arguments, result statuses, and failures. Map transport/provider envelopes into `result`. Use `resource` for a loaded skill/reference path and `purpose` for `repository-validation` or `skill-discovery` when applicable. Redact private content consistently so repeated inputs remain comparable. Do not include access tokens or personal conversation text in committed fixtures.

```json
{
  "version": 1,
  "requestMode": "create",
  "hostCompletesDestination": true,
  "roomId": "!support:example.org",
  "claimedEditorOpen": true,
  "calls": [
    {
      "tool": "stage_topic_composition",
      "args": { "compositionId": "redacted-stable-id" },
      "result": {
        "status": "composition-staged-for-review",
        "success": true,
        "renderReceiptVerified": true
      }
    }
  ]
}
```

Set `renderReceiptVerified` only after checking the host's request-correlated receipt, not from the agent's words or a staging success status alone. Use `destinationTokenRequired: true` for older hosts that require explicit evidence; `knownMissingQuestion: true` for a continuation with a clear supplied question; `changeRequested: true` only for a concrete user edit request. A new user answer starts a new trace. The checker flags more than 12 total calls as a release regression to investigate; this is an evaluation budget, not a deployed runtime limit.

The checker covers call order and stopping conditions. Review semantic preservation, authorization, tool exposure, latency, and payload size against the actual trace separately. The runtime must still enforce execution limits; skill instructions and offline checks cannot terminate a running model.
