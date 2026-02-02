# IXO Oracles Package Reference

## Core Packages

### @ixo/common

**Purpose**: Core framework package with AI services and session management.

**Installation**: Included in boilerplate workspace

**Key Exports**:

```typescript
import { 
  AIService,
  SessionService,
  ConfigService 
} from '@ixo/common';
```

**AIService**:
```typescript
const aiService = new AIService({
  flow: compiledLangGraphFlow,
  memory: memoryEngineInstance,  // optional
  knowledge: dataStoreInstance   // optional
});

// Process message
const response = await aiService.process({
  sessionId: 'session-123',
  message: 'Hello!',
  context: { userId: 'user-456' }
});
```

**SessionService**:
```typescript
const sessionService = new SessionService({
  storage: matrixService,
  ttl: 3600 // seconds
});

// Create session
const session = await sessionService.create({
  userId: 'user-456',
  oracleId: 'oracle-789'
});

// Get session
const existing = await sessionService.get('session-123');

// End session
await sessionService.end('session-123');
```

---

### @ixo/data-store

**Purpose**: Knowledge base and vector storage for RAG.

**Key Exports**:

```typescript
import {
  DataStore,
  VectorStore,
  DocumentLoader
} from '@ixo/data-store';
```

**DataStore**:
```typescript
const dataStore = new DataStore({
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536
  },
  documents: {
    supported_types: ['pdf', 'markdown', 'text'],
    chunk_size: 1000,
    chunk_overlap: 200
  }
});

// Add document
await dataStore.addDocument({
  content: 'Document text content...',
  metadata: {
    title: 'Policy Document',
    type: 'markdown',
    tags: ['policy', 'compliance']
  }
});

// Semantic search
const results = await dataStore.search({
  query: 'What are the compliance requirements?',
  top_k: 5,
  threshold: 0.7,
  filters: {
    tags: ['compliance']
  }
});

// results = [{ chunk, score, highlights }]
```

**DocumentLoader**:
```typescript
// Load from file
const loader = new DocumentLoader();
const documents = await loader.loadFile('./policy.pdf');

// Load from URL
const webDocs = await loader.loadUrl('https://example.com/docs');
```

---

### @ixo/matrix

**Purpose**: Matrix client for E2E encrypted communication.

**Key Exports**:

```typescript
import {
  MatrixService,
  RoomManager,
  EncryptionService
} from '@ixo/matrix';
```

**MatrixService**:
```typescript
const matrix = new MatrixService({
  baseUrl: 'https://matrix.ixo.world',
  accessToken: process.env.MATRIX_ORACLE_ADMIN_ACCESS_TOKEN,
  userId: process.env.MATRIX_ORACLE_ADMIN_USER_ID
});

// Send message
await matrix.sendMessage(roomId, {
  msgtype: 'm.text',
  body: 'Hello from oracle!'
});

// Listen for messages
matrix.on('message', async (event) => {
  const { roomId, sender, content } = event;
  // Process incoming message
});

// Get room history
const history = await matrix.getRoomHistory(roomId, {
  limit: 50
});
```

**RoomManager**:
```typescript
const rooms = new RoomManager(matrix);

// Create private room for user-oracle pair
const room = await rooms.createOracleRoom({
  oracleId: 'did:ixo:oracle/123',
  userId: 'did:ixo:user/456',
  encryption: true
});

// Find existing room
const existing = await rooms.findRoom({
  oracleId: 'did:ixo:oracle/123',
  userId: 'did:ixo:user/456'
});
```

---

### @ixo/events

**Purpose**: Event system for client-server communication.

**Key Exports**:

```typescript
import {
  EventEmitter,
  EventTypes,
  createEventHandler
} from '@ixo/events';
```

**Event Types**:
```typescript
// Available event types
EventTypes.MESSAGE_RECEIVED   // 'message.received'
EventTypes.MESSAGE_SENT       // 'message.sent'
EventTypes.SESSION_CREATED    // 'session.created'
EventTypes.SESSION_ENDED      // 'session.ended'
EventTypes.TOOL_INVOKED       // 'tool.invoked'
EventTypes.ERROR              // 'error'
```

**Usage**:
```typescript
const emitter = new EventEmitter();

// Subscribe
emitter.on(EventTypes.MESSAGE_RECEIVED, async (event) => {
  console.log('New message:', event.content);
});

// Emit
emitter.emit(EventTypes.MESSAGE_SENT, {
  sessionId: 'session-123',
  content: 'Response text',
  timestamp: new Date()
});
```

---

### @ixo/oracles-chain-client

