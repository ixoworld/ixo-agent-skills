import {
  ResolveErrorArgsSchema,
  ResolveErrorArgs,
  ErrorResolution,
  ExpertiseLevel,
  ErrorEntry,
  ToolResult,
  QiContext,
} from "./types";

import {
  ALL_ERRORS,
  ERROR_INDEX,
  MESSAGE_INDEX,
  CODESPACES,
} from "./error-database";

// ============================================================================
// Helper Functions
// ============================================================================

export interface ParsedErrorInput {
  code?: number;
  codespace?: string;
  message?: string;
  txHash?: string;
  rawLog?: string;
}

function normalizeCodespace(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/^["']|["']$/g, "").toLowerCase();
  return normalized || undefined;
}

function normalizeMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_:/,.;()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFiniteInteger(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && Number.isFinite(parsed) ? parsed : undefined;
}

function applyObjectFields(value: unknown, result: ParsedErrorInput): void {
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const code = parseFiniteInteger(record.code);
  if (result.code === undefined && code !== undefined && code !== 0) {
    result.code = code;
  }

  if (!result.codespace) {
    result.codespace = normalizeCodespace(record.codespace);
  }

  if (!result.message) {
    result.message =
      normalizeMessage(record.message) ||
      normalizeMessage(record.error) ||
      normalizeMessage(record.log);
  }

  if (!result.rawLog) {
    const rawLog = record.raw_log ?? record.rawLog;
    result.rawLog =
      normalizeMessage(rawLog) ||
      (rawLog && typeof rawLog === "object" ? JSON.stringify(rawLog) : undefined);
  }

  if (!result.txHash) {
    const hash =
      normalizeMessage(record.txhash) ||
      normalizeMessage(record.tx_hash) ||
      normalizeMessage(record.hash);
    if (hash && /^[A-Fa-f0-9]{64}$/.test(hash)) {
      result.txHash = hash.toUpperCase();
    }
  }
}

function applyNestedJsonFields(value: unknown, result: ParsedErrorInput): void {
  applyObjectFields(value, result);

  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const nestedCandidates = [
    record.tx_response,
    record.txResponse,
    record.response,
    record.error_response,
    record.errorResponse,
    record.data,
  ];

  for (const candidate of nestedCandidates) {
    applyObjectFields(candidate, result);
  }

  const data = record.data as Record<string, unknown> | undefined;
  if (data && typeof data === "object") {
    applyObjectFields(data.tx_response, result);
    applyObjectFields(data.txResponse, result);
  }
}

/**
 * Parse error input to extract code, codespace, and message
 */
export function parseErrorInput(input: string): ParsedErrorInput {
  const result: ParsedErrorInput = {};
  const trimmed = input.trim();

  // Check if it's a transaction hash (64 hex chars)
  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) {
    result.txHash = trimmed.toUpperCase();
    return result;
  }

  // Check for JSON format (common in CLI output)
  try {
    const parsed = JSON.parse(input);
    applyNestedJsonFields(parsed, result);
    if (!result.message && result.rawLog) result.message = result.rawLog;
    return result;
  } catch {
    // Not JSON, continue parsing
  }

  const embeddedHash = input.match(/\b[A-Fa-f0-9]{64}\b/);
  if (embeddedHash) {
    result.txHash = embeddedHash[0].toUpperCase();
  }

  // Extract error code patterns
  // Pattern: "code: 11", "code=11", "Code 11", or "error code 11"
  const codeMatch = input.match(/(?:\bcode\s*[:=]?\s*|\berror\s+code\s+)(\d+)/i);
  if (codeMatch) {
    result.code = parseInt(codeMatch[1], 10);
  }

  // Pattern: "codespace: bank" or "codespace=bank"
  const codespaceMatch = input.match(
    /\bcodespace\s*[:=]\s*["']?([a-z][a-z0-9 _-]*?)(?=["',;\n}]|\s+\b(?:code|message|raw_log|rawLog|log)\b\s*[:=]|$)/i
  );
  if (codespaceMatch) {
    result.codespace = normalizeCodespace(codespaceMatch[1]);
  }

  // Extract message patterns
  // Pattern: "message: out of gas", "error: out of gas", or "raw_log: ..."
  const messageMatch = input.match(/\b(?:message|error|raw_log|rawLog|log)\s*[:=]\s*["']?([^"'\n]+)/i);
  if (messageMatch) {
    result.message = messageMatch[1].trim();
  }

  // If just a number, treat as error code
  if (/^\d+$/.test(trimmed)) {
    result.code = parseInt(trimmed, 10);
  }

  // If no structured data found, use input as message
  if (!result.code && !result.codespace && !result.message && !result.txHash) {
    result.message = trimmed;
  }

  // Check for raw log format
  if (input.includes("raw_log") || input.includes("failed to execute message")) {
    result.rawLog = input;
    if (!result.message) result.message = input;
  }

  return result;
}

function addUniqueMatch(matches: ErrorEntry[], entry: ErrorEntry): void {
  if (!matches.some((match) => match.codespace === entry.codespace && match.code === entry.code)) {
    matches.push(entry);
  }
}

/**
 * Find matching error entries
 */
function findMatchingErrors(
  code?: number,
  codespace?: string,
  message?: string
): ErrorEntry[] {
  const matches: ErrorEntry[] = [];
  const normalizedCodespace = normalizeCodespace(codespace);

  // Direct lookup by codespace:code
  if (code !== undefined && normalizedCodespace) {
    const key = `${normalizedCodespace}:${code}`;
    const directMatch = ERROR_INDEX.get(key);
    if (directMatch) {
      return [directMatch];
    }
  }

  // Lookup by code only (check all codespaces)
  if (code !== undefined && !normalizedCodespace) {
    for (const entry of ERROR_INDEX.values()) {
      if (entry.code === code) {
        addUniqueMatch(matches, entry);
      }
    }
    if (matches.length > 0) return matches;
  }

  // Lookup by message (fuzzy match)
  if (message) {
    const normalizedMessage = normalizeSearchText(message);
    const candidates = normalizedCodespace
      ? ALL_ERRORS.filter((entry) => entry.codespace === normalizedCodespace)
      : ALL_ERRORS;
    
    // Direct message match
    const directMatches = MESSAGE_INDEX.get(message.toLowerCase().trim());
    if (directMatches && directMatches.length > 0) {
      const scopedMatches = normalizedCodespace
        ? directMatches.filter((entry) => entry.codespace === normalizedCodespace)
        : directMatches;
      if (scopedMatches.length > 0) return scopedMatches;
    }

    // Partial match
    for (const entry of candidates) {
      const entryMessage = normalizeSearchText(entry.message);
      const entryExplanation = normalizeSearchText(entry.explanation);
      if (
        entryMessage.includes(normalizedMessage) ||
        normalizedMessage.includes(entryMessage) ||
        entryExplanation.includes(normalizedMessage)
      ) {
        addUniqueMatch(matches, entry);
      }
    }

    // Keyword matching
    if (matches.length === 0) {
      const keywords = [...new Set(normalizedMessage.split(/\s+/).filter(w =>
        w.length > 3 && !["failed", "error", "message", "index", "execute"].includes(w)
      ))];
      if (keywords.length > 0) {
        for (const entry of candidates) {
          const entryText = normalizeSearchText(`${entry.message} ${entry.explanation} ${entry.causes.join(" ")}`);
          const matchCount = keywords.filter(k => entryText.includes(k)).length;
          if (matchCount >= Math.ceil(keywords.length * 0.5)) {
            addUniqueMatch(matches, entry);
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Tailor explanation to expertise level
 */
function tailorExplanation(
  entry: ErrorEntry,
  level: ExpertiseLevel,
  context?: string
): {
  explanation: string;
  whatHappened: string;
  causes: string[];
  steps: string[];
  commands?: { description: string; command: string; note?: string }[];
} {
  const commands: { description: string; command: string; note?: string }[] = [];
  let explanation = entry.explanation;
  let whatHappened = "";
  let causes = [...entry.causes];
  let steps: string[] = [];

  // Common resolution steps parsing
  const resolutionSteps = entry.resolution.split(/\.\s+/).filter(s => s.trim());

  switch (level) {
    case "beginner":
      // Simplify language, avoid technical jargon
      whatHappened = `Something went wrong with your transaction: ${entry.message}`;
      explanation = entry.explanation
        .replace(/\btransaction\b/gi, "request")
        .replace(/\bgas\b/gi, "processing fee")
        .replace(/\bmempool\b/gi, "waiting queue")
        .replace(/\bsequence\b/gi, "order number")
        .replace(/\bnonce\b/gi, "order number")
        .replace(/\bbech32\b/gi, "address format")
        .replace(/\bDID\b/gi, "digital identity");

      causes = causes.map(c =>
        c.replace(/\bgas\b/gi, "processing fee")
          .replace(/\bmempool\b/gi, "waiting queue")
          .replace(/\bDID\b/gi, "digital identity")
      );

      steps = [
        "Don't worry, this is fixable!",
        ...resolutionSteps.slice(0, 2).map(s =>
          s.replace(/\bgas\b/gi, "processing fee")
            .replace(/\bCLI\b/gi, "command line")
        ),
        "If you're still stuck, ask for help in the IXO community channels."
      ];
      break;

    case "developer":
      // Include technical details and CLI commands
      whatHappened = `Transaction failed with ${entry.codespace}/${entry.code}: ${entry.message}`;
      explanation = entry.explanation;

      steps = resolutionSteps;

      // Add relevant CLI commands based on error type
      if (entry.codespace === "sdk" && entry.code === 11) {
        commands.push(
          { description: "Simulate transaction to estimate gas", command: "ixod tx simulate [tx.json]", note: "Dry-run to get accurate gas estimate" },
          { description: "Resubmit with auto gas", command: "ixod tx [cmd] --gas auto --gas-adjustment 1.5", note: "Adds 50% buffer to estimated gas" }
        );
      } else if (entry.code === 3 && entry.codespace === "sdk") {
        commands.push(
          { description: "Query account sequence", command: "ixod query auth account [address]", note: "Use the sequence number from the response" }
        );
      } else if (entry.code === 5 && entry.codespace === "sdk") {
        commands.push(
          { description: "Check account balance", command: "ixod query bank balances [address]" }
        );
      } else if (entry.codespace === "staking") {
        commands.push(
          { description: "List validators", command: "ixod query staking validators" },
          { description: "Check delegations", command: "ixod query staking delegations [address]" }
        );
      } else if (entry.codespace === "iid") {
        commands.push(
          { description: "Query DID document", command: "ixod query iid did [did]" }
        );
      } else if (entry.codespace === "claims") {
        commands.push(
          { description: "Query claim collection", command: "ixod query claims collection [collection-id]" },
          { description: "Query claim", command: "ixod query claims claim [claim-id]" }
        );
      }
      break;

    case "validator":
      // Include node operator specific guidance
      whatHappened = `Error ${entry.codespace}:${entry.code} - ${entry.message}`;
      explanation = entry.explanation;

      steps = resolutionSteps;

      // Add validator-specific commands
      if (entry.codespace === "slashing" || entry.category === "Validator") {
        commands.push(
          { description: "Check validator status", command: "ixod query staking validator [valoper-address]" },
          { description: "View signing info", command: "ixod query slashing signing-info [cons-pubkey]" },
          { description: "Unjail validator", command: "ixod tx slashing unjail --from [key]", note: "Only works if jail period has passed" }
        );
      }

      if (entry.code === 11) {
        commands.push(
          { description: "Check node mempool", command: "curl localhost:26657/unconfirmed_txs" }
        );
      }

      // Add node operation notes
      if (entry.code === 20 || entry.message.includes("mempool")) {
        steps.push("Consider increasing mempool size in config.toml if this occurs frequently");
        commands.push(
          { description: "Check mempool config", command: "grep -A5 'mempool' ~/.ixod/config/config.toml" }
        );
      }
      break;
  }

  // Add context-aware guidance
  if (context) {
    const lowerContext = context.toLowerCase();
    if (lowerContext.includes("delegate") || lowerContext.includes("stake")) {
      steps.push("For delegation issues, ensure the validator is active and not jailed.");
    } else if (lowerContext.includes("claim") || lowerContext.includes("submit")) {
      steps.push("For claims, verify the collection is open and you have proper authorization.");
    } else if (lowerContext.includes("transfer") || lowerContext.includes("send")) {
      steps.push("For transfers, always verify the recipient address and check your balance.");
    }
  }

  return { explanation, whatHappened, causes, steps, commands };
}

/**
 * Generate documentation links
 */
function getDocumentationLinks(entry: ErrorEntry): { title: string; url: string }[] {
  const links: { title: string; url: string }[] = [];

  // Add specific doc URL if available
  if (entry.documentation_url) {
    links.push({ title: `${entry.category} Documentation`, url: entry.documentation_url });
  }

  // Add general IXO docs based on category
  switch (entry.codespace) {
    case "iid":
      links.push({ title: "IXO DID Documentation", url: "https://docs.ixo.world/ixo/developers/decentralised-identifiers" });
      break;
    case "entity":
      links.push({ title: "IXO Entity Guide", url: "https://docs.ixo.world/ixo/developers/entities" });
      break;
    case "claims":
      links.push({ title: "IXO Claims Module", url: "https://docs.ixo.world/ixo/developers/claims" });
      break;
    case "bonds":
      links.push({ title: "IXO Bonds Documentation", url: "https://docs.ixo.world/ixo/developers/alphabond" });
      break;
    case "staking":
    case "slashing":
      links.push({ title: "Cosmos Staking Guide", url: "https://docs.cosmos.network/main/modules/staking" });
      break;
    case "gov":
      links.push({ title: "Cosmos Governance", url: "https://docs.cosmos.network/main/modules/gov" });
      break;
  }

  // Always add general IXO docs
  links.push({ title: "IXO Documentation", url: "https://docs.ixo.world" });

  return links;
}

/**
 * Determine if clarification is needed
 */
function needsClarification(
  matches: ErrorEntry[],
  parsedInput: ReturnType<typeof parseErrorInput>
): { needed: boolean; questions: string[] } {
  const questions: string[] = [];

  // Transaction hash provided but this read-only skill cannot look it up itself.
  if (parsedInput.txHash && !parsedInput.code && !parsedInput.message && !parsedInput.rawLog) {
    questions.push("I see a transaction hash, but I need the transaction response, RPC endpoint, or the code/codespace/raw_log from the explorer or ixod query output to resolve it accurately.");
    return { needed: true, questions };
  }

  // Multiple matches need clarification
  if (matches.length > 1) {
    questions.push(`I found ${matches.length} possible errors matching your description. Could you specify which module this error came from? Options include: ${[...new Set(matches.map(m => m.codespace))].join(", ")}`);
    return { needed: true, questions };
  }

  // No matches
  if (matches.length === 0) {
    questions.push("I couldn't find an exact match for this error. Could you provide more details?");
    
    if (!parsedInput.code) {
      questions.push("Do you have an error code (a number)?");
    }
    if (!parsedInput.codespace) {
      questions.push(`Which part of the system produced this error? (e.g., ${CODESPACES.slice(0, 5).join(", ")})`);
    }
    if (!parsedInput.message) {
      questions.push("What is the exact error message text?");
    }
    
    return { needed: true, questions };
  }

  return { needed: false, questions: [] };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Resolves IXO blockchain errors with plain English explanations
 * and actionable resolution steps tailored to user expertise.
 */
export async function resolveError(
  args: unknown,
  context: QiContext
): Promise<ToolResult> {
  // Validate arguments
  const validated = ResolveErrorArgsSchema.parse(args);
  
  context.log.info(`Resolving error: ${validated.error_input.substring(0, 100)}...`);

  // Parse the error input
  const parsed = parseErrorInput(validated.error_input);
  
  // Override with explicit arguments if provided
  if (validated.error_code !== undefined) parsed.code = validated.error_code;
  if (validated.codespace) parsed.codespace = normalizeCodespace(validated.codespace);
  if (validated.tx_hash) parsed.txHash = validated.tx_hash;

  const searchMessage = [parsed.message, parsed.rawLog].filter(Boolean).join(" ");

  context.log.info(`Parsed: code=${parsed.code}, codespace=${parsed.codespace}, message=${searchMessage.substring(0, 50)}`);

  // Find matching errors
  const matches = findMatchingErrors(parsed.code, parsed.codespace, searchMessage);
  
  // Check if clarification needed
  const clarification = needsClarification(matches, parsed);
  
  if (clarification.needed && matches.length === 0) {
    // No matches, need more info
    const resolution: ErrorResolution = {
      error_message: validated.error_input.substring(0, 200),
      explanation: "I couldn't identify this specific error in my database.",
      what_happened: "An error occurred, but I need more information to help you resolve it.",
      possible_causes: ["The error format may be unfamiliar", "This could be a new or rare error"],
      resolution_steps: [
        "Please provide the complete error output if available",
        "Include any error codes or codespaces shown",
        "Describe what you were trying to do when the error occurred"
      ],
      needs_clarification: true,
      clarifying_questions: clarification.questions,
      confidence: "low",
      category: "Unknown",
    };

    return {
      data: resolution,
      summary: parsed.txHash
        ? "Need the transaction response or raw_log for this transaction hash."
        : "Need more information to identify this error. Please provide additional details.",
    };
  }

  // Use the best match (or first if multiple)
  const bestMatch = matches[0];
  
  // Tailor the explanation to expertise level
  const tailored = tailorExplanation(
    bestMatch,
    validated.expertise_level,
    validated.context
  );

  // Get documentation links
  const docLinks = getDocumentationLinks(bestMatch);

  // Build resolution response
  const resolution: ErrorResolution = {
    error_code: bestMatch.code,
    codespace: bestMatch.codespace,
    error_message: bestMatch.message,
    explanation: tailored.explanation,
    what_happened: tailored.whatHappened,
    possible_causes: tailored.causes,
    most_likely_cause: tailored.causes[0],
    resolution_steps: tailored.steps,
    commands: tailored.commands,
    documentation_links: docLinks,
    needs_clarification: clarification.needed,
    clarifying_questions: clarification.needed ? clarification.questions : undefined,
    confidence: matches.length === 1 ? "high" : matches.length <= 3 ? "medium" : "low",
    category: bestMatch.category,
  };

  // Generate summary based on expertise level
  let summary: string;
  switch (validated.expertise_level) {
    case "beginner":
      summary = `${bestMatch.category} issue: ${tailored.steps[0]}`;
      break;
    case "developer":
      summary = `${bestMatch.codespace}/${bestMatch.code}: ${bestMatch.message} - ${tailored.steps[0]}`;
      break;
    case "validator":
      summary = `[${bestMatch.severity.toUpperCase()}] ${bestMatch.codespace}:${bestMatch.code} - ${bestMatch.message}`;
      break;
    default:
      summary = `Resolved: ${bestMatch.message}`;
  }

  context.log.info(`Resolved error: ${bestMatch.codespace}/${bestMatch.code} with ${tailored.steps.length} resolution steps`);

  return {
    data: resolution,
    summary,
  };
}

export function createConsoleContext(enableLogging = true): QiContext {
  const logger = enableLogging ? console : { info: () => undefined, warn: () => undefined, error: () => undefined };

  return {
    ipfs: {
      async save(data: string | Buffer): Promise<string> {
        const length = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
        return `local-evidence-${length}`;
      },
      async get(): Promise<Buffer> {
        throw new Error("IPFS get is not available in local CLI context");
      },
    },
    log: logger,
    ucan: {
      capabilities: [],
      issuer: "local-cli",
      audience: "error-resolver",
    },
  };
}

function parseCliArgs(argv: string[]): ResolveErrorArgs {
  const args: Record<string, unknown> = {};
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "--json": {
        const raw = argv[++index];
        if (!raw) throw new Error("--json requires a JSON object argument");
        return JSON.parse(raw) as ResolveErrorArgs;
      }
      case "--input":
      case "-i":
        args.error_input = argv[++index];
        break;
      case "--code":
        args.error_code = Number(argv[++index]);
        break;
      case "--codespace":
        args.codespace = argv[++index];
        break;
      case "--level":
      case "--expertise":
        args.expertise_level = argv[++index];
        break;
      case "--source":
        args.source = argv[++index];
        break;
      case "--context":
        args.context = argv[++index];
        break;
      case "--tx-hash":
        args.tx_hash = argv[++index];
        break;
      case "--help":
      case "-h":
        throw new Error("Usage: npm run resolve -- --input \"out of gas\" --level developer [--code 11 --codespace sdk]");
      default:
        positional.push(token);
        break;
    }
  }

  if (!args.error_input && positional.length > 0) {
    args.error_input = positional.join(" ");
  }

  return ResolveErrorArgsSchema.parse(args);
}

export async function main(options: ResolveErrorArgs | string): Promise<ToolResult> {
  const args = typeof options === "string" ? { error_input: options } : options;
  return resolveError(args, createConsoleContext(false));
}

if (require.main === module) {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    main(args)
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
