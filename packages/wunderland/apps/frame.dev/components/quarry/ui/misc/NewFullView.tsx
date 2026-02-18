'use client'

console.log('[NewFullView] MODULE LOADING START', Date.now())

/**
 * NewFullView - Full-featured strand creation wizard
 * @module codex/ui/NewFullView
 *
 * @description
 * Rendered when QuarryViewer has initialView='new'.
 * Contains the StrandCreatorClient for creating new strands.
 */

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Home, AlertTriangle, RefreshCw } from 'lucide-react'
import React, { Component, ReactNode } from 'react'

/**
 * Error boundary specifically for the strand creator
 * Shows a friendly error UI instead of crashing
 */
class CreatorErrorBoundary extends Component<
  { children: ReactNode; isDark?: boolean },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; isDark?: boolean }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CreatorErrorBoundary] Caught error:', error)
    console.error('[CreatorErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const isDark = this.props.isDark
      return (
        <div className={`flex-1 flex items-center justify-center p-8 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
          <div className="text-center max-w-md">
            <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-amber-500' : 'text-amber-600'}`} />
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Failed to load creator
            </h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {this.state.error?.message || 'Something went wrong while loading the strand creator.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </button>
              <Link
                href="/quarry"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
                }`}
              >
                <Home className="w-4 h-4" />
                Go home
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Dynamic import to avoid SSR issues with client-side NLP
console.log('[NewFullView] Setting up StrandCreatorClient dynamic import...', Date.now())
const StrandCreatorClient = dynamic(
  () => {
    console.log('[NewFullView] Dynamic import STARTING for StrandCreatorClient...', Date.now())
    return import('@/app/quarry/new/StrandCreatorClient').then(mod => {
      console.log('[NewFullView] Dynamic import COMPLETED for StrandCreatorClient', Date.now())
      return mod
    })
  },
  {
    ssr: false,
    loading: () => {
      console.log('[NewFullView] Showing loading spinner for StrandCreatorClient', Date.now())
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">Loading creator...</p>
          </div>
        </div>
      )
    },
  }
)
console.log('[NewFullView] StrandCreatorClient dynamic import registered', Date.now())

interface NewFullViewProps {
  theme?: string
  onOpenPreferences?: () => void
  onNavigateToStrand?: (path: string) => void
}

// Dark themes
const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

console.log('[NewFullView] All module-level code done', Date.now())

export default function NewFullView({ theme = 'light', onOpenPreferences, onNavigateToStrand }: NewFullViewProps) {
  console.log('[NewFullView] RENDER START', Date.now())
  const isDark = DARK_THEMES.includes(theme)

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      {/* Content - Allow full scrolling */}
      <div className="flex-1 overflow-y-auto">
        <CreatorErrorBoundary isDark={isDark}>
          <StrandCreatorClient />
        </CreatorErrorBoundary>
      </div>
    </div>
  )
}
