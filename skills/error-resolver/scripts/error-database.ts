import { ErrorEntry } from "./types";

/**
 * Comprehensive IXO Blockchain Error Database
 * 
 * Contains errors from:
 * - CometBFT (Consensus Layer)
 * - Cosmos SDK Base Modules
 * - IXO-specific x/ modules (iid, entity, claims, bonds)
 * 
 * Extended details can be fetched from IPFS for deeper resolution guidance.
 */

// ============================================================================
// CometBFT / Consensus Layer Errors
// ============================================================================

export const CONSENSUS_ERRORS: ErrorEntry[] = [
  {
    code: 11,
    codespace: "sdk",
    message: "out of gas",
    explanation: "Your transaction ran out of gas before it could complete. Gas is like fuel that powers blockchain operations.",
    causes: [
      "Gas limit set too low for the transaction",
      "Transaction is unusually complex or large",
      "Heavy computations or loops consuming more gas than expected"
    ],
    resolution: "Increase the gas limit when resubmitting. Use --gas auto with an adjustment multiplier, or simulate the transaction first with 'ixod tx simulate' to estimate gas needs.",
    severity: "error",
    category: "Transaction Execution",
    documentation_url: "https://docs.cosmos.network/main/basics/gas-fees"
  },
  {
    code: 19,
    codespace: "sdk",
    message: "tx already in mempool",
    explanation: "This exact transaction is already waiting to be processed. The blockchain rejected it as a duplicate.",
    causes: [
      "Accidentally submitted the same transaction twice",
      "Client retried before the first submission was confirmed",
      "Slow network feedback causing duplicate broadcasts"
    ],
    resolution: "No action needed - your original transaction is pending. Check its status by querying the transaction hash. If it seems stuck, wait a few blocks or increment your account sequence number.",
    severity: "warning",
    category: "Transaction Submission",
  },
  {
    code: 20,
    codespace: "sdk",
    message: "mempool is full",
    explanation: "The network is congested. The transaction pool is at capacity and temporarily rejecting new transactions.",
    causes: [
      "High network activity filling the mempool",
      "Many pending transactions from other users",
      "Misconfigured mempool size (for node operators)"
    ],
    resolution: "Wait a few minutes and try again when the network is less busy. Consider including a higher fee to prioritize your transaction.",
    severity: "warning",
    category: "Network Congestion",
  },
  {
    code: 21,
    codespace: "sdk",
    message: "tx too large",
    explanation: "Your transaction exceeds the maximum allowed size. This limit protects the network from oversized transactions.",
    causes: [
      "Too many messages bundled in one transaction",
      "Very long memo field",
      "Large data payloads in the transaction"
    ],
    resolution: "Split your operation into multiple smaller transactions. Shorten or remove the memo field. Check the chain's max_tx_bytes limit.",
    severity: "error",
    category: "Transaction Size",
  },
  {
    code: 1,
    codespace: "undefined",
    message: "internal error",
    explanation: "An unexpected internal error occurred. This is usually a software issue rather than something you did wrong.",
    causes: [
      "Software bugs in the blockchain application",
      "Invariant violations in state",
      "Unanticipated edge cases"
    ],
    resolution: "Report this error to the IXO development team with the full error logs. Include the transaction details and any relevant context.",
    severity: "critical",
    category: "Internal Error",
    documentation_url: "https://github.com/ixofoundation/ixo-blockchain/issues"
  },
];

// ============================================================================
// Cosmos SDK Base Errors
// ============================================================================

