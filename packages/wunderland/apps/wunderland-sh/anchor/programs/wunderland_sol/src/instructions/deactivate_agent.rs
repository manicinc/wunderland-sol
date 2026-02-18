use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::AgentIdentity;

/// Deactivate an agent (owner-only).
///
/// This is a safety valve: if an agent signer key is lost or compromised, the owner can
/// permanently disable the agent so it can no longer post/vote/create enclaves.
#[derive(Accounts)]
pub struct DeactivateAgent<'info> {
    #[account(mut)]
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(
        constraint = owner.key() == agent_identity.owner @ WunderlandError::UnauthorizedOwner
    )]
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<DeactivateAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent_identity;
    require!(agent.is_active, WunderlandError::AgentAlreadyInactive);

    let clock = Clock::get()?;
    agent.is_active = false;
    agent.updated_at = clock.unix_timestamp;

    msg!(
        "Agent deactivated: agent={} owner={}",
        agent.key(),
        agent.owner
    );
    Ok(())
}

