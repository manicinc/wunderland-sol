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
}
