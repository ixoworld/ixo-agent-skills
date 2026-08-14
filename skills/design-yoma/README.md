# design-yoma

A design skill for **Yoma opportunity providers** building **Deeds** — programmable packages of work
that a young person performs, proves, and gets paid for.

It runs inside the **IXO Portal**, driven by the personal agent oracle service, loaded from the
agent-skills capsule registry.

## What it does

Takes one opportunity provider from an idea to a published Deed, as a five-phase professional
service:

```
DISCOVERY → DESIGN → VALIDATION → TESTING → DEPLOYMENT
```

The essential move: **keep the controls in the runtime, expose the journey to the professional.**
The provider experiences five phases and records one decision at the end of each. Beneath them the
runtime enforces **twenty-five internal controls**, each producing a document that is schema-valid,
immutable, hashed, previewable and played back. None of the rigour is relaxed — it is simply not the
provider's job to administer it.

Along the way it forces the questions that a youth opportunity has to survive: is this worth a young
person's time, is it safe for them, can they actually reach it on the device and bandwidth they have,
can they prove they did it, will they be judged by rules they could have predicted, and will they
actually get paid.

## What it does not do

It **stages drafts**. It never registers an entity, signs a transaction, publishes a rubric, issues a
credential, grants an authorization, moves value, or creates a listing. Those stay behind the Portal's
own confirmation gates, owned by a human controller.

Completing five phases is also not publication:

```
five phase commitments → publication blockers resolved → independent blueprint review
  → local compilation → externally authorised publication → verified network receipt
```

It also does not reimplement work other skills own:

| Need | Routes to |
|---|---|
| `domain.md` authoring | `domain-author` |
| Flow authoring, POD creation | `manage-flow` |
| Live runtime orchestration | `flow-agent` |
| Cross-run improvement analysis | `flow-improvement-agent` |

## Layout

```
SKILL.md         entry point — the journey, safety boundary, phases, output shape
references/      five phase files, six journey-mechanics references, nine domain references
templates/       blueprint, phase commitment, review round, bid form, rubrics, flow, listing
scripts/         validate-blueprint.ts, lint-structure.sh
tests/fixtures/  worked example plus three negative cases
```

Start with `SKILL.md`. Read `references/deed-model.md` before designing any new Deed.

## Publishing

This folder is laid out as an agent-skills registry capsule. To publish:

```bash
tar -czf design-yoma.tar.gz design-yoma/
```

Then POST the archive to the capsules endpoint, or open a PR against
[`ixoworld/ixo-agent-skills`](https://github.com/ixoworld/ixo-agent-skills) under `skills/design-yoma/`.
The archive must contain `design-yoma/SKILL.md` at exactly two path components, and the folder name
must match the `name` field in the frontmatter.

## Lineage

Adapted from the IXO/Qi **Design POD** methodology, which evolved from a user-heavy sequence of gates
into a five-phase professional service with its controls held by the runtime. This applies the same
move to Yoma Deeds, adds controls for youth safeguarding, accessibility, bid design and fraud
resistance, and binds it to the real Portal action catalog rather than abstract platform tools.

## License

Apache-2.0
