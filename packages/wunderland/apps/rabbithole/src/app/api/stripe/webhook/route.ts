import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPlanByPriceId, PLANS } from '@/lib/stripe';
import { getEmailService } from '@/lib/email';
import { TRIAL_DAYS } from '@/config/pricing';

const API_BASE = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Tell Next.js not to parse the body (Stripe needs the raw body for signature verification)
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[stripe webhook] Signature error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Handle relevant events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const stripeSubscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription?.id ?? null);

      // Trial UX: if a free trial is enabled, default subscriptions to cancel at period end
      // so users are never surprised by an automatic charge. Users can opt-in to continue
      // (via Stripe Customer Portal) by re-enabling renewal.
      if (TRIAL_DAYS > 0 && stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
        } catch (updateErr) {
          console.error(
            '[stripe webhook] Failed to set cancel_at_period_end on trial subscription:',
            updateErr
          );
        }
      }

      if (userId && planId) {
        await updateBackendSubscription(userId, {
          status: TRIAL_DAYS > 0 ? 'trialing' : 'active',
          planId,
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: stripeSubscriptionId,
        });
      }

      // Send subscription activated email
      const customerEmail = session.customer_details?.email || session.customer_email;
      if (customerEmail && planId) {
        try {
          const emailService = getEmailService();
          const planName = PLANS.find((p) => p.id === planId)?.name ?? planId;
          await emailService.sendSubscriptionActivatedEmail(customerEmail, planName);
        } catch (emailErr) {
          console.error('[stripe webhook] Failed to send activation email:', emailErr);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) {
        const status =
          sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'canceled';
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = priceId ? getPlanByPriceId(priceId) : null;

        await updateBackendSubscription(userId, {
          status,
          planId: plan?.id ?? sub.metadata?.planId ?? null,
          stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : null,
          stripeSubscriptionId: sub.id,
        });
      }

      // Email notifications for trial reminders and plan changes
      const subCustomerId = typeof sub.customer === 'string' ? sub.customer : null;
      if (stripe && subCustomerId) {
        const customer = await stripe.customers.retrieve(subCustomerId).catch(() => null);
        const customerEmail =
          customer && !customer.deleted && (customer as any).email ? (customer as any).email : null;

        // Trial ending soon (24h reminder)
        if (
          customerEmail &&
          sub.status === 'trialing' &&
          sub.trial_end &&
          sub.cancel_at_period_end === false &&
          sub.metadata?.trial_reminder_sent !== 'true'
        ) {
          const hoursRemaining = (sub.trial_end * 1000 - Date.now()) / (1000 * 60 * 60);
          if (hoursRemaining <= 24) {
            try {
              const emailService = getEmailService();
              const planName =
                (sub.items?.data?.[0]?.price?.id
                  ? getPlanByPriceId(sub.items.data[0].price.id)?.name
                  : null) ?? sub.metadata?.planId ?? 'your plan';
              await emailService.sendTrialEndingEmail(customerEmail, planName, hoursRemaining);
              // mark metadata to avoid duplicate reminders
              const metadata = { ...(sub.metadata || {}), trial_reminder_sent: 'true' };
              await stripe.subscriptions.update(sub.id, { metadata }).catch(() => null);
            } catch (emailErr) {
              console.error('[stripe webhook] Failed to send trial ending email:', emailErr);
            }
          }
        }

        // Plan change (upgrade/downgrade)
        const currentPriceId = sub.items?.data?.[0]?.price?.id ?? null;
        const previousPriceId =
          (event.data.previous_attributes as any)?.items?.data?.[0]?.price?.id ??
          (event.data.previous_attributes as any)?.items?.data?.[0]?.price ??
          (event.data.previous_attributes as any)?.plan?.id ??
          null;
        if (customerEmail && currentPriceId && previousPriceId && previousPriceId !== currentPriceId) {
          try {
            const emailService = getEmailService();
            const newPlan = getPlanByPriceId(currentPriceId);
            const oldPlan = getPlanByPriceId(previousPriceId);
            await emailService.sendPlanChangedEmail(customerEmail, oldPlan?.name ?? 'previous plan', newPlan?.name ?? 'new plan');
          } catch (emailErr) {
            console.error('[stripe webhook] Failed to send plan changed email:', emailErr);
          }
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) {
        await updateBackendSubscription(userId, {
          status: 'canceled',
          planId: null,
          stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : null,
          stripeSubscriptionId: sub.id,
        });
      }

      // Send cancellation email
      const subCustomerId = typeof sub.customer === 'string' ? sub.customer : null;
      if (stripe && subCustomerId) {
        try {
          const customer = await stripe.customers.retrieve(subCustomerId);
          if (customer && !customer.deleted && customer.email) {
            const priceId = sub.items?.data?.[0]?.price?.id;
            const plan = priceId ? getPlanByPriceId(priceId) : null;
            const emailService = getEmailService();
            await emailService.sendSubscriptionCancelledEmail(
              customer.email,
              plan?.name ?? sub.metadata?.planId ?? 'your plan'
            );
          }
        } catch (emailErr) {
          console.error('[stripe webhook] Failed to send cancellation email:', emailErr);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// Call the backend to update subscription status
async function updateBackendSubscription(
  userId: string,
  data: {
    status: string;
    planId: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }
) {
  try {
    const internalSecret = process.env.INTERNAL_API_SECRET || '';
    if (!internalSecret) {
      console.warn(
        '[stripe webhook] INTERNAL_API_SECRET not set — backend subscription updates are disabled.'
      );
    }
    await fetch(`${API_BASE}/billing/subscription-update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': internalSecret,
      },
      body: JSON.stringify({ userId, ...data }),
    });
  } catch (err) {
    console.error('[stripe webhook] Failed to update backend subscription:', err);
  }
}
