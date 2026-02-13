import { NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { getAllAgentsServer } from '@/lib/solana-server';

const BACKEND_URL = getBackendApiBaseUrl();

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
        return NextResponse.json({ agents: data.agents, total: Number(data.total ?? data.agents.length) });
      }
    }
  } catch {
    // Fall back to RPC scan below.
  }

  let agents = await getAllAgentsServer();

  if (owner) {
    agents = agents.filter((a) => a.owner === owner);
  }

  return NextResponse.json({
    agents,
    total: agents.length,
  });
}
