/**
 * Import Manager
 * @module lib/import-export/core/ImportManager
 *
 * Orchestrates the import process by delegating to format-specific converters.
 * Manages conflict resolution, progress tracking, and error aggregation.
 */

import type {
  ImportFormat,
  ImportOptions,
  ImportResult,
  ImportConflict,
  ConflictResolution,
  IConverter,
} from './types'
import { getContentStore } from '@/lib/content/sqliteStore'
import { processStrandBlocks } from '@/lib/nlp/blockProcessor'
import type { TagContext } from '@/lib/nlp/autoTagging'
import type { StrandMetadata } from '@/components/quarry/types'

// ============================================================================
// IMPORT MANAGER
// ============================================================================

export class ImportManager {
  /**
   * Registered converters by format
   */
  private converters: Map<ImportFormat, IConverter> = new Map()

  /**
   * Conflict resolutions from user
   */
  private conflictResolutions: Map<string, ConflictResolution> = new Map()

  /**
   * Statistics
   */
  private stats = {
    imported: 0,
    skipped: 0,
    conflicts: 0,
    errors: 0,
  }

  // ==========================================================================
  // CONVERTER REGISTRATION
  // ==========================================================================

  /**
   * Register a converter for a format
   */
  registerConverter(format: ImportFormat, converter: IConverter): void {
    if (!converter.supportsImport.includes(format)) {
      throw new Error(
        `Converter ${converter.name} does not support import format: ${format}`
      )
    }
    this.converters.set(format, converter)
  }

  /**
   * Get converter for format
   */
  private getConverter(format: ImportFormat): IConverter {
    const converter = this.converters.get(format)
    if (!converter) {
      throw new Error(`No converter registered for format: ${format}`)
    }
    return converter
  }

  // ==========================================================================
  // IMPORT OPERATIONS
  // ==========================================================================

  /**
   * Import content from file(s)
   */
  async import(
    input: File | Blob | string,
    options: Partial<ImportOptions>
  ): Promise<ImportResult> {
    const startTime = Date.now()

    // Merge with defaults
    const opts: ImportOptions = {
      format: options.format || 'markdown',
      conflictResolution: options.conflictResolution || 'ask',
      preserveStructure: options.preserveStructure !== false,
      importUserData: options.importUserData !== false,
      ...options,
    }

    // Reset stats
    this.stats = { imported: 0, skipped: 0, conflicts: 0, errors: 0 }
    this.conflictResolutions.clear()

    try {
      // Get appropriate converter
      const converter = this.getConverter(opts.format)

      // Validate input
      const canProcess = await converter.canProcess(input)
      if (!canProcess) {
        throw new Error(
          `Input cannot be processed by ${converter.name} converter`
        )
      }

      // Set progress callback if converter supports it
      if (opts.onProgress && 'setProgressCallback' in converter) {
        (converter as { setProgressCallback: (cb: typeof opts.onProgress) => void }).setProgressCallback(opts.onProgress)
      }

      // Perform import
      const result = await converter.import(input, opts)

      // Update statistics
      this.stats.imported = result.statistics.strandsImported
      this.stats.skipped = result.statistics.strandsSkipped
      this.stats.conflicts = result.statistics.strandsConflicted
      this.stats.errors = result.errors?.length || 0

      // Rebuild search index if strands were imported
      if (result.statistics.strandsImported > 0) {
        opts.onProgress?.(90, 100, 'Rebuilding search index...')
        const store = getContentStore()
        await store.rebuildSearchIndex()

        // Process block-level tags for imported strands
        if (opts.processBlocks !== false && result.strandIds.length > 0) {
          opts.onProgress?.(92, 100, 'Processing block-level tags...')
          await this.processImportedBlocks(result.strandIds, store, opts.onProgress)
        }
      }

      opts.onProgress?.(100, 100, 'Import complete')

      return {
        ...result,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        statistics: {
          strandsImported: this.stats.imported,
          strandsSkipped: this.stats.skipped,
          strandsConflicted: this.stats.conflicts,
          assetsImported: 0,
          errors: this.stats.errors + 1,
        },
        strandIds: [],
        errors: [
          {
            type: 'convert',
            message: errorMessage,
          },
        ],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Batch import multiple files
   */
  async importBatch(
    files: File[],
    options: Partial<ImportOptions>
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Wrap progress callback to include batch progress
      const originalProgress = options.onProgress
      const batchProgress = (current: number, total: number, message?: string) => {
        const overallProgress = ((i * 100 + current) / files.length)
        originalProgress?.(
          overallProgress,
          100,
          message || `Importing file ${i + 1}/${files.length}: ${file.name}`
        )
      }

      try {
        const result = await this.import(file, {
          ...options,
          onProgress: batchProgress,
        })
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          statistics: {
            strandsImported: 0,
            strandsSkipped: 0,
            strandsConflicted: 0,
            assetsImported: 0,
            errors: 1,
          },
          strandIds: [],
          errors: [
            {
              type: 'convert',
              message: error instanceof Error ? error.message : 'Unknown error',
              file: file.name,
            },
          ],
          duration: 0,
        })
      }
    }

    return results
  }

