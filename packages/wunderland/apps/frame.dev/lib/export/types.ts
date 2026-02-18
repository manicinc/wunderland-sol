/**
 * Export/Import Types
 *
 * Type definitions for the Quarry Codex export/import system.
 *
 * @module lib/export/types
 */

// ============================================================================
// MANIFEST TYPES
// ============================================================================

/**
 * Export manifest included in ZIP archives
 */
export interface ExportManifest {
  /** Manifest schema version */
  version: '1.0.0'

  /** Archive format identifier */
  format: 'quarry-codex-archive'

  /** ISO 8601 timestamp of export */
  exportedAt: string

  /** GitHub username if available */
  exportedBy?: string

  /** Content statistics */
  statistics: {
    totalStrands: number
    totalWeaves: number
    totalLooms: number
    totalAssets: number
    totalSizeBytes: number
    databaseSizeBytes: number
  }

  /** Integrity checksums */
  checksums: {
    algorithm: 'sha256'
    database: string
    manifest: string
    files: Record<string, string>
  }

  /** Source information */
  source: {
    type: 'browser' | 'electron' | 'node'
    platform: string
    appVersion: string
    sqlStorageAdapterVersion: string
  }

  /** Import compatibility */
  compatibility: {
    minVersion: string
    features: string[]
  }

  /** Content inventory */
  inventory: {
    weaves: string[]
    strands: StrandInventoryEntry[]
    assets: AssetInventoryEntry[]
  }
}

/**
 * Strand entry in manifest inventory
 */
export interface StrandInventoryEntry {
  id: string
  path: string
  title: string
  type: 'file' | 'folder'
  weave: string
  loom?: string
  checksum: string
  lastModified?: string
}

/**
 * Asset entry in manifest inventory
 */
export interface AssetInventoryEntry {
  originalPath: string
  archivePath: string
  mimeType: string
  sizeBytes: number
  checksum: string
  referencedBy: string[]
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

/**
 * Export options
 */
export interface ExportOptions {
  /** Include SQLite database in export */
  includeDatabase: boolean

  /** Include raw markdown files */
  includeMarkdown: boolean

  /** Include asset files (images, etc.) */
  includeAssets: boolean

  /** Include user data (bookmarks, progress, etc.) */
  includeUserData: boolean

  /** Specific weaves to export (empty = all) */
  weaves?: string[]

  /** Specific strand IDs to export (empty = all) */
  strands?: string[]

  /** Database export format */
  databaseFormat: 'sqlite' | 'json' | 'both'

  /** ZIP compression level */
  compression: 'store' | 'deflate'

  /** Progress callback */
  onProgress?: (progress: ExportProgress) => void
}

/**
 * Export progress information
 */
export interface ExportProgress {
  phase: 'preparing' | 'database' | 'markdown' | 'assets' | 'user-data' | 'manifest' | 'compressing' | 'complete'
  current: number
  total: number
  currentItem?: string
  bytesProcessed: number
  estimatedTotalBytes: number
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean
  blob?: Blob
  filename: string
  statistics: ExportManifest['statistics']
  errors?: string[]
  warnings?: string[]
  duration: number
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

/**
 * Import strategy
 */
export type ImportStrategy = 'replace' | 'merge' | 'skip-existing'

/**
 * Import options
 */
export interface ImportOptions {
  /** Import strategy for handling existing content */
  strategy: ImportStrategy

  /** Import SQLite database */
  importDatabase: boolean

  /** Import markdown files */
  importMarkdown: boolean

  /** Import asset files */
  importAssets: boolean

  /** Import user data */
  importUserData: boolean

  /** Conflict resolution callback */
  onConflict?: (conflict: ImportConflict) => Promise<ConflictResolution>

  /** Validate checksums before import */
  validateChecksums: boolean

  /** Progress callback */
  onProgress?: (progress: ImportProgress) => void
}

/**
 * Import conflict information
 */
export interface ImportConflict {
  type: 'strand' | 'asset' | 'bookmark' | 'draft'
  path: string
  existingId?: string
  incomingId?: string
  existingModified?: string
  incomingModified?: string
  existingTitle?: string
  incomingTitle?: string
}

/**
 * Conflict resolution choice
 */
export type ConflictResolution =
  | 'keep-existing'
  | 'use-incoming'
  | 'keep-both'
  | 'merge'
  | 'skip'

/**
 * Import progress information
 */
export interface ImportProgress {
  phase: 'validating' | 'extracting' | 'database' | 'markdown' | 'assets' | 'user-data' | 'indexing' | 'complete'
  current: number
  total: number
  currentItem?: string
  conflicts: number
  imported: number
  skipped: number
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean
  statistics: {
    strandsImported: number
    assetsImported: number
    conflictsResolved: number
    skipped: number
  }
  errors?: string[]
  warnings?: string[]
  duration: number
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeDatabase: true,
  includeMarkdown: true,
  includeAssets: true,
  includeUserData: true,
  databaseFormat: 'both',
  compression: 'deflate',
}

/**
 * Default import options
 */
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  strategy: 'merge',
  importDatabase: true,
  importMarkdown: true,
  importAssets: true,
  importUserData: true,
  validateChecksums: true,
}
