---
name: ixo-reporter-presentation
description: Build a grounded slide deck (detailed deck or presenter slides with notes) from an IXO outcome certificate that the ixo-reporter skill has verified, with the result and check date on the first slide, every figure cited and Reporter's seal, link and QR code included. Use when asked for slides, a deck, a presentation, a PowerPoint or Google Slides about an IXO outcome certificate or a reporter.ixo.world link.
license: Apache-2.0
compatibility: Needs the ixo-reporter skill and Node.js 22 or later.
allowed-tools: shell
metadata:
  author: IXO
  version: "1.0.1"
  parent-skill: ixo-reporter
---

# Presentation

Turns a verified certificate into slides that open with what Reporter found and never show a figure the certificate does not state.

## Before you start

1. **Find the core skill.** It is the folder containing `scripts/reporter.mjs`: two levels up (`../..`) when this skill is nested inside `ixo-reporter`, or a sibling folder named `ixo-reporter` when installed separately. Below, `<core>` means that folder. If neither exists, stop and ask the reader to install the ixo-reporter skill from https://reporter.ixo.world/skills/.
2. **Verify first.** You need a `bundle.json` from `verify` or `example`, run in this conversation. If there is none, follow `<core>/SKILL.md` steps 1 to 3 now.
3. **Read the rules once.** If you have not read them in this conversation, read `<core>/references/grounding.md` and `<core>/references/source-bundle.md`.

## Choose the variant

| Variant | Slides look like | Default for |
| --- | --- | --- |
| `detailed` | Complete sentences on each slide, readable without a speaker | funder, community, press |
| `presenter` | Short lines on each slide, with the full account in speaker notes | board |

Sizes: `short` about 5 content slides, `default` about 8, `long` about 12. Reporter adds a title slide (seal, result, check date, link and QR code) and a closing sources slide, so do not write those. [references/variants.md](references/variants.md) has slide plans.

## Write the draft

Write `slides.json` next to the bundle:

- `format: "presentation"`, plus the variant, `bundleDigest`, audience, language, length and a title.
- `slides`: each has a title, statements (shown as bullets) and `notes` (presenter notes, also statements).
- The first content slide opens with a `check` statement: the result in the reader's language, with the lead if there is one.
- One idea per slide. Figures are `{F…}` placeholders. No digits or links in free text.
- Do not plan charts of derived numbers. A slide may show a figure large, but never a percentage or comparison the certificate does not state.

## Render

```bash
node <core>/scripts/reporter.mjs render <bundle.json> slides.json
```

The output is `presentation/slides.md`: Marp-compatible Markdown with `---` between slides and notes in HTML comments. With it come `seal.svg`, `qr.svg` (when there is a link) and a copy of the draft. If `render` lists issues, fix them all and run it again.

## Make the deck the reader wants

`slides.md` works as it is in Marp and in Markdown viewers. For PowerPoint, Google Slides, Keynote or a brand template, follow `<core>/references/media-handoff.md`.

- Keep slide 1 as Reporter made it: seal, result, date, link and QR code.
- Keep the sources slide last.
- Carry the notes into the speaker notes.

Then extract the deck's text, including the notes, and check it:

```bash
node <core>/scripts/reporter.mjs check <bundle.json> <extracted.txt> --allow-numbering
```

## Deliver

Tell the reader what you made and the result it opens with. Give the files as `<core>/references/hosts.md` describes.
