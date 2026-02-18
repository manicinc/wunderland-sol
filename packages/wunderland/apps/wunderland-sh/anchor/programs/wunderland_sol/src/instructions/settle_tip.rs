use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::WunderlandError;
use crate::state::{
    Enclave, EnclaveTreasury, GlobalTreasury, ProgramConfig, TipAnchor, TipEscrow, TipStatus,
};

/// Settle a tip after successful processing.
/// Splits escrow:
/// - Global tips: 100% to GlobalTreasury
/// - Enclave-targeted tips: 70% GlobalTreasury, 30% EnclaveTreasury
/// Authority-only operation.
#[derive(Accounts)]
pub struct SettleTip<'info> {
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

    /// Enclave treasury PDA to receive 30% (if enclave-targeted).
    /// CHECK: Validated as PDA + discriminator in handler. Unused for global tips.
    #[account(mut)]
    pub enclave_treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SettleTip>) -> Result<()> {
    let tip = &mut ctx.accounts.tip;
    let escrow = &mut ctx.accounts.escrow;
    let treasury = &mut ctx.accounts.treasury;
    let amount = escrow.amount;

    // Ensure the provided target enclave account matches the on-chain commitment.
    require!(
        ctx.accounts.target_enclave.key() == tip.target_enclave,
        WunderlandError::InvalidTargetEnclave
    );

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
        // Enclave-targeted tip: 70% treasury, 30% enclave treasury
        let treasury_share = amount
            .checked_mul(70)
            .ok_or(WunderlandError::ArithmeticOverflow)?
            .checked_div(100)
            .ok_or(WunderlandError::ArithmeticOverflow)?;
        let enclave_share = amount
            .checked_sub(treasury_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        // Verify enclave creator owner matches the on-chain Enclave account.
        require!(
            ctx.accounts.target_enclave.owner == ctx.program_id,
            WunderlandError::InvalidTargetEnclave
        );

        let enclave_data = ctx.accounts.target_enclave.try_borrow_data()?;
        let mut enclave_bytes: &[u8] = &enclave_data;
        let enclave = Enclave::try_deserialize(&mut enclave_bytes)
            .map_err(|_| error!(WunderlandError::InvalidTargetEnclave))?;

        require!(
            enclave.is_active,
            WunderlandError::EnclaveInactive
        );

        // Validate enclave treasury PDA + account type.
        let (expected_treasury, _bump) = Pubkey::find_program_address(
            &[b"enclave_treasury", ctx.accounts.target_enclave.key().as_ref()],
            ctx.program_id,
        );
        require_keys_eq!(
            ctx.accounts.enclave_treasury.key(),
            expected_treasury,
            WunderlandError::InvalidEnclaveTreasury
        );
        require!(
            ctx.accounts.enclave_treasury.owner == ctx.program_id,
            WunderlandError::InvalidEnclaveTreasury
        );

        let treasury_data = ctx.accounts.enclave_treasury.try_borrow_data()?;
        let mut treasury_bytes: &[u8] = &treasury_data;
        let enclave_treasury = EnclaveTreasury::try_deserialize(&mut treasury_bytes)
            .map_err(|_| error!(WunderlandError::InvalidEnclaveTreasury))?;
        require!(
            enclave_treasury.enclave == ctx.accounts.target_enclave.key(),
            WunderlandError::InvalidEnclaveTreasury
        );

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

        // Transfer enclave share
        **escrow.to_account_info().try_borrow_mut_lamports()? = escrow
            .to_account_info()
            .lamports()
            .checked_sub(enclave_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        **ctx
            .accounts
            .enclave_treasury
            .to_account_info()
            .try_borrow_mut_lamports()? = ctx
            .accounts
            .enclave_treasury
            .to_account_info()
            .lamports()
            .checked_add(enclave_share)
            .ok_or(WunderlandError::ArithmeticOverflow)?;

        msg!(
            "Enclave tip settled: {} to treasury, {} to enclave treasury",
            treasury_share,
            enclave_share
        );
    }

    // Mark tip as settled
    tip.status = TipStatus::Settled;
    escrow.amount = 0;

    Ok(())
}
