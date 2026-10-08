# Portal create: fill-in template

Use this file for every `create` on the Portal conversation path. It is the only reference you need besides the selected Kind's sub-skill. Do not open `schemas/`, `scripts/`, `tests/`, `examples/`, the validator, or the shape pins: everything they would tell you is already here, and the Portal validates the handoff itself and returns the exact failing path.

Steps:

1. Pick the Kind (parent skill, step 4) and read its sub-skill.
2. Copy the skeleton below. Replace every `<<…>>` placeholder. Remove nothing else.
3. Take `baseRecipe`, `shapeSources`, and `shapeDigest` for that Kind from the pins block and paste them verbatim into the three places marked `<<PINS.*>>`.
4. Add the Kind-specific block from the table at the end. Do not add blocks that belong to other Kinds.
5. Call `stage_topic_composition` once with `composition` set to the filled skeleton serialised as **one JSON string** (the text of the object, quotes escaped), not as a nested object: the runtime mangles nested objects inside arrays when they are passed structurally. Then stop.

Generate UUIDv7 values yourself: `xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx`, hex, `y` ∈ `8 9 a b`. Use a fresh one per placeholder.

## Skeleton

```json
{
  "version": "3.3.3",
  "compositionId": "urn:uuid:<<UUIDV7>>",
  "mode": "preview",
  "disposition": "create",
  "sourceIntent": {
    "verbatim": "<<VERBATIM_INTENT>>",
    "sourceSurface": "matrix-message",
    "language": "en"
  },
  "protocolBinding": {
    "package": "@ixo/topic-protocol",
    "topicProtocolVersion": "1.0.0-rc.7",
    "rootVersion": 4,
    "contractBodyVersion": 4,
    "stateVersion": 4,
    "contractProfile": "qi.topic-contract-state/v4",
    "profileStatus": "normative",
    "sourceCommit": "808c9aa4918db9ed8e6e244d5143af1c12a6dd95",
    "packageShasum": "c1c929923dee7005c3369108a73af37d696cded8",
    "authoritativeHistory": "topic-root+operations+records+projection",
    "stateEventRole": "materialized-head-only",
    "legacyPolicy": "v4-only-no-migration"
  },
  "routing": {
    "rationale": "<<WHY_THIS_DESERVES_A_TOPIC>>",
    "audience": "current-room",
    "indexCompleteness": "complete",
    "duplicateDetection": "not-run",
    "kindInference": {
      "status": "selected",
      "selectedKind": "<<KIND>>",
      "confidence": "high",
      "rationale": "<<WHY_THIS_KIND>>"
    },
    "roomResolution": {
      "target": "current-room",
      "status": "unresolved",
      "evidence": []
    }
  },
  "interpretation": {
    "job": "<<JOB>>",
    "subject": "<<SUBJECT>>",
    "outcome": "<<OUTCOME_SENTENCE>>",
    "value": "<<WHY_IT_MATTERS>>",
    "stakes": "medium"
  },
  "topic": {
    "operation": "create",
    "rootDraft": {
      "version": 4,
      "title": "<<TITLE>>",
      "kind": "<<KIND>>",
      "status": "draft",
      "baseRecipe": "<<PINS.baseRecipe>>",
      "shapeDigest": "<<PINS.shapeDigest>>",
      "context": [],
      "overview": {
        "summary": "<<ONE_SENTENCE_SUMMARY>>",
        "nextStep": { "summary": "<<NEXT_STEP>>" }
      }
    },
    "anchor": { "mode": "native", "manifestSource": "root-event" }
  },
  "recipeSelection": {
    "strategy": "base-recipe",
    "baseRecipe": "<<PINS.baseRecipe>>",
    "registryLookup": "not-performed",
    "registryReason": "pinned-catalog-only",
    "reviewState": "draft",
    "shapeSources": "<<PINS.shapeSources>>",
    "shapeDigest": "<<PINS.shapeDigest>>"
  },
  "contractDraft": {
    "envelope": { "version": 4, "revision": null, "authoredBy": null, "authoredAt": null },
    "semantic": {
      "kindRef": { "source": "standard", "kind": "<<KIND>>" },
      "workingMode": "team",
      "baseRecipe": "<<PINS.baseRecipe>>",
      "shapeSources": "<<PINS.shapeSources>>",
      "shapeDigest": "<<PINS.shapeDigest>>",
      "intent": {
        "id": "<<UUIDV7>>",
        "text": "<<VERBATIM_INTENT>>",
        "provenance": { "basis": "explicit", "acceptance": "accepted", "sourceEventIds": [] }
      },
      "outcome": {
        "statement": {
          "id": "<<UUIDV7>>",
          "text": "<<OUTCOME_SENTENCE>>",
          "provenance": { "basis": "suggested", "acceptance": "proposed", "sourceEventIds": [] }
        },
        "status": "proposed"
      },
      "completion": { "definition": "<<WHAT_MUST_BE_TRUE_TO_COMPLETE>>" },
      "scope": {
        "included": [
          { "id": "<<UUIDV7>>", "text": "<<IN_SCOPE_ITEM>>", "provenance": { "basis": "suggested", "acceptance": "proposed", "sourceEventIds": [] } }
        ],
        "excluded": []
      },
      "constraints": [
        { "id": "<<UUIDV7>>", "text": "<<CONSTRAINT>>", "provenance": { "basis": "suggested", "acceptance": "proposed", "sourceEventIds": [] } }
      ],
      "assumptions": [
        { "statement": { "id": "<<UUIDV7>>", "text": "<<ASSUMPTION>>", "provenance": { "basis": "suggested", "acceptance": "proposed", "sourceEventIds": [] } } }
      ],
      "questions": [],
      "activationPolicy": {}
    },
    "publication": {
      "disclosure": "inline",
      "dataClassification": "internal",
      "e2eeRequired": false,
      "maxInlineBytes": 49152,
      "reason": "<<WHY_INLINE_IS_FINE>>",
      "embedsCanvasContent": false,
      "containsProviderSessionIds": false
    },
    "readiness": "requires-host-fields",
    "unresolvedHostFields": ["revision", "topicId", "rootEventId"],
    "setupObligations": [
      {
        "code": "setup.editors",
        "path": "/activationPolicy/editors",
        "prompt": "Choose who can update this setup.",
        "purpose": "This makes responsibility for preparing and changing the setup explicit.",
        "responsibility": "unassigned",
        "priority": 600,
        "unlocks": "The chosen editors can prepare a complete setup for review."
      },
      {
        "code": "setup.confirmation-policy",
        "path": "/activationPolicy/confirmation",
        "prompt": "Select who must confirm this setup.",
        "purpose": "Confirmation authorizes the Topic to progress without implying mutual or legal agreement.",
        "responsibility": "unassigned",
        "priority": 610,
        "unlocks": "The named confirmer or confirmers can review this exact setup revision."
      }
    ]
  },
  "canvas": {
    "format": "blocknote",
    "collaboration": "yjs",
    "contentEmbedded": false,
    "blocks": [
      { "id": "outcome", "type": "callout", "semanticRole": "outcome", "basis": "suggested", "visibility": "primary", "content": "<<OUTCOME_SENTENCE>>", "editable": true },
      { "id": "work", "type": "checklist", "semanticRole": "<<milestones|work-breakdown|questions>>", "basis": "suggested", "visibility": "primary", "content": ["<<ITEM>>", "<<ITEM>>"], "editable": true },
      { "id": "next", "type": "checklist", "semanticRole": "next-action", "basis": "suggested", "visibility": "primary", "content": ["<<NEXT_STEP>>"], "editable": true }
    ],
    "focusBlockId": "work",
    "nextActionBlockId": "next"
  },
  "collaborationSuggestions": { "humanRoles": [], "agentRoles": [] },
  "firstTurn": {
    "message": "<<ONE_QUESTION_OR_NEXT_STEP_FOR_THE_ROOM>>",
    "quickActions": [
      { "id": "review", "label": "Review Draft", "action": "Review the proposed setup." },
      { "id": "edit", "label": "Edit details", "action": "Adjust the outcome or scope." }
    ],
    "defaultActionId": "review"
  },
  "records": [
    {
      "localId": "intent",
      "kind": "memory",
      "recordClass": "ixo.topic.intent",
      "basis": "explicit",
      "accepted": true,
      "sourceEventIds": [],
      "content": { "type": "user-intent", "verbatim": "<<VERBATIM_INTENT>>" }
    }
  ],
  "execution": {
    "commitEligible": false,
    "hostContext": {},
    "requiredHostFields": ["topicId", "rootEventId", "revision"],
    "idempotencyKey": "urn:uuid:<<SAME_UUIDV7_AS_compositionId>>:commit",
    "proposedCalls": [],
    "externalActions": [],
    "stateEventPlan": {
      "enabled": true,
      "eventType": "ixo.topic.contract",
      "stateKeySource": "topicId",
      "profile": "qi.topic-contract-state/v4",
      "version": 4,
      "role": "materialized-head-only",
      "publishAfter": "root-and-projection",
      "disclosure": "inline",
      "embedsCanvasContent": false,
      "shapeRecordPersisted": false
    }
  },
  "quality": {
    "confidence": 0.9,
    "unresolvedPaths": [
      "/contractDraft/envelope/revision",
      "/contractDraft/semantic/activationPolicy/editors",
      "/contractDraft/semantic/activationPolicy/confirmation"
    ],
    "warnings": [],
    "blockers": []
  }
}
```