export const SDK_ERRORS: ErrorEntry[] = [
  {
    code: 2,
    codespace: "sdk",
    message: "tx parse error",
    explanation: "The blockchain couldn't understand your transaction format. The data appears corrupted or incorrectly encoded.",
    causes: [
      "Malformed transaction bytes",
      "Using outdated client tools",
      "Corrupted data during transmission",
      "Wrong chain or genesis configuration"
    ],
    resolution: "Re-generate and sign the transaction using the latest ixod CLI. Make sure you're connected to the correct chain and using compatible software versions.",
    severity: "error",
    category: "Transaction Format",
  },
  {
    code: 3,
    codespace: "sdk",
    message: "invalid sequence",
    explanation: "Your account's sequence number (nonce) doesn't match what the chain expects. Transactions must be processed in order.",
    causes: [
      "Another transaction from your account was processed first",
      "Replaying an old transaction",
      "Out-of-order transaction submission"
    ],
    resolution: "Query your account's current sequence with 'ixod query auth account [your-address]' and use that sequence in a new transaction.",
    severity: "error",
    category: "Account State",
  },
  {
    code: 4,
    codespace: "sdk",
    message: "unauthorized",
    explanation: "You don't have permission to perform this action. The account signing the transaction lacks the required authority.",
    causes: [
      "Wrong account used to sign the transaction",
      "Missing required signatures in a multisig",
      "Attempting an admin-only operation",
      "Trying to modify someone else's data"
    ],
    resolution: "Check that you're using the correct account with the necessary permissions. For multisig accounts, ensure all required signatures are present.",
    severity: "error",
    category: "Authorization",
  },
  {
    code: 5,
    codespace: "sdk",
    message: "insufficient funds",
    explanation: "Your account doesn't have enough tokens to complete this transaction, including fees.",
    causes: [
      "Trying to send more tokens than you have",
      "Forgetting to reserve tokens for transaction fees",
      "Tokens are locked or vesting",
      "Already spent the tokens in a pending transaction"
    ],
    resolution: "Check your balance with 'ixod query bank balances [your-address]'. Remember to leave enough for fees. If using vesting tokens, check what's actually available.",
    severity: "error",
    category: "Balance",
  },
  {
    code: 6,
    codespace: "sdk",
    message: "unknown request",
    explanation: "The blockchain doesn't recognize this type of message or request.",
    causes: [
      "Invalid message type",
      "Using tools meant for a different chain",
      "Module not enabled on this network",
      "Version mismatch between client and chain"
    ],
    resolution: "Verify you're using the correct CLI version for this chain. Check that the module and message type are supported.",
    severity: "error",
    category: "Message Type",
  },
  {
    code: 7,
    codespace: "sdk",
    message: "invalid address",
    explanation: "One of the addresses in your transaction is malformed or uses the wrong format.",
    causes: [
      "Typo in the address",
      "Using an address from a different network",
      "Wrong bech32 prefix (should be 'ixo' for IXO chain)",
      "Invalid checksum"
    ],
    resolution: "Double-check the address format. IXO addresses should start with 'ixo'. Copy-paste addresses carefully to avoid typos.",
    severity: "error",
    category: "Address Format",
  },
  {
    code: 8,
    codespace: "sdk",
    message: "invalid pubkey",
    explanation: "The provided public key is not valid or uses an unsupported format.",
    causes: [
      "Wrong key type or encoding",
      "Corrupted key data",
      "Using the wrong key for the operation"
    ],
    resolution: "Ensure the public key is in the correct format. Use the chain's CLI tools to generate or validate keys.",
    severity: "error",
    category: "Key Management",
  },
  {
    code: 9,
    codespace: "sdk",
    message: "unknown address",
    explanation: "The specified address doesn't exist in the blockchain's records.",
    causes: [
      "Account has never received any tokens",
      "Validator was never created",
      "Typo in the address"
    ],
    resolution: "Verify the address is correct. For validators, ensure the validator was properly created. For accounts, they're created upon first receiving tokens.",
    severity: "error",
    category: "Account State",
  },
  {
    code: 10,
    codespace: "sdk",
    message: "invalid coins",
    explanation: "The token amounts or denominations in your transaction are invalid.",
    causes: [
      "Zero or negative amounts",
      "Invalid denomination string",
      "Duplicate denominations in the same list",
      "Wrong format for amounts"
    ],
    resolution: "Ensure all amounts are positive integers. Use the correct denomination (e.g., 'uixo' for micro-IXO). Don't list the same denomination twice.",
    severity: "error",
    category: "Token Format",
  },
  {
    code: 12,
    codespace: "sdk",
    message: "memo too large",
    explanation: "The memo field in your transaction is too long. Memos have a byte limit (typically 256 bytes).",
    causes: [
      "Memo exceeds the chain's limit",
      "Trying to encode data in the memo"
    ],
    resolution: "Shorten your memo. If you need to attach data, consider using IPFS and just including the hash in the memo.",
    severity: "error",
    category: "Transaction Format",
  },
  {
    code: 13,
    codespace: "sdk",
    message: "insufficient fee",
    explanation: "The fee you're offering is below the minimum required by the network.",
    causes: [
      "Gas price set too low",
      "Fee doesn't meet minimum gas price requirements",
      "Network has raised minimum fees"
    ],
    resolution: "Increase your fee. Check the chain's minimum gas price and ensure your fee (gas × gas-price) exceeds it. Try --gas-prices 0.025uixo or higher.",
    severity: "error",
    category: "Fees",
  },
  {
    code: 14,
    codespace: "sdk",
    message: "maximum number of signatures exceeded",
    explanation: "Your transaction has more signatures than the chain allows.",
    causes: [
      "Multisig with too many signers",
      "Transaction structure error"
    ],
    resolution: "Reduce the number of signers or split the operation across multiple transactions.",
    severity: "error",
    category: "Signature",
  },
];

// ============================================================================
// Bank Module Errors
// ============================================================================

export const BANK_ERRORS: ErrorEntry[] = [
  {
    code: 2,
    codespace: "bank",
    message: "no inputs to send transaction",
    explanation: "The send transaction has no source account specified.",
    causes: [
      "Bug in transaction construction",
      "Empty input list in MsgMultiSend"
    ],
    resolution: "Ensure the transaction includes a valid sender (from) address. If using CLI, provide the --from flag.",
    severity: "error",
    category: "Transaction Format",
  },
  {
    code: 3,
    codespace: "bank",
    message: "no outputs to send transaction",
    explanation: "No destination address was specified for the token transfer.",
    causes: [
      "Missing recipient in the transaction",
      "Empty output list"
    ],
    resolution: "Add a recipient address and amount. Every send needs both a sender and receiver.",
    severity: "error",
    category: "Transaction Format",
  },
  {
    code: 4,
    codespace: "bank",
    message: "sum inputs != sum outputs",
    explanation: "In a multi-send transaction, the total coins sent don't equal the total received.",
    causes: [
      "Amounts don't balance across inputs and outputs",
      "Missing or incorrect amount for some recipient"
    ],
    resolution: "Ensure total input amounts equal total output amounts for each denomination.",
    severity: "error",
    category: "Balance",
  },
  {
    code: 5,
    codespace: "bank",
    message: "send transactions are disabled",
    explanation: "Token transfers are currently disabled on this chain.",
    causes: [
      "Chain governance has disabled sends",
      "Specific denomination is blocked",
      "Temporary restriction during upgrade"
    ],
    resolution: "This is a network-level setting. Check chain announcements or governance proposals for when transfers will be enabled.",
    severity: "warning",
    category: "Chain Configuration",
  },
  {
    code: 6,
    codespace: "bank",
    message: "client denom metadata not found",
    explanation: "The token denomination you're using doesn't have registered metadata.",
    causes: [
      "Custom or IBC token without metadata",
      "Using an unregistered denomination"
    ],
    resolution: "This usually doesn't block transactions. If you need metadata for display, it must be registered via governance.",
    severity: "info",
    category: "Token Metadata",
  },
];

