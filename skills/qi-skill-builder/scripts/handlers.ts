import {
  ToolResult,
  QiContext,
  AnalyzeSkillIntentArgs,
  AnalyzeSkillIntentArgsSchema,
  SkillIntent,
  SkillConfig,
  ScaffoldSkillArgs,
  ScaffoldSkillArgsSchema,
  SkillScaffold,
  ValidateSkillArgs,
  ValidateSkillArgsSchema,
  ValidationResult,
  BuildCompleteSkillArgs,
  BuildCompleteSkillArgsSchema,
  BuildResult,
  WorkflowDefinition,
  CapabilityMapping,
  VerifierConfig,
  PrimitiveType,
} from "./types";

// ============================================================================
// Helper Functions
// ============================================================================

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function toCamelCase(str: string): string {
  return str.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// ============================================================================
// Intent Analysis Patterns
// ============================================================================

interface IntentPattern {
  keywords: string[];
  primitives: PrimitiveType[];
  action_type?: string;
  settlement_type?: string;
}

const INTENT_PATTERNS: Record<string, IntentPattern> = {
  submit: {
    keywords: ["submit", "create", "add", "register", "issue"],
    primitives: ["read_state", "propose_action"],
    action_type: "claim",
  },
  evaluate: {
    keywords: ["evaluate", "review", "assess", "approve", "reject"],
    primitives: ["read_state", "verify_evidence", "propose_action", "settle"],
    action_type: "eval",
    settlement_type: "eval",
  },
  dispute: {
    keywords: ["dispute", "challenge", "contest", "appeal"],
    primitives: ["read_state", "propose_action", "settle"],
    action_type: "dispute",
    settlement_type: "dispute",
  },
  transfer: {
    keywords: ["transfer", "send", "pay", "distribute"],
    primitives: ["read_state", "propose_action", "verify_evidence", "settle"],
    action_type: "transaction",
    settlement_type: "transfer",
  },
  query: {
    keywords: ["query", "get", "fetch", "list", "show", "view"],
    primitives: ["read_state"],
  },
  monitor: {
    keywords: ["monitor", "watch", "subscribe", "track", "observe"],
    primitives: ["observe"],
  },
  verify: {
    keywords: ["verify", "validate", "check", "confirm"],
    primitives: ["read_state", "verify_evidence"],
  },
};

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  claims: ["claim", "submission", "evidence", "proof", "attestation"],
  credentials: ["credential", "certificate", "badge", "diploma", "license"],
  finance: ["payment", "transfer", "balance", "token", "credit", "debit"],
  identity: ["identity", "did", "authenticate", "kyc", "profile"],
  registry: ["register", "record", "lookup", "resolve", "index"],
  data: ["data", "query", "fetch", "store", "process", "transform"],
  carbon: ["carbon", "emission", "offset", "credit", "footprint"],
  impact: ["impact", "outcome", "result", "measurement", "indicator"],
};

const VERIFIER_REGISTRY: Record<string, VerifierConfig> = {
  schema: {
    name: "schema",
    service_did: "did:ixo:entity:schema-validator",
    methods: ["validateClaim", "validateBatch", "validateCredential"],
    description: "JSON Schema validation",
  },
  signature: {
    name: "signature",
    service_did: "did:ixo:entity:sig-verifier",
    methods: ["verifyEd25519", "verifySecp256k1"],
    description: "Cryptographic signature verification",
  },
  merkle: {
    name: "merkle",
    service_did: "did:ixo:entity:merkle-verifier",
    methods: ["verifyInclusion", "verifyRoot"],
    description: "Merkle proof validation",
  },
  ucan: {
    name: "ucan",
    service_did: "did:ixo:entity:ucan-verifier",
    methods: ["validateUCAN", "checkCapability"],
    description: "UCAN token validation",
  },
};

// ============================================================================
// Tool: analyze_skill_intent
// ============================================================================

