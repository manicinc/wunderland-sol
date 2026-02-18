'use client'

/**
 * AnalyticsFullView - Analytics dashboard view
 * @module codex/ui/AnalyticsFullView
 *
 * @description
 * Rendered when QuarryViewer has initialView='analytics'.
 * Contains the full analytics dashboard.
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Home, Loader2 } from 'lucide-react'
import { AnalyticsPage } from '@/components/quarry/analytics'

interface AnalyticsFullViewProps {
  theme?: string
  onOpenPreferences?: () => void
  onNavigateToStrand?: (path: string) => void
}

// Dark themes
const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
    </div>
  )
}

export default function AnalyticsFullView({ theme = 'light', onOpenPreferences, onNavigateToStrand }: AnalyticsFullViewProps) {
  const isDark = DARK_THEMES.includes(theme)

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b shrink-0 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Analytics
            </h1>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Track your content growth and engagement
            </p>
          </div>
          <Link
            href="/quarry"
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
            }`}
            title="Back to Codex"
          >
            <Home className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <Suspense fallback={<LoadingState />}>
            <AnalyticsPage />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