// ============================================================================
// Staking Module Errors
// ============================================================================

export const STAKING_ERRORS: ErrorEntry[] = [
  {
    code: 2,
    codespace: "staking",
    message: "empty validator address",
    explanation: "The validator address field is empty where one was required.",
    causes: [
      "Missing validator address in the message",
      "CLI flag not provided"
    ],
    resolution: "Provide the validator's operator address (starts with 'ixovaloper').",
    severity: "error",
    category: "Validator",
  },
  {
    code: 3,
    codespace: "staking",
    message: "validator does not exist",
    explanation: "No validator was found for the given address.",
    causes: [
      "Wrong validator address",
      "Validator was never created",
      "Validator was removed from the set"
    ],
    resolution: "Check the validator address. List active validators with 'ixod query staking validators'.",
    severity: "error",
    category: "Validator",
  },
  {
    code: 4,
    codespace: "staking",
    message: "validator already exists for this operator address",
    explanation: "You already have a validator with this operator address.",
    causes: [
      "Trying to create a second validator from the same account",
      "Duplicate create-validator submission"
    ],
    resolution: "Each account can only create one validator. Use EditValidator to modify an existing validator.",
    severity: "error",
    category: "Validator",
  },
  {
    code: 5,
    codespace: "staking",
    message: "validator already exists for this pubkey",
    explanation: "A validator with this consensus public key already exists.",
    causes: [
      "Reusing a consensus key from another validator",
      "Duplicate validator creation"
    ],
    resolution: "Generate a new consensus key for the new validator. Each validator needs a unique key.",
    severity: "error",
    category: "Validator",
  },
  {
    code: 7,
    codespace: "staking",
    message: "validator for this address is currently jailed",
    explanation: "This validator is jailed and cannot perform certain operations.",
    causes: [
      "Validator was jailed for downtime",
      "Validator was jailed for double-signing"
    ],
    resolution: "If you're the operator, send an Unjail transaction after the jail period ends. Check if you were tombstoned (permanent jail).",
    severity: "warning",
    category: "Validator",
  },
  {
    code: 9,
    codespace: "staking",
    message: "commission must be positive",
    explanation: "Validator commission rate cannot be negative or zero (if chain requires positive).",
    causes: [
      "Commission rate set to zero or negative",
      "Missing commission parameter"
    ],
    resolution: "Set a positive commission rate. Check if the chain has a minimum commission requirement.",
    severity: "error",
    category: "Validator",
  },
  {
    code: 10,
    codespace: "staking",
    message: "commission cannot be more than 100%",
    explanation: "Commission rate cannot exceed 100%.",
    causes: [
      "Used wrong format (100 instead of 1.0 or 0.1 instead of 10%)",
      "Typo in commission value"
    ],
    resolution: "Use decimal format: 0.1 for 10%, 0.2 for 20%, maximum 1.0 for 100%.",
    severity: "error",
    category: "Validator",
  },
  {
    code: 16,
    codespace: "staking",
    message: "no delegation for (address, validator) tuple",
    explanation: "You don't have a delegation to this validator.",
    causes: [
      "Never delegated to this validator",
      "Already undelegated completely",
      "Wrong validator address"
    ],
    resolution: "Check your delegations with 'ixod query staking delegations [your-address]'.",
    severity: "error",
    category: "Delegation",
  },
  {
    code: 24,
    codespace: "staking",
    message: "too many unbonding delegation entries",
    explanation: "You have too many pending unbonding operations to this validator.",
    causes: [
      "Maximum unbonding entries reached (typically 7)",
      "Need to wait for some unbondings to complete"
    ],
    resolution: "Wait for some unbonding entries to complete before creating new ones. Each takes about 21 days.",
    severity: "error",
    category: "Delegation",
  },
  {
    code: 25,
    codespace: "staking",
    message: "too many redelegation entries",
    explanation: "You have too many pending redelegation operations.",
    causes: [
      "Maximum redelegation entries reached",
      "Need to wait for redelegations to complete"
    ],
    resolution: "Wait for pending redelegations to complete. You cannot redelegate tokens that are already redelegating.",
    severity: "error",
    category: "Delegation",
  },
];

// ============================================================================
// Distribution Module Errors
// ============================================================================

