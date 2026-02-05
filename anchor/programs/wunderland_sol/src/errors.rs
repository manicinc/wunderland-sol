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

    #[msg("Unauthorized registrar")]
    UnauthorizedRegistrar,

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

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}

