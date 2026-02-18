/**
 * Common payment types.
 */
export interface CheckoutRequest {
  project: string;
  plan: string;
  /** ISO-3166 alpha-2 country code of the customer (optional). */
  country?: string;
  /** Additional metadata forwarded to provider checkout. */
  metadata?: Record<string, string>;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  /** Internal session ID used to correlate webhook events. */
  sessionId: string;
  provider: 'stripe' | 'lemonsqueezy';
}

export interface ProviderCredentials {
  [key: string]: string;
}

export interface PaymentProvider {
  /** Provider slug, e.g. "stripe". */
  readonly id: string;
  /** One-time setup using env vars / secret manager. */
  init(): Promise<void>;
  /** Create a hosted checkout and return redirect URL. */
  createCheckout(
    request: CheckoutRequest,
    credentials: ProviderCredentials
  ): Promise<CheckoutResponse>;
  /** Verify webhook signature and return parsed payload. */
  verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<ProviderWebhookEvent>;
}

export interface ProviderWebhookEvent {
  sessionId: string;
  type: 'checkout.completed' | 'subscription.updated' | 'subscription.deleted' | 'payment.failed';
  payload: unknown;
}