Rules the skeleton already encodes; keep them:

- `hostContext` stays `{}`. Never invent `actorId`, `matrixWrite`, or `verifiedAbilities`; the Portal knows who is signed in.
- `activationPolicy` stays `{}` unless the person named editors, confirmers, dates, or a dispute resolver. Its only keys are `editors`, `confirmation`, `lifecycle`, `dispute`. `onExpiry` lives inside `lifecycle` and is written only together with a date.
- `firstTurn.message` is the first message into the shared room: one question that advances the work, or the proposed next step. Never "I created a Draft…".
- Every `id` is a fresh UUIDv7. The two `<<VERBATIM_INTENT>>` copies must equal `sourceIntent.verbatim` byte for byte.
- `scope.included`, `scope.excluded` and `constraints` hold statement objects (`id`, `text`, `provenance`), and `assumptions` and `questions` wrap one in `statement`, exactly as in the skeleton. Never write a plain string in these lists. Repeat an item for each thing the person said, and drop the example item when they said nothing for that list.
- `sourceEventId` is omitted unless the Portal supplied one in the request.

## Pins by Kind

```json
{
  "baseRecipeSources": {
    "project": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/project", "version": "1.0.0-rc.7", "digest": "sha256:7e56c421fc5c7dd996d572fac46bc4fa115824ef5329b82ca5e1f7469b805103" },
    "flow": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/flow", "version": "1.0.0-rc.7", "digest": "sha256:7e56c421fc5c7dd996d572fac46bc4fa115824ef5329b82ca5e1f7469b805103" },
    "proposal": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/proposal", "version": "1.0.0-rc.7", "digest": "sha256:b6192207953e71079bf98a30fc8c05cfc225bb18242c0bc8f62e3970cb312380" },
    "evaluation": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/evaluation", "version": "1.0.0-rc.7", "digest": "sha256:9dd2cd6eb4c02eeadd8747a53e7984229b6671364320a0b1674b92dbd30718ae" },
    "claims": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/claims", "version": "1.0.0-rc.7", "digest": "sha256:647dc64cfdbea39692b6b116a1b4a25d7029e91b46b4180ef91ab9d77380e52f" },
    "research": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/research", "version": "1.0.0-rc.7", "digest": "sha256:1735d134b0c18200cca685967bd46463bcb5f4ebcb9de12ed850e2974d76fca2" },
    "discussion": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/discussion", "version": "1.0.0-rc.7", "digest": "sha256:7e56c421fc5c7dd996d572fac46bc4fa115824ef5329b82ca5e1f7469b805103" },
    "incident": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/incident", "version": "1.0.0-rc.7", "digest": "sha256:f3225f8aa0d20b738c2f31e939c969e286db75a38d63e7c7083a73c688df944c" }
  },
  "kinds": {
    "project": { "baseRecipe": "project", "kindDigest": "sha256:fa57f96656fde7940036d0eab30315ffaacc1e6102cdd79258b69bfb4cc1ad43", "shapeDigest": "sha256:7cae888dcde3a551aa320632201deb6e2463fb92c44bd2ef5d0718a34635cad4" },
    "task": { "baseRecipe": "project", "kindDigest": "sha256:f0808bee6bbb9929405462992dd623ed27bce0650768c0779fdf088f9d453189", "shapeDigest": "sha256:c3acb31f39f93b3c08504aedb9e9e19fda440b8bd3fcd21cc71f61d2af74bd31" },
    "agent_task": { "baseRecipe": "flow", "kindDigest": "sha256:eed3ea8992998843e13b2f73bcb6d4371603468be2c91815f0b74536be169c87", "shapeDigest": "sha256:3df9f3f474ac907da30bae73c207057c2def551b8e8f314e1632872f6bc3dbc9" },
    "proposal": { "baseRecipe": "proposal", "kindDigest": "sha256:87983a69e81143e988023fed0b2d97cc8222b54c84341dad1881b2e738fef4fe", "shapeDigest": "sha256:5b6689f62437d5a6cb43389f27cdf54128b0bfc75e7dc1c88556c9e9cf11e922" },
    "evaluation": { "baseRecipe": "evaluation", "kindDigest": "sha256:c156d27e93e170fe860096014c7ce39bf16a22825d14a5a31da31d0c45c8ece4", "shapeDigest": "sha256:29813102441073dc8e4b32450c2338d704498a38d12bb7cf83412c80b74241da" },
    "claims": { "baseRecipe": "claims", "kindDigest": "sha256:1fc2ec2616aeab4fb9d533a4ab9f8075dc25b5df729b30e3689876343aaad6c8", "shapeDigest": "sha256:35770406f687aeab195b81c6df2f583c592e96da8e460a6e8ffb03033c02beee" },
    "question": { "baseRecipe": "research", "kindDigest": "sha256:30ca5de2546a472e7462ef66bb8dd9fd7e7bba05d645798d16fb4331a4478c5d", "shapeDigest": "sha256:30622d1a3c2870e489c5c974e90dffc317c326bd680a8df291faff9b47ec153c" },
    "discussion": { "baseRecipe": "discussion", "kindDigest": "sha256:d0cf903a9c0a44ca78836d88986270b8714ef43f315e8718fcfd1c968a6cd463", "shapeDigest": "sha256:32621efdfbc106b6f51d23b60ea6d442cd2ebd204b2d7fd118c353da9d22540e" },
    "incident": { "baseRecipe": "incident", "kindDigest": "sha256:d9fb3371b016c51135d4b6848608e059604810c590c4cfcb4435b8ac01ef00ca", "shapeDigest": "sha256:8ad3face44d93c2e107c3ff07d4b0f245fea5460baf6b53f43a3e2659459a715" }
  }
}
```

