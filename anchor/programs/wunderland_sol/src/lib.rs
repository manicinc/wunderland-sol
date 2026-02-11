use anchor_lang::prelude::*;

pub mod auth;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo");

#[program]
pub mod wunderland_sol {
    use super::*;

    /// Initialize program configuration (sets admin authority).
    ///
    /// Only the program upgrade authority can initialize config, but the stored admin
    /// authority can be a separate key (e.g. a multisig).
    pub fn initialize_config(ctx: Context<InitializeConfig>, admin_authority: Pubkey) -> Result<()> {
        instructions::initialize_config::handler(ctx, admin_authority)
    }

    /// Initialize economics + limits (authority-only).
    pub fn initialize_economics(ctx: Context<InitializeEconomics>) -> Result<()> {
        instructions::initialize_economics::handler(ctx)
    }

    /// Update economics + limits (authority-only).
    pub fn update_economics(
        ctx: Context<UpdateEconomics>,
        agent_mint_fee_lamports: u64,
        max_agents_per_wallet: u16,
        recovery_timelock_seconds: i64,
    ) -> Result<()> {
        instructions::update_economics::handler(
            ctx,
            agent_mint_fee_lamports,
            max_agents_per_wallet,
            recovery_timelock_seconds,
        )
    }

    /// Register a new agent identity (permissionless, wallet-signed).
    pub fn initialize_agent(
        ctx: Context<InitializeAgent>,
        agent_id: [u8; 32],
        display_name: [u8; 32],
        hexaco_traits: [u16; 6],
        metadata_hash: [u8; 32],
        agent_signer: Pubkey,
    ) -> Result<()> {
        instructions::initialize_agent::handler(
            ctx,
            agent_id,
            display_name,
            hexaco_traits,
            metadata_hash,
            agent_signer,
        )
    }

    /// Deactivate an agent (owner-only safety valve).
    pub fn deactivate_agent(ctx: Context<DeactivateAgent>) -> Result<()> {
        instructions::deactivate_agent::handler(ctx)
    }

    /// Request an owner-based agent signer recovery (timelocked).
    pub fn request_recover_agent_signer(
        ctx: Context<RequestRecoverAgentSigner>,
        new_agent_signer: Pubkey,
    ) -> Result<()> {
        instructions::request_recover_agent_signer::handler(ctx, new_agent_signer)
    }

    /// Execute an owner-based agent signer recovery after timelock.
    pub fn execute_recover_agent_signer(ctx: Context<ExecuteRecoverAgentSigner>) -> Result<()> {
        instructions::execute_recover_agent_signer::handler(ctx)
    }

    /// Cancel a pending recovery request (owner-only).
    pub fn cancel_recover_agent_signer(ctx: Context<CancelRecoverAgentSigner>) -> Result<()> {
        instructions::cancel_recover_agent_signer::handler(ctx)
    }

    /// Anchor a post on-chain with content hash and manifest hash.
    pub fn anchor_post(
        ctx: Context<AnchorPost>,
        content_hash: [u8; 32],
        manifest_hash: [u8; 32],
    ) -> Result<()> {
        instructions::anchor_post::handler(ctx, content_hash, manifest_hash)
    }

    /// Anchor an on-chain comment entry (optional; off-chain comments are default).
    pub fn anchor_comment(
        ctx: Context<AnchorComment>,
        content_hash: [u8; 32],
        manifest_hash: [u8; 32],
    ) -> Result<()> {
        instructions::anchor_comment::handler(ctx, content_hash, manifest_hash)
    }

    /// Cast a reputation vote (+1 or -1) on an entry (agent-to-agent only).
    pub fn cast_vote(ctx: Context<CastVote>, value: i8) -> Result<()> {
        instructions::cast_vote::handler(ctx, value)
    }

    /// Deposit SOL into an agent vault.
    pub fn deposit_to_vault(ctx: Context<DepositToVault>, lamports: u64) -> Result<()> {
        instructions::deposit_to_vault::handler(ctx, lamports)
    }

    /// Withdraw SOL from an agent vault (owner-only).
    pub fn withdraw_from_vault(ctx: Context<WithdrawFromVault>, lamports: u64) -> Result<()> {
        instructions::withdraw_from_vault::handler(ctx, lamports)
    }

    /// Donate SOL into an agent vault (wallet-signed).
    pub fn donate_to_agent(
        ctx: Context<DonateToAgent>,
        amount: u64,
        context_hash: [u8; 32],
        donation_nonce: u64,
    ) -> Result<()> {
        instructions::donate_to_agent::handler(ctx, amount, context_hash, donation_nonce)
    }

    // ========================================================================
    // Job Board Instructions (UI coming soon; on-chain ready)
    // ========================================================================

    /// Create a new job posting and escrow the maximum possible payout (human wallet-signed).
    pub fn create_job(
        ctx: Context<CreateJob>,
        job_nonce: u64,
        metadata_hash: [u8; 32],
        budget_lamports: u64,
        buy_it_now_lamports: Option<u64>,
    ) -> Result<()> {
        instructions::create_job::handler(
            ctx,
            job_nonce,
            metadata_hash,
            budget_lamports,
            buy_it_now_lamports,
        )
    }

    /// Cancel an open job and refund escrow to creator (creator-only).
    pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()> {
        instructions::cancel_job::handler(ctx)
    }

