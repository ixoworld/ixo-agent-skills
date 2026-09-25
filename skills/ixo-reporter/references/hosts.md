# Running in different agents

The skill needs two things: a shell with Node 22 or later, and network access to the services that hold certificates. Where either is missing, it uses Reporter's hosted check and says so.

## Network access

`verify` contacts only these hosts. Allow them if your environment asks for an allowlist.

| Host | Why |
| --- | --- |
| `blocksync-graphql.ixo.earth`, `testnet-blocksync-graphql.ixo.earth`, `devnet-blocksync-graphql.ixo.earth` | Looks up issuer identities |
| `ipfs.gateway.ixo.world` | Downloads public certificates stored on IPFS |
| `vfs.ixo.earth`, `testnet.vfs.ixo.earth`, `devnet.vfs.ixo.earth` | Downloads public certificates stored in IXO's file service |
| `reporter.ixo.world` | Reporter's hosted check, used when the hosts above cannot be reached; also its settings, to spot an outdated skill |

It sends only the certificate link. It never sends anything about the reader, and it never uses credentials. If your sandbox requires a proxy (`HTTPS_PROXY`), the command line uses it automatically on Node versions that support it.

## Without a shell or without network

Take the token, the part of the link after `#r=`, and fetch this with your web tool:

```
https://reporter.ixo.world/api/agent/verify?r=<token>
```

It returns the bundle as JSON, checked by Reporter's service (`checkedBy: "reporter-service"`). Some fetch tools only open links the user has sent. If yours refuses, show the reader the exact URL and ask them to paste it back.

Without a shell you cannot run `render` or `check`. You may still write an output by hand, following grounding.md exactly:

1. Open with the provenance lines: the result, check date, who checked it and the link.
2. Copy fact values exactly from the bundle, with their ids.
3. Tag each statement's basis.
4. End with the sources and the disclaimer.
5. Label the output "Written without Reporter's renderer; its wording was not checked by Reporter".

## Where files go, and how to deliver them

Every command writes into a new folder and never overwrites anything. `render` puts its folder (`narrative/`, `presentation/`, `mind-map/`, `podcast/`, with `-2`, `-3`… for repeats) beside the bundle, or inside `--out DIR`. `verify` and `example` put theirs inside `--out DIR` or, by default:

| Environment | Folder | How the reader gets the files |
| --- | --- | --- |
| IXO Companion (capsule sandbox) | `/workspace/data/output/ixo-reporter/` | Call `artifact_get_presigned_url({ path })` for each file you hand over, and give the reader the links. |
| claude.ai and the Claude apps | `/mnt/user-data/outputs/ixo-reporter/` | Files there are shown to the reader. Mention them by name. |
| Claude Code, Codex, a local terminal | `./ixo-reporter-output/` | Give the paths. |

## Installing

Get the skill from https://reporter.ixo.world/skills/.

- **claude.ai and the Claude apps.** Upload `ixo-reporter.zip`, then the zip of each format you want, as skills. Code execution must be on. Allow network access to the hosts above, or rely on the hosted check.
- **Claude Code.** Unzip `ixo-reporter-skills.zip` into `~/.claude/skills/` for all projects, or `.claude/skills/` for one.
- **Codex.** Unzip `ixo-reporter-skills.zip` into `~/.codex/skills/`. Codex's sandbox blocks network by default: approve network access for `reporter.mjs verify`, or use the hosted check.
- **IXO Companion.** Published as the `ixo-reporter` capsule on the IXO skills server. Companion loads it by name.
- **Skills API and other agents without network.** `verify` cannot reach any certificate. Use `example` to try it, or pass a bundle fetched elsewhere to `render`.
- **Other agents that accept Agent Skills.** Use the same zips.

Each format skill needs the core skill. Installed separately, a format skill finds the core as a sibling folder named `ixo-reporter`. If it cannot, it stops and asks the reader to install it.
