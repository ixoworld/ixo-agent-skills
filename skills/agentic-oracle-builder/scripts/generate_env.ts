/**
 * IXO Oracle Scaffold - Environment Configuration Generator
 * 
 * Generates complete .env configuration files for IXO Oracle projects.
 */

import { z } from "zod";

// ============================================
// Input Schema
// ============================================

export const GenerateEnvInputSchema = z.object({
  oracle_name: z.string().min(1).max(64),
  network: z.enum(["mainnet", "testnet", "devnet"]).default("testnet"),
  port: z.number().int().min(1024).max(65535).default(4000),
  matrix_base_url: z.string().url().default("https://matrix.ixo.world"),
  ai_provider: z.enum(["openai", "anthropic", "openrouter", "local"]).default("openai"),
  services: z.object({
    langfuse: z.boolean().default(true),
    neo4j: z.boolean().default(false),
    slack: z.boolean().default(false),
    livekit: z.boolean().default(false)
  }).default({})
});

export type GenerateEnvInput = z.infer<typeof GenerateEnvInputSchema>;

// ============================================
// Network Configuration
// ============================================

const NETWORK_CONFIG = {
  mainnet: { chain_id: "ixo-5", rpc: "https://rpc.ixo.world" },
  testnet: { chain_id: "pandora-8", rpc: "https://rpc.testnet.ixo.earth" },
  devnet: { chain_id: "devnet-1", rpc: "https://rpc.devnet.ixo.earth" }
} as const;

// ============================================
// Main Function
// ============================================

export async function generateEnv(input: GenerateEnvInput) {
  const validated = GenerateEnvInputSchema.parse(input);
  const networkConfig = NETWORK_CONFIG[validated.network];

  const envContent = `# ================================
# IXO Oracle: ${validated.oracle_name}
# Generated Environment Configuration
# Network: ${validated.network}
# ================================

# Server Configuration
PORT=${validated.port}
ORACLE_NAME=${validated.oracle_name}
NODE_ENV=development

# ================================
# Matrix Configuration
# Secure E2E encrypted communication
# ================================
MATRIX_BASE_URL=${validated.matrix_base_url}
MATRIX_ORACLE_ADMIN_ACCESS_TOKEN=
MATRIX_ORACLE_ADMIN_PASSWORD=
MATRIX_ORACLE_ADMIN_USER_ID=

# ================================
# IXO Blockchain Configuration
# Network: ${validated.network} (${networkConfig.chain_id})
# ================================
IXO_CHAIN_ID=${networkConfig.chain_id}
IXO_RPC_URL=${networkConfig.rpc}
ORACLE_ADDRESS=
ORACLE_DID=
ORACLE_MNEMONIC=
MATRIX_VAULT_PIN=
ENTITY_DID=

# ================================
# AI Provider: ${validated.ai_provider}
# ================================
${validated.ai_provider === "openai" ? "OPENAI_API_KEY=" : ""}
${validated.ai_provider === "anthropic" ? "ANTHROPIC_API_KEY=" : ""}
${validated.ai_provider === "openrouter" ? "OPEN_ROUTER_API_KEY=" : ""}
${validated.ai_provider === "local" ? "# Local model - no API key needed\nLOCAL_MODEL_PATH=" : ""}

${validated.services.langfuse ? `# ================================
# Langfuse Observability
# https://cloud.langfuse.com
# ================================
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
` : ""}
${validated.services.neo4j ? `# ================================
# Neo4j Memory Engine
# For personalization and context
# ================================
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=
` : ""}
${validated.services.slack ? `# ================================
# Slack Bot Integration
# https://api.slack.com/apps
# ================================
SLACK_BOT_TOKEN=xoxb-
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=xapp-
` : ""}
${validated.services.livekit ? `# ================================
# LiveKit Voice/Video Calls
# https://livekit.io
# ================================
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
` : ""}
# ================================
# Security Notes
# ================================
# - Never commit this file to version control
# - Use secrets manager in production
# - ORACLE_MNEMONIC grants full control - protect it!
# - Rotate credentials regularly
`;

  return {
    file_name: ".env",
    file_path: `${validated.oracle_name}/apps/app/.env`,
    content: envContent.trim(),
    network: validated.network,
    chain_id: networkConfig.chain_id,
    services_configured: Object.entries(validated.services)
      .filter(([_, v]) => v)
      .map(([k]) => k),
    security_checklist: [
      "Add .env to .gitignore",
      "Use environment-specific files (.env.production)",
      "Store secrets in vault for production",
      "Set up CI/CD secret injection"
    ]
  };
}