export async function analyzeSkillIntent(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = AnalyzeSkillIntentArgsSchema.parse(args);
  
  context.log.info(`Analyzing skill intent: ${validated.user_description.slice(0, 50)}...`);
  
  const description = validated.user_description.toLowerCase();
  
  // Detect domain
  let detectedDomain = "general";
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => description.includes(kw))) {
      detectedDomain = domain;
      break;
    }
  }
  
  if (validated.domain_hints?.length) {
    detectedDomain = validated.domain_hints[0];
  }
  
  // Derive skill name
  const words = validated.user_description
    .split(/\s+/)
    .filter(w => w.length > 3 && !/^(that|this|with|from|into|for|the|and|can|will|should|create|build|make)$/i.test(w))
    .slice(0, 3);
  const skillName = toKebabCase(words.join("-")) || `${detectedDomain}-skill`;
  
  // Detect workflows from intent patterns
  const detectedWorkflows: SkillIntent["workflows"] = [];
  const primitivesSet = new Set<PrimitiveType>();
  
  for (const [patternName, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.keywords.some(kw => description.includes(kw))) {
      pattern.primitives.forEach(p => primitivesSet.add(p));
      
      detectedWorkflows.push({
        name: `${patternName}_${detectedDomain}`,
        description: `${toPascalCase(patternName)} ${detectedDomain} items`,
        intent_pattern: patternName,
        steps: pattern.primitives,
      });
    }
  }
  
  // Ensure at least one workflow
  if (detectedWorkflows.length === 0) {
    primitivesSet.add("read_state");
    primitivesSet.add("propose_action");
    detectedWorkflows.push({
      name: `process_${detectedDomain}`,
      description: `Process ${detectedDomain} items`,
      intent_pattern: "submit",
      steps: ["read_state", "propose_action"],
    });
  }
  
  // Derive capabilities
  const capabilities: CapabilityMapping[] = [];
  
  if (primitivesSet.has("observe")) {
    capabilities.push({ fragment: "#cap-01", ability: "observe", scope: "state:*" });
  }
  if (primitivesSet.has("read_state")) {
    capabilities.push({ fragment: "#cap-02", ability: "read", scope: "state:*" });
  }
  if (primitivesSet.has("propose_action")) {
    capabilities.push({ fragment: "#cap-03", ability: "propose", scope: `${detectedDomain}:*` });
  }
  if (primitivesSet.has("settle")) {
    capabilities.push({ fragment: "#cap-04", ability: "settle", scope: `${detectedDomain}:*` });
    
    // Add dispute capability if disputes detected
    if (detectedWorkflows.some(w => w.intent_pattern === "dispute")) {
      capabilities.push({ fragment: "#cap-05", ability: "settle", scope: "disputes:*" });
    }
  }
  
  // Determine needed verifiers
  const verifiers: VerifierConfig[] = [];
  if (primitivesSet.has("verify_evidence")) {
    verifiers.push(VERIFIER_REGISTRY.schema);
    
    if (description.includes("signature") || description.includes("sign")) {
      verifiers.push(VERIFIER_REGISTRY.signature);
    }
  }
  
  const intent: SkillIntent = {
    skill_name: skillName,
    skill_description: validated.user_description,
    domain: detectedDomain,
    primitives_needed: Array.from(primitivesSet),
    workflows: detectedWorkflows,
    capabilities,
    verifiers,
    complexity: detectedWorkflows.length > 3 ? "complex" : detectedWorkflows.length > 1 ? "moderate" : "simple",
  };
  
  return {
    data: intent,
    summary: `Analyzed: ${skillName} with ${detectedWorkflows.length} workflows using ${primitivesSet.size} primitives`,
  };
}

// ============================================================================
// Tool: scaffold_skill
// ============================================================================

export async function scaffoldSkill(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = ScaffoldSkillArgsSchema.parse(args);
  const { intent, output_path, include_tests } = validated;
  
  context.log.info(`Scaffolding skill: ${intent.skill_name}`);
  
  const basePath = output_path || intent.skill_name;
  const files: Record<string, string> = {};
  const structure: string[] = [];
  
  // Generate SKILL.md
  const skillMd = generateSkillMd(intent);
  files[`${basePath}/SKILL.md`] = skillMd;
  structure.push(`${basePath}/SKILL.md`);
  
  // Generate scripts/config.ts
  const configTs = generateConfigTs(intent);
  files[`${basePath}/scripts/config.ts`] = configTs;
  structure.push(`${basePath}/scripts/config.ts`);
  
  // Generate scripts/templates.ts
  const templatesTs = generateTemplatesTs(intent);
  files[`${basePath}/scripts/templates.ts`] = templatesTs;
  structure.push(`${basePath}/scripts/templates.ts`);
  
  // Generate scripts/types.ts
  const typesTs = generateTypesTs(intent);
  files[`${basePath}/scripts/types.ts`] = typesTs;
  structure.push(`${basePath}/scripts/types.ts`);
  
  // Generate references/workflows.md
  const workflowsMd = generateWorkflowsMd(intent);
  files[`${basePath}/references/workflows.md`] = workflowsMd;
  structure.push(`${basePath}/references/workflows.md`);
  
  // Generate tests if requested
  if (include_tests) {
    const testsTs = generateTestsTs(intent);
    files[`${basePath}/scripts/templates.test.ts`] = testsTs;
    structure.push(`${basePath}/scripts/templates.test.ts`);
  }
  
  const scaffold: SkillScaffold = {
    path: basePath,
    files,
    structure,
  };
  
  const evidence = await context.ipfs.save(JSON.stringify(scaffold, null, 2));
  
  return {
    data: scaffold,
    evidence_cid: evidence,
    summary: `Scaffolded ${intent.skill_name} with ${structure.length} files`,
  };
}

