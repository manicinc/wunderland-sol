/**
 * @file MarkdownEmbedding.ts
 * @description Utilities for embedding canvas and attachments into markdown
 * Enables export of diary entries as self-contained markdown files
 * @version 1.0.0
 */

import type { RichDiaryEntry } from './DiaryAgentTypes'
import type { DiaryAttachment, CanvasAttachment, CanvasMetadata } from './AttachmentTypes'
import { generateAttachmentsFrontmatter, generateMarkdownRef } from './AttachmentTypes'

/**
 * Options for markdown export
 */
export interface MarkdownExportOptions {
  /** Include frontmatter YAML block */
  includeFrontmatter?: boolean
  /** Embed images as base64 data URLs */
  embedImages?: boolean
  /** Embed canvas as PNG preview */
  embedCanvasPreview?: boolean
  /** Include raw canvas JSON in collapsible block */
  includeCanvasJson?: boolean
  /** Include metadata like word count, reading time */
  includeStats?: boolean
  /** Date format for frontmatter */
  dateFormat?: 'iso' | 'human' | 'relative'
}

/**
 * Default export options
 */
const DEFAULT_EXPORT_OPTIONS: MarkdownExportOptions = {
  includeFrontmatter: true,
  embedImages: true,
  embedCanvasPreview: true,
  includeCanvasJson: false,
  includeStats: true,
  dateFormat: 'iso',
}

/**
 * Format a date for markdown export
 */
function formatDate(dateStr: string, format: 'iso' | 'human' | 'relative'): string {
  const date = new Date(dateStr)

  switch (format) {
    case 'human':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    case 'relative': {
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      if (days === 0) return 'Today'
      if (days === 1) return 'Yesterday'
      if (days < 7) return `${days} days ago`
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`
      return date.toLocaleDateString()
    }
    case 'iso':
    default:
      return dateStr
  }
}

/**
 * Generate frontmatter YAML for diary entry
 */
export function generateFrontmatter(
  entry: RichDiaryEntry,
  options: MarkdownExportOptions = {}
): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }
  const lines: string[] = ['---']

  // Basic metadata
  lines.push(`id: ${entry.id}`)
  lines.push(`title: "${entry.title.replace(/"/g, '\\"')}"`)
  lines.push(`createdAt: ${formatDate(entry.createdAt, opts.dateFormat || 'iso')}`)
  lines.push(`updatedAt: ${formatDate(entry.updatedAt, opts.dateFormat || 'iso')}`)

  // Tags
  if (entry.tags?.length) {
    lines.push(`tags:`)
    entry.tags.forEach(tag => lines.push(`  - ${tag}`))
  }

  // Mood
  if (entry.mood) {
    lines.push(`mood: ${entry.mood}`)
  }
  if (entry.moodRating) {
    lines.push(`moodRating: ${entry.moodRating}`)
  }

  // Location
  if (entry.location?.name) {
    lines.push(`location: "${entry.location.name}"`)
  }

  // Weather
  if (entry.weather) {
    lines.push(`weather: "${entry.weather}"`)
  }

  // Favorites
  if (entry.isFavorite) {
    lines.push(`favorite: true`)
  }

  // Stats
  if (opts.includeStats && entry.analysis) {
    if (entry.analysis.wordCount) {
      lines.push(`wordCount: ${entry.analysis.wordCount}`)
    }
    if (entry.analysis.readingTimeMinutes) {
      lines.push(`readingTime: ${entry.analysis.readingTimeMinutes} min`)
    }
  }

  // Attachments reference
  if (entry.richAttachments?.length) {
    lines.push('')
    lines.push(generateAttachmentsFrontmatter(entry.richAttachments))
  }

  // Legacy canvas reference
  if (entry.canvasData && !entry.richAttachments?.some(a => a.type === 'canvas')) {
    lines.push(`hasCanvas: true`)
  }

  lines.push('---')
  return lines.join('\n')
}

/**
 * Generate canvas markdown section
 */
export function generateCanvasMarkdown(
  canvasData: string,
  previewImage?: string,
  options: {
    title?: string
    includeJson?: boolean
    includePreview?: boolean
  } = {}
): string {
  const lines: string[] = []
  const title = options.title || 'Canvas'

  lines.push(`## ${title}`)
  lines.push('')

  // Preview image
  if (options.includePreview !== false && previewImage) {
    lines.push(`![${title}](${previewImage})`)
    lines.push('')
  }

  // Canvas metadata
  try {
    const parsed = JSON.parse(canvasData)
    if (parsed.document?.store) {
      const shapes = Object.values(parsed.document.store).filter(
        (item: any) => item.typeName === 'shape'
      )
      const hasHandwriting = shapes.some((s: any) => s.type === 'draw')
      const hasText = shapes.some((s: any) => s.type === 'text')

      const metaParts: string[] = []
      metaParts.push(`${shapes.length} shapes`)
      if (hasHandwriting) metaParts.push('handwriting')
      if (hasText) metaParts.push('text')

      lines.push(`*${metaParts.join(' | ')}*`)
      lines.push('')
    }
  } catch {
    // Ignore parsing errors
  }

  // Raw JSON (collapsible)
  if (options.includeJson) {
    lines.push('<details>')
    lines.push('<summary>Canvas Data (tldraw JSON)</summary>')
    lines.push('')
    lines.push('```json')
    // Pretty print but limit to reasonable length
    try {
      const pretty = JSON.stringify(JSON.parse(canvasData), null, 2)
      if (pretty.length > 50000) {
        lines.push('// Canvas data too large to display inline')
        lines.push(`// Size: ${Math.round(pretty.length / 1024)} KB`)
      } else {
        lines.push(pretty)
      }
    } catch {
      lines.push(canvasData.substring(0, 1000))
      if (canvasData.length > 1000) {
        lines.push('// ... truncated')
      }
    }
    lines.push('```')
    lines.push('</details>')
  }

  return lines.join('\n')
}