`shapeSources` for a Kind is exactly two entries, in this order:

1. `baseRecipeSources[kinds[KIND].baseRecipe]`
2. `{ "kind": "kind", "id": "https://topic-protocol.ixo.world/kinds/<<KIND>>", "version": "1.0.0-rc.7", "digest": kinds[KIND].kindDigest }`

`shapeDigest` is `kinds[KIND].shapeDigest`. These are the resolver's own values; the Portal recomputes them and rejects anything else.

## Kind-specific additions to `contractDraft.semantic`

| Kind | Add | Also add to `setupObligations` |
| --- | --- | --- |
| `project` | `"project": { "version": 1 }` (+ `milestones`/`childObligations` only when the person listed them, each with its own UUIDv7 `id`) | `setup.project-lead` at `/project/lead` and `setup.project-closer` at `/project/closer`, same shape as the two obligations above |
| `task`, `agent_task` | optional `outcome.target` `{ "precision": "date", "value": "YYYY-MM-DD", "timezone": "<<IANA>>" }` only when a date was supplied | — |
| `proposal` | `"decision": { "governanceProposal": "<<what is being put forward>>" }` | — |
| `evaluation` | `"decision": { "question": "<<…>>", "criteria": ["<<string>>"], "method": "<<…>>" }` | — |
| `question` | `"questions": [{ "statement": { "id": "<<UUIDV7>>", "text": "<<…>>", "provenance": { "basis": "explicit", "acceptance": "accepted", "sourceEventIds": [] } }, "status": "open" }]` | — |
| `claims` | `"claimBinding": { "entityDid": "<<did:ixo:…>>", "collectionId": "<<…>>" }` only when both were supplied | — |
| `incident` | `"risks": [{ "id": "<<UUIDV7>>", "description": "<<…>>", "impact": "high", "status": "open" }]` | — |
| `discussion` | nothing | — |

Never add `project` outside Project, `risks` outside Incident, `decision` outside Proposal/Evaluation, `claimBinding` outside Claims, or `outcome.target` outside Task/Agent Task. Never add `participants`, `roles`, `plan`, `attachments`, `timezone`, `locale`, `temporalMode`, `kindProfile`, `kindResource`, `successCriteria`, `requiresOutcomeRecord`, `reviewAt`.
