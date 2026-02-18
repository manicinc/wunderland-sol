'use client'

/**
 * BrowseFullView - Tag and category browser view
 * @module codex/ui/BrowseFullView
 *
 * @description
 * Redirects to the full browse page.
 * The browse page has complex URL-based filtering that works better standalone.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

interface BrowseFullViewProps {
  theme?: string
  onOpenPreferences?: () => void
  onNavigateToStrand?: (path: string) => void
}

// Dark themes
const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

export default function BrowseFullView({ theme = 'light' }: BrowseFullViewProps) {
  const isDark = DARK_THEMES.includes(theme)
  const router = useRouter()
  const resolvePath = useQuarryPath()

  // Redirect to the full browse page
  useEffect(() => {
    router.push(resolvePath('/quarry/browse'))
  }, [router, resolvePath])

  return (
    <div className={`flex-1 flex flex-col items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      <div className="text-center">
        <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Redirecting to Browse...
        </p>
      </div>
    </div>
  )
}
