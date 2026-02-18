/**
 * Stripe Webhook API Route
 *
 * Handles Stripe webhook events for subscription and payment updates.
 *
 * POST /api/v1/billing/webhook
 * Headers: stripe-signature (required)
 * Body: Raw Stripe event payload
 *
 * @module app/api/v1/billing/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStripeService } from '@/lib/api/services/stripeService'

// Disable body parsing - we need the raw body for signature verification
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      )
    }

    // Get signature header
    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Get raw body
    const rawBody = await request.text()
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      )
    }

    // Verify signature and construct event
    const stripeService = getStripeService()
    let event

    try {
      event = stripeService.constructWebhookEvent(
        Buffer.from(rawBody),
        signature,
        webhookSecret
      )
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Log event type for debugging
    console.log(`[Webhook] Received event: ${event.type}`)

    // Handle the event
    await stripeService.handleWebhookEvent(event)

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Error handling webhook:', error)

    // Still return 200 to prevent Stripe from retrying
    // Log the error but don't expose details to Stripe
    return NextResponse.json(
      { received: true, warning: 'Event processing had errors' },
      { status: 200 }
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
