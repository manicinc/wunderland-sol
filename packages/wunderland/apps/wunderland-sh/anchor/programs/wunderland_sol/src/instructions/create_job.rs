use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::WunderlandError;
use crate::state::{JobEscrow, JobPosting, JobStatus};

/// Create a new on-chain job posting (human-created) and escrow the maximum possible payout.
///
/// Seeds:
/// - job: ["job", creator_wallet, job_nonce_u64_le]
/// - escrow: ["job_escrow", job_posting_pda]
#[derive(Accounts)]
#[instruction(job_nonce: u64)]
pub struct CreateJob<'info> {
    /// Job posting PDA.
    #[account(
        init,
        payer = creator,
        space = JobPosting::LEN,
        seeds = [b"job", creator.key().as_ref(), job_nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub job: Account<'info, JobPosting>,

    /// Job escrow PDA holding the budget.
    #[account(
        init,
        payer = creator,
        space = JobEscrow::LEN,
        seeds = [b"job_escrow", job.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, JobEscrow>,

    /// Human creator wallet.
    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateJob>,
    job_nonce: u64,
    metadata_hash: [u8; 32],
    budget_lamports: u64,
    buy_it_now_lamports: Option<u64>,
) -> Result<()> {
    require!(budget_lamports > 0, WunderlandError::InvalidAmount);
    require!(metadata_hash != [0u8; 32], WunderlandError::InvalidAmount);

    // If buy_it_now is set, ensure it's higher than budget (premium for instant assignment).
    if let Some(bin_price) = buy_it_now_lamports {
        require!(
            bin_price > budget_lamports,
            WunderlandError::InvalidAmount
        );
    }

    // Escrow the maximum possible payout up-front so "buy-it-now" can be instant.
    // - No buy-it-now: escrow = budget
    // - With buy-it-now: escrow = buy_it_now (premium)
    let escrow_amount = buy_it_now_lamports.unwrap_or(budget_lamports);

    // Transfer escrow amount from creator -> escrow PDA.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        escrow_amount,
    )?;

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    let job = &mut ctx.accounts.job;
    job.creator = ctx.accounts.creator.key();
    job.job_nonce = job_nonce;
    job.metadata_hash = metadata_hash;
    job.budget_lamports = budget_lamports;
    job.buy_it_now_lamports = buy_it_now_lamports;
    job.status = JobStatus::Open;
    job.assigned_agent = Pubkey::default();
    job.accepted_bid = Pubkey::default();
    job.created_at = now;
    job.updated_at = now;
    job.bump = ctx.bumps.job;

    let escrow = &mut ctx.accounts.escrow;
    escrow.job = job.key();
    escrow.amount = escrow_amount;
    escrow.bump = ctx.bumps.escrow;

    msg!(
        "Job created: creator={} nonce={} budget={} escrow={}",
        job.creator,
        job.job_nonce,
        job.budget_lamports,
        escrow.amount
    );

    Ok(())
}
