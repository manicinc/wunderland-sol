/**
 * DOCX Generator
 * @module lib/import-export/converters/document/DocxGenerator
 *
 * Exports Fabric strands to Microsoft Word (.docx) format.
 * Uses the 'docx' library for document generation.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, convertInchesToTwip } from 'docx'
import { BaseConverter } from '../BaseConverter'
import type {
  ImportFormat,
  ExportFormat,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
  PageConfig,
} from '../../core/types'
import { PAGE_CONFIGS } from '../../core/types'
import type { StrandContent } from '@/lib/content/types'

// ============================================================================
// DOCX GENERATOR
// ============================================================================

export class DocxGenerator extends BaseConverter {
  readonly name = 'docx-generator'
  readonly supportsImport: ImportFormat[] = []
  readonly supportsExport: ExportFormat[] = ['docx']

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  async canProcess(_input: File | Blob | string): Promise<boolean> {
    return false // Export-only converter
  }

  // ==========================================================================
  // IMPORT (Not supported)
  // ==========================================================================

  async import(_input: File | Blob | string, _options: Partial<ImportOptions>): Promise<ImportResult> {
    return {
      success: false,
      statistics: {
        strandsImported: 0,
        strandsSkipped: 0,
        strandsConflicted: 0,
        assetsImported: 0,
        errors: 1,
      },
      strandIds: [],
      errors: [{ type: 'parse', message: 'DOCX import is not supported' }],
      duration: 0,
    }
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  async export(strands: StrandContent[], options: Partial<ExportOptions>): Promise<ExportResult> {
    this.clearErrors()
    const startTime = Date.now()

    try {
      this.reportProgress(5, 100, 'Preparing document...')

      // Get page configuration
      const pageSize = options.formatOptions?.pagination || 'letter'
      const pageConfig = PAGE_CONFIGS[pageSize]

      // Create document
      const document = this.createDocument(strands, options, pageConfig)

      // Generate DOCX blob
      this.reportProgress(70, 100, 'Generating DOCX...')
      const blob = await Packer.toBlob(document)

      // Generate filename
      const filename = this.generateFilename(strands, options)

      this.reportProgress(100, 100, 'Export complete')

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

  // ==========================================================================
  // DOCUMENT CREATION
  // ==========================================================================

  private createDocument(
    strands: StrandContent[],
    options: Partial<ExportOptions>,
    pageConfig: PageConfig
  ): Document {
    const sections: any[] = []

    // Title page (if multiple strands or metadata enabled)
    if (strands.length > 1 || options.includeMetadata) {
      sections.push({
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(pageConfig.marginTop),
              right: convertInchesToTwip(pageConfig.marginRight),
              bottom: convertInchesToTwip(pageConfig.marginBottom),
              left: convertInchesToTwip(pageConfig.marginLeft),
            },
          },
        },
        children: this.createTitlePage(strands, options),
      })
    }

    // Content
    for (let i = 0; i < strands.length; i++) {
      const strand = strands[i]
      const paragraphs = this.convertMarkdownToParagraphs(strand.content)

      // Add strand title
      if (strands.length > 1) {
        paragraphs.unshift(
          new Paragraph({
            text: strand.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        )
      }

      sections.push({
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(pageConfig.marginTop),
              right: convertInchesToTwip(pageConfig.marginRight),
              bottom: convertInchesToTwip(pageConfig.marginBottom),
              left: convertInchesToTwip(pageConfig.marginLeft),
            },
          },
        },
        children: paragraphs,
      })

      const progress = 5 + Math.round((i / strands.length) * 65)
      this.reportProgress(progress, 100, `Converting ${i + 1}/${strands.length}`)
    }

    // Create document
    const title = strands.length === 1 ? strands[0].title : `Fabric Export - ${strands.length} Documents`

    return new Document({
      title,
      creator: 'Quarry Codex',
      description: options.includeMetadata ? `Exported from Quarry Codex on ${new Date().toLocaleDateString()}` : undefined,
      sections,
    })
  }

  // ==========================================================================
  // TITLE PAGE
  // ==========================================================================

  private createTitlePage(strands: StrandContent[], options: Partial<ExportOptions>): Paragraph[] {
    const paragraphs: Paragraph[] = []

    // Main title
    const title = strands.length === 1 ? strands[0].title : 'Quarry Codex Export'

    paragraphs.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 1440, after: 240 }, // 2 inches before
      })
    )

    // Subtitle
    if (strands.length > 1) {
      paragraphs.push(
        new Paragraph({
          text: `${strands.length} Documents`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 720 },
        })
      )
    }

    // Metadata
    if (options.includeMetadata) {
      paragraphs.push(
        new Paragraph({
          text: '',
          spacing: { after: 480 },
        }),
        new Paragraph({
          text: `Exported: ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
        })
      )

      if (strands.length === 1 && strands[0].frontmatter?.author) {
        paragraphs.push(
          new Paragraph({
            text: `Author: ${strands[0].frontmatter.author}`,
            alignment: AlignmentType.CENTER,
          })
        )
      }
    }

    // Page break
    paragraphs.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    )

    return paragraphs
  }

  // ==========================================================================
  // MARKDOWN CONVERSION
  // ==========================================================================

  private convertMarkdownToParagraphs(markdown: string): Paragraph[] {
    const paragraphs: Paragraph[] = []
    const lines = markdown.split('\n')

    let i = 0
    while (i < lines.length) {
      const line = lines[i]

      // Headings
      if (line.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        )
        i++
        continue
      }

      if (line.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        )
        i++
        continue
      }

      if (line.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          })
        )
        i++
        continue
      }

      // Code blocks
      if (line.startsWith('```')) {
        const codeLines: string[] = []
        i++
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }
        paragraphs.push(
          new Paragraph({
            text: codeLines.join('\n'),
            style: 'Code',
            spacing: { before: 120, after: 120 },
          })
        )
        i++
        continue
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(2),
            style: 'Quote',
            spacing: { before: 120, after: 120 },
          })
        )
        i++
        continue
      }

      // Lists
      if (line.match(/^[-*+]\s/)) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^[-*+]\s/, ''),
            bullet: { level: 0 },
          })
        )
        i++
        continue
      }

      // Empty lines
      if (line.trim() === '') {
        i++
        continue
      }

      // Regular paragraphs
      paragraphs.push(
        new Paragraph({
          children: this.parseInlineFormatting(line),
          spacing: { after: 120 },
        })
      )
      i++
    }

    return paragraphs
  }

  // ==========================================================================
  // INLINE FORMATTING
  // ==========================================================================

  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = []

    // Simple bold/italic parsing
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)

    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
      } else if (part.startsWith('*') && part.endsWith('*')) {
        // Italic
        runs.push(new TextRun({ text: part.slice(1, -1), italics: true }))
      } else if (part.startsWith('`') && part.endsWith('`')) {
        // Inline code
        runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New' }))
      } else if (part) {
        // Regular text
        runs.push(new TextRun({ text: part }))
      }
    }

    return runs
  }

  // ==========================================================================
  // FILENAME GENERATION
  // ==========================================================================

  private generateFilename(strands: StrandContent[], options: Partial<ExportOptions>): string {
    const timestamp = new Date().toISOString().slice(0, 10)

    if (strands.length === 1) {
      const slug = this.slugify(strands[0].title)
      return `${slug}-${timestamp}.docx`
    }

    const prefix = options.weaves?.length === 1 ? options.weaves[0] : 'fabric-export'
    return `${prefix}-${timestamp}.docx`
  }
}
