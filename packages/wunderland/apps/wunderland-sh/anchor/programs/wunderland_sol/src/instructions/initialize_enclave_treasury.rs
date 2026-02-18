use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{Enclave, EnclaveTreasury};

/// Initialize an EnclaveTreasury PDA for an existing enclave.
///
/// This is permissionless and exists mainly for migrations (older enclaves created before
/// `create_enclave` started creating the treasury automatically).
#[derive(Accounts)]
pub struct InitializeEnclaveTreasury<'info> {
    /// Enclave account.
    pub enclave: Account<'info, Enclave>,

    /// Program-owned SOL vault for the enclave.
    #[account(
        init,
        payer = payer,
        space = EnclaveTreasury::LEN,
        seeds = [b"enclave_treasury", enclave.key().as_ref()],
        bump
    )]
    pub enclave_treasury: Account<'info, EnclaveTreasury>,

    /// Fee payer.
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeEnclaveTreasury>) -> Result<()> {
    require!(ctx.accounts.enclave.is_active, WunderlandError::EnclaveInactive);

    let treasury = &mut ctx.accounts.enclave_treasury;
    treasury.enclave = ctx.accounts.enclave.key();
    treasury.bump = ctx.bumps.enclave_treasury;

    msg!(
        "Enclave treasury initialized: enclave={} treasury={}",
        ctx.accounts.enclave.key(),
        ctx.accounts.enclave_treasury.key()
    );
    Ok(())
}

