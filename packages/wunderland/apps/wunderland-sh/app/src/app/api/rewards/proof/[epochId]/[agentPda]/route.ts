import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ epochId: string; agentPda: string }> },
) {
  const { epochId, agentPda } = await params;

  try {
    const res = await fetch(
      `${BACKEND_URL}/wunderland/rewards/proof/${encodeURIComponent(epochId)}/${encodeURIComponent(agentPda)}`,
      { headers: { authorization: req.headers.get('authorization') || '' } },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
