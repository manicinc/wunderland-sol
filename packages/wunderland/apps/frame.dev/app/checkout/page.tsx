'use client'

/**
 * Checkout Page
 *
 * Handles checkout flow for Quarry Pro subscriptions.
 * - On static deployment (frame.dev): redirects to quarry.space
 * - On server deployment (quarry.space): creates Stripe session and redirects
 *
 * Query params:
 * - plan: 'monthly' | 'annual' | 'lifetime' (default: 'monthly')
 *
 * @module app/checkout/page
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CreditCard, Shield, Sparkles } from 'lucide-react'

// ============================================================================
// CONSTANTS
// ============================================================================

// Quarry.space app is deployed at /app base path
const QUARRY_SPACE_APP_URL = 'https://quarry.space/app'

// Check if we're on a static deployment (no API available)
const isStaticDeployment = () => {
  if (typeof window === 'undefined') return false
  // frame.dev or localhost without API = static
  const hostname = window.location.hostname
  return hostname === 'frame.dev' ||
         hostname === 'www.frame.dev' ||
         hostname.endsWith('.github.io')
}

// ============================================================================
// TYPES
// ============================================================================

type PlanType = 'monthly' | 'annual' | 'lifetime'

interface PlanInfo {
  name: string
  price: string
  period: string
  description: string
}

const PLANS: Record<PlanType, PlanInfo> = {
  monthly: {
    name: 'Pro Monthly',
    price: '$9',
    period: '/month',
    description: 'Cloud sync + BYOK. Grandfathered at $9/mo forever.',
  },
  annual: {
    name: 'Pro Annual',
    price: '$79',
    period: '/year',
    description: 'Save 27% vs monthly. Grandfathered pricing.',
  },
  lifetime: {
    name: 'Pro Lifetime',
    price: '$99',
    period: 'beta price',
    description: 'Pay once, yours forever. Goes to $199 after beta.',
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') as PlanType | null
  const plan: PlanType = planParam && PLANS[planParam] ? planParam : 'monthly'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function initiateCheckout() {
      // Static deployment: redirect to quarry.space/app (where the Next.js app lives)
      if (isStaticDeployment()) {
        window.location.href = `${QUARRY_SPACE_APP_URL}/checkout?plan=${plan}`
        return
      }

      // Server deployment: call API to create checkout session
      try {
        // Get auth token from localStorage (stored by sync client)
        // Try multiple possible storage keys
        let syncToken = localStorage.getItem('quarry-sync-token') ||
                        localStorage.getItem('sync-access-token') ||
                        localStorage.getItem('frame-sync-token') ||
                        localStorage.getItem('accessToken')

        // Also check frame-sync-config for embedded token
        if (!syncToken) {
          try {
            const syncConfig = localStorage.getItem('frame-sync-config')
            if (syncConfig) {
              const config = JSON.parse(syncConfig)
              syncToken = config.accessToken || config.token
            }
          } catch {
            // Ignore parse errors
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (syncToken) {
          headers['Authorization'] = `Bearer ${syncToken}`
        }

        const response = await fetch('/api/v1/billing/checkout', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            plan,
            successUrl: `${window.location.origin}/checkout/success`,
            cancelUrl: `${window.location.origin}/quarry#pricing`,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          // If not authenticated, redirect to login first
          if (response.status === 401) {
            const returnUrl = encodeURIComponent(`/checkout?plan=${plan}`)
            window.location.href = `/login?return=${returnUrl}`
            return
          }
          throw new Error(data.error || 'Failed to create checkout session')
        }

        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url
        } else {
          throw new Error('No checkout URL returned')
        }
      } catch (err) {
        console.error('Checkout error:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setLoading(false)
      }
    }

    initiateCheckout()
  }, [plan])

  const planInfo = PLANS[plan]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Loading State */}
        {loading && !error && (
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>

            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Preparing your checkout...
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mb-6">
              You'll be redirected to secure payment in a moment.
            </p>

            {/* Plan Summary */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Plan</span>
                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  {planInfo.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Price</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {planInfo.price}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    {planInfo.period !== 'one-time' ? planInfo.period : ''}
                  </span>
                </span>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Secured by Stripe</span>
              <CreditCard className="w-4 h-4 ml-2" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Checkout unavailable
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {error}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
              >
                Try Again
              </button>
              <a
                href="/quarry#pricing"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
              >
                Return to pricing
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
