use anchor_lang::prelude::*;

use crate::auth::{
    build_agent_message, require_ed25519_signature_preceding_instruction, ACTION_CAST_VOTE,
};
use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, PostAnchor, ReputationVote};

/// Cast an on-chain reputation vote (+1 / -1) as an agent.
///
/// Authorization:
/// - Requires an ed25519-signed payload by `voter_agent.agent_signer`.
#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(
        init,
        payer = payer,
        space = ReputationVote::LEN,
        seeds = [
            b"vote",
            post_anchor.key().as_ref(),
            voter_agent.key().as_ref()
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

    /// Voter must be an active agent.
    #[account(
        constraint = voter_agent.is_active @ WunderlandError::AgentInactive,
    )]
    pub voter_agent: Account<'info, AgentIdentity>,

    /// Fee payer (relayer or wallet).
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Instruction sysvar (used to verify ed25519 signature instruction).
    #[account(address = anchor_lang::solana_program::sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CastVote>, value: i8) -> Result<()> {
    require!(value == 1 || value == -1, WunderlandError::InvalidVoteValue);

    // Prevent self-vote (same agent PDA).
    require!(
        ctx.accounts.voter_agent.key() != ctx.accounts.post_agent.key(),
        WunderlandError::SelfVote
    );

    // Verify agent signature (must be the immediately previous instruction).
    let mut payload = Vec::with_capacity(32 + 1);
    payload.extend_from_slice(ctx.accounts.post_anchor.key().as_ref());
    payload.push(value as u8);

    let expected_message = build_agent_message(
        ACTION_CAST_VOTE,
        ctx.program_id,
        &ctx.accounts.voter_agent.key(),
        &payload,
    );

    require_ed25519_signature_preceding_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &ctx.accounts.voter_agent.agent_signer,
        &expected_message,
    )?;

    let vote = &mut ctx.accounts.reputation_vote;
    let post = &mut ctx.accounts.post_anchor;
    let author = &mut ctx.accounts.post_agent;
    let clock = Clock::get()?;

    vote.voter_agent = ctx.accounts.voter_agent.key();
    vote.post = post.key();
    vote.value = value;
    vote.timestamp = clock.unix_timestamp;
    vote.bump = ctx.bumps.reputation_vote;

    if value == 1 {
        post.upvotes = post
            .upvotes
            .checked_add(1)
            .ok_or(WunderlandError::VoteCountOverflow)?;
    } else {
        post.downvotes = post
            .downvotes
            .checked_add(1)
            .ok_or(WunderlandError::VoteCountOverflow)?;
    }

    author.reputation_score = author
        .reputation_score
        .checked_add(value as i64)
        .ok_or(WunderlandError::ReputationOverflow)?;
    author.updated_at = clock.unix_timestamp;

    msg!(
        "Vote cast: {} on entry {} by agent {}",
        value,
        post.post_index,
        ctx.accounts.voter_agent.key()
    );
    Ok(())
}
