---
name: error-resolver
description: Resolve IXO and Cosmos blockchain errors from codes, codespaces, failed transaction JSON, raw CLI output, logs, or transaction hashes. Use when a user asks why an IXO/Cosmos transaction, ixod command, validator operation, DID/entity/claim/bond action, IBC flow, or SDK call failed and needs a beginner, developer, or validator-grade explanation with concrete next steps.
---

# Error Resolver

Diagnose IXO/Cosmos blockchain errors and turn low-level failure output into a clear explanation, likely cause, and next action. The skill is read-only: never sign, submit, retry, or mutate chain state unless the user separately asks for that work.

## Instructions

1. Preserve the exact error artifact before interpreting it. Prefer full JSON, `raw_log`, `codespace`, `code`, command output, and what the user was trying to do.
2. Determine the audience from the request. Default to `beginner`; use `developer` for CLI/SDK/debugging requests and `validator` for node, staking, slashing, jailing, or operator incidents.
3. Resolve against the local catalog first. Prefer exact `codespace/code`, then exact message, then constrained keyword matching.
4. If the user only provides a transaction hash, explain that the skill cannot query chain state by itself. Ask for the transaction response, RPC endpoint, or the `code/codespace/raw_log` from the explorer or CLI.
5. If multiple errors match, show the most likely diagnosis only with `needs_clarification: true` and ask one targeted question for the missing codespace, module, or full log.
6. Keep guidance safe. Never ask for seed phrases, private keys, or unredacted credentials. Do not recommend deleting validator keys, resetting chain state, or replaying transactions without first explaining risk and backup requirements.

## Response Shape

Return or write:

- Error identity: `codespace/code` when known, plus the matched message.
- Plain-English explanation of what happened.
- Most likely cause, followed by other plausible causes if confidence is not high.
- Ordered resolution steps. Put the lowest-risk verification step first.
- CLI commands only when they are read-only or clearly labelled as a transaction the user must review before signing.
- Confidence: `high`, `medium`, or `low`.
- Clarifying question when the available artifact is ambiguous.

## Resources

- `scripts/handlers.ts` exports `resolveError(args, context)` and `main(args)` and can be run as a CLI resolver.
- `scripts/error-database.ts` contains the IXO/Cosmos error catalog.
- `scripts/types.ts` contains Zod schemas and Qi handler types.
- `scripts/test-resolver.ts` contains regression tests for parser, matching, transaction-hash handling, and CLI-safe output.

Run the resolver from this skill directory:

```bash
npm ci
npm run resolve -- --input "code: 11 codespace: sdk raw_log: out of gas" --level developer
```

Run the regression checks:

```bash
npm test
```

## Catalog Maintenance

When adding an error, add a full `ErrorEntry` with `code`, `codespace`, `message`, `explanation`, `causes`, `resolution`, `severity`, and `category`. Use the canonical module codespace from chain output. After changing the catalog or parser, run `npm test` from this skill directory, then run the repository validator from the repo root:

```bash
./scripts/validate-skill.sh skills/error-resolver
```
