---
name: ixo-reporter-podcast
description: Write a grounded podcast or audio briefing script (two-host deep dive, one-voice brief, or critique) about an IXO outcome certificate that the ixo-reporter skill has verified, stating Reporter's result in the first minute, citing every figure, with show notes carrying the seal, check date and link; then hand it to a voice tool if the reader wants audio. Use when asked for a podcast, audio overview, audio briefing, radio script or narration about an IXO outcome certificate or a reporter.ixo.world link.
license: Apache-2.0
compatibility: Needs the ixo-reporter skill and Node.js 22 or later. Audio needs a text-to-speech tool.
allowed-tools: shell
metadata:
  author: IXO
  version: "1.0.1"
  parent-skill: ixo-reporter
---

# Podcast

Writes an audio briefing about a verified certificate: the result in the first minute, figures exactly as signed, interpretation said out loud as interpretation. This skill makes the script and show notes. Turning them into sound is a job for a voice tool.

## Before you start

1. **Find the core skill.** It is the folder containing `scripts/reporter.mjs`: two levels up (`../..`) when this skill is nested inside `ixo-reporter`, or a sibling folder named `ixo-reporter` when installed separately. Below, `<core>` means that folder. If neither exists, stop and ask the reader to install the ixo-reporter skill from https://reporter.ixo.world/skills/.
2. **Verify first.** You need a `bundle.json` from `verify` or `example`, run in this conversation. If there is none, follow `<core>/SKILL.md` steps 1 to 3 now.
3. **Read the rules once.** If you have not read them in this conversation, read `<core>/references/grounding.md` and `<core>/references/source-bundle.md`.

## Choose the variant

| Variant | Voices | Feels like |
| --- | --- | --- |
| `deep-dive` (default) | Two hosts | A conversation that unpacks what the outcome is and what it means |
| `brief` | One voice | A tight news-style briefing, usually `short` |
| `critique` | A host and a reviewer | The reviewer tests what the certificate does and does not show |

Lengths at about 150 words a minute: `short` 3 minutes (450 words), `default` 6 minutes (900), `long` 10 minutes (1,500). [references/variants.md](references/variants.md) has running orders and speaking guidance.

## Write the draft

Write `podcast.json` next to the bundle:

- `format: "podcast"`, plus the variant, `bundleDigest`, audience, language, length and a title.
- `speakers`: one or two voices, each with an id and a display name. Use neutral names; do not imitate real presenters.
- `turns`: each has a speaker and statements. Within the first 150 words, a `check` statement says the result, with the lead if there is one. For a synthetic example it also says so aloud, citing `sample`. Greetings, questions and the sign-off are `framing` statements.
- Write for the ear: short sentences, figures said with their unit ("{F2}"), no lists of identifiers.
- Say interpretations as interpretations ("my reading is…", "that suggests…") and gaps as gaps ("the certificate doesn't say who evaluated it").
- Invite listeners to check it themselves at reporter.ixo.world. The exact link and QR code go in the show notes, not in speech.

## Render

```bash
node <core>/scripts/reporter.mjs render <bundle.json> podcast.json
```

It writes a `podcast/` folder containing:

- `script.md`: the script, with citations and the provenance block, for review;
- `voice-lines.txt`: speaker and spoken words only, with no citations, for a voice tool;
- `show-notes.md`: the seal, result, date, link, QR code and sources;
- a copy of the draft.

## Make audio, if the reader wants it

Follow `<core>/references/media-handoff.md`. Give the voice tool `voice-lines.txt`, and publish `show-notes.md` with the audio.

- A text-to-speech tool that reads the lines as written keeps Reporter's wording.
- A tool that writes its own script, such as NotebookLM's audio overview, does not. Use one only if the reader asks, and label the audio "wording not checked by Reporter" unless you can check its transcript. Save `show-notes.md` followed by the transcript as one file, run `node <core>/scripts/reporter.mjs check <bundle.json> <that file>`, and read the transcript's first 150 words to confirm they state the result.

If no voice tool is available, deliver the script and show notes and say that audio needs one.

## Deliver

Tell the reader what you made, how long it runs, and the result it opens with. Give the files as `<core>/references/hosts.md` describes.
