import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS } from '@/lib/stripe';
import { TRIAL_DAYS } from '@/config/pricing';

const API_BASE = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');

function canonicalOrigin(fallback: string) {
  const envBase = process.env.RABBITHOLE_SITE_URL || process.env.AUTH_URL;
  if (!envBase) return fallback;
  return envBase.replace(/\/+$/, '');
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  // Authenticate: read the user's JWT from Authorization header
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // Validate the token by calling the backend
  let user: { id: string; email: string };
  try {
    const res = await fetch(`${API_BASE}/auth`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const body = await res.json();
    user = { id: body.user?.id ?? body.id, email: body.user?.email ?? body.email };
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }

  // Parse request body
  const { planId } = (await req.json()) as { planId?: string };
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan || !plan.priceId) {
    return NextResponse.json({ error: 'Invalid plan or plan not configured' }, { status: 400 });
  }

  // Create or retrieve Stripe customer
  const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
  const customer =
    existingCustomers.data[0] ??
    (await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    }));

  // Create Checkout Session
  const origin = canonicalOrigin(req.nextUrl.origin);
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    // Collect a card up front for the trial to reduce abuse. We auto-cancel at trial end
    // (see webhook/sync) so users are not surprised by an automatic charge.
    payment_method_collection: 'always',
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    metadata: { userId: user.id, planId: plan.id },
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      trial_settings: {
        end_behavior: {
          // If there is no payment method on file when the trial ends, cancel automatically.
          missing_payment_method: 'cancel',
        },
      },
      metadata: { userId: user.id, planId: plan.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