export const DISTRIBUTION_ERRORS: ErrorEntry[] = [
  {
    code: 5,
    codespace: "distribution",
    message: "no delegation distribution info",
    explanation: "No reward information exists for this delegator-validator combination.",
    causes: [
      "Never delegated to this validator",
      "Delegation was already withdrawn",
      "Unbonding completed and rewards were paid"
    ],
    resolution: "You can only withdraw rewards from active delegations. Check your current delegations.",
    severity: "error",
    category: "Rewards",
  },
  {
    code: 7,
    codespace: "distribution",
    message: "no validator commission to withdraw",
    explanation: "This validator has no commission available to withdraw.",
    causes: [
      "No commission has accumulated yet",
      "Commission was recently withdrawn",
      "Validator has no delegations"
    ],
    resolution: "Wait for more blocks to be produced and commission to accumulate.",
    severity: "info",
    category: "Rewards",
  },
  {
    code: 9,
    codespace: "distribution",
    message: "community pool does not have sufficient coins to distribute",
    explanation: "The community pool doesn't have enough funds for this proposal.",
    causes: [
      "Proposal requests more than available in pool",
      "Multiple proposals competing for same funds"
    ],
    resolution: "Check community pool balance with 'ixod query distribution community-pool'. Reduce the requested amount.",
    severity: "error",
    category: "Governance",
  },
];

// ============================================================================
// Governance Module Errors
// ============================================================================

export const GOV_ERRORS: ErrorEntry[] = [
  {
    code: 2,
    codespace: "gov",
    message: "unknown proposal",
    explanation: "The proposal ID doesn't exist.",
    causes: [
      "Wrong proposal ID",
      "Proposal was already finalized and removed",
      "Proposal never existed"
    ],
    resolution: "Check active proposals with 'ixod query gov proposals'. Use the correct proposal number.",
    severity: "error",
    category: "Governance",
  },
  {
    code: 3,
    codespace: "gov",
    message: "inactive proposal",
    explanation: "This proposal is not currently accepting votes.",
    causes: [
      "Proposal is still in deposit period",
      "Proposal has already passed or been rejected",
      "Voting period has ended"
    ],
    resolution: "Check the proposal status. You can only vote during the voting period.",
    severity: "error",
    category: "Governance",
  },
  {
    code: 5,
    codespace: "gov",
    message: "invalid proposal content",
    explanation: "The proposal content is malformed or invalid.",
    causes: [
      "Invalid parameter values",
      "Malformed proposal JSON",
      "Missing required fields"
    ],
    resolution: "Review your proposal content. Ensure all fields are valid and properly formatted.",
    severity: "error",
    category: "Governance",
  },
  {
    code: 7,
    codespace: "gov",
    message: "invalid vote option",
    explanation: "The vote option you provided is not valid.",
    causes: [
      "Typo in vote option",
      "Using invalid option"
    ],
    resolution: "Use one of: yes, no, abstain, no_with_veto",
    severity: "error",
    category: "Governance",
  },
];

// ============================================================================
// Slashing Module Errors
// ============================================================================

export const SLASHING_ERRORS: ErrorEntry[] = [
  {
    code: 4,
    codespace: "slashing",
    message: "validator still jailed; cannot be unjailed",
    explanation: "The validator cannot be unjailed yet, possibly due to tombstoning.",
    causes: [
      "Validator was tombstoned (permanent jail) for double-signing",
      "Jail period hasn't ended yet"
    ],
    resolution: "If tombstoned, you cannot unjail ever - you must create a new validator with new keys. If not tombstoned, wait for the jail duration to pass.",
    severity: "critical",
    category: "Validator",
  },
  {
    code: 5,
    codespace: "slashing",
    message: "validator not jailed; cannot be unjailed",
    explanation: "You tried to unjail a validator that isn't jailed.",
    causes: [
      "Validator is already active",
      "Already unjailed"
    ],
    resolution: "No action needed - your validator is already operational.",
    severity: "info",
    category: "Validator",
  },
  {
    code: 6,
    codespace: "slashing",
    message: "validator has no self-delegation; cannot be unjailed",
    explanation: "The validator has no self-delegation, so it cannot be unjailed.",
    causes: [
      "Self-delegation was fully unbonded",
      "Validator stake dropped to zero"
    ],
    resolution: "Delegate tokens to yourself first to meet the minimum self-delegation requirement, then try unjailing.",
    severity: "error",
    category: "Validator",
  },
  {
    code: 7,
    codespace: "slashing",
    message: "validator's self-delegation less than minimum",
    explanation: "Your self-delegation is below the minimum you committed to.",
    causes: [
      "Self-delegation dropped due to slashing",
      "Partial unbonding reduced stake below minimum"
    ],
    resolution: "Increase your self-delegation to at least your MinSelfDelegation amount, then unjail.",
    severity: "error",
    category: "Validator",
  },
];

// ============================================================================
// IBC Module Errors
// ============================================================================

export const IBC_ERRORS: ErrorEntry[] = [
  {
    code: 2,
    codespace: "ibc client",
    message: "light client already exists",
    explanation: "An IBC client with this ID already exists.",
    causes: [
      "Duplicate client creation attempt",
      "Client ID collision"
    ],
    resolution: "Use a unique client ID or let the system auto-generate one.",
    severity: "error",
    category: "IBC",
  },
  {
    code: 4,
    codespace: "ibc client",
    message: "light client not found",
    explanation: "The referenced IBC client doesn't exist.",
    causes: [
      "Wrong client ID",
      "Client was pruned after expiring",
      "Client never created"
    ],
    resolution: "Check active IBC clients. Create a new client if the old one expired.",
    severity: "error",
    category: "IBC",
  },
  {
    code: 6,
    codespace: "ibc channel",
    message: "channel not found",
    explanation: "The IBC channel doesn't exist.",
    causes: [
      "Wrong channel ID",
      "Channel was closed",
      "Channel never established"
    ],
    resolution: "Verify the channel ID. Check if a new channel needs to be opened.",
    severity: "error",
    category: "IBC",
  },
];

