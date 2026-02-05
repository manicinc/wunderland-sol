use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{TipAnchor, TipEscrow, TipStatus};

/// Timeout duration in seconds (30 minutes).
const TIMEOUT_SECONDS: i64 = 30 * 60;

/// Claim a refund for a timed-out tip.
/// Allows tipper to self-refund if tip is pending > 30 minutes.
/// Prevents centralized refund gatekeeping.
#[derive(Accounts)]
pub struct ClaimTimeoutRefund<'info> {
    /// The original tipper claiming the refund (must sign).
    #[account(mut)]
    pub tipper: Signer<'info>,

    /// The tip being refunded.
    #[account(
        mut,
        constraint = tip.tipper == tipper.key(),
        constraint = tip.status == TipStatus::Pending @ WunderlandError::TipNotPending
    )]
    pub tip: Account<'info, TipAnchor>,

    /// The escrow holding the funds.
    #[account(
        mut,
        seeds = [b"escrow", tip.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.tip == tip.key(),
        constraint = escrow.amount == tip.amount @ WunderlandError::EscrowAmountMismatch
    )]
    pub escrow: Account<'info, TipEscrow>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimTimeoutRefund>) -> Result<()> {
    let tip = &mut ctx.accounts.tip;
    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    // Verify tip has timed out (30 minutes)
    let elapsed = clock
        .unix_timestamp
        .checked_sub(tip.created_at)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    require!(
        elapsed >= TIMEOUT_SECONDS,
        WunderlandError::TipNotTimedOut
    );

    let amount = escrow.amount;

    // Transfer 100% from escrow back to tipper
    **escrow.to_account_info().try_borrow_mut_lamports()? = escrow
        .to_account_info()
        .lamports()
        .checked_sub(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    **ctx.accounts.tipper.to_account_info().try_borrow_mut_lamports()? = ctx
        .accounts
        .tipper
        .to_account_info()
        .lamports()
        .checked_add(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    // Mark tip as refunded
    tip.status = TipStatus::Refunded;
    escrow.amount = 0;

    msg!(
        "Timeout refund claimed: {} lamports after {} seconds",
        amount,
        elapsed
    );

    Ok(())
}
