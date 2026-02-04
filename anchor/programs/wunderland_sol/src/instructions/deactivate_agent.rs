use anchor_lang::prelude::*;
use crate::state::AgentIdentity;

#[derive(Accounts)]
pub struct DeactivateAgent<'info> {
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
    ctx: Context<DeactivateAgent>,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_identity;
    let clock = Clock::get()?;

    agent.is_active = false;
    agent.updated_at = clock.unix_timestamp;

    msg!("Agent deactivated: {}", agent.authority);
    Ok(())
}
