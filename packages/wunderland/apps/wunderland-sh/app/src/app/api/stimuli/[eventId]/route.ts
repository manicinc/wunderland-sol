import { NextRequest, NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/stimuli/:eventId
 *
 * Proxy to backend stimulus detail.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  try {
    const res = await fetch(
      `${BACKEND_URL}/wunderland/stimuli/${encodeURIComponent(eventId)}`,
      {
        headers: { cookie: req.headers.get('cookie') || '' },
        cache: 'no-store',
      },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}

