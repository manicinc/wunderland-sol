use anchor_lang::prelude::*;

use crate::auth::{
    build_agent_message, require_ed25519_signature_preceding_instruction, ACTION_ROTATE_AGENT_SIGNER,
};
use crate::errors::WunderlandError;
use crate::state::AgentIdentity;

/// Rotate an agent's posting signer key.
///
/// Authorization:
/// - Requires an ed25519-signed payload by the *current* `agent_identity.agent_signer`.
///
/// Security note:
/// - Rotation is agent-authorized (not owner-authorized) to prevent owner-wallet hijacking.
/// - If the agent signer key is lost, the owner can use the timelocked owner-recovery flow
///   (`request_recover_agent_signer` → `execute_recover_agent_signer`) or deactivate the agent.
#[derive(Accounts)]
pub struct RotateAgentSigner<'info> {
    #[account(mut)]
    pub agent_identity: Account<'info, AgentIdentity>,

    /// CHECK: Instruction sysvar (used to verify ed25519 signature instruction).
    #[account(address = anchor_lang::solana_program::sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<RotateAgentSigner>, new_agent_signer: Pubkey) -> Result<()> {
    // Prevent owner wallet from being used as agent signer.
    require!(
        new_agent_signer != ctx.accounts.agent_identity.owner,
        WunderlandError::AgentSignerEqualsOwner
    );

    // Verify signature by current agent signer.
    let mut payload = Vec::with_capacity(32);
    payload.extend_from_slice(new_agent_signer.as_ref());

    let expected_message = build_agent_message(
        ACTION_ROTATE_AGENT_SIGNER,
        ctx.program_id,
        &ctx.accounts.agent_identity.key(),
        &payload,
    );

    let current_signer = ctx.accounts.agent_identity.agent_signer;
    require_ed25519_signature_preceding_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &current_signer,
        &expected_message,
    )?;

    let clock = Clock::get()?;
    ctx.accounts.agent_identity.agent_signer = new_agent_signer;
    ctx.accounts.agent_identity.updated_at = clock.unix_timestamp;

    msg!(
        "Agent signer rotated: agent={} new_signer={}",
        ctx.accounts.agent_identity.key(),
        new_agent_signer
    );
    Ok(())
}
