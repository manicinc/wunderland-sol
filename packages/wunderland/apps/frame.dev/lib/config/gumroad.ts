/**
 * Gumroad configuration for Quarry Codex Premium
 *
 * Setup instructions:
 * 1. Create a Gumroad account at https://gumroad.com
 * 2. Create a product called "Quarry Codex Premium"
 * 3. Enable license keys in product settings
 * 4. Copy your product URL and set NEXT_PUBLIC_GUMROAD_PRODUCT_URL
 *
 * License key validation:
 * - Gumroad generates unique license keys per purchase
 * - Use their API to verify: https://api.gumroad.com/v2/licenses/verify
 */

// Gumroad product URL - replace with your actual product URL
export const GUMROAD_PRODUCT_URL =
  process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL ||
  'https://framersai.gumroad.com/l/codex-premium'

// Gumroad API endpoint for license verification
export const GUMROAD_LICENSE_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify'

// Product ID for API calls (found in Gumroad dashboard)
export const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || ''

/**
 * Build checkout URL with optional parameters
 */
export function buildGumroadCheckoutUrl(options?: {
  email?: string
  quantity?: number
  discount?: string
}): string {
  const url = new URL(GUMROAD_PRODUCT_URL)

  if (options?.email) {
    url.searchParams.set('email', options.email)
  }
  if (options?.quantity) {
    url.searchParams.set('quantity', options.quantity.toString())
  }
  if (options?.discount) {
    url.searchParams.set('discount_code', options.discount)
  }

  // Enable Gumroad overlay for smoother checkout
  url.searchParams.set('wanted', 'true')

  return url.toString()
}

/**
 * Verify a Gumroad license key
 * Server-side only (requires API access token)
 */
export interface GumroadLicenseResponse {
  success: boolean
  uses: number
  purchase: {
    id: string
    product_id: string
    email: string
    created_at: string
    license_key: string
    refunded: boolean
    chargebacked: boolean
  }
  message?: string
}

export async function verifyGumroadLicense(
  licenseKey: string,
  incrementUseCount = true
): Promise<GumroadLicenseResponse> {
  const response = await fetch(GUMROAD_LICENSE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      product_id: GUMROAD_PRODUCT_ID,
      license_key: licenseKey,
      increment_uses_count: incrementUseCount.toString(),
    }),
  })

  return response.json()
}

/**
 * Check if a license response is valid for activation
 */
export function isLicenseValid(response: GumroadLicenseResponse): boolean {
  if (!response.success) return false
  if (response.purchase.refunded) return false
  if (response.purchase.chargebacked) return false
  return true
}
