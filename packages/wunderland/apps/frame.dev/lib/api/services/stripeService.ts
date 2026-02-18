/**
 * Stripe Service
 *
 * Handles Stripe integration for Quarry subscriptions and lifetime purchases.
 *
 * Products:
 * - Quarry Premium Monthly: Subscription for unlimited devices
 * - Quarry Premium Annual: Subscription (discounted)
 * - Quarry Lifetime: One-time purchase, generates license key
 *
 * @module lib/api/services/stripeService
 */

import Stripe from 'stripe'
import { Pool } from 'pg'
import { getLicenseService } from './licenseService'

// ============================================================================
// TYPES
// ============================================================================

export interface CheckoutSessionResult {
  sessionId: string
  url: string
}

export interface SubscriptionInfo {
  id: string
  status: Stripe.Subscription.Status
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  plan: 'monthly' | 'annual'
}

export type PurchaseType = 'monthly' | 'annual' | 'lifetime'

// ============================================================================
// CONSTANTS
// ============================================================================

// Price IDs from Stripe dashboard (set in environment variables)
// Quarry Pro: prod_TjRWbCphp957L4
const STRIPE_PRICES = {
  monthly: process.env.STRIPE_QUARRY_PRO_MONTHLY || process.env.STRIPE_PRICE_MONTHLY || 'price_monthly',
  annual: process.env.STRIPE_QUARRY_PRO_ANNUAL || process.env.STRIPE_PRICE_ANNUAL || 'price_annual',
  lifetime: process.env.STRIPE_QUARRY_PRO_LIFETIME || process.env.STRIPE_PRICE_LIFETIME || 'price_lifetime',
}

// ============================================================================
// STRIPE SERVICE
// ============================================================================

export class StripeService {
  private stripe: Stripe
  private pool: Pool