// ============================================================================
// IXO IID Module Errors (Decentralized Identity)
// ============================================================================

export const IID_ERRORS: ErrorEntry[] = [
  {
    code: 1100,
    codespace: "iid",
    message: "did document not found",
    explanation: "The requested DID (Decentralized Identifier) document doesn't exist on-chain.",
    causes: [
      "DID hasn't been registered yet",
      "Typo in the DID string",
      "Using wrong DID method or namespace"
    ],
    resolution: "Verify the DID format (should be did:ixo:...). If it's your DID, register it first. If it's someone else's, they need to create it.",
    severity: "error",
    category: "Identity",
    documentation_url: "https://docs.ixo.world/ixo/developers/decentralised-identifiers"
  },
  {
    code: 1101,
    codespace: "iid",
    message: "did document found",
    explanation: "A DID document with this identifier already exists.",
    causes: [
      "Trying to create a duplicate DID",
      "DID was already registered"
    ],
    resolution: "You cannot create duplicate DIDs. Use an update operation to modify existing DIDs, or choose a unique identifier.",
    severity: "error",
    category: "Identity",
  },
  {
    code: 1102,
    codespace: "iid",
    message: "input not compliant with the DID specifications",
    explanation: "The DID string format is invalid according to W3C DID specifications.",
    causes: [
      "Malformed DID syntax",
      "Invalid characters in DID",
      "Wrong DID method prefix"
    ],
    resolution: "Use proper DID format: did:ixo:[unique-id]. Only use allowed characters (typically alphanumeric and some special chars).",
    severity: "error",
    category: "Identity",
  },
  {
    code: 1103,
    codespace: "iid",
    message: "input not compliant with the DID URL specifications",
    explanation: "The DID URL (DID with path, query, or fragment) is incorrectly formatted.",
    causes: [
      "Invalid fragment syntax",
      "Malformed query parameters",
      "Invalid URI characters"
    ],
    resolution: "Check DID URL format. Fragments should be #key-1 style. Follow URI encoding rules for special characters.",
    severity: "error",
    category: "Identity",
  },
  {
    code: 1104,
    codespace: "iid",
    message: "verification relationship cannot be empty",
    explanation: "A verification relationship (like authentication or assertionMethod) was left empty.",
    causes: [
      "Missing verification method reference",
      "Empty relationship array"
    ],
    resolution: "Provide at least one verification method reference for each relationship you include.",
    severity: "error",
    category: "Identity",
  },
  {
    code: 1105,
    codespace: "iid",
    message: "verification method not found",
    explanation: "The referenced verification method doesn't exist in the DID document.",
    causes: [
      "Typo in verification method ID",
      "Method was removed or never added",
      "Referencing wrong DID's method"
    ],
    resolution: "Check the verification method IDs in your DID document. The referenced method must exist.",
    severity: "error",
    category: "Identity",
  },
  {
    code: 1106,
    codespace: "iid",
    message: "verification method already in use",
    explanation: "This verification method ID is already used in the DID document.",
    causes: [
      "Duplicate method ID",
      "Trying to add an existing method"
    ],
    resolution: "Use unique IDs for each verification method. To update an existing method, use an update operation.",
    severity: "error",
    category: "Identity",
  },
  {
    code: 1107,
    codespace: "iid",
    message: "service not found",
    explanation: "The referenced service endpoint doesn't exist in the DID document.",
    causes: [
      "Wrong service ID",
      "Service was removed"
    ],
    resolution: "Check available services in the DID document. Add the service if it doesn't exist.",
    severity: "error",
    category: "Identity",
  },
  {
    code: 1108,
    codespace: "iid",
    message: "service already in use",
    explanation: "A service with this ID already exists in the DID document.",
    causes: [
      "Duplicate service ID"
    ],
    resolution: "Use a unique service ID or update the existing service.",
    severity: "error",
    category: "Identity",
  },
  {
    code: 1109,
    codespace: "iid",
    message: "unauthorized, the signer must be a controller",
    explanation: "Only a controller of the DID can perform this action.",
    causes: [
      "Signing with wrong key",
      "Not listed as a controller",
      "Controller was removed"
    ],
    resolution: "Sign with a key that belongs to a controller of the DID document. Check the controller field.",
    severity: "error",
    category: "Identity",
  },
];

// ============================================================================
// IXO Entity Module Errors
// ============================================================================

