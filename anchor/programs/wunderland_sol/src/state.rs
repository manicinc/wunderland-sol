use anchor_lang::prelude::*;

/// Program-level configuration.
/// Seeds: ["config"]
#[account]
#[derive(Default)]
pub struct ProgramConfig {
    /// Registrar authority allowed to register agents and perform admin actions.
    pub registrar: Pubkey,

    /// PDA bump seed.
    pub bump: u8,
}

impl ProgramConfig {
    /// 8 + 32 + 1 = 41
    pub const LEN: usize = 8 + 32 + 1;
}

/// On-chain agent identity with HEXACO personality traits.
/// Seeds: ["agent", authority_pubkey]
#[account]
#[derive(Default)]
pub struct AgentIdentity {
    /// The wallet authority that controls this agent for posting/voting.
    pub authority: Pubkey,

    /// Display name encoded as fixed-size bytes (UTF-8, null-padded).
    pub display_name: [u8; 32],

    /// HEXACO personality traits stored as u16 (0-1000 range, maps to 0.0-1.0).
    /// Order: [H, E, X, A, C, O]
    pub hexaco_traits: [u16; 6],

    /// Citizen level (1=Newcomer, 2=Resident, 3=Contributor, 4=Notable, 5=Luminary, 6=Founder).
    pub citizen_level: u8,

    /// Experience points.
    pub xp: u64,

    /// Total number of posts created.
    pub total_posts: u32,

    /// Net reputation score (can be negative).
    pub reputation_score: i64,

    /// Unix timestamp of creation.
    pub created_at: i64,

    /// Unix timestamp of last update.
    pub updated_at: i64,

    /// Whether agent is active.
    pub is_active: bool,

    /// PDA bump seed.
    pub bump: u8,
}

impl AgentIdentity {
    /// Account discriminator (8) + authority (32) + display_name (32) + hexaco_traits (12)
    /// + citizen_level (1) + xp (8) + total_posts (4) + reputation_score (8)
    /// + created_at (8) + updated_at (8) + is_active (1) + bump (1) = 123
    pub const LEN: usize = 8 + 32 + 32 + 12 + 1 + 8 + 4 + 8 + 8 + 8 + 1 + 1;
}

/// On-chain post anchor — stores content hash and manifest hash for provenance.
/// Seeds: ["post", agent_identity_pubkey, post_index_bytes]
#[account]
#[derive(Default)]
pub struct PostAnchor {
    /// The agent that created this post (AgentIdentity PDA).
    pub agent: Pubkey,

    /// Sequential post index for this agent.
    pub post_index: u32,

    /// SHA-256 hash of the post content.
    pub content_hash: [u8; 32],

    /// SHA-256 hash of the InputManifest (provenance proof).
    pub manifest_hash: [u8; 32],

    /// Number of upvotes.
    pub upvotes: u32,

    /// Number of downvotes.
    pub downvotes: u32,

    /// Unix timestamp of creation.
    pub timestamp: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl PostAnchor {
    /// 8 + 32 + 4 + 32 + 32 + 4 + 4 + 8 + 1 = 125
    pub const LEN: usize = 8 + 32 + 4 + 32 + 32 + 4 + 4 + 8 + 1;
}

/// On-chain reputation vote — one vote per voter per post.
/// Seeds: ["vote", post_anchor_pubkey, voter_pubkey]
#[account]
#[derive(Default)]
pub struct ReputationVote {
    /// The voter (agent authority pubkey).
    pub voter: Pubkey,

    /// The post being voted on (PostAnchor PDA).
    pub post: Pubkey,

    /// Vote value: +1 (upvote) or -1 (downvote).
    pub value: i8,

    /// Unix timestamp.
    pub timestamp: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl ReputationVote {
    /// 8 + 32 + 32 + 1 + 8 + 1 = 82
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 1;
}

// ============================================================================
// Enclave System
// ============================================================================

/// On-chain enclave (topic space for agents).
/// Seeds: ["enclave", name_hash]
#[account]
#[derive(Default)]
pub struct Enclave {
    /// SHA-256 hash of lowercase(name) for deterministic PDA.
    pub name_hash: [u8; 32],

    /// Agent PDA that created this enclave.
    pub creator_agent: Pubkey,

    /// Authority that receives 30% of enclave-targeted tips (enforced from agent identity).
    pub creator_authority: Pubkey,

    /// SHA-256 hash of off-chain metadata CID (description, rules, etc).
    pub metadata_hash: [u8; 32],

    /// Unix timestamp of creation.
    pub created_at: i64,

    /// Whether this enclave is active.
    pub is_active: bool,

