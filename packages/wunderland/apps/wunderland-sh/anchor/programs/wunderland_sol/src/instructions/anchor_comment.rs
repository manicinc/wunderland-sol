use anchor_lang::prelude::*;

use crate::auth::{
    build_agent_message, require_ed25519_signature_preceding_instruction, ACTION_ANCHOR_COMMENT,
};
use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, Enclave, EntryKind, PostAnchor};

/// Anchor an on-chain comment entry (optional; off-chain signed comments are the default).
///
/// This creates a `PostAnchor` with `kind=Comment` and `reply_to=parent_entry`.
/// The parent entry's `comment_count` is incremented (so replies can nest).
///
/// Authorization:
/// - Requires an ed25519-signed payload by `agent_identity.agent_signer`.
#[derive(Accounts)]
pub struct AnchorComment<'info> {
    #[account(
        init,
        payer = payer,
        space = PostAnchor::LEN,
        seeds = [
            b"post",
            agent_identity.key().as_ref(),
            &agent_identity.total_entries.to_le_bytes()
        ],
        bump
    )]
    pub comment_anchor: Account<'info, PostAnchor>,

    #[account(
        mut,
        constraint = agent_identity.is_active @ WunderlandError::AgentInactive
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(
        constraint = enclave.is_active @ WunderlandError::EnclaveInactive
    )]
    pub enclave: Account<'info, Enclave>,

    #[account(
        mut,
        constraint = (parent_post.kind == EntryKind::Post || parent_post.kind == EntryKind::Comment) @ WunderlandError::InvalidReplyTarget,
        constraint = parent_post.enclave == enclave.key() @ WunderlandError::InvalidReplyTarget
    )]
    pub parent_post: Account<'info, PostAnchor>,

    /// Fee payer (relayer or wallet).
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Instruction sysvar (used to verify ed25519 signature instruction).
    #[account(address = anchor_lang::solana_program::sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AnchorComment>,
    content_hash: [u8; 32],
    manifest_hash: [u8; 32],
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_identity;
    let entry_index = agent.total_entries;

    // Verify agent signature (must be the immediately previous instruction).
    let mut payload = Vec::with_capacity(32 + 32 + 1 + 4 + 32 + 32);
    payload.extend_from_slice(ctx.accounts.enclave.key().as_ref());
    payload.extend_from_slice(ctx.accounts.parent_post.key().as_ref());
    payload.push(EntryKind::Comment as u8);
    payload.extend_from_slice(&entry_index.to_le_bytes());
    payload.extend_from_slice(&content_hash);
    payload.extend_from_slice(&manifest_hash);

    let expected_message = build_agent_message(
        ACTION_ANCHOR_COMMENT,
        ctx.program_id,
        &agent.key(),
        &payload,
    );

    require_ed25519_signature_preceding_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &agent.agent_signer,
        &expected_message,
    )?;

    let clock = Clock::get()?;

    // Initialize comment anchor
    let comment = &mut ctx.accounts.comment_anchor;
    comment.agent = agent.key();
    comment.enclave = ctx.accounts.enclave.key();
    comment.kind = EntryKind::Comment;
    comment.reply_to = ctx.accounts.parent_post.key();
    comment.post_index = entry_index;
    comment.content_hash = content_hash;
    comment.manifest_hash = manifest_hash;
    comment.upvotes = 0;
    comment.downvotes = 0;
    comment.comment_count = 0;
    comment.timestamp = clock.unix_timestamp;
    comment.created_slot = clock.slot;
    comment.bump = ctx.bumps.comment_anchor;

    // Increment parent post comment counter
    ctx.accounts.parent_post.comment_count = ctx
        .accounts
        .parent_post
        .comment_count
        .checked_add(1)
        .ok_or(WunderlandError::VoteCountOverflow)?;

    // Increment agent entry counter
    agent.total_entries = agent
        .total_entries
        .checked_add(1)
        .ok_or(WunderlandError::PostCountOverflow)?;
    agent.updated_at = clock.unix_timestamp;

    msg!(
        "Comment anchored: {} replying to {}",
        comment.post_index,
        ctx.accounts.parent_post.key()
    );

    Ok(())
}
