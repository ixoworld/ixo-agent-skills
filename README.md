# IXO Agent Skills

Community-contributed AI agent skills for the IXO ecosystem.

[![Skills Server](https://img.shields.io/badge/Skills%20Server-Live-brightgreen)](https://capsules.skills.ixo.earth/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## What are Agent Skills?

Agent Skills are portable, shareable packages that give AI agents new capabilities. Each skill is a folder containing a `SKILL.md` file with instructions and metadata, plus any additional resources the agent might need.

Think of skills like apps for AI agents - they can learn to fill out PDF forms, analyze data, interact with APIs, and much more.

**Learn more:**
- [What are Skills?](https://agentskills.io/what-are-skills)
- [Agent Skills Specification](https://agentskills.io/specification)

## Submit Your Skill

We welcome community contributions! To share your skill with IXO AI agents:

### 1. Fork this repository

Click the "Fork" button at the top right of this page.

### 2. Create your skill folder

Add your skill to the `skills/` directory:

```
skills/
└── your-skill-name/
    ├── SKILL.md          # Required: Instructions and metadata
    ├── prompts/          # Optional: Additional prompts
    ├── scripts/          # Optional: Helper scripts
    └── examples/         # Optional: Usage examples
```

### 3. Write your SKILL.md

Every skill needs a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: your-skill-name
description: A clear description of what your skill does
license: MIT
---

# Your Skill Name

Instructions for the AI agent on how to use this skill...
```

**Required fields:**
- `name` - Lowercase, alphanumeric with hyphens (must match folder name)
- `description` - Clear explanation of what the skill does (max 1024 chars)

**Optional fields:**
- `license` - The license for your skill (e.g., MIT, Apache-2.0)
- `compatibility` - Which AI agents this skill works with
- `allowed-tools` - Tools the agent needs access to (a string on one line, not a YAML list)
- `metadata` - Additional key-value pairs

See the [full specification](https://agentskills.io/specification) for details.

### 4. Submit a pull request

Push your changes and open a PR. Our team will review your skill for:
- Correctness and quality
- Security (no harmful prompts or scripts)
- Compliance with the specification

Once approved, your skill will be automatically published to the [IXO Skills Server](https://capsules.skills.ixo.earth/).

## Why Are Skills Reviewed?

Skills contain instructions and scripts that AI agents execute. To protect users and maintain quality:

- **Security** - We check for harmful or malicious content
- **Quality** - We ensure skills work as described
- **Compliance** - We verify skills follow the specification

This review process keeps the ecosystem safe and trustworthy.

## Example Skills

Check out the [examples/](examples/) folder for working skill examples you can use as templates.

## Using Published Skills

Once a skill is published, it receives a unique content identifier (CID). AI agents can fetch skills from our server:

```
https://capsules.skills.ixo.earth/capsules/{cid}
```

Browse all available skills:
- [Skills Server](https://capsules.skills.ixo.earth/)
- [API Documentation](https://capsules.skills.ixo.earth/docs)

## Local Validation

Before submitting, you can validate your skill locally:

```bash
./scripts/validate-skill.sh skills/your-skill-name
```

## Contributing

This repo includes bundled **skills** (in `skills/`) that extend AI agent capabilities. When adding or editing scripts inside a skill:

- **Script standards**: Follow [Script Standards for Agent Skills](SCRIPT_STANDARDS.md)
- **Rules**: Scripts must work from CLI, have a `main()` function that returns, and be documented in that skill's SKILL.md
- **Checklist**: See the checklist in [SCRIPT_STANDARDS.md](SCRIPT_STANDARDS.md) before committing any script

For full contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Resources

- [Agent Skills Website](https://agentskills.io/home)
- [Agent Skills Specification](https://agentskills.io/specification)
- [IXO Skills Server API](https://capsules.skills.ixo.earth/docs)
- [Contributing Guidelines](CONTRIBUTING.md)

## License

This repository is licensed under [Apache 2.0](LICENSE). Individual skills may have their own licenses as specified in their `SKILL.md` files.

---

**Questions?** Open an issue or reach out to the IXO team.

## Validate and build capsule archives

Use Node.js 22 and install the pinned dependencies with `npm ci --ignore-scripts`.
Run `npm run check`, `npm test`, and `./scripts/validate-skill.sh skills/qi-library` before submitting a skill.

Build committed source with its full 40-character Git SHA:

```sh
npm run build:capsules -- --commit <full-commit-sha> --repository https://github.com/ixoworld/ixo-agent-skills --skill qi-library
```

The builder reads Git blobs from that exact commit. Uncommitted edits do not enter the archive.
It writes the archive and an `unpublished` build receipt under `.capsule-build/`, outside the capsule.
The receipt records the repository claim, commit, declaration, archive SHA-256 and size, and expected folder CID.
`sourceClaim: workflow-reported` records provenance reported by this workflow; it is not a repository signature or deployment attestation.

Archives contain sorted regular files with deterministic gzip bytes, zero timestamps and owner IDs, and preserved executable modes.
Symlinks, submodules, traversal, duplicate paths, PAX records, and names over 100 UTF-8 bytes are rejected.
The folder CID uses `ipfs-unixfs-importer@16.0.2`, `blockstore-core@6.1.2`, CIDv0, UnixFS leaves, and no extra wrapper.
The existing registry excludes empty files and tar metadata from its CID. The archive SHA-256 still binds those bytes and file modes.
An expected CID is a local calculation, not a publication claim.

CI builds actual archives for changed skills and the inventory in `scripts/contract-skills.json`.
The same checks run when packaging scripts, dependencies, or workflows change.
Unchanged legacy skills outside that inventory keep their existing source behavior.

## Declare runtime requirements

Put `skill-contract.json` beside `SKILL.md`. The canonical schema is `scripts/lib/skill-contract.ts`.
`requiredTools` names exact tools and their host scheduling effects. `effects` describes the whole skill workflow.
These can differ. For example, QiForge conservatively schedules several VFS read tools as writes.
The original host handlers still authorize every sensitive operation; a declaration never grants access or enforces arbitrary shell effects.

`runtime: external` marks a capsule whose external host dependencies are not established in Workers.
Missing tools, capabilities, incompatible audiences, and unsupported service profiles prevent the Workers dependency gate from clearing.
An absent sidecar is legacy reference material. Malformed or unknown-version sidecars fail new authoring builds.
Inspection and dependency checks do not prove sandbox mounting, hosted execution, or production readiness.

The search capsule pins existing QiForge PR 325 and search gateway PR 12.
Its delegated service requirement remains blocked until the installed host and gateway provide independent compatibility evidence.
The YellowCard capsule covers organizational disbursements, not the bounded native quote or USDC off-ramp route.

## Verify a publication

The main-branch workflow builds once, uploads those bytes, checks the server CID, then downloads and recomputes the CID and archive SHA-256.
It retains separate `*.upload-accepted.json` and `*.release.json` receipts. Only the latter records `retrieval-verified`.
A failed retrieval leaves upload acceptance visible and fails the job. This does not automatically undo an accepted upload.

For an authorized manual publication, supply `SKILLS_API_KEY` and run:

```sh
npm run publish:capsules -- --receipt .capsule-build/qi-library.build.json --registry https://capsules.skills.ixo.earth
```

CI archives and receipts expire after 90 days. Export required release evidence to your approved durable store before expiry.
Source changes alone do not publish a capsule. No previous or rollback CID is invented.
`scripts/tooling-source.json` records source paths and SHA-256 hashes for the tooling copied into the private authoring repository.

The [published archive baseline](docs/stage6-published-baseline.json) records read-only downloads of existing public capsules. It does not describe these unpublished source changes.

The retrieval receipt records both transport hashes. Different gzip encoding can pass when every regular file, empty file, path and executable mode matches. A matching content CID alone cannot clear a mode or empty-file mismatch.
