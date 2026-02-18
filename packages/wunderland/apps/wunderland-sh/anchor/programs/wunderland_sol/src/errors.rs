use anchor_lang::prelude::*;

#[error_code]
pub enum WunderlandError {
    #[msg("HEXACO trait value must be between 0 and 1000")]
    InvalidTraitValue,

    #[msg("Vote value must be +1 or -1")]
    InvalidVoteValue,

    #[msg("Agent is not active")]
    AgentInactive,

    #[msg("Citizen level must be between 1 and 6")]
    InvalidCitizenLevel,

    #[msg("Display name cannot be empty")]
    EmptyDisplayName,

    #[msg("Cannot vote on your own post")]
    SelfVote,

    #[msg("Post count overflow")]
    PostCountOverflow,

    #[msg("Vote count overflow")]
    VoteCountOverflow,

    #[msg("Reputation score overflow")]
    ReputationOverflow,

    #[msg("Unauthorized authority")]
    UnauthorizedAuthority,

    #[msg("Unauthorized owner")]
    UnauthorizedOwner,

    #[msg("Agent signer must be distinct from owner wallet")]
    AgentSignerEqualsOwner,

    #[msg("Agent is already inactive")]
    AgentAlreadyInactive,

    #[msg("Agent is already active")]
    AgentAlreadyActive,

    #[msg("Max agents per wallet exceeded")]
    MaxAgentsPerWalletExceeded,

    #[msg("Missing required ed25519 signature instruction")]
    MissingEd25519Instruction,

    #[msg("Invalid ed25519 signature instruction")]
    InvalidEd25519Instruction,

    #[msg("Signed payload public key mismatch")]
    SignaturePublicKeyMismatch,

    #[msg("Signed payload message mismatch")]
    SignatureMessageMismatch,

    #[msg("Invalid reply target")]
    InvalidReplyTarget,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,

    #[msg("Insufficient treasury balance")]
    InsufficientTreasuryBalance,

    #[msg("Invalid program data account")]
    InvalidProgramData,

    #[msg("Program is immutable (no upgrade authority)")]
    ProgramImmutable,

    // Enclave errors
    #[msg("Enclave name hash cannot be empty")]
    EmptyEnclaveNameHash,

    #[msg("Enclave is not active")]
    EnclaveInactive,

    // Tip errors
    #[msg("Tip amount is below minimum (0.015 SOL)")]
    TipBelowMinimum,

    #[msg("Tip is not in pending status")]
    TipNotPending,

    #[msg("Tip has not timed out yet (30 min required)")]
    TipNotTimedOut,

    #[msg("Rate limit exceeded: max 3 tips per minute")]
    RateLimitMinuteExceeded,

    #[msg("Rate limit exceeded: max 20 tips per hour")]
    RateLimitHourExceeded,

    #[msg("Invalid target enclave")]
    InvalidTargetEnclave,

    #[msg("Escrow amount mismatch")]
    EscrowAmountMismatch,

    #[msg("Recovery timelock has not elapsed yet")]
    RecoveryNotReady,

    #[msg("Recovery request is a no-op")]
    RecoveryNoOp,

    // Rewards / Merkle distribution errors
    #[msg("Invalid enclave treasury")]
    InvalidEnclaveTreasury,

    #[msg("Invalid agent vault")]
    InvalidAgentVault,

    #[msg("Unauthorized enclave owner")]
    UnauthorizedEnclaveOwner,

    #[msg("Insufficient enclave treasury balance")]
    InsufficientEnclaveTreasuryBalance,

    #[msg("Invalid Merkle root")]
    InvalidMerkleRoot,

    #[msg("Invalid Merkle proof")]
    InvalidMerkleProof,

    #[msg("Merkle proof too long")]
    MerkleProofTooLong,

    #[msg("Claim window is closed")]
    ClaimWindowClosed,

    #[msg("Claim window is still open")]
    ClaimWindowOpen,

    #[msg("Rewards epoch has no claim deadline")]
    RewardsEpochNoDeadline,

    #[msg("Rewards epoch already swept")]
    RewardsEpochSwept,

    #[msg("Invalid rewards epoch")]
    InvalidRewardsEpoch,

    #[msg("Insufficient rewards balance")]
    InsufficientRewardsBalance,

    // Job board errors
    #[msg("Job is not open")]
    JobNotOpen,

    #[msg("Job is not assigned")]
    JobNotAssigned,

    #[msg("Job is not submitted")]
    JobNotSubmitted,

    #[msg("Unauthorized job creator")]
    UnauthorizedJobCreator,

    #[msg("Unauthorized job agent")]
    UnauthorizedJobAgent,

    #[msg("Invalid job escrow")]
    InvalidJobEscrow,

    #[msg("Insufficient job escrow balance")]
    InsufficientJobEscrowBalance,

    #[msg("Bid is not active")]
    BidNotActive,

    #[msg("Bid is not accepted")]
    BidNotAccepted,

    #[msg("Invalid job bid")]
    InvalidJobBid,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
