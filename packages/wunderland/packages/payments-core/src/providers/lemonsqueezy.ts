import {
  CheckoutRequest,
  CheckoutResponse,
  PaymentProvider,
  ProviderCredentials,
  ProviderWebhookEvent,
} from '../types.js';

export class LemonSqueezyProvider implements PaymentProvider {
  readonly id = 'lemonsqueezy' as const;
  private fallbackKey = '';
  private fallbackStore = '';

  async init() {
    if (!process.env.LEMONSQUEEZY_API_KEY) throw new Error('LEMONSQUEEZY_API_KEY missing');
    if (!process.env.LEMONSQUEEZY_STORE_ID) throw new Error('LEMONSQUEEZY_STORE_ID missing');
    this.fallbackKey = process.env.LEMONSQUEEZY_API_KEY;
    this.fallbackStore = process.env.LEMONSQUEEZY_STORE_ID;
  }

  async createCheckout(
    req: CheckoutRequest,
    credentials: ProviderCredentials
  ): Promise<CheckoutResponse> {
    const variantId =
      credentials.variantId || process.env[`LEMONSQUEEZY_${req.plan.toUpperCase()}_VARIANT_ID`];
    if (!variantId) throw new Error(`variant not configured for plan ${req.plan}`);

    const apiKey = credentials.apiKey || this.fallbackKey;
    const storeId = credentials.storeId || this.fallbackStore;

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: { project: req.project, plan: req.plan, ...req.metadata },
            },
            redirect_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            product_options: { enabled_variants: [Number(variantId)] },
          },
          relationships: { store: { data: { type: 'stores', id: storeId } } },
        },
      }),
    });

    const json = (await res.json()) as any;
    return {
      checkoutUrl: json?.data?.attributes?.url ?? '',
      sessionId: json?.data?.id ?? 'unknown',
      provider: 'lemonsqueezy',
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: string
  ): Promise<ProviderWebhookEvent> {
    // Verify signature (HMAC) – simplified placeholder
    const event = JSON.parse(rawBody);
    return {
      sessionId: event.meta.checkout_id ?? 'unknown',
      type: 'checkout.completed',
      payload: event,
    };
  }
}
