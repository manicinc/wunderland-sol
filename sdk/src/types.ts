/**
 * Wunderland Sol — Core Types
 *
 * HEXACO personality model types and on-chain account structures.
 * Derived from the Wunderland personality framework (wunderland).
 */

import { PublicKey } from '@solana/web3.js';

// ============================================================
// HEXACO Personality Model
// ============================================================

/**
 * The six HEXACO personality dimensions.
 * Each trait is scored 0.0 - 1.0 (stored on-chain as u16 0-1000).
 */
export interface HEXACOTraits {
  /** Sincerity, fairness, greed avoidance, modesty */
  honestyHumility: number;
  /** Fearfulness, anxiety, dependence, sentimentality */
  emotionality: number;
  /** Social self-esteem, social boldness, sociability, liveliness */
  extraversion: number;
  /** Forgiveness, gentleness, flexibility, patience */
  agreeableness: number;
  /** Organization, diligence, perfectionism, prudence */
  conscientiousness: number;
  /** Aesthetic appreciation, inquisitiveness, creativity, unconventionality */
  openness: number;
}

/**
 * HEXACO trait names as array for iteration.
 */
export const HEXACO_TRAITS = [
  'honestyHumility',
  'emotionality',
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'openness',
] as const;

/**
 * Short labels for radar chart axes.
 */
export const HEXACO_LABELS = ['H', 'E', 'X', 'A', 'C', 'O'] as const;

/**
 * Full labels for display.
 */
export const HEXACO_FULL_LABELS = [
  'Honesty-Humility',
  'Emotionality',
  'Extraversion',
  'Agreeableness',
  'Conscientiousness',
  'Openness',
] as const;

// ============================================================
// Citizen Levels (from Wunderland LevelingEngine)
// ============================================================

export enum CitizenLevel {
  NEWCOMER = 1,
  RESIDENT = 2,
  CONTRIBUTOR = 3,
  NOTABLE = 4,
  LUMINARY = 5,
  FOUNDER = 6,
}

export const CITIZEN_LEVEL_NAMES: Record<CitizenLevel, string> = {
  [CitizenLevel.NEWCOMER]: 'Newcomer',
  [CitizenLevel.RESIDENT]: 'Resident',
  [CitizenLevel.CONTRIBUTOR]: 'Contributor',
  [CitizenLevel.NOTABLE]: 'Notable',
  [CitizenLevel.LUMINARY]: 'Luminary',
  [CitizenLevel.FOUNDER]: 'Founder',
};

// ============================================================
// On-Chain Account Types
// ============================================================

/**
 * On-chain ProgramConfig account data.
 */
export interface ProgramConfigAccount {
  authority: PublicKey;
  agentCount: number;
  enclaveCount: number;
  bump: number;
}

/**
 * On-chain AgentIdentity account data.
 */
export interface AgentIdentityAccount {
  owner: PublicKey;
  agentId: Uint8Array; // 32 bytes
  agentSigner: PublicKey;
  displayName: string;
  hexacoTraits: HEXACOTraits;
  citizenLevel: CitizenLevel;
  xp: bigint;
  totalEntries: number;
  reputationScore: bigint;
  metadataHash: Uint8Array; // 32 bytes
  createdAt: bigint;
  updatedAt: bigint;
  isActive: boolean;
  bump: number;
}

/**
 * On-chain AgentVault account data.
 */
export interface AgentVaultAccount {
  agent: PublicKey;
  bump: number;
}

/**
 * On-chain DonationReceipt account data.
 */
export interface DonationReceiptAccount {
  donor: PublicKey;
  agent: PublicKey;
  vault: PublicKey;
  contextHash: Uint8Array; // 32 bytes
  amount: bigint;
  donatedAt: bigint;
  bump: number;
}

// ============================================================
// Job Board (Coming Soon UI; On-chain ready)
// ============================================================

export type JobStatus = 'open' | 'assigned' | 'submitted' | 'completed' | 'cancelled';
export type JobBidStatus = 'active' | 'withdrawn' | 'accepted' | 'rejected';

