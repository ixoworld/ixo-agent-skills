# AGENTS.md — IXO Portal App Skill

Instructions for any coding agent working in this package or using it to build, harden, or review static apps embedded by the IXO Portal domain iframe framework (`/domain/[entityDid]/app/[appId]`).

## Package map

| File | Purpose |
| --- | --- |
| `SKILL.md` | Workflow, modes (build / hardening / review), and output expectations. Read first. |
| `DESIGN.md` | Design system source of truth: tokens (frontmatter) plus rules. Read before producing or changing any UI. |
| `references/portal-contract.md` | The Portal iframe contract: discovery, manifest, lifecycle, message schemas, security. The only source of valid message types and manifest fields. |
| `references/review-checklist.md` | Audit checklist for compatibility reviews and pre-publish checks. |
| `templates/` | Starter files for new vanilla static apps (`manifest.json`, `index.html`, `styles.css`, `portal-bridge.js`). |
| `scripts/validate_skill.py` | Package self-check. Run `python3 scripts/validate_skill.py .` after editing any skill file. |
| `agents/openai.yaml` | OpenAI-specific interface metadata. |

## Working rules

- The Portal contract in `references/portal-contract.md` is authoritative. Never invent message types, manifest fields, feature flags, or privileged actions that it does not define.
- Build vanilla HTML, CSS, and JavaScript. No frameworks, bundlers, or package dependencies unless the user explicitly asks.
- Keep app logic out of `templates/portal-bridge.js`; the bridge is the stable host-contract wrapper.
- Security is non-negotiable: validate `event.origin` on every message, validate `protocol`/`version`/`type`, use exact `targetOrigin` after `INIT`, never use wildcard origins in production, never store private keys or long-lived secrets in the iframe.
- Before production deployment, strip development origins such as `http://localhost:3000` from the bridge `ALLOWED_PORTAL_ORIGINS` allowlist; ship only exact production Portal origins.
- After editing files in this package, run `python3 scripts/validate_skill.py .` and fix every error before finishing.

## Design instructions

These rules are distilled from `DESIGN.md`. Apply them to every UI you build, harden, or review for the Portal. Full token values live in the `DESIGN.md` frontmatter; when anything here conflicts with `DESIGN.md`, `DESIGN.md` wins.

**Creative north star: "The Safe Collaboration Desk."** A restrained product workspace where people, forms, editors, maps, and AI agents share context without the interface becoming theatrical. Workspace-native, not a detached concept page. AI collaboration is expressed through legible state, authorship, intent, and next actions — never mascots or novelty visuals.

### Color

Quiet neutral field, ink-led actions, blue reserved for signal.

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#000000` | Primary actions, decisive controls. Use sparingly. |
| Ink Soft | `#333333` | Softer black for secondary text. |
| Surface | `#ffffff` | Primary light surface, light navigation, popups. |
| Surface Muted | `#f1f1f1` | Default muted field, active tabs. |
| Portal Blue | `#0885ff` | Focus, selected, progress, agent-adjacent states only. |
| Agent Signal Blue | `#16abff` | Secondary agent/focus glow. A signal, never a theme. |
| Code Charcoal / Code Ink | `#161616` / `#e1e1e1` | Code blocks, dark in both schemes. |
| AppShell Graphite | `#1f1f1f` | Dark navigation surfaces. |
| Ink Tints | `#0000000d` (5%) / `#0000001a` (10%) | Secondary/ghost button fills and hovers. |

- **The One Accent Rule.** Blue belongs to focus, selected, progress, or agent signal states. Forbidden as decorative wash, hero gradient, or generic crypto accent.
- **The Neutral Field Rule.** Most work surfaces are neutral and theme-aware. When in doubt use neutral/text tokens instead of hardcoding new grays.
- **The Code Island Rule.** Code blocks stay dark-on-dark (`#161616` / `#e1e1e1`) across schemes; editor text colors never leak into them.

### Typography

Inherited product sans stack; mono stack from `DESIGN.md` for code. Scale: Display 700 40/1.15 (editor titles only) · Headline 700 30/1.2 · Title 700 24/1.25 · Small Title 700 20/1.3 · Label 600 18/1.35 · Body 400 16/1.5 (prose ~65–75ch outside dense surfaces).

- **The Inherited Type Rule.** No display fonts or branded type pairings in app surfaces. Spend effort on hierarchy, spacing, and state instead.
- **The Dense Title Rule.** Headings in editors, panels, forms, and sidebars stay compact. No hero-scale type in product chrome.

### Elevation

Flat by default; structure comes from tonal layering, inset borders, and state color.

- **Inset Control Ring** `inset 0 0 0 1px <neutral>` — default control separation. **Accent Focus Ring** `inset 0 0 0 1px #0885ff` — focus state. **Popover Lift** `0 4px 12px rgba(0,0,0,0.08)` — dropdown/popover separation only.
- **The Flat At Rest Rule.** Surfaces are flat at rest; depth appears through tonal contrast and state rings before shadow.
- **The Popover Exception Rule.** Shadow only when a floating layer needs separation from the canvas. Cards, panels, and buttons at rest never get one.

### Components

- **Radii:** controls (buttons, inputs, dropdowns, code blocks) 8px; surfaces 12px; selected editor nodes 16px; pills 40px (pill controls only). Never 32px+ on cards or inputs.
- **Buttons:** primary is ink-filled with surface text, 40px min height, 0 20px padding; hover lightens toward an 82% text mix. Secondary/ghost uses 5% ink tint (10% on hover), same radius and height. Focus uses the same visible ring language as inputs.
- **Inputs:** filled neutral background, 8px radius, 16px text, 36px min height, inset neutral ring; focus switches the ring to accent — no glow, thick outlines, or layout-shifting borders. Errors: red-5 plus 10% red tint. Disabled: opacity 0.5, `not-allowed` cursor.
- **Cards/containers:** not the default layout answer. Transparent or neutral backgrounds; true white reserved for light navigation and popups; 16px primary internal padding; inset rings or neutral borders, never decorative outlines.
- **Dropdowns:** neutral surface, 8px radius, 8px item padding; selected items use accent fill with white text; hover/focus uses a neutral step, no extra border.
- **Selection chips:** selected uses a 12% accent tint; checked uses accent fill; unselected hover stays neutral.
- **Scrollbars:** thin (6px), overlay, transparent until hover or focus-within, non-layout-shifting.

### Do / Don't

Do: theme-aware neutral surfaces; rare ink-led primary actions; normalize third-party UI (BlockNote, SurveyJS) into the portal vocabulary before adding new visual language; make collaboration state, authorship, intent, and next actions legible without crowding.

Don't: generic SaaS, crypto dashboards, token-price tooling, speculative Web3 landing pages, or over-decorated AI workflow apps; ornamental gradients, empty card grids, finance-dashboard cliches; broad blue washes, purple gradients, neon accents, or glassmorphism; a 1px border paired with a large soft shadow; hero-scale type or marketing-page composition inside authenticated portal workflows; AI agents treated as novelty instead of practical collaborators.

### Reviewing for design

In review mode, check UI against these rules in addition to `references/review-checklist.md`. Report design violations as warnings (the contract checklist defines blockers), citing the rule by name (e.g. "violates the One Accent Rule").
