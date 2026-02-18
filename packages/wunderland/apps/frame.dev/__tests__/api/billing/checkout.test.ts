/**
 * Checkout API Route Tests
 *
 * Unit tests for POST /api/v1/billing/checkout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the services
const mockStripeService = {
  createCheckoutSession: vi.fn(),
}

const mockAuthService = {
  verifyToken: vi.fn(),
}

vi.mock('@/lib/api/services/stripeService', () => ({
  getStripeService: vi.fn(() => mockStripeService),
  PurchaseType: {},
}))

vi.mock('@/lib/api/services/deviceAuthService', () => ({
  getDeviceAuthService: vi.fn(() => mockAuthService),
}))

import { POST, OPTIONS } from '../../../app/api/v1/billing/checkout/route'

describe('POST /api/v1/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createRequest(body: object, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/v1/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    })
  }

  describe('Authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const request = createRequest({
        plan: 'monthly',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Authentication required')
    })

    it('returns 401 with invalid Bearer token', async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const request = createRequest(
        {
          plan: 'monthly',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer invalid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Authentication required')
    })

    it('returns 401 with non-Bearer authorization', async () => {
      const request = createRequest(
        {
          plan: 'monthly',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Basic abc123' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Authentication required')
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockAuthService.verifyToken.mockReturnValue({ sub: 'account-123' })
    })

    it('returns 400 for invalid plan type', async () => {
      const request = createRequest(
        {
          plan: 'invalid',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid plan')
    })

    it('returns 400 for missing plan', async () => {
      const request = createRequest(
        {
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid plan')
    })

    it('returns 400 for missing successUrl', async () => {
      const request = createRequest(
        {
          plan: 'monthly',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('successUrl and cancelUrl are required')
    })

    it('returns 400 for missing cancelUrl', async () => {
      const request = createRequest(
        {
          plan: 'monthly',
          successUrl: 'http://localhost/success',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('successUrl and cancelUrl are required')
    })
  })

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuthService.verifyToken.mockReturnValue({ sub: 'account-123' })
      mockStripeService.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/cs_test_123',
        sessionId: 'cs_test_123',
      })
    })

    it('creates checkout session for monthly plan', async () => {
      const request = createRequest(
        {
          plan: 'monthly',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session/cs_test_123')
      expect(data.sessionId).toBe('cs_test_123')
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        'account-123',
        'monthly',
        'http://localhost/success',
        'http://localhost/cancel'
      )
    })

    it('creates checkout session for annual plan', async () => {
      const request = createRequest(
        {
          plan: 'annual',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        'account-123',
        'annual',
        expect.any(String),
        expect.any(String)
      )
    })

    it('creates checkout session for lifetime plan', async () => {
      const request = createRequest(
        {
          plan: 'lifetime',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        'account-123',
        'lifetime',
        expect.any(String),
        expect.any(String)
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthService.verifyToken.mockReturnValue({ sub: 'account-123' })
    })

    it('returns 404 when account not found', async () => {
      mockStripeService.createCheckoutSession.mockRejectedValue(
        new Error('Account not found in database')
      )

      const request = createRequest(
        {
          plan: 'monthly',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Account not found')
    })

    it('returns 503 when Stripe is not configured', async () => {
      mockStripeService.createCheckoutSession.mockRejectedValue(
        new Error('STRIPE_SECRET_KEY is not configured')
      )

      const request = createRequest(
        {
          plan: 'monthly',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toContain('Billing service not configured')
    })

    it('returns 500 for generic errors', async () => {
      mockStripeService.createCheckoutSession.mockRejectedValue(
        new Error('Some unexpected error')
      )

      const request = createRequest(
        {
          plan: 'monthly',
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
        { Authorization: 'Bearer valid_token' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create checkout session')
    })
  })
})

describe('OPTIONS /api/v1/billing/checkout', () => {
  it('returns 204 with allowed methods', async () => {
    const response = await OPTIONS()

    expect(response.status).toBe(204)
    expect(response.headers.get('Allow')).toBe('POST, OPTIONS')
  })
})
