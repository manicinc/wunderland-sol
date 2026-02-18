/**
 * Evernote ENEX Converter
 * @module lib/import-export/converters/evernote/EvernoteConverter
 *
 * Converts Evernote ENEX exports to Fabric strands.
 * Handles:
 * - ENEX XML format parsing
 * - Note content (ENML → Markdown)
 * - Note metadata (created, updated, tags)
 * - Attachments (embedded resources)
 * - Notebooks → looms mapping
 * - Task/checkbox preservation
 */

import JSZip from 'jszip'
import { BaseConverter } from '../BaseConverter'
import type {
  ImportFormat,
  ExportFormat,
  ImportOptions,
  ExportResult,
  ImportResult,
  FileWithMetadata,
} from '../../core/types'
import type { StrandContent } from '@/lib/content/types'
import { getContentStore } from '@/lib/content/sqliteStore'

// ============================================================================
// TYPES
// ============================================================================

interface EnexNote {
  title: string
  content: string // ENML content
  created?: Date
  updated?: Date
  author?: string
  sourceUrl?: string
  tags: string[]
  latitude?: number
  longitude?: number
  altitude?: number
  reminder?: {
    order?: number
    time?: Date
    done?: Date
  }
  resources: EnexResource[]
}

interface EnexResource {
  hash: string // MD5 hash for reference in content
  mime: string
  filename?: string
  data: string // Base64 encoded data
  width?: number
  height?: number
}

interface EnexParseResult {
  notes: EnexNote[]
  exportDate?: Date
  application?: string
  version?: string
}

// ============================================================================
// EVERNOTE CONVERTER
// ============================================================================

export class EvernoteConverter extends BaseConverter {
  readonly name = 'evernote'
  readonly supportsImport: ImportFormat[] = ['evernote' as ImportFormat]
  readonly supportsExport: ExportFormat[] = [] // Import only

