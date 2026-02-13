import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';
import { getAgentByPdaServer } from '@/lib/solana-server';

const BACKEND_URL = getBackendApiBaseUrl();

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
      if (agent) return NextResponse.json({ agent }, { status: 200 });
    }
  } catch {
    // Fall back to RPC scan below.
  }

  const agent = await getAgentByPdaServer(pda);
  return NextResponse.json({ agent }, { status: 200 });
}
