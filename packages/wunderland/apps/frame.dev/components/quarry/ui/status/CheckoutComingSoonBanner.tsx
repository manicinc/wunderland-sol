/**
 * Banner indicating site is WIP/demo, launching March 2026
 * @module quarry/ui/CheckoutComingSoonBanner
 */

'use client'

import React, { useState } from 'react'
import { X, Calendar, AlertTriangle } from 'lucide-react'

interface CheckoutComingSoonBannerProps {
  /** Dismiss callback */
  onDismiss?: () => void
}

/**
 * Shows banner indicating site is WIP/demo, launching March 2026
 *
 * @remarks
 * - Dismissible for current session only (reappears on reload)
 * - Shows on all quarry pages
 */
export default function CheckoutComingSoonBanner({
  onDismiss,
}: CheckoutComingSoonBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-40 border-b border-amber-300 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0" />

        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <span className="font-semibold">Demo version</span>
            {' '}&mdash; This site is a work in progress. Full launch coming{' '}
            <span className="inline-flex items-center gap-1 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              March 2026
            </span>
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        </button>
      </div>
    </div>
  )
}
