/**
 * Cover Migration Service
 * @module lib/migration/coverMigration
 *
 * Handles automatic cover generation for existing weaves/looms
 * that don't have cover images assigned.
 */

import { 
  generateCollectionCoverDataUrl, 
  getPatternFromSeed,
  type CoverPattern 
} from '@/lib/collections/coverGenerator'
import type { WeaveRecord, LoomRecord } from '@/lib/codexDatabase'
import type { CoverAnalysisJob, CoverAnalysisResult } from '@/lib/workers/coverAnalyzer.worker'

// ============================================================================
// TYPES
// ============================================================================

export interface MigrationProgress {
  total: number
  processed: number
  succeeded: number
  failed: number
  current?: string
}

export interface MigrationResult {
  id: string
  type: 'weave' | 'loom'
  success: boolean
  coverImage?: string
  coverPattern?: string
  coverColor?: string
  error?: string
}

export interface MigrationOptions {
  /** Only process items without covers */
  onlyMissing?: boolean
  /** Force regenerate all covers */
  forceRegenerate?: boolean
  /** Callback for progress updates */
  onProgress?: (progress: MigrationProgress) => void
  /** Callback for each result */
  onResult?: (result: MigrationResult) => void
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

/**
 * Check if a weave/loom needs a cover generated
 */
export function needsCover(item: WeaveRecord | LoomRecord): boolean {
  return !item.coverImage && !item.coverPattern
}

/**
 * Generate cover data for a single item
 */
export function generateCoverForItem(
  item: WeaveRecord | LoomRecord,
  analysisResult?: CoverAnalysisResult
): { coverImage: string; coverPattern: CoverPattern; coverColor: string } {
  // Use analysis result if available, otherwise generate deterministically
  const seed = item.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  const pattern = (analysisResult?.suggestedPattern as CoverPattern) || getPatternFromSeed(seed)
  const color = analysisResult?.suggestedColor || getDefaultColorForSeed(seed)
  
  const coverImage = generateCollectionCoverDataUrl({
    pattern,
    primaryColor: color,
    seed,
  })
  
  return {
    coverImage,
    coverPattern: pattern,
    coverColor: color,
  }
}

/**
 * Get default color for a seed value
 */
function getDefaultColorForSeed(seed: number): string {
  const colors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#3b82f6', // Blue
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
    '#22c55e', // Green
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ec4899', // Pink
    '#f43f5e', // Rose
  ]
  return colors[seed % colors.length]
}

/**
 * Create an analysis job from a weave/loom record
 */
export function createAnalysisJob(
  item: WeaveRecord | LoomRecord,
  type: 'weave' | 'loom'
): CoverAnalysisJob {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    existingTags: [], // Could be enhanced to include actual tags
  }
}

/**
 * Migrate covers for a batch of items using web worker analysis
 */
export async function migrateCoversWithAnalysis(
  items: Array<{ item: WeaveRecord | LoomRecord; type: 'weave' | 'loom' }>,
  analysisResults: CoverAnalysisResult[],
  options?: MigrationOptions
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = []
  const resultMap = new Map<string, CoverAnalysisResult>()
  
  // Build lookup map for analysis results
  analysisResults.forEach(result => {
    resultMap.set(result.id, result)
  })
  
  const progress: MigrationProgress = {
    total: items.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
  }
  
  for (const { item, type } of items) {
    try {
      // Skip if has cover and not forcing
      if (!options?.forceRegenerate && !needsCover(item)) {
        progress.processed++
        continue
      }
      
      progress.current = item.name
      options?.onProgress?.(progress)
      
      // Get analysis result for this item
      const analysis = resultMap.get(item.id)
      
      // Generate cover
      const coverData = generateCoverForItem(item, analysis)
      
      const result: MigrationResult = {
        id: item.id,
        type,
        success: true,
        ...coverData,
      }
      
      results.push(result)
      options?.onResult?.(result)
      
      progress.processed++
      progress.succeeded++
    } catch (error) {
      const result: MigrationResult = {
        id: item.id,
        type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      
      results.push(result)
      options?.onResult?.(result)
      
      progress.processed++
      progress.failed++
    }
    
    options?.onProgress?.(progress)
  }
  
  return results
}

/**
 * Simple migration without NLP analysis (faster, uses deterministic generation)
 */
export function migrateCoversSimple(
  items: Array<{ item: WeaveRecord | LoomRecord; type: 'weave' | 'loom' }>,
  options?: MigrationOptions
): MigrationResult[] {
  const results: MigrationResult[] = []
  
  const progress: MigrationProgress = {
    total: items.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
  }
  
  for (const { item, type } of items) {
    try {
      // Skip if has cover and not forcing
      if (!options?.forceRegenerate && !needsCover(item)) {
        progress.processed++
        continue
      }
      
      progress.current = item.name
      options?.onProgress?.(progress)
      
      // Generate cover without analysis
      const coverData = generateCoverForItem(item)
      
      const result: MigrationResult = {
        id: item.id,
        type,
        success: true,
        ...coverData,
      }
      
      results.push(result)
      options?.onResult?.(result)
      
      progress.processed++
      progress.succeeded++
    } catch (error) {
      const result: MigrationResult = {
        id: item.id,
        type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      
      results.push(result)
      options?.onResult?.(result)
      
      progress.processed++
      progress.failed++
    }
    
    options?.onProgress?.(progress)
  }
  
  return results
}

// ============================================================================
// MIGRATION STORAGE KEY
// ============================================================================

const MIGRATION_KEY = 'codex-cover-migration-v1'

export interface MigrationState {
  /** Has the initial migration been run? */
  completed: boolean
  /** When was the migration last run? */
  lastRun?: string
  /** How many items were migrated? */
  itemCount?: number
  /** Version of the migration */
  version: number
}

/**
 * Get migration state from local storage
 */
export function getMigrationState(): MigrationState {
  if (typeof window === 'undefined') {
    return { completed: false, version: 1 }
  }
  
  try {
    const stored = localStorage.getItem(MIGRATION_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  
  return { completed: false, version: 1 }
}

/**
 * Save migration state to local storage
 */
export function saveMigrationState(state: MigrationState): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(MIGRATION_KEY, JSON.stringify(state))
  } catch {
    console.error('[coverMigration] Failed to save migration state')
  }
}

/**
 * Mark migration as completed
 */
export function markMigrationComplete(itemCount: number): void {
  saveMigrationState({
    completed: true,
    lastRun: new Date().toISOString(),
    itemCount,
    version: 1,
  })
}

/**
 * Reset migration state (for testing or re-running)
 */
export function resetMigrationState(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(MIGRATION_KEY)
  } catch {
    // Ignore errors
  }
}

