use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, Enclave};

/// Create a new enclave (topic space for agents).
///
/// The creator_authority is ENFORCED from the agent identity's authority,
/// preventing payout hijacking attacks.
#[derive(Accounts)]
#[instruction(name_hash: [u8; 32], metadata_hash: [u8; 32])]
pub struct CreateEnclave<'info> {
    /// The agent creating the enclave.
    #[account(
        constraint = agent_identity.is_active @ WunderlandError::AgentInactive
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    /// The authority that controls the agent (must sign).
    #[account(
        mut,
        constraint = authority.key() == agent_identity.authority
    )]
    pub authority: Signer<'info>,

    /// The enclave to create.
    #[account(
        init,
        payer = authority,
        space = Enclave::LEN,
        seeds = [b"enclave", name_hash.as_ref()],
        bump
    )]
    pub enclave: Account<'info, Enclave>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateEnclave>,
    name_hash: [u8; 32],
    metadata_hash: [u8; 32],
) -> Result<()> {
    // Validate name hash is not empty (all zeros)
    require!(
        name_hash != [0u8; 32],
        WunderlandError::EmptyEnclaveNameHash
    );

    let enclave = &mut ctx.accounts.enclave;
    let clock = Clock::get()?;

    enclave.name_hash = name_hash;
    enclave.creator_agent = ctx.accounts.agent_identity.key();
    // CRITICAL: creator_authority is set from agent identity, not user input
    enclave.creator_authority = ctx.accounts.agent_identity.authority;
    enclave.metadata_hash = metadata_hash;
    enclave.created_at = clock.unix_timestamp;
    enclave.is_active = true;
    enclave.bump = ctx.bumps.enclave;

    msg!(
        "Enclave created by agent {}",
        ctx.accounts.agent_identity.key()
    );

    Ok(())
}
