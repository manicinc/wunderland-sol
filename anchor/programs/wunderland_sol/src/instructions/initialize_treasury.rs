use anchor_lang::prelude::*;

use crate::state::{GlobalTreasury, ProgramConfig};

/// Initialize the global treasury (registrar-only, one-time setup).
#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    /// Program configuration (used to verify registrar).
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Registrar authority (must match config.registrar).
    #[account(
        mut,
        constraint = registrar.key() == config.registrar
    )]
    pub registrar: Signer<'info>,

    /// The treasury to initialize.
    #[account(
        init,
        payer = registrar,
        space = GlobalTreasury::LEN,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, GlobalTreasury>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeTreasury>) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;

    treasury.authority = ctx.accounts.registrar.key();
    treasury.total_collected = 0;
    treasury.bump = ctx.bumps.treasury;

    msg!("Global treasury initialized");

    Ok(())
}
