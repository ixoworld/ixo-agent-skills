---
name: ixo-portal-app
description: Build, style, harden, or review static web apps that run inside the IXO Portal domain iframe framework. Use when creating Portal-compatible HTML/CSS/JS apps, designing their UI with the IXO Portal design tokens so embedded plugins match Portal styling in light and dark mode, generating app manifests, wiring the secure postMessage bridge, validating UCAN or privileged-action behavior, or auditing an existing app for IXO Portal compatibility.
---

# IXO Portal App

Use this skill to create, style, harden, or review static apps embedded by the IXO Portal domain app route:

```txt
/domain/[entityDid]/app/[appId]
```

The app is hosted separately as static files and discovered through a domain linked-resource manifest. The Portal owns identity, domain context, wallet/relayer context, UCAN delegation, privileged actions, theming, and iframe host controls.

An embedded app is a *plugin surface inside a product*, not a standalone site. It must be indistinguishable from Portal chrome — same tokens, same monochrome button system, same light/dark behavior — while staying inside the security contract.

## Load Order

Read only the files needed for the task:

- `references/portal-contract.md`: required for builds, hardening, manifest edits, bridge work, or security decisions.
- `references/design-system.md`: required for any UI work — building screens, styling, restyling an existing app, or reviewing visual consistency.
- `references/review-checklist.md`: required for audits, compatibility reviews, and pre-publish checks.
- `templates/`: starter files for new vanilla static apps.
- `AGENTS.md`: condensed package map, working rules, and design rules for harnesses that do not load skills. `references/design-system.md` remains the design source of truth.

## Modes

Use build mode when the user asks to create, generate, scaffold, or implement a Portal-compatible app.

Use hardening mode when the user provides an existing app and asks to productionize, secure, deploy, or make it Portal-compatible.

Use design mode when the user asks to style, restyle, theme, polish, or align an app with the Portal look. Design mode always reads `references/design-system.md` first.

Use review mode when the user asks to audit, validate, check, or assess compatibility.

Build and hardening modes include design mode. A Portal app is not finished when it works — it is finished when it works *and* looks like the Portal in both schemes.

## Template Files

A new app ships these files:

| File               | Role                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `manifest.json`    | App manifest registered as a domain linked resource                      |
| `index.html`       | Iframe entrypoint                                                        |
| `ixo-tokens.css`   | IXO design tokens, both schemes — load first, never edit the values       |
| `ixo-ui.css`       | Portal-matching component primitives built on the tokens                 |
| `styles.css`       | App-specific layout only, written entirely in `var(--ixo-*)` references   |
| `portal-theme.js`  | Applies host theme tokens to the document — load before the bridge        |
| `portal-bridge.js` | Stable host contract wrapper (`window.IxoPortalBridge`)                   |

Load order in `index.html` is fixed: `ixo-tokens.css` → `ixo-ui.css` → `styles.css`, then `portal-theme.js` → `portal-bridge.js`.

## Build And Hardening Rules

Default choices:

- Build vanilla HTML, CSS, and JavaScript. Do not introduce Vite, React, Tailwind, or package dependencies unless the user explicitly asks.
- Include `manifest.json`, `index.html`, `ixo-tokens.css`, `ixo-ui.css`, `styles.css`, `portal-theme.js`, and `portal-bridge.js`.
- Use protocol `ixo.portal.iframe.v1` and version `1.0` in every Portal message.
- Use localhost HTTP only for local development examples. Production manifest and iframe URLs must be HTTPS.
- Prefer a single static directory that can be hosted by any static file server.
- Keep app-specific logic outside `portal-bridge.js`; treat the bridge as the stable host contract wrapper.
- Do not invent manifest fields, message types, feature flags, or privileged actions outside `references/portal-contract.md`.
- Style UI per `references/design-system.md`: monochrome buttons, neutral theme-aware surfaces, accent only for focus/selected/active states, `--ixo-radius-md` controls, flat at rest apart from the single glass shadow, compact headings. Respect the host theme mode delivered in `INIT`.

Implementation flow:

1. Identify the app purpose, app id, display name, target iframe URL, intended Portal features, and any UCAN capabilities. If details are missing and not critical, use clear placeholders.
2. Copy and adapt the template files when creating a new app. For existing apps, preserve the current architecture unless it conflicts with the Portal contract.
3. Preserve the Portal bridge security model: install the listener before `READY`, validate `INIT`, store `host.origin`, and use exact `targetOrigin` after initialization.
4. Implement the app UI inside the iframe sandbox assumptions from `references/portal-contract.md`: no top-level navigation requirement, no third-party cookie dependency, and no unsandboxed browser APIs.
5. Build the UI against the design system in `references/design-system.md` using the `ixo-*` classes and `--ixo-*` tokens.
6. Wire expected Portal integrations through `window.IxoPortalBridge`, not custom message shapes.
7. Gate privileged behavior through manifest `features` and Portal-mediated `EVENT` requests.
8. Add concise notes for replacing placeholders, hosting static files, and registering the manifest as a domain linked resource.

## Design Requirements

Treat these as mandatory. Full detail and the token table are in `references/design-system.md`.

