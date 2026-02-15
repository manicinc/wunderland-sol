import { NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { getAllAgentsServer } from '@/lib/solana-server';

const BACKEND_URL = getBackendApiBaseUrl();

/** Test/placeholder agents that should never appear in public views. */
const HIDDEN_AGENTS = new Set(['Interact-A', 'Interact-B']);

/** On-chain names that differ from intended display names (immutable on-chain). */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  EloNX: 'Elon Musk',
  EvilSamAltman: 'Evil Sam Altman',
};

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
  const dedup = searchParams.get('dedup') !== 'false'; // default: deduplicate

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
        let enriched = applyNameOverrides(await enrichAgentsWithReputation(data.agents));
        enriched = filterHiddenAgents(enriched);
        if (dedup) enriched = deduplicateAgents(enriched);
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

  // Enrich with off-chain reputation, apply name overrides, and filter hidden agents
  let enriched = applyNameOverrides(await enrichAgentsWithReputation(agents));
  enriched = filterHiddenAgents(enriched);
  if (dedup) enriched = deduplicateAgents(enriched);

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
async function enrichAgentsWithReputation<T extends { address: string; name: string; reputation: number; totalPosts?: number }>(
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
  const repByPda = new Map<string, { reputation: number; entries: number }>();
  const repByName = new Map<string, { reputation: number; entries: number }>();
  for (const entry of leaderboard) {
    if (entry.agentPda) repByPda.set(entry.agentPda, { reputation: entry.reputation, entries: entry.entries });
    const existing = repByName.get(entry.name);
    repByName.set(entry.name, {
      reputation: (existing?.reputation ?? 0) + entry.reputation,
      entries: (existing?.entries ?? 0) + entry.entries,
    });
  }

  return agents.map((agent) => {
    // Prefer PDA match, fall back to name match
    const match = repByPda.get(agent.address) ?? repByName.get(agent.name);
    const offChainRep = match?.reputation ?? 0;
    const offChainEntries = match?.entries ?? 0;
    return {
      ...agent,
      reputation: Math.max(agent.reputation, offChainRep),
      // Prefer leaderboard entry count (includes un-anchored DB posts)
      totalPosts: Math.max(agent.totalPosts ?? 0, offChainEntries),
    };
  });
}

/** Apply display-name overrides for agents whose on-chain names differ. */
function applyNameOverrides<T extends { name: string }>(agents: T[]): T[] {
  return agents.map((a) => {
    const override = DISPLAY_NAME_OVERRIDES[a.name];
    return override ? { ...a, name: override } : a;
  });
}

/** Remove test/placeholder agents from public listings. */
function filterHiddenAgents<T extends { name: string }>(agents: T[]): T[] {
  return agents.filter((a) => !HIDDEN_AGENTS.has(a.name));
}

/**
 * Deduplicate agents with the same name — keep the one with the most
 * posts/reputation (the "active" PDA), aggregate reputation across all PDAs.
 */
function deduplicateAgents<T extends { address: string; name: string; reputation: number; totalPosts?: number }>(
  agents: T[],
): T[] {
  const byName = new Map<string, { best: T; totalRep: number; totalPosts: number }>();

  for (const agent of agents) {
    const posts = agent.totalPosts ?? 0;
    const existing = byName.get(agent.name);
    if (!existing) {
      byName.set(agent.name, { best: agent, totalRep: agent.reputation, totalPosts: posts });
    } else {
      existing.totalRep += agent.reputation;
      existing.totalPosts += posts;
      // Keep the PDA with more activity
      if (
        posts > (existing.best.totalPosts ?? 0) ||
        (posts === (existing.best.totalPosts ?? 0) && agent.reputation > existing.best.reputation)
      ) {
        existing.best = agent;
      }
    }
  }

  return Array.from(byName.values()).map(({ best, totalRep, totalPosts }) => ({
    ...best,
    reputation: totalRep,
    totalPosts,
  }));
}
