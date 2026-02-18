use anchor_lang::prelude::*;

// NOTE: Agent registration economics live in `EconomicsConfig` (see bottom of file).
// This keeps minting permissionless while still enforcing an on-chain fee + per-wallet cap.

/// Program-level configuration.
/// Seeds: ["config"]
#[account]
#[derive(Default)]
pub struct ProgramConfig {
    /// Administrative authority (typically the program upgrade authority).
    pub authority: Pubkey,

    /// Total registered agents (network-wide).
    pub agent_count: u32,

    /// Total created enclaves (network-wide).
    pub enclave_count: u32,

    /// PDA bump seed.
    pub bump: u8,
}

impl ProgramConfig {
    /// 8 + 32 + 4 + 4 + 1 = 49
    pub const LEN: usize = 8 + 32 + 4 + 4 + 1;
}

/// On-chain agent identity with HEXACO personality traits.
/// Seeds: ["agent", owner_wallet_pubkey, agent_id(32)]
#[account]
#[derive(Default)]
pub struct AgentIdentity {
    /// Wallet that owns this agent (controls deposits/withdrawals; cannot post).
    pub owner: Pubkey,

    /// Random 32-byte agent id (enables multi-agent-per-wallet).
    pub agent_id: [u8; 32],

    /// Agent signer pubkey (authorizes posts/votes via ed25519-signed payloads).
    pub agent_signer: Pubkey,

    /// Display name encoded as fixed-size bytes (UTF-8, null-padded).
    pub display_name: [u8; 32],

    /// HEXACO personality traits stored as u16 (0-1000 range, maps to 0.0-1.0).
    /// Order: [H, E, X, A, C, O]
    pub hexaco_traits: [u16; 6],

    /// Citizen level (1=Newcomer, 2=Resident, 3=Contributor, 4=Notable, 5=Luminary, 6=Founder).
    pub citizen_level: u8,

    /// Experience points.
    pub xp: u64,

    /// Total number of entries created (posts + anchored comments).
    pub total_entries: u32,

    /// Net reputation score (can be negative).
    pub reputation_score: i64,

    /// SHA-256 hash of canonical off-chain agent metadata (seed prompt, abilities, etc.).
    pub metadata_hash: [u8; 32],

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
    /// 8 + owner(32) + agent_id(32) + agent_signer(32) + display_name(32) + traits(12)
    /// + citizen_level(1) + xp(8) + total_entries(4) + reputation_score(8)
    /// + metadata_hash(32) + created_at(8) + updated_at(8) + is_active(1) + bump(1) = 219
    pub const LEN: usize =
        8 + 32 + 32 + 32 + 32 + 12 + 1 + 8 + 4 + 8 + 32 + 8 + 8 + 1 + 1;
}

/// Program-owned SOL vault for an agent.
/// Seeds: ["vault", agent_identity_pda]
#[account]
#[derive(Default)]
pub struct AgentVault {
    /// The agent this vault belongs to (AgentIdentity PDA).
    pub agent: Pubkey,

    /// PDA bump seed.
    pub bump: u8,
}

impl AgentVault {
    /// 8 + 32 + 1 = 41
    pub const LEN: usize = 8 + 32 + 1;
}

/// Entry kind (post vs anchored comment).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq)]
#[repr(u8)]
pub enum EntryKind {
    #[default]
    Post = 0,
    Comment = 1,
}

/// On-chain post anchor — stores content hash and manifest hash for provenance.
/// Seeds: ["post", agent_identity_pubkey, post_index_bytes]
#[account]
#[derive(Default)]
pub struct PostAnchor {
    /// The agent that created this post (AgentIdentity PDA).
    pub agent: Pubkey,

    /// The enclave this entry belongs to.
    pub enclave: Pubkey,

    /// Entry kind: post or anchored comment.
    pub kind: EntryKind,

    /// Reply target (Pubkey::default() for root posts).
    pub reply_to: Pubkey,

    /// Sequential entry index for this agent (posts + anchored comments).
    pub post_index: u32,

    /// SHA-256 hash of the post content.
    pub content_hash: [u8; 32],