export const ENTITY_ERRORS: ErrorEntry[] = [
  {
    code: 1001,
    codespace: "entity",
    message: "entity not found",
    explanation: "The requested entity doesn't exist on-chain.",
    causes: [
      "Wrong entity ID or DID",
      "Entity was never created",
      "Entity was deactivated"
    ],
    resolution: "Verify the entity ID. Create the entity if it doesn't exist. Check if it might be deactivated.",
    severity: "error",
    category: "Entity",
    documentation_url: "https://docs.ixo.world/ixo/developers/entities"
  },
  {
    code: 1002,
    codespace: "entity",
    message: "entity exists",
    explanation: "An entity with this identifier already exists.",
    causes: [
      "Duplicate entity creation attempt",
      "ID collision"
    ],
    resolution: "Use a unique entity identifier. Query existing entities to check for duplicates.",
    severity: "error",
    category: "Entity",
  },
  {
    code: 1003,
    codespace: "entity",
    message: "entity account not found",
    explanation: "The entity's sub-account doesn't exist.",
    causes: [
      "Account was never created",
      "Wrong account name",
      "Account was removed"
    ],
    resolution: "Check the entity's accounts. Create the account if it doesn't exist.",
    severity: "error",
    category: "Entity",
  },
  {
    code: 1004,
    codespace: "entity",
    message: "entity account with name already exists",
    explanation: "An account with this name already exists for this entity.",
    causes: [
      "Duplicate account name"
    ],
    resolution: "Choose a different name for the new account. Account names must be unique per entity.",
    severity: "error",
    category: "Entity",
  },
  {
    code: 1005,
    codespace: "entity",
    message: "unauthorized, owner not same as nft owner",
    explanation: "You're not the owner of this entity.",
    causes: [
      "Trying to modify someone else's entity",
      "Signing with wrong key",
      "Ownership was transferred"
    ],
    resolution: "Only the entity owner can perform this action. Verify you're signing with the correct owner key.",
    severity: "error",
    category: "Entity",
  },
];

// ============================================================================
// IXO Claims Module Errors
// ============================================================================

