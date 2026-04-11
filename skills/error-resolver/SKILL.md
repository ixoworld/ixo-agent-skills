---
name: error-resolver
description: Elegantly resolves errors in the IXO Cosmos blockchain and related software stack through non-technical natural language communication. Interprets error codes, transaction failures, and CLI output to provide clear explanations and actionable resolution steps tailored to user expertise level.
license: MIT
compatibility: claude
metadata:
  version: "1.0.0"
  category: blockchain
---

# Error Resolver

This skill enables AI agents to elegantly resolve errors in the IXO Cosmos blockchain and related software stack through non-technical natural language communication. It interprets error codes, transaction failures, and CLI output to provide clear explanations and actionable resolution steps tailored to user expertise level.

## When to Use This Skill

Use this skill when:
- Users encounter blockchain transaction errors
- CLI commands fail with error codes
- Transaction hashes return failure status
- Users need help understanding blockchain error messages

## Overview

The Error Resolver skill interprets IXO blockchain errors and provides plain English explanations with actionable resolution steps. It accepts various input formats including raw error codes, full error messages, transaction hashes, and CLI log output. The skill tailors explanations to user expertise level (beginner, developer, validator).

## Instructions

When a user encounters an error:

1. **Identify the error input**: This can be:
   - Raw error codes (e.g., `11`, `1102`)
   - Full error messages (e.g., `"out of gas"`)
   - JSON error responses from CLI
   - Transaction hashes (for context)
   - Raw log output from `ixod`

2. **Determine user expertise level**:
   - **Beginner**: Use simplified language, avoid jargon, provide friendly guidance
   - **Developer**: Include technical details, CLI commands, SDK references
   - **Validator**: Provide node operator guidance, config tips, monitoring commands

3. **Provide comprehensive error resolution**:
   - Clear explanation of what went wrong
   - Possible causes for the error
   - Step-by-step resolution guidance
   - Links to relevant documentation when available
   - Clarifying questions if the error is ambiguous

4. **Return structured information**:
   - Error code and codespace (if available)
   - Plain English explanation
   - What happened summary
   - Possible causes (with most likely cause highlighted)
   - Resolution steps
   - Relevant CLI commands (for developers/validators)
   - Documentation links
   - Confidence level and error category

## Error Categories Covered

- **Transaction Execution**: Gas, size, format issues
- **Transaction Submission**: Mempool, duplicates
- **Account State**: Sequence, balances
- **Authorization**: Permissions, signatures
- **Validator**: Staking, jailing, commission
- **Delegation**: Staking delegations
- **Governance**: Proposals, voting
- **Identity**: DIDs, verification
- **Entity**: IXO entities, accounts
- **Claims**: Claim collections, evaluations
- **Bonds**: Bonding curves, trading
- **IBC**: Cross-chain communication

## Example Usage

### Beginner User

**User:** "I got an error saying 'out of gas' when trying to send tokens"

**Agent:** "Your transaction ran out of gas, which means it needed more computational resources than you allocated. To fix this, you can increase the gas limit when sending your transaction. The simplest way is to use the `--gas auto` flag, which automatically calculates the right amount."

### Developer User

**User:** "Transaction failed with code 11"

**Agent:** "Error code 11 (sdk/11) indicates 'out of gas'. This happens when the gas limit is set too low for the transaction complexity. Resolution steps:
1. Simulate the transaction first: `ixod tx simulate [tx.json]`
2. Use the suggested gas amount: `ixod tx bank send --gas [amount]`
3. Or use auto gas: `ixod tx bank send --gas auto`
See: https://docs.cosmos.network/main/basics/gas-fees"

### Validator User

**User:** "My validator is showing as jailed"

**Agent:** "Your validator has been jailed, likely due to missing too many blocks or double-signing. To unjail:
1. Check jail status: `ixod query staking validator [validator-address]`
2. Wait for the unjailing period
3. Unjail: `ixod tx slashing unjail --from [key-name]`
4. Monitor: `ixod query staking validator [validator-address]`"

## Best Practices

1. **Always provide context**: Explain not just what went wrong, but why it might have happened
2. **Tailor to expertise**: Adjust technical depth based on user level
3. **Provide actionable steps**: Give clear, numbered resolution steps
4. **Include commands when helpful**: For developers and validators, provide specific CLI commands
5. **Link to documentation**: Reference official docs when available
6. **Ask clarifying questions**: If the error is ambiguous, ask for more context

## Notes

- This is a read-only skill - it does not require any special capabilities
- The skill handles errors from CometBFT, Cosmos SDK, and IXO-specific modules
- Error explanations are tailored to user expertise level automatically
- The skill can handle partial error information and will ask for clarification when needed
