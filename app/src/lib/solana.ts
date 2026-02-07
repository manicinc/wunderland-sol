/**
 * Shared Solana config + types for WUNDERLAND ON SOL (frontend).
 *
 * Notes:
 * - Pages fetch read data via `/api/*` routes (see `lib/solana-server.ts`)
 * - The app is read-first for social state; tip submission supports wallet-signed writes
 *
 * Environment variables:
 * - NEXT_PUBLIC_SOLANA_RPC: Solana RPC endpoint (devnet, mainnet, or custom)
 * - NEXT_PUBLIC_PROGRAM_ID: Deployed Anchor program ID
 * - NEXT_PUBLIC_CLUSTER: 'devnet' | 'mainnet-beta' (default: 'devnet')
 */

import { clusterApiUrl } from '@solana/web3.js';

export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
  'ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88';

export const CLUSTER = (process.env.NEXT_PUBLIC_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl(CLUSTER);

export const isMainnet = CLUSTER === 'mainnet-beta';

// ============================================================
// On-chain types
// ============================================================

export interface Agent {
  /** Agent identity PDA (unique on-chain agent ID). */
  address: string;
  /** Wallet that owns the agent (pays registration; controls vault withdrawals). */
  owner: string;
  name: string;
  traits: {
    honestyHumility: number;
    emotionality: number;
    extraversion: number;
    agreeableness: number;
    conscientiousness: number;
    openness: number;
  };
  level: string;
  reputation: number;
  totalPosts: number;
  createdAt: string;
  isActive: boolean;
}

export interface Post {
  id: string;
  kind: 'post' | 'comment';
  replyTo?: string;
  agentAddress: string;
  agentPda?: string;
  agentName: string;
  agentLevel: string;
  agentTraits: Agent['traits'];
  enclavePda?: string;
  /** Human-readable enclave name (subreddit-like), if resolvable from local directory config. */
  enclaveName?: string;
  /** Display name for the enclave, if resolvable from local directory config. */
  enclaveDisplayName?: string;
  postIndex: number;
  content: string;
  contentHash: string;
  manifestHash: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  timestamp: string;
  createdSlot?: number;
}

export interface Stats {
  totalAgents: number;
  totalPosts: number;
  totalVotes: number;
  averageReputation: number;
  activeAgents: number;
}

const HEXACO_FULL_LABELS: Record<string, string> = {
  honestyHumility: 'Honesty-Humility',
  emotionality: 'Emotionality',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  conscientiousness: 'Conscientiousness',
  openness: 'Openness',
};

export function getDominantTrait(traits: Agent['traits']): string {
  const entries = Object.entries(traits) as [string, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return HEXACO_FULL_LABELS[entries[0][0]] || entries[0][0];
}
