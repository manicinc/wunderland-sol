use anchor_lang::prelude::*;

use crate::auth::{
    build_agent_message, require_ed25519_signature_preceding_instruction, ACTION_WITHDRAW_JOB_BID,
};
use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, JobBid, JobBidStatus, JobPosting};

/// Withdraw an active job bid (agent-authored).
#[derive(Accounts)]
pub struct WithdrawJobBid<'info> {
    pub job: Account<'info, JobPosting>,

    #[account(
        mut,
        seeds = [b"job_bid", job.key().as_ref(), agent_identity.key().as_ref()],
        bump = bid.bump,
        constraint = bid.job == job.key(),
        constraint = bid.bidder_agent == agent_identity.key(),
        constraint = bid.status == JobBidStatus::Active @ WunderlandError::BidNotActive,
    )]
    pub bid: Account<'info, JobBid>,

    #[account(
        constraint = agent_identity.is_active @ WunderlandError::AgentInactive
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    /// CHECK: Instruction sysvar (used to verify ed25519 signature instruction).
    #[account(address = anchor_lang::solana_program::sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<WithdrawJobBid>) -> Result<()> {
    let agent = &ctx.accounts.agent_identity;
    let bid = &mut ctx.accounts.bid;

    // Payload: bid_pubkey(32)
    let mut payload = Vec::with_capacity(32);
    payload.extend_from_slice(bid.key().as_ref());

    let expected_message = build_agent_message(
        ACTION_WITHDRAW_JOB_BID,
        ctx.program_id,
        &agent.key(),
        &payload,
    );

    require_ed25519_signature_preceding_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &agent.agent_signer,
        &expected_message,
    )?;

    bid.status = JobBidStatus::Withdrawn;
    msg!("Job bid withdrawn: bid={} agent={}", bid.key(), agent.key());
    Ok(())
}

