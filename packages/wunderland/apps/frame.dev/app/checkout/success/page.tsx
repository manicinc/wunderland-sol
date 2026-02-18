'use client'

/**
 * Checkout Success Page
 *
 * Displays the license key immediately after successful Stripe checkout.
 * Also sends a confirmation email with the key.
 *
 * Query params:
 * - session_id: Stripe checkout session ID
 *
 * @module app/checkout/success/page
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Check,
  Copy,
  Loader2,
  AlertCircle,
  Download,
  Mail,
  ExternalLink,
  Crown,
  Sparkles,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface CheckoutResult {
  success: boolean
  licenseKey?: string
  email?: string
  purchaseType?: 'lifetime' | 'monthly' | 'annual'
  error?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch license key from API
  useEffect(() => {
    async function fetchLicenseKey() {
      if (!sessionId) {
        setResult({ success: false, error: 'Missing session ID' })
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/v1/billing/checkout/complete?session_id=${sessionId}`)
        const data = await response.json()

        if (!response.ok) {
          setResult({ success: false, error: data.error || 'Failed to retrieve license' })
        } else {
          setResult({
            success: true,
            licenseKey: data.licenseKey,
            email: data.email,
            purchaseType: data.purchaseType,
          })
        }
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to connect to server',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchLicenseKey()
  }, [sessionId])

  // Copy license key to clipboard
  const handleCopy = useCallback(async () => {
    if (!result?.licenseKey) return

    try {
      await navigator.clipboard.writeText(result.licenseKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = result.licenseKey
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result?.licenseKey])

  // Download license key as text file
  const handleDownload = useCallback(() => {
    if (!result?.licenseKey) return

    const content = `Quarry License Key
==================

${result.licenseKey}

How to activate:
1. Open Quarry on any device
2. Go to Settings → License
3. Enter your license key above
4. Enjoy unlimited devices and all premium features!

---
Purchase Type: ${result.purchaseType === 'lifetime' ? 'Lifetime License' : result.purchaseType === 'annual' ? 'Annual Subscription' : 'Monthly Subscription'}
Email: ${result.email}
Date: ${new Date().toLocaleDateString()}

Keep this file safe. You can use this key on multiple devices.
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quarry-license-key.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [result])

  const purchaseLabel = result?.purchaseType === 'lifetime'
    ? 'Lifetime License'
    : result?.purchaseType === 'annual'
      ? 'Annual Subscription'
      : 'Monthly Subscription'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Loading State */}
        {loading && (
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Processing your purchase...
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Just a moment while we generate your license key.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && !result?.success && (
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {result?.error || 'Unable to retrieve your license key.'}
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:support@quarry.space"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-xl transition-colors"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
              <a
                href="/"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
              >
                Return to homepage
              </a>
            </div>
          </div>
        )}

        {/* Success State */}
        {!loading && result?.success && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Thank you for your purchase!
              </h1>
              <p className="text-emerald-100">
                Your {purchaseLabel} is ready
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* License Key Display */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your License Key
                </label>
                <div className="relative">
                  <div className="bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 font-mono text-center text-lg tracking-wider text-gray-900 dark:text-white select-all">
                    {result.licenseKey}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                      copied
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title={copied ? 'Copied!' : 'Copy to clipboard'}
                  >
                    {copied ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Email confirmation */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  We've also sent your license key to <strong>{result.email}</strong>
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Key
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Save as File
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  How to activate:
                </h3>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                    Open Quarry on any device
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                    Go to Settings → License
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                    Enter your license key above
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
                    Enjoy unlimited devices and all premium features!
                  </li>
                </ol>
              </div>

              {/* Premium Features */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Premium features unlocked
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    'Unlimited devices',
                    'Cloud sync',
                    'AI Q&A',
                    'Flashcards (FSRS)',
                    'Full export',
                    'Priority support',
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-t border-gray-200 dark:border-gray-700">
              <a
                href="/app"
                className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl transition-colors"
              >
                Open Quarry
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
