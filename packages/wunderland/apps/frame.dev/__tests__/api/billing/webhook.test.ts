/**
 * Stripe Webhook API Route Tests
 *
 * Unit tests for POST /api/v1/billing/webhook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the stripe service
const mockStripeService = {
  constructWebhookEvent: vi.fn(),
  handleWebhookEvent: vi.fn(),
}

vi.mock('@/lib/api/services/stripeService', () => ({
  getStripeService: vi.fn(() => mockStripeService),
}))

import { POST, OPTIONS } from '../../../app/api/v1/billing/webhook/route'

describe('POST /api/v1/billing/webhook', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function createRequest(
    body: string,
    headers: Record<string, string> = {}
  ) {
    return new NextRequest('http://localhost/api/v1/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    })
  }

  describe('Configuration', () => {
    it('returns 503 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET

      const request = createRequest(
        JSON.stringify({ type: 'test.event' }),
        { 'stripe-signature': 'sig_test' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toContain('Webhook not configured')
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    })

    it('returns 400 without stripe-signature header', async () => {
      const request = createRequest(JSON.stringify({ type: 'test.event' }))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing stripe-signature header')
    })

    it('returns 400 with empty request body', async () => {
      const request = createRequest('', { 'stripe-signature': 'sig_test' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Empty request body')
    })

    it('returns 400 when signature verification fails', async () => {
      mockStripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Signature verification failed')
      })

      const request = createRequest(
        JSON.stringify({ type: 'test.event' }),
        { 'stripe-signature': 'invalid_signature' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid signature')
    })
  })

  describe('Event Processing', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    })

    it('processes checkout.session.completed event', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
          },
        },
      }

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent)
      mockStripeService.handleWebhookEvent.mockResolvedValue(undefined)

      const request = createRequest(
        JSON.stringify(mockEvent),
        { 'stripe-signature': 'sig_valid' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(mockStripeService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent)
    })

    it('processes customer.subscription.created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
          },
        },
      }

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent)
      mockStripeService.handleWebhookEvent.mockResolvedValue(undefined)

      const request = createRequest(
        JSON.stringify(mockEvent),
        { 'stripe-signature': 'sig_valid' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
    })

    it('processes customer.subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
          },
        },
      }

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent)
      mockStripeService.handleWebhookEvent.mockResolvedValue(undefined)

      const request = createRequest(
        JSON.stringify(mockEvent),
        { 'stripe-signature': 'sig_valid' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
    })

    it('verifies signature with correct parameters', async () => {
      const mockEvent = { type: 'test.event' }
      const rawBody = JSON.stringify(mockEvent)

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent)
      mockStripeService.handleWebhookEvent.mockResolvedValue(undefined)

      const request = createRequest(rawBody, { 'stripe-signature': 'sig_test_123' })

      await POST(request)

      expect(mockStripeService.constructWebhookEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sig_test_123',
        'whsec_test_secret'
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    })

    it('returns 200 even when event handling fails (to prevent Stripe retries)', async () => {
      const mockEvent = { type: 'test.event' }

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent)
      mockStripeService.handleWebhookEvent.mockRejectedValue(
        new Error('Database error during event processing')
      )

      const request = createRequest(
        JSON.stringify(mockEvent),
        { 'stripe-signature': 'sig_valid' }
      )

      const response = await POST(request)
      const data = await response.json()

      // Should return 200 to prevent Stripe from retrying
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.warning).toBe('Event processing had errors')
    })

    it('logs errors without exposing details to Stripe', async () => {
      const mockEvent = { type: 'test.event' }
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockStripeService.constructWebhookEvent.mockReturnValue(mockEvent)
      mockStripeService.handleWebhookEvent.mockRejectedValue(
        new Error('Sensitive database error')
      )

      const request = createRequest(
        JSON.stringify(mockEvent),
        { 'stripe-signature': 'sig_valid' }
      )

      const response = await POST(request)
      const data = await response.json()

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalled()
      // But not exposed in response
      expect(data.error).toBeUndefined()

      consoleSpy.mockRestore()
    })
  })
})

describe('OPTIONS /api/v1/billing/webhook', () => {
  it('returns 204 with allowed methods', async () => {
    const response = await OPTIONS()

    expect(response.status).toBe(204)
    expect(response.headers.get('Allow')).toBe('POST, OPTIONS')
  })
})
