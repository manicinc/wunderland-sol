/**
 * Exporter
 * @module lib/publish/exporter
 *
 * Export functionality for publishing content to clipboard, files, or ZIP archives.
 * Supports multiple formats: markdown, JSON, combined markdown, and ZIP.
 */

import type {
  PublishableItem,
  ExportFormat,
  ExportGrouping,
  ExportOptions,
  ExportResult,
  ExportManifest,
  PublishableContentType,
} from './types'
import {
  formatCombinedMarkdown,
  formatJsonExport,
  parseFrontmatter,
} from './contentFormatter'
import {
  EXPORT_MIME_TYPES,
  DEFAULT_EXPORT_FILENAME_PATTERN,
} from './constants'

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'markdown',
  includeFrontmatter: true,
  includeMetadata: true,
  groupBy: 'type',
  dateFormat: 'iso',
  filenamePattern: DEFAULT_EXPORT_FILENAME_PATTERN,
}

// ============================================================================
// CLIPBOARD EXPORT
// ============================================================================

/**
 * Copy items to clipboard as markdown
 */
export async function copyToClipboard(
  items: PublishableItem[],
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }

  try {
    let content: string

    if (opts.format === 'json') {
      content = formatJsonExport(items)
    } else if (opts.format === 'combined') {
      content = formatCombinedMarkdown(items, {
        includeTableOfContents: true,
        groupBy: opts.groupBy === 'flat' ? 'none' : opts.groupBy,
      })
    } else {
      // Individual markdown files concatenated
      content = items.map(item => {
        if (opts.includeFrontmatter) {
          return item.content
        } else {
          const { body } = parseFrontmatter(item.content)
          return body
        }
      }).join('\n\n---\n\n')
    }

    await navigator.clipboard.writeText(content)

    return {
      success: true,
      format: opts.format,
      itemCount: items.length,
      content,
    }
  } catch (error) {
    return {
      success: false,
      format: opts.format,
      itemCount: items.length,
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
    }
  }
}

// ============================================================================
// FILE DOWNLOAD
// ============================================================================

/**
 * Download items as a file
 */
export async function downloadAsFile(
  items: PublishableItem[],
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }

  try {
    let content: string
    let filename: string
    let mimeType: string

    const date = new Date().toISOString().slice(0, 10)

    if (opts.format === 'json') {
      content = formatJsonExport(items)
      filename = `export-${date}.json`
      mimeType = EXPORT_MIME_TYPES.json
    } else if (opts.format === 'combined') {
      content = formatCombinedMarkdown(items, {
        includeTableOfContents: true,
        groupBy: opts.groupBy === 'flat' ? 'none' : opts.groupBy,
      })
      filename = `export-${date}.md`
      mimeType = EXPORT_MIME_TYPES.combined
    } else {
      // For single markdown, concatenate all items
      content = items.map(item => item.content).join('\n\n---\n\n')
      filename = `export-${date}.md`
      mimeType = EXPORT_MIME_TYPES.markdown
    }

    // Create blob and trigger download
    const blob = new Blob([content], { type: mimeType })
    triggerDownload(blob, filename)

    return {
      success: true,
      format: opts.format,
      itemCount: items.length,
      content,
      blob,
      filename,
    }
  } catch (error) {
    return {
      success: false,
      format: opts.format,
      itemCount: items.length,
      error: error instanceof Error ? error.message : 'Failed to download file',
    }
  }
}

// ============================================================================
// ZIP EXPORT
// ============================================================================

/**
 * Download items as a ZIP archive
 */
export async function downloadAsZip(
  items: PublishableItem[],
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options, format: 'zip' as ExportFormat }

  try {
    // Check if JSZip is available
    const JSZip = await loadJSZip()
    if (!JSZip) {
      throw new Error('ZIP functionality not available')
    }

    const zip = new JSZip()
    const date = new Date().toISOString().slice(0, 10)

    // Group items by type for folder structure
    const grouped = groupItemsByType(items)

    // Add files to ZIP
    for (const [type, typeItems] of Object.entries(grouped)) {
      const folder = zip.folder(type)
      if (!folder) continue

      for (const item of typeItems) {
        // Get just the filename from the path
        const filename = item.path.split('/').pop() || `${item.id}.md`
        const content = opts.includeFrontmatter
          ? item.content
          : parseFrontmatter(item.content).body

        folder.file(filename, content)
      }
    }

    // Add manifest
    const manifest = createExportManifest(items, opts.format)
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    // Generate ZIP blob
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    const filename = `export-${date}.zip`
    triggerDownload(blob, filename)

    return {
      success: true,
      format: opts.format,
      itemCount: items.length,
      blob,
      filename,
    }
  } catch (error) {
    return {
      success: false,
      format: opts.format,
      itemCount: items.length,
      error: error instanceof Error ? error.message : 'Failed to create ZIP',
    }
  }
}

// ============================================================================
// PREVIEW
// ============================================================================

