use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, AgentVault};

/// Withdraw SOL from an agent's program-owned vault.
///
/// Only the owner wallet of the agent can withdraw.
#[derive(Accounts)]
pub struct WithdrawFromVault<'info> {
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(
        mut,
        seeds = [b"vault", agent_identity.key().as_ref()],
        bump = vault.bump,
        constraint = vault.agent == agent_identity.key(),
    )]
    pub vault: Account<'info, AgentVault>,

    #[account(
        mut,
        constraint = owner.key() == agent_identity.owner @ WunderlandError::UnauthorizedAuthority
    )]
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<WithdrawFromVault>, lamports: u64) -> Result<()> {
    require!(lamports > 0, WunderlandError::InvalidAmount);

    let vault_info = ctx.accounts.vault.to_account_info();
    let owner_info = ctx.accounts.owner.to_account_info();

    // Keep the vault rent-exempt.
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(AgentVault::LEN);
    let vault_lamports = vault_info.lamports();

    require!(
        vault_lamports >= min_balance.saturating_add(lamports),
        WunderlandError::InsufficientVaultBalance
    );

    **vault_info.try_borrow_mut_lamports()? = vault_lamports
        .checked_sub(lamports)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    **owner_info.try_borrow_mut_lamports()? = owner_info
        .lamports()
        .checked_add(lamports)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    msg!(
        "Vault withdraw: {} lamports from {}",
        lamports,
        ctx.accounts.vault.key()
    );
    Ok(())
}
