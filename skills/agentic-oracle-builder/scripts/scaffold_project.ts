/**
 * IXO Oracle Scaffold - Project Scaffolding Script
 * 
 * Generates scaffolding instructions and configuration for new IXO Oracle projects.
 * Works alongside ixo-oracles-cli for actual project creation.
 */

import { z } from "zod";

// ============================================
// Input Schema
// ============================================

export const ScaffoldProjectInputSchema = z.object({
  project_name: z.string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9-]*$/, "Project name must be lowercase alphanumeric with hyphens"),
  
  oracle_type: z.enum([
    "conversational",    // Chat-based AI assistant
    "verification",      // Claims verification oracle
    "data_provider",     // External data feed oracle
    "workflow",          // Multi-step workflow orchestrator
    "custom"             // Custom implementation
  ]).default("conversational"),
  
  description: z.string().max(500).optional(),
  
  network: z.enum(["mainnet", "testnet", "devnet"]).default("testnet"),
  
  ai_provider: z.enum(["openai", "anthropic", "openrouter", "local"]).default("openai"),
  
  features: z.object({
    slack: z.boolean().default(false),
    memory_engine: z.boolean().default(true),
    knowledge_base: z.boolean().default(true),
    live_agent: z.boolean().default(false)
  }).default({})
});

export type ScaffoldProjectInput = z.infer<typeof ScaffoldProjectInputSchema>;

// ============================================
// Network Configuration
// ============================================

const NETWORK_CONFIG = {
  mainnet: {
    chain_id: "ixo-5",
    rpc: "https://rpc.ixo.world",
    faucet: null,
    note: "Requires IXO tokens for gas fees"
  },
  testnet: {
    chain_id: "pandora-8",
    rpc: "https://rpc.testnet.ixo.earth",
    faucet: "https://faucet.testnet.ixo.earth"
  },
  devnet: {
    chain_id: "devnet-1",
    rpc: "https://rpc.devnet.ixo.earth",
    faucet: "https://faucet.devnet.ixo.earth"
  }
} as const;

// ============================================
// Main Function
// ============================================

export async function scaffoldProject(input: ScaffoldProjectInput) {
  const validated = ScaffoldProjectInputSchema.parse(input);
  const networkConfig = NETWORK_CONFIG[validated.network];

  const setupCommands = [
    "# Step 1: Install the CLI globally",
    "npm install -g ixo-oracles-cli",
    "",
    "# Step 2: Initialize your project (have IXO Mobile App ready)",
    "oracles-cli --init",
    "",
    "# When prompted:",
    `#   Project name: ${validated.project_name}`,
    "#   Template: IXO Oracles boilerplate",
    validated.description ? `#   Description: ${validated.description}` : "",
    "",
    "# Step 3: Navigate and install dependencies",
    `cd ${validated.project_name}`,
    "pnpm install",
    "",
    "# Step 4: Build the project",
    "pnpm build",
    "",
    "# Step 5: Start development",
    "cd apps/app",
    "pnpm start:dev"
  ].filter(Boolean);

  const postSetupTasks = [
    validated.ai_provider === "openai" && "Add OPENAI_API_KEY to .env",
    validated.ai_provider === "anthropic" && "Add ANTHROPIC_API_KEY to .env",
    validated.ai_provider === "openrouter" && "Add OPEN_ROUTER_API_KEY to .env",
    "Configure LANGFUSE keys for observability (optional)",
    validated.features.memory_engine && "Set up Neo4j and add NEO4J_* variables",
    validated.features.slack && "Configure SLACK_* variables for bot integration",
    validated.features.live_agent && "Configure LiveKit for voice/video calls",
    "Customize LangGraph flows in apps/app/src/",
    "Add your knowledge base documents to data-store",
    "Test locally with pnpm start:dev",
    "Deploy with Docker when ready"
  ].filter(Boolean);

  return {
    project_config: {
      name: validated.project_name,
      type: validated.oracle_type,
      description: validated.description || `${validated.oracle_type} oracle on IXO network`,
      network: validated.network,
      ai_provider: validated.ai_provider
    },
    setup_commands: setupCommands,
    features_enabled: {
      core: true,
      slack_integration: validated.features.slack,
      memory_engine: validated.features.memory_engine,
      knowledge_base: validated.features.knowledge_base,
      live_agent_calls: validated.features.live_agent
    },
    post_setup_tasks: postSetupTasks,
    network_config: networkConfig
  };
}

// ============================================
// CLI Usage Example
// ============================================

/*
Usage:

import { scaffoldProject } from './scaffold_project';

const result = await scaffoldProject({
  project_name: "carbon-verifier",
  oracle_type: "verification",
  description: "Oracle for verifying carbon credit claims",
  network: "testnet",
  ai_provider: "openai",
  features: {
    memory_engine: true,
    knowledge_base: true
  }
});

console.log(result.setup_commands.join('\n'));
*/
