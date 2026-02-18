/**
 * Codex Exporter
 *
 * Exports Quarry Codex content to a portable ZIP archive.
 * Includes SQLite database, markdown files, assets, and user data.
 *
 * @module lib/export/codexExporter
 */

import JSZip from 'jszip'
import { getDatabase, exportDatabase as exportUserData } from '../codexDatabase'
import { getContentStore } from '../content/sqliteStore'
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportOptions,
  type ExportProgress,
  type ExportResult,
  type ExportManifest,
  type StrandInventoryEntry,
  type AssetInventoryEntry,
} from './types'

// ============================================================================
// CODEX EXPORTER
// ============================================================================

export class CodexExporter {
  private zip: JSZip
  private manifest: Partial<ExportManifest>
  private checksums: Map<string, string>
  private options: ExportOptions

  constructor() {
    this.zip = new JSZip()
    this.manifest = {}
    this.checksums = new Map()
    this.options = { ...DEFAULT_EXPORT_OPTIONS }
  }

  /**
   * Export Codex content to a ZIP blob
   */
  async export(options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    const startTime = Date.now()
    this.options = { ...DEFAULT_EXPORT_OPTIONS, ...options }
    this.zip = new JSZip()
    this.checksums = new Map()

    try {
      // Phase 1: Prepare
      this.reportProgress('preparing', 0, 100)

      // Phase 2: Export database
      if (this.options.includeDatabase) {
        await this.exportDatabase()
      }

      // Phase 3: Export markdown content
      if (this.options.includeMarkdown) {
        await this.exportMarkdownContent()
      }

      // Phase 4: Export user data
      if (this.options.includeUserData) {
        await this.exportUserDataFiles()
      }

      // Phase 5: Generate manifest
      await this.generateManifest()

      // Phase 6: Generate ZIP
      this.reportProgress('compressing', 90, 100)

      const blob = await this.zip.generateAsync(
        {
          type: 'blob',
          compression: this.options.compression === 'deflate' ? 'DEFLATE' : 'STORE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          this.reportProgress('compressing', Math.round(90 + metadata.percent * 0.1), 100)
        }
      )

      this.reportProgress('complete', 100, 100)

      return {
        success: true,
        blob,
        filename: this.generateFilename(),
        statistics: this.manifest.statistics!,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        statistics: {
          totalStrands: 0,
          totalWeaves: 0,
          totalLooms: 0,
          totalAssets: 0,
          totalSizeBytes: 0,
          databaseSizeBytes: 0,
        },
        errors: [(error as Error).message],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Export database
   */
  private async exportDatabase(): Promise<void> {
    this.reportProgress('database', 10, 100)

    const db = await getDatabase()
    if (!db) {
      throw new Error('Database not available')
    }

    // Export as JSON
    if (this.options.databaseFormat === 'json' || this.options.databaseFormat === 'both') {
      const userData = await exportUserData()
      const jsonData = JSON.stringify(userData, null, 2)
      this.zip.file('database/codex-user-data.json', jsonData)
      this.checksums.set('database/codex-user-data.json', await this.sha256(jsonData))
    }

    // Get content store data
    const store = getContentStore()
    await store.initialize()

    // Export content as JSON (since we can't easily export raw SQLite from browser)
    const tree = await store.getKnowledgeTree()
    const treeJson = JSON.stringify(tree, null, 2)
    this.zip.file('database/knowledge-tree.json', treeJson)
    this.checksums.set('database/knowledge-tree.json', await this.sha256(treeJson))

    this.reportProgress('database', 20, 100)
  }

  /**
   * Export markdown content
   */
  private async exportMarkdownContent(): Promise<void> {
    this.reportProgress('markdown', 30, 100)

    const store = getContentStore()
    await store.initialize()

    const tree = await store.getKnowledgeTree()
    const strandInventory: StrandInventoryEntry[] = []

    let processed = 0
    const totalStrands = this.countStrands(tree)

    for (const weave of tree) {
      if (this.options.weaves && !this.options.weaves.includes(weave.slug)) {
        continue
      }

      await this.exportNode(weave, strandInventory, () => {
        processed++
        this.reportProgress('markdown', 30 + Math.round((processed / totalStrands) * 30), 100)
      })
    }

    this.manifest.inventory = {
      weaves: tree.map(w => w.slug),
      strands: strandInventory,
      assets: [],
    }
  }

  /**
   * Export a knowledge tree node recursively
   */
  private async exportNode(
    node: { id: string; type: string; slug: string; name: string; path: string; children?: unknown[] },
    inventory: StrandInventoryEntry[],
    onStrandProcessed: () => void
  ): Promise<void> {
    if (node.type === 'strand') {
      const store = getContentStore()
      const strand = await store.getStrand(node.path)

      if (strand) {
        // Write markdown file
        const mdPath = `content/${strand.path}`
        this.zip.file(mdPath, strand.content)
        this.checksums.set(mdPath, await this.sha256(strand.content))

        // Add to inventory
        inventory.push({
          id: strand.id,
          path: strand.path,
          title: strand.title,
          type: 'file',
          weave: strand.weave,
          loom: strand.loom,
          checksum: this.checksums.get(mdPath)!,
          lastModified: strand.lastModified,
        })

        onStrandProcessed()
      }
    }

    // Process children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        await this.exportNode(child as typeof node, inventory, onStrandProcessed)
      }
    }
  }

  /**
   * Export user data files
   */
  private async exportUserDataFiles(): Promise<void> {
    this.reportProgress('user-data', 70, 100)

    const userData = await exportUserData()

    // Bookmarks
    if (userData.bookmarks.length > 0) {
      const data = JSON.stringify(userData.bookmarks, null, 2)
      this.zip.file('user-data/bookmarks.json', data)
      this.checksums.set('user-data/bookmarks.json', await this.sha256(data))
    }

    // Reading progress
    if (userData.readingProgress.length > 0) {
      const data = JSON.stringify(userData.readingProgress, null, 2)
      this.zip.file('user-data/reading-progress.json', data)
      this.checksums.set('user-data/reading-progress.json', await this.sha256(data))
    }

    // Drafts
    if (userData.drafts.length > 0) {
      const data = JSON.stringify(userData.drafts, null, 2)
      this.zip.file('user-data/drafts.json', data)
      this.checksums.set('user-data/drafts.json', await this.sha256(data))
    }

    // Search history
    if (userData.searchHistory.length > 0) {
      const data = JSON.stringify(userData.searchHistory, null, 2)
      this.zip.file('user-data/search-history.json', data)
      this.checksums.set('user-data/search-history.json', await this.sha256(data))
    }

    this.reportProgress('user-data', 80, 100)
  }

  /**
   * Generate manifest file
   */
  private async generateManifest(): Promise<void> {
    this.reportProgress('manifest', 85, 100)

    const inventory = this.manifest.inventory || { weaves: [], strands: [], assets: [] }

    this.manifest = {
      version: '1.0.0',
      format: 'quarry-codex-archive',
      exportedAt: new Date().toISOString(),
      statistics: {
        totalStrands: inventory.strands.length,
        totalWeaves: inventory.weaves.length,
        totalLooms: 0, // Would need to count from tree
        totalAssets: inventory.assets.length,
        totalSizeBytes: 0, // Will be calculated
        databaseSizeBytes: 0,
      },
      checksums: {
        algorithm: 'sha256',
        database: this.checksums.get('database/knowledge-tree.json') || '',
        manifest: '', // Will be set after
        files: Object.fromEntries(this.checksums),
      },
      source: {
        type: 'browser',
        platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        appVersion: '1.0.0',
        sqlStorageAdapterVersion: '0.5.0',
      },
      compatibility: {
        minVersion: '1.0.0',
        features: ['sqlite', 'markdown', 'user-data'],
      },
      inventory,
    }

    // Write manifest
    const manifestJson = JSON.stringify(this.manifest, null, 2)
    this.zip.file('manifest.json', manifestJson)
  }

  /**
   * Generate filename for export
   */
  private generateFilename(): string {
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    return `quarry-codex-export-${date}.zip`
  }

  /**
   * Count total strands in tree
   */
  private countStrands(nodes: unknown[]): number {
    let count = 0
    for (const node of nodes) {
      const n = node as { type: string; children?: unknown[] }
      if (n.type === 'strand') count++
      if (n.children) count += this.countStrands(n.children)
    }
    return count
  }

  /**
   * Report progress
   */
  private reportProgress(
    phase: ExportProgress['phase'],
    current: number,
    total: number,
    currentItem?: string
  ): void {
    this.options.onProgress?.({
      phase,
      current,
      total,
      currentItem,
      bytesProcessed: 0,
      estimatedTotalBytes: 0,
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
    // Fallback: simple hash
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
// EXPORT FUNCTION
// ============================================================================

/**
 * Export Codex to ZIP and trigger download
 */
export async function exportCodexToZip(options?: Partial<ExportOptions>): Promise<ExportResult> {
  const exporter = new CodexExporter()
  const result = await exporter.export(options)

  if (result.success && result.blob) {
    // Trigger download
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return result
}
