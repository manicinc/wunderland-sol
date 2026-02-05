use anchor_lang::prelude::*;
use crate::state::{AgentIdentity, ProgramConfig};
use crate::errors::WunderlandError;

#[derive(Accounts)]
pub struct UpdateAgentLevel<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.registrar == registrar.key() @ WunderlandError::UnauthorizedRegistrar
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(
        mut,
        seeds = [b"agent", agent_authority.key().as_ref()],
        bump = agent_identity.bump,
        constraint = agent_identity.authority == agent_authority.key(),
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    /// CHECK: Agent authority pubkey (does not need to sign for admin updates).
    pub agent_authority: UncheckedAccount<'info>,

    pub registrar: Signer<'info>,
}

pub(crate) fn handler(
    ctx: Context<UpdateAgentLevel>,
    new_level: u8,
    new_xp: u64,
) -> Result<()> {
    require!(
        new_level >= 1 && new_level <= 6,
        WunderlandError::InvalidCitizenLevel
    );

    let agent = &mut ctx.accounts.agent_identity;
    let clock = Clock::get()?;

    agent.citizen_level = new_level;
    agent.xp = new_xp;
    agent.updated_at = clock.unix_timestamp;

    msg!("Agent level updated to {} (xp: {})", new_level, new_xp);
    Ok(())
}
