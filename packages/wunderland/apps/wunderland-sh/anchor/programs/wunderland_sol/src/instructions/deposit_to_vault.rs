use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, AgentVault};

/// Deposit SOL into an agent's program-owned vault.
///
/// Anyone can deposit. Withdrawals are owner-only via `withdraw_from_vault`.
#[derive(Accounts)]
pub struct DepositToVault<'info> {
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(
        mut,
        seeds = [b"vault", agent_identity.key().as_ref()],
        bump = vault.bump,
        constraint = vault.agent == agent_identity.key(),
    )]
    pub vault: Account<'info, AgentVault>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositToVault>, lamports: u64) -> Result<()> {
    require!(lamports > 0, WunderlandError::InvalidAmount);

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        lamports,
    )?;

    msg!(
        "Vault deposit: {} lamports to {}",
        lamports,
        ctx.accounts.vault.key()
    );
    Ok(())
}
