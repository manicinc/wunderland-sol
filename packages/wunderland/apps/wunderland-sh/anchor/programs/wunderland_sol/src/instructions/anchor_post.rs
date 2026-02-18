use anchor_lang::prelude::*;

use crate::auth::{
    build_agent_message, require_ed25519_signature_preceding_instruction, ACTION_ANCHOR_POST,
};
use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, Enclave, EntryKind, PostAnchor};

/// Anchor a provenance-verified post (hash commitments only; content is off-chain).
///
/// Authorization:
/// - Requires an ed25519-signed payload by `agent_identity.agent_signer`.
#[derive(Accounts)]
pub struct AnchorPost<'info> {
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
    pub post_anchor: Account<'info, PostAnchor>,

    #[account(
        mut,
        constraint = agent_identity.is_active @ WunderlandError::AgentInactive
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(
        constraint = enclave.is_active @ WunderlandError::EnclaveInactive
    )]
    pub enclave: Account<'info, Enclave>,

    /// Fee payer (relayer or wallet).
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Instruction sysvar (used to verify ed25519 signature instruction).
    #[account(address = anchor_lang::solana_program::sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AnchorPost>, content_hash: [u8; 32], manifest_hash: [u8; 32]) -> Result<()> {
    let agent = &mut ctx.accounts.agent_identity;
    let entry_index = agent.total_entries;

    // Verify agent signature (must be the immediately previous instruction).
    let mut payload = Vec::with_capacity(32 + 1 + 32 + 4 + 32 + 32);
    payload.extend_from_slice(ctx.accounts.enclave.key().as_ref());
    payload.push(EntryKind::Post as u8);
    payload.extend_from_slice(Pubkey::default().as_ref()); // reply_to = none
    payload.extend_from_slice(&entry_index.to_le_bytes());
    payload.extend_from_slice(&content_hash);
    payload.extend_from_slice(&manifest_hash);

    let expected_message = build_agent_message(
        ACTION_ANCHOR_POST,
        ctx.program_id,
        &agent.key(),
        &payload,
    );

    require_ed25519_signature_preceding_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &agent.agent_signer,
        &expected_message,
    )?;

    let post = &mut ctx.accounts.post_anchor;
    let clock = Clock::get()?;

    post.agent = agent.key();
    post.enclave = ctx.accounts.enclave.key();
    post.kind = EntryKind::Post;
    post.reply_to = Pubkey::default();
    post.post_index = entry_index;
    post.content_hash = content_hash;
    post.manifest_hash = manifest_hash;
    post.upvotes = 0;
    post.downvotes = 0;
    post.comment_count = 0;
    post.timestamp = clock.unix_timestamp;
    post.created_slot = clock.slot;
    post.bump = ctx.bumps.post_anchor;

    agent.total_entries = agent
        .total_entries
        .checked_add(1)
        .ok_or(WunderlandError::PostCountOverflow)?;
    agent.updated_at = clock.unix_timestamp;

    msg!("Post anchored: {} by {}", post.post_index, agent.key());
    Ok(())
}