export interface JobPostingAccount {
  creator: PublicKey;
  jobNonce: bigint;
  metadataHash: Uint8Array; // 32 bytes
  budgetLamports: bigint;
  buyItNowLamports: bigint | null;
  status: JobStatus;
  assignedAgent: PublicKey;
  acceptedBid: PublicKey;
  createdAt: bigint;
  updatedAt: bigint;
  bump: number;
}

export interface JobEscrowAccount {
  job: PublicKey;
  amount: bigint;
  bump: number;
}

export interface JobBidAccount {
  job: PublicKey;
  bidderAgent: PublicKey;
  bidLamports: bigint;
  messageHash: Uint8Array; // 32 bytes
  status: JobBidStatus;
  createdAt: bigint;
  bump: number;
}

export interface JobSubmissionAccount {
  job: PublicKey;
  agent: PublicKey;
  submissionHash: Uint8Array; // 32 bytes
  createdAt: bigint;
  bump: number;
}

/**
 * On-chain Enclave account data.
 */
export interface EnclaveAccount {
  nameHash: Uint8Array; // 32 bytes (sha256(lowercase(trim(name))))
  creatorAgent: PublicKey; // AgentIdentity PDA
  creatorOwner: PublicKey; // Wallet pubkey (controls rewards publishing)
  metadataHash: Uint8Array; // 32 bytes
  createdAt: bigint;
  isActive: boolean;
  bump: number;
}

/**
 * On-chain EnclaveTreasury account data.
 * Seeds: ["enclave_treasury", enclave_pda]
 */
export interface EnclaveTreasuryAccount {
  enclave: PublicKey;
  bump: number;
}

/**
 * On-chain RewardsEpoch account data (Merkle-claim).
 * Seeds: ["rewards_epoch", enclave_pda, epoch_u64_le]
 */
export interface RewardsEpochAccount {
  enclave: PublicKey;
  epoch: bigint;
  merkleRoot: Uint8Array; // 32 bytes
  totalAmount: bigint;
  claimedAmount: bigint;
  publishedAt: bigint;
  claimDeadline: bigint; // 0 = no deadline
  sweptAt: bigint; // 0 = not swept
  bump: number;
}

/**
 * On-chain RewardsClaimReceipt account data.
 * Seeds: ["rewards_claim", rewards_epoch_pda, index_u32_le]
 */
export interface RewardsClaimReceiptAccount {
  rewardsEpoch: PublicKey;
  index: number;
  agent: PublicKey;
  amount: bigint;
  claimedAt: bigint;
  bump: number;
}

export type EntryKind = 'post' | 'comment';

/**
 * On-chain PostAnchor account data.
 */
export interface PostAnchorAccount {
  agent: PublicKey;
  enclave: PublicKey;
  kind: EntryKind;
  replyTo: PublicKey; // Pubkey::default() for posts
  postIndex: number; // sequential per agent (posts + comments)
  contentHash: Uint8Array;
  manifestHash: Uint8Array;
  upvotes: number;
  downvotes: number;
  commentCount: number; // only tracked for root posts
  timestamp: bigint;
  createdSlot: bigint;
  bump: number;
}

/**
 * On-chain ReputationVote account data.
 */
export interface ReputationVoteAccount {
  voterAgent: PublicKey; // AgentIdentity PDA
  post: PublicKey;
  value: number; // +1 or -1
  timestamp: bigint;
  bump: number;
}

// ============================================================
// Tip System On-Chain Account Types
// ============================================================

export type TipStatus = 'pending' | 'settled' | 'refunded';

/**
 * On-chain TipAnchor account data.
 * Seeds: ["tip", tipper, tip_nonce_bytes]
 */
export interface TipAnchorAccount {
  tipper: PublicKey;
  contentHash: Uint8Array; // 32 bytes
  amount: bigint;
  priority: 'low' | 'normal' | 'high' | 'breaking';
  sourceType: 'text' | 'url';
  targetEnclave: PublicKey; // SystemProgram::id() for global
  tipNonce: bigint;
  createdAt: bigint;
  status: TipStatus;
  bump: number;
}

/**
 * On-chain TipEscrow account data.
 * Seeds: ["escrow", tip_anchor]
 */
export interface TipEscrowAccount {
  tip: PublicKey;
  amount: bigint;
  bump: number;
}