// ============================================================================
// File Generators
// ============================================================================

function generateSkillMd(intent: SkillIntent): string {
  const workflowDocs = intent.workflows.map(w => {
    const stepsStr = w.steps.map(s => `\`${s}\``).join(" → ");
    return `### ${toSnakeCase(w.name)}
${w.description}

**Primitives**: ${stepsStr}`;
  }).join("\n\n");
  
  const capabilityRows = intent.capabilities
    .map(c => `| ${c.fragment} | ${c.ability} | ${c.scope || "*"} |`)
    .join("\n");
  
  return `---
name: ${intent.skill_name}
description: |
  ${intent.skill_description}
  Domain: ${intent.domain}. Composes primitives: ${intent.primitives_needed.join(", ")}.
---

# ${toPascalCase(intent.skill_name.replace(/-/g, " "))}

${intent.skill_description}

## Workflows

${workflowDocs}

## Capabilities

| Fragment | Ability | Scope |
|----------|---------|-------|
${capabilityRows}

## Primitive Composition

This skill composes the following primitives from \`qi-capability-api\`:

${intent.primitives_needed.map(p => `- \`${p}\``).join("\n")}

## Usage

\`\`\`typescript
import { ${intent.workflows.map(w => toCamelCase(w.name)).join(", ")} } from "./scripts/templates";

// Example: ${intent.workflows[0]?.name || "workflow"}
const result = await ${toCamelCase(intent.workflows[0]?.name || "process")}(resourceId, inputData);
\`\`\`

## References

- \`references/workflows.md\` — Detailed workflow documentation
`;
}

function generateConfigTs(intent: SkillIntent): string {
  const capabilitiesObj = intent.capabilities
    .map(c => `  ${c.ability}${c.scope?.includes("dispute") ? "_dispute" : ""}: "${c.fragment}",`)
    .join("\n");
  
  const verifiersObj = intent.verifiers.length > 0
    ? intent.verifiers.map(v => `  ${v.name}: "${v.service_did}",`).join("\n")
    : '  schema: "did:ixo:entity:schema-validator",';
  
  return `/**
 * ${toPascalCase(intent.skill_name)} Configuration
 * 
 * Domain: ${intent.domain}
 * Generated skill composing qi-capability-api primitives
 */

export const skillConfig = {
  name: "${intent.skill_name}",
  domain: "${intent.domain}",
  description: "${intent.skill_description.replace(/"/g, '\\"').slice(0, 100)}",
  
  // Resource DID pattern - replace {entity_id} at runtime
  resource_pattern: "did:ixo:entity:{entity_id}",
  
  // Capability DID fragments
  capabilities: {
${capabilitiesObj}
  },
  
  // Adapter configuration
  adapters: {
    primary: "chain" as const,
    realtime: "matrix" as const,
  },
  
  // Verifier services
  verifiers: {
${verifiersObj}
  },
  
  // Chain configuration
  chain: {
    target: "ixo" as const,
    gas_limit: 200000,
  },
};

export type SkillConfig = typeof skillConfig;
`;
}

function generateTemplatesTs(intent: SkillIntent): string {
  const imports = `import {
  observe,
  read_state,
  propose_action,
  verify_evidence,
  settle,
} from "qi-capability-api";
import { skillConfig } from "./config";
import type { ${intent.workflows.map(w => `${toPascalCase(w.name)}Input`).join(", ")} } from "./types";
`;

  const workflows = intent.workflows.map(w => {
    const functionName = toCamelCase(w.name);
    const inputType = `${toPascalCase(w.name)}Input`;
    
    const steps = generateWorkflowSteps(w, intent);
    
    return `/**
 * ${w.description}
 * Primitives: ${w.steps.join(" → ")}
 */
export async function ${functionName}(
  entityId: string,
  input: ${inputType}
) {
${steps}
}`;
  }).join("\n\n");

  return `${imports}

${workflows}
`;
}

