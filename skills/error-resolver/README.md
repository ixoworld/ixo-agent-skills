# IXO Error Resolver Skill

A Qi Skill for elegantly resolving errors in the IXO Cosmos blockchain and related software stack through non-technical natural language communication.

## Overview

This skill interprets blockchain errors and provides:
- **Plain English explanations** of what went wrong
- **Possible causes** for the error
- **Step-by-step resolution guidance** tailored to user expertise
- **CLI commands** for developers and validators
- **Documentation links** for further reading

## Features

### Multi-Format Input Support
- Raw error codes (e.g., `11`, `1102`)
- Full error messages (e.g., `"out of gas"`)
- JSON error responses from CLI
- Transaction hashes (for context)
- Raw log output from `ixod`

### Expertise-Level Tailoring
- **Beginner**: Simplified language, avoids jargon, friendly guidance
- **Developer**: Technical details, CLI commands, SDK references
- **Validator**: Node operator guidance, config tips, monitoring commands

### Comprehensive Error Coverage
- **CometBFT/Consensus**: Out of gas, mempool, tx size, signatures
- **Cosmos SDK**: Parse errors, sequence, authorization, balances
- **Bank Module**: Transfers, multi-send, send restrictions
- **Staking Module**: Validators, delegations, commissions
- **Distribution Module**: Rewards, community pool
- **Governance Module**: Proposals, voting
- **Slashing Module**: Jailing, unjailing, tombstoning
- **IBC Module**: Clients, channels, connections
- **IXO IID Module**: DIDs, verification methods, services
- **IXO Entity Module**: Entities, accounts, ownership
- **IXO Claims Module**: Collections, claims, evaluations, disputes
- **IXO Bonds Module**: Bonding curves, reserves, trading

## Usage

### Basic Usage

```typescript
const result = await resolveError({
  error_input: "out of gas",
  expertise_level: "beginner"
}, context);
```

### With Error Code

```typescript
const result = await resolveError({
  error_input: "transaction failed",
  error_code: 11,
  codespace: "sdk",
  expertise_level: "developer"
}, context);
```

### From CLI Output

```typescript
const result = await resolveError({
  error_input: JSON.stringify({
    code: 5,
    codespace: "sdk",
    message: "insufficient funds",
    raw_log: "account has insufficient funds..."
  }),
  expertise_level: "developer",
  context: "I was trying to send 100 IXO tokens"
}, context);
```

### For Validators

```typescript
const result = await resolveError({
  error_input: "validator still jailed",
  expertise_level: "validator"
}, context);
```

## Response Structure

```typescript
{
  data: {
    error_code: 11,
    codespace: "sdk",
    error_message: "out of gas",
    explanation: "Your transaction ran out of gas...",
    what_happened: "Transaction failed with sdk/11: out of gas",
    possible_causes: [
      "Gas limit set too low",
      "Transaction is complex"
    ],
    most_likely_cause: "Gas limit set too low",
    resolution_steps: [
      "Increase the gas limit",
      "Use --gas auto flag"
    ],
    commands: [
      {
        description: "Simulate transaction",
        command: "ixod tx simulate [tx.json]"
      }
    ],
    documentation_links: [
      {
        title: "Gas & Fees",
        url: "https://docs.cosmos.network/main/basics/gas-fees"
      }
    ],
    needs_clarification: false,
    confidence: "high",
    category: "Transaction Execution"
  },
  summary: "sdk/11: out of gas - Increase the gas limit"
}
```

## Error Categories

| Category | Description |
|----------|-------------|
| Transaction Execution | Gas, size, format issues |
| Transaction Submission | Mempool, duplicates |
| Account State | Sequence, balances |
| Authorization | Permissions, signatures |
| Validator | Staking, jailing, commission |
| Delegation | Staking delegations |
| Governance | Proposals, voting |
| Identity | DIDs, verification |
| Entity | IXO entities, accounts |
| Claims | Claim collections, evaluations |
| Bonds | Bonding curves, trading |
| IBC | Cross-chain communication |

## Extending the Error Database

To add new errors, edit `src/error-database.ts`:

```typescript
export const NEW_MODULE_ERRORS: ErrorEntry[] = [
  {
    code: 1,
    codespace: "newmodule",
    message: "error message",
    explanation: "Plain English explanation",
    causes: ["Cause 1", "Cause 2"],
    resolution: "How to fix it",
    severity: "error",
    category: "New Category",
    documentation_url: "https://docs.example.com"
  }
];

// Add to ALL_ERRORS
export const ALL_ERRORS: ErrorEntry[] = [
  ...EXISTING_ERRORS,
  ...NEW_MODULE_ERRORS,
];
```

## Development

### File Structure

```
ixo_error_resolver/
├── skill.yaml           # Skill manifest
├── README.md            # This file
└── src/
    ├── handlers.ts      # Main resolve_error handler
    ├── types.ts         # Zod schemas and TypeScript types
    └── error-database.ts # Comprehensive error database
```

### Testing

```typescript
// Test beginner explanation
const beginnerResult = await resolveError({
  error_input: "insufficient funds",
  expertise_level: "beginner"
}, context);

// Test developer with context
const devResult = await resolveError({
  error_input: "unauthorized",
  error_code: 4,
  codespace: "sdk",
  expertise_level: "developer",
  context: "I was trying to execute a governance proposal"
}, context);

// Test validator scenario
const validatorResult = await resolveError({
  error_input: "validator has no self-delegation",
  expertise_level: "validator"
}, context);
```

## License

MIT License - Part of the IXO Qi Skills ecosystem.
