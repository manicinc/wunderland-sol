import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { TRIAL_DAYS } from '@/config/pricing';

const API_BASE = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');

export const runtime = 'nodejs';

function normalizeStatus(status: string): string {
  const value = status.trim().toLowerCase();
  if (value === 'cancelled') return 'canceled';
  return value;
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const internalSecret = process.env.INTERNAL_API_SECRET || '';
  if (!internalSecret) {
    return NextResponse.json({ error: 'Internal API secret is not configured' }, { status: 503 });
  }

  // Authenticate: read the user's JWT from Authorization header
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // Validate the token by calling the backend
  let user: { id: string; email?: string };
  try {
    const res = await fetch(`${API_BASE}/auth`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const body = await res.json();
    user = {
      id: body.user?.sub ?? body.user?.id ?? body.id,
      email: body.user?.email ?? body.email,
    };
    if (!user.id || typeof user.id !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }

  const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: string };
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  // Retrieve checkout session + subscription status from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  const sessionUserId = session.metadata?.userId;
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Checkout session missing user metadata' }, { status: 400 });
  }
  if (String(sessionUserId) !== String(user.id)) {
    return NextResponse.json(
      { error: 'Not allowed to sync this checkout session' },
      { status: 403 }
    );
  }

  const planId = session.metadata?.planId ?? null;

  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);

  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription?.id ?? null);

  if (!stripeSubscriptionId) {
    return NextResponse.json({ error: 'Checkout session missing subscription' }, { status: 400 });
  }

  const subscription =
    typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  if (!subscription) {
    return NextResponse.json({ error: 'No subscription found on session' }, { status: 400 });
  }

  // Trial UX: default to cancel at period end so users are never auto-charged
  // unless they explicitly opt in to continue (via the Customer Portal).
  if (TRIAL_DAYS > 0 && subscription.status === 'trialing' && !subscription.cancel_at_period_end) {
    try {
      await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
    } catch (updateErr) {
      console.error(
        '[stripe sync] Failed to set cancel_at_period_end on trial subscription:',
        updateErr
      );
    }
  }

  const status = normalizeStatus(subscription.status);

  // Persist subscription status in backend DB
  const updateRes = await fetch(`${API_BASE}/billing/subscription-update`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': internalSecret,
    },
    body: JSON.stringify({
      userId: user.id,
      status,
      planId,
      stripeCustomerId,
      stripeSubscriptionId,
    }),
    cache: 'no-store',
  });

  if (!updateRes.ok) {
    const updateBody = await updateRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: updateBody?.message || updateBody?.error || 'Failed to update subscription' },
      { status: 502 }
    );
  }

  // Re-issue a JWT with fresh subscription claims
  const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const refreshBody = await refreshRes.json().catch(() => ({}));
  if (!refreshRes.ok || !refreshBody?.token) {
    return NextResponse.json(
      { error: refreshBody?.message || refreshBody?.error || 'Failed to refresh session' },
      { status: 502 }
    );
  }

  return NextResponse.json({ token: refreshBody.token, user: refreshBody.user ?? null });
}
