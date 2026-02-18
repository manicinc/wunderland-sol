use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hashv;

use crate::errors::WunderlandError;
use crate::state::{AgentIdentity, AgentVault, RewardsClaimReceipt, RewardsEpoch};

const MERKLE_DOMAIN: &[u8] = b"WUNDERLAND_REWARDS_V1";

fn compute_leaf(enclave: &Pubkey, epoch: u64, index: u32, agent: &Pubkey, amount: u64) -> [u8; 32] {
    let epoch_le = epoch.to_le_bytes();
    let index_le = index.to_le_bytes();
    let amount_le = amount.to_le_bytes();
    hashv(&[
        MERKLE_DOMAIN,
        enclave.as_ref(),
        &epoch_le,
        &index_le,
        agent.as_ref(),
        &amount_le,
    ])
    .to_bytes()
}

fn verify_merkle_proof(root: [u8; 32], leaf: [u8; 32], proof: &[[u8; 32]], index: u32) -> bool {
    let mut computed = leaf;
    let mut idx = index;
    for sibling in proof.iter() {
        computed = if (idx & 1) == 0 {
            hashv(&[computed.as_ref(), sibling.as_ref()]).to_bytes()
        } else {
            hashv(&[sibling.as_ref(), computed.as_ref()]).to_bytes()
        };
        idx >>= 1;
    }
    computed == root
}

/// Claim rewards from a published rewards epoch (permissionless).
///
/// Anyone can submit this transaction, but the reward is always paid into the agent's
/// program-owned `AgentVault` PDA. The agent owner can withdraw from the vault.
#[derive(Accounts)]
#[instruction(index: u32)]
pub struct ClaimRewards<'info> {
    /// Rewards epoch PDA (escrow + root).
    #[account(mut)]
    pub rewards_epoch: Account<'info, RewardsEpoch>,

    /// Agent identity receiving rewards.
    pub agent_identity: Account<'info, AgentIdentity>,

    /// Agent vault PDA receiving lamports.
    #[account(
        mut,
        seeds = [b"vault", agent_identity.key().as_ref()],
        bump = vault.bump,
        constraint = vault.agent == agent_identity.key() @ WunderlandError::InvalidAgentVault
    )]
    pub vault: Account<'info, AgentVault>,

    /// Claim receipt PDA (prevents double-claim per leaf index).
    #[account(
        init,
        payer = payer,
        space = RewardsClaimReceipt::LEN,
        seeds = [b"rewards_claim", rewards_epoch.key().as_ref(), index.to_le_bytes().as_ref()],
        bump
    )]
    pub claim_receipt: Account<'info, RewardsClaimReceipt>,

    /// Fee payer (permissionless).
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ClaimRewards>,
    index: u32,
    amount: u64,
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    require!(amount > 0, WunderlandError::InvalidAmount);
    require!(proof.len() <= 32, WunderlandError::MerkleProofTooLong);

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    let epoch = &mut ctx.accounts.rewards_epoch;
    if epoch.claim_deadline != 0 {
        require!(now <= epoch.claim_deadline, WunderlandError::ClaimWindowClosed);
    }
    require!(epoch.swept_at == 0, WunderlandError::RewardsEpochSwept);

    // Verify proof.
    let leaf = compute_leaf(&epoch.enclave, epoch.epoch, index, &ctx.accounts.agent_identity.key(), amount);
    require!(
        verify_merkle_proof(epoch.merkle_root, leaf, &proof, index),
        WunderlandError::InvalidMerkleProof
    );

    // Transfer lamports from epoch escrow to the agent vault, keeping epoch rent-exempt.
    let epoch_info = epoch.to_account_info();
    let vault_info = ctx.accounts.vault.to_account_info();

    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(RewardsEpoch::LEN);
    let epoch_lamports = epoch_info.lamports();
    require!(
        epoch_lamports >= min_balance.saturating_add(amount),
        WunderlandError::InsufficientRewardsBalance
    );

    // Accounting (sanity).
    let next_claimed = epoch
        .claimed_amount
        .checked_add(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;
    require!(next_claimed <= epoch.total_amount, WunderlandError::InsufficientRewardsBalance);
    epoch.claimed_amount = next_claimed;

    **epoch_info.try_borrow_mut_lamports()? = epoch_lamports
        .checked_sub(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;
    **vault_info.try_borrow_mut_lamports()? = vault_info
        .lamports()
        .checked_add(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    // Claim receipt
    let receipt = &mut ctx.accounts.claim_receipt;
    receipt.rewards_epoch = epoch.key();
    receipt.index = index;
    receipt.agent = ctx.accounts.agent_identity.key();
    receipt.amount = amount;
    receipt.claimed_at = now;
    receipt.bump = ctx.bumps.claim_receipt;

    msg!(
        "Rewards claimed: epoch={} index={} agent={} amount={}",
        receipt.rewards_epoch,
        receipt.index,
        receipt.agent,
        receipt.amount
    );
    Ok(())
}

