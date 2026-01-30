# Error Resolver Skill - Client Integration Guide

This document outlines the work needed to make the Error Resolver skill callable by IXO client interfaces, beyond its current AI agent skill implementation.

## Current State

The skill currently exists as:
- ✅ **Qi Skill for AI Agents**: Can be loaded by AI agents (Claude) via the Skills Server
- ✅ **Handler Function**: `resolveError()` function in `handlers.ts`
- ✅ **Error Database**: Comprehensive error database in `error-database.ts`
- ✅ **Type Definitions**: Zod schemas and TypeScript types

## What's Missing for Client Integration

To enable direct calls from IXO clients (wallets, CLI tools, dashboards, etc.), the following components need to be added:

---

## 1. REST API Service Layer

### 1.1 HTTP Server Implementation

**Create**: `src/server.ts` or `api/server.ts`

A REST API wrapper around the existing `resolveError` handler:

```typescript
// Example structure
import express from 'express';
import { resolveError } from './handlers';
import { createMockContext } from './context';

const app = express();
app.use(express.json());

// POST /api/v1/resolve
app.post('/api/v1/resolve', async (req, res) => {
  try {
    const args = req.body;
    const context = createMockContext(); // Mock QiContext for standalone use
    const result = await resolveError(args, context);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/v1/resolve/:txHash
app.get('/api/v1/resolve/tx/:txHash', async (req, res) => {
  // Query blockchain for transaction, extract error, then resolve
});

// GET /api/v1/health
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});
```

**Requirements**:
- Express.js or Fastify server
- Request validation (use existing Zod schemas)
- Error handling middleware
- CORS configuration for web clients
- Rate limiting
- Request logging

---

## 2. Blockchain Query Capabilities

### 2.1 Transaction Hash Lookup

**Create**: `src/blockchain-client.ts`

Currently, the skill can accept transaction hashes but cannot query the blockchain to extract error details. Add:

```typescript
interface BlockchainClient {
  getTransaction(txHash: string): Promise<TransactionResult>;
  getTransactionError(txHash: string): Promise<ErrorDetails>;
}

// Implementation using Cosmos SDK REST API or gRPC
class IXOBlockchainClient implements BlockchainClient {
  constructor(private rpcEndpoint: string) {}
  
  async getTransaction(txHash: string): Promise<TransactionResult> {
    // Query: GET /cosmos/tx/v1beta1/txs/{hash}
    // Extract error code, codespace, message from tx response
  }
}
```

**Requirements**:
- Integration with IXO RPC endpoints
- Support for multiple RPC providers (fallback)
- Caching layer for frequently queried transactions
- Error handling for network failures

### 2.2 Transaction Error Extraction

**Create**: `src/tx-parser.ts`

Parse transaction responses to extract error information:

```typescript
function extractErrorFromTx(txResponse: any): {
  code?: number;
  codespace?: string;
  message?: string;
  raw_log?: string;
} {
  // Parse Cosmos SDK transaction response format
  // Extract from tx_response.tx_response.code, codespace, raw_log
}
```

---

## 3. Client SDK Integration

### 3.1 JavaScript/TypeScript SDK

**Create**: `sdk/error-resolver-sdk.ts`

A client-side SDK that IXO clients can import:

```typescript
export class ErrorResolverClient {
  constructor(
    private apiUrl: string = 'https://api.ixo.world/error-resolver',
    private rpcUrl?: string
  ) {}

  async resolveError(params: ResolveErrorParams): Promise<ErrorResolution> {
    const response = await fetch(`${this.apiUrl}/api/v1/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  }

  async resolveByTxHash(txHash: string, expertiseLevel?: ExpertiseLevel): Promise<ErrorResolution> {
    // Option 1: Let server query blockchain
    const response = await fetch(`${this.apiUrl}/api/v1/resolve/tx/${txHash}?level=${expertiseLevel || 'beginner'}`);
    return response.json();
    
    // Option 2: Client queries blockchain, then resolves
    // const txError = await this.queryTxError(txHash);
    // return this.resolveError({ error_input: txError.message, ... });
  }
}
```

**Package Structure**:
```
sdk/
├── index.ts              # Main export
├── client.ts             # ErrorResolverClient class
├── types.ts              # Re-export types from skill
└── package.json          # npm package config
```

**Requirements**:
- npm package: `@ixo/error-resolver-sdk`
- TypeScript definitions
- Browser and Node.js compatible
- Optional blockchain query capabilities

### 3.2 Python SDK (Optional)

**Create**: `sdk/python/error_resolver/`

For Python-based IXO clients:

```python
from error_resolver import ErrorResolverClient

