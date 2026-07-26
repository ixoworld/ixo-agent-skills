# IXO Portal Design System For Iframe Apps

This is the visual contract. An app embedded in the Portal must look like it *belongs* to the Portal, not like a third-party widget dropped into a hole in the page.

The Portal itself is Mantine v7 with a custom IXO theme. Iframe apps do **not** get Mantine — they get the same tokens, expressed as plain CSS custom properties, plus the rules below.

## 1. Where Tokens Come From

Two layers, in this order:

1. **Static baseline** — `templates/ixo-tokens.css` defines every `--ixo-*` custom property for both schemes. This renders correctly before `INIT` arrives, and when the app is opened standalone (outside the Portal) it falls back to `prefers-color-scheme`.
2. **Host override** — the Portal's `INIT` payload carries `host.theme.mode` and `host.theme.tokens`. `templates/portal-theme.js` writes each token onto `document.documentElement` as `--ixo-<key>` and sets `data-portal-theme="light|dark"`. Host values win because they carry the live **whitelabel palette** (accent and status colours differ per ecosystem) and the user's font-scale preference.

Never read the Portal's own `--mantine-color-*` variables. The iframe is a separate document on a separate origin; those variables do not exist inside it.

**Rule: every colour, radius, spacing, and font size in app CSS is a `var(--ixo-*)` reference.** Raw hex in app CSS is a review blocker — it cannot follow the theme or the ecosystem's whitelabel palette.

## 2. Token Reference

Token key in `host.theme.tokens` → CSS custom property `--ixo-<key>`.

### Colour

| Token                    | Light     | Dark      | Use                                                     |
| ------------------------ | --------- | --------- | ------------------------------------------------------- |
| `color-body`             | `#FAFAFA` | `#050505` | Page background. The Portal canvas behind the iframe.   |
| `color-surface`          | `#F1F1F1` | `#171818` | Cards, panels, inputs, popovers.                        |
| `color-surface-raised`   | `#E4E4E4` | `#202020` | Hovered rows, nested surfaces, table header bands.      |
| `color-border`           | `#D7D7D7` | `#282828` | Hairline dividers and input borders.                    |
| `color-text`             | `#222222` | `#DDDDDD` | Primary text. Also the **button** fill colour.          |
| `color-text-muted`       | `#333333` | `#999999` | Labels, captions, secondary metadata.                   |
| `color-accent`           | `#0EB8DC` | same      | Focus rings, links, selection, active indicators.       |
| `color-accent-hover`     | `#17C6EB` | same      | Accent hover state.                                     |
| `color-accent-muted`     | `#ADEBF8` | same      | Accent-tinted backgrounds, subtle highlights.           |
| `color-accent-contrast`  | `#FFFFFF` | same      | Text on an accent fill.                                 |
| `color-success`          | `#61B43A` | same      | Positive status.                                        |
| `color-danger`           | `#E2223B` | same      | Errors, destructive actions.                            |
| `color-warning`          | `#ED9526` | same      | Warnings, pending states.                               |
| `color-glass`            | `rgba(255,255,255,0.06)` | same | Glass surface border.                        |
| `shadow-glass`           | `0px 4px 20px 0px rgba(0,0,0,0.09)` | same | The only elevation shadow in the system. |

Accent and status colours are **whitelabel** — they arrive from the host at runtime and differ per ecosystem. Never hardcode `#0EB8DC`.

### Typography

| Token            | Value                                        |
| ---------------- | -------------------------------------------- |
| `font-family`    | `Inter, ui-sans-serif, system-ui, …`         |
| `font-scale`     | `0.875` – `1.25` (user accessibility setting) |
| `font-size-xs`   | `12px`                                       |
| `font-size-sm`   | `14px`                                       |
| `font-size-md`   | `16px` (body default)                        |
| `font-size-lg`   | `40px`                                       |
| `font-size-xl`   | `56px`                                       |

Heading scale, matching the Portal's Mantine headings: h1 `56px`, h2 `40px`, h3 `32px`, h4 `24px`.

