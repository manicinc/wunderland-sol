/**
 * Import/Export Core Types
 * @module lib/import-export/core/types
 *
 * Shared types for the bulk import/export system.
 */

import type { StrandContent } from '@/lib/content/types'

// ============================================================================
// FORMAT TYPES
// ============================================================================

export type ImportFormat =
  | 'obsidian'      // Obsidian vault (ZIP with markdown + frontmatter)
  | 'notion'        // Notion export (ZIP with HTML/MD/CSV)
  | 'google-docs'   // Google Docs (OAuth + Drive API)
  | 'markdown'      // Generic markdown files
  | 'json'          // JSON export from another Fabric instance
  | 'github'        // GitHub repository
  | 'evernote'      // Evernote ENEX export

export type ExportFormat =
  | 'markdown'      // Markdown files (ZIP)
  | 'pdf'           // PDF document
  | 'docx'          // Microsoft Word document
  | 'json'          // Structured JSON
  | 'txt'           // Plain text
  | 'fabric-zip'    // Existing Fabric ZIP format

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

export interface ProgressCallback {
  (current: number, total: number, message?: string, currentItem?: string): void
}

export interface ConversionProgress {
  phase: 'parsing' | 'converting' | 'validating' | 'writing' | 'complete'
  current: number
  total: number
  message?: string
  currentItem?: string
  bytesProcessed?: number
  estimatedTotalBytes?: number
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportOptions {
  /** Source format */
  format: ImportFormat

  /** Target weave ID (if specified) */
  targetWeave?: string

  /** Conflict resolution strategy */
  conflictResolution: 'replace' | 'merge' | 'skip' | 'ask'

  /** Preserve folder structure as looms */
  preserveStructure: boolean

  /** Callback for conflicts requiring user input */
  onConflict?: (conflict: ImportConflict) => Promise<ConflictResolution>

  /** Progress callback */
  onProgress?: ProgressCallback

  /** Import user data (bookmarks, highlights, etc.) */
  importUserData?: boolean

  /** Process block-level tags after import (default: true) */
  processBlocks?: boolean

  /** Format-specific options */
  formatOptions?: {
    // Obsidian
    convertWikiLinks?: boolean
    preserveObsidianTags?: boolean
    importAttachments?: boolean

    // Notion
    includeDatabases?: boolean
    flattenHierarchy?: boolean

    // Google Docs
    googleFolderId?: string
    includeSubfolders?: boolean
    convertGoogleFormats?: boolean
  }
}

export interface ImportConflict {
  type: 'strand' | 'loom' | 'weave'
  path: string
  existingId: string
  incomingId: string
  existingTitle: string
  incomingTitle: string
  existingModified: string
  incomingModified: string
  existingContent?: string
  incomingContent?: string
}

export type ConflictResolution =
  | 'keep-existing'
  | 'use-incoming'
  | 'merge'
  | 'skip'
  | 'rename-incoming'

export interface ImportResult {
  success: boolean
  statistics: {
    strandsImported: number
    strandsSkipped: number
    strandsConflicted: number
    assetsImported: number
    errors: number
  }
  strandIds: string[]
  errors?: ImportError[]
  warnings?: string[]
  duration: number
}

export interface ImportError {
  type: 'parse' | 'convert' | 'write' | 'conflict' | 'validation'
  message: string
  file?: string
  line?: number
  details?: unknown
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportOptions {
  /** Export format */
  format: ExportFormat

  /** Strand paths to export (empty = all) */
  strandPaths?: string[]

  /** Export entire weave(s) */
  weaves?: string[]

  /** Include metadata */
  includeMetadata: boolean

  /** Include user data (bookmarks, highlights, etc.) */
  includeUserData?: boolean

  /** Progress callback */
  onProgress?: ProgressCallback

  /** Format-specific options */
  formatOptions?: {
    // PDF/DOCX
    pagination?: 'letter' | 'a4'
    includeTOC?: boolean
    includePageNumbers?: boolean
    orientation?: 'portrait' | 'landscape'
    fontSize?: number
    fontFamily?: string

    // Markdown
    includeAssets?: boolean
    frontmatterStyle?: 'yaml' | 'toml' | 'json'
    wikiLinks?: boolean

    // JSON
    pretty?: boolean
    includeEmbeddings?: boolean
  }
}

export interface ExportResult {
  success: boolean
  blob?: Blob
  filename: string
  statistics: {
    strandsExported: number
    assetsExported: number
    totalSizeBytes: number
  }
  errors?: string[]
  duration: number
}

// ============================================================================
// CONVERTER INTERFACE
// ============================================================================

export interface IConverter {
  /** Converter name (e.g., 'obsidian', 'notion') */
  name: string