function generateWorkflowSteps(
  workflow: SkillIntent["workflows"][0],
  intent: SkillIntent
): string {
  const steps: string[] = [];
  let indent = "  ";
  
  for (let i = 0; i < workflow.steps.length; i++) {
    const primitive = workflow.steps[i];
    const isLast = i === workflow.steps.length - 1;
    const varName = `step${i + 1}`;
    
    switch (primitive) {
      case "observe":
        steps.push(`${indent}// Step ${i + 1}: Subscribe to state changes
${indent}const ${varName} = await observe({
${indent}  resource: \`did:ixo:entity:\${entityId}\`,
${indent}  source: skillConfig.adapters.realtime,
${indent}  filter: { event_types: ["${intent.domain}.updated"] },
${indent}});`);
        break;
        
      case "read_state":
        steps.push(`${indent}// Step ${i + 1}: Read current state
${indent}const ${varName} = await read_state({
${indent}  resource: \`did:ixo:entity:\${entityId}\`,
${indent}  source: skillConfig.adapters.primary,
${indent}  query: { path: "${intent.domain}" },
${indent}});`);
        break;
        
      case "propose_action":
        const actionType = INTENT_PATTERNS[workflow.intent_pattern]?.action_type || "claim";
        steps.push(`${indent}// Step ${i + 1}: Propose action
${indent}const ${varName} = await propose_action({
${indent}  action_type: "${actionType}",
${indent}  resource: \`did:ixo:entity:\${entityId}\`,
${indent}  payload: input,
${indent}  dependencies: ${i > 0 ? `[step${i}.snapshot_cid || step${i}.proposal_cid]` : "[]"},
${indent}});`);
        break;
        
      case "verify_evidence":
        steps.push(`${indent}// Step ${i + 1}: Verify evidence
${indent}const ${varName} = await verify_evidence({
${indent}  evidence_type: "schema",
${indent}  evidence_cid: step${i}.proposal_cid || step${i}.snapshot_cid,
${indent}  verifier: {
${indent}    service_did: skillConfig.verifiers.schema,
${indent}    method: "validateClaim",
${indent}  },
${indent}});`);
        break;
        
      case "settle":
        const settlementType = INTENT_PATTERNS[workflow.intent_pattern]?.settlement_type || "claim";
        const capFragment = settlementType === "dispute" ? "settle_dispute" : "settle";
        steps.push(`${indent}// Step ${i + 1}: Settle on-chain
${indent}const ${varName} = await settle({
${indent}  proposal_cid: step${i}.proposal_cid,
${indent}  verification_cid: step${i - 1}?.attestation_cid,
${indent}  settlement_type: "${settlementType}",
${indent}  capability_did: \`did:ixo:entity:\${entityId}\${skillConfig.capabilities.${capFragment}}\`,
${indent}  chain_config: skillConfig.chain,
${indent}});`);
        break;
    }
    
    steps.push("");
  }
  
  // Return statement
  const lastStep = `step${workflow.steps.length}`;
  steps.push(`${indent}return ${lastStep};`);
  
  return steps.join("\n");
}

function generateTypesTs(intent: SkillIntent): string {
  const inputTypes = intent.workflows.map(w => {
    const typeName = `${toPascalCase(w.name)}Input`;
    
    // Generate reasonable input fields based on workflow type
    let fields = "";
    if (w.intent_pattern === "submit" || w.intent_pattern === "evaluate") {
      fields = `  data: Record<string, any>;
  metadata?: Record<string, any>;`;
    } else if (w.intent_pattern === "dispute") {
      fields = `  claim_id: string;
  reason: string;
  evidence_cids?: string[];`;
    } else if (w.intent_pattern === "transfer") {
      fields = `  to: string;
  amount: string;
  memo?: string;`;
    } else if (w.intent_pattern === "query") {
      fields = `  filter?: Record<string, any>;
  limit?: number;`;
    } else {
      fields = `  data: Record<string, any>;`;
    }
    
    return `export interface ${typeName} {
${fields}
}`;
  }).join("\n\n");

  return `/**
 * ${toPascalCase(intent.skill_name)} Types
 */

${inputTypes}

/**
 * Common result type from workflows
 */
export interface WorkflowResult {
  success: boolean;
  evidence_cid?: string;
  tx_hash?: string;
  data?: Record<string, any>;
}
`;
}