`font-scale` is a **multiplier the app must apply**. Size text with `calc(<px> * var(--ixo-font-scale))` (`templates/ixo-tokens.css` ships `--ixo-fs-*` variables that already do this). Ignoring it breaks the Portal's font-size accessibility preference inside the iframe.

Weights: 300 / 400 / 500 / 700 only. Body text is **400** — never bump body copy to 500 for emphasis; use colour or size. Button labels are 500 with `letter-spacing: 0.01em`.

### Spacing, Radius, Controls

| Token                | Value  |
| -------------------- | ------ |
| `spacing-xs`         | `10px` |
| `spacing-sm`         | `12px` |
| `spacing-md`         | `16px` |
| `spacing-lg`         | `20px` |
| `spacing-xl`         | `24px` |
| `radius-sm`          | `4px`  |
| `radius-md`          | `8px` (default for buttons, inputs, cards) |
| `radius-lg`          | `16px` |
| `radius-xl`          | `24px` (glass panels) |
| `control-height-sm`  | `32px` (default button) |
| `control-height-md`  | `40px` (form CTA) |
| `input-height-sm`    | `36px` (default input) |
| `input-height-md`    | `46px` |

## 3. Component Specs

`templates/ixo-ui.css` implements all of these. Use those classes rather than re-deriving them.

### Buttons — monochrome, never accent

This is the single most distinctive rule of the IXO system. Buttons use the **foreground text colour**, not the brand accent. Accent is reserved for focus, links, and selection.

| Variant                  | Background                            | Text               | Hover                    |
| ------------------------ | ------------------------------------- | ------------------ | ------------------------ |
| `primary` (default)      | `color-text`                          | `color-body`       | text colour @ 82%        |
| `secondary` (the workhorse) | text colour @ 5%                   | `color-text`       | text colour @ 10%        |
| `ghost`                  | transparent                           | `color-text`       | text colour @ 5%         |

Sizes: `sm` = 32px tall, 16px horizontal padding, 14px label (default — headers, toolbars, inline actions). `md` = 40px tall, 12px horizontal padding, 14px label (form-level CTAs).

Disabled: background text colour @ 5%, label text colour @ 45%, `cursor: not-allowed`, **opacity stays 1** (a washed-out 0.6 overlay is wrong here).

Radius `md` (8px). Icon-only buttons are square at the control height and **must** carry `aria-label`.

### Inputs

Filled by default: background `color-surface`, 1px `color-border`, radius `md`, height 36px (`sm`) or 46px (`md`), font 14/16px, weight 400. Placeholder is text colour @ 40%. Focus border is `color-accent`. Labels sit above the field, weight 400, `color-text`, 4px gap. Error text uses `color-danger`.

### Surfaces

- **Panel / card** — `color-surface`, 1px `color-border`, radius `md`, padding `spacing-lg`.
- **Glass panel** — the Portal's signature surface: `color-surface` mixed to ~20%, 1px `color-glass` border, radius `xl` (24px), `backdrop-filter: blur(10px)`, `shadow-glass`. Use for hero panels and floating overlays, not for every card.
- **Modal** — radius 12px, `backdrop-filter: blur(40px)`. Inside an iframe, prefer in-page panels; a modal that exceeds the iframe viewport is unreachable.

### Status, Tables, Charts

- Badges/pills: radius 999px, 12px text, tinted background at ~12% of the status colour with the status colour as text.
- Tables: no vertical rules. 1px `color-border` horizontal separators, header row `color-text-muted` at 12px uppercase with `0.04em` tracking, row hover `color-surface-raised`.
- Charts: sequence categorical series as accent → success → warning → danger → `color-text-muted`. Never encode meaning by colour alone — pair with a label, shape, or direct annotation.

## 4. Light And Dark

Both schemes are first-class. The Portal defaults to dark and the user toggles freely at runtime.

