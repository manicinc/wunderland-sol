use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{JobBid, JobBidStatus, JobEscrow, JobPosting, JobStatus};

/// Accept an active bid for an open job (creator-authored).
#[derive(Accounts)]
pub struct AcceptJobBid<'info> {
    #[account(
        mut,
        constraint = job.creator == creator.key() @ WunderlandError::UnauthorizedJobCreator,
        constraint = job.status == JobStatus::Open @ WunderlandError::JobNotOpen,
    )]
    pub job: Account<'info, JobPosting>,

    #[account(
        mut,
        constraint = bid.job == job.key(),
        constraint = bid.status == JobBidStatus::Active @ WunderlandError::BidNotActive,
    )]
    pub bid: Account<'info, JobBid>,

    /// Job escrow PDA (may include a buy-it-now premium).
    #[account(
        mut,
        seeds = [b"job_escrow", job.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.job == job.key() @ WunderlandError::InvalidJobEscrow,
    )]
    pub escrow: Account<'info, JobEscrow>,

    #[account(mut)]
    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<AcceptJobBid>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let bid = &mut ctx.accounts.bid;
    let escrow = &mut ctx.accounts.escrow;

    // If the job was created with buy-it-now enabled, the escrow may contain a premium.
    // Once the creator explicitly accepts a bid, we downgrade escrow to the base budget
    // and immediately refund any premium back to the creator.
    let target_amount = job.budget_lamports;
    require!(
        escrow.amount >= target_amount,
        WunderlandError::InsufficientJobEscrowBalance
    );

    if escrow.amount > target_amount {
        let refund_amount = escrow.amount - target_amount;

        // Ensure escrow stays rent-exempt after refund.
        let rent = Rent::get()?;
        let min_balance = rent.minimum_balance(JobEscrow::LEN);
        let escrow_info = escrow.to_account_info();
        let escrow_lamports = escrow_info.lamports();
        require!(
            escrow_lamports >= min_balance.saturating_add(escrow.amount),
            WunderlandError::InsufficientJobEscrowBalance
        );

        // Refund: escrow -> creator.
        **escrow_info.try_borrow_mut_lamports()? = escrow_lamports
            .checked_sub(refund_amount)
            .ok_or(WunderlandError::ArithmeticOverflow)?;
        **ctx
            .accounts
            .creator
            .to_account_info()
            .try_borrow_mut_lamports()? = ctx
            .accounts
            .creator
            .to_account_info()
            .lamports()
            .checked_add(refund_amount)
            .ok_or(WunderlandError::ArithmeticOverflow)?;
    }

    escrow.amount = target_amount;

    // Assign and record accepted bid.
    job.status = JobStatus::Assigned;
    job.assigned_agent = bid.bidder_agent;
    job.accepted_bid = bid.key();
    job.updated_at = Clock::get()?.unix_timestamp;

    bid.status = JobBidStatus::Accepted;

    msg!(
        "Job bid accepted: job={} bid={} agent={}",
        job.key(),
        bid.key(),
        job.assigned_agent
    );
    Ok(())
}
