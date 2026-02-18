'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * QuarryUrlCleanup
 *
 * On quarry.space domain, cleans up the URL to remove the /quarry prefix.
 *
 * URL mappings on quarry.space:
 * - /quarry → /
 * - /quarry/landing → /
 * - /quarry/write → /write
 * - /quarry/plan → /plan
 * - /quarry/reflect → /reflect
 * - /quarry/about → /about
 */
export default function QuarryUrlCleanup() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const host = window.location.hostname
    const isQuarryDomain = host === 'quarry.space' || host.endsWith('.quarry.space') ||
                           host === 'quarry.dev' || host.endsWith('.quarry.dev')

    if (!isQuarryDomain) return

    const path = window.location.pathname
    if (!path.startsWith('/quarry')) return

    let newPath = path

    // /quarry → /
    if (path === '/quarry' || path === '/quarry/') {
      newPath = '/'
    }
    // /quarry/landing → /
    else if (path.startsWith('/quarry/landing')) {
      newPath = path.replace('/quarry/landing', '') || '/'
    }
    // All other /quarry/* paths → /* (just remove /quarry prefix)
    else if (path.startsWith('/quarry/')) {
      newPath = path.replace('/quarry', '')
    }

    if (newPath !== path) {
      const newUrl = newPath + window.location.search + window.location.hash
      window.history.replaceState(null, '', newUrl)
    }
  }, [pathname])

  return null
}