- The Portal re-sends `INIT` when the scheme changes, so **theme switching is a live update, not a reload**. Apps must re-apply tokens on every `INIT` — never latch the first payload's theme.
- Test both schemes. Contrast bugs are usually one scheme only.
- Never hardcode `#fff`/`#000`. "White" text in dark mode is `#DDDDDD` here, and "black" in light mode is `#222222`; hardcoding pure values makes the app visibly hotter than the Portal chrome around it.
- Body background: leave the `<body>` transparent so the Portal canvas shows through, and paint surfaces explicitly. `color-body` is available for standalone rendering.
- `<meta name="color-scheme" content="light dark">` plus a `color-scheme` declaration keeps native controls (scrollbars, date pickers, form widgets) in the right scheme.
- Standalone fallback: `@media (prefers-color-scheme: dark)` applies only while `data-portal-theme` is unset, so the OS preference drives the app before/without a host connection and never fights the host afterwards.

## 5. Motion And Accessibility

- Transitions: 120–200ms, `ease-out`. Animate `opacity`, `transform`, `background-color`, `border-color`. Nothing that triggers layout.
- Always ship the `prefers-reduced-motion: reduce` block from `ixo-tokens.css`. The Portal injects one globally for its own document; the iframe is a separate document and does **not** inherit it.
- Focus is never removed. `:focus-visible` = 2px `color-accent` outline, 2px offset.
- Contrast: body text ≥ 4.5:1, large text and UI borders ≥ 3:1, in **both** schemes.
- Target size: 24px minimum (WCAG 2.2 AA), 44px recommended. The 32px default button meets AA; use 40/44px for primary touch targets on phone.
- Every interactive element is keyboard reachable in DOM order. Icon-only controls need `aria-label`.
- Respect `host.locale` — set `document.documentElement.lang` (the bridge does this) so screen readers pronounce content correctly.

## 6. Layout Inside The Frame

`host.viewport.tier` is `phone` | `tablet` | `laptop` | `desktop`, and the app renders in one of three view modes:

| Mode            | Shape                                              | Design for                                     |
| --------------- | -------------------------------------------------- | ---------------------------------------------- |
| `domains`       | Main content column                                | Single readable column, `max-width` ~960px     |
| `domains-panel` | Narrow right-hand panel (full width ≤992px)        | Stacked, no multi-column grids, truncated DIDs |
| `fullscreen`    | Whole canvas                                       | Multi-column allowed                           |

- Design panel-first. `domains-panel` is the tightest box and the most common default.
- Grids collapse to one column below 720px. Use `minmax(0, 1fr)` so long DIDs and hashes cannot push the row past the frame width.
- The Portal renders a fullscreen control in the **top-right corner**. Keep fixed-position UI out of that corner.
- Height is driven by `RESIZE` (clamped 320–6000px). Send it after content changes; don't rely on internal scrolling in `domains` mode.
- Long identifiers: truncate with ellipsis and expose the full value on hover/copy — never let them dictate layout width.

## 7. Aesthetic Direction

The IXO Portal is **quiet, dense, and instrument-like** — a monochrome surface with a single turquoise accent doing all the signalling. Craft shows up as restraint and precision, not decoration.

Do:

- Let one accent carry meaning. If everything is accented, nothing is.
- Use the neutral ramp for hierarchy: background → surface → raised, with borders as hairlines rather than boxes.
- Keep to the spacing scale. Consistent rhythm reads as designed; arbitrary values read as assembled.
- Align to a grid, and align labels to their values. Optical alignment beats nominal alignment.
- Give data room — generous line height (1.5 body, 1.2 headings), and let numbers breathe with tabular figures (`font-variant-numeric: tabular-nums`) so columns line up.
- Sweat empty, loading, and error states. They are most of an embedded app's lifetime.

Don't:

- Introduce a second brand: no new font families, no gradient headers, no purple-on-white, no drop-shadow stacks, no rounded-pill everything.
- Use accent as a background for large regions or as the button fill.
- Add a title bar, breadcrumb, or app chrome that duplicates the Portal's own navigation. The frame already has context — start with content.
- Animate on load beyond a subtle fade. The app appears inside an already-loaded page; entrance choreography reads as noise.
- Reach for a UI framework. These apps are vanilla HTML/CSS/JS by default; a component library will drift from the Portal's look on the first upgrade.

The test: screenshot the app next to a Portal page in both schemes. If a reviewer can tell where the Portal ends and the app begins by anything other than content, it is not done.
