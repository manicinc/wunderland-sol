/**
 * Gumroad Configuration Tests
 * @module __tests__/unit/lib/config/gumroad.test
 *
 * Tests for Gumroad integration configuration and license validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  GUMROAD_PRODUCT_URL,
  GUMROAD_LICENSE_VERIFY_URL,
  GUMROAD_PRODUCT_ID,
  buildGumroadCheckoutUrl,
  verifyGumroadLicense,
  isLicenseValid,
  type GumroadLicenseResponse,
} from '@/lib/config/gumroad'

describe('Gumroad Configuration', () => {
  // ============================================================================
  // Constants
  // ============================================================================

  describe('GUMROAD_PRODUCT_URL', () => {
    it('is defined', () => {
      expect(GUMROAD_PRODUCT_URL).toBeDefined()
    })

    it('is a string', () => {
      expect(typeof GUMROAD_PRODUCT_URL).toBe('string')
    })

    it('is a valid URL', () => {
      expect(() => new URL(GUMROAD_PRODUCT_URL)).not.toThrow()
    })

    it('contains gumroad.com', () => {
      expect(GUMROAD_PRODUCT_URL).toContain('gumroad.com')
    })
  })

  describe('GUMROAD_LICENSE_VERIFY_URL', () => {
    it('is defined', () => {
      expect(GUMROAD_LICENSE_VERIFY_URL).toBeDefined()
    })

    it('is the Gumroad API endpoint', () => {
      expect(GUMROAD_LICENSE_VERIFY_URL).toBe('https://api.gumroad.com/v2/licenses/verify')
    })

    it('uses HTTPS', () => {
      expect(GUMROAD_LICENSE_VERIFY_URL.startsWith('https://')).toBe(true)
    })
  })

  describe('GUMROAD_PRODUCT_ID', () => {
    it('is defined', () => {
      expect(GUMROAD_PRODUCT_ID).toBeDefined()
    })

    it('is a string', () => {
      expect(typeof GUMROAD_PRODUCT_ID).toBe('string')
    })
  })

  // ============================================================================
  // buildGumroadCheckoutUrl
  // ============================================================================

  describe('buildGumroadCheckoutUrl', () => {
    it('returns base URL with wanted param when no options', () => {
      const url = buildGumroadCheckoutUrl()
      expect(url).toContain('wanted=true')
    })

    it('adds email param when provided', () => {
      const url = buildGumroadCheckoutUrl({ email: 'test@example.com' })
      expect(url).toContain('email=test%40example.com')
    })

    it('adds quantity param when provided', () => {
      const url = buildGumroadCheckoutUrl({ quantity: 3 })
      expect(url).toContain('quantity=3')
    })

    it('adds discount_code param when discount provided', () => {
      const url = buildGumroadCheckoutUrl({ discount: 'SAVE10' })
      expect(url).toContain('discount_code=SAVE10')
    })

    it('combines all params', () => {
      const url = buildGumroadCheckoutUrl({
        email: 'user@test.com',
        quantity: 2,
        discount: 'BUNDLE20',
      })
      expect(url).toContain('email=user%40test.com')
      expect(url).toContain('quantity=2')
      expect(url).toContain('discount_code=BUNDLE20')
      expect(url).toContain('wanted=true')
    })

    it('returns valid URL', () => {
      const url = buildGumroadCheckoutUrl({ email: 'test@test.com' })
      expect(() => new URL(url)).not.toThrow()
    })

    it('handles empty options object', () => {
      const url = buildGumroadCheckoutUrl({})
      expect(url).toContain('wanted=true')
      expect(url).not.toContain('email=')
      expect(url).not.toContain('quantity=')
      expect(url).not.toContain('discount_code=')
    })

    it('handles quantity of 1', () => {
      const url = buildGumroadCheckoutUrl({ quantity: 1 })
      expect(url).toContain('quantity=1')
    })

    it('handles large quantity', () => {
      const url = buildGumroadCheckoutUrl({ quantity: 100 })
      expect(url).toContain('quantity=100')
    })

    it('handles email with special characters', () => {
      const url = buildGumroadCheckoutUrl({ email: 'user+test@example.com' })
      expect(url).toContain('email=user%2Btest%40example.com')
    })

    it('handles discount code with numbers', () => {
      const url = buildGumroadCheckoutUrl({ discount: 'SAVE50OFF' })
      expect(url).toContain('discount_code=SAVE50OFF')
    })
  })

  // ============================================================================
  // verifyGumroadLicense
  // ============================================================================

  describe('verifyGumroadLicense', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
      mockFetch.mockReset()
      vi.stubGlobal('fetch', mockFetch)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('calls fetch with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      await verifyGumroadLicense('LICENSE-KEY-123')

      expect(mockFetch).toHaveBeenCalledWith(
        GUMROAD_LICENSE_VERIFY_URL,
        expect.any(Object)
      )
    })

    it('uses POST method', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      await verifyGumroadLicense('LICENSE-KEY-123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('sends form-urlencoded content type', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      await verifyGumroadLicense('LICENSE-KEY-123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      )
    })

    it('includes license key in body', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      await verifyGumroadLicense('MY-LICENSE-KEY')

      const callArgs = mockFetch.mock.calls[0][1]
      const body = callArgs.body as URLSearchParams
      const bodyString = body.toString()
      expect(bodyString).toContain('license_key=MY-LICENSE-KEY')
    })

    it('increments use count by default', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      await verifyGumroadLicense('LICENSE-KEY')

      const callArgs = mockFetch.mock.calls[0][1]
      const body = callArgs.body as URLSearchParams
      const bodyString = body.toString()
      expect(bodyString).toContain('increment_uses_count=true')
    })

    it('can disable use count increment', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      await verifyGumroadLicense('LICENSE-KEY', false)

      const callArgs = mockFetch.mock.calls[0][1]
      const body = callArgs.body as URLSearchParams
      const bodyString = body.toString()
      expect(bodyString).toContain('increment_uses_count=false')
    })

    it('returns successful response', async () => {
      const mockResponse: GumroadLicenseResponse = {
        success: true,
        uses: 1,
        purchase: {
          id: 'purchase-123',
          product_id: 'prod-456',
          email: 'buyer@example.com',
          created_at: '2025-01-01T00:00:00Z',
          license_key: 'LICENSE-KEY',
          refunded: false,
          chargebacked: false,
        },
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      const result = await verifyGumroadLicense('LICENSE-KEY')

      expect(result.success).toBe(true)
      expect(result.uses).toBe(1)
      expect(result.purchase.email).toBe('buyer@example.com')
    })

    it('returns failed response', async () => {
      const mockResponse: GumroadLicenseResponse = {
        success: false,
        uses: 0,
        purchase: {
          id: '',
          product_id: '',
          email: '',
          created_at: '',
          license_key: '',
          refunded: false,
          chargebacked: false,
        },
        message: 'That license does not exist for the provided product.',
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      const result = await verifyGumroadLicense('INVALID-KEY')

      expect(result.success).toBe(false)
      expect(result.message).toContain('does not exist')
    })
  })

  // ============================================================================
  // isLicenseValid
  // ============================================================================

  describe('isLicenseValid', () => {
    it('returns true for valid license', () => {
      const response: GumroadLicenseResponse = {
        success: true,
        uses: 1,
        purchase: {
          id: 'purchase-123',
          product_id: 'prod-456',
          email: 'buyer@example.com',
          created_at: '2025-01-01T00:00:00Z',
          license_key: 'LICENSE-KEY',
          refunded: false,
          chargebacked: false,
        },
      }

      expect(isLicenseValid(response)).toBe(true)
    })

    it('returns false when success is false', () => {
      const response: GumroadLicenseResponse = {
        success: false,
        uses: 0,
        purchase: {
          id: '',
          product_id: '',
          email: '',
          created_at: '',
          license_key: '',
          refunded: false,
          chargebacked: false,
        },
        message: 'Invalid license',
      }

      expect(isLicenseValid(response)).toBe(false)
    })

    it('returns false when refunded', () => {
      const response: GumroadLicenseResponse = {
        success: true,
        uses: 1,
        purchase: {
          id: 'purchase-123',
          product_id: 'prod-456',
          email: 'buyer@example.com',
          created_at: '2025-01-01T00:00:00Z',
          license_key: 'LICENSE-KEY',
          refunded: true,
          chargebacked: false,
        },
      }

      expect(isLicenseValid(response)).toBe(false)
    })

    it('returns false when chargebacked', () => {
      const response: GumroadLicenseResponse = {
        success: true,
        uses: 1,
        purchase: {
          id: 'purchase-123',
          product_id: 'prod-456',
          email: 'buyer@example.com',
          created_at: '2025-01-01T00:00:00Z',
          license_key: 'LICENSE-KEY',
          refunded: false,
          chargebacked: true,
        },
      }

      expect(isLicenseValid(response)).toBe(false)
    })

    it('returns false when both refunded and chargebacked', () => {
      const response: GumroadLicenseResponse = {
        success: true,
        uses: 1,
        purchase: {
          id: 'purchase-123',
          product_id: 'prod-456',
          email: 'buyer@example.com',
          created_at: '2025-01-01T00:00:00Z',
          license_key: 'LICENSE-KEY',
          refunded: true,
          chargebacked: true,
        },
      }

      expect(isLicenseValid(response)).toBe(false)
    })

    it('handles high use count', () => {
      const response: GumroadLicenseResponse = {
        success: true,
        uses: 100,
        purchase: {
          id: 'purchase-123',
          product_id: 'prod-456',
          email: 'buyer@example.com',
          created_at: '2025-01-01T00:00:00Z',
          license_key: 'LICENSE-KEY',
          refunded: false,
          chargebacked: false,
        },
      }

      expect(isLicenseValid(response)).toBe(true)
    })
  })

  // ============================================================================
  // GumroadLicenseResponse type
  // ============================================================================

  describe('GumroadLicenseResponse type', () => {
    it('creates minimal response', () => {
      const response: GumroadLicenseResponse = {
        success: true,
        uses: 0,
        purchase: {
          id: 'id',
          product_id: 'pid',
          email: 'e@e.com',
          created_at: '2025-01-01',
          license_key: 'key',
          refunded: false,
          chargebacked: false,
        },
      }

      expect(response.success).toBe(true)
    })

    it('includes optional message', () => {
      const response: GumroadLicenseResponse = {
        success: false,
        uses: 0,
        purchase: {
          id: '',
          product_id: '',
          email: '',
          created_at: '',
          license_key: '',
          refunded: false,
          chargebacked: false,
        },
        message: 'License not found',
      }

      expect(response.message).toBe('License not found')
    })

    it('tracks uses correctly', () => {
      const response: GumroadLicenseResponse = {
        success: true,
        uses: 5,
        purchase: {
          id: 'id',
          product_id: 'pid',
          email: 'e@e.com',
          created_at: '2025-01-01',
          license_key: 'key',
          refunded: false,
          chargebacked: false,
        },
      }

      expect(response.uses).toBe(5)
    })
  })
})
