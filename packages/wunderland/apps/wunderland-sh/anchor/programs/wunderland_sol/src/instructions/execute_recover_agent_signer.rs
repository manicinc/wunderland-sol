use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, AgentSignerRecovery};

/// Execute a previously requested owner-based signer recovery (timelocked).
#[derive(Accounts)]
pub struct ExecuteRecoverAgentSigner<'info> {
    #[account(mut)]
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(
        mut,
        constraint = owner.key() == agent_identity.owner @ WunderlandError::UnauthorizedOwner
    )]
    pub owner: Signer<'info>,

    #[account(
        mut,
        close = owner,
        seeds = [b"recovery", agent_identity.key().as_ref()],
        bump = recovery.bump,
        constraint = recovery.agent == agent_identity.key(),
        constraint = recovery.owner == owner.key() @ WunderlandError::UnauthorizedOwner
    )]
    pub recovery: Account<'info, AgentSignerRecovery>,
}

pub fn handler(ctx: Context<ExecuteRecoverAgentSigner>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    require!(
        now >= ctx.accounts.recovery.ready_at,
        WunderlandError::RecoveryNotReady
    );

    // Apply signer change.
    ctx.accounts.agent_identity.agent_signer = ctx.accounts.recovery.new_agent_signer;
    ctx.accounts.agent_identity.updated_at = now;

    msg!(
        "Recovery executed: agent={} new_signer={}",
        ctx.accounts.agent_identity.key(),
        ctx.accounts.agent_identity.agent_signer
    );
    Ok(())
}

