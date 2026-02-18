# Developer Guide: Custom Converters

Learn how to extend Frame.dev's import/export system with custom format converters.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Creating a Converter](#creating-a-converter)
- [Implementing Import](#implementing-import)
- [Implementing Export](#implementing-export)
- [Registration & Integration](#registration--integration)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────┐
│                   User Interface                     │
│              (ImportWizard, ExportWizard)            │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                Job Queue System                      │
│         (Background processing, progress)            │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│          ImportManager / ExportManager               │
│        (Orchestration, converter registry)           │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│               Your Converter                         │
│           (Format-specific logic)                    │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Worker Pool                             │
│        (Parallel processing, isolation)              │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Content Store                           │
│              (SQLite storage)                        │
└─────────────────────────────────────────────────────┘
```

### Converter Pattern

All converters extend `BaseConverter` which provides:
- ✅ Progress tracking
- ✅ Error handling
- ✅ File operations (ZIP, read, write)
- ✅ String utilities (slugify, sanitize)
- ✅ Batch processing
- ✅ ID generation

---

## Creating a Converter

### Step 1: Define Your Converter Class

Create a new file in `/lib/import-export/converters/[category]/`:

```typescript
// lib/import-export/converters/wiki/MediaWikiConverter.ts

import { BaseConverter } from '../BaseConverter'
import type {
  ImportFormat,
  ExportFormat,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
} from '../../core/types'
import type { StrandContent } from '@/lib/content/types'

export class MediaWikiConverter extends BaseConverter {
  // Required properties
  readonly name = 'mediawiki'
  readonly supportsImport: ImportFormat[] = ['mediawiki']
  readonly supportsExport: ExportFormat[] = []

  // Validation
  async canProcess(input: File | Blob | string): Promise<boolean> {
    // Check if input is valid MediaWiki export
    if (input instanceof File) {
      return input.name.endsWith('.xml') && input.type === 'text/xml'
    }
    return false
  }

  // Import implementation
  async import(
    input: File | Blob | string,
    options: Partial<ImportOptions>
  ): Promise<ImportResult> {
    // Implementation here
  }

  // Export implementation (if supported)
  async export(
    strands: StrandContent[],
    options: Partial<ExportOptions>
  ): Promise<ExportResult> {
    return {
      success: false,
      filename: '',
      statistics: {
        strandsExported: 0,
        assetsExported: 0,
        totalSizeBytes: 0,
      },
      errors: ['MediaWiki export is not supported'],
      duration: 0,
    }
  }
}
```

### Step 2: Add Format Type

Update `/lib/import-export/core/types.ts`:

```typescript
export type ImportFormat =
  | 'obsidian'
  | 'notion'
  | 'google-docs'
  | 'markdown'
  | 'mediawiki' // Add your format

export type ExportFormat =
  | 'markdown'
  | 'json'
  | 'pdf'
  | 'docx'
  | 'mediawiki' // If supporting export
```

---

## Implementing Import

### Parse Input

```typescript
async import(
  input: File | Blob | string,
  options: Partial<ImportOptions>
): Promise<ImportResult> {
  this.clearErrors() // Reset error state
  const startTime = Date.now()

  try {
    // Report initial progress
    this.reportProgress(0, 100, 'Starting import...')

    // Step 1: Parse input based on type
    let data: ParsedData

    if (input instanceof File || input instanceof Blob) {
      // Read file content
      const content = await this.readFileAsText(input)
      data = this.parseMediaWiki(content)
    } else if (typeof input === 'string') {
      // Handle URL or direct XML
      data = this.parseMediaWiki(input)
    } else {
      throw new Error('Invalid input type')
    }

    this.reportProgress(20, 100, 'Parsed input')

    // Step 2: Convert to strands
    const strands = await this.convertToStrands(data, options)
    this.reportProgress(60, 100, 'Converted to strands')

    // Step 3: Store in database
    await this.storeStrands(strands, options.targetWeave || 'mediawiki-import')
    this.reportProgress(90, 100, 'Saving to database')

    // Step 4: Return result
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
      strandIds: strands.map(s => s.id),
      errors: this.errors,
      warnings: this.warnings,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    this.addError({
      type: 'parse',
      message: error instanceof Error ? error.message : 'Import failed',
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
```

### Use Base Converter Utilities

```typescript
private async convertToStrands(
  data: ParsedData,
  options: Partial<ImportOptions>
): Promise<StrandContent[]> {
  const strands: StrandContent[] = []

  // Process in batches for better performance
  await this.processBatch(
    data.pages,
    async (page, index) => {
      // Generate unique ID
      const id = this.generateId('strand')

      // Slugify title
      const slug = this.slugify(page.title)

      // Sanitize content
      const content = this.sanitizeMarkdown(page.content)

      // Create strand
      const strand: StrandContent = {
        id,
        slug,
        title: page.title,
        content,
        path: `weaves/${options.targetWeave}/${slug}.md`,
        frontmatter: {
          id,
          title: page.title,
          version: '1.0',
          imported: this.formatDate(new Date()),
          originalId: page.id,
        },
        weave: options.targetWeave,
        wordCount: this.countWords(content),
        lastModified: page.lastModified,
      }

      strands.push(strand)

      // Report progress
      this.reportProgress(
        60 + Math.round((index / data.pages.length) * 30),
        100,
        `Converted ${index + 1}/${data.pages.length}`,
        page.title
      )
    },
    10 // Batch size
  )

  return strands
}
```

### Store Strands

```typescript
private async storeStrands(
  strands: StrandContent[],
  targetWeave: string
): Promise<void> {
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
}
```

---

## Implementing Export

### Generate Output

```typescript
async export(
  strands: StrandContent[],
  options: Partial<ExportOptions>
): Promise<ExportResult> {
  this.clearErrors()
  const startTime = Date.now()

  try {
    this.reportProgress(5, 100, 'Preparing export...')

    // Convert strands to your format
    const data = this.convertFromStrands(strands, options)
    this.reportProgress(50, 100, 'Converted data')

    // Generate output file
    const blob = await this.generateFile(data, options)
    this.reportProgress(90, 100, 'Generated file')

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
```

### Generate Filename

```typescript
private generateFilename(
  strands: StrandContent[],
  options: Partial<ExportOptions>
): string {
  const timestamp = new Date().toISOString().slice(0, 10)

  if (strands.length === 1) {
    const slug = this.slugify(strands[0].title)
    return `${slug}-${timestamp}.xml`
  }

  const prefix = options.weaves?.length === 1
    ? options.weaves[0]
    : 'mediawiki-export'

  return `${prefix}-${timestamp}.xml`
}
```

---

## Registration & Integration

### Step 1: Register Converter

Update `/lib/import-export/index.ts`:

```typescript
import { MediaWikiConverter } from './converters/wiki/MediaWikiConverter'

export function initializeImportExport(): void {
  console.log('[ImportExport] Initializing import/export system...')

  const importManager = getImportManager()
  const exportManager = getExportManager()

  // Register existing converters...

  // Register your new converter
  const mediaWikiConverter = new MediaWikiConverter()
  importManager.registerConverter('mediawiki', mediaWikiConverter)
  // exportManager.registerConverter('mediawiki', mediaWikiConverter) // If export supported

  console.log('[ImportExport] Registered converters:')
  console.log('  - MediaWiki (import)')
}
```

### Step 2: Register Job Processor

Update `/lib/import-export/index.ts`:

```typescript
export function initializeImportExport(): void {
  // ... existing code

  // Register job processors
  registerJobProcessor('import-mediawiki', createImportProcessor('mediawiki'))
  // registerJobProcessor('export-mediawiki', createExportProcessor('mediawiki'))
}
```

### Step 3: Add to Job Types

Update `/lib/jobs/types.ts`:

```typescript
export type JobType =
  | 'flashcard_generation'
  | 'glossary_generation'
  | 'quiz_generation'
  | 'rating_generation'
  | 'import-obsidian'
  | 'import-notion'
  | 'import-google-docs'
  | 'import-markdown'
  | 'import-mediawiki' // Add this
  | 'export-pdf'
  | 'export-docx'
  | 'export-markdown'
  | 'export-json'
```

### Step 4: Add to UI

Update `/components/quarry/ui/ImportWizard.tsx`:

```typescript
const SOURCE_OPTIONS: SourceOption[] = [
  // ... existing options
  {
    id: 'mediawiki',
    name: 'MediaWiki Export',
    description: 'Import from MediaWiki XML export',
    icon: FileText,
    color: 'amber',
  },
]
```

---

## Testing

### Unit Tests

Create `/tests/import-export/mediawiki.test.ts`:

```typescript
import { MediaWikiConverter } from '@/lib/import-export/converters/wiki/MediaWikiConverter'

describe('MediaWikiConverter', () => {
  let converter: MediaWikiConverter

  beforeEach(() => {
    converter = new MediaWikiConverter()
  })

  describe('canProcess', () => {
    it('should accept valid MediaWiki XML files', async () => {
      const file = new File(['<mediawiki>...</mediawiki>'], 'export.xml', {
        type: 'text/xml',
      })
      expect(await converter.canProcess(file)).toBe(true)
    })

    it('should reject non-XML files', async () => {
      const file = new File(['content'], 'export.txt', { type: 'text/plain' })
      expect(await converter.canProcess(file)).toBe(false)
    })
  })

  describe('import', () => {
    it('should convert MediaWiki pages to strands', async () => {
      const xml = `
        <mediawiki>
          <page>
            <title>Test Page</title>
            <revision>
              <text>Page content</text>
            </revision>
          </page>
        </mediawiki>
      `
      const file = new File([xml], 'export.xml', { type: 'text/xml' })

      const result = await converter.import(file, { targetWeave: 'test' })

      expect(result.success).toBe(true)
      expect(result.statistics.strandsImported).toBe(1)
    })

    it('should handle errors gracefully', async () => {
      const invalidXml = 'not xml'
      const file = new File([invalidXml], 'export.xml', { type: 'text/xml' })

      const result = await converter.import(file, {})

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
```

### Integration Tests

Test end-to-end with real exports:

```typescript
describe('MediaWiki Integration', () => {
  it('should import a real MediaWiki export', async () => {
    // Load fixture
    const exportData = await fs.readFile('./fixtures/mediawiki-export.xml')
    const file = new File([exportData], 'export.xml', { type: 'text/xml' })

    // Import
    const manager = getImportManager()
    const result = await manager.import(file, {
      format: 'mediawiki',
      targetWeave: 'test-import',
    })

    // Verify
    expect(result.success).toBe(true)
    expect(result.strandIds.length).toBeGreaterThan(0)

    // Check database
    const store = getContentStore()
    const strands = await store.getStrandsByWeave('test-import')
    expect(strands.length).toBe(result.strandIds.length)
  })
})
```

---

## Best Practices

### Error Handling

```typescript
try {
  // Risky operation
  const data = await parseComplexFormat(input)
} catch (error) {
  // Add error with context
  this.addError({
    type: 'parse',
    message: 'Failed to parse file',
    file: fileName,
    details: error,
  })

  // Continue processing if possible
  // Or throw if fatal
  throw new Error('Fatal parse error')
}
```

### Progress Reporting

```typescript
// Report progress frequently
this.reportProgress(current, total, message, currentItem)

// Example: processing 100 files
for (let i = 0; i < files.length; i++) {
  const file = files[i]
  await processFile(file)

  this.reportProgress(
    i + 1,
    files.length,
    `Processing files`,
    file.name
  )
}
```

### Memory Management

```typescript
// Use streaming for large files
const stream = createReadStream(file)
const chunks: Buffer[] = []

for await (const chunk of stream) {
  chunks.push(chunk)

  // Report progress during read
  this.reportProgress(bytesRead, totalSize, 'Reading file...')
}

// Or use batching
await this.processBatch(
  items,
  async (item) => {
    // Process one item
  },
  10 // Batch size (prevents memory overflow)
)
```

### Sanitization

```typescript
// Always sanitize user content
const sanitized = this.sanitizeMarkdown(userContent)

// Remove dangerous HTML
const safe = this.stripHtml(htmlContent)

// Escape special characters
const escaped = this.escapeHtml(text)
```

---

## Examples

### Example 1: CSV Converter

```typescript
import Papa from 'papaparse'

export class CSVConverter extends BaseConverter {
  readonly name = 'csv'
  readonly supportsImport: ImportFormat[] = ['csv']
  readonly supportsExport: ExportFormat[] = ['csv']

  async import(
    input: File | Blob | string,
    options: Partial<ImportOptions>
  ): Promise<ImportResult> {
    const content = await this.readFileAsText(input)

    // Parse CSV
    const result = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
    })

    const strands: StrandContent[] = []

    for (const row of result.data) {
      const id = this.generateId('strand')
      const title = row['Title'] || `Row ${strands.length + 1}`
      const content = row['Content'] || ''

      strands.push({
        id,
        slug: this.slugify(title),
        title,
        content,
        path: `weaves/${options.targetWeave}/${this.slugify(title)}.md`,
        frontmatter: { id, title, version: '1.0' },
        weave: options.targetWeave,
        wordCount: this.countWords(content),
      })
    }

    await this.storeStrands(strands, options.targetWeave || 'csv-import')

    return {
      success: true,
      statistics: {
        strandsImported: strands.length,
        strandsSkipped: 0,
        strandsConflicted: 0,
        assetsImported: 0,
        errors: 0,
      },
      strandIds: strands.map(s => s.id),
      duration: 0,
    }
  }

  async export(
    strands: StrandContent[],
    options: Partial<ExportOptions>
  ): Promise<ExportResult> {
    // Convert strands to CSV rows
    const rows = strands.map(strand => ({
      Title: strand.title,
      Content: strand.content,
      Path: strand.path,
      Weave: strand.weave,
      Loom: strand.loom || '',
      'Word Count': strand.wordCount || 0,
      'Last Modified': strand.lastModified || '',
    }))

    // Generate CSV
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })

    return {
      success: true,
      blob,
      filename: `export-${new Date().toISOString().slice(0, 10)}.csv`,
      statistics: {
        strandsExported: strands.length,
        assetsExported: 0,
        totalSizeBytes: blob.size,
      },
      duration: 0,
    }
  }
}
```

---

## API Reference

### BaseConverter Methods

```typescript
class BaseConverter {
  // Progress
  protected reportProgress(current: number, total: number, message?: string, currentItem?: string): void

  // Error handling
  protected addError(error: ImportError): void
  protected addWarning(warning: string): void
  protected clearErrors(): void

  // File operations
  protected async extractZip(zipFile: File | Blob): Promise<FileWithMetadata[]>
  protected async readFileAsText(file: File | Blob): Promise<string>
  protected async readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer>
  protected async createZip(files: FileWithMetadata[]): Promise<Blob>

  // String utilities
  protected slugify(text: string): string
  protected sanitizeFilename(filename: string): string
  protected sanitizeMarkdown(markdown: string): string
  protected stripHtml(html: string): string
  protected escapeHtml(text: string): string

  // Date/time
  protected formatDate(date: Date, format?: 'iso' | 'date' | 'datetime'): string
  protected parseDate(dateString: string): Date

  // Content utilities
  protected countWords(text: string): number
  protected extractFrontmatter(markdown: string): { frontmatter: Record<string, any>, content: string }
  protected addFrontmatter(content: string, frontmatter: Record<string, any>): string

  // Batch processing
  protected async processBatch<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    batchSize?: number
  ): Promise<R[]>

  // ID generation
  protected generateId(prefix: string): string
}
```

---

## Resources

- [BaseConverter Source](../lib/import-export/converters/BaseConverter.ts)
- [ObsidianConverter Example](../lib/import-export/converters/markdown/ObsidianConverter.ts)
- [Type Definitions](../lib/import-export/core/types.ts)
- [Job Queue System](../lib/jobs/jobQueue.ts)

---

*Last updated: 2025-12-22*
*Frame.dev v1.0 - Developer Guide*
