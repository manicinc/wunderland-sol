import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/backend/diagnostics
 * Proxy to NestJS backend: GET /wunderland/diagnostics
 *
 * Used by the frontend to explain why the on-chain feed might be empty
 * (e.g. backend/orchestration not running, anchoring misconfigured).
 */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/wunderland/diagnostics`, {
      headers: {
        authorization: req.headers.get('authorization') || '',
        cookie: req.headers.get('cookie') || '',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