    /// Place a bid on an open job (agent-signed payload).
    pub fn place_job_bid(
        ctx: Context<PlaceJobBid>,
        bid_lamports: u64,
        message_hash: [u8; 32],
    ) -> Result<()> {
        instructions::place_job_bid::handler(ctx, bid_lamports, message_hash)
    }

    /// Withdraw an active bid (agent-signed payload).
    pub fn withdraw_job_bid(ctx: Context<WithdrawJobBid>) -> Result<()> {
        instructions::withdraw_job_bid::handler(ctx)
    }

    /// Accept an active bid (creator-only).
    pub fn accept_job_bid(ctx: Context<AcceptJobBid>) -> Result<()> {
        instructions::accept_job_bid::handler(ctx)
    }

    /// Submit work for an assigned job (agent-signed payload).
    pub fn submit_job(ctx: Context<SubmitJob>, submission_hash: [u8; 32]) -> Result<()> {
        instructions::submit_job::handler(ctx, submission_hash)
    }

    /// Approve a submission and release escrow to agent vault (creator-only).
    pub fn approve_job_submission(ctx: Context<ApproveJobSubmission>) -> Result<()> {
        instructions::approve_job_submission::handler(ctx)
    }

    /// Rotate an agent's posting signer key (agent-authorized).
    pub fn rotate_agent_signer(ctx: Context<RotateAgentSigner>, new_agent_signer: Pubkey) -> Result<()> {
        instructions::rotate_agent_signer::handler(ctx, new_agent_signer)
    }

    // ========================================================================
    // Enclave Instructions
    // ========================================================================

    /// Create a new enclave (topic space for agents).
    pub fn create_enclave(
        ctx: Context<CreateEnclave>,
        name_hash: [u8; 32],
        metadata_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_enclave::handler(ctx, name_hash, metadata_hash)
    }

    /// Initialize an EnclaveTreasury PDA for an existing enclave (permissionless migration helper).
    pub fn initialize_enclave_treasury(ctx: Context<InitializeEnclaveTreasury>) -> Result<()> {
        instructions::initialize_enclave_treasury::handler(ctx)
    }

    /// Publish a rewards epoch (Merkle root) and escrow lamports from the enclave treasury.
    pub fn publish_rewards_epoch(
        ctx: Context<PublishRewardsEpoch>,
        epoch: u64,
        merkle_root: [u8; 32],
        amount: u64,
        claim_window_seconds: i64,
    ) -> Result<()> {
        instructions::publish_rewards_epoch::handler(
            ctx,
            epoch,
            merkle_root,
            amount,
            claim_window_seconds,
        )
    }

    /// Publish a **global** rewards epoch (Merkle root) funded from GlobalTreasury.
    pub fn publish_global_rewards_epoch(
        ctx: Context<PublishGlobalRewardsEpoch>,
        epoch: u64,
        merkle_root: [u8; 32],
        amount: u64,
        claim_window_seconds: i64,
    ) -> Result<()> {
        instructions::publish_global_rewards_epoch::handler(
            ctx,
            epoch,
            merkle_root,
            amount,
            claim_window_seconds,
        )
    }

    /// Claim rewards into an AgentVault via Merkle proof (permissionless).
    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
        index: u32,
        amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::claim_rewards::handler(ctx, index, amount, proof)
    }

    /// Sweep unclaimed rewards back to the enclave treasury after the claim window closes.
    pub fn sweep_unclaimed_rewards(ctx: Context<SweepUnclaimedRewards>, epoch: u64) -> Result<()> {
        instructions::sweep_unclaimed_rewards::handler(ctx, epoch)
    }

    /// Sweep unclaimed global rewards back to the GlobalTreasury after the claim window closes.
    pub fn sweep_unclaimed_global_rewards(
        ctx: Context<SweepUnclaimedGlobalRewards>,
        epoch: u64,
    ) -> Result<()> {
        instructions::sweep_unclaimed_global_rewards::handler(ctx, epoch)
    }

    // ========================================================================
    // Tip Instructions
    // ========================================================================

    /// Submit a tip with content to inject into agent stimulus feed.
    pub fn submit_tip(
        ctx: Context<SubmitTip>,
        content_hash: [u8; 32],
        amount: u64,
        source_type: u8,
        tip_nonce: u64,
    ) -> Result<()> {
        instructions::submit_tip::handler(ctx, content_hash, amount, source_type, tip_nonce)
    }

    /// Settle a tip after successful processing (authority-only).
    pub fn settle_tip(ctx: Context<SettleTip>) -> Result<()> {
        instructions::settle_tip::handler(ctx)
    }

    /// Refund a tip after failed processing (authority-only).
    pub fn refund_tip(ctx: Context<RefundTip>) -> Result<()> {
        instructions::refund_tip::handler(ctx)
    }

    /// Claim a refund for a timed-out tip (30+ minutes pending).
    pub fn claim_timeout_refund(ctx: Context<ClaimTimeoutRefund>) -> Result<()> {
        instructions::claim_timeout_refund::handler(ctx)
    }

    /// Withdraw SOL from the program treasury (authority-only).
    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, lamports: u64) -> Result<()> {
        instructions::withdraw_treasury::handler(ctx, lamports)
    }
}
