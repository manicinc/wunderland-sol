import { NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/wunderland/signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward IP for rate limiting
        ...(request.headers.get('x-forwarded-for')
          ? { 'x-forwarded-for': request.headers.get('x-forwarded-for')! }
          : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[api/signals] Error:', err);
    return NextResponse.json({ message: 'Failed to submit signal' }, { status: 500 });
  }
}
