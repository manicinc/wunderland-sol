/**
 * Banner showing GitHub API status and PAT configuration hints
 * @module codex/ui/ApiStatusBanner
 */

'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, Check, Settings, X } from 'lucide-react'

interface ApiStatusBannerProps {
  /** Whether GraphQL is available */
  graphqlAvailable: boolean
  /** Whether search index is available */
  searchAvailable: boolean
  /** Semantic search status */
  semanticStatus?: 'ready' | 'degraded' | 'offline'
  /** Open settings callback */
  onOpenSettings?: () => void
  /** Dismiss callback */
  onDismiss?: () => void
}

/**
 * Shows API status and helpful hints for configuring GitHub PAT
 * 
 * @remarks
 * - Only shows if GraphQL OR search is unavailable
 * - Auto-dismisses after first view (stored in localStorage)
 * - Links to Settings modal for PAT configuration
 */
export default function ApiStatusBanner({
  graphqlAvailable,
  searchAvailable,
  semanticStatus = 'ready',
  onOpenSettings,
  onDismiss,
}: ApiStatusBannerProps) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const key = 'codex-api-status-dismissed'
    const wasDismissed = localStorage.getItem(key) === 'true'
    const semanticHealthy = semanticStatus === 'ready'
    setDismissed(wasDismissed || (graphqlAvailable && searchAvailable && semanticHealthy))
  }, [graphqlAvailable, searchAvailable, semanticStatus])

  const handleDismiss = () => {
    localStorage.setItem('codex-api-status-dismissed', 'true')
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed) return null

  const showGraphqlWarning = !graphqlAvailable
  const showSearchWarning = !searchAvailable
  const showSemanticWarning = semanticStatus !== 'ready'

  return (
    <div className="border-b border-amber-300 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Limited API Access
          </p>
          
          <div className="space-y-1.5 text-xs text-amber-800 dark:text-amber-200">
            {showGraphqlWarning && (
              <div className="flex items-start gap-2">
                <span className="font-mono bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                  GraphQL
                </span>
                <span>
                  GitHub GraphQL API unavailable (403). Falling back to REST API. 
                  <strong className="ml-1">Rate limit: 60 requests/hour.</strong>
                </span>
              </div>
            )}
            
            {showSearchWarning && (
              <div className="flex items-start gap-2">
                <span className="font-mono bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                  Search
                </span>
                <span>
                  Semantic search index not available. Using file-name search only.
                </span>
              </div>
            )}

            {showSemanticWarning && (
              <div className="flex items-start gap-2">
                <span className="font-mono bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                  Q&A
                </span>
                <span>
                  {semanticStatus === 'offline'
                    ? 'Q&A assistant is offline until the MiniLM model downloads.'
                    : 'Q&A assistant is running in lexical fallback mode.'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            {onOpenSettings ? (
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 text-amber-900 dark:text-amber-100 hover:text-amber-700 dark:hover:text-amber-300 font-semibold underline underline-offset-2"
              >
                <Settings className="w-3.5 h-3.5" />
                Configure GitHub PAT (5,000 requests/hr)
              </button>
            ) : (
              <a
                href="https://github.com/settings/tokens/new?description=Frame%20Codex%20Viewer&scopes=public_repo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-amber-900 dark:text-amber-100 hover:text-amber-700 dark:hover:text-amber-300 font-semibold underline underline-offset-2"
              >
                <Settings className="w-3.5 h-3.5" />
                Generate GitHub PAT →
              </a>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        </button>
      </div>
    </div>
  )
}