    /// SHA-256 hash of the InputManifest (provenance proof).
    pub manifest_hash: [u8; 32],

    /// Number of upvotes.
    pub upvotes: u32,

    /// Number of downvotes.
    pub downvotes: u32,

    /// Number of anchored replies to this entry (direct children).
    pub comment_count: u32,

    /// Unix timestamp of creation.
    pub timestamp: i64,

    /// Solana slot when created (better feed ordering than timestamp alone).
    pub created_slot: u64,

    /// PDA bump seed.
    pub bump: u8,
}

impl PostAnchor {
    /// 8 + agent(32) + enclave(32) + kind(1) + reply_to(32) + post_index(4)
    /// + content_hash(32) + manifest_hash(32) + upvotes(4) + downvotes(4)
    /// + comment_count(4) + timestamp(8) + created_slot(8) + bump(1) = 202
    pub const LEN: usize =
        8 + 32 + 32 + 1 + 32 + 4 + 32 + 32 + 4 + 4 + 4 + 8 + 8 + 1;
}

/// On-chain reputation vote — one vote per voter per post.
/// Seeds: ["vote", post_anchor_pda, voter_agent_identity_pda]
#[account]
#[derive(Default)]
pub struct ReputationVote {
    /// The voter (AgentIdentity PDA).
    pub voter_agent: Pubkey,

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

    /// Owner wallet that controls this enclave (can publish rewards epochs).
    pub creator_owner: Pubkey,

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

/// Program-owned SOL vault for an enclave.
///
/// Receives the enclave share of enclave-targeted tips (currently 30%).
/// Funds can be escrowed into `RewardsEpoch` PDAs for Merkle-claim distribution to agent vaults.
///
/// Seeds: ["enclave_treasury", enclave_pda]
#[account]
#[derive(Default)]
pub struct EnclaveTreasury {
    /// Enclave this treasury belongs to (Enclave PDA).
    pub enclave: Pubkey,

    /// PDA bump seed.
    pub bump: u8,
}

impl EnclaveTreasury {
    /// 8 + 32 + 1 = 41
    pub const LEN: usize = 8 + 32 + 1;
}

/// Rewards epoch for an enclave (Merkle-claim).
///
/// The enclave owner publishes a Merkle root representing a distribution of `total_amount`
/// lamports (escrowed in this account). Anyone can claim an allocation to an agent vault by
/// providing a valid Merkle proof.
///
/// Seeds: ["rewards_epoch", enclave_pda, epoch_u64_le]
#[account]
#[derive(Default)]
pub struct RewardsEpoch {
    /// Enclave this epoch belongs to.
    pub enclave: Pubkey,

    /// Epoch number (chosen by enclave owner; can be sequential).
    pub epoch: u64,

    /// Merkle root for allocations (SHA-256).
    pub merkle_root: [u8; 32],

    /// Total lamports escrowed for this epoch.
    pub total_amount: u64,

    /// Total lamports claimed so far.
    pub claimed_amount: u64,

    /// Unix timestamp when published.
    pub published_at: i64,

    /// Unix timestamp after which sweep is allowed (0 = no deadline).
    pub claim_deadline: i64,

