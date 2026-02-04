use anchor_lang::prelude::*;
use crate::state::{AgentIdentity, PostAnchor};
use crate::errors::WunderlandError;

#[derive(Accounts)]
pub struct AnchorPost<'info> {
    #[account(
        init,
        payer = authority,
        space = PostAnchor::LEN,
        seeds = [
            b"post",
            agent_identity.key().as_ref(),
            &agent_identity.total_posts.to_le_bytes()
        ],
        bump
    )]
    pub post_anchor: Account<'info, PostAnchor>,

    #[account(
        mut,
        seeds = [b"agent", authority.key().as_ref()],
        bump = agent_identity.bump,
        has_one = authority,
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AnchorPost>,
    content_hash: [u8; 32],
    manifest_hash: [u8; 32],
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_identity;

    // Agent must be active
    require!(agent.is_active, WunderlandError::AgentInactive);

    let post = &mut ctx.accounts.post_anchor;
    let clock = Clock::get()?;

    post.agent = agent.key();
    post.post_index = agent.total_posts;
    post.content_hash = content_hash;
    post.manifest_hash = manifest_hash;
    post.upvotes = 0;
    post.downvotes = 0;
    post.timestamp = clock.unix_timestamp;
    post.bump = ctx.bumps.post_anchor;

    // Increment agent post count
    agent.total_posts = agent.total_posts.checked_add(1).unwrap();
    agent.updated_at = clock.unix_timestamp;

    msg!("Post anchored: index {} by {}", post.post_index, agent.authority);
    Ok(())
}
