/**
 * Google Docs Converter
 * @module lib/import-export/converters/google/GoogleDocsConverter
 *
 * Converts Google Docs to Fabric strands.
 * Uses Google Drive API + Docs API to fetch and convert documents.
 */

import { BaseConverter } from '../BaseConverter'
import { getGoogleDriveClient, type DriveFile, type DriveFolder } from './GoogleDriveClient'
import { getGoogleOAuthClient } from './GoogleOAuthClient'
import type {
  ImportFormat,
  ExportFormat,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
} from '../../core/types'
import type { StrandContent } from '@/lib/content/types'
import { getContentStore } from '@/lib/content/sqliteStore'

// ============================================================================
// GOOGLE DOCS CONVERTER
// ============================================================================

export class GoogleDocsConverter extends BaseConverter {
  readonly name = 'google-docs'
  readonly supportsImport: ImportFormat[] = ['google-docs']
  readonly supportsExport: ExportFormat[] = []

  private driveClient = getGoogleDriveClient()
  private oauthClient = getGoogleOAuthClient()

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  async canProcess(input: File | Blob | string): Promise<boolean> {
    if (typeof input !== 'string') return false

    // Input should be a folder ID
    const folderIdPattern = /^[a-zA-Z0-9_-]+$/
    return folderIdPattern.test(input)
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
      // Ensure authenticated
      const isAuth = await this.oauthClient.isAuthenticated()
      if (!isAuth) {
        throw new Error('Not authenticated with Google. Please sign in first.')
      }

      const folderId = input as string

      // Get folder structure
      this.reportProgress(5, 100, 'Loading Drive folder...')
      const folderStructure = await this.driveClient.getFolderStructure(
        folderId,
        options.formatOptions?.includeSubfolders ? 5 : 1
      )

      // Collect all Google Docs
      const docs = this.collectDocs(folderStructure)
      this.reportProgress(15, 100, `Found ${docs.length} documents`)

      // Determine target weave
      const targetWeave = options.targetWeave || 'google-docs-import'

      // Process documents
      const strands: StrandContent[] = []
      const strandIds: string[] = []

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]

        try {
          const strand = await this.convertDoc(doc, targetWeave, folderStructure, options)
          if (strand) {
            strands.push(strand)
            strandIds.push(strand.id)
          }
        } catch (error) {
          this.addError({
            type: 'convert',
            message: `Failed to convert ${doc.file.name}`,
            file: doc.file.name,
            details: error,
          })
        }

        const progress = 15 + Math.round((i / docs.length) * 70)
        this.reportProgress(progress, 100, `Processing ${i + 1}/${docs.length}`)
      }

      // Store strands in database
      this.reportProgress(90, 100, 'Saving to database...')
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
  // DOC COLLECTION
  // ==========================================================================

  /**
   * Recursively collect all Google Docs from folder structure
   */
  private collectDocs(
    folder: DriveFolder,
    parentPath: string = ''
  ): Array<{ file: DriveFile; folderPath: string }> {
    const docs: Array<{ file: DriveFile; folderPath: string }> = []

    // Add docs from current folder
    for (const file of folder.files) {
      if (this.driveClient.isGoogleDoc(file)) {
        docs.push({ file, folderPath: parentPath })
      }
    }

    // Recurse into subfolders
    for (const subfolder of folder.folders) {
      const subpath = parentPath ? `${parentPath}/${subfolder.name}` : subfolder.name
      docs.push(...this.collectDocs(subfolder, subpath))
    }

    return docs
  }

  // ==========================================================================
  // DOC CONVERSION
  // ==========================================================================

  /**
   * Convert a Google Doc to a Fabric strand
   */
  private async convertDoc(
    doc: { file: DriveFile; folderPath: string },
    targetWeave: string,
    _folderStructure: DriveFolder,
    options: Partial<ImportOptions>
  ): Promise<StrandContent | null> {
    const { file, folderPath } = doc

    // Export as plain text (Google doesn't support direct markdown export)
    const textContent = await this.driveClient.exportDoc(file.id, 'text')

    // Convert to markdown (basic conversion)
    const markdown = this.textToMarkdown(textContent)

    // Build path
    const slug = this.slugify(file.name)
    const loom = options.preserveStructure && folderPath ? this.slugify(folderPath) : undefined
    const strandPath = loom ? `weaves/${targetWeave}/${loom}/${slug}.md` : `weaves/${targetWeave}/${slug}.md`

    // Create strand
    const id = this.generateId('strand')

    return {
      id,
      path: strandPath,
      slug,
      title: file.name,
      content: markdown,
      frontmatter: {
        id,
        title: file.name,
        version: '1.0',
        googleDocs: {
          id: file.id,
          webViewLink: file.webViewLink,
          importedAt: new Date().toISOString(),
          modifiedTime: file.modifiedTime,
        },
      },
      weave: targetWeave,
      loom,
      wordCount: markdown.split(/\s+/).length,
      lastModified: file.modifiedTime,
      githubUrl: file.webViewLink,
    }
  }

  // ==========================================================================
  // TEXT TO MARKDOWN
  // ==========================================================================

  /**
   * Convert plain text to basic markdown
   * (Google Docs API doesn't preserve formatting in plain text export)
   */
  private textToMarkdown(text: string): string {
    // For now, return as-is
    // TODO: Use Docs API to get structured content and preserve formatting
    return text
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
      errors: ['Google Docs export is not supported'],
      duration: 0,
    }
  }
}
