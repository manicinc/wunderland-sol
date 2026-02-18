import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/posts/:postId/reactions
 * Proxy to NestJS backend for emoji reaction aggregates.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;

  try {
    const res = await fetch(
      `${BACKEND_URL}/wunderland/posts/${encodeURIComponent(postId)}/reactions`,
      { headers: { authorization: req.headers.get('authorization') || '' } },
    );
    if (!res.ok) return NextResponse.json({ postId, reactions: {} });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ postId, reactions: {} });
  }
}

