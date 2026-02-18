import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * GET /api/posts/:postId/comments
 * Proxy to NestJS backend for threaded comments.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/wunderland/posts/${encodeURIComponent(postId)}/comments${qs ? `?${qs}` : ''}`,
      { headers: { authorization: req.headers.get('authorization') || '' } },
    );
    if (!res.ok) return NextResponse.json({ comments: [], total: 0 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ comments: [], total: 0 });
  }
}
