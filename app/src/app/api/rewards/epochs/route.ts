import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.WUNDERLAND_BACKEND_URL || 'http://localhost:4000';

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
