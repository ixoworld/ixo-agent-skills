# Explaining an Outcome Graph to people

Use this reference before every user-facing update. The graph, contracts, and checks are the
working record. The conversation should help a person understand how change is expected to happen
in the real world.

## The conversation has a different job from the audit record

Do not narrate the software. Explain the causal learning.

The main response should answer four questions:

1. What do we understand about the change the user wants to create or assess?
2. Why might one change lead to the next in real life?
3. What would have to be true, and what could break the chain?
4. What will we learn or decide next?

Commands, file paths, schema names, hashes, manifest revisions, machine states, gate names, task
contracts, verification envelopes, and internal draft counts do not answer those questions. Keep
them out of the main response. Show them only when the user asks for technical detail, when a host
or developer must troubleshoot the run, or when an authority record needs inspection. Put them
last under `Technical details`.

Do not respond to a successful internal command by explaining its implementation. Translate the
result into what is now possible or understood. Do not tell the user to run the next internal gate.
Continue through safe internal work yourself and pause only for a real choice, missing knowledge,
or protected action.

## Explain causality as a claim about reality

A graph is not mainly boxes and arrows. Each arrow is a claim that something in the world changes
something else. Explain important links in this form:

> When [action or condition], [person, group, institution, or system] changes [immediate state].
> This could lead to [later outcome] because [real-world process]. It depends on [conditions]. We
> would expect to observe [signal] if this is happening.

For each important path, make these ideas easy to see:

- What the programme or actor actually does.
- Who or what responds first.
- The process that connects the response to the intended outcome.
- The outside conditions that can strengthen, weaken, or reverse the result.
- What would be different without the intervention or under the usual alternative.
- What evidence would distinguish a real effect from a plausible story.

Use ordinary language before technical terms. If a term helps the user learn, explain it once:

- A **mechanism** is the real-world process that carries change from one step to the next.
- An **assumption** is something the pathway depends on but has not established.
- A **confounder** is another factor that could produce the same pattern and fool us about the
  cause.
- A **counterfactual** is the useful comparison: what would probably happen without this action or
  with the normal alternative.
- Evidence for two events is not automatically evidence that one caused the other. Evidence for
  causality must help rule out coincidence, reverse direction, and credible alternative causes.

Do not give a lecture. Introduce an idea when it helps explain the user's graph.

Examples in this reference demonstrate form and tone only. Never copy their domain facts into a
different run. Every named action, actor, condition, outcome, and alternative cause must come from
the user's source or be clearly introduced as a question or model proposal. If the source has not
been read yet, say what you will look for instead of supplying a generic causal story.

## Keep four kinds of knowledge separate

Use plain signals so the user can tell how strong each statement is:

- `The source says...` for an explicit statement in the supplied material.
- `The current model proposes...` for a causal interpretation or added link.
- `The evidence shows...` only when admissible evidence supports the statement at that strength.
- `We still do not know...` for an unresolved assumption, competing explanation, or evidence gap.

Never turn a coherent story into a causal conclusion. Never hide uncertainty behind words such as
`validated`, `plausible`, `tier`, or `supported`. Translate the practical meaning. For example:

- Instead of `This edge is hypothesized`, say `This link is a reasonable proposal, but we have not
  yet shown that the first change produces the second.`
- Instead of `The attainable tier is 2`, say `The evidence can support a contribution claim, but
  not a claim that the programme caused the outcome.`
- Instead of `REVIEW_REQUIRED`, say `We need an authorised person to decide whether this assumption
  is acceptable.`

## Write like a thoughtful guide

- Start with the most useful conclusion, not the phase name or an implementation update.
- Prefer concrete actors and verbs. Say who does what and what changes.
- Keep sentences short enough to read once. Vary their rhythm naturally.
- Use sentence-case headings only when they help navigation.
- Use at most one short list in a routine checkpoint. A small causal chain may use numbered steps.
- Use bold sparingly. Do not build a response from repeated bold labels and colons.
- Do not use em dashes.
- Do not restate the request, praise the user, announce obvious helpfulness, or add generic closing
  offers.
- Do not report counts unless they change the user's understanding or decision. `33 propositions`
  is bookkeeping. `Three assumptions could break the main pathway` is useful.
- Ask one question at a time. Give a recommended answer only when the evidence supports one.
- If no action is needed, say what you will do next. Do not invent a task for the user.

Before sending, ask: `What makes this sound like an agent reporting its internals rather than a
person explaining the problem?` Remove those parts.

## Default shape for a checkpoint

Use `templates/user-checkpoint.md`. In most cases the response needs only:

1. A direct title about what was learned.
2. Two to four sentences explaining the result and why it matters.
3. One short causal path or reality check when it adds understanding.
4. The next step, including one user action only when necessary.

Progress labels such as `Step 3 of 7` may appear as a quiet orientation line. Never pair them with
machine state names in the main response.

## Example: beginning an AMR analysis

Avoid this kind of update:

> The workflow is at SOURCE_ACCEPTED with manifest revision 1. A ToC extraction with 33
> propositions and a semantic review remain uncommitted. The next logical step is to execute the
> TOC_PARSED gate.

Write the user-facing meaning instead:

> ## Ready to examine how the programme could reduce drug-resistant infections
>
> I have saved the source and can now test the change story it describes. The early story appears
> to connect better diagnosis, infection control, and more careful antibiotic use with fewer
> unnecessary prescriptions and less spread of resistant infections.
>
> That chain depends on real behaviour. A diagnostic test only changes prescribing if clinicians
> receive the result in time, trust it, and can offer an affordable alternative. Those conditions
> are part of the causal model, not background detail.
>
> Next I will map the few pathways that matter most and show what would need to be true for each
> one. You do not need to do anything yet. I will pause if the source leaves a choice that would
> materially change the model.

The second version does not conceal the run state. It gives the state a meaning. Technical status
can still be retrieved when someone needs to audit or debug it.
