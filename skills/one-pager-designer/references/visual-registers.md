# Visual Registers - Palette and Type Recipes

Pick one register. Commit to it across the whole page. Do not mix registers.

## Minimal (the safe default)

Black on white, one accent color, system sans throughout. Hard to make this look bad.

```css
:root {
  --ink: #111111;
  --muted: #5a5a5a;
  --accent: #2d4a6b;
  --bg: #ffffff;
  --rule: #e6e6e6;
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.45;
  color: var(--ink);
  background: var(--bg);
}

h1 { font-size: 28pt; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 8px; }
h2 { font-size: 14pt; margin: 24px 0 8px; color: var(--accent); }
h3 { font-size: 11pt; margin: 16px 0 4px; text-transform: uppercase; letter-spacing: 0.06em; }
.lede { font-size: 13pt; color: var(--muted); margin: 0 0 24px; }
```

## Editorial (longform, nonprofit, policy, thoughtful)

Serif headlines for warmth and authority, sans body for readability, generous whitespace.

```css
:root {
  --ink: #1c1c1c;
  --muted: #6a6a6a;
  --accent: #8b3a3a;
  --bg: #fdfcf9;
  --rule: #d8d4cc;
}

body {
  font-family: "Iowan Old Style", "Charter", Georgia, "Times New Roman", serif;
  font-size: 11pt;
  line-height: 1.55;
  color: var(--ink);
  background: var(--bg);
  max-width: 720px;
}

h1 {
  font-family: inherit;
  font-size: 32pt;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.015em;
  margin: 0 0 12px;
}

h2 {
  font-family: inherit;
  font-size: 16pt;
  font-weight: 600;
  margin: 28px 0 8px;
  color: var(--accent);
}

p, li {
  font-family: inherit;
}

.lede {
  font-style: italic;
  font-size: 13pt;
  color: var(--muted);
}
```

## Corporate (investor, enterprise, regulator)

Restrained sans throughout, structured grid, no decoration.

```css
:root {
  --ink: #0f1419;
  --muted: #5b6470;
  --accent: #0a4d8f;
  --bg: #ffffff;
  --rule: #d6dce3;
}

body {
  font-family: "Inter", system-ui, -apple-system, Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.4;
  color: var(--ink);
  background: var(--bg);
}

h1 {
  font-size: 24pt;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0 0 6px;
}

h2 {
  font-size: 13pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  border-bottom: 1px solid var(--rule);
  padding-bottom: 4px;
  margin: 24px 0 10px;
}

h3 {
  font-size: 10.5pt;
  font-weight: 600;
  margin: 14px 0 4px;
}

.eyebrow {
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  margin: 0 0 4px;
}
```

## Modern startup (product, growth, fundraise)

Bold sans, two-color accent, soft shadows, generous spacing.

```css
:root {
  --ink: #0a0a0a;
  --muted: #6b6b6b;
  --accent: #5b3df5;
  --accent-soft: #ede9ff;
  --bg: #ffffff;
  --rule: #ececec;
}

body {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: var(--ink);
  background: var(--bg);
}

h1 {
  font-size: 36pt;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0 0 12px;
}

h2 {
  font-size: 15pt;
  font-weight: 600;
  margin: 28px 0 10px;
}

h3 {
  font-size: 11pt;
  font-weight: 600;
  margin: 12px 0 4px;
}

.tldr, .proof, .ask {
  background: var(--accent-soft);
  border-left: 3px solid var(--accent);
  padding: 14px 18px;
  border-radius: 6px;
  margin: 20px 0;
}

@media print {
  .tldr, .proof, .ask {
    background: transparent;
    border-left: 2px solid var(--ink);
  }
}
```

## Civic / Nonprofit (mission, community, grants)

Warm palette, clear hierarchy, room for a photo, friendly but not cute.

```css
:root {
  --ink: #2b2520;
  --muted: #6b5e54;
  --accent: #c25e2e;
  --accent-soft: #f5ebe2;
  --bg: #fdfaf6;
  --rule: #ddd3c5;
}

body {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: var(--ink);
  background: var(--bg);
}

h1 {
  font-size: 28pt;
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 8px;
}

h2 {
  font-size: 14pt;
  font-weight: 600;
  color: var(--accent);
  margin: 24px 0 8px;
}

h3 {
  font-size: 11pt;
  font-weight: 600;
  margin: 14px 0 4px;
}

.proof, .tldr {
  background: var(--accent-soft);
  padding: 14px 18px;
  border-radius: 8px;
  margin: 20px 0;
}
```

## Rules across all registers

1. **One accent color.** Two if the register explicitly uses a soft tint of the same hue. Never two unrelated accent colors.
2. **Body text ≥ 10pt.** Below that, print quality suffers.
3. **Line length 60-80 characters.** Cap body width with `max-width` even if the viewport is wider.
4. **Headlines are sentences.** "We help small farmers irrigate efficiently" beats "Smart Irrigation Solutions for Agriculture".
5. **Print rules strip backgrounds and shadows.** Always include `@media print` overrides for soft backgrounds and box-shadows so the printed page stays clean.