  /** Supported import formats */
  supportsImport: ImportFormat[]

  /** Supported export formats */
  supportsExport: ExportFormat[]

  /**
   * Validate if the input can be processed by this converter
   */
  canProcess(input: File | Blob | string): Promise<boolean>

  /**
   * Import content from external format
   */
  import(input: File | Blob | string, options: Partial<ImportOptions>): Promise<ImportResult>

  /**
   * Export content to external format
   */
  export(strands: StrandContent[], options: Partial<ExportOptions>): Promise<ExportResult>
}

// ============================================================================
// WEB WORKER TYPES
// ============================================================================

export type ConversionTaskType =
  | 'import-obsidian'
  | 'import-notion'
  | 'import-google-docs'
  | 'export-pdf'
  | 'export-docx'
  | 'export-markdown'

export interface ConversionTask {
  id: string
  type: ConversionTaskType
  input: File | Blob | StrandContent[] | string
  options: Partial<ImportOptions> | Partial<ExportOptions>
}

export interface ConversionTaskProgress {
  taskId: string
  progress: number  // 0-100
  message: string
  currentFile?: string
}

export interface ConversionTaskResult {
  taskId: string
  success: boolean
  output?: StrandContent[] | Blob
  errors?: ImportError[]
  warnings?: string[]
  statistics?: {
    itemsProcessed: number
    itemsFailed: number
    totalSizeBytes: number
  }
}

// Worker message types
export type WorkerMessage =
  | { type: 'convert'; task: ConversionTask }
  | { type: 'cancel'; taskId: string }

export type WorkerResponse =
  | { type: 'progress'; data: ConversionTaskProgress }
  | { type: 'complete'; data: ConversionTaskResult }
  | { type: 'error'; taskId: string; error: string }

// ============================================================================
// GITHUB INTEGRATION TYPES
// ============================================================================

export interface GitHubPRRequest {
  branch: string
  files: GitHubPRFile[]
  commitMessage: string
  prTitle: string
  prBody: string
}

export interface GitHubPRFile {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
}

export interface GitHubPRResult {
  success: boolean
  prUrl?: string
  branchName?: string
  error?: string
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PageConfig {
  width: number    // inches
  height: number   // inches
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  dpi: number
}

export const PAGE_CONFIGS: Record<'letter' | 'a4', PageConfig> = {
  letter: {
    width: 8.5,
    height: 11,
    marginTop: 1,
    marginRight: 1,
    marginBottom: 1,
    marginLeft: 1,
    dpi: 96,
  },
  a4: {
    width: 8.27,
    height: 11.69,
    marginTop: 1,
    marginRight: 1,
    marginBottom: 1,
    marginLeft: 1,
    dpi: 96,
  },
}

export interface PageBreak {
  index: number
  offsetPx: number
  reason: 'natural' | 'forced' | 'section'
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface FileWithMetadata {
  file: File
  path: string
  relativePath: string
  size: number
  lastModified: Date
}

export interface DirectoryStructure {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: DirectoryStructure[]
  file?: FileWithMetadata
}

/**
 * Extract directory structure from ZIP or FileList
 */
export function buildDirectoryStructure(
  files: FileWithMetadata[]
): DirectoryStructure {
  const root: DirectoryStructure = {
    name: 'root',
    path: '',
    type: 'directory',
    children: [],
  }

  for (const fileWithMeta of files) {
    const parts = fileWithMeta.relativePath.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const path = parts.slice(0, i + 1).join('/')

      if (!current.children) {
        current.children = []
      }

      let child = current.children.find(c => c.name === part)

      if (!child) {
        child = {
          name: part,
          path,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
          file: isFile ? fileWithMeta : undefined,
        }
        current.children.push(child)
      }

      if (!isFile) {
        current = child
      }
    }
  }

  return root
}