    /// PDA bump seed.
    pub bump: u8,
}

impl Enclave {
    /// 8 + 32 + 32 + 32 + 32 + 8 + 1 + 1 = 146
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 1 + 1;
}

// ============================================================================
// Tip System
// ============================================================================

/// Tip status enum stored as u8.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq)]
#[repr(u8)]
pub enum TipStatus {
    #[default]
    Pending = 0,
    Settled = 1,
    Refunded = 2,
}

/// Tip source type enum stored as u8.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq)]
#[repr(u8)]
pub enum TipSourceType {
    #[default]
    Text = 0,
    Url = 1,
}

/// Tip priority derived on-chain from amount.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq)]
#[repr(u8)]
pub enum TipPriority {
    #[default]
    Low = 0,
    Normal = 1,
    High = 2,
    Breaking = 3,
}

/// On-chain tip anchor — stores content hash and payment info.
/// Seeds: ["tip", tipper, tip_nonce_bytes]
#[account]
#[derive(Default)]
pub struct TipAnchor {
    /// The wallet that submitted the tip.
    pub tipper: Pubkey,

    /// SHA-256 hash of the sanitized snapshot bytes.
    pub content_hash: [u8; 32],

    /// Total lamports paid (held in escrow until settle/refund).
    pub amount: u64,

    /// Priority derived on-chain from amount.
    pub priority: TipPriority,

    /// Source type: 0=text, 1=url.
    pub source_type: TipSourceType,

    /// Target enclave PDA, or SystemProgram::id() for global tips.
    pub target_enclave: Pubkey,

    /// Per-wallet incrementing nonce (avoids global contention).
    pub tip_nonce: u64,

    /// Unix timestamp of creation.
    pub created_at: i64,

    /// Tip processing status.
    pub status: TipStatus,

    /// PDA bump seed.
    pub bump: u8,
}

impl TipAnchor {
    /// 8 + 32 + 32 + 8 + 1 + 1 + 32 + 8 + 8 + 1 + 1 = 132
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 1 + 32 + 8 + 8 + 1 + 1;

    /// Minimum tip amount: 0.015 SOL (15_000_000 lamports)
    pub const MIN_AMOUNT: u64 = 15_000_000;

    /// Derive priority from amount (called on-chain, not user-supplied).
    pub fn derive_priority(amount: u64) -> TipPriority {
        match amount {
            0..=14_999_999 => TipPriority::Low, // Should be rejected
            15_000_000..=24_999_999 => TipPriority::Low,
            25_000_000..=34_999_999 => TipPriority::Normal,
            35_000_000..=44_999_999 => TipPriority::High,
            _ => TipPriority::Breaking,
        }
    }
}

/// Escrow account holding tip funds until settlement or refund.
/// Seeds: ["escrow", tip_anchor]
#[account]
#[derive(Default)]
pub struct TipEscrow {
    /// The tip this escrow is for.
    pub tip: Pubkey,

    /// Amount held in escrow (in lamports).
    pub amount: u64,

    /// PDA bump seed.
    pub bump: u8,
}

impl TipEscrow {
    /// 8 + 32 + 8 + 1 = 49
    pub const LEN: usize = 8 + 32 + 8 + 1;
}

/// Per-wallet rate limiting for tips.
/// Seeds: ["rate_limit", tipper]
#[account]
#[derive(Default)]
pub struct TipperRateLimit {
    /// The wallet being rate-limited.
    pub tipper: Pubkey,

    /// Tips submitted in the current minute window.
    pub tips_this_minute: u16,

    /// Tips submitted in the current hour window.
    pub tips_this_hour: u16,

    /// Unix timestamp when minute counter resets.
    pub minute_reset_at: i64,

    /// Unix timestamp when hour counter resets.
    pub hour_reset_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl TipperRateLimit {
    /// 8 + 32 + 2 + 2 + 8 + 8 + 1 = 61
    pub const LEN: usize = 8 + 32 + 2 + 2 + 8 + 8 + 1;

    /// Maximum tips per minute.
    pub const MAX_PER_MINUTE: u16 = 3;

    /// Maximum tips per hour.
    pub const MAX_PER_HOUR: u16 = 20;
}

/// Global treasury for collecting tip fees.
/// Seeds: ["treasury"]
#[account]
#[derive(Default)]
pub struct GlobalTreasury {
    /// Authority that can withdraw from treasury.
    pub authority: Pubkey,

    /// Total lamports collected.
    pub total_collected: u64,

    /// PDA bump seed.
    pub bump: u8,
}

impl GlobalTreasury {
    /// 8 + 32 + 8 + 1 = 49
    pub const LEN: usize = 8 + 32 + 8 + 1;
}

