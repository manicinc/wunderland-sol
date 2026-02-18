import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const API_BASE = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');

export async function POST(request: NextRequest) {
  const session = await auth();
  const user = session?.user;
  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'No OAuth session available.' }, { status: 401 });
  }

  const incomingBody = await request.json().catch(() => ({} as { rememberMe?: boolean }));
  const rememberMe = Boolean(incomingBody?.rememberMe);

  const payload = {
    email,
    name: user?.name ?? undefined,
    provider: (session as any)?.provider ?? undefined,
    providerAccountId: (session as any)?.providerAccountId ?? undefined,
    rememberMe,
  };

  const backendRes = await fetch(`${API_BASE}/auth/oauth/bridge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': request.headers.get('user-agent') || 'rabbithole-oauth-bridge',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const backendBody = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok) {
    return NextResponse.json(
      { error: backendBody?.message || 'OAuth bridge authentication failed.' },
      { status: backendRes.status }
    );
  }

  if (!backendBody?.token) {
    return NextResponse.json(
      { error: 'Backend did not return a session token.' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    token: backendBody.token,
    user: backendBody.user ?? null,
  });
}
