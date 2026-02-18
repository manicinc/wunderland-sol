/**
 * Export utilities for bookmarks and highlights
 * @module codex/lib/exportUtils
 *
 * @remarks
 * - Export to JSON, CSV, and Markdown formats
 * - Supports bookmarks, highlights, and groups
 * - Browser-side file download
 */

import type { Highlight, CodexBookmark, HighlightGroup } from './highlightTypes'
import type { HistoryEntry } from './localStorage'

/**
 * Export format types
 */
export type ExportFormat = 'json' | 'csv' | 'markdown'

/**
 * Trigger browser download of a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Escape CSV field
 */
function escapeCSV(field: string | undefined | null): string {
  if (!field) return '""'
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert highlights to JSON string
 */
function highlightsToJSON(highlights: Highlight[]): string {
  return JSON.stringify(highlights, null, 2)
}

/**
 * Convert highlights to CSV string
 */
function highlightsToCSV(highlights: Highlight[]): string {
  const headers = [
    'ID',
    'File Path',
    'Content',
    'Selection Type',
    'Color',
    'Category Tag',
    'User Notes',
    'Group ID',
    'Created At',
    'Updated At',
  ]

  const rows = highlights.map((h) => [
    escapeCSV(h.id),
    escapeCSV(h.filePath),
    escapeCSV(h.content),
    escapeCSV(h.selectionType),
    escapeCSV(h.color),
    escapeCSV(h.categoryTag),
    escapeCSV(h.userNotes),
    escapeCSV(h.groupId),
    escapeCSV(h.createdAt),
    escapeCSV(h.updatedAt),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

/**
 * Convert highlights to Markdown string
 */
function highlightsToMarkdown(highlights: Highlight[]): string {
  let md = '# Highlights Export\n\n'
  md += `**Total Highlights:** ${highlights.length}\n\n`
  md += `**Exported:** ${new Date().toLocaleString()}\n\n`
  md += '---\n\n'

  // Group by file path
  const byFile = highlights.reduce((acc, h) => {
    if (!acc[h.filePath]) acc[h.filePath] = []
    acc[h.filePath].push(h)
    return acc
  }, {} as Record<string, Highlight[]>)

  Object.entries(byFile).forEach(([filePath, fileHighlights]) => {
    md += `## ${filePath}\n\n`

    fileHighlights.forEach((h) => {
      md += `### ${h.selectionType === 'text' ? '📝 Text' : '📦 Block'} Highlight\n\n`

      // Color badge
      const colorEmoji = {
        yellow: '🟨',
        green: '🟩',
        blue: '🟦',
        pink: '🟪',
        purple: '🟪',
        orange: '🟧',
      }[h.color] || '⬜'

      md += `${colorEmoji} **Color:** ${h.color}\n\n`

      // Category
      if (h.categoryTag) {
        md += `🏷️ **Category:** ${h.categoryTag}\n\n`
      }

      // Content
      md += '**Content:**\n\n'
      md += `> ${h.content.split('\n').join('\n> ')}\n\n`

      // Notes
      if (h.userNotes) {
        md += '**Notes:**\n\n'
        md += `${h.userNotes}\n\n`
      }

      // Metadata
      md += `*Created: ${new Date(h.createdAt).toLocaleString()}*\n\n`
      md += '---\n\n'
    })
  })

  return md
}

/**
 * Export highlights to file
 */
export function exportHighlights(highlights: Highlight[], format: ExportFormat): void {
  const timestamp = new Date().toISOString().split('T')[0]
  let content: string
  let filename: string
  let mimeType: string

  switch (format) {
    case 'json':
      content = highlightsToJSON(highlights)
      filename = `highlights-export-${timestamp}.json`
      mimeType = 'application/json'
      break
    case 'csv':
      content = highlightsToCSV(highlights)
      filename = `highlights-export-${timestamp}.csv`
      mimeType = 'text/csv'
      break
    case 'markdown':
      content = highlightsToMarkdown(highlights)
      filename = `highlights-export-${timestamp}.md`
      mimeType = 'text/markdown'
      break
  }

  downloadFile(content, filename, mimeType)
}

/**
 * Convert bookmarks to JSON string
 */
function bookmarksToJSON(bookmarks: CodexBookmark[]): string {
  return JSON.stringify(bookmarks, null, 2)
}

/**
 * Convert bookmarks to CSV string
 */
function bookmarksToCSV(bookmarks: CodexBookmark[]): string {
  const headers = ['ID', 'Path', 'Title', 'Notes', 'Group ID', 'Added At']

  const rows = bookmarks.map((b) => [
    escapeCSV(b.id),
    escapeCSV(b.path),
    escapeCSV(b.title),
    escapeCSV(b.notes),
    escapeCSV(b.groupId),
    escapeCSV(b.addedAt),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

/**
 * Convert bookmarks to Markdown string
 */
function bookmarksToMarkdown(bookmarks: CodexBookmark[]): string {
  let md = '# Bookmarks Export\n\n'
  md += `**Total Bookmarks:** ${bookmarks.length}\n\n`
  md += `**Exported:** ${new Date().toLocaleString()}\n\n`
  md += '---\n\n'

  // Group by group ID
  const byGroup = bookmarks.reduce((acc, b) => {
    const group = b.groupId || 'ungrouped'
    if (!acc[group]) acc[group] = []
    acc[group].push(b)
    return acc
  }, {} as Record<string, CodexBookmark[]>)

  Object.entries(byGroup).forEach(([groupId, groupBookmarks]) => {
    md += `## ${groupId === 'ungrouped' ? 'Ungrouped' : groupId}\n\n`

    groupBookmarks.forEach((b) => {
      md += `### 🔖 ${b.title}\n\n`
      md += `**Path:** \`${b.path}\`\n\n`

      if (b.notes) {
        md += `**Notes:** ${b.notes}\n\n`
      }

      md += `*Added: ${new Date(b.addedAt).toLocaleString()}*\n\n`
      md += '---\n\n'
    })
  })

  return md
}

/**
 * Export bookmarks to file
 */
export function exportBookmarks(bookmarks: CodexBookmark[], format: ExportFormat): void {
  const timestamp = new Date().toISOString().split('T')[0]
  let content: string
  let filename: string
  let mimeType: string

  switch (format) {
    case 'json':
      content = bookmarksToJSON(bookmarks)
      filename = `bookmarks-export-${timestamp}.json`
      mimeType = 'application/json'
      break
    case 'csv':
      content = bookmarksToCSV(bookmarks)
      filename = `bookmarks-export-${timestamp}.csv`
      mimeType = 'text/csv'
      break
    case 'markdown':
      content = bookmarksToMarkdown(bookmarks)
      filename = `bookmarks-export-${timestamp}.md`
      mimeType = 'text/markdown'
      break
  }

  downloadFile(content, filename, mimeType)
}

/**
 * Convert history to JSON string
 */
function historyToJSON(history: HistoryEntry[]): string {
  return JSON.stringify(history, null, 2)
}

/**
 * Convert history to CSV string
 */
function historyToCSV(history: HistoryEntry[]): string {
  const headers = ['Path', 'Title', 'View Count', 'Last Viewed', 'First Viewed']

  const rows = history.map((h) => [
    escapeCSV(h.path),
    escapeCSV(h.title),
    String(h.viewCount),
    escapeCSV(h.viewedAt),
    escapeCSV(h.firstViewedAt),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

/**
 * Export history to file
 */
export function exportHistory(history: HistoryEntry[], format: ExportFormat): void {
  const timestamp = new Date().toISOString().split('T')[0]
  let content: string
  let filename: string
  let mimeType: string

  switch (format) {
    case 'json':
      content = historyToJSON(history)
      filename = `history-export-${timestamp}.json`
      mimeType = 'application/json'
      break
    case 'csv':
      content = historyToCSV(history)
      filename = `history-export-${timestamp}.csv`
      mimeType = 'text/csv'
      break
    case 'markdown':
      content = '# History Export\n\n' + history.map((h) => `- **${h.title}** (\`${h.path}\`) - ${h.viewCount} views`).join('\n')
      filename = `history-export-${timestamp}.md`
      mimeType = 'text/markdown'
      break
  }

  downloadFile(content, filename, mimeType)
}

/**
 * Export everything (highlights + bookmarks + history) to a single JSON file
 */
export function exportAll(
  highlights: Highlight[],
  bookmarks: CodexBookmark[],
  history: HistoryEntry[],
  groups: HighlightGroup[]
): void {
  const timestamp = new Date().toISOString().split('T')[0]

  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    highlights,
    bookmarks,
    history,
    groups,
    stats: {
      totalHighlights: highlights.length,
      totalBookmarks: bookmarks.length,
      totalHistory: history.length,
      totalGroups: groups.length,
    },
  }

  const content = JSON.stringify(data, null, 2)
  const filename = `codex-full-export-${timestamp}.json`
  const mimeType = 'application/json'

  downloadFile(content, filename, mimeType)
}

/**
 * Import data from JSON file
 */
export async function importFromJSON(file: File): Promise<{
  highlights?: Highlight[]
  bookmarks?: CodexBookmark[]
  history?: HistoryEntry[]
  groups?: HighlightGroup[]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        resolve(data)
      } catch (err) {
        reject(new Error('Failed to parse JSON file'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}
