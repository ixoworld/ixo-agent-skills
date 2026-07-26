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
- Long DIDs, hashes, and addresses truncate instead of widening the frame.
- Grids collapse to a single column in the narrow `domains-panel` frame.
- Unsaved changes are reported with `dirtyState`.

## Design Tokens

- `ixo-tokens.css` is loaded before every other stylesheet, and its values are unedited.
- App CSS uses `var(--ixo-*)` for every colour, radius, spacing, and font size.
- No hardcoded hex, `rgb()`, or named colours in app CSS.
- No references to `--mantine-color-*` — those variables do not exist in the iframe document.
- Accent is used only for focus, links, selection, and active indicators — never as a button fill or a large background.
- Buttons follow the monochrome system: primary fills with the text colour, secondary is a 5% tint, ghost is transparent.
- Text is sized with the `--ixo-fs-*` variables so `font-scale` applies.
- No second brand: no extra font families, gradient headers, or decorative shadow stacks.
- `<body>` stays transparent so the Portal canvas shows through.

## Theming

- `portal-theme.js` (or equivalent) loads before the bridge and applies `host.theme` on every `INIT`, not just the first.
- `data-portal-theme` is set on `<html>` to the resolved `light` or `dark` value.
- Host tokens are validated before assignment: allowlisted key names, bounded value length, no CSS control characters.
- `@media (prefers-color-scheme: dark)` is scoped to `:root:not([data-portal-theme])` so it cannot fight a host-supplied theme.
- `<meta name="color-scheme" content="light dark">` is present and `color-scheme` tracks the active mode.
- Canvas, chart, and inline-SVG colours are re-read on theme change rather than captured once.
- App renders correctly in both light and dark, and while standalone with no host connection.

## Accessibility

- A `prefers-reduced-motion: reduce` block is shipped in the app's own CSS.
- `:focus-visible` styling is present and focus outlines are never removed.
- Icon-only controls have `aria-label`.
- Interactive targets are at least 24px, and at least 44px for primary phone actions.
- Text contrast is at least 4.5:1 (3:1 for large text and UI borders) in **both** schemes.
- `document.documentElement.lang` is set from `host.locale`.

## Blockers

Treat these as blockers:

- Missing origin validation.
- Wildcard iframe origins.
- Invalid protocol or version.
- Missing `READY` / `INIT` lifecycle handling.
- Messages that fail Portal schemas.
- Production HTTP manifest or iframe URLs.
- Required browser behavior blocked by the Portal iframe sandbox.
- Unvalidated host theme tokens written straight into the CSSOM.
- Hardcoded theme colours instead of `--ixo-*` tokens.
- Theme applied only on the first `INIT`, so the Portal light/dark toggle never reaches the app.
