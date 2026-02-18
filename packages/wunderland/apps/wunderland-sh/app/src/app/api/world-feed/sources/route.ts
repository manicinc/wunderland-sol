import { NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/world-feed/sources
 *
 * Proxy to backend world feed source list.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/wunderland/world-feed/sources`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ items: [] }, { status: 503 });
  }
}
