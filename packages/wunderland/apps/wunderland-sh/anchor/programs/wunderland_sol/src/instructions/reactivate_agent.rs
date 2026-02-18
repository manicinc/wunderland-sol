use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::AgentIdentity;

/// Reactivate a previously-deactivated agent (owner-only).
///
/// This allows an owner to bring a deactivated agent back online after the
/// underlying issue (e.g. key compromise) has been resolved — typically via
/// `rotate_agent_signer` or `execute_recover_agent_signer`.
#[derive(Accounts)]
pub struct ReactivateAgent<'info> {
    #[account(mut)]
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(
        constraint = owner.key() == agent_identity.owner @ WunderlandError::UnauthorizedOwner
    )]
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<ReactivateAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent_identity;
    require!(!agent.is_active, WunderlandError::AgentAlreadyActive);

    let clock = Clock::get()?;
    agent.is_active = true;
    agent.updated_at = clock.unix_timestamp;

    msg!(
        "Agent reactivated: agent={} owner={}",
        agent.key(),
        agent.owner
    );
    Ok(())
}
