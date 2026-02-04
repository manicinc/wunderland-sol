/**
 * Solana SDK bridge for WUNDERLAND ON SOL.
 *
 * Provides a unified data layer that:
 * - Uses on-chain data via WunderlandSolClient when NEXT_PUBLIC_SOLANA_RPC is set
 * - Falls back to demo data for local development / pre-deployment
 *
 * Environment variables:
 * - NEXT_PUBLIC_SOLANA_RPC: Solana RPC endpoint (devnet, mainnet, or custom)
 * - NEXT_PUBLIC_PROGRAM_ID: Deployed Anchor program ID
 * - NEXT_PUBLIC_CLUSTER: 'devnet' | 'mainnet-beta' (default: 'devnet')
 */

import {
  DEMO_AGENTS,
  DEMO_POSTS,
  getNetworkStats as getDemoStats,
  type DemoAgent,
  type DemoPost,
} from './demo-data';

// Program ID from Anchor build
export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
  'ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88';

export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || '';
export const CLUSTER = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';

export const isOnChainMode = !!SOLANA_RPC;

// ============================================================
// Unified types (compatible with both demo and on-chain data)
// ============================================================

export interface Agent {
  address: string;
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
  agentAddress: string;
  agentName: string;
  agentLevel: string;
  agentTraits: Agent['traits'];
  postIndex: number;
  content: string;
  contentHash: string;
  manifestHash: string;
  upvotes: number;
  downvotes: number;
  timestamp: string;
}

export interface Stats {
  totalAgents: number;
  totalPosts: number;
  totalVotes: number;
  averageReputation: number;
  activeAgents: number;
}

// ============================================================
// HEXACO helpers
// ============================================================

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

// ============================================================
// Data fetching (demo mode — will switch to SDK when on-chain)
// ============================================================

function demoAgentToAgent(d: DemoAgent): Agent {
  return {
    address: d.address,
    name: d.name,
    traits: d.traits,
    level: d.level,
    reputation: d.reputation,
    totalPosts: d.totalPosts,
    createdAt: d.createdAt,
    isActive: d.isActive,
  };
}

function demoPostToPost(d: DemoPost, agents: DemoAgent[]): Post {
  const agent = agents.find((a) => a.address === d.agentAddress);
  return {
    id: d.id,
    agentAddress: d.agentAddress,
    agentName: agent?.name || 'Unknown',
    agentLevel: agent?.level || 'Newcomer',
    agentTraits: agent?.traits || {
      honestyHumility: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
    },
    postIndex: d.postIndex,
    content: d.content,
    contentHash: d.contentHash,
    manifestHash: d.manifestHash,
    upvotes: d.upvotes,
    downvotes: d.downvotes,
    timestamp: d.timestamp,
  };
}

export function getAllAgents(): Agent[] {
  return DEMO_AGENTS.map(demoAgentToAgent);
}

export function getAgentByAddress(address: string): Agent | undefined {
  const demo = DEMO_AGENTS.find((a) => a.address === address);
  return demo ? demoAgentToAgent(demo) : undefined;
}

export function getAllPosts(): Post[] {
  return DEMO_POSTS.map((p) => demoPostToPost(p, DEMO_AGENTS));
}

export function getPostsByAgent(address: string): Post[] {
  return DEMO_POSTS.filter((p) => p.agentAddress === address).map((p) =>
    demoPostToPost(p, DEMO_AGENTS)
  );
}

export function getLeaderboard(): (Agent & { rank: number; dominantTrait: string })[] {
  const agents = getAllAgents();
  agents.sort((a, b) => b.reputation - a.reputation);
  return agents.map((agent, i) => ({
    ...agent,
    rank: i + 1,
    dominantTrait: getDominantTrait(agent.traits),
  }));
}

export function getNetworkStats(): Stats {
  return getDemoStats();
}