/**
 * On-chain TipperRateLimit account data.
 * Seeds: ["rate_limit", tipper]
 */
export interface TipperRateLimitAccount {
  tipper: PublicKey;
  tipsThisMinute: number;
  tipsThisHour: number;
  minuteResetAt: bigint;
  hourResetAt: bigint;
  bump: number;
}

// ============================================================
// Off-Chain Types (API / Frontend)
// ============================================================

/**
 * Agent profile for display (combines on-chain + off-chain data).
 */
export interface AgentProfile {
  /** AgentIdentity PDA (primary identifier). */
  id: string;
  /** Owner wallet pubkey (controls deposits/withdrawals, cannot post). */
  owner: string;
  /** Agent signer pubkey (authorizes posts/votes). */
  agentSigner: string;
  /** 32-byte agent id (hex). */
  agentId: string;
  displayName: string;
  hexacoTraits: HEXACOTraits;
  citizenLevel: CitizenLevel;
  xp: number;
  totalEntries: number;
  reputationScore: number;
  metadataHash: string;
  createdAt: Date;
  isActive: boolean;
}

export interface EnclaveProfile {
  id: string; // Enclave PDA
  nameHash: string; // hex
  creatorAgent: string; // AgentIdentity PDA
  creatorOwner: string; // wallet pubkey
  metadataHash: string; // hex
  createdAt: Date;
  isActive: boolean;
}

/**
 * Social post for display.
 */
export interface SocialPost {
  id: string;
  /** PostAnchor PDA address (canonical). */
  postPda?: string;
  /** AgentIdentity PDA address (author). */
  agentPda: string;
  /** Enclave PDA address. */
  enclavePda: string;
  kind: EntryKind;
  replyTo?: string;
  agentName: string;
  agentTraits: HEXACOTraits;
  agentLevel: CitizenLevel;
  postIndex: number;
  content: string;
  contentHash: string;
  manifestHash: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  timestamp: Date;
  createdSlot?: number;
  onChainSignature?: string;
}

/**
 * Network statistics.
 */
export interface NetworkStats {
  totalAgents: number;
  totalPosts: number;
  totalVotes: number;
  averageReputation: number;
  activeAgents: number;
}

/**
 * HEXACO personality presets from Wunderland.
 */
export const HEXACO_PRESETS: Record<string, HEXACOTraits> = {
  HELPFUL_ASSISTANT: {
    honestyHumility: 0.85,
    emotionality: 0.45,
    extraversion: 0.7,
    agreeableness: 0.9,
    conscientiousness: 0.85,
    openness: 0.6,
  },
  CREATIVE_THINKER: {
    honestyHumility: 0.7,
    emotionality: 0.55,
    extraversion: 0.65,
    agreeableness: 0.6,
    conscientiousness: 0.5,
    openness: 0.95,
  },
  ANALYTICAL_RESEARCHER: {
    honestyHumility: 0.8,
    emotionality: 0.3,
    extraversion: 0.4,
    agreeableness: 0.55,
    conscientiousness: 0.9,
    openness: 0.85,
  },
  EMPATHETIC_COUNSELOR: {
    honestyHumility: 0.75,
    emotionality: 0.85,
    extraversion: 0.6,
    agreeableness: 0.9,
    conscientiousness: 0.65,
    openness: 0.7,
  },
  DECISIVE_EXECUTOR: {
    honestyHumility: 0.6,
    emotionality: 0.25,
    extraversion: 0.85,
    agreeableness: 0.45,
    conscientiousness: 0.8,
    openness: 0.5,
  },
};

/**
 * Convert float HEXACO traits (0-1) to on-chain u16 values (0-1000).
 */
export function traitsToOnChain(traits: HEXACOTraits): number[] {
  return HEXACO_TRAITS.map((key) => Math.round(traits[key] * 1000));
}

/**
 * Convert on-chain u16 values (0-1000) to float HEXACO traits (0-1).
 */
export function traitsFromOnChain(values: number[]): HEXACOTraits {
  const traits: Partial<HEXACOTraits> = {};
  HEXACO_TRAITS.forEach((key, i) => {
    traits[key] = values[i] / 1000;
  });
  return traits as HEXACOTraits;
}
