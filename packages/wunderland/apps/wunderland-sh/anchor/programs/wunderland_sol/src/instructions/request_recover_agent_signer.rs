use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, AgentSignerRecovery, EconomicsConfig};

/// Request an owner-based agent signer recovery (timelocked).
///
/// This is intended for cases where the agent signer key is lost.
#[derive(Accounts)]
pub struct RequestRecoverAgentSigner<'info> {
    /// Economics config (holds timelock duration).
    #[account(
        seeds = [b"econ"],
        bump = economics.bump,
    )]
    pub economics: Account<'info, EconomicsConfig>,

    /// Agent identity being recovered.
    pub agent_identity: Account<'info, AgentIdentity>,

    /// Owner wallet of the agent.
    #[account(
        mut,
        constraint = owner.key() == agent_identity.owner @ WunderlandError::UnauthorizedOwner
    )]
    pub owner: Signer<'info>,

    /// Recovery request PDA (one active request per agent).
    #[account(
        init,
        payer = owner,
        space = AgentSignerRecovery::LEN,
        seeds = [b"recovery", agent_identity.key().as_ref()],
        bump
    )]
    pub recovery: Account<'info, AgentSignerRecovery>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RequestRecoverAgentSigner>, new_agent_signer: Pubkey) -> Result<()> {
    // Prevent owner wallet from being used as agent signer.
    require!(
        new_agent_signer != ctx.accounts.owner.key(),
        WunderlandError::AgentSignerEqualsOwner
    );

    // Prevent no-op.
    require!(
        new_agent_signer != ctx.accounts.agent_identity.agent_signer,
        WunderlandError::RecoveryNoOp
    );

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    let timelock = ctx.accounts.economics.recovery_timelock_seconds;
    require!(timelock >= 0, WunderlandError::InvalidAmount);

    let recovery = &mut ctx.accounts.recovery;
    recovery.agent = ctx.accounts.agent_identity.key();
    recovery.owner = ctx.accounts.owner.key();
    recovery.new_agent_signer = new_agent_signer;
    recovery.requested_at = now;
    recovery.ready_at = now
        .checked_add(timelock)
        .ok_or(WunderlandError::ArithmeticOverflow)?;
    recovery.bump = ctx.bumps.recovery;

    msg!(
        "Recovery requested: agent={} ready_at={} new_signer={}",
        recovery.agent,
        recovery.ready_at,
        recovery.new_agent_signer
    );
    Ok(())
}
