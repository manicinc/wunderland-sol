import Stripe from 'stripe';
import {
  CheckoutRequest,
  CheckoutResponse,
  PaymentProvider,
  ProviderCredentials,
  ProviderWebhookEvent,
} from '../types.js';

export class StripeProvider implements PaymentProvider {
  readonly id = 'stripe' as const;
  private stripe!: Stripe;
  private fallbackKey = '';

  async init() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not set');
    this.fallbackKey = key;
    this.stripe = new Stripe(key, { apiVersion: '2025-10-29.clover' });
  }

  async createCheckout(
    req: CheckoutRequest,
    credentials: ProviderCredentials
  ): Promise<CheckoutResponse> {
    const secretKey = credentials.secretKey || this.fallbackKey;
    const client =
      secretKey === this.fallbackKey
        ? this.stripe
        : new Stripe(secretKey, { apiVersion: '2025-10-29.clover' });
    const priceId = credentials.priceId || process.env[`STRIPE_${req.plan.toUpperCase()}_PRICE_ID`];
    if (!priceId) throw new Error(`price not configured for plan ${req.plan}`);

    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { project: req.project, plan: req.plan, ...req.metadata },
      customer_email: credentials.testEmail,
    });
    return {
      checkoutUrl: session.url || '',
      sessionId: session.id,
      provider: 'stripe',
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: string
  ): Promise<ProviderWebhookEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET missing');

    const sig = headers['stripe-signature'];
    if (!sig) throw new Error('missing stripe signature header');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err) {
      throw new Error('invalid stripe webhook');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        return {
          sessionId: (event.data.object as Stripe.Checkout.Session).id,
          type: 'checkout.completed',
          payload: event.data.object,
        };
      case 'customer.subscription.updated':
        return {
          sessionId: (event.data.object as Stripe.Subscription).id,
          type: 'subscription.updated',
          payload: event.data.object,
        };
      case 'customer.subscription.deleted':
        return {
          sessionId: (event.data.object as Stripe.Subscription).id,
          type: 'subscription.deleted',
          payload: event.data.object,
        };
      default:
        return {
          sessionId: 'unknown',
          type: 'payment.failed',
          payload: event,
        };
    }
  }
}
