---
name: ixo-portal-app
description: Build, harden, or review static web apps that run inside the IXO Portal domain iframe framework. Use when creating Portal-compatible HTML/CSS/JS apps, generating app manifests, wiring the secure postMessage bridge, validating UCAN or privileged-action behavior, or auditing an existing app for IXO Portal compatibility.
---

# IXO Portal App

Use this skill to create, harden, or review static apps embedded by the IXO Portal domain app route:

```txt
/domain/[entityDid]/app/[appId]
```

The app is hosted separately as static files and discovered through a domain linked-resource manifest. The Portal owns identity, domain context, wallet/relayer context, UCAN delegation, privileged actions, and iframe host controls.

## Load Order

Read only the files needed for the task:

- `references/portal-contract.md`: required for builds, hardening, manifest edits, bridge work, or security decisions.
- `references/review-checklist.md`: required for audits, compatibility reviews, and pre-publish checks.
- `templates/`: starter files for new vanilla static apps.

## Modes

Use build mode when the user asks to create, generate, scaffold, or implement a Portal-compatible app.

Use hardening mode when the user provides an existing app and asks to productionize, secure, deploy, or make it Portal-compatible.

Use review mode when the user asks to audit, validate, check, or assess compatibility.

## Build And Hardening Rules

Default choices:

- Build vanilla HTML, CSS, and JavaScript. Do not introduce Vite, React, or package dependencies unless the user explicitly asks.
- Include `manifest.json`, `index.html`, `styles.css`, and `portal-bridge.js`.
- Use protocol `ixo.portal.iframe.v1` and version `1.0` in every Portal message.
- Use localhost HTTP only for local development examples. Production manifest and iframe URLs must be HTTPS.
- Prefer a single static directory that can be hosted by any static file server.
- Keep app-specific logic outside `portal-bridge.js`; treat the bridge as the stable host contract wrapper.
- Do not invent manifest fields, message types, feature flags, or privileged actions outside `references/portal-contract.md`.

Implementation flow:

1. Identify the app purpose, app id, display name, target iframe URL, intended Portal features, and any UCAN capabilities. If details are missing and not critical, use clear placeholders.
2. Copy and adapt the template files when creating a new app. For existing apps, preserve the current architecture unless it conflicts with the Portal contract.
3. Preserve the Portal bridge security model: install the listener before `READY`, validate `INIT`, store `host.origin`, and use exact `targetOrigin` after initialization.
4. Implement the app UI inside the iframe sandbox assumptions from `references/portal-contract.md`: no top-level navigation requirement, no third-party cookie dependency, and no unsandboxed browser APIs.
4. Wire expected Portal integrations through `window.IxoPortalBridge`, not custom message shapes.
5. Gate privileged behavior through manifest `features` and Portal-mediated `EVENT` requests.
6. Add concise notes for replacing placeholders, hosting static files, and registering the manifest as a domain linked resource.

## Security Requirements

Treat these as mandatory:

- Validate `event.origin` for every incoming Portal message.
- Validate `protocol`, `version`, `type`, and payload shape before acting.
- Send the initial `READY` after installing the listener. The initial `READY` may use `*` because the app does not yet know the host origin.
- After `INIT`, use only the exact `host.origin` as `targetOrigin`.
- Require exact `iframe.allowedOrigins` when the iframe origin differs from the manifest origin.
- Never use wildcard origins in production configuration.
- Never store private keys or long-lived secrets in the iframe.
- Route signing, assistant prompts, action-block updates, auth refreshes, and transaction requests through Portal-mediated `EVENT` messages.

## Review Flow

When reviewing:

1. Inspect the manifest, iframe entrypoint, message bridge, hosting assumptions, and app layout.
2. Check each item in `references/review-checklist.md`.
3. Report blockers first, then warnings, then suggested fixes. Include file paths and specific lines when reviewing a local repo.
4. Treat these as blockers:
   - Missing origin validation for host messages.
   - Wildcard iframe origins.
   - Invalid or missing `protocol` / `version`.
   - Missing `READY` / `INIT` lifecycle handling.
   - Messages that do not match the Portal schemas.
   - Production HTTP manifest or iframe URLs.
   - App behavior that requires iframe sandbox permissions the Portal does not grant.

## Output Expectations

For build or hardening tasks, provide the changed files and summarize:

- App id and manifest URL placeholders.
- Enabled Portal features.
- Required linked resource shape.
- Local and production hosting notes.
- Validation performed or validation still needed.

For review tasks, provide:

- `Blockers`
- `Warnings`
- `Suggested fixes`
- `Compatibility verdict`

Keep the output concrete and tied to the Portal contract. Do not invent unsupported Portal event types or new manifest fields.
