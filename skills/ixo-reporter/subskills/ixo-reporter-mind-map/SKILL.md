---
name: ixo-reporter-mind-map
description: Draw a grounded mind map (overview or evidence trail) of an IXO outcome certificate that the ixo-reporter skill has verified, as a Mermaid diagram and an outline, with every figure cited and Reporter's result, check date and link included. Use when asked for a mind map, concept map, diagram, visual summary or overview map of an IXO outcome certificate or a reporter.ixo.world link.
license: Apache-2.0
compatibility: Needs the ixo-reporter skill and Node.js 22 or later.
allowed-tools: shell
metadata:
  author: IXO
  version: "1.0.1"
  parent-skill: ixo-reporter
---

# Mind map

Lays out what a verified certificate says, and what it does not, as a map a reader can take in at a glance: the result, what was achieved, who was involved, how it was measured, the evidence, and what is not confirmed.

## Before you start

1. **Find the core skill.** It is the folder containing `scripts/reporter.mjs`: two levels up (`../..`) when this skill is nested inside `ixo-reporter`, or a sibling folder named `ixo-reporter` when installed separately. Below, `<core>` means that folder. If neither exists, stop and ask the reader to install the ixo-reporter skill from https://reporter.ixo.world/skills/.
2. **Verify first.** You need a `bundle.json` from `verify` or `example`, run in this conversation. If there is none, follow `<core>/SKILL.md` steps 1 to 3 now.
3. **Read the rules once.** If you have not read them in this conversation, read `<core>/references/grounding.md` and `<core>/references/source-bundle.md`.

## Choose the variant

| Variant | Branches | Default for |
| --- | --- | --- |
| `overview` | Result · Achieved · Who was involved · How it was measured · Evidence · Not confirmed | everyone |
| `evidence-trail` | Result · The claim · The figures behind it · What Reporter checked · What nobody checked | reviewers, auditors, sceptical funders |

Depth counts the centre (the title) as level one: `short` 2 levels, `default` 3, `long` 4. Never more than 4. [references/variants.md](references/variants.md) has the branch plans.

## Write the draft

Write `mindmap.json` next to the bundle:

- `format: "mind-map"`, plus the variant, `bundleDigest`, audience, language, length and a title (the centre).
- `branches`: each node has a `label` (a statement) and `children`.
- The first branch is the result: a short `check` statement in the reader's words ("Not fully checked", "Checked and genuine"). Reporter adds its own stamp node, with the full result, check date and sample label, ahead of your branches, so keep this label short.
- Labels are short: a few words, or a figure placeholder with its name ("Participants: {F2}").
- Keep the Evidence and Not confirmed branches even when everything passed: Reporter never opens evidence files yet, and readers need to see what the certificate does not record.
- A branch with nothing recorded gets one `missing` child rather than being dropped.

## Render

```bash
node <core>/scripts/reporter.mjs render <bundle.json> mindmap.json
```

It writes a `mind-map/` folder containing:

- `mindmap.mmd`: a Mermaid mindmap, with the result, date and link as comments;
- `mindmap.md`: an outline with citations, the provenance block and the sources;
- `seal.svg`, `qr.svg` and a copy of the draft.

Labels are sanitised for Mermaid, so no directive or link can ride along. The drawing's first node is Reporter's stamp: result, check date and, for examples, the sample label.

## Show it

- **The agent can render Mermaid** (for example Claude artifacts or a Mermaid-capable canvas): show `mindmap.mmd`, with the provenance block from the top of `mindmap.md` (sample label, result, dates, who checked, link) and `seal.svg` beside it.
- **The reader wants an image or a whiteboard**: follow `<core>/references/media-handoff.md`. Pass `mindmap.mmd`, or `mindmap.md` for outline-based tools, together with `seal.svg` and `qr.svg`.
- **Otherwise**: deliver `mindmap.md` and `mindmap.mmd`.

Before handing over anything a tool made, extract its text and run `node <core>/scripts/reporter.mjs check <bundle.json> <extracted.txt>`.

## Deliver

Tell the reader what the map shows and the result it opens with. Give the files as `<core>/references/hosts.md` describes.