client = ErrorResolverClient(api_url="https://api.ixo.world/error-resolver")
result = client.resolve_error(
    error_input="out of gas",
    expertise_level="developer"
)
```

---

## 4. Error Detection & Hooking Mechanisms

### 4.1 Transaction Error Interceptor

**Create**: `src/interceptors/transaction-interceptor.ts`

Automatically catch and resolve errors from transaction submissions:

```typescript
// For use in IXO client libraries
export function withErrorResolution<T>(
  txFunction: () => Promise<T>,
  options?: { expertiseLevel?: ExpertiseLevel }
): Promise<T> {
  return txFunction().catch(async (error) => {
    const resolution = await resolveError({
      error_input: error.message,
      error_code: error.code,
      codespace: error.codespace,
      expertise_level: options?.expertiseLevel || 'beginner'
    }, mockContext);
    
    // Attach resolution to error
    error.resolution = resolution;
    throw error; // Re-throw with resolution attached
  });
}
```

### 4.2 CLI Error Handler

**Create**: `scripts/cli-error-handler.ts`

For `ixod` CLI integration:

```typescript
// Hook into ixod error output
// When command fails, automatically call error resolver
// Display resolution in user-friendly format
```

---

## 5. Service Deployment Configuration

### 5.1 Docker Configuration

**Create**: `Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Create**: `docker-compose.yml`

```yaml
version: '3.8'
services:
  error-resolver:
    build: .
    ports:
      - "3000:3000"
    environment:
      - RPC_ENDPOINT=${RPC_ENDPOINT}
      - PORT=3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5.2 Environment Configuration

**Create**: `.env.example`

```env
# Server
PORT=3000
NODE_ENV=production

# Blockchain
RPC_ENDPOINT=https://rpc.ixo.world
RPC_ENDPOINTS=https://rpc.ixo.world,https://rpc2.ixo.world

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### 5.3 Kubernetes Deployment (Optional)

**Create**: `k8s/deployment.yaml`

For production deployment on Kubernetes.

---

## 6. Additional Features

### 6.1 Caching Layer

**Add**: Redis caching for:
- Frequently resolved errors
- Transaction query results
- Error database lookups

**Benefits**:
- Faster response times
- Reduced blockchain RPC calls
- Lower costs

### 6.2 Analytics & Monitoring

**Add**:
- Error frequency tracking
- Most common errors dashboard
- Response time metrics
- Usage statistics by expertise level

### 6.3 Webhook Support

**Create**: `src/webhooks.ts`

Allow clients to register webhooks for automatic error resolution:

```typescript
// POST /api/v1/webhooks
// When transaction fails, automatically POST resolution to webhook URL
```

---

## 7. Integration Examples

### 7.1 Wallet Integration

```typescript
// In IXO wallet
import { ErrorResolverClient } from '@ixo/error-resolver-sdk';

const resolver = new ErrorResolverClient();

try {
  await sendTransaction(tx);
} catch (error) {
  const resolution = await resolver.resolveError({
    error_input: error.message,
    expertise_level: userSettings.expertiseLevel
  });
  
  showErrorDialog({
    title: resolution.data.what_happened,
    explanation: resolution.data.explanation,
    steps: resolution.data.resolution_steps,
    commands: resolution.data.commands
  });
}
```

### 7.2 CLI Tool Integration

```bash
# ixod wrapper script
#!/bin/bash
if ! ixod "$@"; then
  ERROR=$(ixod "$@" 2>&1)
  curl -X POST https://api.ixo.world/error-resolver/api/v1/resolve \
    -H "Content-Type: application/json" \
    -d "{\"error_input\": \"$ERROR\", \"expertise_level\": \"developer\"}" \
    | jq -r '.data.explanation, .data.resolution_steps[]'
fi
```

### 7.3 Dashboard Integration

```typescript
// In validator dashboard
const failedTxs = await getFailedTransactions();

for (const tx of failedTxs) {
  const resolution = await resolver.resolveByTxHash(tx.hash, 'validator');
  displayErrorCard({
    txHash: tx.hash,
    error: resolution.data.error_message,
    resolution: resolution.data.resolution_steps,
    commands: resolution.data.commands
  });
}
```

---

## 8. Testing Requirements