export const CLAIMS_ERRORS: ErrorEntry[] = [
  {
    code: 1001,
    codespace: "claims",
    message: "collection not found",
    explanation: "The claim collection doesn't exist.",
    causes: [
      "Wrong collection ID",
      "Collection was never created",
      "Collection was closed and removed"
    ],
    resolution: "Verify the collection ID. The collection must be created before submitting claims to it.",
    severity: "error",
    category: "Claims",
    documentation_url: "https://docs.ixo.world/ixo/developers/claims"
  },
  {
    code: 1002,
    codespace: "claims",
    message: "collection is not in open state",
    explanation: "The collection is not currently accepting claims.",
    causes: [
      "Collection hasn't started yet",
      "Collection period has ended",
      "Collection was paused"
    ],
    resolution: "Wait for the collection to open, or check if it has already closed.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1003,
    codespace: "claims",
    message: "evaluation payment is not allowed to have a Contract1155Payment",
    explanation: "NFT-based payments (ERC-1155 style) are not allowed for claim evaluations.",
    causes: [
      "Trying to use NFTs as evaluation rewards"
    ],
    resolution: "Use native tokens or CW20 tokens for evaluation payments instead of contract-based NFTs.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1004,
    codespace: "claims",
    message: "collection payments accounts can only be entity accounts",
    explanation: "Payment accounts for collections must be entity accounts, not regular user accounts.",
    causes: [
      "Using a personal account instead of an entity account"
    ],
    resolution: "Set up an entity account to manage collection payments. Regular wallet addresses are not allowed.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1005,
    codespace: "claims",
    message: "evaluation payment is not allowed to have CW20 payments",
    explanation: "CW20 token payments are not allowed for evaluations.",
    causes: [
      "Trying to use CW20 tokens for oracle/evaluator rewards"
    ],
    resolution: "Use native chain tokens only for evaluation rewards.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1100,
    codespace: "claims",
    message: "claim not found",
    explanation: "The specified claim doesn't exist.",
    causes: [
      "Wrong claim ID",
      "Claim was never submitted",
      "Claim was deleted"
    ],
    resolution: "Verify the claim ID and collection context. Check if the claim was successfully created.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1101,
    codespace: "claims",
    message: "unauthorized, incorrect admin",
    explanation: "You don't have admin permissions for this claim or collection.",
    causes: [
      "Not the collection admin",
      "Wrong signing key",
      "Admin rights were revoked"
    ],
    resolution: "Only the collection admin can perform this action. Use the correct admin credentials.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1102,
    codespace: "claims",
    message: "collection for claim has not started yet",
    explanation: "The claim collection isn't open for submissions yet.",
    causes: [
      "Before the collection start time",
      "Collection not yet activated"
    ],
    resolution: "Wait until the collection officially starts accepting claims.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1103,
    codespace: "claims",
    message: "collection for claim has ended",
    explanation: "The claim collection period has ended.",
    causes: [
      "Past the collection deadline",
      "Collection was closed"
    ],
    resolution: "You cannot submit claims to ended collections. Check for new collection periods.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1104,
    codespace: "claims",
    message: "collection for claim's quota has been reached",
    explanation: "The maximum number of claims for this collection has been reached.",
    causes: [
      "Collection quota limit reached",
      "Too many claims submitted"
    ],
    resolution: "This collection cannot accept more claims. Contact the collection admin about increasing the quota.",
    severity: "warning",
    category: "Claims",
  },
  {
    code: 1105,
    codespace: "claims",
    message: "claim with id already exists",
    explanation: "A claim with this ID already exists in the collection.",
    causes: [
      "Duplicate claim ID",
      "Retrying a submission that already succeeded"
    ],
    resolution: "Use a unique claim ID. If you're retrying, check if the original submission succeeded.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1106,
    codespace: "claims",
    message: "claim with id already evaluated",
    explanation: "This claim has already been evaluated and cannot be re-evaluated.",
    causes: [
      "Claim already approved or rejected",
      "Duplicate evaluation attempt"
    ],
    resolution: "Claims can only be evaluated once. If you need to contest the evaluation, use the dispute process.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1200,
    codespace: "claims",
    message: "dispute not found",
    explanation: "The referenced dispute doesn't exist.",
    causes: [
      "Wrong dispute ID",
      "Dispute was never filed",
      "Dispute was resolved and removed"
    ],
    resolution: "Verify the dispute ID. File a dispute first if one doesn't exist.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1201,
    codespace: "claims",
    message: "dispute with proof already exists",
    explanation: "A dispute with the same evidence has already been filed.",
    causes: [
      "Duplicate dispute submission",
      "Same evidence hash used twice"
    ],
    resolution: "If you have new evidence, use different proof data. Check if your original dispute exists.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1202,
    codespace: "claims",
    message: "unauthorized, not part of collection/entity/authz agent",
    explanation: "You don't have permission to file or act on this dispute.",
    causes: [
      "Not a stakeholder in the claim",
      "Not the claimant, evaluator, or authorized agent"
    ],
    resolution: "Only involved parties can dispute evaluations. Use the correct credentials or have an authorized party act.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1300,
    codespace: "claims",
    message: "evaluation claim and collection does not match",
    explanation: "The claim ID doesn't belong to the specified collection.",
    causes: [
      "Mismatched claim and collection IDs",
      "Wrong collection context"
    ],
    resolution: "Ensure the claim ID corresponds to the collection you're evaluating in.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1400,
    codespace: "claims",
    message: "preset fee percentages for node and network overflows 100%",
    explanation: "The fee distribution percentages add up to more than 100%.",
    causes: [
      "Node fee + network fee > 100%"
    ],
    resolution: "Adjust fee percentages so they sum to 100% or less.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1401,
    codespace: "claims",
    message: "payment withdrawal failed",
    explanation: "Failed to withdraw payments from the claims pool.",
    causes: [
      "Insufficient funds in pool",
      "Unauthorized withdrawal attempt",
      "Internal transfer error"
    ],
    resolution: "Check the pool balance and your withdrawal permissions. Try again or contact support.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1402,
    codespace: "claims",
    message: "distribution calculations failed",
    explanation: "Failed to calculate how to distribute funds.",
    causes: [
      "No valid claims to distribute to",
      "Arithmetic edge case",
      "Missing required data"
    ],
    resolution: "Ensure there are valid claims and the distribution parameters are correct.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1403,
    codespace: "claims",
    message: "oracle payments can only have Native Coin payments, CW20 payments are not allowed",
    explanation: "Oracle/evaluator payments must be in native chain tokens only.",
    causes: [
      "Trying to pay oracles with CW20 tokens"
    ],
    resolution: "Configure oracle payments using native chain tokens (like uixo) instead of CW20.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1500,
    codespace: "claims",
    message: "intent not found",
    explanation: "The claim intent doesn't exist.",
    causes: [
      "Wrong intent ID",
      "Intent was never created",
      "Intent was fulfilled or cancelled"
    ],
    resolution: "Verify the intent ID. Create an intent first if needed.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1501,
    codespace: "claims",
    message: "active intent found",
    explanation: "An active intent already exists, preventing this operation.",
    causes: [
      "Trying to create duplicate intent",
      "Previous intent not resolved"
    ],
    resolution: "Handle or cancel the existing intent before creating a new one.",
    severity: "error",
    category: "Claims",
  },
  {
    code: 1502,
    codespace: "claims",
    message: "unauthorized",
    explanation: "You don't have permission for this intent operation.",
    causes: [
      "Not the intent owner",
      "Wrong signing credentials"
    ],
    resolution: "Use the correct account that owns or is authorized for this intent.",
    severity: "error",
    category: "Claims",
  },
];

// ============================================================================
// IXO Bonds Module Errors
// ============================================================================

