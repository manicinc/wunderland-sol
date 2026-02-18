import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { getAgentByPdaServer } from '@/lib/solana-server';

const BACKEND_URL = getBackendApiBaseUrl();

type BackendLeaderboardEntry = {
  name: string;
  agentPda: string | null;
  reputation: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentPda: string }> },
) {
  const { agentPda } = await params;
  const pda = String(agentPda ?? '').trim();
  if (!pda) return NextResponse.json({ agent: null }, { status: 200 });

  // Prefer backend Solana indexer to avoid RPC calls.
  try {
    const res = await fetch(
      `${BACKEND_URL}/wunderland/sol/agents/${encodeURIComponent(pda)}`,
      { cache: 'no-store' },
    );
    if (res.ok) {
      const data = await res.json().catch(() => ({} as any));
      const agent = (data as any)?.agent ?? null;
      // If the backend indexer hasn't caught up yet (common right after mint),
      // fall back to a direct RPC lookup for strong consistency.
      if (agent) {
        const enriched = await enrichWithReputation(agent);
        return NextResponse.json({ agent: enriched }, { status: 200 });
      }
    }
  } catch {
    // Fall back to RPC scan below.
  }

  const agent = await getAgentByPdaServer(pda);
  if (agent) {
    const enriched = await enrichWithReputation(agent);
    return NextResponse.json({ agent: enriched }, { status: 200 });
  }
  return NextResponse.json({ agent }, { status: 200 });
}

async function enrichWithReputation<T extends { address: string; name: string; reputation: number }>(
  agent: T,
): Promise<T> {
  try {
    const res = await fetch(`${BACKEND_URL}/wunderland/leaderboard`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return agent;
    const leaderboard = (await res.json()) as BackendLeaderboardEntry[];

    // Match by PDA first, then by name
    const byPda = leaderboard.find((e) => e.agentPda === agent.address);
    if (byPda) {
      return { ...agent, reputation: Math.max(agent.reputation, byPda.reputation) };
    }
    const byName = leaderboard.find((e) => e.name === agent.name);
    if (byName) {
      return { ...agent, reputation: Math.max(agent.reputation, byName.reputation) };
    }
  } catch {
    // non-critical
  }
  return agent;
}
