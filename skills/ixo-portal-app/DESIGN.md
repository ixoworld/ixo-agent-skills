---
name: IXO Portal Prototyping Workspace
description: Design system for safe human and AI-agent collaboration prototypes across IXO Portal surfaces.
colors:
  ink: "#000000"
  ink-soft: "#333333"
  surface: "#ffffff"
  surface-muted: "#f1f1f1"
  surface-cool-start: "#d6dbdc"
  neutral-tile: "#eff5f9"
  neutral-tile-end: "#e4e8e9"
  neutral-callout: "#eef0f1"
  neutral-callout-border: "#acafb0"
  neutral-card: "#b4b9bc"
  neutral-card-border: "#838687"
  code-bg: "#161616"
  code-text: "#e1e1e1"
  nav-dark: "#1f1f1f"
  portal-blue: "#0885ff"
  agent-blue: "#16abff"
  ink-tint-5: "#0000000d"
  ink-tint-10: "#0000001a"
typography:
  display:
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  headline:
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  mono:
    fontFamily: "ui-monospace, Menlo, Monaco, Cascadia Mono, Segoe UI Mono, Roboto Mono, Oxygen Mono, Ubuntu Monospace, Source Code Pro, Fira Mono, Droid Sans Mono, Courier New, monospace"
rounded:
  scrollbar: "3px"
  image: "6px"
  control: "8px"
  surface: "12px"
  selected: "16px"
  pill: "40px"
spacing:
  xxs: "2px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.ink-tint-5}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  input-filled:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  dropdown-surface:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  code-block:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.code-text}"
    rounded: "{rounded.control}"
---

# Design System: IXO Portal Prototyping Workspace

## 1. Overview

**Creative North Star: "The Safe Collaboration Desk"**

This system is a restrained product workspace for prototyping IXO Portal surfaces. It should feel like a designer's operational desk where people, forms, editors, maps, and AI agents can share context without the interface becoming theatrical. The work is serious, but the surface must stay approachable: readable controls, quiet neutrals, clear state changes, and enough density to handle portal workflows.

The visual language is inherited from the existing `globals.scss`: Mantine variables drive most product controls, BlockNote editor surfaces stay transparent and content-first, SurveyJS is pulled into the portal's canonical input/button/dropdown vocabulary, and special cases such as login, navigation, code blocks, date pickers, and slide-to-sign are explicitly themed. The result should feel workspace-native, not like a detached concept page.

The system explicitly rejects generic SaaS, crypto dashboards, token-price tooling, speculative Web3 landing pages, and over-decorated AI workflow apps. AI collaboration is treated as a practical workspace condition: authorship, intent, state, and next actions must become legible without turning agents into mascots or visual gimmicks.

**Key Characteristics:**
- Restrained product UI with neutral surfaces and rare accent states.
- Mantine-first controls with BlockNote and SurveyJS normalized into the same vocabulary.
- Tonal layering and inset borders over decorative shadows.
- Dense but scannable editor, form, navigation, and action surfaces.
- AI-agent collaboration expressed through state and workflow clarity, not novelty visuals.

## 2. Colors

The palette is a quiet neutral field with ink-led actions, a blue accent reserved for focus/selection, and dark code or navigation islands only where the task requires them.

