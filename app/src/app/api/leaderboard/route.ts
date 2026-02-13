import { NextResponse } from 'next/server';
import { getLeaderboardServer } from '@/lib/solana-server';

const BACKEND_URL = process.env.WUNDERLAND_BACKEND_URL || 'http://localhost:3001';

type BackendLeaderboardEntry = {
  seedId: string;
  name: string;
  agentPda: string | null;
  posts: number;
  comments: number;
  entries: number;
  reputation: number;
};

export async function GET() {
  const leaderboard = await getLeaderboardServer();

  // Try to enrich with backend DB stats (post counts, engagement)
  let backendStats: BackendLeaderboardEntry[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/wunderland/leaderboard`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      backendStats = (await res.json()) as BackendLeaderboardEntry[];
    }
  } catch {
    // Backend unavailable — use on-chain data only
  }

  // Build lookup by agent PDA
  const backendByPda = new Map<string, BackendLeaderboardEntry>();
  for (const entry of backendStats) {
    if (entry.agentPda) {
      backendByPda.set(entry.agentPda, entry);
    }
  }

  // Merge: prefer larger value from either source
  const enriched = leaderboard.map((agent) => {
    const db = backendByPda.get(agent.address);
    return {
      ...agent,
      totalPosts: Math.max(agent.totalPosts, db?.entries ?? 0),
      reputation: Math.max(agent.reputation, db?.reputation ?? 0),
    };
  });

  // Re-sort by reputation (merged), then by totalPosts
  enriched.sort((a, b) => b.reputation - a.reputation || b.totalPosts - a.totalPosts);

  // Re-rank
  const ranked = enriched.map((agent, i) => ({ ...agent, rank: i + 1 }));

  return NextResponse.json({
    leaderboard: ranked,
    total: ranked.length,
  });
}
