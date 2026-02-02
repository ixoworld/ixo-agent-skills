/**
 * IXO Oracle Scaffold - Knowledge Base Schema Generator
 * 
 * Generates knowledge base schemas and configuration for RAG in IXO Oracles.
 */

import { z } from "zod";

// ============================================
// Input Schema
// ============================================

export const GenerateKnowledgeInputSchema = z.object({
  schema_name: z.string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "Schema name must be snake_case"),
  
  document_types: z.array(z.enum([
    "text",
    "markdown",
    "pdf",
    "json",
    "html"
  ])).default(["text", "markdown"]),
  
  embedding_provider: z.enum(["openai", "local"]).default("openai"),
  vector_dimensions: z.number().int().min(256).max(4096).default(1536),
  include_semantic_search: z.boolean().default(true),
  include_metadata_filtering: z.boolean().default(true)
});

export type GenerateKnowledgeInput = z.infer<typeof GenerateKnowledgeInputSchema>;

// ============================================
// Main Function
// ============================================

export async function generateKnowledge(input: GenerateKnowledgeInput) {
  const validated = GenerateKnowledgeInputSchema.parse(input);

  const schemaCode = `// Knowledge Base Schema: ${validated.schema_name}
// Generated for IXO Oracle data-store package

import { z } from "zod";

/**
 * Document metadata schema
 */
export const DocumentMetadataSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  source: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
  document_type: z.enum(${JSON.stringify(validated.document_types)}),
  tags: z.array(z.string()).default([]),
  custom_metadata: z.record(z.unknown()).optional(),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

/**
 * Document chunk schema (for embedding storage)
 */
export const DocumentChunkSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  content: z.string(),
  chunk_index: z.number().int(),
  embedding: z.array(z.number()).length(${validated.vector_dimensions}).optional(),
  metadata: DocumentMetadataSchema.partial(),
});

export type DocumentChunk = z.infer<typeof DocumentChunkSchema>;

${validated.include_semantic_search ? `
/**
 * Semantic search query schema
 */
export const SemanticSearchQuerySchema = z.object({
  query: z.string().min(1),
  top_k: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  ${validated.include_metadata_filtering ? `filters: z.object({
    document_types: z.array(z.enum(${JSON.stringify(validated.document_types)})).optional(),
    tags: z.array(z.string()).optional(),
    date_range: z.object({
      start: z.date().optional(),
      end: z.date().optional(),
    }).optional(),
  }).optional(),` : ""}
});

export type SemanticSearchQuery = z.infer<typeof SemanticSearchQuerySchema>;

/**
 * Search result schema
 */
export const SearchResultSchema = z.object({
  chunk: DocumentChunkSchema,
  score: z.number().min(0).max(1),
  highlights: z.array(z.string()).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
` : ""}
`;

  const configCode = `// Data Store Configuration for ${validated.schema_name}

export const knowledgeBaseConfig = {
  name: "${validated.schema_name}",
  
  // Embedding configuration
  embedding: {
    provider: "${validated.embedding_provider}",
    ${validated.embedding_provider === "openai" ? `model: "text-embedding-3-small",` : `model: "local-embedding-model",`}
    dimensions: ${validated.vector_dimensions},
  },
  
  // Document processing
  documents: {
    supported_types: ${JSON.stringify(validated.document_types)},
    chunk_size: 1000,
    chunk_overlap: 200,
  },
  
  // Search configuration
  search: {
    semantic_enabled: ${validated.include_semantic_search},
    ${validated.include_metadata_filtering ? `metadata_filtering: true,` : ""}
    default_top_k: 10,
    min_score_threshold: 0.7,
  },
};
`;

  const usageExample = `// Usage example for ${validated.schema_name} knowledge base

import { DataStore } from "@ixo/data-store";
import { knowledgeBaseConfig } from "./config/${validated.schema_name}";

// Initialize the data store
const dataStore = new DataStore(knowledgeBaseConfig);

// Add documents
await dataStore.addDocument({
  content: "Your document content here...",
  metadata: {
    title: "Document Title",
    document_type: "${validated.document_types[0]}",
    tags: ["example", "test"],
  },
});

${validated.include_semantic_search ? `
// Semantic search
const results = await dataStore.search({
  query: "What is the main topic?",
  top_k: 5,
  ${validated.include_metadata_filtering ? `filters: {
    document_types: ["${validated.document_types[0]}"],
    tags: ["example"],
  },` : ""}
});

// Use in LangGraph flow
const context = results.map(r => r.chunk.content).join("\\n\\n");
` : ""}
`;

  return {
    schema_name: validated.schema_name,
    files: {
      [`src/schemas/${validated.schema_name}.ts`]: schemaCode,
      [`src/config/${validated.schema_name}.ts`]: configCode,
      [`examples/${validated.schema_name}_usage.ts`]: usageExample,
    },
    configuration: {
      embedding_provider: validated.embedding_provider,
      vector_dimensions: validated.vector_dimensions,
      document_types: validated.document_types,
      features: {
        semantic_search: validated.include_semantic_search,
        metadata_filtering: validated.include_metadata_filtering
      }
    },
    integration_steps: [
      "1. Save schema files to your project",
      "2. Install @ixo/data-store package",
      `3. Configure ${validated.embedding_provider} API keys if needed`,
      "4. Initialize DataStore in your application",
      "5. Add documents to build your knowledge base",
      "6. Use semantic search in your LangGraph flows"
    ]
  };
}
