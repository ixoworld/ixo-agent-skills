# IXO Portal Static App Contract

This is the compact contract for static apps embedded by the IXO Portal domain app iframe framework.

## Discovery

The Portal hosts apps at:

```txt
/domain/[entityDid]/app/[appId]
```

The selected domain entity must have a linked resource whose id fragment normalizes to the route `appId`. Examples that normalize to `audit`:

- `audit`
- `app:audit`
- `did:ixo:entity:abc#app:audit`

The linked resource points to the app manifest:

```json
{
  "id": "did:ixo:entity:abc#app:audit",
  "type": "App",
  "mediaType": "application/json",
  "serviceEndpoint": "https://audit.example/manifest.json"
}
```

## Manifest

Minimal manifest:

```json
{
  "protocol": "ixo.portal.iframe.v1",
  "appId": "audit",
  "name": "Audit",
  "iframe": {
    "src": "https://audit.example/index.html",
    "title": "Audit app"
  },
  "view": {
    "defaultMode": "domains-panel",
    "fullscreenReturnMode": "domains-panel"
  },
  "capabilities": [],
  "features": {
    "resize": true,
    "navigate": true,
    "transaction": false,
    "assistantPrompt": false,
    "actionBlock": false
  }
}
```

Rules:

- `protocol` must be `ixo.portal.iframe.v1`.
- `appId` must match the normalized route `appId`.
- `iframe.src` must be absolute HTTPS except localhost development.
- `iframe.allowedOrigins` is required only when `iframe.src` is on a different origin from the manifest.
- `iframe.allowedOrigins` entries must be exact origins. Wildcards, paths, queries, fragments, and credentials are invalid.
- `view.defaultMode` is `domains`, `domains-panel`, or `fullscreen`.
- `view.fullscreenReturnMode` is `domains` or `domains-panel`; default is `domains-panel`.
- `capabilities` defaults to `[]`.
- `features` defaults to `{}`.
- `ucan.audience` is optional. If omitted and `appId` is a DID, the Portal uses `appId` as the UCAN audience.

## Iframe Sandbox

The Portal renders apps with:

```tsx
<iframe referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" allow="clipboard-read; clipboard-write" />
```

Apps must not require top-level navigation permissions, unsandboxed browser APIs, or third-party cookies for core behavior.

## Lifecycle

1. Portal resolves the domain linked resource for `appId`.
2. Portal fetches and validates the manifest.
3. Portal loads `manifest.iframe.src`.
4. App installs a `message` listener and posts `READY`.
5. Portal sends `INIT`.
6. App sends optional `RESIZE`, `NAVIGATE`, and `EVENT` messages.
7. Portal replies to event requests with `EVENT_ACK`.

Every message includes:

```ts
{
  protocol: "ixo.portal.iframe.v1",
  version: "1.0",
  type: string,
  requestId?: string,
  payload: unknown
}
```

## Host Messages

`INIT` includes:

- `user.did`, `user.walletAddress`, optional workspace/group addresses.
- `host.origin`, relayer DID, locale, theme mode/tokens, and viewport.
- `domain.did`, `domain.appId`, `domain.resourceId`, optional name/type/image.
- `chain.network` and `chain.chainName`.
- Optional `ucan.token`, `ucan.expiresAt`, and delegated capabilities.

The Portal re-sends `INIT` whenever the payload changes — including when the user toggles light/dark, changes the font-size preference, or a UCAN is refreshed. Apps must treat `INIT` as idempotent and re-apply it, not latch the first one.

### Theme

```ts
host.theme: {
  mode: "light" | "dark";        // always resolved, never "auto"
  tokens: Record<string, string>; // resolved CSS values, e.g. "#0EB8DC"
}
```

Token values are literal CSS values, not `var(--mantine-color-*)` references: the iframe is a separate document on a separate origin and the Portal's custom properties do not exist inside it. Accent and status colours come from the active whitelabel palette, so they differ per ecosystem and must not be hardcoded by the app.

