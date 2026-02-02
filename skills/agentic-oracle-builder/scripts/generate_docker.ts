/**
 * IXO Oracle Scaffold - Docker Configuration Generator
 * 
 * Generates Dockerfile and docker-compose configurations for IXO Oracle deployment.
 */

import { z } from "zod";

// ============================================
// Input Schema
// ============================================

export const GenerateDockerInputSchema = z.object({
  project_name: z.string().min(1).max(64),
  node_version: z.string().default("22-alpine"),
  include_compose: z.boolean().default(true),
  include_dev_compose: z.boolean().default(true),
  expose_port: z.number().int().min(1024).max(65535).default(4000),
  include_neo4j: z.boolean().default(false),
  include_postgres: z.boolean().default(false)
});

export type GenerateDockerInput = z.infer<typeof GenerateDockerInputSchema>;

// ============================================
// Main Function
// ============================================

export async function generateDocker(input: GenerateDockerInput) {
  const validated = GenerateDockerInputSchema.parse(input);

  const dockerfile = `# Multi-stage Dockerfile for IXO Oracle: ${validated.project_name}
# Optimized for pnpm workspace structure

# ================================
# Stage 1: Dependencies
# ================================
FROM node:${validated.node_version} AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches

# Install dependencies
RUN pnpm fetch

# ================================
# Stage 2: Builder
# ================================
FROM node:${validated.node_version} AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install and build
RUN pnpm install --offline
RUN pnpm build

# ================================
# Stage 3: Production
# ================================
FROM node:${validated.node_version} AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built application
COPY --from=builder /app/apps/app/dist ./dist
COPY --from=builder /app/apps/app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=${validated.expose_port}

# Expose port
EXPOSE ${validated.expose_port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${validated.expose_port}/health || exit 1

# Run application
CMD ["node", "dist/main.js"]
`;

  const composeContent = validated.include_compose ? `# Docker Compose for IXO Oracle: ${validated.project_name}
version: '3.8'

services:
  oracle:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${validated.project_name}
    restart: unless-stopped
    ports:
      - "${validated.expose_port}:${validated.expose_port}"
    env_file:
      - ./apps/app/.env
    environment:
      - NODE_ENV=production
    networks:
      - oracle-network
${validated.include_neo4j || validated.include_postgres ? `    depends_on:
${validated.include_neo4j ? "      - neo4j\n" : ""}${validated.include_postgres ? "      - postgres\n" : ""}` : ""}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:${validated.expose_port}/health"]
      interval: 30s
      timeout: 10s
      retries: 3

${validated.include_neo4j ? `  neo4j:
    image: neo4j:5
    container_name: ${validated.project_name}-neo4j
    restart: unless-stopped
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/password
      - NEO4J_PLUGINS=["apoc"]
    volumes:
      - neo4j_data:/data
    networks:
      - oracle-network
` : ""}
${validated.include_postgres ? `  postgres:
    image: postgres:16-alpine
    container_name: ${validated.project_name}-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=oracle
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=oracle
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - oracle-network
` : ""}
networks:
  oracle-network:
    driver: bridge

volumes:
${validated.include_neo4j ? "  neo4j_data:\n" : ""}${validated.include_postgres ? "  postgres_data:\n" : ""}` : null;

  const devComposeContent = validated.include_dev_compose ? `# Development Docker Compose for IXO Oracle: ${validated.project_name}
version: '3.8'

services:
  oracle-dev:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder
    container_name: ${validated.project_name}-dev
    volumes:
      - ./apps/app/src:/app/apps/app/src
      - ./packages:/app/packages
    ports:
      - "${validated.expose_port}:${validated.expose_port}"
    env_file:
      - ./apps/app/.env
    environment:
      - NODE_ENV=development
    command: pnpm --filter @ixo/app start:dev
    networks:
      - oracle-network

${validated.include_neo4j ? `  neo4j:
    image: neo4j:5
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/devpassword
    networks:
      - oracle-network
` : ""}
networks:
  oracle-network:
    driver: bridge
` : null;

  return {
    files: {
      "Dockerfile": dockerfile,
      ...(validated.include_compose && { "docker-compose.yml": composeContent }),
      ...(validated.include_dev_compose && { "docker-compose.dev.yml": devComposeContent })
    },
    build_commands: [
      "# Build the image",
      `docker build -t ${validated.project_name}:latest .`,
      "",
      "# Run with compose",
      validated.include_compose ? "docker-compose up -d" : `docker run -p ${validated.expose_port}:${validated.expose_port} ${validated.project_name}:latest`,
      "",
      "# Development mode",
      validated.include_dev_compose ? "docker-compose -f docker-compose.dev.yml up" : ""
    ].filter(Boolean),
    exposed_port: validated.expose_port,
    services: {
      oracle: true,
      neo4j: validated.include_neo4j,
      postgres: validated.include_postgres
    }
  };
}