/**
 * Generate a preview of what will be exported
 */
export function previewExport(
  items: PublishableItem[],
  options: Partial<ExportOptions> = {}
): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }

  if (opts.format === 'json') {
    const json = formatJsonExport(items)
    // Truncate for preview
    if (json.length > 2000) {
      return json.slice(0, 2000) + '\n... (truncated)'
    }
    return json
  }

  if (opts.format === 'combined') {
    const md = formatCombinedMarkdown(items, {
      includeTableOfContents: true,
      groupBy: opts.groupBy === 'flat' ? 'none' : opts.groupBy,
    })
    if (md.length > 2000) {
      return md.slice(0, 2000) + '\n... (truncated)'
    }
    return md
  }

  if (opts.format === 'zip') {
    // Show file structure preview
    const lines: string[] = ['ZIP Archive Contents:', '']
    const grouped = groupItemsByType(items)

    for (const [type, typeItems] of Object.entries(grouped)) {
      lines.push(`${type}/`)
      for (const item of typeItems) {
        const filename = item.path.split('/').pop() || `${item.id}.md`
        lines.push(`  ${filename}`)
      }
    }
    lines.push('manifest.json')

    return lines.join('\n')
  }

  // Markdown preview - show first item
  if (items.length === 0) {
    return '(No items to export)'
  }

  const firstItem = items[0]
  let preview = opts.includeFrontmatter
    ? firstItem.content
    : parseFrontmatter(firstItem.content).body

  if (items.length > 1) {
    preview += `\n\n---\n\n(+ ${items.length - 1} more items)`
  }

  if (preview.length > 2000) {
    return preview.slice(0, 2000) + '\n... (truncated)'
  }

  return preview
}

// ============================================================================
// UNIFIED EXPORT FUNCTION
// ============================================================================

/**
 * Export items in the specified format
 */
export async function exportItems(
  items: PublishableItem[],
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }

  switch (opts.format) {
    case 'zip':
      return downloadAsZip(items, opts)
    case 'json':
    case 'combined':
    case 'markdown':
    default:
      return downloadAsFile(items, opts)
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Trigger file download in browser
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Group items by content type
 */
function groupItemsByType(
  items: PublishableItem[]
): Record<string, PublishableItem[]> {
  const grouped: Record<string, PublishableItem[]> = {}

  for (const item of items) {
    const type = `${item.type}s` // pluralize
    if (!grouped[type]) {
      grouped[type] = []
    }
    grouped[type].push(item)
  }

  return grouped
}

/**
 * Create export manifest
 */
function createExportManifest(
  items: PublishableItem[],
  format: ExportFormat
): ExportManifest {
  let totalWordCount = 0

  const manifestItems = items.map(item => {
    // Rough word count
    const words = item.content.split(/\s+/).length
    totalWordCount += words

    return {
      type: item.type,
      id: item.id,
      path: item.path,
      title: item.title,
      updatedAt: item.updatedAt,
    }
  })

  const counts = {
    reflectionCount: items.filter(i => i.type === 'reflection').length,
    strandCount: items.filter(i => i.type === 'strand').length,
    projectCount: items.filter(i => i.type === 'project').length,
    totalWordCount,
  }

  return {
    exportedAt: new Date().toISOString(),
    format,
    items: manifestItems,
    metadata: counts,
  }
}

/**
 * Dynamically load JSZip
 */
async function loadJSZip(): Promise<typeof import('jszip') | null> {
  try {
    // Try to import JSZip dynamically
    const JSZip = await import('jszip')
    return JSZip.default || JSZip
  } catch {
    console.warn('[Exporter] JSZip not available')
    return null
  }
}

// ============================================================================
// EXPORT STATISTICS
// ============================================================================

/**
 * Get export statistics for items
 */
export function getExportStats(items: PublishableItem[]): {
  totalItems: number
  byType: Record<PublishableContentType, number>
  totalWords: number
  totalCharacters: number
  estimatedSize: {
    markdown: number
    json: number
    zip: number
  }
} {
  const byType: Record<PublishableContentType, number> = {
    reflection: 0,
    strand: 0,
    project: 0,
  }

  let totalWords = 0
  let totalCharacters = 0

  for (const item of items) {
    byType[item.type]++
    totalWords += item.content.split(/\s+/).length
    totalCharacters += item.content.length
  }

  // Estimate sizes in bytes
  const markdownSize = totalCharacters // 1 char ≈ 1 byte for ASCII
  const jsonSize = Math.round(markdownSize * 1.3) // JSON adds overhead
  const zipSize = Math.round(markdownSize * 0.4) // Compression typically 60% reduction

  return {
    totalItems: items.length,
    byType,
    totalWords,
    totalCharacters,
    estimatedSize: {
      markdown: markdownSize,
      json: jsonSize,
      zip: zipSize,
    },
  }
}

/**
 * Format size in bytes to human-readable string
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
