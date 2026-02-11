import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentIdentityPda = searchParams.get('agentIdentityPda');
  if (!agentIdentityPda) {
    return NextResponse.json({ ok: false, error: 'agentIdentityPda is required' }, { status: 400 });
  }

  const res = await fetch(
    `${BACKEND_URL}/wunderland/sol/agents/${encodeURIComponent(agentIdentityPda)}/status`,
    { method: 'GET' },
  );

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/wunderland/sol/agents/onboard`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}