/**
 * Export diary entry to markdown
 */
export function exportToMarkdown(
  entry: RichDiaryEntry,
  options: MarkdownExportOptions = {},
  canvasPreviewImage?: string
): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }
  const parts: string[] = []

  // Frontmatter
  if (opts.includeFrontmatter) {
    parts.push(generateFrontmatter(entry, opts))
    parts.push('')
  }

  // Title as H1
  parts.push(`# ${entry.title || 'Untitled Entry'}`)
  parts.push('')

  // Main content
  if (entry.contentMarkdown) {
    parts.push(entry.contentMarkdown)
    parts.push('')
  }

  // Canvas content
  if (entry.canvasData) {
    parts.push(generateCanvasMarkdown(entry.canvasData, canvasPreviewImage, {
      includeJson: opts.includeCanvasJson,
      includePreview: opts.embedCanvasPreview,
    }))
    parts.push('')
  }

  // Rich attachments
  if (entry.richAttachments?.length) {
    const canvasAttachments = entry.richAttachments.filter(a => a.type === 'canvas')
    const otherAttachments = entry.richAttachments.filter(a => a.type !== 'canvas')

    // Canvas attachments
    canvasAttachments.forEach((attachment, index) => {
      const canvas = attachment as CanvasAttachment
      parts.push(generateCanvasMarkdown(
        canvas.inlineData || '',
        canvas.previewImage,
        {
          title: canvas.title || `Canvas ${index + 1}`,
          includeJson: opts.includeCanvasJson,
          includePreview: opts.embedCanvasPreview,
        }
      ))
      parts.push('')
    })

    // Other attachments
    if (otherAttachments.length) {
      parts.push('## Attachments')
      parts.push('')
      otherAttachments.forEach(attachment => {
        parts.push(`- ${generateMarkdownRef(attachment)}`)
      })
      parts.push('')
    }
  }

  // Footer with metadata
  if (opts.includeStats && entry.analysis) {
    parts.push('---')
    parts.push('')
    const stats: string[] = []
    if (entry.analysis.wordCount) {
      stats.push(`${entry.analysis.wordCount} words`)
    }
    if (entry.analysis.readingTimeMinutes) {
      stats.push(`${entry.analysis.readingTimeMinutes} min read`)
    }
    if (stats.length) {
      parts.push(`*${stats.join(' · ')}*`)
    }
  }

  return parts.join('\n').trim()
}

/**
 * Parse markdown frontmatter to extract entry metadata
 */
export function parseFrontmatterToEntry(
  markdown: string
): Partial<RichDiaryEntry> | null {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return null

  const frontmatter = frontmatterMatch[1]
  const entry: Partial<RichDiaryEntry> = {}

  // Parse YAML-like frontmatter
  const lines = frontmatter.split('\n')
  let currentKey = ''
  let currentArray: string[] = []

  lines.forEach(line => {
    const keyMatch = line.match(/^(\w+):\s*(.*)$/)
    if (keyMatch) {
      // Save previous array if exists
      if (currentKey === 'tags' && currentArray.length) {
        entry.tags = currentArray
        currentArray = []
      }

      currentKey = keyMatch[1]
      const value = keyMatch[2].trim()

      switch (currentKey) {
        case 'id':
          entry.id = value
          break
        case 'title':
          entry.title = value.replace(/^"|"$/g, '')
          break
        case 'createdAt':
          entry.createdAt = value
          break
        case 'updatedAt':
          entry.updatedAt = value
          break
        case 'mood':
          entry.mood = value
          break
        case 'moodRating':
          entry.moodRating = parseInt(value) as 1 | 2 | 3 | 4 | 5
          break
        case 'weather':
          entry.weather = value.replace(/^"|"$/g, '')
          break
        case 'favorite':
          entry.isFavorite = value === 'true'
          break
        case 'location':
          entry.location = { name: value.replace(/^"|"$/g, ''), latitude: 0, longitude: 0 }
          break
      }
    } else if (line.match(/^\s+-\s+(.+)$/)) {
      // Array item
      const itemMatch = line.match(/^\s+-\s+(.+)$/)
      if (itemMatch && currentKey === 'tags') {
        currentArray.push(itemMatch[1])
      }
    }
  })

  // Save final array
  if (currentKey === 'tags' && currentArray.length) {
    entry.tags = currentArray
  }

  // Extract content (everything after frontmatter)
  const contentMatch = markdown.match(/^---\n[\s\S]*?\n---\n\n?([\s\S]*)$/)
  if (contentMatch) {
    let content = contentMatch[1]

    // Remove H1 title if it matches frontmatter title
    const h1Match = content.match(/^#\s+(.+)\n\n?/)
    if (h1Match && h1Match[1] === entry.title) {
      content = content.substring(h1Match[0].length)
    }

    // Remove canvas sections (they're stored separately)
    content = content.replace(/## Canvas\n[\s\S]*?(?=\n## |\n---|\n*$)/g, '')

    entry.contentMarkdown = content.trim()
  }

  return entry
}

/**
 * Create a downloadable markdown file
 */
export function downloadAsMarkdown(
  entry: RichDiaryEntry,
  filename?: string,
  options?: MarkdownExportOptions,
  canvasPreviewImage?: string
): void {
  const markdown = exportToMarkdown(entry, options, canvasPreviewImage)
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${entry.title || 'diary-entry'}-${entry.id}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
