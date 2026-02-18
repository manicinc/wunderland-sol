/**
 * useCoverMigration Hook
 * @module lib/migration/useCoverMigration
 *
 * React hook for triggering and monitoring cover migration.
 * Integrates with the cover analyzer web worker for NLP-based suggestions.
 */

import { useCallback, useEffect, useState } from 'react'
import { useCoverAnalyzer } from '@/lib/workers/useCoverAnalyzer'
import { 
  createAnalysisJob,
  getMigrationState,
  markMigrationComplete,
  migrateCoversSimple,
  migrateCoversWithAnalysis,
  needsCover,
  resetMigrationState,
  type MigrationProgress,
  type MigrationResult,
  type MigrationOptions,
} from './coverMigration'
import type { WeaveRecord, LoomRecord } from '@/lib/codexDatabase'

// ============================================================================
// TYPES
// ============================================================================

export interface UseCoverMigrationReturn {
  /** Run migration for all items without covers */
  migrateAll: (
    weaves: WeaveRecord[],
    looms: LoomRecord[],
    options?: MigrationOptions
  ) => Promise<MigrationResult[]>
  
  /** Run migration for specific items */
  migrateItems: (
    items: Array<{ item: WeaveRecord | LoomRecord; type: 'weave' | 'loom' }>,
    options?: MigrationOptions
  ) => Promise<MigrationResult[]>
  
  /** Regenerate cover for a single item */
  regenerateCover: (
    item: WeaveRecord | LoomRecord,
    type: 'weave' | 'loom'
  ) => Promise<MigrationResult>
  
  /** Check if migration has been run */
  isMigrationComplete: boolean
  
  /** Reset migration state */
  resetMigration: () => void
  
  /** Current migration progress */
  progress: MigrationProgress | null
  
  /** Whether migration is currently running */
  isRunning: boolean
  
  /** Any error during migration */
  error: string | null
  
  /** Whether NLP worker is ready */
  isWorkerReady: boolean
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCoverMigration(): UseCoverMigrationReturn {
  const { analyze, analyzeBatch, isReady: isWorkerReady, error: workerError } = useCoverAnalyzer()
  
  const [isMigrationComplete, setIsMigrationComplete] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Check migration state on mount
  useEffect(() => {
    const state = getMigrationState()
    setIsMigrationComplete(state.completed)
  }, [])
  
  // Migrate all items
  const migrateAll = useCallback(async (
    weaves: WeaveRecord[],
    looms: LoomRecord[],
    options?: MigrationOptions
  ): Promise<MigrationResult[]> => {
    setIsRunning(true)
    setError(null)
    
    try {
      // Combine all items
      const items: Array<{ item: WeaveRecord | LoomRecord; type: 'weave' | 'loom' }> = [
        ...weaves.map(w => ({ item: w, type: 'weave' as const })),
        ...looms.map(l => ({ item: l, type: 'loom' as const })),
      ]
      
      // Filter to only items needing covers (unless forcing)
      const itemsToProcess = options?.forceRegenerate 
        ? items 
        : items.filter(({ item }) => needsCover(item))
      
      if (itemsToProcess.length === 0) {
        setIsRunning(false)
        markMigrationComplete(0)
        setIsMigrationComplete(true)
        return []
      }
      
      // Create analysis jobs
      const jobs = itemsToProcess.map(({ item, type }) => createAnalysisJob(item, type))
      
      let results: MigrationResult[]
      
      if (isWorkerReady) {
        // Use web worker for NLP analysis
        const analysisResults = await analyzeBatch(jobs)
        
        results = await migrateCoversWithAnalysis(
          itemsToProcess,
          analysisResults,
          {
            ...options,
            onProgress: (p) => {
              setProgress(p)
              options?.onProgress?.(p)
            },
          }
        )
      } else {
        // Fallback to simple generation
        results = migrateCoversSimple(itemsToProcess, {
          ...options,
          onProgress: (p) => {
            setProgress(p)
            options?.onProgress?.(p)
          },
        })
      }
      
      // Mark migration complete
      markMigrationComplete(results.length)
      setIsMigrationComplete(true)
      
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Migration failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsRunning(false)
      setProgress(null)
    }
  }, [analyzeBatch, isWorkerReady])
  
  // Migrate specific items
  const migrateItems = useCallback(async (
    items: Array<{ item: WeaveRecord | LoomRecord; type: 'weave' | 'loom' }>,
    options?: MigrationOptions
  ): Promise<MigrationResult[]> => {
    setIsRunning(true)
    setError(null)
    
    try {
      const jobs = items.map(({ item, type }) => createAnalysisJob(item, type))
      
      let results: MigrationResult[]
      
      if (isWorkerReady) {
        const analysisResults = await analyzeBatch(jobs)
        results = await migrateCoversWithAnalysis(items, analysisResults, {
          ...options,
          forceRegenerate: true,
          onProgress: (p) => {
            setProgress(p)
            options?.onProgress?.(p)
          },
        })
      } else {
        results = migrateCoversSimple(items, {
          ...options,
          forceRegenerate: true,
          onProgress: (p) => {
            setProgress(p)
            options?.onProgress?.(p)
          },
        })
      }
      
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Migration failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsRunning(false)
      setProgress(null)
    }
  }, [analyzeBatch, isWorkerReady])
  
  // Regenerate single cover
  const regenerateCover = useCallback(async (
    item: WeaveRecord | LoomRecord,
    type: 'weave' | 'loom'
  ): Promise<MigrationResult> => {
    setError(null)
    
    try {
      const job = createAnalysisJob(item, type)
      
      if (isWorkerReady) {
        const analysisResult = await analyze(job)
        const results = await migrateCoversWithAnalysis(
          [{ item, type }],
          [analysisResult],
          { forceRegenerate: true }
        )
        return results[0]
      } else {
        const results = migrateCoversSimple(
          [{ item, type }],
          { forceRegenerate: true }
        )
        return results[0]
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cover generation failed'
      setError(errorMessage)
      throw err
    }
  }, [analyze, isWorkerReady])
  
  // Reset migration
  const resetMigration = useCallback(() => {
    resetMigrationState()
    setIsMigrationComplete(false)
  }, [])
  
  return {
    migrateAll,
    migrateItems,
    regenerateCover,
    isMigrationComplete,
    resetMigration,
    progress,
    isRunning,
    error: error || workerError,
    isWorkerReady,
  }
}

export default useCoverMigration

