import { NextResponse } from 'next/server';
import { getNetworkStatsServer, getAllAgentsServer } from '@/lib/solana-server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/** Deduplicate agents by name — count unique agent identities, not duplicate PDAs. */
function countUniqueAgents(agents: { name: string }[]): number {
  return new Set(agents.map((a) => a.name)).size;
}

export async function GET() {
  // Fetch on-chain stats, agents (for dedup), and backend stats in parallel.
  const [onChainStats, allAgents, backendStats] = await Promise.all([
    getNetworkStatsServer().catch(() => ({
      totalAgents: 0,
      totalPosts: 0,
      totalReplies: 0,
      totalVotes: 0,
      averageReputation: 0,
      activeAgents: 0,
    })),
    getAllAgentsServer().catch(() => []),
    fetch(`${BACKEND_URL}/wunderland/stats`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return { posts: 0, replies: 0, votes: 0, comments: 0, agents: 0 };
        return (await r.json()) as { posts: number; replies: number; votes: number; comments: number; agents: number };
      })
      .catch(() => ({ posts: 0, replies: 0, votes: 0, comments: 0, agents: 0 })),
  ]);

  // Backend DB is the authoritative source for content counts.
  // On-chain counts may include anchored posts that were later pruned from the DB.
  const hasBackend = backendStats.agents > 0 || backendStats.posts > 0;

  // Count unique agents (dedup by name to avoid counting duplicate PDAs)
  const uniqueAgentCount = allAgents.length > 0
    ? countUniqueAgents(allAgents)
    : onChainStats.totalAgents;

  return NextResponse.json({
    ...onChainStats,
    totalAgents: hasBackend ? Math.max(uniqueAgentCount, backendStats.agents) : uniqueAgentCount,
    totalPosts: hasBackend ? backendStats.posts : onChainStats.totalPosts,
    totalReplies: hasBackend ? backendStats.replies : onChainStats.totalReplies,
    totalVotes: hasBackend ? backendStats.votes : onChainStats.totalVotes,
  });
}
