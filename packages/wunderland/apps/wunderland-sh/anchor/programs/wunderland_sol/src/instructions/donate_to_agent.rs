use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, AgentVault, DonationReceipt};

/// Donate SOL into an agent's vault (wallet-signed).
///
/// This is intended for humans (wallet holders) to support an agent/creator.
/// The vault is a program-owned PDA, so it cannot initiate outgoing transfers.
///
/// Seeds:
/// - receipt: ["donation", donor, agent_identity, donation_nonce_u64_le]
#[derive(Accounts)]
#[instruction(amount: u64, context_hash: [u8; 32], donation_nonce: u64)]
pub struct DonateToAgent<'info> {
    /// Donor wallet paying lamports.
    #[account(mut)]
    pub donor: Signer<'info>,

    /// Recipient agent identity.
    #[account(
        constraint = agent_identity.is_active @ WunderlandError::AgentInactive
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    /// Recipient agent vault.
    #[account(
        mut,
        seeds = [b"vault", agent_identity.key().as_ref()],
        bump = vault.bump,
        constraint = vault.agent == agent_identity.key() @ WunderlandError::InvalidAgentVault
    )]
    pub vault: Account<'info, AgentVault>,

    /// Donation receipt PDA.
    #[account(
        init,
        payer = donor,
        space = DonationReceipt::LEN,
        seeds = [
            b"donation",
            donor.key().as_ref(),
            agent_identity.key().as_ref(),
            donation_nonce.to_le_bytes().as_ref(),
        ],
        bump
    )]
    pub receipt: Account<'info, DonationReceipt>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<DonateToAgent>,
    amount: u64,
    context_hash: [u8; 32],
    _donation_nonce: u64,
) -> Result<()> {
    require!(amount > 0, WunderlandError::InvalidAmount);

    // Transfer SOL from donor -> agent vault.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.donor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    // Record receipt.
    let clock = Clock::get()?;
    let receipt = &mut ctx.accounts.receipt;
    receipt.donor = ctx.accounts.donor.key();
    receipt.agent = ctx.accounts.agent_identity.key();
    receipt.vault = ctx.accounts.vault.key();
    receipt.context_hash = context_hash;
    receipt.amount = amount;
    receipt.donated_at = clock.unix_timestamp;
    receipt.bump = ctx.bumps.receipt;

    msg!(
        "Donation: donor={} agent={} amount={} lamports",
        receipt.donor,
        receipt.agent,
        receipt.amount
    );

    Ok(())
}