### 8.1 Unit Tests

- Test error parsing logic
- Test expertise level tailoring
- Test error database lookups
- Test transaction error extraction

### 8.2 Integration Tests

- Test REST API endpoints
- Test blockchain query integration
- Test SDK client methods
- Test error interceptor hooks

### 8.3 E2E Tests

- Test full flow: transaction failure → error resolution → user display
- Test with real blockchain errors
- Test caching behavior
- Test rate limiting

---

## 9. Documentation

### 9.1 API Documentation

**Create**: `docs/api.md`

- OpenAPI/Swagger specification
- Endpoint documentation
- Request/response examples
- Error codes

### 9.2 SDK Documentation

**Create**: `docs/sdk.md`

- Installation instructions
- Usage examples
- Type definitions
- Best practices

### 9.3 Integration Guide

**Create**: `docs/integration.md`

- Step-by-step integration for wallets
- CLI tool integration
- Dashboard integration
- Webhook setup

---

## 10. Implementation Priority

### Phase 1: Core API (High Priority)
1. ✅ REST API server (`src/server.ts`)
2. ✅ Basic error resolution endpoint (`POST /api/v1/resolve`)
3. ✅ Health check endpoint
4. ✅ Request validation
5. ✅ Error handling

### Phase 2: Blockchain Integration (High Priority)
1. ✅ Transaction hash lookup (`GET /api/v1/resolve/tx/:hash`)
2. ✅ Blockchain client implementation
3. ✅ Transaction error extraction
4. ✅ RPC endpoint configuration

### Phase 3: Client SDK (Medium Priority)
1. ✅ JavaScript/TypeScript SDK
2. ✅ npm package publication
3. ✅ TypeScript definitions
4. ✅ Usage examples

### Phase 4: Advanced Features (Medium Priority)
1. ⏳ Caching layer (Redis)
2. ⏳ Rate limiting
3. ⏳ Analytics
4. ⏳ Webhook support

### Phase 5: Additional Integrations (Low Priority)
1. ⏳ Python SDK
2. ⏳ CLI error handler
3. ⏳ Transaction interceptor hooks
4. ⏳ Kubernetes deployment

---

## 11. Dependencies to Add

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "@cosmjs/stargate": "^0.32.0",
    "redis": "^4.6.0",
    "express-rate-limit": "^7.1.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

---

## 12. File Structure After Implementation

```
skills/error-resolver/
├── SKILL.md                    # ✅ Existing (AI agent skill)
├── README.md                   # ✅ Existing
├── DEPLOYMENT.md               # ✅ This file
├── src/
│   ├── handlers.ts            # ✅ Existing
│   ├── types.ts               # ✅ Existing
│   ├── error-database.ts      # ✅ Existing
│   ├── server.ts              # ⏳ NEW: REST API server
│   ├── blockchain-client.ts  # ⏳ NEW: Blockchain queries
│   ├── tx-parser.ts           # ⏳ NEW: Transaction parsing
│   ├── context.ts             # ⏳ NEW: Mock context for standalone
│   └── interceptors/           # ⏳ NEW: Error interceptors
│       └── transaction-interceptor.ts
├── sdk/
│   ├── index.ts               # ⏳ NEW: SDK entry point
│   ├── client.ts              # ⏳ NEW: ErrorResolverClient
│   ├── types.ts               # ⏳ NEW: Re-export types
│   └── package.json           # ⏳ NEW: npm package
├── api/
│   └── routes/                # ⏳ NEW: API route handlers
│       ├── resolve.ts
│       └── health.ts
├── Dockerfile                 # ⏳ NEW
├── docker-compose.yml         # ⏳ NEW
├── package.json               # ⏳ UPDATE: Add dependencies
├── tsconfig.json              # ⏳ UPDATE: Add server config
└── docs/
    ├── api.md                 # ⏳ NEW
    ├── sdk.md                 # ⏳ NEW
    └── integration.md         # ⏳ NEW
```

---

## Summary

To make the Error Resolver skill callable by IXO clients, you need to:

1. **Build a REST API** wrapper around the existing handler
2. **Add blockchain query capabilities** to look up transaction errors
3. **Create client SDKs** for easy integration
4. **Add error detection hooks** for automatic error resolution
5. **Set up deployment infrastructure** (Docker, config, etc.)
6. **Add caching and monitoring** for production use

The core error resolution logic is already complete - this work adds the infrastructure to expose it as a service that IXO clients can call directly.
