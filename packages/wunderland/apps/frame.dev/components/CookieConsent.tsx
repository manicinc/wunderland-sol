/**
 * GDPR-Compliant Cookie Consent Banner
 * 
 * Privacy Modes:
 * - ANONYMOUS (default): Cookieless analytics, no persistent identifiers
 * - FULL (after consent): Enhanced tracking with cookies for better insights
 * 
 * Complies with EU GDPR, UK GDPR, ePrivacy, and CCPA requirements
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Shield, Eye, BarChart3 } from 'lucide-react'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent')
    if (consent === null) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1500)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true')
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setShowBanner(false)
    // Dispatch event to notify Analytics component (no reload needed)
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: 'accepted' }))
  }

  const rejectCookies = () => {
    localStorage.setItem('cookie-consent', 'false')
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
    setShowBanner(false)
    // Dispatch event to notify Analytics component
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: 'rejected' }))
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-2xl shadow-black/20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Privacy & Cookies
              </h3>
            </div>
            
            {/* Main message */}
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              We use <strong>anonymous analytics</strong> to understand how visitors use our site. 
              This helps us improve Quarry.{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">No personal data is collected.</span>
            </p>

            {/* Quick info badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <Eye className="w-3 h-3" />
                Anonymous by default
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                <BarChart3 className="w-3 h-3" />
                No ads or tracking
              </span>
            </div>

            {/* Expandable details */}
            {!showDetails ? (
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline underline-offset-2 mb-4"
              >
                What data do you collect?
              </button>
            ) : (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Analytics Details
                </h4>
                
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-1 bg-emerald-500 rounded-full flex-shrink-0" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">Anonymous Mode (Always On)</strong>
                      <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                        Cookieless page views, basic engagement metrics. No persistent identifiers.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-1 bg-blue-500 rounded-full flex-shrink-0" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">Enhanced Mode (With Consent)</strong>
                      <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                        Session replay, scroll depth, time on page, returning visitor recognition.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-1 bg-red-400 rounded-full flex-shrink-0" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">Never Collected</strong>
                      <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                        Names, emails, passwords, payment info. All IPs are anonymized.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Read our{' '}
                    <a href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</a>
                    {' '}and{' '}
                    <a href="/cookies" className="text-emerald-600 dark:text-emerald-400 hover:underline">Cookie Policy</a>
                    {' '}for full details. Withdraw consent anytime via browser settings.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={acceptCookies}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
              >
                Accept Enhanced Analytics
              </button>
              <button
                onClick={rejectCookies}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
              >
                Anonymous Only
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={rejectCookies}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
            aria-label="Close (use anonymous mode)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
