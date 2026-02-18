/**
 * Export Manager
 * @module lib/import-export/core/ExportManager
 *
 * Orchestrates the export process by delegating to format-specific converters.
 * Manages content gathering, progress tracking, and download generation.
 */

import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  IConverter,
} from './types'
import type { StrandContent } from '@/lib/content/types'
import { getContentStore } from '@/lib/content/sqliteStore'

// ============================================================================
// EXPORT MANAGER
// ============================================================================

export class ExportManager {
  /**
   * Registered converters by format
   */
  private converters: Map<ExportFormat, IConverter> = new Map()

  /**
   * Statistics
   */
  private stats = {
    exported: 0,
    assets: 0,
    totalBytes: 0,
  }

  // ==========================================================================
  // CONVERTER REGISTRATION
  // ==========================================================================

  /**
   * Register a converter for a format
   */
  registerConverter(format: ExportFormat, converter: IConverter): void {
    if (!converter.supportsExport.includes(format)) {
      throw new Error(
        `Converter ${converter.name} does not support export format: ${format}`
      )
    }
    this.converters.set(format, converter)
  }

  /**
   * Get converter for format
   */
  private getConverter(format: ExportFormat): IConverter {
    const converter = this.converters.get(format)
    if (!converter) {
      throw new Error(`No converter registered for format: ${format}`)
    }
    return converter
  }

  // ==========================================================================
  // CONTENT GATHERING
  // ==========================================================================

  /**
   * Gather strands for export
   */
  private async gatherStrands(
    options: Partial<ExportOptions>
  ): Promise<StrandContent[]> {
    const store = getContentStore()
    await store.initialize()

    const strands: StrandContent[] = []

    // If specific paths provided, get those
    if (options.strandPaths && options.strandPaths.length > 0) {
      for (const path of options.strandPaths) {
        const strand = await store.getStrand(path)
        if (strand) {
          strands.push(strand)
        }
      }
      return strands
    }

    // If weaves provided, get all strands from those weaves
    if (options.weaves && options.weaves.length > 0) {
      for (const weaveSlug of options.weaves) {
        const weaveStrands = await this.getStrandsByWeave(weaveSlug)
        strands.push(...weaveStrands)
      }
      return strands
    }

    // Otherwise, get all strands
    const tree = await store.getKnowledgeTree()
    const allStrands = await this.getStrandsFromTree(tree)
    return allStrands
  }

  /**
   * Get all strands from a weave
   */
  private async getStrandsByWeave(weaveSlug: string): Promise<StrandContent[]> {
    const store = getContentStore()
    const tree = await store.getKnowledgeTree()

    const weave = tree.find(w => w.slug === weaveSlug)
    if (!weave || !weave.children) {
      return []
    }

    return this.getStrandsFromTree([weave])
  }

  /**
   * Recursively extract strands from tree
   */
  private async getStrandsFromTree(
    nodes: any[]
  ): Promise<StrandContent[]> {
    const strands: StrandContent[] = []
    const store = getContentStore()

    for (const node of nodes) {
      if (node.type === 'strand') {
        const strand = await store.getStrand(node.path)
        if (strand) {
          strands.push(strand)
        }
      }

      if (node.children && Array.isArray(node.children)) {
        const childStrands = await this.getStrandsFromTree(node.children)
        strands.push(...childStrands)
      }
    }

    return strands
  }

  // ==========================================================================
  // EXPORT OPERATIONS
  // ==========================================================================

  /**
   * Export content to specified format
   */
  async export(options: Partial<ExportOptions>): Promise<ExportResult> {
    const startTime = Date.now()

    // Merge with defaults
    const opts: ExportOptions = {
      format: options.format || 'markdown',
      includeMetadata: options.includeMetadata !== false,
      includeUserData: options.includeUserData !== false,
      ...options,
    }

    // Reset stats
    this.stats = { exported: 0, assets: 0, totalBytes: 0 }

    try {
      // Get appropriate converter
      const converter = this.getConverter(opts.format)

      // Set progress callback if converter supports it
      if (opts.onProgress && 'setProgressCallback' in converter) {
        (converter as { setProgressCallback: (cb: typeof opts.onProgress) => void }).setProgressCallback(opts.onProgress)
      }

      // Gather strands
      opts.onProgress?.(10, 100, 'Gathering strands...')
      const strands = await this.gatherStrands(opts)

      if (strands.length === 0) {
        return {
          success: false,
          filename: '',
          statistics: {
            strandsExported: 0,
            assetsExported: 0,
            totalSizeBytes: 0,
          },
          errors: ['No strands found to export'],
          duration: Date.now() - startTime,
        }
      }

      // Perform export
      opts.onProgress?.(20, 100, `Exporting ${strands.length} strands...`)
      const result = await converter.export(strands, opts)

      // Update statistics
      this.stats.exported = result.statistics.strandsExported
      this.stats.assets = result.statistics.assetsExported
      this.stats.totalBytes = result.statistics.totalSizeBytes

      // Trigger download if blob is present
      if (result.success && result.blob) {
        this.triggerDownload(result.blob, result.filename)
      }

      opts.onProgress?.(100, 100, 'Export complete')

      return {
        ...result,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        filename: '',
        statistics: {
          strandsExported: this.stats.exported,
          assetsExported: this.stats.assets,
          totalSizeBytes: this.stats.totalBytes,
        },
        errors: [errorMessage],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Export and return blob without triggering download
   */
  async exportToBlob(options: Partial<ExportOptions>): Promise<{
    blob: Blob | null
    filename: string
    result: ExportResult
  }> {
    const result = await this.export(options)
    return {
      blob: result.blob || null,
      filename: result.filename,
      result,
    }
  }

  /**
   * Get estimated export size
   */
  async estimateSize(options: Partial<ExportOptions>): Promise<number> {
    const strands = await this.gatherStrands(options)

    let totalSize = 0

    for (const strand of strands) {
      // Estimate: content size + frontmatter + overhead
      totalSize += strand.content.length
      if (strand.frontmatter) {
        totalSize += JSON.stringify(strand.frontmatter).length
      }
    }

    // Add overhead for format-specific wrapping (rough estimate)
    switch (options.format) {
      case 'pdf':
      case 'docx':
        totalSize *= 2 // These formats add significant overhead
        break
      case 'json':
        totalSize *= 1.2 // JSON adds quotes and structure
        break
      case 'markdown':
      case 'fabric-zip':
        totalSize *= 0.3 // ZIP compression
        break
    }

    return Math.ceil(totalSize)
  }

  // ==========================================================================
  // DOWNLOAD UTILITIES
  // ==========================================================================

  /**
   * Trigger browser download of blob
   */
  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Clean up object URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  /**
   * Generate filename for export
   */
  generateFilename(format: ExportFormat, customName?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const base = customName || 'fabric-export'

    const extensions: Record<ExportFormat, string> = {
      markdown: 'zip',
      pdf: 'pdf',
      docx: 'docx',
      json: 'json',
      txt: 'txt',
      'fabric-zip': 'zip',
    }

    const ext = extensions[format] || 'zip'
    return `${base}-${timestamp}.${ext}`
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get export statistics
   */
  getStatistics(): typeof this.stats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = { exported: 0, assets: 0, totalBytes: 0 }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let exportManagerInstance: ExportManager | null = null

/**
 * Get singleton ExportManager instance
 */
export function getExportManager(): ExportManager {
  if (!exportManagerInstance) {
    exportManagerInstance = new ExportManager()
  }
  return exportManagerInstance
}

/**
 * Reset ExportManager instance (for testing)
 */
export function resetExportManager(): void {
  exportManagerInstance = null
}
