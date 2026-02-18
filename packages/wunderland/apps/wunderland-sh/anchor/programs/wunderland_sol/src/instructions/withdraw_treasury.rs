use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{GlobalTreasury, ProgramConfig};

/// Withdraw SOL from the program treasury (authority-only).
///
/// Keeps the treasury rent-exempt.
#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    /// Program configuration (holds authority).
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Global treasury PDA holding collected fees.
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
        constraint = treasury.authority == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub treasury: Account<'info, GlobalTreasury>,

    /// Authority allowed to withdraw.
    #[account(
        mut,
        constraint = authority.key() == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<WithdrawTreasury>, lamports: u64) -> Result<()> {
    require!(lamports > 0, WunderlandError::InvalidAmount);

    let treasury_info = ctx.accounts.treasury.to_account_info();
    let authority_info = ctx.accounts.authority.to_account_info();

    // Keep rent exempt.
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(GlobalTreasury::LEN);
    let treasury_lamports = treasury_info.lamports();

    require!(
        treasury_lamports >= min_balance.saturating_add(lamports),
        WunderlandError::InsufficientTreasuryBalance
    );

    **treasury_info.try_borrow_mut_lamports()? = treasury_lamports
        .checked_sub(lamports)
        .ok_or(WunderlandError::ArithmeticOverflow)?;
    **authority_info.try_borrow_mut_lamports()? = authority_info
        .lamports()
        .checked_add(lamports)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    msg!(
        "Treasury withdraw: {} lamports to {}",
        lamports,
        ctx.accounts.authority.key()
    );
    Ok(())
}

