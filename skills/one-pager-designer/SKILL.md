---
name: one-pager-designer
description: Turn a brief, set of notes, or rough text into a clean, well-designed one-pager that actually looks good - not a wall of text in a serif font. Use when a user needs a project one-pager, a product brief, a pitch sheet, a meeting handout, an executive summary, a campaign brief, a fundraising teaser, a portfolio piece, or a "make this look professional" pass on existing content. Produces a self-contained HTML file (single file, no dependencies, no external fonts) that prints clean to A4/Letter and renders well on screen. Refuses to design when the underlying content is too thin - asks for substance first.
metadata:
  short-description: Turn notes into a clean, printable one-page HTML
  author: IXO World
  version: "1.0.0"
  category: productivity
---

# One-Pager Designer

Use this skill to convert raw content into a one-page document that reads well, prints well, and signals care. The output is a single self-contained HTML file - no build step, no external dependencies, no fonts that fail to load offline. Open it in a browser, print it to PDF, attach it to an email, done.

## Operating Standard

- **Substance first, design second.** Refuse to "make it pretty" if the underlying content has no clear audience, ask, or shape. Surface the gap and ask one targeted question.
- **One page means one page.** The rendered output must fit on a single A4 or Letter sheet when printed. If the content is too long, cut or restructure - do not silently spill to a second page.
- **No external dependencies.** No Google Fonts, no CDN CSS, no external images unless the user supplied a URL or local path. The HTML must render fully offline.
- **System fonts only by default.** `system-ui`, then sensible fallbacks. The page should look identical on any machine.
- **Print-aware.** Include `@media print` rules that strip backgrounds, lock the layout, and respect A4/Letter margins.
- **Accessible by default.** Real heading hierarchy (h1, h2, h3 - not styled divs), text contrast above 4.5:1, alt text on any image.
- **No lorem ipsum, no placeholders, no "Your Logo Here".** Use the actual content. Mark explicit gaps with `[TODO: ...]` only where the user must fill in.

## Invocation Modes

1. **From scratch** - User describes what they need ("a one-pager for our climate fund pitch"). Ask one round of clarifying questions only if the audience or ask is unclear, then produce the page.
2. **From draft** - User pastes existing text and asks for a one-pager treatment. Restructure, cut, design, return.
3. **Restyle** - User has an existing one-pager and wants a different look (more formal, more modern, more nonprofit, more startup). Keep content intact, swap the visual register.
4. **Critique then revise** - User asks "is this any good" or "what would you change". Give a short structured critique against the checklist below, then offer to apply the changes.

Do not produce more than one version unless the user asks. One good page beats three drafts.

## Workflow

### 1. Identify the four ingredients

Every one-pager has the same four ingredients. Find or ask for each before designing:

- **Audience** - who is reading this (investor / customer / regulator / internal team / general public)
- **One thing they should remember** - the headline, the sentence they'd repeat to a colleague
- **Three to five supporting facts** - claims, numbers, features, milestones, risks - whichever shape fits
- **The ask** - what happens next (book a call / read the deck / approve the budget / no ask, FYI only)

If any are missing, ask once. Do not invent.

### 2. Pick a layout pattern

Pick one of these proven shapes based on purpose. Do not improvise.

| Purpose | Pattern | Sections (top to bottom) |
|---|---|---|
| Product / service brief | Hero + 3-column | Headline + subhead, three feature/benefit columns, proof bar, CTA |
| Pitch / fundraise | Problem-solution | Headline, problem (with stat), solution (with stat), traction, ask |
| Executive summary | TL;DR-led | TL;DR box, context, options, recommendation, next steps |
| Project / campaign | Goals-led | Goal, why now, approach (3 phases), success metrics, owner |
| Profile / portfolio | Bio-led | Headline, two-sentence intro, three highlight cards, contact |
| Event / invitation | Event card | What/when/where headline, agenda or programme, RSVP |

If the user's content doesn't fit any of these, ask which purpose is closest before designing.

### 3. Choose a visual register

Pick one register and commit. Do not mix.

| Register | Use when | Visual cues |
|---|---|---|
| Editorial | Long-form, thoughtful, nonprofit, policy | Serif headlines, ample whitespace, single accent color, minimal lines |
| Corporate | Investor, enterprise, regulator | Sans-serif throughout, restrained color, clean lines, structured grid |
| Modern startup | Product, fundraise, growth | Bold sans-serif, two-color accent system, generous spacing, soft shadows |
| Civic / nonprofit | Mission, community, grants | Warm color palette (earth tones or muted brand), clear hierarchy, room for a photo |
| Minimal | When in doubt | Black on white, one accent, large type, lots of margin |

