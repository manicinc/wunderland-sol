/**
 * CoverMigrationProvider
 * @module lib/migration/CoverMigrationProvider
 *
 * React context provider that handles automatic cover migration on app init.
 * Runs once on first load if migration hasn't been completed.
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useCoverMigration } from './useCoverMigration'
import {
  getMigrationState,
  needsCover,
  type MigrationProgress,
  type MigrationResult,
} from './coverMigration'
import {
  getAllWeaves,
  getAllLooms,
  batchUpdateWeaveCovers,
  batchUpdateLoomCovers,
  type WeaveRecord,
  type LoomRecord,
} from '@/lib/codexDatabase'

// ============================================================================
// TYPES
// ============================================================================

interface CoverMigrationContextValue {
  /** Whether migration is currently running */
  isRunning: boolean
  /** Current migration progress */
  progress: MigrationProgress | null
  /** Whether initial migration has completed */
  isMigrationComplete: boolean
  /** Any error that occurred */
  error: string | null
  /** Manually trigger migration for all items */
  runMigration: () => Promise<void>
  /** Regenerate covers for specific weaves/looms */
  regenerateCovers: (weaveIds?: string[], loomIds?: string[]) => Promise<void>
}

const CoverMigrationContext = createContext<CoverMigrationContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface CoverMigrationProviderProps {
  children: React.ReactNode
  /** Whether to auto-run migration on mount (default: true) */
  autoRun?: boolean
  /** Delay before running migration (ms, default: 2000) */
  delay?: number
}

export function CoverMigrationProvider({
  children,
  autoRun = true,
  delay = 2000,
}: CoverMigrationProviderProps) {
  const { migrateAll, migrateItems, isMigrationComplete, error, isRunning, progress, isWorkerReady } = useCoverMigration()
  const [hasRunAuto, setHasRunAuto] = useState(false)
  const runningRef = useRef(false)

  // Run auto-migration on mount
  useEffect(() => {
    if (!autoRun || hasRunAuto || runningRef.current) return
    
    // Check if migration already completed
    const state = getMigrationState()
    if (state.completed) {
      setHasRunAuto(true)
      return
    }

    // Wait for worker to be ready and delay
    const timer = setTimeout(async () => {
      if (runningRef.current) return
      runningRef.current = true
      
      try {
        // Load all weaves and looms
        const [weaves, looms] = await Promise.all([
          getAllWeaves(),
          getAllLooms(),
        ])

        // Filter to items needing covers
        const weavesNeedingCovers = weaves.filter(w => needsCover(w))
        const loomsNeedingCovers = looms.filter(l => needsCover(l))

        if (weavesNeedingCovers.length === 0 && loomsNeedingCovers.length === 0) {
          // Nothing to migrate
          setHasRunAuto(true)
          runningRef.current = false
          return
        }

        console.log(`[CoverMigration] Auto-migrating ${weavesNeedingCovers.length} weaves and ${loomsNeedingCovers.length} looms`)

        // Run migration
        const results = await migrateAll(weavesNeedingCovers, loomsNeedingCovers)

        // Save results to database
        const weaveUpdates = results
          .filter(r => r.success && r.type === 'weave')
          .map(r => ({
            id: r.id,
            coverImage: r.coverImage,
            coverPattern: r.coverPattern,
            coverColor: r.coverColor,
          }))

        const loomUpdates = results
          .filter(r => r.success && r.type === 'loom')
          .map(r => ({
            id: r.id,
            coverImage: r.coverImage,
            coverPattern: r.coverPattern,
            coverColor: r.coverColor,
          }))

        if (weaveUpdates.length > 0) {
          await batchUpdateWeaveCovers(weaveUpdates)
        }
        if (loomUpdates.length > 0) {
          await batchUpdateLoomCovers(loomUpdates)
        }

        console.log(`[CoverMigration] Completed: ${weaveUpdates.length} weaves, ${loomUpdates.length} looms updated`)
      } catch (err) {
        console.error('[CoverMigration] Auto-migration failed:', err)
      } finally {
        setHasRunAuto(true)
        runningRef.current = false
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [autoRun, delay, hasRunAuto, migrateAll])

  // Manual run migration
  const runMigration = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true

    try {
      const [weaves, looms] = await Promise.all([
        getAllWeaves(),
        getAllLooms(),
      ])

      const results = await migrateAll(weaves, looms, { forceRegenerate: true })

      // Save to database
      const weaveUpdates = results
        .filter(r => r.success && r.type === 'weave')
        .map(r => ({
          id: r.id,
          coverImage: r.coverImage,
          coverPattern: r.coverPattern,
          coverColor: r.coverColor,
        }))

      const loomUpdates = results
        .filter(r => r.success && r.type === 'loom')
        .map(r => ({
          id: r.id,
          coverImage: r.coverImage,
          coverPattern: r.coverPattern,
          coverColor: r.coverColor,
        }))

      if (weaveUpdates.length > 0) {
        await batchUpdateWeaveCovers(weaveUpdates)
      }
      if (loomUpdates.length > 0) {
        await batchUpdateLoomCovers(loomUpdates)
      }
    } finally {
      runningRef.current = false
    }
  }, [migrateAll])

  // Regenerate specific items
  const regenerateCovers = useCallback(async (weaveIds?: string[], loomIds?: string[]) => {
    if (runningRef.current) return
    runningRef.current = true

    try {
      const [allWeaves, allLooms] = await Promise.all([
        getAllWeaves(),
        getAllLooms(),
      ])

      const weaves = weaveIds 
        ? allWeaves.filter(w => weaveIds.includes(w.id))
        : []
      const looms = loomIds
        ? allLooms.filter(l => loomIds.includes(l.id))
        : []

      const items: Array<{ item: WeaveRecord | LoomRecord; type: 'weave' | 'loom' }> = [
        ...weaves.map(w => ({ item: w, type: 'weave' as const })),
        ...looms.map(l => ({ item: l, type: 'loom' as const })),
      ]

      if (items.length === 0) return

      const results = await migrateItems(items, { forceRegenerate: true })

      // Save to database
      const weaveUpdates = results
        .filter(r => r.success && r.type === 'weave')
        .map(r => ({
          id: r.id,
          coverImage: r.coverImage,
          coverPattern: r.coverPattern,
          coverColor: r.coverColor,
        }))

      const loomUpdates = results
        .filter(r => r.success && r.type === 'loom')
        .map(r => ({
          id: r.id,
          coverImage: r.coverImage,
          coverPattern: r.coverPattern,
          coverColor: r.coverColor,
        }))

      if (weaveUpdates.length > 0) {
        await batchUpdateWeaveCovers(weaveUpdates)
      }
      if (loomUpdates.length > 0) {
        await batchUpdateLoomCovers(loomUpdates)
      }
    } finally {
      runningRef.current = false
    }
  }, [migrateItems])

  const value: CoverMigrationContextValue = {
    isRunning,
    progress,
    isMigrationComplete,
    error,
    runMigration,
    regenerateCovers,
  }

  return (
    <CoverMigrationContext.Provider value={value}>
      {children}
    </CoverMigrationContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useCoverMigrationContext(): CoverMigrationContextValue {
  const context = useContext(CoverMigrationContext)
  if (!context) {
    throw new Error('useCoverMigrationContext must be used within a CoverMigrationProvider')
  }
  return context
}

export default CoverMigrationProvider

