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

/**
 * Parse error input to extract code, codespace, and message
 */
function parseErrorInput(input: string): {
  code?: number;
  codespace?: string;
  message?: string;
  txHash?: string;
  rawLog?: string;
} {
  const result: {
    code?: number;
    codespace?: string;
    message?: string;
    txHash?: string;
    rawLog?: string;
  } = {};

  // Check if it's a transaction hash (64 hex chars)
  if (/^[A-Fa-f0-9]{64}$/.test(input.trim())) {
    result.txHash = input.trim().toUpperCase();
    return result;
  }

  // Check for JSON format (common in CLI output)
  try {
    const parsed = JSON.parse(input);
    if (parsed.code !== undefined) result.code = Number(parsed.code);
    if (parsed.codespace) result.codespace = parsed.codespace;
    if (parsed.message) result.message = parsed.message;
    if (parsed.raw_log) result.rawLog = parsed.raw_log;
    if (parsed.txhash) result.txHash = parsed.txhash;
    return result;
  } catch {
    // Not JSON, continue parsing
  }

  // Extract error code patterns
  // Pattern: "code: 11" or "Code 11" or "error code 11"
  const codeMatch = input.match(/(?:code[:\s]+|error\s+code\s+)(\d+)/i);
  if (codeMatch) {
    result.code = parseInt(codeMatch[1], 10);
  }

  // Pattern: "codespace: bank" or "codespace=bank"
  const codespaceMatch = input.match(/codespace[:\s=]+["']?(\w+)["']?/i);
  if (codespaceMatch) {
    result.codespace = codespaceMatch[1].toLowerCase();
  }

  // Extract message patterns
  // Pattern: "message: out of gas" or "error: out of gas"
  const messageMatch = input.match(/(?:message|error)[:\s]+["']?([^"'\n]+)["']?/i);
  if (messageMatch) {
    result.message = messageMatch[1].trim();
  }

  // If just a number, treat as error code
  if (/^\d+$/.test(input.trim())) {
    result.code = parseInt(input.trim(), 10);
  }

  // If no structured data found, use input as message
  if (!result.code && !result.codespace && !result.message && !result.txHash) {
    result.message = input.trim();
  }

  // Check for raw log format
  if (input.includes("raw_log") || input.includes("failed to execute message")) {
    result.rawLog = input;
  }

  return result;
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

  // Direct lookup by codespace:code
  if (code !== undefined && codespace) {
    const key = `${codespace}:${code}`;
    const directMatch = ERROR_INDEX.get(key);
    if (directMatch) {
      return [directMatch];
    }
  }

  // Lookup by code only (check all codespaces)
  if (code !== undefined && !codespace) {
    for (const [key, entry] of ERROR_INDEX) {
      if (entry.code === code) {
        matches.push(entry);
      }
    }
    if (matches.length > 0) return matches;
  }

  // Lookup by message (fuzzy match)
  if (message) {
    const lowerMessage = message.toLowerCase();
    
    // Direct message match
    const directMatches = MESSAGE_INDEX.get(lowerMessage);
    if (directMatches && directMatches.length > 0) {
      return directMatches;
    }

    // Partial match
    for (const entry of ALL_ERRORS) {
      if (
        entry.message.toLowerCase().includes(lowerMessage) ||
        lowerMessage.includes(entry.message.toLowerCase()) ||
        entry.explanation.toLowerCase().includes(lowerMessage)
      ) {
        matches.push(entry);
      }
    }

    // Keyword matching
    if (matches.length === 0) {
      const keywords = lowerMessage.split(/\s+/).filter(w => w.length > 3);
      for (const entry of ALL_ERRORS) {
        const entryText = `${entry.message} ${entry.explanation} ${entry.causes.join(" ")}`.toLowerCase();
        const matchCount = keywords.filter(k => entryText.includes(k)).length;
        if (matchCount >= Math.ceil(keywords.length * 0.5)) {
          matches.push(entry);
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

  // Transaction hash provided but we can't look it up
  if (parsedInput.txHash && !parsedInput.code && !parsedInput.message) {
    questions.push("I see you provided a transaction hash. Since I cannot query the blockchain directly, could you also provide the error code or message from the transaction result?");
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
  if (validated.codespace) parsed.codespace = validated.codespace;
  if (validated.tx_hash) parsed.txHash = validated.tx_hash;

  context.log.info(`Parsed: code=${parsed.code}, codespace=${parsed.codespace}, message=${parsed.message?.substring(0, 50)}`);

  // Find matching errors
  const matches = findMatchingErrors(parsed.code, parsed.codespace, parsed.message);
  
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
      summary: "Need more information to identify this error. Please provide additional details.",
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
