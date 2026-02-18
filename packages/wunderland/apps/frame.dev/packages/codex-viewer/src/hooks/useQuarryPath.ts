/**
 * Hook for domain-aware Quarry paths
 * @module codex-viewer/hooks/useQuarryPath
 *
 * Automatically adjusts paths based on whether the app is running on:
 * - quarry.space: removes /quarry prefix (e.g., /quarry/about -> /about)
 * - frame.dev: keeps /quarry prefix (e.g., /quarry/about stays the same)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Check if the application is running on the Quarry standalone domain
 */
function isQuarryDomain(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  return (
    hostname === 'quarry.space' ||
    hostname.endsWith('.quarry.space') ||
    hostname === 'quarry.dev' ||
    hostname.endsWith('.quarry.dev')
  )
}

/**
 * Resolve path based on domain
 */
function resolveQuarryPath(path: string, isOnQuarryDomain: boolean): string {
  if (!isOnQuarryDomain) return path

  if (path === '/quarry') return '/'
  if (path.startsWith('/quarry#')) return path.replace('/quarry#', '/#')
  if (path.startsWith('/quarry/')) return path.replace('/quarry/', '/')

  return path
}

/**
 * Hook that returns a path resolver function for Quarry routes.
 * Automatically detects the domain and adjusts paths accordingly.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const resolvePath = useQuarryPath()
 *
 *   return (
 *     <Link href={resolvePath('/quarry/about')}>About</Link>
 *   )
 * }
 * ```
 */
export function useQuarryPath() {
  const [onQuarryDomain, setOnQuarryDomain] = useState(false)

  useEffect(() => {
    setOnQuarryDomain(isQuarryDomain())
  }, [])

  return useCallback(
    (path: string) => resolveQuarryPath(path, onQuarryDomain),
    [onQuarryDomain]
  )
}

export default useQuarryPath
