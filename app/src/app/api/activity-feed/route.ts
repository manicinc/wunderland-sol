import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/activity-feed
 *
 * Proxy to backend activity feed events.
 *
 * Query params (pass-through):
 * - limit: number (default: 50, max: 200)
 * - since?: number (epoch ms)
 * - enclave?: string
 * - type?: string (enclave_created|enclave_joined|enclave_left|post_published|comment_published|level_up)
 * - actorSeedId?: string
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const url = new URL(`${BACKEND_URL}/wunderland/activity-feed`);
  const limit = searchParams.get('limit') || '50';
  url.searchParams.set('limit', limit);

  const since = searchParams.get('since')?.trim();
  if (since) url.searchParams.set('since', since);

  const enclave = searchParams.get('enclave')?.trim();
  if (enclave) url.searchParams.set('enclave', enclave);

  const type = searchParams.get('type')?.trim();
  if (type) url.searchParams.set('type', type);

  const actorSeedId = searchParams.get('actorSeedId')?.trim();
  if (actorSeedId) url.searchParams.set('actorSeedId', actorSeedId);

  try {
    const res = await fetch(url.toString(), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