Default to **minimal** when the user has not specified. It is hard to make minimal look bad.

### 4. Draft the HTML

Write a single self-contained HTML file. Structure:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>[Page title - real, not placeholder]</title>
  <style>
    /* Reset and base */
    /* Print rules with @page A4 margins */
    /* Layout grid */
    /* Component styles */
  </style>
</head>
<body>
  <main>
    <!-- Real content, not placeholders -->
  </main>
</body>
</html>
```

Required CSS pieces:

```css
@page {
  size: A4;
  margin: 18mm 16mm;
}

@media print {
  body { background: white; }
  /* hide interactive-only elements */
}

:root {
  --ink: #1a1a1a;
  --muted: #5a5a5a;
  --accent: [one accent color chosen for the register];
  --bg: #ffffff;
  --rule: #e6e6e6;
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  color: var(--ink);
  background: var(--bg);
  line-height: 1.45;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}
```

### 5. Fit to one page

If the content overflows, in order:

1. Tighten copy. Cut hedging words, redundant adjectives, throat-clearing sentences.
2. Tighten the layout. Reduce vertical padding before reducing font size.
3. Drop the lowest-priority section (usually the "About us" or repeated boilerplate).
4. Reduce font size last, and never below 10pt body / 22pt headline.

If still overflowing, tell the user honestly: "This content needs two pages or harder cuts. Want me to cut, or want a two-page version?"

### 6. Self-check before returning

Run this checklist:

- [ ] One page when printed (test mentally against A4 with 18mm margins, ~22 lines of body text at 11pt)
- [ ] Headline that is a sentence, not a label
- [ ] Real hierarchy: h1 once, h2 for sections, h3 for sub-items
- [ ] Body copy in plain English, no jargon the audience doesn't share
- [ ] Numbers are specific (not "many users" - say "12,400 users")
- [ ] A clear next step or ask at the bottom
- [ ] No `[Your X here]` placeholders unless the user explicitly needs to fill one in
- [ ] Contrast OK (do not use light grey text on white)
- [ ] Renders offline (no external resources requested)
- [ ] Document language and title are set

## Response Shape

Return, in this order:

1. **Two-line description** of what you built and why those design choices.
2. **The HTML file** in a single code block, ready to save as `one-pager.html`.
3. **Print instructions**: "Open in a browser. Use Print → Save as PDF. Set paper size A4 (or Letter), margins Default."
4. **Open gaps** flagged: anything marked `[TODO: ...]` the user needs to complete, listed explicitly.
5. **One offered variant** (optional, one sentence): "If you'd prefer the corporate register instead of minimal, say so and I'll re-cut."

Do not offer 3-5 design variations unless asked. Pick the best one for the brief and explain why.

## Edge Cases

- **User pastes a wall of text with no structure**: extract the four ingredients yourself, restate them back to the user in one block, design from there. If you cannot find any ask or audience, ask.
- **User wants a logo / image but supplies none**: leave space and mark with `[TODO: place 120x40 logo here]`. Do not invent SVG logos.
- **User wants brand colors but supplies none**: use a neutral accent (slate blue `#2d4a6b` or muted green `#4a7c59` or warm rust `#a3543a`). Ask if they have brand colors to swap in.
- **Content is too thin for a one-pager** (three bullet points and no substance): say so. Ask for the missing context (problem, audience, ask) before designing.
- **User asks for multi-page**: politely scope out - this skill is one-pager. Suggest the `pptx` or `docx` skills instead.

## Anti-patterns - never do these

- Multiple H1s on the page.
- Decorative emojis sprinkled as "design" (a single icon character in a callout is fine if purposeful).
- Generic stock copy ("We deliver innovative solutions") - if the user gave you generic copy, sharpen it or push back.
- A "Contact us" footer with no real contact.
- Centered body text (only headlines and short callouts).
- All-caps body copy.
- Background gradients that bleed across the page edge in print.
- Font sizes that change print pagination unpredictably.

## References

- `references/layout-patterns.md` - the six layout patterns with skeleton HTML for each.
- `references/visual-registers.md` - the five visual registers with palette and type recipes.
- `templates/minimal.html` - starter template in the minimal register.
