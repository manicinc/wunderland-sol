/**
 * Banner showing public demo limitations
 * @module codex/ui/PublicDemoBanner
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Info, X, Cloud, Database } from 'lucide-react'
import { isPublicAccess } from '@/lib/config/publicAccess'

interface PublicDemoBannerProps {
  /** Open settings callback */
  onOpenSettings?: () => void
  /** Dismiss callback */
  onDismiss?: () => void
}

/**
 * Shows public demo limitations banner
 *
 * @remarks
 * - Only shows when isPublicAccess() returns true
 * - Dismissible with localStorage persistence
 * - Informs users about OAuth/integration limitations
 */
export default function PublicDemoBanner({
  onOpenSettings,
  onDismiss,
}: PublicDemoBannerProps) {
  const [dismissed, setDismissed] = useState(true)
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    const key = 'codex-public-demo-dismissed'
    const wasDismissed = localStorage.getItem(key) === 'true'
    const publicMode = isPublicAccess()
    setIsPublic(publicMode)
    setDismissed(wasDismissed || !publicMode)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('codex-public-demo-dismissed', 'true')
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed || !isPublic) return null

  return (
    <div className="border-b border-sky-300 dark:border-sky-800 bg-gradient-to-r from-sky-50 to-sky-100 dark:from-sky-950 dark:to-sky-900 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-700 dark:text-sky-400 flex-shrink-0 mt-0.5" />

        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
            Public Demo Mode
          </p>

          <div className="space-y-1.5 text-xs text-sky-800 dark:text-sky-200">
            <div className="flex items-start gap-2">
              <span className="font-mono bg-sky-200 dark:bg-sky-900 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                OAuth
              </span>
              <span>
                OAuth connections and integrations (Google Calendar, etc.) are
                <strong className="ml-1">limited in this public demo</strong>.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-mono bg-sky-200 dark:bg-sky-900 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Database className="w-3 h-3" />
                Storage
              </span>
              <span>
                Changes are saved <strong>locally in your browser</strong> only, not published to the cloud.
                Data may be lost if you clear your browser cache.
              </span>
            </div>
          </div>

          {onOpenSettings && (
            <div className="flex items-center gap-3 text-xs pt-1">
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 text-sky-900 dark:text-sky-100 hover:text-sky-700 dark:hover:text-sky-300 font-semibold underline underline-offset-2"
              >
                Learn more about self-hosting
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-sky-200 dark:hover:bg-sky-800 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-sky-700 dark:text-sky-400" />
        </button>
      </div>
    </div>
  )
}
