# IXO Oracle Scaffold - Qi Agent Skill

A Qi Agent Skill that provides intelligent guidance and scaffolding for building **Agentic Oracles** on the IXO network using the [ixo-oracles-boilerplate](https://github.com/ixoworld/ixo-oracles-boilerplate) framework.

## Overview

This skill transforms the IXO Oracle Boilerplate CLI into an AI-assisted development experience. It enables Qi Flows to:

- Guide developers through oracle project setup
- Generate LangGraph conversation flows
- Create environment configurations
- Produce Docker deployment files
- Design knowledge base schemas

The skill works **alongside** the `ixo-oracles-cli` tool — it provides intelligent guidance and code generation while the CLI handles blockchain registration and Matrix account provisioning.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Qi Flow Engine                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              ixo_oracle_scaffold Skill                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │ Read-Only   │  │ Transition  │  │  Evidence   │       │  │
│  │  │   Tools     │  │   Tools     │  │   (IPFS)    │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ixo-oracles-cli                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   SignX     │  │  Blockchain │  │   Matrix    │             │
│  │    Auth     │  │   Entity    │  │   Account   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ixo-oracles-boilerplate                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │LangGraph │  │  Matrix  │  │  NestJS  │  │   IXO    │        │
│  │  Flows   │  │   E2EE   │  │   API    │  │  Chain   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before using this skill, ensure you have:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 22+ | Runtime environment |
| pnpm | 10+ | Package manager for workspace |
| IXO Mobile App | Latest | SignX authentication |
| ixo-oracles-cli | Latest | Project scaffolding |

## Installation

### 1. Install the IXO Oracles CLI

```bash
npm install -g ixo-oracles-cli
```

For pnpm users, approve build scripts after installation:
```bash
pnpm approve-builds -g
# Select 'protobufjs' when prompted
```

### 2. Deploy the Qi Skill

Add the skill to your Qi Flow Engine deployment:

```bash
# Copy skill files to your Qi skills directory
cp -r ixo-oracle-scaffold /path/to/qi-skills/

# Or register via Qi CLI (if available)
qi skill register ./ixo-oracle-scaffold
```

## Skill Tools Reference

### Read-Only Tools

These tools provide information without requiring UCAN authorization:

#### `get_prerequisites`
Returns setup requirements for IXO Oracle development.

```typescript
// Example invocation
const result = await skill.invoke("get_prerequisites", {
  include_optional: true,
  target_environment: "both"  // "development" | "production" | "both"
});
```

#### `get_architecture_overview`
Explains the IXO Oracles architecture with optional Mermaid diagrams.

```typescript
const result = await skill.invoke("get_architecture_overview", {
  focus_area: "full",  // "langgraph" | "matrix" | "blockchain" | "memory" | "knowledge" | "security"
  include_diagrams: true
});
```

#### `get_project_structure`
Returns the monorepo structure after scaffolding.

```typescript
const result = await skill.invoke("get_project_structure", {
  depth: 3,
  include_descriptions: true
});
```

#### `get_package_info`
Details about framework packages (@ixo/common, @ixo/matrix, etc.).

```typescript
const result = await skill.invoke("get_package_info", {
  package_name: "@ixo/common",  // or "all" for all packages
  include_api: true
});
```

#### `get_environment_template`
Returns .env template with explanations.

```typescript
const result = await skill.invoke("get_environment_template", {
  network: "testnet",  // "mainnet" | "testnet" | "devnet"
  include_secrets_placeholders: true,
  include_comments: true,
  services: ["openai", "langfuse"]
});
```

#### `get_cli_commands`
Documentation for ixo-oracles-cli commands.

```typescript
const result = await skill.invoke("get_cli_commands", {
  command: "all",  // "init" | "create-entity" | "logout" | "help"
  include_examples: true
});
```

### Transition Tools

These tools generate artifacts and require UCAN authorization:

#### `scaffold_oracle_project`
Generates complete scaffolding instructions.

```typescript
const result = await skill.invoke("scaffold_oracle_project", {
  project_name: "my-verification-oracle",
  oracle_type: "verification",  // "conversational" | "verification" | "data_provider" | "workflow" | "custom"
  description: "Oracle for verifying carbon credit claims",
  network: "testnet",
  ai_provider: "openai",
  include_slack: false,
  include_memory_engine: true,
  include_knowledge_base: true,
  include_live_agent: false
});

// Returns: setup_commands, features_enabled, post_setup_tasks, network_config
// Evidence CID stored for audit trail
```

#### `generate_langgraph_flow`
Creates LangGraph workflow templates.

```typescript
const result = await skill.invoke("generate_langgraph_flow", {
  flow_name: "claim_verification",
  flow_type: "verification",  // "simple_chat" | "tool_calling" | "multi_turn" | "verification" | "data_processing" | "custom"
  tools: [
    { name: "fetch_claim_data", description: "Retrieves claim from blockchain", parameters: { claim_id: "string" } },
    { name: "validate_evidence", description: "Validates supporting evidence" }
  ],
  include_memory: true,
  include_error_handling: true
});

// Returns: TypeScript code, file_path, usage_example
```

#### `generate_environment_config`
Produces complete .env configuration.

```typescript
const result = await skill.invoke("generate_environment_config", {
  oracle_name: "carbon-verifier",
  network: "testnet",
  port: 4000,
  matrix_base_url: "https://matrix.ixo.world",
  ai_provider: "openai",
  services: {
    langfuse: true,
    neo4j: true,
    slack: false,
    livekit: false
  }
});
```

#### `generate_docker_config`
Creates Docker deployment configuration.

```typescript
const result = await skill.invoke("generate_docker_config", {
  project_name: "carbon-verifier",
  node_version: "22-alpine",
  include_compose: true,
  include_dev_compose: true,
  expose_port: 4000,
  include_neo4j: true,
  include_postgres: false
});

// Returns: Dockerfile, docker-compose.yml, docker-compose.dev.yml
```

#### `generate_knowledge_schema`
Designs knowledge base configuration for RAG.

```typescript
const result = await skill.invoke("generate_knowledge_schema", {
  schema_name: "carbon_credits_kb",
  document_types: ["pdf", "markdown", "json"],
  embedding_provider: "openai",
  vector_dimensions: 1536,
  include_semantic_search: true,
  include_metadata_filtering: true
});

// Returns: Zod schemas, DataStore config, usage examples
```

## Usage Workflow

### Complete Oracle Development Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1: Planning (Qi Skill)                                     │
│  ─────────────────────────────                                   │
│  • get_prerequisites → Verify environment                        │
│  • get_architecture_overview → Understand the stack              │
│  • scaffold_oracle_project → Get setup instructions              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Step 2: Initialization (CLI)                                    │
│  ────────────────────────────                                    │
│  $ oracles-cli --init                                            │
│  • SignX authentication via IXO Mobile App                       │
│  • Blockchain entity creation                                    │
│  • Matrix account provisioning                                   │
│  • Project scaffolding                                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Step 3: Customization (Qi Skill)                                │
│  ─────────────────────────────────                               │
│  • generate_langgraph_flow → Create AI workflows                 │
│  • generate_knowledge_schema → Design RAG system                 │
│  • generate_environment_config → Configure services              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Step 4: Development                                             │
│  ────────────────────                                            │
│  $ cd my-oracle && pnpm install && pnpm build                    │
│  $ cd apps/app && pnpm start:dev                                 │
│  • Implement business logic in generated flows                   │
│  • Add documents to knowledge base                               │
│  • Test with Matrix client                                       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Step 5: Deployment (Qi Skill + Docker)                          │
│  ───────────────────────────────────────                         │
│  • generate_docker_config → Create deployment files              │
│  $ docker-compose up -d                                          │
│  • Oracle available in IXO marketplace                           │
└──────────────────────────────────────────────────────────────────┘
```

### Example: Building a Verification Oracle

```typescript
// 1. Get prerequisites
const prereqs = await qiFlow.invoke("ixo_oracle_scaffold", "get_prerequisites", {
  target_environment: "development"
});

// 2. Generate scaffolding instructions
const scaffold = await qiFlow.invoke("ixo_oracle_scaffold", "scaffold_oracle_project", {
  project_name: "carbon-credit-verifier",
  oracle_type: "verification",
  description: "Verifies carbon credit claims against registry data",
  network: "testnet",
  ai_provider: "openai",
  include_memory_engine: true,
  include_knowledge_base: true
});

// 3. User runs CLI with generated instructions
// $ oracles-cli --init
// Follow prompts with project_name: carbon-credit-verifier

// 4. Generate the verification flow
const flow = await qiFlow.invoke("ixo_oracle_scaffold", "generate_langgraph_flow", {
  flow_name: "verify_carbon_credit",
  flow_type: "verification",
  tools: [
    { name: "fetch_registry_data", description: "Fetches data from carbon registry" },
    { name: "validate_methodology", description: "Validates calculation methodology" },
    { name: "check_double_counting", description: "Checks for double counting issues" }
  ],
  include_memory: true,
  include_error_handling: true
});

// 5. Generate knowledge base for registry documents
const kb = await qiFlow.invoke("ixo_oracle_scaffold", "generate_knowledge_schema", {
  schema_name: "carbon_registry_kb",
  document_types: ["pdf", "json"],
  embedding_provider: "openai",
  include_semantic_search: true
});

// 6. Generate deployment configuration
const docker = await qiFlow.invoke("ixo_oracle_scaffold", "generate_docker_config", {
  project_name: "carbon-credit-verifier",
  include_compose: true,
  include_neo4j: true
});
```

## UCAN Capabilities

The skill requires these capabilities for transition tools:

| Capability | Resource DID | Ability | Tools |
|------------|--------------|---------|-------|
| `oracle_scaffold` | `did:qi:ixo:oracle:scaffold` | `create` | scaffold_oracle_project, generate_langgraph_flow, generate_docker_config, generate_knowledge_schema |
| `oracle_entity_create` | `did:qi:ixo:entity:oracle` | `create` | (Reserved for future CLI integration) |
| `matrix_account_provision` | `did:qi:matrix:account` | `create` | (Reserved for future CLI integration) |
| `oracle_config_read` | `did:qi:ixo:oracle:config` | `read` | get_environment_template |
| `oracle_env_generate` | `did:qi:ixo:oracle:environment` | `create` | generate_environment_config |

## Evidence Trail

All transition tools store evidence to IPFS for audit trails:

```typescript
// Evidence stored for each transition
{
  type: "ixo_oracle_scaffold_config",
  timestamp: "2026-02-02T12:00:00Z",
  config: { /* project configuration */ },
  features: { /* enabled features */ }
}

// Returned in tool result
{
  data: { /* generated content */ },
  evidence_cid: "bafybeig...",  // IPFS CID for verification
  summary: "Scaffold instructions for my-oracle (verification) on testnet"
}
```

## Related Resources

| Resource | URL |
|----------|-----|
| IXO Oracles Boilerplate | https://github.com/ixoworld/ixo-oracles-boilerplate |
| IXO Oracles CLI | https://github.com/ixoworld/ixo-oracles-cli |
| CLI NPM Package | https://www.npmjs.com/package/ixo-oracles-cli |
| IXO Oracles Architecture | https://docs.ixo.world/guides/ixo-oracles-architecture |
| IXO Foundation GitHub | https://github.com/ixofoundation |

## License

Apache-2.0 — See [LICENSE](./LICENSE) for details.

---

Built for the [Qi Flow Engine](https://qi.space) • Powered by [IXO](https://ixo.world)