function generateWorkflowsMd(intent: SkillIntent): string {
  const workflowDocs = intent.workflows.map(w => {
    const stepsDoc = w.steps.map((step, i) => {
      return `${i + 1}. **${step}**: ${getStepDescription(step, w.intent_pattern)}`;
    }).join("\n");
    
    return `## ${toPascalCase(w.name)}

${w.description}

### Steps

${stepsDoc}

### Example

\`\`\`typescript
import { ${toCamelCase(w.name)} } from "../scripts/templates";

const result = await ${toCamelCase(w.name)}("entity123", {
  // input data
});
\`\`\`
`;
  }).join("\n---\n\n");

  return `# ${toPascalCase(intent.skill_name)} Workflows

Detailed documentation for all workflows in this skill.

${workflowDocs}
`;
}

function getStepDescription(primitive: PrimitiveType, intentPattern: string): string {
  const descriptions: Record<PrimitiveType, string> = {
    observe: "Subscribe to real-time state changes",
    read_state: "Query current state from chain/adapter",
    propose_action: `Draft ${intentPattern} action for settlement`,
    verify_evidence: "Validate evidence via external verifier",
    settle: "Commit action on-chain with UCAN authorization",
  };
  return descriptions[primitive] || "Execute primitive";
}

function generateTestsTs(intent: SkillIntent): string {
  const imports = intent.workflows.map(w => toCamelCase(w.name)).join(", ");
  
  const tests = intent.workflows.map(w => {
    const functionName = toCamelCase(w.name);
    const inputType = `${toPascalCase(w.name)}Input`;
    
    return `describe("${functionName}", () => {
  it("should execute workflow successfully", async () => {
    const input: ${inputType} = {
      data: { test: true },
    };
    
    const result = await ${functionName}("test-entity", input);
    
    expect(result).toBeDefined();
  });
});`;
  }).join("\n\n");

  return `import { describe, it, expect, vi } from "vitest";
import { ${imports} } from "./templates";
import type { ${intent.workflows.map(w => `${toPascalCase(w.name)}Input`).join(", ")} } from "./types";

// Mock qi-capability-api primitives
vi.mock("qi-capability-api", () => ({
  observe: vi.fn().mockResolvedValue({ subscription_id: "sub_123" }),
  read_state: vi.fn().mockResolvedValue({ data: {}, snapshot_cid: "Qm123" }),
  propose_action: vi.fn().mockResolvedValue({ proposal_cid: "Qm456", draft: {} }),
  verify_evidence: vi.fn().mockResolvedValue({ valid: true, attestation_cid: "Qm789" }),
  settle: vi.fn().mockResolvedValue({ tx_hash: "ABC123", evidence_cid: "QmABC" }),
}));

${tests}
`;
}

// ============================================================================
// Tool: validate_skill
// ============================================================================

export async function validateSkill(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = ValidateSkillArgsSchema.parse(args);
  
  context.log.info("Validating skill");
  
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];
  const checksPassed: string[] = [];
  
  // Check SKILL.md exists
  const skillMdKey = Object.keys(validated.skill_files).find(f => f.endsWith("SKILL.md"));
  if (!skillMdKey) {
    errors.push({ file: "SKILL.md", message: "Missing SKILL.md", severity: "error" });
  } else {
    const content = validated.skill_files[skillMdKey];
    
    // Check frontmatter
    if (!content.startsWith("---")) {
      errors.push({ file: "SKILL.md", message: "Missing YAML frontmatter", severity: "error" });
    } else {
      checksPassed.push("YAML frontmatter present");
    }
    
    // Check for primitive imports mention
    if (!content.includes("qi-capability-api") && !content.includes("primitive")) {
      warnings.push({ file: "SKILL.md", message: "Should reference qi-capability-api primitives" });
    } else {
      checksPassed.push("Primitive composition documented");
    }
  }
  
  // Check config.ts
  const configKey = Object.keys(validated.skill_files).find(f => f.endsWith("config.ts"));
  if (!configKey) {
    errors.push({ file: "config.ts", message: "Missing config.ts", severity: "error" });
  } else {
    const content = validated.skill_files[configKey];
    
    if (!content.includes("skillConfig")) {
      errors.push({ file: "config.ts", message: "Must export skillConfig", severity: "error" });
    } else {
      checksPassed.push("skillConfig exported");
    }
    
    if (!content.includes("capabilities")) {
      warnings.push({ file: "config.ts", message: "Should define capabilities" });
    } else {
      checksPassed.push("Capabilities defined");
    }
  }
  
  // Check templates.ts
  const templatesKey = Object.keys(validated.skill_files).find(f => f.endsWith("templates.ts"));
  if (!templatesKey) {
    errors.push({ file: "templates.ts", message: "Missing templates.ts", severity: "error" });
  } else {
    const content = validated.skill_files[templatesKey];
    
    // Must import from qi-capability-api
    if (!content.includes("qi-capability-api")) {
      errors.push({ file: "templates.ts", message: "Must import from qi-capability-api", severity: "error" });
    } else {
      checksPassed.push("Imports qi-capability-api");
    }
    
    // Should use primitives
    const primitives = ["observe", "read_state", "propose_action", "verify_evidence", "settle"];
    const usedPrimitives = primitives.filter(p => content.includes(p));
    
    if (usedPrimitives.length === 0) {
      errors.push({ file: "templates.ts", message: "Must use at least one primitive", severity: "error" });
    } else {
      checksPassed.push(`Uses ${usedPrimitives.length} primitives`);
    }
  }
  
  const valid = errors.length === 0;
  
  return {
    data: { valid, errors, warnings, checks_passed: checksPassed },
    summary: valid
      ? `Valid: ${checksPassed.length} checks passed`
      : `Invalid: ${errors.length} errors, ${warnings.length} warnings`,
  };
}

