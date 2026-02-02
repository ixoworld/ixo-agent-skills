---
name: ixo-oracle-scaffold
description: |
  Scaffolds and manages IXO Agentic Oracle projects using the ixo-oracles-boilerplate framework.
  Creates intelligent AI oracles with LangGraph workflows, Matrix secure communication,
  NestJS API layer, and automatic IXO blockchain marketplace integration.
  Use when: (1) User wants to create a new IXO Oracle project, (2) User needs guidance on 
  oracle architecture (LangGraph, Matrix, blockchain), (3) User wants to generate LangGraph 
  conversation flows, (4) User needs environment configuration for oracle deployment,
  (5) User wants Docker deployment files, (6) User needs knowledge base schemas for RAG.
---

# IXO Oracle Scaffold

Qi Agent Skill for scaffolding Agentic Oracles on the IXO network using the [ixo-oracles-boilerplate](https://github.com/ixoworld/ixo-oracles-boilerplate) framework. Works alongside the `ixo-oracles-cli` tool to provide intelligent guidance and code generation.

## Quick Start

```bash
# 1. Install the CLI globally
npm install -g ixo-oracles-cli

# 2. Initialize project (have IXO Mobile App ready for SignX)
oracles-cli --init

# 3. Follow prompts for project name, template selection
# CLI handles: blockchain entity, Matrix account, .env generation

# 4. Navigate and start development
cd your-oracle && pnpm install && pnpm build
cd apps/app && pnpm start:dev
```

## Architecture Overview

The IXO Oracles framework creates a bridge between React applications, AI conversation flows, and the IXO blockchain:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│  React SDK (@ixo/oracles-client-sdk) • Matrix • Slack       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Oracle Service                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   NestJS    │  │  LangGraph  │  │   Matrix    │         │
│  │    API      │  │   Flows     │  │    E2EE     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    IXO Blockchain                            │
│  Entity Registration • AuthZ • Payments • Verification      │
└─────────────────────────────────────────────────────────────┘
```

### Core Layers

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Client SDK** | @ixo/oracles-client-sdk | React integration with `useChat()` hook |
| **API** | NestJS | REST & WebSocket endpoints |
| **AI** | LangGraph | Conversation flows and tool calling |
| **Communication** | Matrix | E2E encrypted messaging and persistence |
| **Blockchain** | IXO Chain | Entity registration, AuthZ, payments |
| **Memory** | Neo4j (optional) | Personalization and context |
| **Knowledge** | Vector Store | RAG and semantic search |

## Workflow

### Complete Oracle Development Flow

1. **Planning Phase** (This Skill)
   - Get prerequisites and verify environment
   - Understand architecture components
   - Generate scaffolding instructions

2. **Initialization Phase** (CLI)
   ```bash
   oracles-cli --init
   ```
   - SignX authentication via IXO Mobile App
   - Blockchain entity creation with DID
   - Matrix account provisioning
   - Project scaffolding from boilerplate

3. **Customization Phase** (This Skill)
   - Generate LangGraph conversation flows
   - Create knowledge base schemas
   - Configure environment variables

4. **Development Phase**
   ```bash
   cd apps/app && pnpm start:dev
   ```
   - Implement business logic in flows
   - Add documents to knowledge base
   - Test with Matrix client

5. **Deployment Phase** (This Skill + Docker)
   - Generate Docker configuration
   - Deploy to production
   - Oracle available in IXO marketplace

## CLI Commands Reference

### `oracles-cli --init`
Initialize a new IXO Oracle project with all components:
- Creates project directory from boilerplate
- Registers blockchain entity with Matrix linked resources
- Sets up Matrix account for the oracle
- Generates `.env` file with all configuration

**Requirements**: IXO Mobile App open for SignX authentication

### `oracles-cli create-entity`
Create a blockchain entity with oracle profile:
- Creates entity with DID
- Links Matrix resources
- Sets up verification methods

### `oracles-cli logout`
Clear authentication session and stored credentials.

## Project Structure

After running `oracles-cli --init`:

```
your-oracle-project/
├── apps/
│   └── app/                      # Main oracle application (NestJS)
│       ├── .env                  # Generated environment config
│       └── src/                  # Your LangGraph flows and logic
├── packages/
│   ├── @ixo/common/              # Core: AI services, session management
│   ├── @ixo/data-store/          # Knowledge base and vector storage
│   ├── @ixo/matrix/              # Matrix client integration
│   ├── @ixo/events/              # Client-server event system
│   ├── @ixo/slack/               # Slack bot (optional)
│   ├── @ixo/oracles-chain-client/# Blockchain operations
│   ├── @ixo/api-keys-manager/    # API key management
│   └── @ixo/logger/              # Logging utilities
├── docs/                         # Documentation
├── Dockerfile                    # Production build
├── docker-compose.yml            # Deployment config
├── pnpm-workspace.yaml           # Monorepo workspace
└── turbo.json                    # Turborepo config
```

## Environment Configuration

The CLI generates `.env` with these sections:

```bash
# Server
PORT=4000
ORACLE_NAME=your-oracle-name

# Matrix (E2E encrypted communication)
MATRIX_BASE_URL=https://matrix.ixo.world
MATRIX_ORACLE_ADMIN_ACCESS_TOKEN=
MATRIX_ORACLE_ADMIN_PASSWORD=
MATRIX_ORACLE_ADMIN_USER_ID=

# Blockchain (generated by CLI - KEEP SECURE)
ORACLE_ADDRESS=ixo1...
ORACLE_DID=did:ixo:...
ORACLE_MNEMONIC=           # 24 words - protect this!
ENTITY_DID=did:ixo:entity/...
IXO_CHAIN_ID=pandora-8     # testnet
IXO_RPC_URL=https://rpc.testnet.ixo.earth

# AI Services
OPENAI_API_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=

# Optional: Neo4j Memory Engine
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=
```

## LangGraph Flow Templates

### Simple Chat Flow
Basic conversational AI without tools:
```typescript
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("chat", chatNode)
  .addEdge("__start__", "chat")
  .addEdge("chat", "__end__");
```

### Tool Calling Flow
AI with external tool integration:
```typescript
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addConditionalEdges("agent", shouldContinue, ["tools", "__end__"])
  .addEdge("tools", "agent");
```

### Verification Flow
Claims verification workflow:
```typescript
const workflow = new StateGraph(VerificationState)
  .addNode("parse", parseClaim)
  .addNode("gather", gatherEvidence)
  .addNode("analyze", analyzeEvidence)
  .addEdge("__start__", "parse")
  .addEdge("parse", "gather")
  .addEdge("gather", "analyze")
  .addEdge("analyze", "__end__");
```

## Package Reference

### @ixo/common
Core framework package with AI services and session management.

**Key exports**: `AIService`, `SessionService`, `ConfigService`

### @ixo/data-store
Knowledge base and data storage for RAG.

**Key exports**: `DataStore`, `VectorStore`, `DocumentLoader`

**Features**: Semantic search, document chunking, metadata filtering

### @ixo/matrix
Matrix client for secure E2E encrypted communication.

**Key exports**: `MatrixService`, `RoomManager`, `EncryptionService`

### @ixo/events
Event system for client-server communication.

**Event types**: `message.received`, `message.sent`, `session.created`, `session.ended`

### @ixo/oracles-chain-client
Complete IXO blockchain toolkit.

**Key exports**: `ChainClient`, `AuthZService`, `PaymentService`, `EncryptionUtils`

**Features**: Smart fee management, authorization workflows, payment escrow

### @ixo/slack
Slack bot integration (optional).

**Requirements**: Slack App credentials, bot token, signing secret

### @ixo/logger
Structured logging with multiple transports.

## Network Configuration

| Network | Chain ID | RPC URL | Faucet |
|---------|----------|---------|--------|
| Mainnet | `ixo-5` | `https://rpc.ixo.world` | None (requires IXO) |
| Testnet | `pandora-8` | `https://rpc.testnet.ixo.earth` | `https://faucet.testnet.ixo.earth` |
| Devnet | `devnet-1` | `https://rpc.devnet.ixo.earth` | `https://faucet.devnet.ixo.earth` |

## Docker Deployment

### Dockerfile (multi-stage)
```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN pnpm install --offline && pnpm build

# Stage 3: Production
FROM node:22-alpine AS production
COPY --from=builder /app/apps/app/dist ./dist
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### docker-compose.yml
```yaml
services:
  oracle:
    build: .
    ports:
      - "4000:4000"
    env_file:
      - ./apps/app/.env
    depends_on:
      - neo4j  # if using memory engine

  neo4j:  # optional
    image: neo4j:5
    ports:
      - "7474:7474"
      - "7687:7687"
```

## Security Considerations

1. **Never commit `.env` files** - Use secrets manager in production
2. **Protect `ORACLE_MNEMONIC`** - Grants full control of oracle account
3. **Matrix E2E encryption** - All conversations encrypted by default
4. **AuthZ permissions** - Users explicitly grant oracle access
5. **SignX authentication** - Mobile wallet verification required

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 22+ | Runtime |
| pnpm | 10+ | Package manager (workspace) |
| IXO Mobile App | Latest | SignX authentication |
| ixo-oracles-cli | Latest | Project scaffolding |

**Optional**:
- Docker (deployment)
- Neo4j (memory engine)
- Slack App (bot integration)

## Resources

### Repositories
- [ixo-oracles-boilerplate](https://github.com/ixoworld/ixo-oracles-boilerplate) - Main framework
- [ixo-oracles-cli](https://github.com/ixoworld/ixo-oracles-cli) - CLI tool

### Documentation
- [IXO Oracles Architecture](https://docs.ixo.world/guides/ixo-oracles-architecture)
- [IXO Foundation GitHub](https://github.com/ixofoundation)

### NPM Packages
- [ixo-oracles-cli](https://www.npmjs.com/package/ixo-oracles-cli)

## scripts/

- `scaffold_project.ts` - Generate scaffolding instructions
- `generate_flow.ts` - Create LangGraph flow templates
- `generate_env.ts` - Build environment configuration
- `generate_docker.ts` - Create Docker deployment files
- `generate_knowledge.ts` - Design knowledge base schemas

## references/

- `architecture.md` - Detailed architecture documentation
- `langgraph_patterns.md` - LangGraph flow patterns and examples
- `packages.md` - Full package API reference
