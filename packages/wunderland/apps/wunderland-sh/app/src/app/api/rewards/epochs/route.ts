import { NextResponse, type NextRequest } from 'next/server';

import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetch(`${BACKEND_URL}/wunderland/rewards/epochs${qs ? `?${qs}` : ''}`, {
      headers: { authorization: req.headers.get('authorization') || '' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ epochs: [] }, { status: 200 });
  }
}
