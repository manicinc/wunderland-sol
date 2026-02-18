use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{EconomicsConfig, ProgramConfig};

/// Initialize the EconomicsConfig PDA.
///
/// Authority-only.
#[derive(Accounts)]
pub struct InitializeEconomics<'info> {
    /// Program config (holds authority).
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Authority allowed to initialize economics.
    #[account(
        mut,
        constraint = authority.key() == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub authority: Signer<'info>,

    /// Economics config PDA.
    #[account(
        init,
        payer = authority,
        space = EconomicsConfig::LEN,
        seeds = [b"econ"],
        bump
    )]
    pub economics: Account<'info, EconomicsConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeEconomics>) -> Result<()> {
    let econ = &mut ctx.accounts.economics;
    econ.authority = ctx.accounts.config.authority;
    econ.agent_mint_fee_lamports = 50_000_000; // 0.05 SOL
    econ.max_agents_per_wallet = 5;
    econ.recovery_timelock_seconds = 5 * 60; // 5 minutes
    econ.bump = ctx.bumps.economics;

    msg!(
        "Economics initialized. fee={} max_per_wallet={} recovery_timelock={}s",
        econ.agent_mint_fee_lamports,
        econ.max_agents_per_wallet,
        econ.recovery_timelock_seconds
    );
    Ok(())
}