  /**
   * Evernote-specific metadata
   */
  private enexMetadata = {
    totalNotes: 0,
    totalResources: 0,
    totalTags: 0,
    tagMap: new Map<string, number>(),
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  async canProcess(input: File | Blob | string): Promise<boolean> {
    if (typeof input === 'string') {
      return input.includes('<?xml') && input.includes('<en-export')
    }

    try {
      const text = await this.readFileAsText(input as Blob)
      return text.includes('<?xml') && text.includes('<en-export')
    } catch {
      return false
    }
  }

  // ==========================================================================
  // IMPORT
  // ==========================================================================

  async import(
    input: File | Blob | string,
    options: Partial<ImportOptions>
  ): Promise<ImportResult> {
    this.clearErrors()
    const startTime = Date.now()
    this.enexMetadata = {
      totalNotes: 0,
      totalResources: 0,
      totalTags: 0,
      tagMap: new Map(),
    }

    try {
      // Read content
      this.reportProgress(5, 100, 'Reading ENEX file...')
      const content = typeof input === 'string' ? input : await this.readFileAsText(input as Blob)

      // Parse ENEX
      this.reportProgress(10, 100, 'Parsing Evernote export...')
      const enexResult = this.parseEnex(content)
      this.enexMetadata.totalNotes = enexResult.notes.length

      this.reportProgress(15, 100, `Found ${enexResult.notes.length} notes`)

      // Determine target weave
      const targetWeave = options.targetWeave || 'evernote-import'

      // Convert notes to strands
      this.reportProgress(20, 100, 'Converting notes to strands...')
      const strands: StrandContent[] = []
      const strandIds: string[] = []

      for (let i = 0; i < enexResult.notes.length; i++) {
        const note = enexResult.notes[i]

        try {
          const strand = await this.convertNote(note, targetWeave, options)
          if (strand) {
            strands.push(strand)
            strandIds.push(strand.id)
          }
        } catch (error) {
          this.addError({
            type: 'convert',
            message: `Failed to convert note: ${note.title}`,
            file: note.title,
            details: error,
          })
        }

        const progress = 20 + Math.round((i / enexResult.notes.length) * 60)
        this.reportProgress(progress, 100, `Processing ${i + 1}/${enexResult.notes.length}`)
      }

      // Store strands in database
      this.reportProgress(85, 100, 'Saving to database...')
      const store = getContentStore()
      await store.initialize()

      for (const strand of strands) {
        await store.upsertStrand({
          id: strand.id,
          weaveId: targetWeave,
          loomId: strand.loom,
          slug: strand.slug,
          title: strand.title,
          path: strand.path,
          content: strand.content,
          frontmatter: strand.frontmatter,
          summary: strand.summary,
        })
      }

      this.reportProgress(100, 100, 'Import complete')

      return {
        success: true,
        statistics: {
          strandsImported: strands.length,
          strandsSkipped: 0,
          strandsConflicted: 0,
          assetsImported: this.enexMetadata.totalResources,
          errors: this.errors.length,
        },
        strandIds,
        errors: this.errors,
        warnings: this.warnings,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      this.addError({
        type: 'parse',
        message: error instanceof Error ? error.message : 'Unknown error parsing ENEX',
        details: error,
      })

      return {
        success: false,
        statistics: {
          strandsImported: 0,
          strandsSkipped: 0,
          strandsConflicted: 0,
          assetsImported: 0,
          errors: this.errors.length,
        },
        strandIds: [],
        errors: this.errors,
        duration: Date.now() - startTime,
      }
    }
  }

  // ==========================================================================
  // EXPORT (Not supported)
  // ==========================================================================

  async export(): Promise<ExportResult> {
    return {
      success: false,
      filename: '',
      statistics: { strandsExported: 0, assetsExported: 0, totalSizeBytes: 0 },
      errors: ['Evernote export is not supported'],
      duration: 0,
    }
  }

  // ==========================================================================
  // ENEX PARSING
  // ==========================================================================

  /**
   * Parse ENEX XML content
   */
  private parseEnex(content: string): EnexParseResult {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'application/xml')

    // Check for parse errors
    const parseError = doc.getElementsByTagName('parsererror')[0]
    if (parseError) {
      throw new Error(`ENEX parse error: ${parseError.textContent}`)
    }

    const result: EnexParseResult = {
      notes: [],
    }

    // Parse export metadata
    const enExport = doc.getElementsByTagName('en-export')[0]
    if (enExport) {
      const exportDate = enExport.getAttribute('export-date')
      if (exportDate) result.exportDate = new Date(exportDate)
      result.application = enExport.getAttribute('application') || undefined
      result.version = enExport.getAttribute('version') || undefined
    }

    // Parse notes
    const noteElements = doc.getElementsByTagName('note')
    for (let i = 0; i < noteElements.length; i++) {
      const noteEl = noteElements[i]
      const note = this.parseNote(noteEl)
      if (note) {
        result.notes.push(note)
      }
    }

    return result
  }

  /**
   * Parse a single note element
   */
  private parseNote(noteEl: Element): EnexNote | null {
    const getTextContent = (tagName: string): string | undefined => {
      const el = noteEl.getElementsByTagName(tagName)[0]
      return el?.textContent?.trim() || undefined
    }

    const title = getTextContent('title') || 'Untitled'
    const content = getTextContent('content') || ''
    const created = getTextContent('created')
    const updated = getTextContent('updated')
    const author = getTextContent('author')
    const sourceUrl = getTextContent('source-url')

    // Parse tags
    const tags: string[] = []
    const tagElements = noteEl.getElementsByTagName('tag')
    for (let i = 0; i < tagElements.length; i++) {
      const tag = tagElements[i].textContent?.trim()
      if (tag) {
        tags.push(tag)
        const count = this.enexMetadata.tagMap.get(tag) || 0
        this.enexMetadata.tagMap.set(tag, count + 1)
      }
    }
    this.enexMetadata.totalTags += tags.length

    // Parse location
    const noteAttributes = noteEl.getElementsByTagName('note-attributes')[0]
    let latitude: number | undefined
    let longitude: number | undefined
    let altitude: number | undefined

    if (noteAttributes) {
      const lat = noteAttributes.getElementsByTagName('latitude')[0]?.textContent
      const lng = noteAttributes.getElementsByTagName('longitude')[0]?.textContent
      const alt = noteAttributes.getElementsByTagName('altitude')[0]?.textContent

      if (lat) latitude = parseFloat(lat)
      if (lng) longitude = parseFloat(lng)
      if (alt) altitude = parseFloat(alt)
    }

    // Parse resources (attachments)
    const resources: EnexResource[] = []
    const resourceElements = noteEl.getElementsByTagName('resource')
    for (let i = 0; i < resourceElements.length; i++) {
      const resourceEl = resourceElements[i]
      const resource = this.parseResource(resourceEl)
      if (resource) {
        resources.push(resource)
        this.enexMetadata.totalResources++
      }
    }

    return {
      title,
      content,
      created: created ? this.parseEnexDate(created) : undefined,
      updated: updated ? this.parseEnexDate(updated) : undefined,
      author,
      sourceUrl,
      tags,
      latitude,
      longitude,
      altitude,
      resources,
    }
  }

  /**
   * Parse a resource (attachment) element
   */
  private parseResource(resourceEl: Element): EnexResource | null {
    const getTextContent = (tagName: string): string | undefined => {
      const el = resourceEl.getElementsByTagName(tagName)[0]
      return el?.textContent?.trim() || undefined
    }

    const dataEl = resourceEl.getElementsByTagName('data')[0]
    const data = dataEl?.textContent?.trim() || ''
    const encoding = dataEl?.getAttribute('encoding')

    if (!data || encoding !== 'base64') {
      return null
    }

    const mime = getTextContent('mime') || 'application/octet-stream'
    const filename = getTextContent('file-name')

    // Get recognition data for hash
    const recognitionEl = resourceEl.getElementsByTagName('recognition')[0]
    let hash = ''

    // Try to get hash from resource-attributes
    const resourceAttr = resourceEl.getElementsByTagName('resource-attributes')[0]
    if (resourceAttr) {
      const hashEl = resourceAttr.getElementsByTagName('hash')[0]
      if (hashEl) {
        hash = hashEl.textContent?.trim() || ''
      }
    }

    // Get dimensions
    let width: number | undefined
    let height: number | undefined
    const widthEl = resourceEl.getElementsByTagName('width')[0]
    const heightEl = resourceEl.getElementsByTagName('height')[0]
    if (widthEl) width = parseInt(widthEl.textContent || '', 10)
    if (heightEl) height = parseInt(heightEl.textContent || '', 10)

    return {
      hash,
      mime,
      filename,
      data,
      width: width && !isNaN(width) ? width : undefined,
      height: height && !isNaN(height) ? height : undefined,
    }
  }

  /**
   * Parse Evernote date format (yyyyMMddTHHmmssZ)
   */
  private parseEnexDate(dateStr: string): Date {
    // Evernote uses format: 20231225T143000Z
    const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
    if (!match) {
      return new Date(dateStr) // Fallback to standard parsing
    }

    const [, year, month, day, hours, minutes, seconds] = match
    return new Date(Date.UTC(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      parseInt(seconds, 10)
    ))
  }

  // ==========================================================================
  // NOTE CONVERSION
  // ==========================================================================

  /**
   * Convert an Evernote note to a Fabric strand
   */
  private async convertNote(
    note: EnexNote,
    targetWeave: string,
    options: Partial<ImportOptions>
  ): Promise<StrandContent | null> {
    // Convert ENML to Markdown
    const markdown = this.convertEnmlToMarkdown(note.content, note.resources)

    // Generate slug from title
    const slug = this.slugify(note.title)
    const id = this.generateId('strand')

    // Build frontmatter
    const frontmatter: Record<string, unknown> = {
      id,
      title: note.title,
      version: '1.0',
    }

    if (note.created) frontmatter.date = note.created.toISOString()
    if (note.updated) frontmatter.modified = note.updated.toISOString()
    if (note.author) frontmatter.author = note.author
    if (note.sourceUrl) frontmatter.source = note.sourceUrl

    if (note.tags.length > 0) {
      frontmatter.tags = note.tags
      frontmatter.taxonomy = {
        concepts: note.tags.map(tag => ({
          name: tag,
          weight: 1,
        })),
      }
    }

    // Add location if available
    if (note.latitude !== undefined && note.longitude !== undefined) {
      frontmatter.location = {
        latitude: note.latitude,
        longitude: note.longitude,
        altitude: note.altitude,
      }
    }

    // Preserve original Evernote metadata
    frontmatter.evernote = {
      originalTitle: note.title,
      importedAt: new Date().toISOString(),
      resourceCount: note.resources.length,
    }

    // Build path
    const strandPath = `weaves/${targetWeave}/${slug}.md`

    return {
      id,
      path: strandPath,
      slug,
      title: note.title,
      content: markdown,
      frontmatter,
      weave: targetWeave,
      loom: undefined,
      wordCount: markdown.split(/\s+/).length,
      summary: this.extractSummary(markdown),
      lastModified: (note.updated || note.created || new Date()).toISOString(),
    }
  }

  /**
   * Convert ENML (Evernote Markup Language) to Markdown
   */
  private convertEnmlToMarkdown(enml: string, resources: EnexResource[]): string {
    // ENML is essentially XHTML with some Evernote-specific elements

    // 1. Extract content from CDATA if present
    let content = enml
    const cdataMatch = enml.match(/<!\[CDATA\[([\s\S]*)\]\]>/)
    if (cdataMatch) {
      content = cdataMatch[1]
    }

    // 2. Parse as HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')

    // 3. Create resource hash map for looking up attachments
    const resourceMap = new Map<string, EnexResource>()
    for (const resource of resources) {
      if (resource.hash) {
        resourceMap.set(resource.hash, resource)
      }
    }

    // 4. Convert DOM to Markdown
    let markdown = this.convertElementToMarkdown(doc.body, resourceMap)

    // 5. Clean up whitespace
    markdown = markdown
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')

    return markdown
  }

  /**
   * Recursively convert DOM elements to Markdown
   */
  private convertElementToMarkdown(
    element: Element | Node,
    resourceMap: Map<string, EnexResource>,
    depth: number = 0
  ): string {
    if (element.nodeType === Node.TEXT_NODE) {
      return element.textContent || ''
    }

    if (element.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }

    const el = element as Element
    const tagName = el.tagName?.toLowerCase() || ''
    let result = ''

    // Handle different element types
    switch (tagName) {
      case 'en-note':
        // Root element - just process children
        result = this.processChildren(el, resourceMap, depth)
        break

      case 'div':
      case 'p':
        result = this.processChildren(el, resourceMap, depth) + '\n\n'
        break

      case 'br':
        result = '\n'
        break

      case 'h1':
        result = '# ' + this.processChildren(el, resourceMap, depth) + '\n\n'
        break

      case 'h2':
        result = '## ' + this.processChildren(el, resourceMap, depth) + '\n\n'
        break

      case 'h3':
        result = '### ' + this.processChildren(el, resourceMap, depth) + '\n\n'
        break

      case 'h4':
        result = '#### ' + this.processChildren(el, resourceMap, depth) + '\n\n'
        break

      case 'h5':
        result = '##### ' + this.processChildren(el, resourceMap, depth) + '\n\n'
        break

      case 'h6':
        result = '###### ' + this.processChildren(el, resourceMap, depth) + '\n\n'
        break

      case 'b':
      case 'strong':
        result = '**' + this.processChildren(el, resourceMap, depth) + '**'
        break

      case 'i':
      case 'em':
        result = '_' + this.processChildren(el, resourceMap, depth) + '_'
        break

      case 'u':
        // Markdown doesn't have underline, use italics or HTML
        result = '<u>' + this.processChildren(el, resourceMap, depth) + '</u>'
        break

      case 's':
      case 'strike':
        result = '~~' + this.processChildren(el, resourceMap, depth) + '~~'
        break

      case 'code':
        result = '`' + this.processChildren(el, resourceMap, depth) + '`'
        break

      case 'pre':
        result = '```\n' + this.processChildren(el, resourceMap, depth) + '\n```\n\n'
        break

      case 'a': {
        const href = el.getAttribute('href')
        const text = this.processChildren(el, resourceMap, depth)
        if (href) {
          result = `[${text}](${href})`
        } else {
          result = text
        }
        break
      }

      case 'img': {
        const src = el.getAttribute('src')
        const alt = el.getAttribute('alt') || 'image'
        if (src) {
          result = `![${alt}](${src})\n\n`
        }
        break
      }

      case 'en-media': {
        // Evernote embedded media
        const hash = el.getAttribute('hash')
        const type = el.getAttribute('type') || ''

        if (hash && resourceMap.has(hash)) {
          const resource = resourceMap.get(hash)!
          const filename = resource.filename || `attachment-${hash.slice(0, 8)}`

          if (type.startsWith('image/')) {
            // Embed as base64 image
            result = `![${filename}](data:${type};base64,${resource.data})\n\n`
          } else {
            // Link to attachment
            result = `📎 [${filename}](attachment:${hash})\n\n`
          }
        } else {
          result = `[Attachment: ${hash || 'unknown'}]\n\n`
        }
        break
      }

      case 'en-todo': {
        // Evernote checkbox
        const checked = el.getAttribute('checked') === 'true'
        result = checked ? '- [x] ' : '- [ ] '
        break
      }

      case 'ul':
        result = '\n' + this.processListItems(el, resourceMap, '-', depth)
        break

      case 'ol':
        result = '\n' + this.processListItems(el, resourceMap, '1.', depth)
        break

      case 'li':
        result = this.processChildren(el, resourceMap, depth)
        break

      case 'blockquote':
        const quoteContent = this.processChildren(el, resourceMap, depth)
        result = quoteContent
          .split('\n')
          .map(line => '> ' + line)
          .join('\n') + '\n\n'
        break

      case 'table':
        result = this.convertTableToMarkdown(el, resourceMap) + '\n\n'
        break

      case 'hr':
        result = '\n---\n\n'
        break

      case 'span':
      case 'font':
        // Just process children, ignore styling
        result = this.processChildren(el, resourceMap, depth)
        break

      default:
        // Unknown element - just process children
        result = this.processChildren(el, resourceMap, depth)
    }

    return result
  }

  /**
   * Process child nodes of an element
   */
  private processChildren(
    element: Element,
    resourceMap: Map<string, EnexResource>,
    depth: number
  ): string {
    let result = ''
    for (let i = 0; i < element.childNodes.length; i++) {
      result += this.convertElementToMarkdown(element.childNodes[i], resourceMap, depth)
    }
    return result
  }

  /**
   * Process list items
   */
  private processListItems(
    listEl: Element,
    resourceMap: Map<string, EnexResource>,
    marker: string,
    depth: number
  ): string {
    const items: string[] = []
    const indent = '  '.repeat(depth)

    for (let i = 0; i < listEl.children.length; i++) {
      const child = listEl.children[i]
      if (child.tagName?.toLowerCase() === 'li') {
        const content = this.processChildren(child, resourceMap, depth + 1)
        const actualMarker = marker === '1.' ? `${i + 1}.` : marker
        items.push(`${indent}${actualMarker} ${content.trim()}`)
      }
    }

    return items.join('\n') + '\n'
  }

  /**
   * Convert HTML table to Markdown table
   */
  private convertTableToMarkdown(
    tableEl: Element,
    resourceMap: Map<string, EnexResource>
  ): string {
    const rows: string[][] = []

    // Get all rows (handle thead/tbody/tr at various levels)
    const rowEls = tableEl.querySelectorAll('tr')
    for (let i = 0; i < rowEls.length; i++) {
      const row: string[] = []
      const cells = rowEls[i].querySelectorAll('td, th')
      for (let j = 0; j < cells.length; j++) {
        const cellContent = this.processChildren(cells[j], resourceMap, 0)
        row.push(cellContent.trim().replace(/\n/g, ' '))
      }
      if (row.length > 0) {
        rows.push(row)
      }
    }

    if (rows.length === 0) return ''

    // Determine column count
    const colCount = Math.max(...rows.map(r => r.length))

    // Pad rows to have consistent column count
    const paddedRows = rows.map(row => {
      while (row.length < colCount) row.push('')
      return row
    })

    // Build markdown table
    const lines: string[] = []

    // Header row
    lines.push('| ' + paddedRows[0].join(' | ') + ' |')

    // Separator
    lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')

    // Data rows
    for (let i = 1; i < paddedRows.length; i++) {
      lines.push('| ' + paddedRows[i].join(' | ') + ' |')
    }

    return lines.join('\n')
  }

  /**
   * Extract a summary from markdown content
   */
  private extractSummary(markdown: string, maxLength: number = 200): string {
    // Remove headings, images, links (keep text)
    const text = markdown
      .replace(/^#+\s+/gm, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
      .replace(/[*_~`]/g, '')
      .replace(/\n+/g, ' ')
      .trim()

    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3) + '...'
  }
}




