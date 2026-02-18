/**
 * Checkout API Route
 *
 * Creates a Stripe checkout session for subscription or lifetime purchase.
 *
 * POST /api/v1/billing/checkout
 * Body: { plan: 'monthly' | 'annual' | 'lifetime', successUrl, cancelUrl }
 * Returns: { url, sessionId } or { error }
 *
 * @module app/api/v1/billing/checkout
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStripeService, type PurchaseType } from '@/lib/api/services/stripeService'
import { getDeviceAuthService } from '@/lib/api/services/deviceAuthService'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract account ID from Authorization header (Bearer token)
 */
async function getAuthenticatedAccountId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  if (!token) {
    return null
  }

  try {
    const authService = getDeviceAuthService()
    const payload = authService.verifyToken(token)
    return payload.sub // accountId
  } catch {
    return null
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json()
    const { plan, successUrl, cancelUrl } = body as {
      plan?: string
      successUrl?: string
      cancelUrl?: string
    }

    // Validate plan type
    const validPlans: PurchaseType[] = ['monthly', 'annual', 'lifetime']
    if (!plan || !validPlans.includes(plan as PurchaseType)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be monthly, annual, or lifetime.' },
        { status: 400 }
      )
    }

    // Validate URLs
    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'successUrl and cancelUrl are required' },
        { status: 400 }
      )
    }

    // Get authenticated account
    const accountId = await getAuthenticatedAccountId(request)
    if (!accountId) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in first.' },
        { status: 401 }
      )
    }

    // Create checkout session
    const stripeService = getStripeService()
    const result = await stripeService.createCheckoutSession(
      accountId,
      plan as PurchaseType,
      successUrl,
      cancelUrl
    )

    return NextResponse.json({
      url: result.url,
      sessionId: result.sessionId,
    })
  } catch (error) {
    console.error('[Billing] Checkout error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Account not found')) {
        return NextResponse.json(
          { error: 'Account not found. Please log in again.' },
          { status: 404 }
        )
      }
      if (error.message.includes('STRIPE_SECRET_KEY')) {
        return NextResponse.json(
          { error: 'Billing service not configured' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// Return allowed methods for OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS',
    },
  })
}
