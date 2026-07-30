# AGENTS.md — IXO Portal App Skill

Instructions for any coding agent working in this package or using it to build, style, harden, or review static apps embedded by the IXO Portal domain iframe framework (`/domain/[entityDid]/app/[appId]`).

## Package map

| File | Purpose |
| --- | --- |
| `SKILL.md` | Workflow, modes (build / hardening / design / review), and output expectations. Read first. |
| `references/design-system.md` | Design source of truth: the `--ixo-*` token table, component specs, light/dark rules, layout modes. Read before producing or changing any UI. |
| `references/portal-contract.md` | The Portal iframe contract: discovery, manifest, lifecycle, message schemas, security. The only source of valid message types and manifest fields. |
| `references/review-checklist.md` | Audit checklist for compatibility reviews and pre-publish checks. |
| `templates/` | Starter files for new vanilla static apps (`manifest.json`, `index.html`, `ixo-tokens.css`, `ixo-ui.css`, `styles.css`, `portal-theme.js`, `portal-bridge.js`). |
| `scripts/validate_skill.py` | Package self-check. Run `python3 scripts/validate_skill.py .` after editing any skill file. |
| `agents/openai.yaml` | OpenAI-specific interface metadata. |

## Working rules

- The Portal contract in `references/portal-contract.md` is authoritative. Never invent message types, manifest fields, feature flags, or privileged actions that it does not define.
- Build vanilla HTML, CSS, and JavaScript. No frameworks, bundlers, or package dependencies unless the user explicitly asks.
- Keep app logic out of `templates/portal-bridge.js` and `templates/portal-theme.js`; they are the stable host-contract wrappers.
- Template load order is fixed: `ixo-tokens.css` → `ixo-ui.css` → `styles.css`, then `portal-theme.js` → `portal-bridge.js`.
- Security is non-negotiable: validate `event.origin` on every message, validate `protocol`/`version`/`type`, use exact `targetOrigin` after `INIT`, never use wildcard origins in production, never store private keys or long-lived secrets in the iframe.
- Treat `host.theme.tokens` as untrusted input: allowlist key names, bound value length, and reject CSS control characters before writing them into the CSSOM.
- Before production deployment, strip development origins such as `http://localhost:3000` from the bridge `ALLOWED_PORTAL_ORIGINS` allowlist; ship only exact production Portal origins.
- After editing files in this package, run `python3 scripts/validate_skill.py .` and fix every error before finishing.

## Design instructions

These rules are distilled from `references/design-system.md`. Apply them to every UI you build, style, harden, or review for the Portal. Full token values and component specs live in that reference; when anything here conflicts with it, the reference wins.

**Creative north star:** the Portal is quiet, dense, and instrument-like — a monochrome surface with a single accent doing all the signalling. An embedded app is a plugin surface inside a product, not a standalone site. Craft shows up as restraint and precision, not decoration.

### Tokens

Two layers, in order: `templates/ixo-tokens.css` declares every `--ixo-*` property for both schemes, then the Portal's `INIT` payload overrides them through `templates/portal-theme.js` with the live whitelabel palette and the user's font-scale.

- **Token-only rule.** Every colour, radius, spacing, and font size in app CSS is a `var(--ixo-*)` reference. Raw hex, `rgb()`, or hardcoded px for themed properties is a review blocker — it cannot follow the scheme or the ecosystem palette. Only `ixo-tokens.css` declares raw values.
- Never read the Portal's `--mantine-color-*` variables. The iframe is a separate document on a separate origin; they do not exist in it.
- Accent and status colours are whitelabel and arrive at runtime. Never hardcode the default turquoise.
- Size text with the `--ixo-fs-*` variables so the Portal's `font-scale` accessibility preference applies inside the iframe.

### Typography

Inherited Inter-led product stack; weights 300 / 400 / 500 / 700 only. Body copy is 400 — use colour or size for emphasis, never a weight bump. Headings match the Portal's scale (h1 56 / h2 40 / h3 32 / h4 24), line-height 1.2 headings and 1.5 body. Button labels are 500 with `0.01em` tracking. No new font families and no branded type pairings.

### Components

- **Buttons are monochrome.** Primary fills with `color-text` on `color-body`; secondary is the workhorse at 5% text tint (10% on hover); ghost is transparent. Accent is never a button fill. Default height 32px (`sm`), 40px for form CTAs (`md`), radius `md`. Disabled keeps opacity 1 and tints instead. Icon-only buttons are square and carry `aria-label`.
- **Inputs** are filled: `color-surface`, 1px `color-border`, radius `md`, 36px or 46px tall, weight 400, accent border on focus, label above the field.
- **Surfaces:** panels are `color-surface` with a hairline border, radius `md`, `spacing-lg` padding. The glass panel (radius `xl`, `backdrop-filter`, `shadow-glass`) is the one elevation in the system — reserve it for hero or floating surfaces. Prefer in-page panels over modals inside an iframe.
- **Status and data:** pill badges tinted at ~12% of the status colour; tables use horizontal hairlines only, no vertical rules; charts sequence accent → success → warning → danger → muted and never encode meaning by colour alone.
- Use the `ixo-*` classes from `templates/ixo-ui.css` rather than re-deriving component styles.

### Light and dark

Both schemes are first-class and the Portal defaults to dark. The scheme toggle reaches the app as a **re-sent `INIT`** — apply tokens on every `INIT`, never latch the first payload. Drive CSS from `data-portal-theme` on `<html>`, and keep `@media (prefers-color-scheme: dark)` scoped to `:root:not([data-portal-theme])` so standalone and embedded behaviour never fight. Values CSS cannot reach — canvas, charts, inline SVG — must re-read tokens in an `onThemeChange` handler. Never hardcode `#fff` or `#000`. Keep `<body>` transparent so the Portal canvas shows through. Verify both schemes before calling the work done.

### Motion and accessibility

Transitions 120–200ms `ease-out` on `opacity`, `transform`, and colour only. Always ship the `prefers-reduced-motion` block from `ixo-tokens.css`; the Portal's global reset does not cross into the iframe. Focus is never removed — `:focus-visible` keeps a 2px accent outline at 2px offset. Contrast ≥ 4.5:1 for body text and ≥ 3:1 for large text and borders, in both schemes. Targets ≥ 24px, 44px for primary phone actions.

### Layout

Design `domains-panel` first — it is the tightest frame and the common default — then verify `domains` and `fullscreen`. Grids collapse to one column below 720px and use `minmax(0, 1fr)` so long DIDs cannot push a row past the frame. Keep fixed-position UI out of the top-right corner where the Portal renders its fullscreen control. Send `RESIZE` after content height changes (`autoResize()` handles this) rather than relying on internal scrolling.

### Do / Don't

Do: theme-aware neutral surfaces; one accent carrying meaning; the neutral ramp for hierarchy; the spacing scale for rhythm; tabular figures for numeric columns; genuine care for empty, loading, and error states.

Don't: introduce a second brand (new fonts, gradient headers, drop-shadow stacks, pill-everything); use accent as a large background or button fill; duplicate Portal navigation with app chrome; animate on load beyond a subtle fade; reach for a UI framework.

The test: screenshot the app next to a Portal page in both schemes. If a reviewer can tell where the Portal ends and the app begins by anything other than content, it is not done.

### Reviewing for design

In review mode, check UI against these rules in addition to `references/review-checklist.md`. Hardcoded theme colours and theme applied only on the first `INIT` are blockers; the remaining design gaps are warnings. Cite the rule that fails.
