/**
 * Checkout Flow Integration Tests
 *
 * Tests for the billing checkout API routes with mocked services.
 * These tests verify the route handlers work correctly with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the services at module level
const mockStripeService = {
  createCheckoutSession: vi.fn(),
  completeCheckout: vi.fn(),
  constructWebhookEvent: vi.fn(),
  handleWebhookEvent: vi.fn(),
}

const mockAuthService = {
  verifyToken: vi.fn(),
}

vi.mock('@/lib/api/services/stripeService', () => ({
  getStripeService: vi.fn(() => mockStripeService),
}))

vi.mock('@/lib/api/services/deviceAuthService', () => ({
  getDeviceAuthService: vi.fn(() => mockAuthService),
}))

// Import routes after mocking
import { POST as checkoutPOST } from '../../../app/api/v1/billing/checkout/route'
import { GET as completeGET } from '../../../app/api/v1/billing/checkout/complete/route'

describe('Checkout Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Lifetime Purchase Flow', () => {
    it('creates checkout session for lifetime plan', async () => {
      mockAuthService.verifyToken.mockReturnValue({ sub: 'account-123' })
      mockStripeService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_lifetime_123',
        url: 'https://checkout.stripe.com/pay/cs_test_lifetime_123',
      })

      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid_token',
          },
          body: JSON.stringify({
            plan: 'lifetime',
            successUrl: 'http://localhost/checkout/success',
            cancelUrl: 'http://localhost/checkout/cancel',
          }),
        }
      )

      const response = await checkoutPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('cs_test_lifetime_123')
      expect(data.url).toContain('checkout.stripe.com')
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        'account-123',
        'lifetime',
        'http://localhost/checkout/success',
        'http://localhost/checkout/cancel'
      )
    })

    it('returns license key for completed lifetime purchase', async () => {
      mockStripeService.completeCheckout.mockResolvedValue({
        success: true,
        licenseKey: 'QUARRY-ABCD-EFGH-IJKL-MNOP',
        email: 'test@example.com',
        purchaseType: 'lifetime',
      })

      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout/complete?session_id=cs_test_lifetime_123',
        { method: 'GET' }
      )

      const response = await completeGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.licenseKey).toBe('QUARRY-ABCD-EFGH-IJKL-MNOP')
      expect(data.email).toBe('test@example.com')
      expect(data.purchaseType).toBe('lifetime')
    })
  })

  describe('Subscription Flow', () => {
    it('creates checkout session for monthly subscription', async () => {
      mockAuthService.verifyToken.mockReturnValue({ sub: 'account-456' })
      mockStripeService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_monthly_123',
        url: 'https://checkout.stripe.com/pay/cs_test_monthly_123',
      })

      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid_token',
          },
          body: JSON.stringify({
            plan: 'monthly',
            successUrl: 'http://localhost/checkout/success',
            cancelUrl: 'http://localhost/checkout/cancel',
          }),
        }
      )

      const response = await checkoutPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('cs_test_monthly_123')
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        'account-456',
        'monthly',
        expect.any(String),
        expect.any(String)
      )
    })

    it('creates checkout session for annual subscription', async () => {
      mockAuthService.verifyToken.mockReturnValue({ sub: 'account-789' })
      mockStripeService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_test_annual_123',
        url: 'https://checkout.stripe.com/pay/cs_test_annual_123',
      })

      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid_token',
          },
          body: JSON.stringify({
            plan: 'annual',
            successUrl: 'http://localhost/checkout/success',
            cancelUrl: 'http://localhost/checkout/cancel',
          }),
        }
      )

      const response = await checkoutPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('cs_test_annual_123')
    })

    it('confirms subscription without license key', async () => {
      mockStripeService.completeCheckout.mockResolvedValue({
        success: true,
        email: 'test@example.com',
        purchaseType: 'monthly',
      })

      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout/complete?session_id=cs_test_monthly_123',
        { method: 'GET' }
      )

      const response = await completeGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.licenseKey).toBeUndefined()
      expect(data.purchaseType).toBe('monthly')
    })
  })

  describe('Error Handling', () => {
    it('returns 401 without authentication', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: 'lifetime',
            successUrl: 'http://localhost/success',
            cancelUrl: 'http://localhost/cancel',
          }),
        }
      )

      const response = await checkoutPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Authentication required')
    })

    it('returns 400 for invalid plan', async () => {
      mockAuthService.verifyToken.mockReturnValue({ sub: 'account-123' })

      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid_token',
          },
          body: JSON.stringify({
            plan: 'invalid_plan',
            successUrl: 'http://localhost/success',
            cancelUrl: 'http://localhost/cancel',
          }),
        }
      )

      const response = await checkoutPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid plan')
    })

    it('handles account not found', async () => {
      mockAuthService.verifyToken.mockReturnValue({ sub: 'nonexistent' })
      mockStripeService.createCheckoutSession.mockRejectedValue(
        new Error('Account not found in database')
      )

      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid_token',
          },
          body: JSON.stringify({
            plan: 'lifetime',
            successUrl: 'http://localhost/success',
            cancelUrl: 'http://localhost/cancel',
          }),
        }
      )

      const response = await checkoutPOST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Account not found')
    })

    it('handles checkout completion failure', async () => {
      mockStripeService.completeCheckout.mockResolvedValue({
        success: false,
        error: 'Payment was declined',
      })

      const request = new NextRequest(
        'http://localhost/api/v1/billing/checkout/complete?session_id=cs_failed_123',
        { method: 'GET' }
      )

      const response = await completeGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Payment was declined')
    })
  })
})
