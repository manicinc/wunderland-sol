use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

use crate::errors::WunderlandError;
use crate::state::{GlobalTreasury, ProgramConfig, RewardsEpoch};

/// Publish a rewards epoch (Merkle root) funded from the **GlobalTreasury**.
///
/// Authority: `config.authority`.
/// Funds: moves `amount` lamports from `GlobalTreasury` into the `RewardsEpoch` escrow account.
///
/// This enables global tips (which settle 100% to GlobalTreasury) to directly fund
/// on-chain rewards epochs without requiring enclave-scoped tips.
#[derive(Accounts)]
#[instruction(epoch: u64)]
pub struct PublishGlobalRewardsEpoch<'info> {
    /// Program configuration (holds authority).
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Global treasury holding collected global tip funds.
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
        constraint = treasury.authority == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub treasury: Account<'info, GlobalTreasury>,

    /// Rewards epoch PDA (escrow + root).
    ///
    /// Seeds mirror the enclave rewards epoch PDA, but use `SystemProgram::ID` as a sentinel
    /// to distinguish global epochs from enclave epochs.
    #[account(
        init,
        payer = authority,
        space = RewardsEpoch::LEN,
        seeds = [b"rewards_epoch", system_program::ID.as_ref(), epoch.to_le_bytes().as_ref()],
        bump
    )]
    pub rewards_epoch: Account<'info, RewardsEpoch>,

    /// Program authority who can publish global reward distributions.
    #[account(
        mut,
        constraint = authority.key() == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PublishGlobalRewardsEpoch>,
    epoch: u64,
    merkle_root: [u8; 32],
    amount: u64,
    claim_window_seconds: i64,
) -> Result<()> {
    require!(amount > 0, WunderlandError::InvalidAmount);
    require!(merkle_root != [0u8; 32], WunderlandError::InvalidMerkleRoot);
    require!(claim_window_seconds >= 0, WunderlandError::InvalidAmount);

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    let claim_deadline = if claim_window_seconds == 0 {
        0
    } else {
        now.checked_add(claim_window_seconds)
            .ok_or(WunderlandError::ArithmeticOverflow)?
    };

    // Keep the global treasury rent-exempt when escrowing funds.
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(GlobalTreasury::LEN);
    let treasury_info = ctx.accounts.treasury.to_account_info();
    let treasury_lamports = treasury_info.lamports();
    require!(
        treasury_lamports >= min_balance.saturating_add(amount),
        WunderlandError::InsufficientTreasuryBalance
    );

    // Move funds into the rewards epoch escrow account.
    let epoch_info = ctx.accounts.rewards_epoch.to_account_info();
    **treasury_info.try_borrow_mut_lamports()? = treasury_lamports
        .checked_sub(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;
    **epoch_info.try_borrow_mut_lamports()? = epoch_info
        .lamports()
        .checked_add(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    // Initialize rewards epoch account state.
    let epoch_acc = &mut ctx.accounts.rewards_epoch;
    epoch_acc.enclave = system_program::ID;
    epoch_acc.epoch = epoch;
    epoch_acc.merkle_root = merkle_root;
    epoch_acc.total_amount = amount;
    epoch_acc.claimed_amount = 0;
    epoch_acc.published_at = now;
    epoch_acc.claim_deadline = claim_deadline;
    epoch_acc.swept_at = 0;
    epoch_acc.bump = ctx.bumps.rewards_epoch;

    msg!(
        "Global rewards epoch published: epoch={} amount={} deadline={}",
        epoch_acc.epoch,
        epoch_acc.total_amount,
        epoch_acc.claim_deadline
    );

    Ok(())
}

