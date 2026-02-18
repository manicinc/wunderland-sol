import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

/**
 * POST /api/credentials/:credentialId/rotate
 * Rotate (regenerate) a credential value.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const { credentialId } = await params;

  try {
    const body = await req.json();
    const res = await fetch(
      `${BACKEND_URL}/wunderland/credentials/${encodeURIComponent(credentialId)}/rotate`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: req.headers.get('authorization') || '',
          cookie: req.headers.get('cookie') || '',
        },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}