// ============================================================================
// Tool: build_complete_skill
// ============================================================================

export async function buildCompleteSkill(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = BuildCompleteSkillArgsSchema.parse(args);
  
  context.log.info("Building complete skill with primitive composition");
  
  const stages: BuildResult["build_stages"] = [];
  let startTime = Date.now();
  
  // Stage 1: Analyze
  let intentResult: ToolResult;
  try {
    intentResult = await analyzeSkillIntent({
      user_description: validated.user_description,
      domain_hints: validated.domain_hints,
      example_workflows: validated.example_workflows,
    }, context);
    stages.push({ stage: "analyze", status: "success", duration_ms: Date.now() - startTime });
  } catch (e) {
    stages.push({ stage: "analyze", status: "failed", duration_ms: Date.now() - startTime });
    throw e;
  }
  
  const intent = intentResult.data as SkillIntent;
  startTime = Date.now();
  
  // Stage 2: Scaffold
  let scaffoldResult: ToolResult;
  try {
    scaffoldResult = await scaffoldSkill({ intent, include_tests: true }, context);
    stages.push({ stage: "scaffold", status: "success", duration_ms: Date.now() - startTime });
  } catch (e) {
    stages.push({ stage: "scaffold", status: "failed", duration_ms: Date.now() - startTime });
    throw e;
  }
  
  const scaffold = scaffoldResult.data as SkillScaffold;
  startTime = Date.now();
  
  // Stage 3: Validate
  let validationResult: ToolResult;
  try {
    validationResult = await validateSkill({
      skill_files: scaffold.files,
      strict: validated.strict_validation,
    }, context);
    stages.push({ stage: "validate", status: "success", duration_ms: Date.now() - startTime });
  } catch (e) {
    stages.push({ stage: "validate", status: "failed", duration_ms: Date.now() - startTime });
    throw e;
  }
  
  const validation = validationResult.data as ValidationResult;
  
  // Build config object
  const config: SkillConfig = {
    name: intent.skill_name,
    domain: intent.domain,
    description: intent.skill_description,
    resource_pattern: "did:ixo:entity:{entity_id}",
    capabilities: Object.fromEntries(intent.capabilities.map(c => [c.ability, c.fragment])),
    adapters: { primary: "chain", realtime: "matrix" },
    verifiers: Object.fromEntries(intent.verifiers.map(v => [v.name, v.service_did])),
    workflows: intent.workflows.map(w => ({
      name: w.name,
      description: w.description,
      steps: w.steps.map(s => ({ primitive: s })),
      input_schema: {},
      output_schema: {},
    })),
  };
  
  const result: BuildResult = {
    intent,
    config,
    files: scaffold.files,
    validation,
    build_stages: stages,
  };
  
  return {
    data: result,
    evidence_cid: scaffoldResult.evidence_cid,
    summary: `Built ${intent.skill_name}: ${intent.workflows.length} workflows, ${validation.valid ? "✓ valid" : "✗ invalid"}`,
  };
}
