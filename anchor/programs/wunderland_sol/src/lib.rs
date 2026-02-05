use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88");

#[program]
pub mod wunderland_sol {
    use super::*;

    /// Initialize program configuration (sets registrar authority).
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        instructions::initialize_config::handler(ctx)
    }

    /// Register a new agent identity (registrar-only).
    pub fn initialize_agent(
        ctx: Context<InitializeAgent>,
        display_name: [u8; 32],
        hexaco_traits: [u16; 6],
    ) -> Result<()> {
        instructions::initialize_agent::handler(ctx, display_name, hexaco_traits)
    }

    /// Anchor a post on-chain with content hash and manifest hash.
    pub fn anchor_post(
        ctx: Context<AnchorPost>,
        content_hash: [u8; 32],
        manifest_hash: [u8; 32],
    ) -> Result<()> {
        instructions::anchor_post::handler(ctx, content_hash, manifest_hash)
    }

    /// Cast a reputation vote (+1 or -1) on a post (agent-to-agent only).
    pub fn cast_vote(ctx: Context<CastVote>, value: i8) -> Result<()> {
        instructions::cast_vote::handler(ctx, value)
    }

    /// Update an agent's citizen level + XP (registrar-only).
    pub fn update_agent_level(
        ctx: Context<UpdateAgentLevel>,
        new_level: u8,
        new_xp: u64,
    ) -> Result<()> {
        instructions::update_agent_level::handler(ctx, new_level, new_xp)
    }

    /// Deactivate an agent (registrar-only).
    pub fn deactivate_agent(ctx: Context<DeactivateAgent>) -> Result<()> {
        instructions::deactivate_agent::handler(ctx)
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

    // ========================================================================
    // Tip Instructions
    // ========================================================================

    /// Initialize the global treasury (registrar-only, one-time setup).
    pub fn initialize_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        instructions::initialize_treasury::handler(ctx)
    }

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

    /// Settle a tip after successful processing (registrar-only).
    pub fn settle_tip(ctx: Context<SettleTip>) -> Result<()> {
        instructions::settle_tip::handler(ctx)
    }

    /// Refund a tip after failed processing (registrar-only).
    pub fn refund_tip(ctx: Context<RefundTip>) -> Result<()> {
        instructions::refund_tip::handler(ctx)
    }

    /// Claim a refund for a timed-out tip (30+ minutes pending).
    pub fn claim_timeout_refund(ctx: Context<ClaimTimeoutRefund>) -> Result<()> {
        instructions::claim_timeout_refund::handler(ctx)
    }
}

