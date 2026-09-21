# Portal create: fill-in template

Use this file for every `create` on the Portal conversation path. It is the only reference you need besides the selected Kind's sub-skill. Do not open `schemas/`, `scripts/`, `tests/`, `examples/`, the validator, or the shape pins: everything they would tell you is already here, and the Portal validates the handoff itself and returns the exact failing path.

Steps:

1. Pick the Kind (parent skill, step 4) and read its sub-skill.
2. Copy the skeleton below. Replace every `<<…>>` placeholder. Remove nothing else.
3. Take `baseRecipe`, `shapeSources`, and `shapeDigest` for that Kind from the pins block and paste them verbatim into the three places marked `<<PINS.*>>`.
4. Add the Kind-specific block from the table at the end. Do not add blocks that belong to other Kinds.
5. Call `stage_topic_composition` with `{ composition }` and stop.

Generate UUIDv7 values yourself: `xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx`, hex, `y` ∈ `8 9 a b`. Use a fresh one per placeholder.

## Skeleton

```json
{
  "version": "3.3.2",
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
    "topicProtocolVersion": "1.0.0-rc.4",
    "rootVersion": 4,
    "contractBodyVersion": 4,
    "stateVersion": 4,
    "contractProfile": "qi.topic-contract-state/v4",
    "profileStatus": "normative",
    "sourceCommit": "c17d7e8c1016f208dfef5bb6273c4bdc9e4aa59d",
    "packageShasum": "b2d9b88b01c4fc3a16586845c96c369de0a96b9a",
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
      "scope": { "included": [], "excluded": [] },
      "constraints": [],
      "assumptions": [],
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
- `sourceEventId` is omitted unless the Portal supplied one in the request.

## Pins by Kind

```json
{
  "baseRecipeSources": {
    "project": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/project", "version": "1.0.0-rc.4", "digest": "sha256:51445331881881bf22cae04b1f7f6a9090149ae616710bef2492c5f3ea2fab58" },
    "flow": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/flow", "version": "1.0.0-rc.4", "digest": "sha256:51445331881881bf22cae04b1f7f6a9090149ae616710bef2492c5f3ea2fab58" },
    "proposal": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/proposal", "version": "1.0.0-rc.4", "digest": "sha256:bcefd9d41b784a86d705630d44c1e03a7f3a8881b1c9f3d3685c52fd80762179" },
    "evaluation": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/evaluation", "version": "1.0.0-rc.4", "digest": "sha256:b9d28c66ffeca042fd2106570fced2df2f4439a65af901b61324011ee8935e7e" },
    "claims": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/claims", "version": "1.0.0-rc.4", "digest": "sha256:79fc99b1a85fea39e0a17e62b173aba49c986047218eeafaa681001d9adb389e" },
    "research": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/research", "version": "1.0.0-rc.4", "digest": "sha256:eb13629d2118b223ab03ddcc52fc6fd94e70c646552de0a2cce01f2615e06075" },
    "discussion": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/discussion", "version": "1.0.0-rc.4", "digest": "sha256:51445331881881bf22cae04b1f7f6a9090149ae616710bef2492c5f3ea2fab58" },
    "incident": { "kind": "base-recipe", "id": "https://topic-protocol.ixo.world/base-recipes/incident", "version": "1.0.0-rc.4", "digest": "sha256:ffb184a1dd63698dd873456ce237c630eafe819a4ac366b36c1be2c0f399c634" }
  },
  "kinds": {
    "project": { "baseRecipe": "project", "kindDigest": "sha256:9cba98879eb3db20d6caf4ee731b6db0d4ff25ca5cf8028c3a9d1ef538990389", "shapeDigest": "sha256:8feed96f0460800047301f4df0a43529dc70fcd4fb399dc55438366c92b8c5f1" },
    "task": { "baseRecipe": "project", "kindDigest": "sha256:70fd94bfd73b2cccd65e841fda1dd90d6692ab1a53028d825ab4aabe30f31b25", "shapeDigest": "sha256:d3291c4dee659b80605ad2cbd75c706521429a0e206e7ee156fa08daf565826b" },
    "agent_task": { "baseRecipe": "flow", "kindDigest": "sha256:fc14c140eb2849d1c5e424fa4449f5c39264a288cefc309ccdff8615c99724d2", "shapeDigest": "sha256:a8ff0560848f307a4b35fd5a639e526772c2ab3ce54cb92d20c6d46ddf8bccc5" },
    "proposal": { "baseRecipe": "proposal", "kindDigest": "sha256:95a31fa7c9f6eb552497cdada32cff4a2dc4bb3ce741ca9ebe366596b787d1c8", "shapeDigest": "sha256:5da97ba0af374d41d680fb9ed67cc7b79caf015c0a9cfe14daa38a4ec1498d5c" },
    "evaluation": { "baseRecipe": "evaluation", "kindDigest": "sha256:4663d2456abe432a946c17e7b8b15c5450853769d9d1ee8c4b7f9a761e3a7fc4", "shapeDigest": "sha256:80ce4e6216d20710f713ab4057cf2b6ad62b93fb67fc59690e2d993c9948c338" },
    "claims": { "baseRecipe": "claims", "kindDigest": "sha256:604309d70c2d762551dc9c11572bf095c8879f255dcff0d78adb4f1b13815f47", "shapeDigest": "sha256:06fd9511ecbbb1cd6e321c03ef376b3cfe7154d3be4a25db5d9441de5e941cfe" },
    "question": { "baseRecipe": "research", "kindDigest": "sha256:6362d3331476dccca6f025e2f07b218a49170c9e280d90c628b63ccd371db10b", "shapeDigest": "sha256:12dce5300689c2966e9de6ea5f71dbffe48c061405fecd5bc01e9d0a86a42804" },
    "discussion": { "baseRecipe": "discussion", "kindDigest": "sha256:2f10a5bbc76b887e72c67d9d034d2f4fd7ee68ccb8d5816714c9dea956a313a3", "shapeDigest": "sha256:8f7c1de3f329e8de42a4eb9fcbe748aec7a0938a7d9752ddb6f82d0f97808b88" },
    "incident": { "baseRecipe": "incident", "kindDigest": "sha256:a14882b721f319d93ff8616dfbdb29573088da2389852dd1adc04f44a3c5bf5d", "shapeDigest": "sha256:a3a8a19ca6434978c8318dfeb38ecc6fa61055005045523877c88d2dfe7d4796" }
  }
}
```

`shapeSources` for a Kind is exactly two entries, in this order:

1. `baseRecipeSources[kinds[KIND].baseRecipe]`
2. `{ "kind": "kind", "id": "https://topic-protocol.ixo.world/kinds/<<KIND>>", "version": "1.0.0-rc.4", "digest": kinds[KIND].kindDigest }`

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