### Primary
- **Ink Primary** (#000000): Primary actions, SurveyJS complete/next buttons, rating selection, and any action that must read as decisive. Use sparingly.
- **Ink Soft** (#333333): Legacy tab text and softer black where full ink would be too sharp.

### Secondary
- **IXO Portal Blue** (#0885ff): Existing glow and agent/accent lineage. Use as a source hue for selected, focused, or agent-adjacent states, not as broad decoration.
- **Agent Signal Blue** (#16abff): Secondary glow hue for agent or focus energy. It should remain a signal, never a page theme.

### Neutral
- **Workspace Surface** (#ffffff): Primary light surface, AppShell navigation in light mode, dropdown content when a true white surface is needed.
- **Quiet Neutral Field** (#f1f1f1): Active tab surfaces and the default muted field color.
- **Cool Portal Mist** (#d6dbdc): Existing body gradient start; use only as a background atmosphere behind actual work surfaces.
- **Tile Mist** (#eff5f9): Legacy tile start color for subtle neutral panels.
- **Tile Shade** (#e4e8e9): Legacy tile end color for low-contrast neutral gradients.
- **Callout Field** (#eef0f1): Low-emphasis callout and SurveyJS dim surface.
- **Callout Border** (#acafb0): Legacy callout border.
- **Card Metal** (#b4b9bc): Legacy card surface token.
- **Card Border Metal** (#838687): Legacy card border token.
- **AppShell Graphite** (#1f1f1f): Dark AppShell navbar, slightly lighter than the domain bar so the navigation reads as a separate surface.
- **Code Charcoal** (#161616): Code blocks, always dark in both light and dark modes.
- **Code Ink** (#e1e1e1): Code block text.

### Named Rules

**The One Accent Rule.** Blue belongs to focus, selected, progress, or agent signal states. It is forbidden as broad decorative wash, hero gradient, or generic crypto accent.

**The Neutral Field Rule.** Most work surfaces are neutral and theme-aware. When in doubt, use Mantine `neutralColor` and `text` variables instead of hardcoding new grays.

**The Code Island Rule.** Code blocks stay dark-on-dark across schemes. Never let editor text colors leak into code block internals.

## 3. Typography

**Display Font:** Inherited product sans stack from the host application.
**Body Font:** Inherited product sans stack from the host application.
**Label/Mono Font:** `ui-monospace, Menlo, Monaco, Cascadia Mono, Segoe UI Mono, Roboto Mono, Oxygen Mono, Ubuntu Monospace, Source Code Pro, Fira Mono, Droid Sans Mono, Courier New, monospace`.

**Character:** Product typography is functional, inherited, and density-aware. The system should feel like IXO Portal, not a standalone editorial brand surface.

### Hierarchy

- **Display** (700, 40px, 1.15): BlockNote H1 and page-title scale. Use for editor titles only, not dashboard decoration.
- **Headline** (700, 30px, 1.2): BlockNote H2 and large internal section headings.
- **Title** (700, 24px, 1.25): BlockNote H3 and compact feature headings.
- **Body** (400, 16px, 1.5): Form inputs, editor body, dropdown values, and normal product copy. Keep prose around 65-75ch when it is not inside dense tables or editors.
- **Label** (600, 18px, 1.35): Survey container titles and compact panel headings.
- **Small Title** (700, 20px, 1.3): BlockNote H4 and tab labels where a larger control label is already established.

### Named Rules

**The Inherited Type Rule.** Do not introduce display fonts or branded type pairings into app surfaces. Use the host product typography and spend effort on hierarchy, spacing, and state.

**The Dense Title Rule.** Headings inside editors, panels, forms, and sidebars must stay compact. No hero-scale type in product chrome.

## 4. Elevation

This system is flat by default and uses tonal layering, inset borders, and state color to show structure. Shadows are rare: the only extracted shadow is the dropdown/popover separation shadow (`0 4px 12px rgba(0, 0, 0, 0.08)`). SurveyJS removes its default large shadows and replaces them with inset borders, while BlockNote selection removes shadows entirely.

### Shadow Vocabulary

- **Inset Control Ring** (`inset 0 0 0 1px var(--mantine-color-neutralColor-5)`): Default filled input, comment, boolean, and SurveyJS control separation.
- **Accent Focus Ring** (`inset 0 0 0 1px var(--mantine-color-accent-5)`): Focus state for inputs, dropdowns, and date/time controls.
- **Popover Lift** (`0 4px 12px rgba(0, 0, 0, 0.08)`): Dropdown popup separation only.
- **No Editor Shadow** (`box-shadow: none`): BlockNote editor container and selected node treatment.

### Named Rules

**The Flat At Rest Rule.** Surfaces are flat at rest. Depth appears through tonal contrast and state rings before shadow.

**The Popover Exception Rule.** Use a shadow only when a floating layer needs separation from the canvas. If it is a card, panel, or button at rest, shadow is the wrong tool.

## 5. Components

### Buttons

Portal buttons are compact and monochrome, with contrast doing the work.

- **Shape:** Gently squared product control (8px radius).
- **Primary:** Ink-filled background with body-colored text, 40px minimum height, 20px horizontal padding.
- **Hover / Focus:** Primary hover lightens toward 82% text mix; focus should use the same visible control-ring language as inputs.
- **Secondary / Ghost:** Tinted text mix at 5% for default and 10% for hover, same radius and height.

### Chips

Selection chips use accent sparingly.

- **Style:** Selected SurveyJS items use a 12% accent tint; checked controls use the accent fill directly.
- **State:** Unselected hover and focus use neutralColor-3, not saturated color.

### Cards / Containers

Cards are not the default layout answer here.

- **Corner Style:** Standard product surfaces use 8px to 12px. Selected editor nodes may use 16px. Legacy tab pills use 40px only because they are pill controls.
- **Background:** Transparent or neutralColor surfaces by default; true white is reserved for light navigation and popup surfaces.
- **Shadow Strategy:** Flat by default; use only the popover shadow for dropdowns.
- **Border:** Prefer inset ring tokens or Mantine neutral borders over decorative outlines.
- **Internal Padding:** 16px is the primary editor/control padding; 8px is the unit for SurveyJS internals.

### Inputs / Fields

Filled controls define the core form language.

- **Style:** Filled neutral background, 8px radius, 16px text, minimum height 36px, inset neutral ring.
- **Focus:** Switch the inset ring to accent-5. Do not add glow, thick outlines, or layout-shifting borders.
- **Error / Disabled:** Errors use Mantine red-5 and a 10% red tint. Disabled controls use opacity 0.5 with a not-allowed cursor.

### Navigation

Navigation surfaces distinguish active workspace regions without loud color.

- **AppShell:** Dark mode navbar uses #1f1f1f to sit above the darker domain bar; light mode navbar uses #ffffff.
- **Tabs:** Legacy tab pills use 40px radius, 20px labels, and active neutral fill. Use this sparingly and keep it aligned with product density.
- **Scrollbars:** Overlay scrollbars stay thin at 6px and remain transparent until hover or focus-within.

### Dropdowns

Dropdowns and selects are neutral, compact, and state-driven.

- **Surface:** neutralColor-2 with 8px radius.
- **Items:** 8px vertical padding, inherited text color, 500 weight only when selected.
- **Selected:** accent-5 background with white text.
- **Hover / Focus:** neutralColor-3 background and no extra border.

### Editor

The editor is content-first and scheme-aware.

- **BlockNote Container:** Transparent background, no border, no focus shadow.
- **Editor Padding:** 16px inline, full-width cover treatment preserved.
- **Headings:** 40/30/24/20px hierarchy.
- **Selected Node:** No outline and no shadow; selected content uses a 16px radius only where needed.
- **Code Block:** Always #161616 with #e1e1e1 text and 8px radius.

### Date And Time Controls

Calendar controls inherit portal neutrals instead of Mantine defaults.

- **Popup:** neutralColor-2 background, neutralColor-4 border, 8px radius.
- **Hover:** neutralColor-3 for days, month cells, year cells, and header controls.
- **Today:** neutral border only.
- **Outside Month:** 30% text mix.
- **Time Input Focus:** accent-5 border.

### Login Inputs

Login inputs are the one scoped glass-adjacent case because they sit on a dark login background.

- **Style:** Transparent input background, white text, 30% white border.
- **Focus:** 60% white border.
- **Placeholder:** 40% white text.
- **Scope:** Only inside `.ixo-login-page`; do not generalize this treatment into app surfaces.

## 6. Do's and Don'ts

### Do:

- **Do** use Mantine `neutralColor`, `text`, `body`, and `accent` variables for scheme-aware product surfaces.
- **Do** keep primary actions ink-led and rare; the workspace should read through hierarchy and state, not color volume.
- **Do** normalize third-party UI such as BlockNote and SurveyJS into the portal vocabulary before adding new visual language.
- **Do** use 8px radius for inputs, buttons, dropdowns, code blocks, and date popovers.
- **Do** use inset control rings for default and focus states, especially in dense form and editor contexts.
- **Do** keep scrollbars subtle and non-layout-shifting.
- **Do** make collaboration state, authorship, intent, and next actions legible without crowding the workspace.

### Don't:

- **Don't** make it feel like generic SaaS.
- **Don't** make it feel like crypto dashboards.
- **Don't** make it feel like token-price tooling.
- **Don't** make it feel like speculative Web3 landing pages.
- **Don't** make it feel like over-decorated AI workflow apps.
- **Don't** use default startup aesthetics, ornamental gradients, empty card grids, or finance-dashboard visual cliches.
- **Don't** treat AI agents as a novelty instead of a practical collaborator.
- **Don't** add broad blue washes, purple gradients, neon accents, or glassmorphism to product surfaces.
- **Don't** pair a 1px border with a large soft shadow on cards or buttons.
- **Don't** use 32px+ card or input radii. Pill radii are only for pill controls.
- **Don't** introduce hero-scale type, display fonts, or marketing-page composition into authenticated portal workflows.
