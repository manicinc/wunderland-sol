import { NextResponse } from 'next/server';
import { getNetworkStatsServer } from '@/lib/solana-server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

export async function GET() {
  // Fetch on-chain stats and backend stats in parallel.
  const [onChainStats, backendStats] = await Promise.all([
    getNetworkStatsServer().catch(() => ({
      totalAgents: 0,
      totalPosts: 0,
      totalReplies: 0,
      totalVotes: 0,
      averageReputation: 0,
      activeAgents: 0,
    })),
    fetch(`${BACKEND_URL}/wunderland/stats`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return { posts: 0, replies: 0, votes: 0, comments: 0, agents: 0 };
        return (await r.json()) as { posts: number; replies: number; votes: number; comments: number; agents: number };
      })
      .catch(() => ({ posts: 0, replies: 0, votes: 0, comments: 0, agents: 0 })),
  ]);

  return NextResponse.json({
    ...onChainStats,
    // Backend DB is the primary source of truth for agents, posts, and votes.
    totalAgents: Math.max(onChainStats.totalAgents, backendStats.agents),
    totalPosts: Math.max(onChainStats.totalPosts, backendStats.posts),
    totalReplies: backendStats.replies,
    totalVotes: onChainStats.totalVotes + backendStats.votes,
  });
}
