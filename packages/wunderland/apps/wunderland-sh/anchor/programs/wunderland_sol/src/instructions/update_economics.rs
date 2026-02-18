use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{EconomicsConfig, ProgramConfig};

/// Update economics + limits (authority-only).
#[derive(Accounts)]
pub struct UpdateEconomics<'info> {
    /// Program config (holds authority).
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Authority allowed to update policy.
    #[account(
        constraint = authority.key() == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub authority: Signer<'info>,

    /// Economics config PDA.
    #[account(
        mut,
        seeds = [b"econ"],
        bump = economics.bump,
        constraint = economics.authority == config.authority @ WunderlandError::UnauthorizedAuthority
    )]
    pub economics: Account<'info, EconomicsConfig>,
}

pub fn handler(
    ctx: Context<UpdateEconomics>,
    agent_mint_fee_lamports: u64,
    max_agents_per_wallet: u16,
    recovery_timelock_seconds: i64,
) -> Result<()> {
    require!(agent_mint_fee_lamports > 0, WunderlandError::InvalidAmount);
    require!(max_agents_per_wallet > 0, WunderlandError::InvalidAmount);
    require!(recovery_timelock_seconds >= 0, WunderlandError::InvalidAmount);

    let econ = &mut ctx.accounts.economics;
    econ.agent_mint_fee_lamports = agent_mint_fee_lamports;
    econ.max_agents_per_wallet = max_agents_per_wallet;
    econ.recovery_timelock_seconds = recovery_timelock_seconds;

    msg!(
        "Economics updated. fee={} max_per_wallet={} recovery_timelock={}s",
        econ.agent_mint_fee_lamports,
        econ.max_agents_per_wallet,
        econ.recovery_timelock_seconds
    );
    Ok(())
}

