# IXO Portal Static App Review Checklist

Use this checklist when auditing a static app for IXO Portal compatibility.

## Manifest

- `protocol` is exactly `ixo.portal.iframe.v1`.
- `appId` is non-empty and matches the linked resource fragment after normalization.
- `name` is non-empty.
- `iframe.src` is an absolute HTTPS URL, except localhost development.
- Cross-origin iframe URLs use exact `iframe.allowedOrigins`.
- No wildcard origins, pathful origins, credentials, query strings, or fragments in `iframe.allowedOrigins`.
- `view.defaultMode` is `domains`, `domains-panel`, or `fullscreen`.
- `view.fullscreenReturnMode`, if present, is `domains` or `domains-panel`.
- `capabilities`, if present, is an array of `{ can, with }` objects.
- Feature flags match the events the app sends.

## Linked Resource

- Domain linked resource id ends with an app fragment matching `manifest.appId`.
- Linked resource `serviceEndpoint` resolves to the manifest URL.
- Linked resource `mediaType` is `application/json` or otherwise clearly identifies JSON.

## Iframe Lifecycle

- App installs a `message` listener before sending `READY`.
- App sends `READY` with protocol `ixo.portal.iframe.v1` and version `1.0`.
- App handles duplicate or updated `INIT` messages.
- App stores `host.origin` from `INIT`.
- App uses exact `targetOrigin` after `INIT`.
- App handles `EVENT_ACK` statuses: `accepted`, `rejected`, and `failed`.

## Message Schema

- Every app-to-Portal message includes `protocol`, `version`, `type`, and `payload`.
- `RESIZE` payload uses a positive `height`.
- `NAVIGATE` payload uses safe app paths, same-origin Portal URLs, or valid view modes.
- `EVENT` payloads match the schema in `portal-contract.md`.
- Privileged events include `requestId` when the app needs a result.
- Transaction messages include both `typeUrl` and `value`.

## Sandbox And Hosting

- Production app is served over HTTPS.
- Production bridge `ALLOWED_PORTAL_ORIGINS` contains only exact production Portal origins; no localhost or other development entries remain.
- App works under `sandbox="allow-same-origin allow-scripts allow-forms allow-popups"`.
- App does not require top-level navigation.
- App does not rely on third-party cookies for core state.
- Popup behavior is tied to explicit user gestures.
- Clipboard usage is compatible with the iframe `allow` policy.

## Layout

- App works in `domains`, `domains-panel`, and `fullscreen` modes.
- App adapts to phone, tablet, laptop, and desktop iframe sizes.
- App sends `RESIZE` after meaningful content height changes when resize is enabled.
- Fixed-position UI does not conflict with the Portal fullscreen control in the top-right corner.
- Unsaved changes are reported with `dirtyState`.

## Blockers

Treat these as blockers:

- Missing origin validation.
- Wildcard iframe origins.
- Invalid protocol or version.
- Missing `READY` / `INIT` lifecycle handling.
- Messages that fail Portal schemas.
- Production HTTP manifest or iframe URLs.
- Required browser behavior blocked by the Portal iframe sandbox.
