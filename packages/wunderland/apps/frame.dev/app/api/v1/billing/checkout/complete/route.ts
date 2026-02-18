/**
 * Checkout Complete API Route
 *
 * Returns the checkout result including license key for lifetime purchases.
 * Called from the success page after Stripe redirects back.
 *
 * GET /api/v1/billing/checkout/complete?session_id={id}
 * Returns: { success, licenseKey?, email?, purchaseType? } or { error }
 *
 * @module app/api/v1/billing/checkout/complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStripeService } from '@/lib/api/services/stripeService'

export async function GET(request: NextRequest) {
  try {
    // Get session_id from query params
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'session_id is required' },
        { status: 400 }
      )
    }

    // Complete checkout and get result
    const stripeService = getStripeService()
    const result = await stripeService.completeCheckout(sessionId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Checkout not completed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      licenseKey: result.licenseKey,
      email: result.email,
      purchaseType: result.purchaseType,
    })
  } catch (error) {
    console.error('[Billing] Checkout complete error:', error)

    // Handle Stripe configuration errors
    if (error instanceof Error) {
      if (error.message.includes('STRIPE_SECRET_KEY')) {
        return NextResponse.json(
          { success: false, error: 'Billing service not configured' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to complete checkout' },
      { status: 500 }
    )
  }
}

// Return allowed methods for OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, OPTIONS',
    },
  })
}
