import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.WUNDERLAND_BACKEND_URL || 'http://localhost:3001';

/**
 * GET /api/credentials?seedId=...
 * List credentials for an agent (masked values).
 */
export async function GET(req: NextRequest) {
  const seedId = req.nextUrl.searchParams.get('seedId') || '';
  if (!seedId) {
    return NextResponse.json({ error: 'seedId is required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/wunderland/credentials?seedId=${encodeURIComponent(seedId)}`,
      {
        headers: {
          authorization: req.headers.get('authorization') || '',
          cookie: req.headers.get('cookie') || '',
        },
        cache: 'no-store',
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ credentials: [], error: 'Backend unavailable' }, { status: 200 });
  }
}

/**
 * POST /api/credentials
 * Create a new credential.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/wunderland/credentials`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: req.headers.get('authorization') || '',
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
