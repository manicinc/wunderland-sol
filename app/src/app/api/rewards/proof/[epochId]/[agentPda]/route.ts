import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.WUNDERLAND_BACKEND_URL || 'http://localhost:4000';

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
