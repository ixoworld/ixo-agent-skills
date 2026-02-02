import { 
  ToolResult,
  QiContext,
  AnalyzeSkillIntentArgs,
  AnalyzeSkillIntentArgsSchema,
  SkillIntent,
  ScaffoldSkillArgs,
  ScaffoldSkillArgsSchema,
  SkillScaffold,
  GenerateManifestArgs,
  GenerateManifestArgsSchema,
  GenerateHandlersArgs,
  GenerateHandlersArgsSchema,
  GenerateSchemasArgs,
  GenerateSchemasArgsSchema,
  ValidateSkillArgs,
  ValidateSkillArgsSchema,
  ValidationResult,
  PackageSkillArgs,
  PackageSkillArgsSchema,
  PackageResult,
  BuildCompleteSkillArgs,
  BuildCompleteSkillArgsSchema,
  BuildResult,
  Capability,
  ToolDefinition,
} from "./types";
import * as crypto from "crypto";

// ============================================================================
// Helper Functions
// ============================================================================

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function inferZodType(type: string): string {
  const typeMap: Record<string, string> = {
    string: "z.string()",
    number: "z.number()",
    integer: "z.number().int()",
    boolean: "z.boolean()",
    array: "z.array(z.any())",
    object: "z.record(z.any())",
    date: "z.string().datetime()",
    email: 'z.string().email()',
    url: 'z.string().url()',
    uuid: 'z.string().uuid()',
    cid: 'z.string().regex(/^(Qm|bafy)[a-zA-Z0-9]+$/)',
    did: 'z.string().regex(/^did:[a-z]+:.+$/)',
  };
  return typeMap[type.toLowerCase()] || "z.any()";
}

function generateHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function escapeQuotes(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeYaml(str: string): string {
  // For multi-line YAML strings, escape special characters
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

// ============================================================================
// Tool: analyze_skill_intent
// ============================================================================

export async function analyzeSkillIntent(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = AnalyzeSkillIntentArgsSchema.parse(args);
  
  context.log.info(`Analyzing skill intent from description: ${validated.user_description.slice(0, 50)}...`);
  
  const description = validated.user_description.toLowerCase();
  
  // Determine domain
  const domainKeywords: Record<string, string[]> = {
    finance: ["payment", "credit", "retire", "transfer", "balance", "wallet", "token"],
    credentials: ["credential", "certificate", "verify", "issue", "claim", "proof", "vc", "vp"],
    data: ["query", "fetch", "store", "retrieve", "analyze", "process", "transform"],
    identity: ["did", "identity", "authenticate", "authorize", "kyc"],
    registry: ["register", "record", "lookup", "resolve", "index"],
  };
  
  let detectedDomain = "general";
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => description.includes(kw))) {
      detectedDomain = domain;
      break;
    }
  }
  
  if (validated.domain_hints?.length) {
    detectedDomain = validated.domain_hints[0];
  }
  
  // Extract tool patterns
  const toolPatterns = [
    { pattern: /create|generate|build|issue/i, type: "transition" as const, action: "create" },
    { pattern: /read|get|fetch|query|retrieve|lookup/i, type: "read_only" as const, action: "read" },
    { pattern: /update|modify|change|edit/i, type: "transition" as const, action: "update" },
    { pattern: /delete|remove|revoke|retire/i, type: "transition" as const, action: "delete" },
    { pattern: /validate|verify|check|confirm/i, type: "read_only" as const, action: "validate" },
    { pattern: /transfer|send|move/i, type: "transition" as const, action: "transfer" },
  ];
  
  // Derive skill name
  const words = validated.user_description
    .split(/\s+/)
    .filter(w => w.length > 3 && !/^(that|this|with|from|into|for|the|and|can|will|should)$/i.test(w))
    .slice(0, 3);
  const skillName = toKebabCase(words.join("-"));
  
  // Generate tools and capabilities
  const tools: SkillIntent["tools"] = [];
  const capabilities: Capability[] = [];
  
  toolPatterns.forEach(({ pattern, type, action }) => {
    if (pattern.test(validated.user_description)) {
      const toolName = `${action}_${detectedDomain}_item`;
      const capName = `${detectedDomain}_${action}`;
      
      if (type === "transition") {
        capabilities.push({
          name: capName,
          resource: `did:qi:${detectedDomain}:item`,
          ability: action,
          description: `${action} operations on ${detectedDomain} items`,
        });
      }
      
      tools.push({
        name: toolName,
        description: `${toPascalCase(action)} a ${detectedDomain} item`,
        type,
        inputs: {
          item_id: { type: "string", description: "Unique identifier", required: true },
          ...(type === "transition" ? {
            data: { type: "object", description: "Item data", required: true }
          } : {}),
        },
        outputs: {
          result: { type: "object", description: "Operation result" },
          ...(type === "transition" ? {
            evidence_cid: { type: "cid", description: "IPFS evidence hash" }
          } : {}),
        },
        capability_needed: type === "transition" ? capName : null,
      });
    }
  });
  
  // Ensure at least one tool
  if (tools.length === 0) {
    tools.push({
      name: `process_${detectedDomain}_item`,
      description: `Process ${detectedDomain} item based on user intent`,
      type: "read_only",
      inputs: {
        input: { type: "object", description: "Input data", required: true },
      },
      outputs: {
        result: { type: "object", description: "Processing result" },
      },
      capability_needed: null,
    });
  }
  
  const intent: SkillIntent = {
    skill_name: skillName || "custom-skill",
    skill_description: validated.user_description,
    tools,
    capabilities,
    domain: detectedDomain,
    complexity: tools.length > 3 ? "complex" : tools.length > 1 ? "moderate" : "simple",
  };
  
  return {
    data: intent,
    summary: `Analyzed intent: ${intent.skill_name} with ${tools.length} tools in ${detectedDomain} domain`,
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
  
  // Generate SKILL.md with YAML frontmatter (Agent Skills standard)
  const skillMdContent = generateSkillMdContent(intent);
  files[`${basePath}/SKILL.md`] = skillMdContent;
  structure.push(`${basePath}/SKILL.md`);
  
  // Generate scripts/types.ts
  const typesContent = generateTypesContent(intent);
  files[`${basePath}/scripts/types.ts`] = typesContent;
  structure.push(`${basePath}/scripts/types.ts`);
  
  // Generate scripts/handlers.ts
  const handlersContent = generateHandlersContent(intent);
  files[`${basePath}/scripts/handlers.ts`] = handlersContent;
  structure.push(`${basePath}/scripts/handlers.ts`);
  
  // Generate tests if requested
  if (include_tests) {
    const testsContent = generateTestsContent(intent);
    files[`${basePath}/scripts/handlers.test.ts`] = testsContent;
    structure.push(`${basePath}/scripts/handlers.test.ts`);
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
    summary: `Scaffolded ${intent.skill_name} with ${structure.length} files (Agent Skills standard)`,
  };
}

// ============================================================================
// SKILL.md Generator (Agent Skills Standard)
// ============================================================================

