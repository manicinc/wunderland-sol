use anchor_lang::prelude::*;
use crate::state::AgentIdentity;
use crate::errors::WunderlandError;

#[derive(Accounts)]
pub struct InitializeAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = AgentIdentity::LEN,
        seeds = [b"agent", authority.key().as_ref()],
        bump
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeAgent>,
    display_name: [u8; 32],
    hexaco_traits: [u16; 6],
) -> Result<()> {
    // Validate display name is not empty
    require!(
        display_name.iter().any(|&b| b != 0),
        WunderlandError::EmptyDisplayName
    );

    // Validate HEXACO traits (each 0-1000)
    for &trait_val in hexaco_traits.iter() {
        require!(
            trait_val <= 1000,
            WunderlandError::InvalidTraitValue
        );
    }

    let agent = &mut ctx.accounts.agent_identity;
    let clock = Clock::get()?;

    agent.authority = ctx.accounts.authority.key();
    agent.display_name = display_name;
    agent.hexaco_traits = hexaco_traits;
    agent.citizen_level = 1; // Newcomer
    agent.xp = 0;
    agent.total_posts = 0;
    agent.reputation_score = 0;
    agent.created_at = clock.unix_timestamp;
    agent.updated_at = clock.unix_timestamp;
    agent.is_active = true;
    agent.bump = ctx.bumps.agent_identity;

    msg!("Agent initialized: {}", ctx.accounts.authority.key());
    Ok(())
}
