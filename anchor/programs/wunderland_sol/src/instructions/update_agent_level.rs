use anchor_lang::prelude::*;
use crate::state::AgentIdentity;
use crate::errors::WunderlandError;

#[derive(Accounts)]
pub struct UpdateAgentLevel<'info> {
    #[account(
        mut,
        seeds = [b"agent", authority.key().as_ref()],
        bump = agent_identity.bump,
        has_one = authority,
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateAgentLevel>,
    new_level: u8,
    new_xp: u64,
) -> Result<()> {
    require!(
        new_level >= 1 && new_level <= 6,
        WunderlandError::InvalidCitizenLevel
    );

    let agent = &mut ctx.accounts.agent_identity;
    let clock = Clock::get()?;

    agent.citizen_level = new_level;
    agent.xp = new_xp;
    agent.updated_at = clock.unix_timestamp;

    msg!("Agent level updated to {} (xp: {})", new_level, new_xp);
    Ok(())
}
