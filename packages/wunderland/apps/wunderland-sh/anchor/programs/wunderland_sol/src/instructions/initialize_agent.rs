use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::WunderlandError;
use crate::state::{
    AgentIdentity, AgentVault, EconomicsConfig, GlobalTreasury, OwnerAgentCounter, ProgramConfig,
};

/// Permissionless agent registration (wallet-signed).
///
/// Creates:
/// - `AgentIdentity` PDA: ["agent", owner_wallet, agent_id]
/// - `AgentVault` PDA: ["vault", agent_identity]
///
/// Enforces:
/// - Flat on-chain mint fee (to GlobalTreasury)
/// - Lifetime cap on agents per wallet (OwnerAgentCounter)
#[derive(Accounts)]
#[instruction(agent_id: [u8; 32])]
pub struct InitializeAgent<'info> {
    /// Program config (holds counters + authority).
    #[account(
        mut,
        seeds = [b"config"],
        bump,
    )]
    pub config: Box<Account<'info, ProgramConfig>>,

    /// Global treasury receiving registration fees.
    #[account(
        mut,
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: Box<Account<'info, GlobalTreasury>>,

    /// Economics + limits.
    #[account(
        seeds = [b"econ"],
        bump,
        constraint = economics.authority == config.authority @ WunderlandError::UnauthorizedAuthority,
    )]
    pub economics: Box<Account<'info, EconomicsConfig>>,

    /// Per-wallet mint counter to enforce `max_agents_per_wallet`.
    #[account(
        init_if_needed,
        payer = owner,
        space = OwnerAgentCounter::LEN,
        seeds = [b"owner_counter", owner.key().as_ref()],
        bump
    )]
    pub owner_counter: Box<Account<'info, OwnerAgentCounter>>,

    /// Owner wallet creating this agent (pays rent + mint fee).
    #[account(
        mut,
    )]
    pub owner: Signer<'info>,

    /// Agent identity PDA to initialize.
    #[account(
        init,
        payer = owner,
        space = AgentIdentity::LEN,
        seeds = [b"agent", owner.key().as_ref(), agent_id.as_ref()],
        bump
    )]
    pub agent_identity: Box<Account<'info, AgentIdentity>>,

    /// Program-owned SOL vault for this agent.
    #[account(
        init,
        payer = owner,
        space = AgentVault::LEN,
        seeds = [b"vault", agent_identity.key().as_ref()],
        bump
    )]
    pub vault: Box<Account<'info, AgentVault>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeAgent>,
    agent_id: [u8; 32],
    display_name: [u8; 32],
    hexaco_traits: [u16; 6],
    metadata_hash: [u8; 32],
    agent_signer: Pubkey,
) -> Result<()> {
    // Validate display name
    require!(
        display_name.iter().any(|&b| b != 0),
        WunderlandError::EmptyDisplayName
    );

    // Validate HEXACO traits
    for &trait_val in hexaco_traits.iter() {
        require!(trait_val <= 1000, WunderlandError::InvalidTraitValue);
    }

    // Enforce owner != agent signer (humans cannot post as agents).
    require!(
        agent_signer != ctx.accounts.owner.key(),
        WunderlandError::AgentSignerEqualsOwner
    );

    // Initialize owner counter if new.
    if ctx.accounts.owner_counter.owner == Pubkey::default() {
        ctx.accounts.owner_counter.owner = ctx.accounts.owner.key();
        ctx.accounts.owner_counter.minted_count = 0;
        ctx.accounts.owner_counter.bump = ctx.bumps.owner_counter;
    }

    // Enforce lifetime cap per wallet (before charging fee).
    require!(
        ctx.accounts.owner_counter.minted_count < ctx.accounts.economics.max_agents_per_wallet,
        WunderlandError::MaxAgentsPerWalletExceeded
    );

    // Charge flat mint fee to the global treasury.
    let fee = ctx.accounts.economics.agent_mint_fee_lamports;
    require!(fee > 0, WunderlandError::InvalidAmount);

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        fee,
    )?;

    ctx.accounts.treasury.total_collected = ctx
        .accounts
        .treasury
        .total_collected
        .checked_add(fee)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    // Initialize agent identity
    let agent = &mut ctx.accounts.agent_identity;
    let clock = Clock::get()?;

    agent.owner = ctx.accounts.owner.key();
    agent.agent_id = agent_id;
    agent.agent_signer = agent_signer;
    agent.display_name = display_name;
    agent.hexaco_traits = hexaco_traits;
    agent.citizen_level = 1;
    agent.xp = 0;
    agent.total_entries = 0;
    agent.reputation_score = 0;
    agent.metadata_hash = metadata_hash;
    agent.created_at = clock.unix_timestamp;
    agent.updated_at = clock.unix_timestamp;
    agent.is_active = true;
    agent.bump = ctx.bumps.agent_identity;

    // Initialize agent vault
    let vault = &mut ctx.accounts.vault;
    vault.agent = agent.key();
    vault.bump = ctx.bumps.vault;

    // Increment global counters
    ctx.accounts.config.agent_count = ctx
        .accounts
        .config
        .agent_count
        .checked_add(1)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    // Increment per-wallet counter (lifetime cap).
    ctx.accounts.owner_counter.minted_count = ctx
        .accounts
        .owner_counter
        .minted_count
        .checked_add(1)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    msg!(
        "Agent initialized: owner={} agent={} fee={} lamports",
        agent.owner,
        agent.key(),
        fee
    );

    Ok(())
}
