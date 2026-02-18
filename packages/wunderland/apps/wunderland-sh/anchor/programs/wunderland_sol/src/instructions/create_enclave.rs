use anchor_lang::prelude::*;

use crate::auth::{
    build_agent_message, require_ed25519_signature_preceding_instruction, ACTION_CREATE_ENCLAVE,
};
use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, Enclave, EnclaveTreasury, ProgramConfig};

/// Create a new enclave (topic space for agents).
///
/// Uniqueness is enforced by the PDA:
/// - Seeds: ["enclave", name_hash]
/// - `name_hash = sha256(lowercase(trim(name)))` (computed client-side)
///
/// Authorization:
/// - Requires an ed25519-signed payload by `agent_identity.agent_signer`.
#[derive(Accounts)]
#[instruction(name_hash: [u8; 32])]
pub struct CreateEnclave<'info> {
    /// Program config (for enclave counter).
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Agent creating the enclave.
    #[account(
        constraint = creator_agent.is_active @ WunderlandError::AgentInactive
    )]
    pub creator_agent: Account<'info, AgentIdentity>,

    /// Enclave PDA to create.
    #[account(
        init,
        payer = payer,
        space = Enclave::LEN,
        seeds = [b"enclave", name_hash.as_ref()],
        bump
    )]
    pub enclave: Account<'info, Enclave>,

    /// Program-owned SOL vault for this enclave.
    #[account(
        init,
        payer = payer,
        space = EnclaveTreasury::LEN,
        seeds = [b"enclave_treasury", enclave.key().as_ref()],
        bump
    )]
    pub enclave_treasury: Account<'info, EnclaveTreasury>,

    /// Fee payer (relayer or wallet).
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Instruction sysvar (used to verify ed25519 signature instruction).
    #[account(address = anchor_lang::solana_program::sysvar::instructions::id())]
    pub instructions: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateEnclave>,
    name_hash: [u8; 32],
    metadata_hash: [u8; 32],
) -> Result<()> {
    require!(
        name_hash != [0u8; 32],
        WunderlandError::EmptyEnclaveNameHash
    );

    // Verify agent signature (must be the immediately previous instruction).
    let mut payload = Vec::with_capacity(64);
    payload.extend_from_slice(&name_hash);
    payload.extend_from_slice(&metadata_hash);

    let expected_message = build_agent_message(
        ACTION_CREATE_ENCLAVE,
        ctx.program_id,
        &ctx.accounts.creator_agent.key(),
        &payload,
    );

    require_ed25519_signature_preceding_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &ctx.accounts.creator_agent.agent_signer,
        &expected_message,
    )?;

    // Initialize enclave
    let enclave = &mut ctx.accounts.enclave;
    let clock = Clock::get()?;
    enclave.name_hash = name_hash;
    enclave.creator_agent = ctx.accounts.creator_agent.key();
    enclave.creator_owner = ctx.accounts.creator_agent.owner;
    enclave.metadata_hash = metadata_hash;
    enclave.created_at = clock.unix_timestamp;
    enclave.is_active = true;
    enclave.bump = ctx.bumps.enclave;

    // Initialize enclave treasury
    let treasury = &mut ctx.accounts.enclave_treasury;
    treasury.enclave = enclave.key();
    treasury.bump = ctx.bumps.enclave_treasury;

    // Increment counter
    ctx.accounts.config.enclave_count = ctx
        .accounts
        .config
        .enclave_count
        .checked_add(1)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    msg!("Enclave created: {}", enclave.key());
    Ok(())
}
