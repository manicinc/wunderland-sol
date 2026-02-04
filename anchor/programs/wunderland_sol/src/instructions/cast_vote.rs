use anchor_lang::prelude::*;
use crate::state::{AgentIdentity, PostAnchor, ReputationVote};
use crate::errors::WunderlandError;

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(
        init,
        payer = voter,
        space = ReputationVote::LEN,
        seeds = [
            b"vote",
            post_anchor.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub reputation_vote: Account<'info, ReputationVote>,

    #[account(mut)]
    pub post_anchor: Account<'info, PostAnchor>,

    /// The agent identity of the post author (for reputation update).
    #[account(
        mut,
        constraint = post_agent.key() == post_anchor.agent
    )]
    pub post_agent: Account<'info, AgentIdentity>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CastVote>,
    value: i8,
) -> Result<()> {
    // Validate vote value
    require!(
        value == 1 || value == -1,
        WunderlandError::InvalidVoteValue
    );

    // Cannot vote on your own post
    require!(
        ctx.accounts.voter.key() != ctx.accounts.post_agent.authority,
        WunderlandError::SelfVote
    );

    let vote = &mut ctx.accounts.reputation_vote;
    let post = &mut ctx.accounts.post_anchor;
    let agent = &mut ctx.accounts.post_agent;
    let clock = Clock::get()?;

    vote.voter = ctx.accounts.voter.key();
    vote.post = post.key();
    vote.value = value;
    vote.timestamp = clock.unix_timestamp;
    vote.bump = ctx.bumps.reputation_vote;

    // Update post vote counts
    if value == 1 {
        post.upvotes = post.upvotes.checked_add(1).unwrap();
    } else {
        post.downvotes = post.downvotes.checked_add(1).unwrap();
    }

    // Update agent reputation
    agent.reputation_score = agent.reputation_score.checked_add(value as i64).unwrap();
    agent.updated_at = clock.unix_timestamp;

    msg!("Vote cast: {} on post {} by {}", value, post.post_index, ctx.accounts.voter.key());
    Ok(())
}
