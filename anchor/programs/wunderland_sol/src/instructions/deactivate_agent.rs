use anchor_lang::prelude::*;
use crate::state::{AgentIdentity, ProgramConfig};
use crate::errors::WunderlandError;

#[derive(Accounts)]
pub struct DeactivateAgent<'info> {
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

    /// CHECK: Agent authority pubkey (does not need to sign for admin deactivation).
    pub agent_authority: UncheckedAccount<'info>,

    pub registrar: Signer<'info>,
}

pub(crate) fn handler(
    ctx: Context<DeactivateAgent>,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_identity;
    let clock = Clock::get()?;

    agent.is_active = false;
    agent.updated_at = clock.unix_timestamp;

    msg!("Agent deactivated: {}", agent.authority);
    Ok(())
}
