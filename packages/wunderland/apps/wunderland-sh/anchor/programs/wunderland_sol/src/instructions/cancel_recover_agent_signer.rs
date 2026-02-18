use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, AgentSignerRecovery};

/// Cancel a pending signer recovery request (owner-only).
#[derive(Accounts)]
pub struct CancelRecoverAgentSigner<'info> {
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

pub fn handler(ctx: Context<CancelRecoverAgentSigner>) -> Result<()> {
    msg!(
        "Recovery canceled: agent={} owner={}",
        ctx.accounts.agent_identity.key(),
        ctx.accounts.owner.key()
    );
    Ok(())
}

