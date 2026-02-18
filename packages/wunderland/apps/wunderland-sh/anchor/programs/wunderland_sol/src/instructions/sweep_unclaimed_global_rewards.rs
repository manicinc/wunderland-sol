use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

use crate::errors::WunderlandError;
use crate::state::{GlobalTreasury, ProgramConfig, RewardsEpoch};

/// Sweep unclaimed rewards back to the GlobalTreasury after the claim window closes.
///
/// Permissionless (anyone can call) but time-gated by `RewardsEpoch.claim_deadline`.
#[derive(Accounts)]
#[instruction(epoch: u64)]
pub struct SweepUnclaimedGlobalRewards<'info> {
    /// Program configuration (holds authority).
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Global treasury PDA receiving swept lamports.
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
        constraint = treasury.authority == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub treasury: Account<'info, GlobalTreasury>,

    /// Rewards epoch PDA (escrow + root).
    #[account(
        mut,
        seeds = [b"rewards_epoch", system_program::ID.as_ref(), epoch.to_le_bytes().as_ref()],
        bump = rewards_epoch.bump,
        constraint = rewards_epoch.enclave == system_program::ID @ WunderlandError::InvalidRewardsEpoch
    )]
    pub rewards_epoch: Account<'info, RewardsEpoch>,
}

pub fn handler(ctx: Context<SweepUnclaimedGlobalRewards>, _epoch: u64) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    let epoch = &mut ctx.accounts.rewards_epoch;
    require!(epoch.claim_deadline != 0, WunderlandError::RewardsEpochNoDeadline);
    require!(now >= epoch.claim_deadline, WunderlandError::ClaimWindowOpen);
    require!(epoch.swept_at == 0, WunderlandError::RewardsEpochSwept);

    // Sweep everything above rent-exempt minimum back to the global treasury.
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(RewardsEpoch::LEN);

    let epoch_info = epoch.to_account_info();
    let treasury_info = ctx.accounts.treasury.to_account_info();

    let epoch_lamports = epoch_info.lamports();
    require!(epoch_lamports >= min_balance, WunderlandError::InsufficientRewardsBalance);
    let sweep_amount = epoch_lamports.saturating_sub(min_balance);

    if sweep_amount > 0 {
        **epoch_info.try_borrow_mut_lamports()? = epoch_lamports
            .checked_sub(sweep_amount)
            .ok_or(WunderlandError::ArithmeticOverflow)?;
        **treasury_info.try_borrow_mut_lamports()? = treasury_info
            .lamports()
            .checked_add(sweep_amount)
            .ok_or(WunderlandError::ArithmeticOverflow)?;
    }

    epoch.swept_at = now;

    msg!(
        "Global rewards swept: epoch={} amount={}",
        epoch.epoch,
        sweep_amount
    );
    Ok(())
}