- Every colour, radius, spacing, and font size in app CSS is a `var(--ixo-*)` reference. Hardcoded hex, `rgb()`, or px sizing for themed properties is a blocker — it cannot follow the scheme or the ecosystem's whitelabel palette.
- Never read the Portal's `--mantine-color-*` variables. They do not exist in the iframe document.
- Buttons are monochrome: they use the foreground text colour, never the accent. Accent is reserved for focus rings, links, selection, and active indicators.
- Size text with the `--ixo-fs-*` variables so the Portal's `font-scale` accessibility preference applies.
- Ship the `prefers-reduced-motion` block from `ixo-tokens.css`. The Portal's global reduced-motion reset does not cross into the iframe.
- Keep `<body>` transparent so the Portal canvas shows through; paint surfaces explicitly.
- Do not add app chrome that duplicates Portal navigation, and keep fixed-position UI out of the top-right corner where the Portal renders its fullscreen control.
- Design for `domains-panel` first — it is the tightest frame and the common default. Verify `domains` and `fullscreen` too.
- Focus is never removed: `:focus-visible` keeps a 2px accent outline. Icon-only controls carry `aria-label`. Targets are ≥24px, ≥44px for primary phone actions.
- Do not introduce a second brand: no new font families, gradient headers, or decorative shadow stacks.

## Light And Dark Mode Requirements

The Portal defaults to dark, the user toggles at runtime, and the toggle reaches the iframe as a **re-sent `INIT`**.

- Apply theme on every `INIT`, never only the first. `portal-theme.js` does this; custom bridges must too.
- `host.theme.mode` is always resolved to `"light"` or `"dark"` — never `"auto"`. Drive CSS from `data-portal-theme` on `<html>`.
- `host.theme.tokens` are resolved CSS values from the live whitelabel palette. Apply them over the static baseline; validate keys and values before writing them into the CSSOM.
- Keep `@media (prefers-color-scheme: dark)` scoped to `:root:not([data-portal-theme])` so a standalone app follows the OS while an embedded app follows the host — the two must never fight.
- Values CSS cannot reach (canvas, charts, inline SVG, third-party widgets) must re-read tokens in an `onThemeChange` handler; they do not repaint on their own.
- Verify both schemes before calling the work done. Contrast failures are usually scheme-specific.

## Security Requirements

Treat these as mandatory:

- Validate `event.origin` for every incoming Portal message.
- Validate `protocol`, `version`, `type`, and payload shape before acting.
- Send the initial `READY` after installing the listener. The initial `READY` may use `*` because the app does not yet know the host origin.
- After `INIT`, use only the exact `host.origin` as `targetOrigin`.
- Require exact `iframe.allowedOrigins` when the iframe origin differs from the manifest origin.
- Never use wildcard origins in production configuration.
- Strip development origins such as `http://localhost:3000` from the bridge `ALLOWED_PORTAL_ORIGINS` allowlist when hardening or deploying for production; ship only exact production Portal origins.
- Never store private keys or long-lived secrets in the iframe.
- Route signing, assistant prompts, action-block updates, auth refreshes, and transaction requests through Portal-mediated `EVENT` messages.
- Treat `host.theme.tokens` as untrusted input: allowlist key names, bound value length, and reject values containing CSS control characters before assigning them.

## Review Flow

When reviewing:

1. Inspect the manifest, iframe entrypoint, message bridge, theming, hosting assumptions, and app layout.
2. Check each item in `references/review-checklist.md`.
3. Check UI against the `references/design-system.md` rules (`--ixo-*` tokens only, monochrome buttons, accent reserved for focus and active state, single glass shadow, compact headings). Report design violations as warnings, citing the rule that fails.
4. Report blockers first, then warnings, then suggested fixes. Include file paths and specific lines when reviewing a local repo.
5. Treat these as blockers:
   - Missing origin validation for host messages.
   - Wildcard iframe origins.
   - Invalid or missing `protocol` / `version`.
   - Missing `READY` / `INIT` lifecycle handling.
   - Messages that do not match the Portal schemas.
   - Production HTTP manifest or iframe URLs.
   - App behavior that requires iframe sandbox permissions the Portal does not grant.
   - Hardcoded theme colors instead of `--ixo-*` tokens.
   - Theme applied only on the first `INIT`, so the light/dark toggle does not reach the app.

## Validation

Run the package validator against a skill or app directory before publishing:

```bash
python scripts/validate_skill.py skills/ixo-portal-app
```

It checks required files, frontmatter, manifest and bridge template invariants, and that the design token and theming templates are present and wired.

## Output Expectations

For build, hardening, or design tasks, provide the changed files and summarize:

- App id and manifest URL placeholders.
- Enabled Portal features.
- Required linked resource shape.
- Design tokens used and any app-specific token additions.
- Light and dark verification performed.
- Local and production hosting notes.
- Validation performed or validation still needed.

For review tasks, provide:

- `Blockers`
- `Warnings`
- `Suggested fixes`
- `Compatibility verdict`

Keep the output concrete and tied to the Portal contract. Do not invent unsupported Portal event types or new manifest fields.