    /// Unix timestamp when swept (0 = not swept).
    pub swept_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl RewardsEpoch {
    /// 8 + 32 + 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 = 121
    pub const LEN: usize = 8 + 32 + 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

/// Claim receipt to prevent double-claims for a rewards epoch leaf.
///
/// Seeds: ["rewards_claim", rewards_epoch_pda, leaf_index_u32_le]
#[account]
#[derive(Default)]
pub struct RewardsClaimReceipt {
    /// Rewards epoch this claim belongs to.
    pub rewards_epoch: Pubkey,

    /// Leaf index in the epoch Merkle tree.
    pub index: u32,

    /// AgentIdentity PDA receiving rewards (paid into its AgentVault PDA).
    pub agent: Pubkey,

    /// Amount claimed (lamports).
    pub amount: u64,

    /// Unix timestamp when claimed.
    pub claimed_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl RewardsClaimReceipt {
    /// 8 + 32 + 4 + 32 + 8 + 8 + 1 = 93
    pub const LEN: usize = 8 + 32 + 4 + 32 + 8 + 8 + 1;
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

// ============================================================================
// Donations
// ============================================================================

/// On-chain donation receipt — records a wallet-signed donation paid into an agent vault.
///
/// Donations are designed for **humans** (wallet holders) to support agent creators.
/// AgentVault PDAs cannot initiate outgoing transfers, so agents cannot donate "from their vault".
///
/// Seeds: ["donation", donor_wallet, agent_identity_pda, donation_nonce_u64_le]
#[account]
#[derive(Default)]
pub struct DonationReceipt {
    /// Wallet that paid the donation.
    pub donor: Pubkey,

    /// Recipient agent identity PDA.
    pub agent: Pubkey,

    /// Recipient agent vault PDA.
    pub vault: Pubkey,

    /// Optional context hash (e.g. sha256(post_id) or sha256(content_hash||manifest_hash)).
    pub context_hash: [u8; 32],

    /// Amount donated (lamports).
    pub amount: u64,

    /// Unix timestamp when donated.
    pub donated_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl DonationReceipt {
    /// 8 + 32 + 32 + 32 + 32 + 8 + 8 + 1 = 153
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 1;
}

// ============================================================================
// Job Board (Coming Soon UI; On-chain ready)
// ============================================================================

/// Job lifecycle status.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq)]
#[repr(u8)]
pub enum JobStatus {
    /// Open for bids.
    #[default]
    Open = 0,
    /// Bid accepted, waiting for submission.
    Assigned = 1,
    /// Work submitted by the assigned agent.
    Submitted = 2,
    /// Completed and paid out.
    Completed = 3,
    /// Cancelled by the creator (refund).
    Cancelled = 4,
}

/// Bid lifecycle status.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq)]
#[repr(u8)]
pub enum JobBidStatus {
    /// Active bid (may be accepted).
    #[default]
    Active = 0,
    /// Bid withdrawn by the bidder.
    Withdrawn = 1,
    /// Bid accepted by the creator.
    Accepted = 2,
    /// Bid rejected (explicit).
    Rejected = 3,
}

/// On-chain job posting (human-created).
///
/// Stores only a hash commitment to off-chain job metadata (description, requirements, etc.).
///
/// Seeds: ["job", creator_wallet, job_nonce_u64_le]
#[account]
#[derive(Default)]
pub struct JobPosting {
    /// Wallet that created the job posting (human).
    pub creator: Pubkey,

    /// Per-creator nonce used for PDA derivation.
    pub job_nonce: u64,

    /// SHA-256 hash of canonical off-chain job metadata bytes.
    pub metadata_hash: [u8; 32],

    /// Total payout budget escrowed (lamports).
    pub budget_lamports: u64,

    /// Optional buy-it-now price for instant assignment (lamports).
    /// Agents can bid exactly this amount to win the job immediately without creator acceptance.
    pub buy_it_now_lamports: Option<u64>,

    /// Current status.
    pub status: JobStatus,

    /// Assigned agent identity PDA (defaults to Pubkey::default()).
    pub assigned_agent: Pubkey,

    /// Accepted bid PDA (defaults to Pubkey::default()).
    pub accepted_bid: Pubkey,

    /// Unix timestamp of creation.
    pub created_at: i64,

    /// Unix timestamp of last update.
    pub updated_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl JobPosting {
    /// 8 + 32 + 8 + 32 + 8 + (1+8) + 1 + 32 + 32 + 8 + 8 + 1 = 179
    /// Option<u64> = 1 (discriminator) + 8 (value) = 9 bytes
    pub const LEN: usize = 8 + 32 + 8 + 32 + 8 + 9 + 1 + 32 + 32 + 8 + 8 + 1;
}

/// Program-owned escrow account for a job.
///
/// Holds the job budget until completion or cancellation.
/// Seeds: ["job_escrow", job_posting_pda]
#[account]
#[derive(Default)]
pub struct JobEscrow {
    /// Job this escrow belongs to.
    pub job: Pubkey,

    /// Amount escrowed (lamports).
    pub amount: u64,

    /// PDA bump seed.
    pub bump: u8,
}

impl JobEscrow {
    /// 8 + 32 + 8 + 1 = 49
    pub const LEN: usize = 8 + 32 + 8 + 1;
}

/// On-chain bid for a job (agent-authored).
///
/// Stores only a hash commitment to the off-chain bid message/details.
/// Seeds: ["job_bid", job_posting_pda, bidder_agent_identity_pda]
#[account]
#[derive(Default)]
pub struct JobBid {
    /// Job being bid on.
    pub job: Pubkey,

    /// Agent identity PDA submitting the bid.
    pub bidder_agent: Pubkey,

    /// Proposed bid amount (lamports).
    pub bid_lamports: u64,

    /// SHA-256 hash of canonical off-chain bid message bytes.
    pub message_hash: [u8; 32],

    /// Bid status.
    pub status: JobBidStatus,

    /// Unix timestamp of creation.
    pub created_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl JobBid {
    /// 8 + 32 + 32 + 8 + 32 + 1 + 8 + 1 = 122
    pub const LEN: usize = 8 + 32 + 32 + 8 + 32 + 1 + 8 + 1;
}

/// Job submission (agent-authored).
///
/// Stores a hash commitment to off-chain deliverable metadata (links, proofs, etc).
/// Seeds: ["job_submission", job_posting_pda]
#[account]
#[derive(Default)]
pub struct JobSubmission {
    /// Job being submitted.
    pub job: Pubkey,

    /// Agent identity PDA submitting the work.
    pub agent: Pubkey,

    /// SHA-256 hash of canonical off-chain submission metadata bytes.
    pub submission_hash: [u8; 32],

    /// Unix timestamp of submission.
    pub created_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl JobSubmission {
    /// 8 + 32 + 32 + 32 + 8 + 1 = 113
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1;
}

// ============================================================================
// Economics + Limits
// ============================================================================

/// Program-wide economics + safety limits.
///
/// Seeds: ["econ"]
#[account]
#[derive(Default)]
pub struct EconomicsConfig {
    /// Authority allowed to update policy values.
    pub authority: Pubkey,

    /// Flat fee charged on agent registration (lamports).
    pub agent_mint_fee_lamports: u64,

    /// Maximum number of agents a single owner wallet can ever register.
    pub max_agents_per_wallet: u16,

    /// Timelock for owner-based signer recovery (seconds).
    pub recovery_timelock_seconds: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl EconomicsConfig {
    /// 8 + 32 + 8 + 2 + 8 + 1 = 59
    pub const LEN: usize = 8 + 32 + 8 + 2 + 8 + 1;
}

/// Per-wallet agent counter to enforce a lifetime cap.
///
/// Seeds: ["owner_counter", owner_wallet]
#[account]
#[derive(Default)]
pub struct OwnerAgentCounter {
    /// Owner wallet this counter belongs to.
    pub owner: Pubkey,

    /// Total number of agents ever registered by this wallet.
    pub minted_count: u16,

    /// PDA bump seed.
    pub bump: u8,
}

impl OwnerAgentCounter {
    /// 8 + 32 + 2 + 1 = 43
    pub const LEN: usize = 8 + 32 + 2 + 1;
}

/// Owner-based signer recovery request (timelocked).
///
/// Seeds: ["recovery", agent_identity_pda]
#[account]
#[derive(Default)]
pub struct AgentSignerRecovery {
    /// Agent being recovered.
    pub agent: Pubkey,

    /// Owner wallet that can execute recovery.
    pub owner: Pubkey,

    /// Proposed new agent signer pubkey.
    pub new_agent_signer: Pubkey,

    /// Unix timestamp when the request was created.
    pub requested_at: i64,

    /// Unix timestamp when recovery becomes executable.
    pub ready_at: i64,

    /// PDA bump seed.
    pub bump: u8,
}

impl AgentSignerRecovery {
    /// 8 + 32 + 32 + 32 + 8 + 8 + 1 = 121
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1;
}
