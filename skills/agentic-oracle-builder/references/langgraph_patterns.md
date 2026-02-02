# LangGraph Flow Patterns for IXO Oracles

## Core Concepts

LangGraph provides a graph-based framework for building stateful AI applications. In IXO Oracles, flows define how the oracle processes messages and interacts with tools.

## Pattern 1: Simple Conversational

Basic chat without tools:

```typescript
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o" });

async function chatNode(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("chat", chatNode)
  .addEdge("__start__", "chat")
  .addEdge("chat", "__end__");

export const simpleChat = workflow.compile();
```

**Use when**: FAQ bot, simple Q&A, general assistance

## Pattern 2: Tool Calling (ReAct)

AI decides when to use external tools:

```typescript
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Define tools
const searchKnowledge = tool(
  async ({ query }) => {
    const results = await dataStore.search({ query, top_k: 3 });
    return results.map(r => r.chunk.content).join("\n");
  },
  {
    name: "search_knowledge",
    description: "Search the knowledge base for relevant information",
    schema: z.object({ query: z.string() })
  }
);

const tools = [searchKnowledge];
const toolNode = new ToolNode(tools);
const model = new ChatOpenAI({ model: "gpt-4o" }).bindTools(tools);

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages.at(-1);
  return last?.tool_calls?.length ? "tools" : "__end__";
}

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", "__end__"])
  .addEdge("tools", "agent");

export const reactAgent = workflow.compile();
```

**Use when**: RAG, external API calls, data retrieval

## Pattern 3: Multi-Turn with Memory

Maintains context across conversation turns:

```typescript
import { StateGraph, Annotation } from "@langchain/langgraph";

const ConversationState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, upd) => [...curr, ...upd],
    default: () => [],
  }),
  memory_context: Annotation<string>({
    default: () => "",
  }),
  turn_count: Annotation<number>({
    reducer: (_, n) => n,
    default: () => 0,
  }),
});

async function loadMemory(state: typeof ConversationState.State) {
  // Query Neo4j Memory Engine
  const memories = await memoryEngine.retrieve({
    userId: state.userId,
    recentMessages: state.messages.slice(-3)
  });
  return { memory_context: memories.join("\n") };
}

async function respond(state: typeof ConversationState.State) {
  const systemPrompt = `You are a helpful assistant.
Context from previous conversations:
${state.memory_context}`;

  const response = await model.invoke([
    { role: "system", content: systemPrompt },
    ...state.messages
  ]);
  
  return {
    messages: [response],
    turn_count: state.turn_count + 1
  };
}

async function saveMemory(state: typeof ConversationState.State) {
  // Store key moments
  await memoryEngine.analyze(state.messages);
  return {};
}

const workflow = new StateGraph(ConversationState)
  .addNode("load_memory", loadMemory)
  .addNode("respond", respond)
  .addNode("save_memory", saveMemory)
  .addEdge("__start__", "load_memory")
  .addEdge("load_memory", "respond")
  .addEdge("respond", "save_memory")
  .addEdge("save_memory", "__end__");
```

**Use when**: Personal assistants, long-term relationships, personalization

## Pattern 4: Verification Workflow

Claims verification with evidence gathering:

```typescript
const VerificationState = Annotation.Root({
  claim: Annotation<string>(),
  evidence: Annotation<Evidence[]>({
    reducer: (curr, upd) => [...curr, ...upd],
    default: () => [],
  }),
  verification: Annotation<VerificationResult | null>({
    default: () => null,
  }),
  status: Annotation<Status>({
    default: () => "pending",
  }),
});

async function parseClaim(state) {
  // Extract structured claim data
  const parsed = await model.invoke([
    { role: "system", content: "Extract claim details as JSON" },
    { role: "user", content: state.claim }
  ]);
  return { status: "gathering" };
}

async function gatherEvidence(state) {
  // Query blockchain
  const onChainEvidence = await chainClient.queryEntity(state.claim.entityId);
  
  // Query knowledge base
  const documents = await dataStore.search({
    query: state.claim.description,
    filters: { tags: ["evidence"] }
  });
  
  return {
    evidence: [...onChainEvidence, ...documents],
    status: "analyzing"
  };
}

async function analyze(state) {
  const prompt = `Verify this claim:
${state.claim}

Evidence:
${JSON.stringify(state.evidence, null, 2)}

Provide: verified (boolean), confidence (0-1), reasoning`;

  const result = await model.invoke(prompt);
  
  return {
    verification: JSON.parse(result.content),
    status: "complete"
  };
}

const workflow = new StateGraph(VerificationState)
  .addNode("parse", parseClaim)
  .addNode("gather", gatherEvidence)
  .addNode("analyze", analyze)
  .addEdge("__start__", "parse")
  .addEdge("parse", "gather")
  .addEdge("gather", "analyze")
  .addEdge("analyze", "__end__");
```

**Use when**: Claims processing, compliance checks, audit workflows

## Pattern 5: Supervisor Multi-Agent

Orchestrates multiple specialized agents:

```typescript
const SupervisorState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: concat }),
  next_agent: Annotation<string>({ default: () => "supervisor" }),
});

const agents = {
  researcher: createResearchAgent(),
  writer: createWriterAgent(),
  reviewer: createReviewerAgent(),
};

async function supervisor(state) {
  const decision = await model.invoke([
    { role: "system", content: `You are a supervisor. 
Decide which agent should handle next: researcher, writer, reviewer, or FINISH` },
    ...state.messages
  ]);
  
  const next = parseDecision(decision.content);
  return { next_agent: next };
}

function routeToAgent(state) {
  if (state.next_agent === "FINISH") return "__end__";
  return state.next_agent;
}

const workflow = new StateGraph(SupervisorState)
  .addNode("supervisor", supervisor)
  .addNode("researcher", agents.researcher)
  .addNode("writer", agents.writer)
  .addNode("reviewer", agents.reviewer)
  .addConditionalEdges("supervisor", routeToAgent, [
    "researcher", "writer", "reviewer", "__end__"
  ])
  .addEdge("researcher", "supervisor")
  .addEdge("writer", "supervisor")
  .addEdge("reviewer", "supervisor")
  .addEdge("__start__", "supervisor");
```

**Use when**: Complex tasks, report generation, multi-step workflows

## Integration with IXO Oracles

### Matrix Persistence

```typescript
// After each response, save to Matrix
async function persistToMatrix(state) {
  await matrixService.sendMessage(state.roomId, {
    msgtype: "m.text",
    body: state.messages.at(-1).content
  });
  return {};
}

workflow.addNode("persist", persistToMatrix);
workflow.addEdge("respond", "persist");
```

### Blockchain Evidence

```typescript
// Store verification results on-chain
async function storeEvidence(state) {
  const cid = await ipfs.store(state.verification);
  await chainClient.createClaim({
    claimId: state.claimId,
    evidence: cid,
    result: state.verification.verified
  });
  return { evidence_cid: cid };
}
```

### Error Handling

```typescript
// Add error recovery node
async function handleError(state) {
  console.error("Flow error:", state.error);
  return {
    messages: [new AIMessage("I encountered an issue. Let me try again.")]
  };
}

workflow.addNode("error", handleError);
// Route errors from any node
```

## Best Practices

1. **Keep nodes focused**: One responsibility per node
2. **Use annotations**: Define clear state schemas
3. **Handle errors**: Add recovery paths
4. **Log state**: Track flow execution for debugging
5. **Test flows**: Unit test individual nodes
6. **Monitor**: Use Langfuse for observability
