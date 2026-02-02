# IXO Oracles Architecture Reference

## Overview

IXO Oracles are autonomous AI agents that provide verifiable services through:
- **Decentralized Identity**: Each oracle has a DID registered on IXO blockchain
- **Secure Data Storage**: End-to-end encrypted Matrix rooms
- **AI Workflows**: LangGraph-powered conversation flows
- **Blockchain Integration**: Automatic marketplace registration

## Core Components

### 1. Client SDK Layer (`@ixo/oracles-client-sdk`)

React integration for oracle interactions:

```typescript
import { useChat } from '@ixo/oracles-client-sdk';

function ChatComponent() {
  const { messages, sendMessage } = useChat({
    oracleId: 'did:ixo:oracle/123'
  });
  
  return <Chat messages={messages} onSend={sendMessage} />;
}
```

**Features**:
- `useChat()` hook for conversation management
- Zero configuration—auto-connects to deployed oracles
- Type-safe API generated from oracle schema
- Real-time updates via Matrix sync

### 2. NestJS API Layer

REST and WebSocket endpoints:

```
GET  /health          # Health check
POST /message         # Send message to oracle
WS   /socket          # Real-time conversation
GET  /sessions/:id    # Get session state
```

**Built-in**:
- Authentication via SignX
- Rate limiting
- Request validation
- Error handling

### 3. LangGraph AI Layer

Conversation flow orchestration:

```typescript
const workflow = new StateGraph(ConversationState)
  .addNode("process", processMessage)
  .addNode("tools", executeTools)
  .addConditionalEdges("process", routeDecision)
  .addEdge("tools", "process");
```

**Capabilities**:
- Custom node definitions
- Tool integration
- State management
- Memory/context injection

### 4. Matrix Communication Layer

E2E encrypted messaging:

```typescript
// Room creation per user-oracle pair
const room = await matrix.createRoom({
  name: `oracle:${oracleId}:user:${userId}`,
  encryption: true
});

// Message persistence
await matrix.sendMessage(roomId, {
  msgtype: 'm.text',
  body: response.content
});
```

**Security**:
- Olm/Megolm encryption
- Private rooms per user
- Cross-device sync
- Complete history

### 5. IXO Blockchain Layer

Entity and verification:

```typescript
// Oracle entity structure
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:ixo:oracle/123",
  "verificationMethod": [{
    "id": "#key-1",
    "type": "Ed25519VerificationKey2018",
    "publicKeyBase58": "..."
  }],
  "service": [{
    "id": "#matrix",
    "type": "MatrixService",
    "serviceEndpoint": "https://matrix.ixo.world"
  }]
}
```

**Functions**:
- Entity registration
- AuthZ grants
- Payment escrow
- Verification

### 6. Memory Engine (Optional)

Neo4j-based personalization:

```typescript
// Store key moments
await memory.store({
  userId: 'user123',
  moment: 'User mentioned they work in finance',
  timestamp: new Date()
});

// Retrieve context
const context = await memory.retrieve({
  userId: 'user123',
  query: 'What do they do for work?'
});
```

**Features**:
- Key moments storage
- Pattern analysis
- Preference learning
- Response adaptation

### 7. Knowledge Management

RAG and semantic search:

```typescript
// Add documents
await dataStore.addDocument({
  content: documentText,
  metadata: { type: 'policy', tags: ['compliance'] }
});

// Search
const results = await dataStore.search({
  query: 'What are the compliance requirements?',
  top_k: 5
});
```

## Message Flow

```
User Message
     │
     ▼
┌─────────────┐
│  Client SDK │ ─────► Matrix Sync
└─────────────┘
     │
     ▼
┌─────────────┐
│  NestJS API │ ─────► Authentication
└─────────────┘
     │
     ▼
┌─────────────┐
│  LangGraph  │ ─────► Tool Execution
└─────────────┘
     │
     ├───► Memory Engine (context)
     │
     ├───► Knowledge Base (RAG)
     │
     ▼
┌─────────────┐
│   Matrix    │ ─────► Persistence
└─────────────┘
     │
     ▼
Response to User
```

## Security Architecture

### Authentication Flow
1. User opens IXO Mobile App
2. SignX generates session token
3. Token validated against blockchain
4. Oracle receives authorized request

### Encryption Layers
- **Transport**: TLS 1.3 for all HTTP/WebSocket
- **Matrix**: E2E (Olm for 1:1, Megolm for rooms)
- **Blockchain**: Ed25519 signatures
- **Calls**: ECIES + Matrix E2EE (LiveAgent)

### AuthZ Model
```typescript
// Grant oracle permission
{
  granter: 'ixo1user...',
  grantee: 'ixo1oracle...',
  authorization: {
    '@type': '/ixo.oracle.v1.OracleAuthorization',
    permissions: ['chat', 'data_access']
  }
}
```

## Package Dependencies

```
@ixo/common
├── @langchain/langgraph
├── @langchain/core
├── @langchain/openai
└── @nestjs/core

@ixo/matrix
├── matrix-js-sdk
└── @matrix-org/olm

@ixo/oracles-chain-client
├── @ixo/impactxclient-sdk
└── cosmjs

@ixo/data-store
├── langchain
└── vector-store-adapter
```