Token keys map to `--ixo-<key>` custom properties. See `references/design-system.md` for the full table and `templates/portal-theme.js` for the applier.

| Group      | Keys                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------- |
| Colour     | `color-scheme`, `color-body`, `color-surface`, `color-surface-raised`, `color-border`, `color-text`, `color-text-muted`, `color-accent`, `color-accent-hover`, `color-accent-muted`, `color-accent-contrast`, `color-success`, `color-danger`, `color-warning`, `color-glass`, `shadow-glass` |
| Typography | `font-family`, `font-scale`, `font-size-xs`, `font-size-sm`, `font-size-md`, `font-size-lg`, `font-size-xl` |
| Layout     | `spacing-xs`…`spacing-xl`, `radius-sm`…`radius-xl`, `control-height-sm`, `control-height-md`, `input-height-sm`, `input-height-md` |
| Legacy     | `accent`, `text`, `surface`, `muted` — retained aliases; prefer the `color-*` keys            |

`font-scale` is the user's Portal font-size preference (`0.875`–`1.25`) and must be applied as a multiplier on every text size.

Unknown keys may be added over time. Apply what you recognise and ignore the rest; validate keys and values before writing them into the CSSOM.

`ACTION` is reserved for host-driven app actions.

`NAVIGATE` asks the iframe app to update its own route or mode:

```ts
{ path?: string; url?: string; mode?: "domains" | "domains-panel" | "fullscreen" }
```

`EVENT_ACK` reports a privileged request result:

```ts
{
  eventType?: string;
  status: "accepted" | "rejected" | "failed";
  message?: string;
  result?: unknown;
}
```

## Iframe Messages

`READY` must be sent after the app installs its message listener:

```ts
{ type: "READY", payload: { capabilities?: string[] } }
```

`RESIZE` is available when `features.resize` is enabled:

```ts
{ type: "RESIZE", payload: { height: number, width?: number } }
```

The Portal clamps iframe height between 320 and 6000 pixels.

`NAVIGATE` is available when `features.navigate` is enabled:

```ts
{ type: "NAVIGATE", payload: { path?: string, url?: string, mode?: "domains" | "domains-panel" | "fullscreen" } }
```

Host route navigation is constrained to same-origin Portal URLs or safe absolute paths.

`EVENT` asks the Portal to perform privileged actions:

```ts
type PortalEvent =
  | { type: "msgSend"; text: string; roomId?: string; threadRootId?: string }
  | { type: "actionBlockStep"; blockId: string; stepId: string; status?: "started" | "completed" | "failed"; data?: unknown }
  | { type: "signxTransaction"; messages: Array<{ typeUrl: string; value: unknown }>; memo?: string }
  | { type: "assistantPrompt"; prompt: string }
  | { type: "dirtyState"; dirty: boolean }
  | { type: "analytics"; name: string; properties?: Record<string, unknown> }
  | { type: "error"; message: string; code?: string; details?: unknown }
  | { type: "authRefreshRequest"; reason?: string };
```

Feature-gated events:

| Event              | Required feature           |
| ------------------ | -------------------------- |
| `signxTransaction` | `features.transaction`     |
| `assistantPrompt`  | `features.assistantPrompt` |
| `actionBlockStep`  | `features.actionBlock`     |

`dirtyState`, `analytics`, `error`, and `authRefreshRequest` are handled without a feature flag. `msgSend` is schema-valid for forward compatibility, but the current domain app host route rejects it as unsupported.

## Security

- Validate `event.origin` on every incoming message.
- Validate `event.data.protocol`, `event.data.version`, and `event.data.type`.
- Use an exact `targetOrigin` after `INIT`.
- Keep allowed origins narrow.
- Do not store private keys or long-lived secrets in the iframe.
- Use `signxTransaction` for Portal-mediated transactions; do not ask the iframe to sign directly.
