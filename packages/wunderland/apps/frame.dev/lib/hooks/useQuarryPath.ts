/**
 * Hook for domain-aware Quarry paths
 * @module lib/hooks/useQuarryPath
 *
 * Automatically adjusts paths based on whether the app is running on:
 * - quarry.space: removes /quarry prefix (e.g., /quarry/about → /about)
 * - frame.dev: keeps /quarry prefix (e.g., /quarry/about stays the same)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { isQuarryDomain, resolveQuarryPath } from '@/lib/utils/deploymentMode'

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
