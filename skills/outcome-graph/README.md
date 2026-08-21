# Outcome Graph

Guides a user from a theory of change to a validated causal model and an evidence graph of
linked verifiable claims — through seven phases, with deterministic checks and human gates —
toward issuance of a digital outcome certificate.

Written for the QiForge oracle runtime: runs in the user's sandbox, writes each run to
`/workspace/data/output/outcome-graph/runs/<workflow_id>/`, and renders the run as a canvas
in the conversation via the `render_outcome_graph` AG-UI action.

## Do not edit this directory

It is **generated**. The source of truth is
[ixoworld/outcome-graph](https://github.com/ixoworld/outcome-graph), where the schemas,
references and deterministic tools it vendors are maintained:

```bash
git clone https://github.com/ixoworld/outcome-graph
cd outcome-graph && npm install
node scripts/make-capsule.mjs --out <path-to>/ixo-agent-skills/skills
```

Then commit the result here and open a PR. Merging to `main` runs
`.github/workflows/publish-skill.yml`, which publishes this directory to
`capsules.skills.ixo.earth` and logs the content-addressed `cid` an oracle references.

## What is inside

| | |
|---|---|
| `SKILL.md` | The orchestrator: seven phases, the state machine, the issuance gates |
| `prompts/` | The six specialist roles as per-phase briefs |
| `scripts/run.mjs` | The host-invoked deterministic gate for phase completion and run integrity |
| `scripts/check-graph.mjs`, `validate.mjs` | The deterministic checks the agent defers to |
| `schemas/`, `references/`, `templates/` | The artifact contracts and the guidance that interprets them |
| `examples/clean-water/` | One worked run, so every artifact shape has a concrete example |

A QiForge oracle runs **one** agent where the original pipeline ran six specialists in
separate contexts, so role isolation is gone. `run.mjs plan` freezes named, versioned gate
criteria; `run.mjs advance` independently executes them over one parsed candidate, commits
through a manifest compare-and-swap, refuses v1 or unbound envelopes, and verifies host-signed
human decisions and issuance authorizations. Repaired candidates also require a content-addressed
supersession event that the host persists and registers with the transition. The Portal must
mediate the command and protect committed control records from generic agent writes; colocated
hashes are integrity checks, not authorization.

## Runtime

Injected context: `_SKILL_CONTEXT_USER_DID` (becomes `issuer_context.issuer.did`),
`_SKILL_CONTEXT_SANDBOX_ID`, `_SKILL_CONTEXT_TIMESTAMP`, and the base64 Ed25519
`OUTCOME_GRAPH_REVIEW_PUBLIC_KEY`, used for both review decisions and issuance authorizations.
Secrets `EVALS_ENGINE_URL` and `EVALS_ENGINE_TOKEN` are needed only for issuance runs; a
diagnostic run needs none and the skill says so rather than failing.

`OUTCOME_GRAPH_RUNS` overrides the runs root for local testing.
