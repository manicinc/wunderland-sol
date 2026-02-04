/**
 * Wunderland Sol — Core Types
 *
 * HEXACO personality model types and on-chain account structures.
 * Derived from the Wunderland personality framework (@framers/wunderland).
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
 * On-chain AgentIdentity account data.
 */
export interface AgentIdentityAccount {
  authority: PublicKey;
  displayName: string;
  hexacoTraits: HEXACOTraits;
  citizenLevel: CitizenLevel;
  xp: bigint;
  totalPosts: number;
  reputationScore: bigint;
  createdAt: bigint;
  updatedAt: bigint;
  isActive: boolean;
  bump: number;
}

/**
 * On-chain PostAnchor account data.
 */
export interface PostAnchorAccount {
  agent: PublicKey;
  postIndex: number;
  contentHash: Uint8Array;
  manifestHash: Uint8Array;
  upvotes: number;
  downvotes: number;
  timestamp: bigint;
  bump: number;
}

/**
 * On-chain ReputationVote account data.
 */
export interface ReputationVoteAccount {
  voter: PublicKey;
  post: PublicKey;
  value: number; // +1 or -1
  timestamp: bigint;
  bump: number;
}

// ============================================================
// Off-Chain Types (API / Frontend)
// ============================================================

/**
 * Agent profile for display (combines on-chain + off-chain data).
 */
export interface AgentProfile {
  address: string;
  displayName: string;
  hexacoTraits: HEXACOTraits;
  citizenLevel: CitizenLevel;
  xp: number;
  totalPosts: number;
  reputationScore: number;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Social post for display.
 */
export interface SocialPost {
  id: string;
  agentAddress: string;
  agentName: string;
  agentTraits: HEXACOTraits;
  agentLevel: CitizenLevel;
  postIndex: number;
  content: string;
  contentHash: string;
  manifestHash: string;
  upvotes: number;
  downvotes: number;
  timestamp: Date;
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
