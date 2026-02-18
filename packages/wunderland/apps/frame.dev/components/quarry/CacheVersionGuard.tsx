/**
 * Cache Version Guard
 * @module quarry/CacheVersionGuard
 *
 * Automatically invalidates browser cache when weave/loom structure changes.
 * Compares hash of DEFAULT_WEAVES + DEFAULT_WIKI_LOOMS against stored hash.
 * If mismatch → clears IndexedDB, reloads page.
 *
 * No manual version bumping needed - hash changes automatically when config changes.
 */

'use client'

import { useEffect, useState } from 'react'
import { checkAndInvalidateCache } from '@/lib/utils/cacheReset'

export function CacheVersionGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkStructure() {
      try {
        const wasCleared = await checkAndInvalidateCache()

        if (!mounted) return

        if (wasCleared) {
          // Cache was cleared due to structure change - reload to apply
          console.log('[CacheVersionGuard] Cache cleared, reloading...')
          window.location.reload()
          return
        }

        setReady(true)
      } catch (error) {
        console.error('[CacheVersionGuard] Error checking cache:', error)
        // Continue anyway - don't block app on cache check failure
        if (mounted) setReady(true)
      }
    }

    checkStructure()

    return () => {
      mounted = false
    }
  }, [])

  // Don't block render while checking - it's fast (< 50ms)
  // Only block if we're about to reload
  if (!ready) {
    return null
  }

  return <>{children}</>
}
