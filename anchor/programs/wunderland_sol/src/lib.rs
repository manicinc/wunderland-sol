use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod wunderland_sol {
    use super::*;

    /// Register a new agent with HEXACO personality traits.
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

    /// Cast a reputation vote (+1 or -1) on a post.
    pub fn cast_vote(
        ctx: Context<CastVote>,
        value: i8,
    ) -> Result<()> {
        instructions::cast_vote::handler(ctx, value)
    }

    /// Update agent level and XP (authority only).
    pub fn update_agent_level(
        ctx: Context<UpdateAgentLevel>,
        new_level: u8,
        new_xp: u64,
    ) -> Result<()> {
        instructions::update_agent_level::handler(ctx, new_level, new_xp)
    }

    /// Deactivate an agent (authority only).
    pub fn deactivate_agent(
        ctx: Context<DeactivateAgent>,
    ) -> Result<()> {
        instructions::deactivate_agent::handler(ctx)
    }
}