function generateSkillMdContent(intent: SkillIntent): string {
  // Build YAML frontmatter
  // Indent each line of description for YAML multi-line format
  const descriptionLines = intent.skill_description
    .split('\n')
    .map(line => `  ${line}`)
    .join('\n');
  
  const frontmatter = `---
name: ${intent.skill_name}
description: |
${descriptionLines}
  Use when users need to work with ${intent.domain} operations.
---`;

  // Build tools documentation
  const toolsDocs = intent.tools.map(tool => {
    const inputsList = Object.entries(tool.inputs)
      .map(([name, spec]) => `- \`${name}\` (${spec.type}${spec.required ? '' : ', optional'}): ${spec.description}`)
      .join('\n');
    
    const outputsList = Object.entries(tool.outputs)
      .map(([name, spec]) => `- \`${name}\` (${spec.type}): ${spec.description}`)
      .join('\n');
    
    return `### ${tool.name}
${tool.description}

**Type**: ${tool.type}${tool.capability_needed ? ` (requires \`${tool.capability_needed}\` capability)` : ''}

**Inputs**:
${inputsList}

**Outputs**:
${outputsList}`;
  }).join('\n\n');

  // Build capabilities table
  let capabilitiesSection = '';
  if (intent.capabilities.length > 0) {
    const capRows = intent.capabilities
      .map(cap => `| ${cap.name} | ${cap.resource} | ${cap.ability} |`)
      .join('\n');
    
    capabilitiesSection = `## Capabilities

| Name | Resource | Ability |
|------|----------|---------|
${capRows}`;
  }

  // Assemble full SKILL.md
  return `${frontmatter}

# ${toPascalCase(intent.skill_name.replace(/-/g, ' '))}

${intent.skill_description}

## Tools

${toolsDocs}

${capabilitiesSection}

## Qi Flow Engine Integration

This skill runs on the Qi Flow Engine with UCAN authorization.

### Handler Location
All tool handlers are in \`scripts/handlers.ts\` with types in \`scripts/types.ts\`.

### Evidence Requirements
${intent.tools.some(t => t.type === 'transition') 
  ? 'Transition tools store evidence to IPFS and return the CID in the response.'
  : 'This skill contains only read-only tools; no evidence storage required.'}

### ToolResult Interface
All handlers return:
\`\`\`typescript
{
  data: Record<string, any>;  // Result payload
  evidence_cid?: string;      // IPFS CID (transition tools only)
  summary: string;            // Human-readable summary
}
\`\`\`
`;
}

// ============================================================================
// Types Generator
// ============================================================================

function generateTypesContent(intent: SkillIntent): string {
  const imports = `import { z } from "zod";\n\n`;
  
  const toolResultInterface = `/**
 * Standard result interface for Qi Flow Engine
 */
export interface ToolResult {
  data: Record<string, any>;
  evidence_cid?: string;
  summary: string;
}

/**
 * Qi Context provided by the Flow Engine
 */
export interface QiContext {
  ipfs: {
    save: (data: string | Buffer) => Promise<string>;
    get: (cid: string) => Promise<Buffer>;
  };
  log: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  ucan: {
    capabilities: string[];
    issuer: string;
    audience: string;
  };
}
\n`;
  
  const schemas = intent.tools.map(tool => {
    const schemaName = `${toPascalCase(tool.name)}ArgsSchema`;
    const typeName = `${toPascalCase(tool.name)}Args`;
    
    const fields = Object.entries(tool.inputs)
      .map(([name, spec]) => {
        let zodType = inferZodType(spec.type);
        if (!spec.required) {
          zodType += ".optional()";
        }
        if (spec.description) {
          zodType += `.describe("${escapeQuotes(spec.description)}")`;
        }
        return `  ${name}: ${zodType},`;
      })
      .join("\n");
    
    return `export const ${schemaName} = z.object({
${fields}
});

export type ${typeName} = z.infer<typeof ${schemaName}>;
`;
  }).join("\n");
  
  return imports + toolResultInterface + schemas;
}

// ============================================================================
// Handlers Generator
// ============================================================================

function generateHandlersContent(intent: SkillIntent): string {
  const imports = intent.tools.map(tool => {
    const pascalName = toPascalCase(tool.name);
    return `  ${pascalName}Args,\n  ${pascalName}ArgsSchema,`;
  }).join("\n");
  
  const header = `import {
  ToolResult,
  QiContext,
${imports}
} from "./types";
\n`;
  
  const handlers = intent.tools.map(tool => {
    const functionName = toCamelCase(tool.name);
    const pascalName = toPascalCase(tool.name);
    const schemaName = `${pascalName}ArgsSchema`;
    const isTransition = tool.type === "transition";
    
    return `/**
 * ${escapeQuotes(tool.description)}
 * Type: ${tool.type}
 * Required Auth: ${tool.capability_needed || "none"}
 */
export async function ${functionName}(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // Validate arguments using Zod schema
  const validated = ${schemaName}.parse(args);
  
  context.log.info(\`Executing ${tool.name} with: \${JSON.stringify(validated)}\`);
  
  // TODO: Implement ${tool.name} logic
  // IMPORTANT: This function must be stateless and deterministic
  
  const result = {
    processed: true,
    input: validated,
  };
  
  ${isTransition ? `// Store evidence to IPFS for transition operations
  // Note: Use deterministic timestamp from context or input, not new Date()
  const evidenceCid = await context.ipfs.save(JSON.stringify({
    operation: "${tool.name}",
    input: validated,
    output: result,
  }));
  
  return {
    data: result,
    evidence_cid: evidenceCid,
    summary: \`${escapeQuotes(tool.description)} completed successfully\`,
  };` : `return {
    data: result,
    summary: \`${escapeQuotes(tool.description)} completed successfully\`,
  };`}
}
`;
  }).join("\n");
  
  return header + handlers;
}

// ============================================================================
// Tests Generator
// ============================================================================

function generateTestsContent(intent: SkillIntent): string {
  const imports = intent.tools.map(tool => toCamelCase(tool.name)).join(", ");
  
  const header = `import { describe, it, expect, vi } from "vitest";
import { ${imports} } from "./handlers";

const mockContext = {
  ipfs: {
    save: vi.fn().mockResolvedValue("QmTestCid123"),
    get: vi.fn(),
  },
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  ucan: {
    capabilities: ["*"],
    issuer: "did:test:issuer",
    audience: "did:test:audience",
  },
};
\n`;
  
  const tests = intent.tools.map(tool => {
    const functionName = toCamelCase(tool.name);
    const sampleInput: Record<string, any> = {};
    
    Object.entries(tool.inputs).forEach(([name, spec]) => {
      if (spec.required) {
        sampleInput[name] = spec.type === "string" ? "test-value" 
          : spec.type === "number" ? 42 
          : spec.type === "boolean" ? true 
          : {};
      }
    });
    
    return `describe("${functionName}", () => {
  it("should execute successfully with valid input", async () => {
    const input = ${JSON.stringify(sampleInput, null, 4)};
    
    const result = await ${functionName}(input, mockContext);
    
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("summary");
    expect(typeof result.summary).toBe("string");
  });
  
  it("should reject invalid input", async () => {
    await expect(${functionName}({}, mockContext)).rejects.toThrow();
  });
});
`;
  }).join("\n");
  
  return header + tests;
}

// ============================================================================
// Tool: generate_manifest (generates SKILL.md frontmatter section)
// ============================================================================

export async function generateManifest(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = GenerateManifestArgsSchema.parse(args);
  const { intent } = validated;
  
  context.log.info(`Generating SKILL.md for: ${intent.skill_name}`);
  
  const skillMdContent = generateSkillMdContent(intent);
  
  return {
    data: { 
      skill_md: skillMdContent,
      format: "Agent Skills Standard (SKILL.md with YAML frontmatter)"
    },
    summary: `Generated SKILL.md for ${intent.skill_name} with ${intent.tools.length} tools`,
  };
}

// ============================================================================
// Tool: generate_handlers
// ============================================================================

export async function generateHandlers(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = GenerateHandlersArgsSchema.parse(args);
  const { intent } = validated;
  
  context.log.info(`Generating handlers for: ${intent.skill_name}`);
  
  const handlersContent = generateHandlersContent(intent);
  const typesContent = generateTypesContent(intent);
  
  const evidence = await context.ipfs.save(handlersContent + "\n---\n" + typesContent);
  
  return {
    data: {
      "scripts/handlers.ts": handlersContent,
      "scripts/types.ts": typesContent,
    },
    evidence_cid: evidence,
    summary: `Generated handlers and types for ${intent.tools.length} tools`,
  };
}

// ============================================================================
// Tool: generate_schemas
// ============================================================================

export async function generateSchemas(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = GenerateSchemasArgsSchema.parse(args);
  const { intent } = validated;
  
  context.log.info(`Generating Zod schemas for: ${intent.skill_name}`);
  
  const typesContent = generateTypesContent(intent);
  
  return {
    data: { "scripts/types.ts": typesContent },
    summary: `Generated Zod schemas for ${intent.tools.length} tools`,
  };
}

// ============================================================================
// Tool: validate_skill
// ============================================================================

export async function validateSkill(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = ValidateSkillArgsSchema.parse(args);
  
  context.log.info("Validating skill against Agent Skills standard");
  
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];
  const checksPassed: string[] = [];
  
  // Check for SKILL.md (Agent Skills standard)
  const skillMdKey = Object.keys(validated.skill_files).find(f => 
    f.endsWith("SKILL.md") || f.endsWith("/SKILL.md")
  );
  
  if (!skillMdKey) {
    // Check if they incorrectly used skill.yaml
    const skillYamlKey = Object.keys(validated.skill_files).find(f => 
      f.endsWith("skill.yaml") || f.endsWith("/skill.yaml")
    );
    
    if (skillYamlKey) {
      errors.push({
        file: skillYamlKey,
        message: "Agent Skills standard requires SKILL.md with YAML frontmatter, NOT skill.yaml. Convert to SKILL.md format.",
        severity: "error",
      });
    } else {
      errors.push({
        file: "SKILL.md",
        message: "Missing required SKILL.md file",
        severity: "error",
      });
    }
  } else {
    const content = validated.skill_files[skillMdKey];
    checksPassed.push("SKILL.md exists");
    
    // Validate YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      errors.push({
        file: "SKILL.md",
        message: "SKILL.md must start with YAML frontmatter (--- delimiters)",
        severity: "error",
      });
    } else {
      const frontmatter = frontmatterMatch[1];
      checksPassed.push("YAML frontmatter present");
      
      // Check required fields
      if (!frontmatter.includes("name:")) {
        errors.push({
          file: "SKILL.md",
          message: "YAML frontmatter missing required 'name' field",
          severity: "error",
        });
      } else {
        checksPassed.push("'name' field present");
      }
      
      if (!frontmatter.includes("description:")) {
        errors.push({
          file: "SKILL.md",
          message: "YAML frontmatter missing required 'description' field",
          severity: "error",
        });
      } else {
        checksPassed.push("'description' field present");
      }
      
      // Warn about old format fields
      if (frontmatter.includes("schema_version:") || frontmatter.includes("requirements:") || frontmatter.includes("tools:")) {
        warnings.push({
          file: "SKILL.md",
          message: "Frontmatter contains Qi manifest fields (schema_version, requirements, tools). These belong in the markdown body, not frontmatter.",
        });
      }
    }
  }
  
  // Validate handlers have ToolResult return type
  const handlersKey = Object.keys(validated.skill_files).find(f => f.endsWith("handlers.ts"));
  if (handlersKey) {
    const handlersContent = validated.skill_files[handlersKey];
    
    if (!handlersContent.includes("ToolResult")) {
      errors.push({
        file: handlersKey,
        message: "Handlers must return ToolResult interface",
        severity: "error",
      });
    } else {
      checksPassed.push("ToolResult type used");
    }
    
    if (!handlersContent.includes("QiContext")) {
      warnings.push({
        file: handlersKey,
        message: "Handlers should accept QiContext parameter",
      });
    } else {
      checksPassed.push("QiContext used");
    }
  }
  
  // Validate types have Zod schemas
  const typesKey = Object.keys(validated.skill_files).find(f => f.endsWith("types.ts"));
  if (typesKey) {
    const typesContent = validated.skill_files[typesKey];
    
    if (!typesContent.includes("import { z }") && !typesContent.includes('from "zod"')) {
      errors.push({
        file: typesKey,
        message: "Types must use Zod for validation",
        severity: "error",
      });
    } else {
      checksPassed.push("Zod imported");
    }
  }
  
  // In strict mode: valid only if no errors
  // In non-strict mode: valid if no errors (warnings are acceptable)
  const valid = errors.length === 0;
  
  const result: ValidationResult = {
    valid,
    errors,
    warnings,
    checks_passed: checksPassed,
  };
  
  return {
    data: result,
    summary: valid 
      ? `Validation passed: ${checksPassed.length} checks, ${warnings.length} warnings`
      : `Validation failed: ${errors.length} errors, ${warnings.length} warnings`,
  };
}

// ============================================================================
// Tool: package_skill
// ============================================================================

export async function packageSkill(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  const validated = PackageSkillArgsSchema.parse(args);
  
  context.log.info(`Packaging skill: ${validated.skill_name}`);
  
  const bundle = {
    name: validated.skill_name,
    version: "1.0.0",
    format: "Agent Skills Standard",
    created_at: new Date().toISOString(),
    files: validated.skill_files,
  };
  
  const bundleJson = JSON.stringify(bundle, null, 2);
  const bundleSize = Buffer.byteLength(bundleJson, "utf8");
  
  const cid = await context.ipfs.save(bundleJson);
  
  const skillMdKey = Object.keys(validated.skill_files).find(f => f.endsWith("SKILL.md"));
  const manifestHash = skillMdKey 
    ? generateHash(validated.skill_files[skillMdKey])
    : generateHash(bundleJson);
  
  const result: PackageResult = {
    cid,
    size_bytes: bundleSize,
    file_count: Object.keys(validated.skill_files).length,
    manifest_hash: manifestHash,
  };
  
  return {
    data: result,
    evidence_cid: cid,
    summary: `Packaged ${validated.skill_name}: ${Object.keys(validated.skill_files).length} files, ${bundleSize} bytes, CID: ${cid}`,
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
  
  context.log.info("Starting complete skill build pipeline (Agent Skills standard)");
  
  const stages: BuildResult["build_stages"] = [];
  let startTime = Date.now();
  
  // Stage 1: Analyze Intent
  let intentResult: ToolResult;
  try {
    intentResult = await analyzeSkillIntent({
      user_description: validated.user_description,
      domain_hints: validated.domain_hints,
      example_inputs: validated.example_inputs,
      example_outputs: validated.example_outputs,
    }, context);
    
    stages.push({
      stage: "analyze_intent",
      status: "success",
      duration_ms: Date.now() - startTime,
    });
  } catch (e) {
    stages.push({
      stage: "analyze_intent",
      status: "failed",
      duration_ms: Date.now() - startTime,
    });
    throw new Error(`Intent analysis failed: ${e}`);
  }
  
  const intent = intentResult.data as SkillIntent;
  startTime = Date.now();
  
  // Stage 2: Scaffold Skill (generates SKILL.md, not skill.yaml)
  let scaffoldResult: ToolResult;
  try {
    scaffoldResult = await scaffoldSkill({
      intent,
      include_tests: true,
    }, context);
    
    stages.push({
      stage: "scaffold_skill",
      status: "success",
      duration_ms: Date.now() - startTime,
    });
  } catch (e) {
    stages.push({
      stage: "scaffold_skill",
      status: "failed",
      duration_ms: Date.now() - startTime,
    });
    throw new Error(`Scaffolding failed: ${e}`);
  }
  
  const scaffold = scaffoldResult.data as SkillScaffold;
  startTime = Date.now();
  
  // Stage 3: Validate Skill
  let validationResult: ToolResult;
  try {
    validationResult = await validateSkill({
      skill_files: scaffold.files,
      strict: validated.strict_validation,
    }, context);
    
    stages.push({
      stage: "validate_skill",
      status: "success",
      duration_ms: Date.now() - startTime,
    });
  } catch (e) {
    stages.push({
      stage: "validate_skill",
      status: "failed",
      duration_ms: Date.now() - startTime,
    });
    throw new Error(`Validation failed: ${e}`);
  }
  
  const validation = validationResult.data as ValidationResult;
  startTime = Date.now();
  
  // Stage 4: Package Skill
  let packageResult: PackageResult | undefined;
  if (validation.valid) {
    try {
      const pkgResult = await packageSkill({
        skill_files: scaffold.files,
        skill_name: intent.skill_name,
      }, context);
      
      packageResult = pkgResult.data as PackageResult;
      
      stages.push({
        stage: "package_skill",
        status: "success",
        duration_ms: Date.now() - startTime,
      });
    } catch (e) {
      stages.push({
        stage: "package_skill",
        status: "failed",
        duration_ms: Date.now() - startTime,
      });
      context.log.warn(`Packaging failed: ${e}`);
    }
  } else {
    stages.push({
      stage: "package_skill",
      status: "skipped",
      duration_ms: 0,
    });
  }
  
  const result: BuildResult = {
    intent,
    files: scaffold.files,
    validation,
    package: packageResult,
    build_stages: stages,
  };
  
  return {
    data: result,
    evidence_cid: packageResult?.cid,
    summary: `Built ${intent.skill_name}: ${validation.valid ? "✓ valid" : "✗ invalid"}, ${stages.filter(s => s.status === "success").length}/${stages.length} stages passed (Agent Skills standard)`,
  };
}
