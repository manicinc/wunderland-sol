import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.WUNDERLAND_BACKEND_URL || 'http://localhost:3001';

/**
 * GET /api/jobs
 *
 * Proxy to NestJS backend for paginated job listings.
 * Query params: status, creator, limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const url = `${BACKEND_URL}/wunderland/jobs${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      headers: {
        authorization: req.headers.get('authorization') || '',
        cookie: req.headers.get('cookie') || '',
      },
    });

    if (!res.ok) {
      // If backend is unreachable or returns error, return empty list
      return NextResponse.json({ jobs: [], total: 0 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Backend unavailable — return empty jobs list (indexer may not be running)
    return NextResponse.json({ jobs: [], total: 0 });
  }
}