  /**
   * Validate import file before importing
   */
  async validate(
    input: File | Blob | string,
    format: ImportFormat
  ): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
    preview?: {
      fileCount: number
      estimatedStrands: number
      totalSize: number
    }
  }> {
    try {
      const converter = this.getConverter(format)
      const canProcess = await converter.canProcess(input)

      if (!canProcess) {
        return {
          valid: false,
          errors: [`Input cannot be processed as ${format} format`],
          warnings: [],
        }
      }

      // TODO: Add format-specific validation and preview generation
      return {
        valid: true,
        errors: [],
        warnings: [],
        preview: {
          fileCount: 0,
          estimatedStrands: 0,
          totalSize: input instanceof Blob ? input.size : 0,
        },
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      }
    }
  }

  // ==========================================================================
  // CONFLICT RESOLUTION
  // ==========================================================================

  /**
   * Set resolution for a conflict
   */
  setConflictResolution(path: string, resolution: ConflictResolution): void {
    this.conflictResolutions.set(path, resolution)
  }

  /**
   * Get resolution for a conflict
   */
  getConflictResolution(path: string): ConflictResolution | undefined {
    return this.conflictResolutions.get(path)
  }

  /**
   * Clear all conflict resolutions
   */
  clearConflictResolutions(): void {
    this.conflictResolutions.clear()
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get import statistics
   */
  getStatistics(): typeof this.stats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = { imported: 0, skipped: 0, conflicts: 0, errors: 0 }
  }

  // ==========================================================================
  // BLOCK PROCESSING
  // ==========================================================================

  /**
   * Process block-level tags for imported strands
   */
  private async processImportedBlocks(
    strandIds: string[],
    store: ReturnType<typeof getContentStore>,
    onProgress?: (current: number, total: number, message?: string) => void
  ): Promise<void> {
    try {
      // Get strands content
      const strands = await store.getStrandsByIds(strandIds)
      if (strands.length === 0) return

      // Get existing tags for context
      const [existingTags, existingSubjects, existingTopics] = await Promise.all([
        store.getAllTags(),
        store.getAllSubjects(),
        store.getAllTopics(),
      ])

      // Process each strand
      let processed = 0
      for (const strand of strands) {
        try {
          // Build tag context for this strand
          // Cast frontmatter to StrandMetadata (different taxonomy shapes are compatible at runtime)
          const metadata = (strand.frontmatter || {}) as unknown as StrandMetadata
          const context: TagContext = {
            existingTags,
            relatedTags: [],
            hierarchyTags: [],
            metadata,
            config: {
              documentAutoTag: true,
              blockAutoTag: true,
              useLLM: false, // Fast NLP-only during import
              preferExistingTags: true,
              confidenceThreshold: 0.6,
            },
            existingSubjects,
            existingTopics,
          }

          // Process blocks
          await processStrandBlocks(
            strand.id,
            strand.path,
            strand.content,
            context,
            {
              persistToDb: true,
              useLLM: false,
              enableTagBubbling: true,
            }
          )

          processed++
          const progress = 92 + Math.round((processed / strands.length) * 7)
          onProgress?.(progress, 100, `Processing blocks ${processed}/${strands.length}...`)
        } catch (error) {
          console.warn(
            `[ImportManager] Failed to process blocks for ${strand.path}:`,
            error
          )
          // Continue with other strands
        }
      }
    } catch (error) {
      console.error('[ImportManager] Failed to process imported blocks:', error)
      // Don't fail the import - blocks can be processed later
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let importManagerInstance: ImportManager | null = null

/**
 * Get singleton ImportManager instance
 */
export function getImportManager(): ImportManager {
  if (!importManagerInstance) {
    importManagerInstance = new ImportManager()
  }
  return importManagerInstance
}

/**
 * Reset ImportManager instance (for testing)
 */
export function resetImportManager(): void {
  importManagerInstance = null
}
