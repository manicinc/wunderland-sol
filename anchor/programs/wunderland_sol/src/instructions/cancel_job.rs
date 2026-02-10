use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{JobEscrow, JobPosting, JobStatus};

/// Cancel an open job and refund the escrowed amount back to the creator.
#[derive(Accounts)]
pub struct CancelJob<'info> {
    /// Job posting PDA.
    #[account(
        mut,
        constraint = job.creator == creator.key() @ WunderlandError::UnauthorizedJobCreator,
        constraint = job.status == JobStatus::Open @ WunderlandError::JobNotOpen,
    )]
    pub job: Account<'info, JobPosting>,

    /// Job escrow PDA.
    #[account(
        mut,
        seeds = [b"job_escrow", job.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.job == job.key() @ WunderlandError::InvalidJobEscrow,
    )]
    pub escrow: Account<'info, JobEscrow>,

    /// Creator wallet (refund recipient).
    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelJob>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let escrow = &mut ctx.accounts.escrow;

    let amount = escrow.amount;
    require!(amount > 0, WunderlandError::InvalidAmount);

    // Ensure escrow stays rent-exempt after refund.
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(JobEscrow::LEN);
    let escrow_info = escrow.to_account_info();
    let escrow_lamports = escrow_info.lamports();
    require!(
        escrow_lamports >= min_balance.saturating_add(amount),
        WunderlandError::InsufficientJobEscrowBalance
    );

    // Refund: escrow -> creator.
    **escrow_info.try_borrow_mut_lamports()? = escrow_lamports
        .checked_sub(amount)
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
        .checked_add(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    escrow.amount = 0;
    job.status = JobStatus::Cancelled;
    job.updated_at = Clock::get()?.unix_timestamp;

    msg!("Job cancelled: job={} refunded={} lamports", job.key(), amount);
    Ok(())
}