export const BONDS_ERRORS: ErrorEntry[] = [
  {
    code: 1,
    codespace: "bonds",
    message: "bond not found",
    explanation: "The specified bond doesn't exist.",
    causes: [
      "Wrong bond DID or token name",
      "Bond was never created",
      "Bond was settled and removed"
    ],
    resolution: "Verify the bond identifier. Query existing bonds to find the correct one.",
    severity: "error",
    category: "Bonds",
    documentation_url: "https://docs.ixo.world/ixo/developers/alphabond"
  },
  {
    code: 2,
    codespace: "bonds",
    message: "bond already exists",
    explanation: "A bond with this identifier already exists.",
    causes: [
      "Duplicate bond creation",
      "Token name collision"
    ],
    resolution: "Use a unique bond token name and DID.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 5,
    codespace: "bonds",
    message: "bond does not allow buying",
    explanation: "Buying tokens is currently disabled for this bond.",
    causes: [
      "Bond configured with allow_buys=false",
      "Bond is in a non-trading state"
    ],
    resolution: "Check the bond's configuration. Buying may be enabled in a future state or by the bond admin.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 6,
    codespace: "bonds",
    message: "bond does not allow selling",
    explanation: "Selling tokens is currently disabled for this bond.",
    causes: [
      "Bond configured with allow_sells=false",
      "Bond is in settlement mode"
    ],
    resolution: "Check the bond's configuration and current state.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 27,
    codespace: "bonds",
    message: "token cannot also be a reserve token",
    explanation: "The bond token cannot be listed as one of its own reserve tokens.",
    causes: [
      "Circular reserve configuration"
    ],
    resolution: "Remove the bond's own token from the reserve list. Reserves must be external tokens.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 28,
    codespace: "bonds",
    message: "bond token cannot be staking token",
    explanation: "You cannot create a bond that mints the chain's native staking token.",
    causes: [
      "Using the native token denom for the bond"
    ],
    resolution: "Choose a unique token denomination for your bond, not the chain's staking token (like uixo).",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 30,
    codespace: "bonds",
    message: "cannot mint more tokens than the max supply",
    explanation: "The purchase would exceed the bond's maximum token supply.",
    causes: [
      "Trying to buy more than remaining supply",
      "Max supply already reached"
    ],
    resolution: "Reduce your buy amount to what's available. Check remaining supply.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 31,
    codespace: "bonds",
    message: "cannot burn more tokens than the current supply",
    explanation: "Trying to burn more tokens than exist in circulation.",
    causes: [
      "Sell amount exceeds total supply",
      "Accounting error"
    ],
    resolution: "You can only sell tokens that exist. Check the current supply and your balance.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 33,
    codespace: "bonds",
    message: "swap amount too small to give any return",
    explanation: "The swap amount is too small to yield any output after fees.",
    causes: [
      "Dust amount swap",
      "High fees relative to amount"
    ],
    resolution: "Increase your swap amount to get a meaningful return.",
    severity: "warning",
    category: "Bonds",
  },
  {
    code: 34,
    codespace: "bonds",
    message: "swap amount too large and causes reserve to be depleted",
    explanation: "This swap would empty the reserve pool, which is not allowed.",
    causes: [
      "Swap too large for available reserves"
    ],
    resolution: "Reduce the swap amount to leave some reserve in the pool.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 35,
    codespace: "bonds",
    message: "order quantity limits exceeded",
    explanation: "Your order exceeds the maximum allowed per transaction.",
    causes: [
      "Order size limit in bond configuration"
    ],
    resolution: "Split your order into smaller transactions within the limit.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 37,
    codespace: "bonds",
    message: "sum of fees is or exceeds 100 percent",
    explanation: "The total fees configured for this bond are 100% or more.",
    causes: [
      "Fee configuration error"
    ],
    resolution: "Adjust fee parameters so their sum is less than 100%.",
    severity: "critical",
    category: "Bonds",
  },
  {
    code: 38,
    codespace: "bonds",
    message: "no bond tokens of this bond are owned",
    explanation: "You don't have any tokens of this bond to sell.",
    causes: [
      "Never bought this bond's tokens",
      "Already sold all tokens",
      "Wrong account"
    ],
    resolution: "Check your balance for this bond's token. You can only sell what you own.",
    severity: "error",
    category: "Bonds",
  },
  {
    code: 43,
    codespace: "bonds",
    message: "numeric overflow",
    explanation: "The calculation resulted in a number too large to handle.",
    causes: [
      "Very large amounts causing overflow",
      "Extreme price or supply values"
    ],
    resolution: "Try a smaller transaction amount. This may indicate an edge case needing developer attention.",
    severity: "critical",
    category: "Bonds",
  },
  {
    code: 46,
    codespace: "bonds",
    message: "requested withdraw amount is greater than available reserve",
    explanation: "You're trying to withdraw more reserve than is available.",
    causes: [
      "Withdrawal exceeds free reserve",
      "Reserve needed for token holder redemptions"
    ],
    resolution: "Only withdraw up to the available reserve. Some reserve must be kept for outstanding tokens.",
    severity: "error",
    category: "Bonds",
  },
];

// ============================================================================
// Combined Error Database
// ============================================================================

export const ALL_ERRORS: ErrorEntry[] = [
  ...CONSENSUS_ERRORS,
  ...SDK_ERRORS,
  ...BANK_ERRORS,
  ...STAKING_ERRORS,
  ...DISTRIBUTION_ERRORS,
  ...GOV_ERRORS,
  ...SLASHING_ERRORS,
  ...IBC_ERRORS,
  ...IID_ERRORS,
  ...ENTITY_ERRORS,
  ...CLAIMS_ERRORS,
  ...BONDS_ERRORS,
];

/**
 * Index errors by codespace and code for fast lookup
 */
export const ERROR_INDEX: Map<string, ErrorEntry> = new Map(
  ALL_ERRORS.map(err => [`${err.codespace}:${err.code}`, err])
);

/**
 * Index errors by message substring for fuzzy matching
 */
export const MESSAGE_INDEX: Map<string, ErrorEntry[]> = ALL_ERRORS.reduce(
  (acc, err) => {
    const key = err.message.toLowerCase();
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key)!.push(err);
    return acc;
  },
  new Map<string, ErrorEntry[]>()
);

/**
 * Get all error categories
 */
export const ERROR_CATEGORIES = [...new Set(ALL_ERRORS.map(err => err.category))];

/**
 * Get all codespaces
 */
export const CODESPACES = [...new Set(ALL_ERRORS.map(err => err.codespace))];
