/**
 * Obsidian Vault Converter
 * @module lib/import-export/converters/markdown/ObsidianConverter
 *
 * Converts Obsidian vault exports to Fabric strands.
 * Handles:
 * - [[Wiki links]] → internal Fabric paths
 * - Obsidian frontmatter → Fabric metadata
 * - Tags (#tag) → taxonomy concepts
 * - Folder structure → weaves/looms
 * - Attachments (images, PDFs)
 */

import JSZip from 'jszip'
import matter from 'gray-matter'
import { BaseConverter } from '../BaseConverter'
import type {
  ImportFormat,
  ExportFormat,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
  FileWithMetadata,
  DirectoryStructure,
} from '../../core/types'
import type { StrandContent } from '@/lib/content/types'
import { getContentStore } from '@/lib/content/sqliteStore'

// ============================================================================
// OBSIDIAN CONVERTER
// ============================================================================

export class ObsidianConverter extends BaseConverter {
  readonly name = 'obsidian'
  readonly supportsImport: ImportFormat[] = ['obsidian', 'markdown']
  readonly supportsExport: ExportFormat[] = ['markdown']

  /**
   * Obsidian-specific metadata
   */
  private obsidianMetadata = {
    totalNotes: 0,
    totalAttachments: 0,
    totalWikiLinks: 0,
    tagMap: new Map<string, number>(),
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  async canProcess(input: File | Blob | string): Promise<boolean> {
    if (typeof input === 'string') return false

    try {
      const zip = await JSZip.loadAsync(input)
      const files = Object.keys(zip.files)

      // Check for markdown files
      const hasMarkdown = files.some(f => f.endsWith('.md'))

      // Obsidian vaults typically have .obsidian folder
      const hasObsidianFolder = files.some(f => f.includes('.obsidian/'))

      return hasMarkdown
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
      this.reportProgress(5, 100, 'Extracting vault...')
      const zip = await JSZip.loadAsync(input as Blob)

      // Extract files
      const files = await this.extractFiles(zip)
      this.reportProgress(15, 100, `Found ${files.length} files`)

      // Determine target weave
      const targetWeave = options.targetWeave || 'imported-vault'

      // Process markdown files
      this.reportProgress(20, 100, 'Processing markdown files...')
      const strands: StrandContent[] = []
      const strandIds: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (!file.relativePath.endsWith('.md')) continue

        try {
          const strand = await this.convertFile(file, targetWeave, files, options)
          if (strand) {
            strands.push(strand)
            strandIds.push(strand.id)
          }
        } catch (error) {
          this.addError({
            type: 'convert',
            message: `Failed to convert ${file.relativePath}`,
            file: file.relativePath,
            details: error,
          })
        }

        const progress = 20 + Math.round((i / files.length) * 60)
        this.reportProgress(progress, 100, `Processing ${i + 1}/${files.length}`)
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
          assetsImported: this.obsidianMetadata.totalAttachments,
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
      // Skip directories and hidden files
      if (zipEntry.dir || path.startsWith('.') || path.includes('/.')) {
        continue
      }

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
  // FILE CONVERSION
  // ==========================================================================

  private async convertFile(
    fileData: FileWithMetadata,
    targetWeave: string,
    allFiles: FileWithMetadata[],
    options: Partial<ImportOptions>
  ): Promise<StrandContent | null> {
    const content = await this.readFileAsText(fileData.file)

    // Parse frontmatter
    const { data: frontmatter, content: markdown } = matter(content)

    // Convert wiki links
    const convertedMarkdown = this.convertWikiLinks(markdown, fileData.relativePath, allFiles)

    // Extract Obsidian tags
    const tags = this.extractTags(convertedMarkdown)

    // Build path based on structure
    const { weave, loom, slug } = this.buildPath(fileData.relativePath, targetWeave, options)

    // Create strand ID
    const id = this.generateId('strand')

    // Merge Obsidian frontmatter with Fabric frontmatter
    const fabricFrontmatter = this.convertFrontmatter(frontmatter, tags)

    // Extract title
    const title = frontmatter.title || this.extractTitle(markdown) || this.getFilename(fileData.relativePath)

    // Build full path
    const strandPath = loom ? `weaves/${weave}/${loom}/${slug}.md` : `weaves/${weave}/${slug}.md`

    return {
      id,
      path: strandPath,
      slug,
      title,
      content: convertedMarkdown,
      frontmatter: fabricFrontmatter,
      weave,
      loom,
      wordCount: convertedMarkdown.split(/\s+/).length,
      summary: frontmatter.description || frontmatter.summary,
      lastModified: this.formatDate(fileData.lastModified),
    }
  }

  // ==========================================================================
  // WIKI LINK CONVERSION
  // ==========================================================================

  /**
   * Convert [[Wiki Links]] to Fabric internal links
   */
  private convertWikiLinks(markdown: string, currentPath: string, allFiles: FileWithMetadata[]): string {
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

    return markdown.replace(wikiLinkRegex, (match, target, displayText) => {
      this.obsidianMetadata.totalWikiLinks++

      // Handle section links: [[Note#Section]]
      const [noteName, section] = target.split('#')
      const cleanNoteName = noteName.trim()

      // Find matching file
      const matchedFile = this.findFileByName(cleanNoteName, allFiles)

      if (matchedFile) {
        // Convert to Fabric internal link
        const fabricPath = this.convertPathToFabricPath(matchedFile.relativePath)
        const sectionSuffix = section ? `#${this.slugify(section)}` : ''
        const display = displayText || target

        return `[${display}](/${fabricPath}${sectionSuffix})`
      }

      // If not found, keep as text
      this.addWarning(`Wiki link target not found: ${target} in ${currentPath}`)
      return displayText || target
    })
  }

  /**
   * Find file by note name (without .md extension)
   */
  private findFileByName(noteName: string, allFiles: FileWithMetadata[]): FileWithMetadata | null {
    const normalized = noteName.toLowerCase()

    return (
      allFiles.find(f => {
        const fileName = this.getFilename(f.relativePath).toLowerCase()
        return fileName === normalized
      }) || null
    )
  }

  /**
   * Convert file path to Fabric path
   */
  private convertPathToFabricPath(path: string): string {
    // Remove .md extension and convert to slug
    return path.replace(/\.md$/, '').replace(/\//g, '/')
  }

  // ==========================================================================
  // TAG EXTRACTION
  // ==========================================================================

  /**
   * Extract #tags from markdown content
   */
  private extractTags(markdown: string): string[] {
    const tagRegex = /#([a-zA-Z0-9_/-]+)/g
    const tags = new Set<string>()

    let match
    while ((match = tagRegex.exec(markdown)) !== null) {
      const tag = match[1]
      // Skip numbers-only tags
      if (!/^\d+$/.test(tag)) {
        tags.add(tag)
        const count = this.obsidianMetadata.tagMap.get(tag) || 0
        this.obsidianMetadata.tagMap.set(tag, count + 1)
      }
    }

    return Array.from(tags)
  }

  // ==========================================================================
  // FRONTMATTER CONVERSION
  // ==========================================================================

  /**
   * Convert Obsidian frontmatter to Fabric metadata
   */
  private convertFrontmatter(obsidianFM: any, extractedTags: string[]): any {
    const fabricFM: any = {
      id: this.generateId('strand'),
      version: '1.0',
    }

    // Map common Obsidian fields
    if (obsidianFM.title) fabricFM.title = obsidianFM.title
    if (obsidianFM.author) fabricFM.author = obsidianFM.author
    if (obsidianFM.date) fabricFM.date = obsidianFM.date
    if (obsidianFM.description) fabricFM.description = obsidianFM.description

    // Tags: combine frontmatter tags + inline tags
    const allTags = [
      ...(Array.isArray(obsidianFM.tags) ? obsidianFM.tags : obsidianFM.tags ? [obsidianFM.tags] : []),
      ...extractedTags,
    ]
    if (allTags.length > 0) {
      fabricFM.tags = Array.from(new Set(allTags))
    }

    // Aliases
    if (obsidianFM.aliases) {
      fabricFM.aliases = Array.isArray(obsidianFM.aliases) ? obsidianFM.aliases : [obsidianFM.aliases]
    }

    // Taxonomy: map tags to concepts
    if (allTags.length > 0) {
      fabricFM.taxonomy = {
        concepts: allTags.map(tag => ({
          name: tag,
          weight: 1,
        })),
      }
    }

    // Preserve original Obsidian metadata
    fabricFM.obsidian = {
      originalFrontmatter: obsidianFM,
      importedAt: new Date().toISOString(),
    }

    return fabricFM
  }

  // ==========================================================================
  // PATH BUILDING
  // ==========================================================================

  /**
   * Build weave/loom/slug from file path
   */
  private buildPath(
    filePath: string,
    targetWeave: string,
    options: Partial<ImportOptions>
  ): { weave: string; loom: string | undefined; slug: string } {
    const parts = filePath.split('/')
    const fileName = parts.pop() || 'unknown'
    const slug = this.slugify(this.getFilename(fileName))

    if (!options.preserveStructure || parts.length === 0) {
      // Flat import - all in target weave
      return { weave: targetWeave, loom: undefined, slug }
    }

    // Preserve structure - folders become looms
    const loom = parts.map(p => this.slugify(p)).join('/')

    return { weave: targetWeave, loom, slug }
  }

  // ==========================================================================
  // TITLE EXTRACTION
  // ==========================================================================

  /**
   * Extract title from first H1 heading
   */
  private extractTitle(markdown: string): string | null {
    const h1Match = markdown.match(/^#\s+(.+)$/m)
    return h1Match ? h1Match[1].trim() : null
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  async export(strands: StrandContent[], options: Partial<ExportOptions>): Promise<ExportResult> {
    this.clearErrors()
    const startTime = Date.now()

    try {
      const zip = new JSZip()

      this.reportProgress(10, 100, 'Preparing export...')

      // Create vault folder
      const vaultFolder = zip.folder('obsidian-vault')

      // Export each strand
      for (let i = 0; i < strands.length; i++) {
        const strand = strands[i]

        // Convert Fabric links back to wiki links (optional)
        let content = strand.content

        // Add frontmatter
        const frontmatterStr = this.formatFrontmatter(strand.frontmatter)
        const fullContent = frontmatterStr + '\n\n' + content

        // Determine file path
        const filePath = strand.loom ? `${strand.loom}/${strand.slug}.md` : `${strand.slug}.md`

        vaultFolder?.file(filePath, fullContent)

        const progress = 10 + Math.round((i / strands.length) * 80)
        this.reportProgress(progress, 100, `Exporting ${i + 1}/${strands.length}`)
      }

      // Add .obsidian config (minimal)
      const obsidianFolder = vaultFolder?.folder('.obsidian')
      obsidianFolder?.file(
        'app.json',
        JSON.stringify(
          {
            vimMode: false,
            showLineNumber: false,
          },
          null,
          2
        )
      )

      // Generate ZIP
      this.reportProgress(95, 100, 'Generating archive...')
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })

      const filename = `obsidian-vault-${new Date().toISOString().slice(0, 10)}.zip`

      return {
        success: true,
        blob,
        filename,
        statistics: {
          strandsExported: strands.length,
          assetsExported: 0,
          totalSizeBytes: blob.size,
        },
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        statistics: {
          strandsExported: 0,
          assetsExported: 0,
          totalSizeBytes: 0,
        },
        errors: [error instanceof Error ? error.message : 'Export failed'],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Format frontmatter as YAML
   */
  private formatFrontmatter(frontmatter: any): string {
    if (!frontmatter || Object.keys(frontmatter).length === 0) return ''

    const yaml = ['---']

    for (const [key, value] of Object.entries(frontmatter)) {
      if (value === null || value === undefined) continue

      if (Array.isArray(value)) {
        yaml.push(`${key}:`)
        for (const item of value) {
          yaml.push(`  - ${item}`)
        }
      } else if (typeof value === 'object') {
        // Skip complex objects for now
        continue
      } else {
        yaml.push(`${key}: ${value}`)
      }
    }

    yaml.push('---')
    return yaml.join('\n')
  }
}
