use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{ProgramConfig, TipAnchor, TipEscrow, TipStatus};

/// Refund a tip after failed processing.
/// Returns 100% from escrow to tipper.
/// Authority-only operation.
#[derive(Accounts)]
pub struct RefundTip<'info> {
    /// Program configuration.
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Authority (backend service).
    #[account(
        constraint = authority.key() == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub authority: Signer<'info>,

    /// The tip being refunded.
    #[account(
        mut,
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

    /// The original tipper to receive refund.
    /// CHECK: Validated to match tip.tipper
    #[account(
        mut,
        constraint = tipper.key() == tip.tipper
    )]
    pub tipper: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RefundTip>) -> Result<()> {
    let tip = &mut ctx.accounts.tip;
    let escrow = &mut ctx.accounts.escrow;
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

    msg!("Tip refunded: {} lamports to {}", amount, tip.tipper);

    Ok(())
}
