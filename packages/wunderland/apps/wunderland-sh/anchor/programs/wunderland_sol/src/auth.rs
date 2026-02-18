use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    sysvar::instructions::{load_current_index_checked, load_instruction_at_checked},
};

use crate::errors::WunderlandError;

/// Domain separator for all agent-signed payloads.
pub const SIGN_DOMAIN: &[u8] = b"WUNDERLAND_SOL_V2";

/// Action identifiers (domain-separated by `SIGN_DOMAIN`).
pub const ACTION_CREATE_ENCLAVE: u8 = 1;
pub const ACTION_ANCHOR_POST: u8 = 2;
pub const ACTION_ANCHOR_COMMENT: u8 = 3;
pub const ACTION_CAST_VOTE: u8 = 4;
pub const ACTION_ROTATE_AGENT_SIGNER: u8 = 5;
pub const ACTION_PLACE_JOB_BID: u8 = 6;
pub const ACTION_WITHDRAW_JOB_BID: u8 = 7;
pub const ACTION_SUBMIT_JOB: u8 = 8;

// Ed25519 instruction layout constants (mirrors Solana's ed25519 precompile format).
const ED25519_OFFSETS_START: usize = 2;
const ED25519_OFFSETS_SIZE: usize = 14;
const ED25519_PUBKEY_SIZE: usize = 32;

fn read_u16_le(data: &[u8], offset: usize) -> Result<u16> {
    if offset + 2 > data.len() {
        return err!(WunderlandError::InvalidEd25519Instruction);
    }
    Ok(u16::from_le_bytes([data[offset], data[offset + 1]]))
}

/// Verify that the immediately preceding instruction is an ed25519 signature verification
/// for `expected_pubkey` over `expected_message`.
///
/// This uses the runtime's ed25519 precompile: the transaction fails if the signature is invalid.
/// The program only needs to confirm that the verified message/pubkey match what it expects.
pub fn require_ed25519_signature_preceding_instruction(
    instructions_sysvar: &AccountInfo,
    expected_pubkey: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    let current_index = load_current_index_checked(instructions_sysvar)
        .map_err(|_| error!(WunderlandError::InvalidEd25519Instruction))?;
    require!(
        current_index > 0,
        WunderlandError::MissingEd25519Instruction
    );

    let ed25519_ix = load_instruction_at_checked(
        (current_index - 1) as usize,
        instructions_sysvar,
    )
    .map_err(|_| error!(WunderlandError::MissingEd25519Instruction))?;

    require_keys_eq!(
        ed25519_ix.program_id,
        ed25519_program::id(),
        WunderlandError::MissingEd25519Instruction
    );

    let data = ed25519_ix.data;
    if data.len() < ED25519_OFFSETS_START + ED25519_OFFSETS_SIZE {
        return err!(WunderlandError::InvalidEd25519Instruction);
    }

    let num_signatures = data[0] as usize;
    require!(num_signatures == 1, WunderlandError::InvalidEd25519Instruction);

    // Offsets struct for the first (and only) signature starts at byte 2.
    let o = ED25519_OFFSETS_START;
    let signature_offset = read_u16_le(&data, o)? as usize;
    let signature_instruction_index = read_u16_le(&data, o + 2)?;
    let public_key_offset = read_u16_le(&data, o + 4)? as usize;
    let public_key_instruction_index = read_u16_le(&data, o + 6)?;
    let message_data_offset = read_u16_le(&data, o + 8)? as usize;
    let message_data_size = read_u16_le(&data, o + 10)? as usize;
    let message_instruction_index = read_u16_le(&data, o + 12)?;

    // Enforce that pubkey/signature/message are embedded in this instruction (u16::MAX).
    require!(
        signature_instruction_index == u16::MAX
            && public_key_instruction_index == u16::MAX
            && message_instruction_index == u16::MAX,
        WunderlandError::InvalidEd25519Instruction
    );

    // Bounds check and compare pubkey.
    let pk_end = public_key_offset
        .checked_add(ED25519_PUBKEY_SIZE)
        .ok_or(WunderlandError::InvalidEd25519Instruction)?;
    require!(pk_end <= data.len(), WunderlandError::InvalidEd25519Instruction);
    let pk_bytes = &data[public_key_offset..pk_end];
    require!(
        pk_bytes == expected_pubkey.as_ref(),
        WunderlandError::SignaturePublicKeyMismatch
    );

    // Bounds check and compare message.
    let msg_end = message_data_offset
        .checked_add(message_data_size)
        .ok_or(WunderlandError::InvalidEd25519Instruction)?;
    require!(msg_end <= data.len(), WunderlandError::InvalidEd25519Instruction);
    let msg_bytes = &data[message_data_offset..msg_end];
    require!(
        msg_bytes == expected_message,
        WunderlandError::SignatureMessageMismatch
    );

    // Basic sanity: signature bytes region must exist (runtime already validated signature).
    let sig_end = signature_offset
        .checked_add(64)
        .ok_or(WunderlandError::InvalidEd25519Instruction)?;
    require!(sig_end <= data.len(), WunderlandError::InvalidEd25519Instruction);

    Ok(())
}

/// Construct the canonical message bytes that an agent signer must sign.
///
/// Layout (binary):
/// `SIGN_DOMAIN || action(u8) || program_id(32) || agent_identity_pda(32) || payload(...)`
pub fn build_agent_message(
    action: u8,
    program_id: &Pubkey,
    agent_identity_pda: &Pubkey,
    payload: &[u8],
) -> Vec<u8> {
    let mut out = Vec::with_capacity(
        SIGN_DOMAIN.len() + 1 + 32 + 32 + payload.len(),
    );
    out.extend_from_slice(SIGN_DOMAIN);
    out.push(action);
    out.extend_from_slice(program_id.as_ref());
    out.extend_from_slice(agent_identity_pda.as_ref());
    out.extend_from_slice(payload);
    out
}
