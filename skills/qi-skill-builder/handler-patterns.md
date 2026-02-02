# Handler Implementation Patterns

Reference for implementing Qi Skill handlers that conform to Flow Engine requirements.

## Required Interface

Every handler MUST return `ToolResult`:

```typescript
interface ToolResult {
  data: Record<string, any>;   // JSON-serializable result
  evidence_cid?: string;       // IPFS CID for transition proofs
  summary: string;             // One-line human-readable
}
```

## Standard Handler Structure

```typescript
export async function myToolHandler(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // 1. Validate arguments
  const validated = MyToolArgsSchema.parse(args);
  
  // 2. Log operation start
  context.log.info(`Executing with: ${JSON.stringify(validated)}`);
  
  // 3. Perform stateless computation
  const result = await performOperation(validated);
  
  // 4. Store evidence (for transitions)
  const evidenceCid = await context.ipfs.save(JSON.stringify({
    operation: "my_tool",
    input: validated,
    output: result,
    timestamp: new Date().toISOString(),
  }));
  
  // 5. Return structured result
  return {
    data: result,
    evidence_cid: evidenceCid,
    summary: `Operation completed: ${result.id}`,
  };
}
```

## Context API

The `QiContext` provides:

```typescript
interface QiContext {
  // IPFS storage
  ipfs: {
    save: (data: string | Buffer) => Promise<string>;
    get: (cid: string) => Promise<Buffer>;
  };
  
  // Logging
  log: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  
  // Authorization context
  ucan: {
    capabilities: string[];
    issuer: string;
    audience: string;
  };
}
```

## Patterns by Tool Type

### Read-Only Handler

```typescript
export async function fetchData(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const { query } = FetchDataArgsSchema.parse(args);
  
  context.log.info(`Fetching: ${query}`);
  
  const data = await queryDatabase(query);
  
  return {
    data: { results: data, count: data.length },
    summary: `Found ${data.length} records`,
  };
}
```

### Transition Handler (State Change)

```typescript
export async function createRecord(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = CreateRecordArgsSchema.parse(args);
  
  context.log.info(`Creating record: ${validated.name}`);
  
  // Generate deterministic ID
  const recordId = generateDeterministicId(validated);
  
  const record = {
    id: recordId,
    ...validated,
    created_at: new Date().toISOString(),
  };
  
  // REQUIRED: Store evidence for transitions
  const evidenceCid = await context.ipfs.save(JSON.stringify({
    type: "record_creation",
    record,
    ucan: context.ucan,
    timestamp: new Date().toISOString(),
  }));
  
  return {
    data: record,
    evidence_cid: evidenceCid,  // REQUIRED for transitions
    summary: `Created record ${recordId}`,
  };
}
```

### Heavy Artifact Handler (PDF, Images)

```typescript
export async function generateReport(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const { data, format } = GenerateReportArgsSchema.parse(args);
  
  context.log.info(`Generating ${format} report`);
  
  // Generate artifact
  const pdfBuffer = await createPDF(data);
  
  // Store heavy artifact to IPFS
  const artifactCid = await context.ipfs.save(pdfBuffer);
  
  return {
    data: {
      format,
      page_count: data.length,
      generated_at: new Date().toISOString(),
    },
    evidence_cid: artifactCid,  // Points to the PDF
    summary: `Generated ${format} report: ${artifactCid}`,
  };
}
```

## Zod Schema Patterns

### Basic Schema

```typescript
export const CreateItemArgsSchema = z.object({
  name: z.string().min(1).describe("Item name"),
  quantity: z.number().int().positive().describe("Quantity"),
  metadata: z.record(z.any()).optional().describe("Additional data"),
});
```

### With Validation

```typescript
export const TransferArgsSchema = z.object({
  from: z.string().regex(/^did:[a-z]+:.+$/).describe("Source DID"),
  to: z.string().regex(/^did:[a-z]+:.+$/).describe("Destination DID"),
  amount: z.number().positive().describe("Amount to transfer"),
  memo: z.string().max(256).optional().describe("Transaction memo"),
});
```

### With Enums

```typescript
export const CredentialArgsSchema = z.object({
  type: z.enum(["identity", "education", "employment"]).describe("Credential type"),
  subject: z.string().describe("Subject DID"),
  claims: z.record(z.any()).describe("Credential claims"),
  expiry: z.string().datetime().optional().describe("Expiration date"),
});
```

## Error Handling

Throw standard errors—the harness catches them:

```typescript
export async function validateInput(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // Zod parse throws on invalid input
  const validated = Schema.parse(args);
  
  // Business logic errors
  if (validated.amount <= 0) {
    throw new Error("Amount must be positive");
  }
  
  // External dependency errors
  try {
    const result = await externalCall(validated);
    return { data: result, summary: "Success" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`External call failed: ${message}`);
  }
}
```

## Statelessness Rules

Handlers MUST NOT:
- Write to filesystem (`fs.writeFile`)
- Maintain global state
- Use mutable singletons
- Rely on execution order

Handlers MAY:
- Read configuration
- Use `context.ipfs.save()` for persistence
- Make idempotent external calls
- Generate deterministic outputs from inputs

## Determinism Requirements

For the same input, handlers must produce equivalent outputs:

```typescript
// ✓ Deterministic: ID derived from input
const id = crypto.createHash('sha256')
  .update(JSON.stringify(input))
  .digest('hex');

// ✗ Non-deterministic: Random ID
const id = crypto.randomUUID();

// ✓ Deterministic: Timestamp from context or input
const timestamp = input.timestamp || context.requestTime;

// ✗ Non-deterministic: Current time
const timestamp = new Date().toISOString();
```
