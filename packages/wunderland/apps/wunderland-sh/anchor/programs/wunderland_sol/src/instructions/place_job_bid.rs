use anchor_lang::prelude::*;

use crate::auth::{
    build_agent_message, require_ed25519_signature_preceding_instruction, ACTION_PLACE_JOB_BID,
};
use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, JobBid, JobBidStatus, JobPosting, JobStatus};

/// Place a bid on an open job (agent-authored).
///
/// Authorization:
/// - Requires an ed25519-signed payload by `agent_identity.agent_signer`.
///
/// Seeds:
/// - bid: ["job_bid", job_posting_pda, bidder_agent_identity_pda]
#[derive(Accounts)]
pub struct PlaceJobBid<'info> {
    /// Job being bid on.
    #[account(
        mut,
        constraint = job.status == JobStatus::Open @ WunderlandError::JobNotOpen
    )]
    pub job: Account<'info, JobPosting>,

    /// Bid PDA (one per agent per job).
    #[account(
        init,
        payer = payer,
        space = JobBid::LEN,
        seeds = [b"job_bid", job.key().as_ref(), agent_identity.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, JobBid>,

    /// Active agent identity.
    #[account(
        constraint = agent_identity.is_active @ WunderlandError::AgentInactive
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    /// Fee payer (relayer or agent owner wallet).
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Instruction sysvar (used to verify ed25519 signature instruction).
    #[account(address = anchor_lang::solana_program::sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceJobBid>, bid_lamports: u64, message_hash: [u8; 32]) -> Result<()> {
    require!(bid_lamports > 0, WunderlandError::InvalidAmount);

    let agent = &ctx.accounts.agent_identity;
    let job = &mut ctx.accounts.job;

    // Normal bids must be <= budget. Buy-it-now is a special "premium" bid amount that can be
    // higher than budget and triggers instant assignment.
    let buy_it_now = job.buy_it_now_lamports;
    let is_buy_it_now = buy_it_now.map(|v| v == bid_lamports).unwrap_or(false);
    if !is_buy_it_now {
        require!(
            bid_lamports <= job.budget_lamports,
            WunderlandError::InvalidAmount
        );
    }

    // Payload: job_pubkey(32) || bid_lamports(u64) || message_hash(32)
    let mut payload = Vec::with_capacity(32 + 8 + 32);
    payload.extend_from_slice(job.key().as_ref());
    payload.extend_from_slice(&bid_lamports.to_le_bytes());
    payload.extend_from_slice(&message_hash);

    let expected_message = build_agent_message(
        ACTION_PLACE_JOB_BID,
        ctx.program_id,
        &agent.key(),
        &payload,
    );

    require_ed25519_signature_preceding_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &agent.agent_signer,
        &expected_message,
    )?;

    let clock = Clock::get()?;
    let bid = &mut ctx.accounts.bid;
    bid.job = job.key();
    bid.bidder_agent = agent.key();
    bid.bid_lamports = bid_lamports;
    bid.message_hash = message_hash;
    bid.status = if is_buy_it_now {
        JobBidStatus::Accepted
    } else {
        JobBidStatus::Active
    };
    bid.created_at = clock.unix_timestamp;
    bid.bump = ctx.bumps.bid;

    if is_buy_it_now {
        job.status = JobStatus::Assigned;
        job.assigned_agent = agent.key();
        job.accepted_bid = bid.key();
        job.updated_at = clock.unix_timestamp;

        msg!(
            "Buy-it-now triggered: job={} agent={} amount={}",
            job.key(),
            job.assigned_agent,
            bid_lamports
        );
    }

    msg!(
        "Job bid placed: job={} bidder={} amount={}",
        bid.job,
        bid.bidder_agent,
        bid.bid_lamports
    );

    Ok(())
}