**Purpose**: IXO blockchain operations toolkit.

**Key Exports**:

```typescript
import {
  ChainClient,
  AuthZService,
  PaymentService,
  EncryptionUtils
} from '@ixo/oracles-chain-client';
```

**ChainClient**:
```typescript
const client = new ChainClient({
  rpcUrl: process.env.IXO_RPC_URL,
  chainId: process.env.IXO_CHAIN_ID,
  mnemonic: process.env.ORACLE_MNEMONIC
});

// Query entity
const entity = await client.queryEntity('did:ixo:entity/123');

// Create claim
const result = await client.createClaim({
  entityId: 'did:ixo:entity/123',
  claimType: 'verification',
  evidence: 'bafybeig...',  // IPFS CID
  result: true
});

// Get balance
const balance = await client.getBalance('ixo1...');
```

**AuthZService**:
```typescript
const authz = new AuthZService(client);

// Check authorization
const isAuthorized = await authz.checkGrant({
  granter: 'ixo1user...',
  grantee: 'ixo1oracle...',
  msgType: '/ixo.oracle.v1.MsgChat'
});

// Request grant (user must approve)
await authz.requestGrant({
  grantee: 'ixo1oracle...',
  permissions: ['chat', 'data_access']
});
```

**PaymentService**:
```typescript
const payments = new PaymentService(client);

// Create escrow
const escrow = await payments.createEscrow({
  amount: { amount: '1000000', denom: 'uixo' },
  recipient: 'ixo1oracle...',
  conditions: { completionProof: true }
});

// Release payment
await payments.releaseEscrow(escrow.id, {
  proof: 'bafybeig...'
});
```

---

### @ixo/slack

**Purpose**: Slack bot integration for oracle access.

**Prerequisites**:
- Slack App with Bot Token
- Socket Mode enabled
- Required scopes: `chat:write`, `app_mentions:read`

**Key Exports**:

```typescript
import {
  SlackService,
  SlackEventHandler
} from '@ixo/slack';
```

**Usage**:
```typescript
const slack = new SlackService({
  botToken: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN
});

// Handle mentions
slack.onMention(async (event) => {
  const { user, text, channel } = event;
  
  // Process with oracle
  const response = await aiService.process({
    message: text,
    context: { platform: 'slack', user }
  });
  
  // Reply
  await slack.reply(channel, response.content);
});

// Start listening
await slack.start();
```

---

### @ixo/api-keys-manager

**Purpose**: Secure API key storage and rotation.

```typescript
import { ApiKeyManager } from '@ixo/api-keys-manager';

const keyManager = new ApiKeyManager({
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2'
  }
});

// Store key
await keyManager.store('openai', process.env.OPENAI_API_KEY);

// Retrieve key
const apiKey = await keyManager.get('openai');

// Rotate key
await keyManager.rotate('openai', newKey);

// List keys (names only)
const keys = await keyManager.list();
// ['openai', 'langfuse', ...]
```

---

### @ixo/logger

**Purpose**: Structured logging with multiple transports.

```typescript
import { Logger, LogLevel } from '@ixo/logger';

const logger = new Logger({
  level: LogLevel.INFO,
  transports: ['console', 'file'],
  format: 'json'
});

// Basic logging
logger.info('Oracle started', { port: 4000 });
logger.error('Processing failed', { error, sessionId });
logger.debug('State update', { state });

// With context
const sessionLogger = logger.child({ sessionId: 'session-123' });
sessionLogger.info('Message received');  // Includes sessionId

// Request logging middleware (NestJS)
app.use(logger.middleware());
```

## External Dependencies

### Memory Engine (Neo4j)

Not a package but external service:

```typescript
// Connection via environment
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

Features:
- Graph-based relationship storage
- Key moments capture
- User preference learning
- Pattern analysis

### IXO SDKs

Used internally by chain-client:

- `@ixo/impactxclient-sdk` - Blockchain queries
- `@ixo/signx-sdk` - Mobile authentication
- `@ixo/matrixclient-sdk` - Matrix operations

## Version Compatibility

| Package | Node | TypeScript |
|---------|------|------------|
| @ixo/common | 22+ | 5.0+ |
| @ixo/data-store | 22+ | 5.0+ |
| @ixo/matrix | 22+ | 5.0+ |
| @ixo/events | 22+ | 5.0+ |
| @ixo/oracles-chain-client | 22+ | 5.0+ |
| @ixo/slack | 22+ | 5.0+ |
| @ixo/api-keys-manager | 22+ | 5.0+ |
| @ixo/logger | 22+ | 5.0+ |
