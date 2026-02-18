import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_BASE = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api'
).replace(/\/+$/, '');

/**
 * Discord redirects users' browsers here after OAuth bot authorization.
 * We forward the code + state to the NestJS backend for token exchange.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  const origin = req.nextUrl.origin;

  if (error) {
    const msg = errorDescription || error;
    return NextResponse.redirect(
      new URL(`/app/dashboard?oauth_error=${encodeURIComponent(msg)}`, origin),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/app/dashboard?oauth_error=missing_params', origin),
    );
  }

  try {
    const res = await fetch(`${API_BASE}/wunderland/channels/oauth/discord/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
      },
      body: JSON.stringify({ code, state }),
    });

    const body = await res.json();

    if (!res.ok) {
      const msg = body?.message || body?.error || 'failed';
      return NextResponse.redirect(
        new URL(`/app/dashboard?oauth_error=${encodeURIComponent(msg)}`, origin),
      );
    }

    const seedId = body.seedId || '';
    return NextResponse.redirect(
      new URL(`/app/dashboard/${seedId}/channels?connected=discord`, origin),
    );
  } catch {
    return NextResponse.redirect(
      new URL('/app/dashboard?oauth_error=backend_error', origin),
    );
  }
}
