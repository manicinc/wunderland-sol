use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::WunderlandError;
use crate::state::{
    registration_fee_lamports, AgentIdentity, AgentVault, GlobalTreasury, ProgramConfig,
};

/// Registrar-gated agent registration (wallet-signed).
///
/// Creates:
/// - `AgentIdentity` PDA: ["agent", owner_wallet, agent_id]
/// - `AgentVault` PDA: ["vault", agent_identity]
///
/// Enforces fee tiers (network-wide):
/// - first 1,000 agents: no extra program fee (still pays rent + tx fees)
/// - 1,000..4,999: 0.1 SOL
/// - 5,000+: 0.5 SOL
#[derive(Accounts)]
#[instruction(agent_id: [u8; 32])]
pub struct InitializeAgent<'info> {
    /// Program config (holds counters + authority).
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Global treasury receiving registration fees.
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, GlobalTreasury>,

    /// Owner wallet creating this agent (pays rent + registration fee).
    ///
    /// With immutable-agent enforcement, only the program registrar can create agents.
    #[account(
        mut,
        constraint = owner.key() == config.authority @ WunderlandError::UnauthorizedAuthority
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
    pub agent_identity: Account<'info, AgentIdentity>,

    /// Program-owned SOL vault for this agent.
    #[account(
        init,
        payer = owner,
        space = AgentVault::LEN,
        seeds = [b"vault", agent_identity.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, AgentVault>,

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

    // Charge registration fee based on current global count (before increment).
    let fee = registration_fee_lamports(ctx.accounts.config.agent_count);
    if fee > 0 {
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
    }

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

    msg!(
        "Agent initialized: owner={} agent={} fee={} lamports",
        agent.owner,
        agent.key(),
        fee
    );

    Ok(())
}
