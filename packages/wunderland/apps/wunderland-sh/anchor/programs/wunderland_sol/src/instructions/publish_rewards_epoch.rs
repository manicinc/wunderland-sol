use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{Enclave, EnclaveTreasury, RewardsEpoch};

/// Publish a rewards epoch (Merkle root) for an enclave.
///
/// Authority: `enclave.creator_owner`.
/// Funds: moves `amount` lamports from `EnclaveTreasury` into the `RewardsEpoch` escrow account.
#[derive(Accounts)]
#[instruction(epoch: u64)]
pub struct PublishRewardsEpoch<'info> {
    /// Enclave this epoch belongs to.
    pub enclave: Account<'info, Enclave>,

    /// Enclave treasury holding collected enclave-tip share.
    #[account(
        mut,
        seeds = [b"enclave_treasury", enclave.key().as_ref()],
        bump = enclave_treasury.bump,
        constraint = enclave_treasury.enclave == enclave.key() @ WunderlandError::InvalidEnclaveTreasury
    )]
    pub enclave_treasury: Account<'info, EnclaveTreasury>,

    /// Rewards epoch PDA (escrow + root).
    #[account(
        init,
        payer = authority,
        space = RewardsEpoch::LEN,
        seeds = [b"rewards_epoch", enclave.key().as_ref(), epoch.to_le_bytes().as_ref()],
        bump
    )]
    pub rewards_epoch: Account<'info, RewardsEpoch>,

    /// Enclave owner who can publish reward distributions.
    #[account(
        mut,
        constraint = authority.key() == enclave.creator_owner @ WunderlandError::UnauthorizedEnclaveOwner
    )]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PublishRewardsEpoch>,
    epoch: u64,
    merkle_root: [u8; 32],
    amount: u64,
    claim_window_seconds: i64,
) -> Result<()> {
    require!(ctx.accounts.enclave.is_active, WunderlandError::EnclaveInactive);
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

    // Keep the enclave treasury rent-exempt when escrowing funds.
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(EnclaveTreasury::LEN);
    let treasury_info = ctx.accounts.enclave_treasury.to_account_info();
    let treasury_lamports = treasury_info.lamports();
    require!(
        treasury_lamports >= min_balance.saturating_add(amount),
        WunderlandError::InsufficientEnclaveTreasuryBalance
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
    epoch_acc.enclave = ctx.accounts.enclave.key();
    epoch_acc.epoch = epoch;
    epoch_acc.merkle_root = merkle_root;
    epoch_acc.total_amount = amount;
    epoch_acc.claimed_amount = 0;
    epoch_acc.published_at = now;
    epoch_acc.claim_deadline = claim_deadline;
    epoch_acc.swept_at = 0;
    epoch_acc.bump = ctx.bumps.rewards_epoch;

    msg!(
        "Rewards epoch published: enclave={} epoch={} amount={} deadline={}",
        epoch_acc.enclave,
        epoch_acc.epoch,
        epoch_acc.total_amount,
        epoch_acc.claim_deadline
    );
    Ok(())
}

