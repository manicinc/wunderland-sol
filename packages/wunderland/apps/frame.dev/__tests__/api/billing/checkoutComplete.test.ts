/**
 * Checkout Complete API Route Tests
 *
 * Unit tests for GET /api/v1/billing/checkout/complete
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the stripe service
const mockStripeService = {
  completeCheckout: vi.fn(),
}

vi.mock('@/lib/api/services/stripeService', () => ({
  getStripeService: vi.fn(() => mockStripeService),
}))

import { GET, OPTIONS } from '../../../app/api/v1/billing/checkout/complete/route'

describe('GET /api/v1/billing/checkout/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createRequest(sessionId?: string) {
    const url = sessionId
      ? `http://localhost/api/v1/billing/checkout/complete?session_id=${sessionId}`
      : 'http://localhost/api/v1/billing/checkout/complete'
    return new NextRequest(url, { method: 'GET' })
  }

  describe('Validation', () => {
    it('returns 400 without session_id', async () => {
      const request = createRequest()

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('session_id is required')
    })

    it('returns 400 with empty session_id', async () => {
      const request = createRequest('')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Lifetime Purchase Success', () => {
    it('returns license key for lifetime purchase', async () => {
      mockStripeService.completeCheckout.mockResolvedValue({
        success: true,
        licenseKey: 'QUARRY-ABCD-EFGH-IJKL-MNOP',
        email: 'test@example.com',
        purchaseType: 'lifetime',
      })

      const request = createRequest('cs_test_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.licenseKey).toBe('QUARRY-ABCD-EFGH-IJKL-MNOP')
      expect(data.email).toBe('test@example.com')
      expect(data.purchaseType).toBe('lifetime')
      expect(mockStripeService.completeCheckout).toHaveBeenCalledWith('cs_test_123')
    })
  })

  describe('Subscription Success', () => {
    it('returns success without license key for monthly subscription', async () => {
      mockStripeService.completeCheckout.mockResolvedValue({
        success: true,
        email: 'test@example.com',
        purchaseType: 'monthly',
      })

      const request = createRequest('cs_test_monthly_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.licenseKey).toBeUndefined()
      expect(data.email).toBe('test@example.com')
      expect(data.purchaseType).toBe('monthly')
    })

    it('returns success without license key for annual subscription', async () => {
      mockStripeService.completeCheckout.mockResolvedValue({
        success: true,
        email: 'test@example.com',
        purchaseType: 'annual',
      })

      const request = createRequest('cs_test_annual_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.licenseKey).toBeUndefined()
      expect(data.purchaseType).toBe('annual')
    })
  })

  describe('Checkout Not Completed', () => {
    it('returns 400 when checkout is not completed', async () => {
      mockStripeService.completeCheckout.mockResolvedValue({
        success: false,
        error: 'Payment not completed',
      })

      const request = createRequest('cs_incomplete_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Payment not completed')
    })

    it('returns default error message when no error provided', async () => {
      mockStripeService.completeCheckout.mockResolvedValue({
        success: false,
      })

      const request = createRequest('cs_failed_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Checkout not completed')
    })
  })

  describe('Error Handling', () => {
    it('returns 503 when Stripe is not configured', async () => {
      mockStripeService.completeCheckout.mockRejectedValue(
        new Error('STRIPE_SECRET_KEY is not configured')
      )

      const request = createRequest('cs_test_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Billing service not configured')
    })

    it('returns 500 for generic errors', async () => {
      mockStripeService.completeCheckout.mockRejectedValue(
        new Error('Unexpected database error')
      )

      const request = createRequest('cs_test_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to complete checkout')
    })

    it('returns 500 for non-Error exceptions', async () => {
      mockStripeService.completeCheckout.mockRejectedValue('string error')

      const request = createRequest('cs_test_123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})

describe('OPTIONS /api/v1/billing/checkout/complete', () => {
  it('returns 204 with allowed methods', async () => {
    const response = await OPTIONS()

    expect(response.status).toBe(204)
    expect(response.headers.get('Allow')).toBe('GET, OPTIONS')
  })
})
