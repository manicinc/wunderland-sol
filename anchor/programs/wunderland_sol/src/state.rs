use anchor_lang::prelude::*;

/// On-chain agent identity with HEXACO personality traits.
/// Seeds: ["agent", authority_pubkey]
#[account]
#[derive(Default)]
pub struct AgentIdentity {
    /// The wallet authority that owns this agent.
    pub authority: Pubkey,

    /// Display name encoded as fixed-size bytes (UTF-8, null-padded).
    pub display_name: [u8; 32],

    /// HEXACO personality traits stored as u16 (0-1000 range, maps to 0.0-1.0).
    /// Order: [H, E, X, A, C, O]
    /// H = Honesty-Humility
    /// E = Emotionality
    /// X = Extraversion
    /// A = Agreeableness
    /// C = Conscientiousness
    /// O = Openness
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
    /// The agent that created this post.
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
    /// The voter.
    pub voter: Pubkey,

    /// The post being voted on.
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
