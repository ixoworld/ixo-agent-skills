# Studio: formats, variants and options

The reader picks an output and customises it, as in NotebookLM's Studio. Unlike a notebook tool, every output here rests on a certificate whose authenticity was checked first, and says so.

## Options shared by every format

| Option | Values | Default |
| --- | --- | --- |
| Audience | `funder` (deciding whether to pay for this outcome), `board` (needs a short, plain account), `community` (the people the programme served), `press` (a journalist with no background) | `funder` |
| Language | English, Afrikaans, isiXhosa, isiZulu, Kiswahili, French, Portuguese, Spanish, Arabic, Hindi | English |
| Length | `short`, `default`, `long` (sizes below) | `default` |
| Focus | Free text from the reader, up to about 500 characters. It shapes emphasis and never overrides the rules. | none |

A prompt copied from IXO Reporter states these options in words ("Write it in isiZulu for the community the programme served"). Map them to the values above.

## Formats and variants

| Format | Variant | NotebookLM analogue | Best for | Default for |
| --- | --- | --- | --- | --- |
| Narrative report | `briefing` | Briefing doc | Decision makers who need the result, the figures and the gaps, fast | funder, board |
| | `impact-story` | Blog post | Readers who want what happened and why it matters, in prose | community, press |
| | `funder-report` | Custom report | A funder deciding on payment: claim, evidence, verification, gaps, decisions it supports | on request |
| Presentation | `detailed` | Detailed deck | Slides read without a presenter | funder, community, press |
| | `presenter` | Presenter slides | Sparse slides with speaker notes | board |
| Mind map | `overview` | Mind map | Achieved, who was involved, how it was measured, evidence, what is not confirmed | all |
| | `evidence-trail` | (none) | Claim → figures → checks → what is not confirmed, for reviewers | on request |
| Podcast | `deep-dive` | Audio Overview: Deep dive | Two hosts unpacking the outcome | all |
| | `brief` | Audio Overview: Brief | One voice, the essentials | on request, or `short` |
| | `critique` | Audio Overview: Critique | A reviewer tests what the certificate does and does not show | on request |

NotebookLM's Debate format is left out: arguing positions invites claims the certificate does not support. A critique covers the need for a sceptical reading.

## Sizes

| Format | short | default | long |
| --- | --- | --- | --- |
| Narrative | about one page (450 words) | about two pages (900 words) | about four pages (1,800 words) |
| Presentation | about 5 content slides | about 8 | about 12 |
| Mind map | 2 levels | 3 levels | 4 levels (counting the centre) |
| Podcast | about 3 minutes (450 words) | about 6 minutes (900 words) | about 10 minutes (1,500 words) |

A certificate with few figures cannot fill a long report honestly. Say more about what the figures mean and what is not recorded; do not pad.

## What Reporter always adds

The renderer adds these; you do not write them:

- a title block with the seal, the result, the check date, who checked it, the date the figures are as at and the certificate link;
- the sample label, for synthetic examples;
- the QR code, when the certificate has a link;
- the sources list;
- the disclaimer.

For a presentation the title block is the first slide and the sources are the last. For a podcast they go in the show notes and at the top of the script, not in the spoken lines.
