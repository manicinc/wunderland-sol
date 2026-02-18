/**
 * Codex Importer
 *
 * Imports Quarry Codex content from a ZIP archive.
 * Supports merge, replace, and skip-existing strategies.
 *
 * @module lib/export/codexImporter
 */

import JSZip from 'jszip'
import { getContentStore } from '../content/sqliteStore'
import matter from 'gray-matter'
import type {
  ImportOptions,
  ImportProgress,
  ImportResult,
  ImportConflict,
  ConflictResolution,
  ExportManifest,
} from './types'
import { DEFAULT_IMPORT_OPTIONS } from './types'

// ============================================================================
// CODEX IMPORTER
// ============================================================================

export class CodexImporter {
  private zip: JSZip | null = null
  private manifest: ExportManifest | null = null
  private options: ImportOptions
  private resolutions: Map<string, ConflictResolution> = new Map()
  private stats = {
    imported: 0,
    skipped: 0,
    conflicts: 0,
  }

  constructor() {
    this.options = { ...DEFAULT_IMPORT_OPTIONS }
  }

  /**
   * Import Codex content from a ZIP file
   */
  async import(file: File | Blob, options: Partial<ImportOptions> = {}): Promise<ImportResult> {
    const startTime = Date.now()
    this.options = { ...DEFAULT_IMPORT_OPTIONS, ...options }
    this.resolutions = new Map()
    this.stats = { imported: 0, skipped: 0, conflicts: 0 }

    try {
      // Phase 1: Load and parse ZIP
      this.reportProgress('validating', 0, 100)
      this.zip = await JSZip.loadAsync(file)

      // Phase 2: Read and validate manifest
      await this.loadManifest()

      // Phase 3: Validate checksums
      if (this.options.validateChecksums) {
        await this.validateChecksums()
      }

      this.reportProgress('validating', 20, 100)

      // Phase 4: Detect conflicts
      const conflicts = await this.detectConflicts()
      this.stats.conflicts = conflicts.length

      // Phase 5: Resolve conflicts
      if (conflicts.length > 0 && this.options.onConflict) {
        for (const conflict of conflicts) {
          const resolution = await this.options.onConflict(conflict)
          this.resolutions.set(conflict.path, resolution)
        }
      }

      // Phase 6: Import content
      if (this.options.importMarkdown) {
        await this.importMarkdownContent()
      }

      // Phase 7: Import user data
      if (this.options.importUserData) {
        await this.importUserData()
      }

      // Phase 8: Rebuild indexes
      this.reportProgress('indexing', 95, 100)
      const store = getContentStore()
      await store.rebuildSearchIndex()

      this.reportProgress('complete', 100, 100)

      return {
        success: true,
        statistics: {
          strandsImported: this.stats.imported,
          assetsImported: 0,
          conflictsResolved: this.resolutions.size,
          skipped: this.stats.skipped,
        },
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        statistics: {
          strandsImported: 0,
          assetsImported: 0,
          conflictsResolved: 0,
          skipped: 0,
        },
        errors: [(error as Error).message],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Load and parse manifest
   */
  private async loadManifest(): Promise<void> {
    if (!this.zip) throw new Error('ZIP not loaded')

    const manifestFile = this.zip.file('manifest.json')
    if (!manifestFile) {
      throw new Error('Invalid archive: manifest.json not found')
    }

    const manifestJson = await manifestFile.async('string')
    this.manifest = JSON.parse(manifestJson)

    // Validate manifest
    if (this.manifest?.format !== 'quarry-codex-archive') {
      throw new Error('Invalid archive format')
    }

    if (this.manifest?.version !== '1.0.0') {
      console.warn('[Import] Archive version mismatch, proceeding anyway')
    }
  }

  /**
   * Validate file checksums
   */
  private async validateChecksums(): Promise<void> {
    if (!this.zip || !this.manifest) return

    const errors: string[] = []

    for (const [path, expectedChecksum] of Object.entries(this.manifest.checksums.files)) {
      const file = this.zip.file(path)
      if (!file) {
        errors.push(`Missing file: ${path}`)
        continue
      }

      const content = await file.async('string')
      const actualChecksum = await this.sha256(content)

      if (actualChecksum !== expectedChecksum) {
        errors.push(`Checksum mismatch: ${path}`)
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`)
    }
  }

  /**
   * Detect conflicts with existing content
   */
  private async detectConflicts(): Promise<ImportConflict[]> {
    if (!this.manifest) return []

    const conflicts: ImportConflict[] = []
    const store = getContentStore()
    await store.initialize()

    for (const strand of this.manifest.inventory.strands) {
      const existing = await store.getStrand(strand.path)

      if (existing) {
        conflicts.push({
          type: 'strand',
          path: strand.path,
          existingId: existing.id,
          incomingId: strand.id,
          existingModified: existing.lastModified,
          incomingModified: strand.lastModified,
          existingTitle: existing.title,
          incomingTitle: strand.title,
        })
      }
    }

    return conflicts
  }

  /**
   * Import markdown content
   */
  private async importMarkdownContent(): Promise<void> {
    if (!this.zip || !this.manifest) return

    this.reportProgress('markdown', 40, 100)

    const store = getContentStore()
    await store.initialize()

    const strands = this.manifest.inventory.strands
    let processed = 0

    for (const strandInfo of strands) {
      const resolution = this.resolutions.get(strandInfo.path)

      // Handle conflict resolution
      if (resolution === 'keep-existing' || resolution === 'skip') {
        this.stats.skipped++
        processed++
        continue
      }

      // Find and read the markdown file
      const mdPath = `content/${strandInfo.path}`
      const file = this.zip.file(mdPath)

      if (!file) {
        console.warn(`[Import] Markdown file not found: ${mdPath}`)
        this.stats.skipped++
        processed++
        continue
      }

      const content = await file.async('string')

      // Parse frontmatter
      const { data: frontmatter, content: markdown } = matter(content)

      // Determine weave and loom IDs (simplified - would need proper lookup)
      const pathParts = strandInfo.path.split('/')
      const weaveSlug = pathParts[1] // weaves/[weave]/...
      const loomPath = pathParts.length > 3 ? pathParts.slice(0, -1).join('/') : undefined

      // Create a simple ID if not in frontmatter
      const id = frontmatter.id || strandInfo.id || `strand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      try {
        await store.upsertStrand({
          id,
          weaveId: weaveSlug, // Simplified - would need actual weave ID
          loomId: loomPath,
          slug: strandInfo.path.split('/').pop()?.replace('.md', '') || 'unknown',
          title: frontmatter.title || strandInfo.title,
          path: strandInfo.path,
          content: markdown,
          frontmatter,
          summary: frontmatter.summary,
        })

        this.stats.imported++
      } catch (error) {
        console.error(`[Import] Failed to import strand: ${strandInfo.path}`, error)
        this.stats.skipped++
      }

      processed++
      this.reportProgress('markdown', 40 + Math.round((processed / strands.length) * 40), 100)
    }
  }

  /**
   * Import user data
   */
  private async importUserData(): Promise<void> {
    if (!this.zip) return

    this.reportProgress('user-data', 85, 100)

    // Import bookmarks
    const bookmarksFile = this.zip.file('user-data/bookmarks.json')
    if (bookmarksFile) {
      try {
        const data = await bookmarksFile.async('string')
        const bookmarks = JSON.parse(data)
        // Would need to import into database
        console.log(`[Import] Found ${bookmarks.length} bookmarks`)
      } catch {
        console.warn('[Import] Failed to import bookmarks')
      }
    }

    // Import reading progress
    const progressFile = this.zip.file('user-data/reading-progress.json')
    if (progressFile) {
      try {
        const data = await progressFile.async('string')
        const progress = JSON.parse(data)
        console.log(`[Import] Found ${progress.length} reading progress records`)
      } catch {
        console.warn('[Import] Failed to import reading progress')
      }
    }

    this.reportProgress('user-data', 90, 100)
  }

  /**
   * Report progress
   */
  private reportProgress(
    phase: ImportProgress['phase'],
    current: number,
    total: number,
    currentItem?: string
  ): void {
    this.options.onProgress?.({
      phase,
      current,
      total,
      currentItem,
      conflicts: this.stats.conflicts,
      imported: this.stats.imported,
      skipped: this.stats.skipped,
    })
  }

  /**
   * Calculate SHA-256 hash
   */
  private async sha256(data: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(data)
      const hash = await crypto.subtle.digest('SHA-256', buffer)
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    }
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(16, '0')
  }
}

// ============================================================================
// IMPORT FUNCTION
// ============================================================================

/**
 * Import Codex from ZIP file
 */
export async function importCodexFromZip(
  file: File,
  options?: Partial<ImportOptions>
): Promise<ImportResult> {
  const importer = new CodexImporter()
  return importer.import(file, options)
}

/**
 * Validate a ZIP file without importing
 */
export async function validateCodexZip(file: File): Promise<{
  valid: boolean
  manifest: ExportManifest | null
  errors: string[]
}> {
  try {
    const zip = await JSZip.loadAsync(file)

    const manifestFile = zip.file('manifest.json')
    if (!manifestFile) {
      return { valid: false, manifest: null, errors: ['manifest.json not found'] }
    }

    const manifestJson = await manifestFile.async('string')
    const manifest = JSON.parse(manifestJson) as ExportManifest

    if (manifest.format !== 'quarry-codex-archive') {
      return { valid: false, manifest, errors: ['Invalid archive format'] }
    }

    return { valid: true, manifest, errors: [] }
  } catch (error) {
    return {
      valid: false,
      manifest: null,
      errors: [(error as Error).message],
    }
  }
}
