use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::WunderlandError;
use crate::state::{Enclave, GlobalTreasury, ProgramConfig, TipAnchor, TipEscrow, TipStatus};

/// Settle a tip after successful processing.
/// Splits escrow: 70% to treasury, 30% to enclave creator (if targeted).
/// Registrar-only operation.
#[derive(Accounts)]
pub struct SettleTip<'info> {
    /// Program configuration.
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Registrar authority (backend service).
    #[account(
        constraint = registrar.key() == config.registrar @ WunderlandError::UnauthorizedRegistrar
    )]
    pub registrar: Signer<'info>,

    /// The tip being settled.
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

    /// Global treasury to receive 70% (or 100% for global tips).
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, GlobalTreasury>,

    /// Enclave account (if tip is enclave-targeted).
    /// CHECK: May be SystemProgram for global tips
    pub target_enclave: UncheckedAccount<'info>,

    /// Enclave creator's wallet to receive 30% (if enclave-targeted).
    /// CHECK: Validated against enclave.creator_authority in handler
    #[account(mut)]
    pub enclave_creator: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SettleTip>) -> Result<()> {
    let tip = &mut ctx.accounts.tip;
    let escrow = &mut ctx.accounts.escrow;
    let treasury = &mut ctx.accounts.treasury;
    let amount = escrow.amount;

    // Determine if this is a global or enclave-targeted tip
    let is_global = tip.target_enclave == system_program::ID;

    if is_global {
        // Global tip: 100% to treasury
        let treasury_share = amount;

        // Transfer from escrow to treasury
        **escrow.to_account_info().try_borrow_mut_lamports()? = escrow
            .to_account_info()
            .lamports()
            .checked_sub(treasury_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        **treasury.to_account_info().try_borrow_mut_lamports()? = treasury
            .to_account_info()
            .lamports()
            .checked_add(treasury_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        treasury.total_collected = treasury
            .total_collected
            .checked_add(treasury_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        msg!("Global tip settled: {} lamports to treasury", treasury_share);
    } else {
        // Enclave-targeted tip: 70% treasury, 30% creator
        let treasury_share = amount
            .checked_mul(70)
            .ok_or(WunderlandError::ArithmeticOverflow)?
            .checked_div(100)
            .ok_or(WunderlandError::ArithmeticOverflow)?;
        let creator_share = amount
            .checked_sub(treasury_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        // Verify enclave creator authority matches
        // Deserialize enclave to check creator_authority
        let enclave_data = ctx.accounts.target_enclave.try_borrow_data()?;
        // Skip 8-byte discriminator, then 32-byte name_hash, then 32-byte creator_agent
        // creator_authority starts at offset 8 + 32 + 32 = 72
        if enclave_data.len() >= 104 {
            let creator_authority = Pubkey::try_from(&enclave_data[72..104])
                .map_err(|_| WunderlandError::InvalidTargetEnclave)?;
            require!(
                ctx.accounts.enclave_creator.key() == creator_authority,
                WunderlandError::InvalidTargetEnclave
            );
        } else {
            return Err(WunderlandError::InvalidTargetEnclave.into());
        }

        // Transfer treasury share
        **escrow.to_account_info().try_borrow_mut_lamports()? = escrow
            .to_account_info()
            .lamports()
            .checked_sub(treasury_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        **treasury.to_account_info().try_borrow_mut_lamports()? = treasury
            .to_account_info()
            .lamports()
            .checked_add(treasury_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        treasury.total_collected = treasury
            .total_collected
            .checked_add(treasury_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        // Transfer creator share
        **escrow.to_account_info().try_borrow_mut_lamports()? = escrow
            .to_account_info()
            .lamports()
            .checked_sub(creator_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        **ctx
            .accounts
            .enclave_creator
            .to_account_info()
            .try_borrow_mut_lamports()? = ctx
            .accounts
            .enclave_creator
            .to_account_info()
            .lamports()
            .checked_add(creator_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        msg!(
            "Enclave tip settled: {} to treasury, {} to creator",
            treasury_share,
            creator_share
        );
    }

    // Mark tip as settled
    tip.status = TipStatus::Settled;
    escrow.amount = 0;

    Ok(())
}
