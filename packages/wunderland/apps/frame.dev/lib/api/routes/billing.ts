/**
 * Billing Routes
 *
 * Stripe checkout, webhooks, and subscription management.
 *
 * @module lib/api/routes/billing
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getStripeService, PurchaseType } from '../services/stripeService'
import { getLicenseService } from '../services/licenseService'
import { getEmailService } from '../services/emailService'

// ============================================================================
// SCHEMAS
// ============================================================================

const checkoutSchema = {
  description: 'Create a Stripe checkout session',
  tags: ['Billing'],
  body: {
    type: 'object',
    required: ['purchaseType'],
    properties: {
      purchaseType: {
        type: 'string',
        enum: ['monthly', 'annual', 'lifetime'],
        description: 'Type of purchase'
      },
      successUrl: { type: 'string', format: 'uri' },
      cancelUrl: { type: 'string', format: 'uri' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        url: { type: 'string' }
      }
    }
  }
}

const portalSchema = {
  description: 'Create a Stripe billing portal session',
  tags: ['Billing'],
  body: {
    type: 'object',
    properties: {
      returnUrl: { type: 'string', format: 'uri' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        url: { type: 'string' }
      }
    }
  }
}

const subscriptionSchema = {
  description: 'Get current subscription status',
  tags: ['Billing'],
  response: {
    200: {
      type: 'object',
      properties: {
        hasSubscription: { type: 'boolean' },
        subscription: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            currentPeriodEnd: { type: 'string' },
            cancelAtPeriodEnd: { type: 'boolean' },
            plan: { type: 'string' }
          }
        },
        hasLifetimeLicense: { type: 'boolean' }
      }
    }
  }
}

const activateLicenseSchema = {
  description: 'Activate a license key',
  tags: ['Billing'],
  body: {
    type: 'object',
    required: ['licenseKey'],
    properties: {
      licenseKey: {
        type: 'string',
        description: 'License key in format QUARRY-XXXX-XXXX-XXXX-XXXX'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

const validateLicenseSchema = {
  description: 'Validate a license key (without activating)',
  tags: ['Billing'],
  security: [],  // No auth required
  body: {
    type: 'object',
    required: ['licenseKey'],
    properties: {
      licenseKey: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        error: { type: 'string', nullable: true }
      }
    }
  }
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

interface CheckoutBody {
  purchaseType: PurchaseType
  successUrl?: string
  cancelUrl?: string
}

interface PortalBody {
  returnUrl?: string
}

interface ActivateLicenseBody {
  licenseKey: string
}

interface ValidateLicenseBody {
  licenseKey: string
}

// ============================================================================
// ROUTES
// ============================================================================

export async function registerBillingRoutes(fastify: FastifyInstance): Promise<void> {
  // --------------------------------------------------------------------------
  // Complete Checkout (Get License Key)
  // --------------------------------------------------------------------------

  fastify.get<{ Querystring: { session_id: string } }>('/billing/checkout/complete', {
    schema: {
      description: 'Complete checkout and get license key',
      tags: ['Billing'],
      security: [],  // No auth - session_id is the verification
      querystring: {
        type: 'object',
        required: ['session_id'],
        properties: {
          session_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            licenseKey: { type: 'string' },
            email: { type: 'string' },
            purchaseType: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { session_id } = request.query
    const stripeService = getStripeService()

    try {
      // Get session details and license key
      const result = await stripeService.completeCheckout(session_id)

      if (!result.success) {
        return reply.status(400).send({ error: result.error })
      }

      // Send email with license key
      if (result.licenseKey && result.email) {
        try {
          const emailService = getEmailService()
          await emailService.sendLicenseEmail({
            to: result.email,
            licenseKey: result.licenseKey,
            purchaseType: result.purchaseType as 'lifetime' | 'monthly' | 'annual',
            purchaseDate: new Date(),
          })
        } catch (emailError) {
          // Log but don't fail - user has the key on the page
          fastify.log.error({ error: emailError }, 'Failed to send license email')
        }
      }

      return {
        licenseKey: result.licenseKey,
        email: result.email,
        purchaseType: result.purchaseType,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete checkout'
      return reply.status(400).send({ error: message })
    }
  })

  // --------------------------------------------------------------------------
  // Stripe Checkout
  // --------------------------------------------------------------------------

  fastify.post<{ Body: CheckoutBody }>('/billing/checkout', {
    schema: checkoutSchema,
    // @ts-expect-error - verifySyncToken is decorated
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    const stripeService = getStripeService()
    const { purchaseType, successUrl, cancelUrl } = request.body

    // Default URLs
    const baseUrl = process.env.FRONTEND_URL || 'https://quarry.space'
    const defaultSuccessUrl = `${baseUrl}/app/settings?payment=success`
    const defaultCancelUrl = `${baseUrl}/app/settings?payment=canceled`

    const result = await stripeService.createCheckoutSession(
      accountId,
      purchaseType,
      successUrl || defaultSuccessUrl,
      cancelUrl || defaultCancelUrl
    )

    return result
  })

  // --------------------------------------------------------------------------
  // Stripe Billing Portal
  // --------------------------------------------------------------------------

  fastify.post<{ Body: PortalBody }>('/billing/portal', {
    schema: portalSchema,
    // @ts-expect-error - verifySyncToken is decorated
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    const stripeService = getStripeService()
    const baseUrl = process.env.FRONTEND_URL || 'https://quarry.space'
    const returnUrl = request.body.returnUrl || `${baseUrl}/app/settings`

    try {
      const url = await stripeService.createBillingPortalSession(accountId, returnUrl)
      return { url }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Portal creation failed'
      return reply.status(400).send({
        error: 'PORTAL_ERROR',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // Get Subscription Status
  // --------------------------------------------------------------------------

  fastify.get('/billing/subscription', {
    schema: subscriptionSchema,
    // @ts-expect-error - verifySyncToken is decorated
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    const stripeService = getStripeService()
    const licenseService = getLicenseService()

    // Get subscription
    const subscription = await stripeService.getSubscription(accountId)

    // Check for lifetime license
    const licenses = await licenseService.getAccountLicenses(accountId)
    const hasLifetimeLicense = licenses.some(l => l.activatedAt && !l.revokedAt)

    return {
      hasSubscription: subscription !== null,
      subscription,
      hasLifetimeLicense
    }
  })

  // --------------------------------------------------------------------------
  // Cancel Subscription
  // --------------------------------------------------------------------------

  fastify.post('/billing/subscription/cancel', {
    schema: {
      description: 'Cancel subscription at period end',
      tags: ['Billing'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    // @ts-expect-error - verifySyncToken is decorated
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    const stripeService = getStripeService()

    try {
      await stripeService.cancelSubscription(accountId)
      return {
        success: true,
        message: 'Subscription will be canceled at the end of the billing period'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cancellation failed'
      return reply.status(400).send({
        error: 'CANCEL_ERROR',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // Reactivate Subscription
  // --------------------------------------------------------------------------

  fastify.post('/billing/subscription/reactivate', {
    schema: {
      description: 'Reactivate a canceled subscription',
      tags: ['Billing'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    // @ts-expect-error - verifySyncToken is decorated
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    const stripeService = getStripeService()

    try {
      await stripeService.reactivateSubscription(accountId)
      return {
        success: true,
        message: 'Subscription reactivated'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reactivation failed'
      return reply.status(400).send({
        error: 'REACTIVATE_ERROR',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // Activate License Key
  // --------------------------------------------------------------------------

  fastify.post<{ Body: ActivateLicenseBody }>('/billing/license/activate', {
    schema: activateLicenseSchema,
    // @ts-expect-error - verifySyncToken is decorated
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    const licenseService = getLicenseService()
    const result = await licenseService.activateLicense(request.body.licenseKey, accountId)

    if (!result.success) {
      return reply.status(400).send({
        error: 'ACTIVATION_FAILED',
        message: result.error
      })
    }

    return {
      success: true,
      message: 'License activated successfully. You now have Premium access!'
    }
  })

  // --------------------------------------------------------------------------
  // Validate License Key (No Auth)
  // --------------------------------------------------------------------------

  fastify.post<{ Body: ValidateLicenseBody }>('/billing/license/validate', {
    schema: validateLicenseSchema
  }, async (request, reply) => {
    const licenseService = getLicenseService()
    const result = await licenseService.validateKey(request.body.licenseKey)

    return {
      valid: result.valid,
      error: result.error ?? null
    }
  })

  // --------------------------------------------------------------------------
  // Stripe Webhook
  // --------------------------------------------------------------------------

  // Note: Webhooks need raw body, so we handle this specially
  fastify.post('/billing/webhook', {
    schema: {
      description: 'Stripe webhook endpoint',
      tags: ['Billing'],
      security: [],  // No auth - verified by Stripe signature
    },
    config: {
      rawBody: true  // Need raw body for signature verification
    }
  }, async (request, reply) => {
    const stripeService = getStripeService()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      fastify.log.error('STRIPE_WEBHOOK_SECRET not configured')
      return reply.status(500).send({ error: 'Webhook not configured' })
    }

    const signature = request.headers['stripe-signature'] as string
    if (!signature) {
      return reply.status(400).send({ error: 'Missing stripe-signature header' })
    }

    try {
      // Get raw body
      const rawBody = (request as any).rawBody as Buffer

      // Verify and construct event
      const event = stripeService.constructWebhookEvent(rawBody, signature, webhookSecret)

      // Handle the event
      await stripeService.handleWebhookEvent(event)

      return { received: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook error'
      fastify.log.error({ error }, 'Stripe webhook error')
      return reply.status(400).send({ error: message })
    }
  })
}
