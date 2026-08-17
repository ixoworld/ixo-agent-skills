# Vendored engine schemas

## evals-engine-rubric.schema.json

The live evals-engine's rubric JSON Schema — the same object it serves at
`GET /v1/rubric-schema` and parses against internally ("one source, two consumers, zero
version skew").

- **Source:** `ixoworld/evals-engine` @ `6dae503` (main, 2026-08-14),
  `src/lib/rubric/schema.ts` (`rubricJsonSchema` export).
- **Generated:** `bun run` of a one-line import of `rubricJsonSchema` (Zod 4
  `z.toJSONSchema`, `target: draft-2020-12`, `io: "input"`).
- **sha256:** `3f6eddeee75469fb5e41c734fcf18fcf7c9ac7ec8c5bf0d3a78b1f696d63c5ed`
- **Vendored:** 2026-08-15.

### Known permissiveness gaps (Zod-refine-only rules)

`z.toJSONSchema` drops `.refine()`s, so this schema is **necessary but not sufficient** —
the engine's own parse additionally enforces:

1. Scoring threshold order: `approveAt > partialFloor >= reviewFloor`.
2. `quorum.need <= quorum.of`.
3. Compound condition `atLeast <= of.length`.
4. Unique thresholds: `rejectAtBps >= reviewAtBps`.

`scripts/validate.mjs` re-checks 1–4 explicitly on our rubric examples. The "at least one of
gates/scoring" rule IS patched into the served schema (anyOf of required) and needs no extra
check.

### Re-vendoring

When upstream pushes touch `src/lib/rubric/schema.ts` (see docs/drift-watch.md):

```bash
git clone --depth 1 https://github.com/ixoworld/evals-engine /tmp/ee && cd /tmp/ee && bun install && echo 'import { rubricJsonSchema } from "./src/lib/rubric/schema"; console.log(JSON.stringify(rubricJsonSchema, null, 2));' > x.ts && bun run x.ts > evals-engine-rubric.schema.json
```

Copy the output over this file, update the commit/sha256/date above, run
`npm run validate`, and treat any new failure as a **drift finding**, not a nuisance.
