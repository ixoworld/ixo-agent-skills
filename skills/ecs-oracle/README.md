# ECS Oracle Data Skill

Server-side data pipeline for the ECS / SupaMoto oracle. This skill runs
**inside the user's sandbox container**: it fetches each dataset from the
ECS server's REST endpoints (gzip-compressed JSON), writes the result to
R2 as a gzipped artifact (`.json.gz`) via the FUSE mount, and exposes a
DuckDB-backed query entry point over those artifacts. The oracle process
itself only ever sees a short metadata envelope on stdout.

For agent-facing instructions, see `SKILL.md`. This README is for skill
maintainers.

## Layout

```
scripts/
  fetch.js           Entry: GET ECS REST endpoint → gzip → write to R2 → print metadata
  query.js           Entry: run a DuckDB SELECT against a vaulted .json.gz artifact
  lib/
    runtime.js       Shared path / secret / emit / timing helpers
package.json         Declares `@duckdb/node-api` dep. Sandbox runs `bun install` on load_skill.
SKILL.md             Agent-facing instructions + SQL grammar.
```

## Why one dependency, and why DuckDB?

The skill needs to answer ad-hoc questions over tabular data ("how many
customers in ZM?", "top 10 countries by active subscriptions"). A handwritten
pure-JS grammar limits what the agent can ask; DuckDB lets the agent write
ordinary SQL (aggregates, GROUP BY, CTEs, window functions, JOINs) and we
let the database do the work.

`@duckdb/node-api` is the official Node binding. The sandbox runs
`bun install` automatically when it loads the skill, so prebuilt native
binaries are pulled at extract time — no manual `npm install` at runtime.

## Sandbox resource profile

The skill is designed to run on the `standard-1` sandbox tier (4 GB RAM).
For a typical ECS response (~60 MB on the wire) peak memory inside the
container stays in the low hundreds of MB. The artifact is written to disk
as a single JSON document; DuckDB streams from that file via
`read_json_auto(path)` on every query, so query-time memory is bounded by
the result size, not the input size. The oracle never receives the rows —
only the ~2 KB envelope from `fetch.js` and the (≤ 100 KB) result envelope
from `query.js`.

## Building & publishing

This skill folder is what gets tar.gz'd and uploaded to the
`ai-skills` registry. To publish:

```
cd /Users/michael/dev/ixo/skills/skill-testing
# tar -czf ecs-oracle.tar.gz skills/ecs-oracle  (or use the skills tooling)
# upload to ai-skills service — receives the CID back
```

The oracle prompt references the skill by **name** (not CID), so each call
resolves to whatever the latest published version is on the skills registry.

## Smoke testing locally

You can run the skill outside the sandbox for development. You'll need
`node >=20` and a one-time `npm install` (or `bun install`):

```bash
cd /Users/michael/dev/ixo/skills/skill-testing/skills/ecs-oracle
npm install

export _ORACLE_SECRET_ECS_MCP_URL='https://supamoto-onboarding.devmx.ixo.earth/mcp'
export _ORACLE_SECRET_ECS_MCP_AUTH_TOKEN='<bearer>'
# The `/mcp` suffix is fine — fetch.js strips it and hits /data/* under the same host.
# (ECS_BASE_URL / ECS_API_TOKEN are also accepted, as cleaner local-dev aliases.)

# Note: writes to /workspace/data/output/... by default. Override OUTPUT_ROOT
# in lib/runtime.js for local dev, or just run inside a container that has
# /workspace.

node scripts/fetch.js customers
# … reads the artifact.path from the output …
node scripts/query.js <artifact.path> "SELECT count(*) AS n FROM {table} WHERE country = 'ZM'"
```

## Adding a new dataset

1. Add an entry to `DATASETS` in `scripts/fetch.js` with the ECS tool name,
   default args, the path to the row array, and the path to the total.
2. Update `SKILL.md` to document the new slug for the agent.
3. Bump `version` in `package.json` + the `SKILL.md` frontmatter.
4. Re-publish to ai-skills.

## What it deliberately does NOT do

- Run arbitrary mutating SQL — `query.js` rejects anything that isn't a
  single read-only `SELECT` / `WITH ... SELECT` (no INSERT/UPDATE/CREATE/
  ATTACH/COPY/INSTALL/LOAD/PRAGMA/SET).
- Return unbounded result sets. The 100 KB envelope cap kicks in before
  the result hits stdout; oversized queries return `RESULT_TOO_LARGE` with
  recovery guidance.
- Generate presigned R2 URLs. The agent uses the sandbox's
  `artifact_get_presigned_url` MCP tool after this skill returns — and
  only when the user wants to render the data, not for agent-internal Qs.
- Validate the upstream wire payload with a schema library. The MCP
  response is parsed once and forwarded verbatim; the dataset config in
  `fetch.js` (`rowsAt` key) is the only contract we assert on.

## Future improvements

- **Convert JSON → Parquet on fetch** so DuckDB queries get column pruning
  and ~10× smaller files. Worth doing when datasets grow past ~250 MB.
- **Streaming fetch** with chunked reads. Not necessary at current data
  sizes, but worth adding if datasets grow past ~500 MB.
- **Pagination** for `customers` when the upstream `hasMore` flag is set.
  Today we pass `limit: null` to grab everything in one call; we should
  loop when the server starts splitting big responses.
