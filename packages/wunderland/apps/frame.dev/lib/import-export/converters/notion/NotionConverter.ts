/**
 * Notion Export Converter
 * @module lib/import-export/converters/notion/NotionConverter
 *
 * Converts Notion exports to Fabric strands.
 * Handles:
 * - HTML exports → Markdown
 * - Markdown exports (passthrough with cleanup)
 * - CSV databases → JSON metadata
 * - Nested page hierarchy → weaves/looms
 * - Embedded images and files
 */

import JSZip from 'jszip'
import matter from 'gray-matter'
import { load } from 'cheerio'
import Papa from 'papaparse'
import { BaseConverter } from '../BaseConverter'
import type {
  ImportFormat,
  ExportFormat,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
  FileWithMetadata,
} from '../../core/types'
import type { StrandContent } from '@/lib/content/types'
import { getContentStore } from '@/lib/content/sqliteStore'

// ============================================================================
// NOTION CONVERTER
// ============================================================================

export class NotionConverter extends BaseConverter {
  readonly name = 'notion'
  readonly supportsImport: ImportFormat[] = ['notion']
  readonly supportsExport: ExportFormat[] = []

  /**
   * Notion-specific metadata
   */
  private notionMetadata = {
    totalPages: 0,
    totalDatabases: 0,
    databaseRecords: new Map<string, any[]>(),
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  async canProcess(input: File | Blob | string): Promise<boolean> {
    if (typeof input === 'string') return false

    try {
      const zip = await JSZip.loadAsync(input)
      const files = Object.keys(zip.files)

      // Notion exports have characteristic structure:
      // - HTML files with UUID suffixes
      // - CSV files for databases
      const hasHtmlWithUUID = files.some(f => /[a-f0-9]{32}\.html$/.test(f))
      const hasMarkdownWithUUID = files.some(f => /[a-f0-9]{32}\.md$/.test(f))
      const hasCsvDatabase = files.some(f => f.endsWith('.csv'))

      return hasHtmlWithUUID || hasMarkdownWithUUID || hasCsvDatabase
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

    try {
      // Parse ZIP
      this.reportProgress(5, 100, 'Extracting Notion export...')
      const zip = await JSZip.loadAsync(input as Blob)

      // Extract files
      const files = await this.extractFiles(zip)
      this.reportProgress(15, 100, `Found ${files.length} files`)

      // Separate pages and databases
      const pages = files.filter(f => f.relativePath.endsWith('.html') || f.relativePath.endsWith('.md'))
      const databases = files.filter(f => f.relativePath.endsWith('.csv'))

      // Process databases first (for metadata)
      for (const dbFile of databases) {
        await this.processDatabaseFile(dbFile)
      }

      // Determine target weave
      const targetWeave = options.targetWeave || 'notion-import'

      // Process pages
      this.reportProgress(20, 100, 'Processing pages...')
      const strands: StrandContent[] = []
      const strandIds: string[] = []

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]

        try {
          const strand = await this.convertPage(page, targetWeave, options)
          if (strand) {
            strands.push(strand)
            strandIds.push(strand.id)
          }
        } catch (error) {
          this.addError({
            type: 'convert',
            message: `Failed to convert ${page.relativePath}`,
            file: page.relativePath,
            details: error,
          })
        }

        const progress = 20 + Math.round((i / pages.length) * 60)
        this.reportProgress(progress, 100, `Processing ${i + 1}/${pages.length}`)
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
          assetsImported: 0,
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
        message: error instanceof Error ? error.message : 'Unknown error',
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
  // FILE EXTRACTION
  // ==========================================================================

  private async extractFiles(zip: JSZip): Promise<FileWithMetadata[]> {
    const files: FileWithMetadata[] = []

    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue

      try {
        const content = await zipEntry.async('blob')
        const file = new File([content], path.split('/').pop() || 'unknown', {
          lastModified: zipEntry.date.getTime(),
        })

        files.push({
          file,
          path,
          relativePath: path,
          size: content.size,
          lastModified: zipEntry.date,
        })
      } catch (error) {
        this.addWarning(`Failed to extract: ${path}`)
      }
    }

    return files
  }

  // ==========================================================================
  // DATABASE PROCESSING
  // ==========================================================================

  private async processDatabaseFile(fileData: FileWithMetadata): Promise<void> {
    const csvText = await this.readFileAsText(fileData.file)

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    })

    if (result.data.length > 0) {
      const dbName = this.getFilename(fileData.relativePath)
      this.notionMetadata.databaseRecords.set(dbName, result.data as any[])
      this.notionMetadata.totalDatabases++
    }
  }

  // ==========================================================================
  // PAGE CONVERSION
  // ==========================================================================

  private async convertPage(
    fileData: FileWithMetadata,
    targetWeave: string,
    options: Partial<ImportOptions>
  ): Promise<StrandContent | null> {
    const isHtml = fileData.relativePath.endsWith('.html')
    const content = await this.readFileAsText(fileData.file)

    let markdown: string
    let title: string

    if (isHtml) {
      const converted = this.htmlToMarkdown(content)
      markdown = converted.markdown
      title = converted.title
    } else {
      // Already markdown
      const { data: frontmatter, content: md } = matter(content)
      markdown = md
      title = frontmatter.title || this.extractTitle(md) || this.getFilename(fileData.relativePath)
    }

    // Build path
    const { weave, loom, slug } = this.buildPath(fileData.relativePath, targetWeave, options)

    // Create strand
    const id = this.generateId('strand')
    const strandPath = loom ? `weaves/${weave}/${loom}/${slug}.md` : `weaves/${weave}/${slug}.md`

    // Extract Notion UUID from filename
    const uuidMatch = fileData.relativePath.match(/([a-f0-9]{32})/)
    const notionId = uuidMatch ? uuidMatch[1] : undefined

    return {
      id,
      path: strandPath,
      slug,
      title,
      content: markdown,
      frontmatter: {
        id,
        title,
        version: '1.0',
        notion: {
          id: notionId,
          importedAt: new Date().toISOString(),
        },
      },
      weave,
      loom,
      wordCount: markdown.split(/\s+/).length,
      lastModified: this.formatDate(fileData.lastModified),
    }
  }

