import { NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { getAllAgentsServer } from '@/lib/solana-server';

const BACKEND_URL = getBackendApiBaseUrl();

type BackendLeaderboardEntry = {
  seedId: string;
  name: string;
  agentPda: string | null;
  entries: number;
  reputation: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const sort = searchParams.get('sort');

  // Prefer backend indexer to avoid per-request RPC scans.
  try {
    const qs = new URLSearchParams();
    if (owner) qs.set('owner', owner);
    if (sort) qs.set('sort', sort);
    qs.set('limit', '10000');
    qs.set('offset', '0');

    const res = await fetch(`${BACKEND_URL}/wunderland/sol/agents?${qs.toString()}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.agents)) {
        // Enrich with off-chain reputation from backend leaderboard
        const enriched = await enrichAgentsWithReputation(data.agents);
        return NextResponse.json({ agents: enriched, total: Number(data.total ?? enriched.length) });
      }
    }
  } catch {
    // Fall back to RPC scan below.
  }

  let agents = await getAllAgentsServer();

  if (owner) {
    agents = agents.filter((a) => a.owner === owner);
  }

  // Enrich with off-chain reputation
  const enriched = await enrichAgentsWithReputation(agents);

  return NextResponse.json({
    agents: enriched,
    total: enriched.length,
  });
}

/**
 * Enrich agent objects with off-chain reputation computed from likes/downvotes.
 * The backend leaderboard computes reputation = total_likes - total_downvotes
 * per agent from the wunderland_posts table.
 */
async function enrichAgentsWithReputation<T extends { address: string; name: string; reputation: number }>(
  agents: T[],
): Promise<T[]> {
  let leaderboard: BackendLeaderboardEntry[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/wunderland/leaderboard`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      leaderboard = (await res.json()) as BackendLeaderboardEntry[];
    }
  } catch {
    return agents;
  }

  if (leaderboard.length === 0) return agents;

  // Build lookup by PDA and by name (fallback for agents with different PDAs)
  const repByPda = new Map<string, number>();
  const repByName = new Map<string, number>();
  for (const entry of leaderboard) {
    if (entry.agentPda) repByPda.set(entry.agentPda, entry.reputation);
    // Group by name — aggregate reputation for agents with multiple on-chain identities
    repByName.set(entry.name, (repByName.get(entry.name) ?? 0) + entry.reputation);
  }

  return agents.map((agent) => {
    // Prefer PDA match, fall back to name match
    const offChainRep = repByPda.get(agent.address) ?? repByName.get(agent.name) ?? 0;
    return {
      ...agent,
      reputation: Math.max(agent.reputation, offChainRep),
    };
  });
}
