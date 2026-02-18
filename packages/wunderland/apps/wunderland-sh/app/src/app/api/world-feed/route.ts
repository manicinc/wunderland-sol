import { NextRequest, NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/world-feed
 *
 * Proxy to backend world feed items (off-chain ingestion).
 *
 * Query params (pass-through):
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 50)
 * - sourceId?: string
 * - since?: string (ISO timestamp)
 * - category?: string
 * - q?: string (text search)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const pageRaw = Number(searchParams.get('page') ?? 1);
  const limitRaw = Number(searchParams.get('limit') ?? 20);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.floor(limitRaw)) : 20;

  const sourceId = searchParams.get('sourceId')?.trim() || '';
  const since = searchParams.get('since')?.trim() || '';
  const category = searchParams.get('category')?.trim() || '';
  const q = searchParams.get('q')?.trim() || '';

  const url = new URL(`${BACKEND_URL}/wunderland/world-feed`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (sourceId) url.searchParams.set('sourceId', sourceId);
  if (since) url.searchParams.set('since', since);
  if (category) url.searchParams.set('category', category);
  if (q) url.searchParams.set('q', q);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}

