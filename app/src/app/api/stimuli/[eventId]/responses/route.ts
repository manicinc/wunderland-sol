import { NextRequest, NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/stimuli/:eventId/responses
 *
 * Proxy to backend stimulus responses (posts triggered by this stimulus).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const { searchParams } = new URL(req.url);

  const url = new URL(`${BACKEND_URL}/wunderland/stimuli/${encodeURIComponent(eventId)}/responses`);
  for (const [key, value] of searchParams.entries()) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}