  constructor(secretKey: string, connectionString: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    })

    this.pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
    })
  }

  // ==========================================================================
  // CHECKOUT
  // ==========================================================================

  /**
   * Create a Stripe Checkout session for subscription or lifetime purchase.
   */
  async createCheckoutSession(
    accountId: string,
    purchaseType: PurchaseType,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSessionResult> {
    // Get account email
    const accountResult = await this.pool.query<{ email: string; stripe_customer_id: string | null }>(
      `SELECT email, stripe_customer_id FROM sync_accounts WHERE id = $1`,
      [accountId]
    )

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found')
    }

    const { email, stripe_customer_id } = accountResult.rows[0]

    // Get or create Stripe customer
    let customerId = stripe_customer_id
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { accountId },
      })
      customerId = customer.id

      // Store customer ID
      await this.pool.query(
        `UPDATE sync_accounts SET stripe_customer_id = $1 WHERE id = $2`,
        [customerId, accountId]
      )
    }

    // Determine mode and price
    const isSubscription = purchaseType !== 'lifetime'
    const priceId = STRIPE_PRICES[purchaseType]

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        accountId,
        purchaseType,
      },
      // For subscriptions, allow customer to manage billing
      ...(isSubscription && {
        subscription_data: {
          metadata: { accountId },
        },
      }),
    })

    return {
      sessionId: session.id,
      url: session.url!,
    }
  }

  /**
   * Create a billing portal session for subscription management.
   */
  async createBillingPortalSession(
    accountId: string,
    returnUrl: string
  ): Promise<string> {
    const accountResult = await this.pool.query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id FROM sync_accounts WHERE id = $1`,
      [accountId]
    )

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found')
    }

    const customerId = accountResult.rows[0].stripe_customer_id
    if (!customerId) {
      throw new Error('No Stripe customer found for this account')
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session.url
  }

  // ==========================================================================
  // WEBHOOKS
  // ==========================================================================

  /**
   * Construct and verify webhook event.
   */
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  }

  /**
   * Handle Stripe webhook events.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        // Subscription renewed successfully - already handled by subscription.updated
        break

      case 'invoice.payment_failed':
        // Payment failed - Stripe will retry, no action needed
        break

      default:
        // Ignore other events
        break
    }
  }

  /**
   * Handle completed checkout session.
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const accountId = session.metadata?.accountId
    const purchaseType = session.metadata?.purchaseType as PurchaseType | undefined

    if (!accountId) {
      console.error('Checkout session missing accountId metadata:', session.id)
      return
    }

    if (purchaseType === 'lifetime') {
      // Generate license key for lifetime purchase
      const licenseService = getLicenseService()
      const email = session.customer_details?.email || ''

      await licenseService.createLicense(
        email,
        session.payment_intent as string
      )

      // Note: Key is emailed to user via separate email service
      // For now, the license can be retrieved from the database
      // and sent via email integration

      // Auto-activate if we have the accountId
      const normalizedKey = await this.getLatestLicenseKey(email)
      if (normalizedKey) {
        await licenseService.activateLicense(normalizedKey, accountId)
      }
    }
    // Subscriptions are handled by subscription.created event
  }

  /**
   * Handle subscription created/updated.
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const accountId = subscription.metadata?.accountId
    if (!accountId) {
      // Try to find account by customer ID
      const customerResult = await this.pool.query<{ id: string }>(
        `SELECT id FROM sync_accounts WHERE stripe_customer_id = $1`,
        [subscription.customer as string]
      )

      if (customerResult.rows.length === 0) {
        console.error('No account found for subscription:', subscription.id)
        return
      }

      await this.updateAccountFromSubscription(customerResult.rows[0].id, subscription)
    } else {
      await this.updateAccountFromSubscription(accountId, subscription)
    }
  }

  /**
   * Handle subscription canceled.
   */
  private async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    // Find account by customer ID
    const customerResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM sync_accounts WHERE stripe_customer_id = $1`,
      [subscription.customer as string]
    )

    if (customerResult.rows.length === 0) {
      console.error('No account found for canceled subscription:', subscription.id)
      return
    }

    const accountId = customerResult.rows[0].id

    // Check if account has a lifetime license
    const licenseResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM license_keys
       WHERE account_id = $1 AND revoked_at IS NULL AND activated_at IS NOT NULL`,
      [accountId]
    )

    if (parseInt(licenseResult.rows[0].count) > 0) {
      // Has lifetime license - keep premium
      return
    }

    // Downgrade to free
    await this.pool.query(
      `UPDATE sync_accounts
       SET tier = 'free', device_limit = 3, premium_expires_at = NULL
       WHERE id = $1`,
      [accountId]
    )
  }

  /**
   * Update account based on subscription status.
   */
  private async updateAccountFromSubscription(
    accountId: string,
    subscription: Stripe.Subscription
  ): Promise<void> {
    const isActive = subscription.status === 'active' || subscription.status === 'trialing'
    const expiresAt = new Date(subscription.current_period_end * 1000)

    if (isActive) {
      await this.pool.query(
        `UPDATE sync_accounts
         SET tier = 'premium', device_limit = NULL, premium_expires_at = $2
         WHERE id = $1`,
        [accountId, expiresAt]
      )
    } else {
      // Check for lifetime license before downgrading
      const licenseResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM license_keys
         WHERE account_id = $1 AND revoked_at IS NULL AND activated_at IS NOT NULL`,
        [accountId]
      )

      if (parseInt(licenseResult.rows[0].count) === 0) {
        await this.pool.query(
          `UPDATE sync_accounts
           SET tier = 'free', device_limit = 3, premium_expires_at = NULL
           WHERE id = $1`,
          [accountId]
        )
      }
    }
  }

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  /**
   * Get subscription info for an account.
   */
  async getSubscription(accountId: string): Promise<SubscriptionInfo | null> {
    const accountResult = await this.pool.query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id FROM sync_accounts WHERE id = $1`,
      [accountId]
    )

    if (accountResult.rows.length === 0 || !accountResult.rows[0].stripe_customer_id) {
      return null
    }

    const customerId = accountResult.rows[0].stripe_customer_id

    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      return null
    }

    const sub = subscriptions.data[0]
    const priceId = sub.items.data[0]?.price.id

    return {
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      plan: priceId === STRIPE_PRICES.annual ? 'annual' : 'monthly',
    }
  }

  /**
   * Cancel subscription at period end.
   */
  async cancelSubscription(accountId: string): Promise<void> {
    const subscription = await this.getSubscription(accountId)
    if (!subscription) {
      throw new Error('No active subscription found')
    }

    await this.stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    })
  }

  /**
   * Reactivate canceled subscription.
   */
  async reactivateSubscription(accountId: string): Promise<void> {
    const subscription = await this.getSubscription(accountId)
    if (!subscription) {
      throw new Error('No subscription found')
    }

    await this.stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    })
  }

  // ==========================================================================
  // CHECKOUT COMPLETION
  // ==========================================================================

  /**
   * Complete a checkout session and return the license key.
   * This is called from the success page to display the key.
   */
  async completeCheckout(sessionId: string): Promise<{
    success: boolean
    licenseKey?: string
    email?: string
    purchaseType?: string
    error?: string
  }> {
    try {
      // Retrieve the session
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'line_items'],
      })

      // Verify session is complete
      if (session.status !== 'complete') {
        return { success: false, error: 'Payment not completed' }
      }

      const purchaseType = session.metadata?.purchaseType as PurchaseType | undefined
      const email = session.customer_details?.email || ''

      // For lifetime purchases, generate and return the license key
      if (purchaseType === 'lifetime') {
        // Check if we already generated a key for this session
        const existingKey = await this.getSessionLicenseKey(sessionId)
        if (existingKey) {
          return {
            success: true,
            licenseKey: existingKey,
            email,
            purchaseType,
          }
        }

        // Generate new license key
        const licenseService = getLicenseService()
        const result = await licenseService.createLicense(
          email,
          session.payment_intent as string
        )

        // Store the mapping (session -> key) temporarily for repeat calls
        await this.storeSessionLicenseKey(sessionId, result.licenseKey)

        return {
          success: true,
          licenseKey: result.licenseKey,
          email,
          purchaseType,
        }
      }

      // For subscriptions, we don't have a license key to display
      return {
        success: true,
        email,
        purchaseType,
      }
    } catch (error) {
      console.error('Checkout completion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete checkout',
      }
    }
  }

  /**
   * Store session -> license key mapping for repeat calls.
   * Keys are stored in a temporary table and expire after 24 hours.
   */
  private async storeSessionLicenseKey(sessionId: string, licenseKey: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO checkout_sessions (session_id, license_key, created_at, expires_at)
         VALUES ($1, $2, NOW(), NOW() + INTERVAL '24 hours')
         ON CONFLICT (session_id) DO UPDATE SET license_key = $2`,
        [sessionId, licenseKey]
      )
    } catch {
      // Table might not exist - we'll create it in migration
      console.warn('[StripeService] Could not store session license key - table may not exist')
    }
  }

  /**
   * Get license key for a session (if already generated).
   */
  private async getSessionLicenseKey(sessionId: string): Promise<string | null> {
    try {
      const result = await this.pool.query<{ license_key: string }>(
        `SELECT license_key FROM checkout_sessions
         WHERE session_id = $1 AND expires_at > NOW()`,
        [sessionId]
      )
      return result.rows[0]?.license_key ?? null
    } catch {
      // Table might not exist
      return null
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Get the latest unactivated license key for an email.
   * Used for auto-activation after checkout.
   */
  private async getLatestLicenseKey(email: string): Promise<string | null> {
    // In a real implementation, we'd need to store the plain key temporarily
    // or use a different activation flow. For now, return null.
    // The user will need to enter the key manually from their email.
    return null
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  async close(): Promise<void> {
    await this.pool.end()
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let stripeServiceInstance: StripeService | null = null

export function getStripeService(): StripeService {
  if (!stripeServiceInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    const connectionString = process.env.DATABASE_URL || process.env.SYNC_DATABASE_URL

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable required')
    }
    if (!connectionString) {
      throw new Error('DATABASE_URL or SYNC_DATABASE_URL environment variable required')
    }

    stripeServiceInstance = new StripeService(secretKey, connectionString)
  }
  return stripeServiceInstance
}

export async function closeStripeService(): Promise<void> {
  if (stripeServiceInstance) {
    await stripeServiceInstance.close()
    stripeServiceInstance = null
  }
}
