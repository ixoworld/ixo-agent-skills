---
name: ixo-reporter-narrative
description: Write a grounded narrative report (briefing, impact story or funder report) from an IXO outcome certificate that the ixo-reporter skill has verified, with every figure cited and Reporter's seal, check date and link included. Use when asked for a report, write-up, briefing, summary document, blog-style story or Word or PDF document about an IXO outcome certificate or a reporter.ixo.world link.
license: Apache-2.0
compatibility: Needs the ixo-reporter skill and Node.js 22 or later.
allowed-tools: shell
metadata:
  author: IXO
  version: "1.0.1"
  parent-skill: ixo-reporter
---

# Narrative report

Turns a verified certificate into prose a funder, board, community or journalist can read in a few minutes, where every figure is the signed figure and every interpretation says it is one.

## Before you start

1. **Find the core skill.** It is the folder containing `scripts/reporter.mjs`: two levels up (`../..`) when this skill is nested inside `ixo-reporter`, or a sibling folder named `ixo-reporter` when installed separately. Below, `<core>` means that folder. If neither exists, stop and ask the reader to install the ixo-reporter skill from https://reporter.ixo.world/skills/.
2. **Verify first.** You need a `bundle.json` from `node <core>/scripts/reporter.mjs verify "<link>"`, or `example <id>`, run in this conversation. If there is none, follow `<core>/SKILL.md` steps 1 to 3 now. They cover telling the reader the result and stopping when outputs are not allowed.
3. **Read the rules once.** If you have not read them in this conversation, read `<core>/references/grounding.md` and `<core>/references/source-bundle.md`.

## Choose the variant

| Variant | Use it for | Default for |
| --- | --- | --- |
| `briefing` | The result, the figures, the gaps, what to do next | funder, board |
| `impact-story` | What happened and why it matters, in flowing prose | community, press |
| `funder-report` | A structured basis for a funding decision | a funder who asks for a decision, payment or due diligence |

Lengths: `short` about 450 words, `default` about 900, `long` about 1,800. [references/variants.md](references/variants.md) has a section plan and a tone guide for each variant. Follow its plan unless the reader asked for something else.

## Write the draft

Write `narrative.json` next to the bundle:

- `format: "narrative"`, plus the variant, `bundleDigest` (copy the bundle's `digest`), audience, language, length and a title.
- `sections`: each has a heading and a list of statements.
- The first statement of the first section is a `check` statement giving the result in the reader's language. If the bundle has a `lead`, that statement conveys it.
- Every figure is a `{F…}` placeholder. Free text has no digits and no links.
- Interpretations are `reading` statements citing what they rest on. Gaps are `missing` statements.
- Write for the audience. A community report speaks to the people served and avoids funding jargon. A press story explains what an outcome certificate is in one plain sentence.

## Render

```bash
node <core>/scripts/reporter.mjs render <bundle.json> narrative.json
```

It either writes a new `narrative/` folder beside the bundle, containing `report.md`, `seal.svg`, `qr.svg` (when there is a link) and a copy of the draft, or lists every rule the draft breaks. Fix them all and run it again. Warnings about length are advice.

## Make the document the reader wants

`report.md` is complete and readable as it is. If the reader wants Word, PDF, Google Docs or a house template, follow `<core>/references/media-handoff.md`: hand the tool `report.md`, `seal.svg` and `qr.svg`, then check the text of what it produced:

```bash
node <core>/scripts/reporter.mjs check <bundle.json> <extracted.txt>
```

## Deliver

Tell the reader in a sentence or two what you made, for whom, and the result it opens with. Give the files as `<core>/references/hosts.md` describes. If a check failed and you delivered Reporter's Markdown instead, say so.