  // ==========================================================================
  // HTML TO MARKDOWN
  // ==========================================================================

  private htmlToMarkdown(html: string): { markdown: string; title: string } {
    const $ = load(html)

    // Extract title
    const title = $('title').text() || $('h1').first().text() || 'Untitled'

    // Get article content
    const article = $('article').first()
    const body = article.length > 0 ? article : $('body')

    let markdown = ''

    // Process child nodes
    body.children().each((_, element) => {
      markdown += this.elementToMarkdown($, element) + '\n\n'
    })

    return {
      markdown: markdown.trim(),
      title,
    }
  }

  private elementToMarkdown($: any, element: any): string {
    const $el = $(element)
    const tagName = element.tagName?.toLowerCase()

    switch (tagName) {
      case 'h1':
        return `# ${$el.text()}`
      case 'h2':
        return `## ${$el.text()}`
      case 'h3':
        return `### ${$el.text()}`
      case 'h4':
        return `#### ${$el.text()}`
      case 'h5':
        return `##### ${$el.text()}`
      case 'h6':
        return `###### ${$el.text()}`

      case 'p':
        return this.convertInlineElements($, $el)

      case 'ul':
        return this.convertList($, $el, false)

      case 'ol':
        return this.convertList($, $el, true)

      case 'pre':
        return `\`\`\`\n${$el.text()}\n\`\`\``

      case 'blockquote':
        const lines = $el.text().split('\n')
        return lines.map((line: string) => `> ${line}`).join('\n')

      case 'hr':
        return '---'

      case 'table':
        return this.convertTable($, $el)

      case 'img':
        const src = $el.attr('src') || ''
        const alt = $el.attr('alt') || ''
        return `![${alt}](${src})`

      default:
        return $el.text()
    }
  }

  private convertInlineElements($: any, $el: any): string {
    let result = ''

    $el.contents().each((_: number, node: any) => {
      if (node.type === 'text') {
        result += node.data
      } else if (node.tagName) {
        const tag = node.tagName.toLowerCase()
        const $node = $(node)

        switch (tag) {
          case 'strong':
          case 'b':
            result += `**${$node.text()}**`
            break
          case 'em':
          case 'i':
            result += `*${$node.text()}*`
            break
          case 'code':
            result += `\`${$node.text()}\``
            break
          case 'a':
            const href = $node.attr('href') || ''
            result += `[${$node.text()}](${href})`
            break
          default:
            result += $node.text()
        }
      }
    })

    return result
  }

  private convertList($: any, $el: any, ordered: boolean): string {
    let result = ''
    let index = 1

    $el.children('li').each((_: number, li: any) => {
      const $li = $(li)
      const prefix = ordered ? `${index}. ` : '- '
      result += prefix + $li.text() + '\n'
      if (ordered) index++
    })

    return result.trim()
  }

  private convertTable($: any, $table: any): string {
    let result = ''

    // Header
    const $thead = $table.find('thead')
    if ($thead.length > 0) {
      const headers: string[] = []
      $thead.find('th').each((_: number, th: any) => {
        headers.push($(th).text())
      })
      result += '| ' + headers.join(' | ') + ' |\n'
      result += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
    }

    // Body
    $table.find('tbody tr').each((_: number, tr: any) => {
      const cells: string[] = []
      $(tr).find('td').each((__: number, td: any) => {
        cells.push($(td).text())
      })
      result += '| ' + cells.join(' | ') + ' |\n'
    })

    return result.trim()
  }

  // ==========================================================================
  // PATH BUILDING
  // ==========================================================================

  private buildPath(
    filePath: string,
    targetWeave: string,
    options: Partial<ImportOptions>
  ): { weave: string; loom: string | undefined; slug: string } {
    // Remove Notion UUID suffix from filename
    const cleanPath = filePath.replace(/\s+[a-f0-9]{32}\.(html|md)$/, '')

    const parts = cleanPath.split('/')
    const fileName = parts.pop() || 'unknown'
    const slug = this.slugify(fileName)

    if (!options.preserveStructure || parts.length === 0) {
      return { weave: targetWeave, loom: undefined, slug }
    }

    const loom = parts.map(p => this.slugify(p)).join('/')
    return { weave: targetWeave, loom, slug }
  }

  // ==========================================================================
  // TITLE EXTRACTION
  // ==========================================================================

  private extractTitle(markdown: string): string | null {
    const h1Match = markdown.match(/^#\s+(.+)$/m)
    return h1Match ? h1Match[1].trim() : null
  }

  // ==========================================================================
  // EXPORT (Not supported)
  // ==========================================================================

  async export(_strands: StrandContent[], _options: Partial<ExportOptions>): Promise<ExportResult> {
    return {
      success: false,
      filename: '',
      statistics: {
        strandsExported: 0,
        assetsExported: 0,
        totalSizeBytes: 0,
      },
      errors: ['Notion export is not supported'],
      duration: 0,
    }
  }
}
