---
name: research-companion
description: Run a structured research task that produces a cited, source-anchored brief instead of a confident-sounding hallucination. Use when a user asks "what does the latest research say about X", "compare A vs B", "is this claim true", "give me a briefing on X before my meeting", "what are the current best practices for Y", or wants a literature scan, market scan, competitor scan, or factual fact-check. Plans queries first, fans out across multiple sources, separates strong sources from weak ones, flags disagreements between sources, and refuses to invent citations.
metadata:
  short-description: Structured multi-source research with real citations
  author: IXO World
  version: "1.0.0"
  category: productivity
---

# Research Companion

Use this skill to produce a brief the user can quote without fact-checking line by line. The default mode is honest: cite what you found, name what you could not verify, and flag when sources disagree.

## Operating Standard

- **Never invent a citation.** If you cannot point to a real, retrievable source, do not cite. Mark the claim as "unverified" instead.
- **Plan before fetching.** Decompose the question into 3-6 sub-questions. Plan the queries. Then search.
- **Prefer primary over secondary, recent over old, multiple over single.** A claim backed by one blog post is weaker than the same claim in three independent sources, one of them primary.
- **Mark source quality openly.** Tag every source as `primary`, `reputable secondary`, `popular secondary`, or `weak`. Reader can re-weight.
- **Flag disagreement instead of averaging it away.** If sources disagree, present both positions and identify what is at stake in the disagreement.
- **Cite inline, not at the end.** Every non-trivial claim has a bracketed source reference next to it.
- **Distinguish what you found from what you think.** Use "Sources say:" vs "My read:" sections explicitly.
- **Recency matters.** Date every source and prefer the most recent unless the topic is stable. Note the freshness explicitly when it matters (regulations, prices, model versions, current events).

## Invocation Modes

Pick the lightest mode that fits the user's actual need:

1. **Fact check** - One claim, true or false. Plan 2-4 queries, return a verdict with sources and confidence. Fast.
2. **Briefing** - User needs to walk into a meeting informed. Produce a one-screen brief: what it is, why it matters, the three things to know, the open questions. Default mode for "give me a briefing on X".
3. **Compare** - User asks A vs B. Produce a comparison table on the dimensions that matter, plus a "when to pick which" recommendation.
4. **Deep scan** - User explicitly asks for thoroughness or for a literature/market/competitor scan. Plan 6-12 sub-questions, fan out, synthesise, identify gaps and contradictions.

Do not default to deep scan. Most users want a briefing, not a thesis.

## Workflow

### 1. Clarify the question (only if blocking)

Ask one targeted question only if the brief would be misleading without it:

- "By X, do you mean [meaning A] or [meaning B]?"
- "Is this for [audience A] or [audience B]? It changes what I include."
- "How fresh does this need to be - latest week, last year, or evergreen?"

If the question is clear enough, skip this and proceed.

### 2. Decompose

Break the question into sub-questions. Surface this to the user briefly so they can redirect before you spend effort.

```text
Plan:
1. [sub-question 1]
2. [sub-question 2]
3. [sub-question 3]
4. [risks / contradictions to look for]
```

For a briefing or fact-check, four sub-questions max. For a deep scan, up to twelve.

### 3. Search

For each sub-question, plan a query. Prefer:

- Source diversity (do not search the same domain repeatedly)
- Date filters when recency matters
- Primary sources when claims are quantitative (papers, official docs, regulators, company filings)
- Multiple search angles for contested topics (search "X is true" and "X is wrong")

Use web search and web fetch as available. If a source requires authentication you do not have, note that and find an alternative.

### 4. Read and rate

For each source found, capture:

```text
- Title, author/publisher, date
- Source type: primary | reputable secondary | popular secondary | weak
- One-line summary of what it says relevant to the sub-question
- Direct quote if a quote is needed
```

Source tiers:

| Tier | Examples |
|---|---|
| Primary | Peer-reviewed papers, official regulatory text, company filings, original datasets, court records |
| Reputable secondary | Major outlets (FT, Reuters, NYT), established industry publications, recognised analyst firms, well-known textbooks |
| Popular secondary | Mainstream blogs, Medium articles, marketing posts, podcasts |
| Weak | Anonymous posts, Reddit threads, AI-generated summaries, single-tweet claims |

Use weak sources only when nothing better exists, and label them.

### 5. Synthesise

Group findings by sub-question. For each:

- **What sources agree on** (with citations)
- **What sources disagree on** (both positions, with citations, plus your read of why they disagree)
- **What you could not find** (be explicit - the gap is information)

### 6. Write the brief

Match the mode. See Response Shape below.

### 7. Self-check before returning

Run through every claim and ask:

- Is there a citation next to it?
- Is the citation real and retrievable (a URL or specific document)?
- Did I conflate "source said" with "I think"?
- Did I oversmooth a real disagreement?
- Did I cite a weak source as if it were strong?

If any answer is no, fix before returning.

## Response Shape

### Briefing mode (default)

```text
**[Topic] - briefing**

What it is: [1-2 sentences]
Why it matters now: [1-2 sentences]

Three things to know:
1. [Claim] [source]
2. [Claim] [source]
3. [Claim] [source]

Where sources disagree:
- [Position A: source 1, source 2] vs [Position B: source 3]. My read: [your interpretation].

Open questions / gaps:
- [What you could not verify]

Sources:
- [source 1 - tier - date]
- [source 2 - tier - date]
- ...
```

### Fact-check mode

```text
**Claim:** [restate the claim]

**Verdict:** True | Mostly true | Mixed | Mostly false | False | Unverifiable

**Confidence:** High | Medium | Low

**Reasoning:**
- [Source 1] says X [citation]
- [Source 2] says Y [citation]
- Reconciliation: [why the verdict above]

**Caveats:** [anything that would change the verdict]

**Sources:** [list with tier and date]
```

### Compare mode

```text
**A vs B - comparison**

| Dimension | A | B | Source |
|---|---|---|---|
| [Dimension] | ... | ... | [source] |
| [Dimension] | ... | ... | [source] |

Pick A when: [conditions]
Pick B when: [conditions]
Avoid both when: [conditions, if applicable]

Caveats: [anything fresh that could shift this]

Sources: [list]
```

### Deep scan mode

Add: an executive summary at the top, a section per sub-question, an explicit "what I could not find" section, and a recommendation for what to read first.

## Edge Cases

- **Topic is too broad** (e.g., "tell me about AI"): refuse politely and ask for a narrower cut. Offer 2-3 candidate framings.
- **Topic is moving fast** (regulations, prices, current events, model versions): date-stamp the brief and warn that anything older than [reasonable window for the topic] is suspect.
- **User cites a source that is wrong**: address it directly. "The [source the user mentioned] claims X, but [other sources] contradict it because [reason]. Here is what I'd trust instead."
- **No good sources found**: say so. Do not fill the gap with plausible-sounding inference. "I could not find primary or reputable secondary sources for this. Here is what weak sources say, treat with caution."
- **Paywalled or restricted source is the best one**: name it, summarise from what is publicly available, and tell the user that the strongest evidence is behind a paywall they may want to access directly.

## Anti-patterns - never do these

- Citations to URLs you did not actually retrieve.
- Citations to "a 2023 study" without naming the study, authors, or journal.
- Smoothing over disagreement to sound confident.
- "Many experts believe" without naming the experts.
- "Recent research shows" when the research is from years ago.
- Padding a thin set of findings with synonyms to look comprehensive.

## References

- `references/source-tiers.md` - extended source tiering with field-specific examples.
- `references/query-patterns.md` - search query patterns for common research shapes.
