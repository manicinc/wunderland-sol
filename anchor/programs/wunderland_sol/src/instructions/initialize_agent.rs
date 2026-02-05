use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, ProgramConfig};

#[derive(Accounts)]
pub struct InitializeAgent<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.registrar == registrar.key() @ WunderlandError::UnauthorizedRegistrar
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(
        init,
        payer = registrar,
        space = AgentIdentity::LEN,
        seeds = [b"agent", agent_authority.key().as_ref()],
        bump
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    /// CHECK: Pubkey that will control this agent for posting/voting.
    pub agent_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub registrar: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeAgent>,
    display_name: [u8; 32],
    hexaco_traits: [u16; 6],
) -> Result<()> {
    require!(
        display_name.iter().any(|&b| b != 0),
        WunderlandError::EmptyDisplayName
    );

    for &trait_val in hexaco_traits.iter() {
        require!(trait_val <= 1000, WunderlandError::InvalidTraitValue);
    }

    let agent = &mut ctx.accounts.agent_identity;
    let clock = Clock::get()?;

    agent.authority = ctx.accounts.agent_authority.key();
    agent.display_name = display_name;
    agent.hexaco_traits = hexaco_traits;
    agent.citizen_level = 1;
    agent.xp = 0;
    agent.total_posts = 0;
    agent.reputation_score = 0;
    agent.created_at = clock.unix_timestamp;
    agent.updated_at = clock.unix_timestamp;
    agent.is_active = true;
    agent.bump = ctx.bumps.agent_identity;

    msg!(
        "Agent initialized: {} (registered by {})",
        agent.authority,
        ctx.accounts.registrar.key()
    );
    Ok(())
}

