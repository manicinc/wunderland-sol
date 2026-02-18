/**
 * Strand Exporter
 *
 * Exports individual strands in various formats:
 * - Markdown (.md) - raw file
 * - Plain Text (.txt) - stripped markdown
 * - JSON (.json) - structured data with frontmatter
 * - PDF (.pdf) - rendered document
 * - ZIP Bundle - complete package with assets
 *
 * @module lib/export/strandExporter
 */

import JSZip from 'jszip'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } from 'docx'
import type { StrandMetadata, GitHubFile } from '@/components/quarry/types'
import { evaluateFormula, createFormulaContext } from '@/lib/formulas/formulaEngine'

// ============================================================================
// TYPES
// ============================================================================

export interface StrandExportOptions {
  /** File path of the strand */
  filePath: string
  /** File name */
  fileName: string
  /** Raw markdown content */
  content: string
  /** Parsed frontmatter metadata */
  metadata: StrandMetadata
  /** All files in the knowledge base (for resolving related strands) */
  allFiles?: GitHubFile[]
  /** GitHub repo info (for raw file URLs) */
  github?: {
    owner: string
    repo: string
    branch: string
  }
  /** Include computed formula values in export (Embark-style) */
  includeComputedFormulas?: boolean
  /** Include resolved mention data in export */
  includeResolvedMentions?: boolean
}

export interface RelatedStrand {
  path: string
  name: string
  type: 'backlink' | 'forwardlink'
}

export interface ZipBundleContents {
  /** The strand markdown file */
  markdown: string
  /** strand.yml schema file */
  schema: string
  /** metadata.json - frontmatter as JSON */
  metadata: string
  /** related.json - backlinks and forward links */
  related: string
  /** Map of asset paths to their blob data */
  assets: Map<string, Blob>
}

// ============================================================================
// MARKDOWN STRIPPING
// ============================================================================

/**
 * Strip markdown formatting to get plain text
 */
export function stripMarkdown(markdown: string): string {
  let text = markdown

  // Remove frontmatter
  text = text.replace(/^---[\s\S]*?---\n*/m, '')

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/`[^`]+`/g, (match) => match.slice(1, -1))

  // Remove images (keep alt text)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')

  // Remove links (keep text)
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove headers formatting
  text = text.replace(/^#{1,6}\s+/gm, '')

  // Remove emphasis
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')
  text = text.replace(/~~([^~]+)~~/g, '$1')

  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '')

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '')

  // Remove list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, '')
  text = text.replace(/^[\s]*\d+\.\s+/gm, '')

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Normalize whitespace
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  return text
}

// ============================================================================
// IMAGE EXTRACTION
// ============================================================================

/**
 * Extract image paths from markdown content
 */
export function extractImagePaths(markdown: string): string[] {
  const paths: string[] = []

  // Match ![alt](path) and <img src="path">
  const mdImageRegex = /!\[[^\]]*\]\(([^)]+)\)/g
  const htmlImageRegex = /<img[^>]+src=["']([^"']+)["']/g

  let match
  while ((match = mdImageRegex.exec(markdown)) !== null) {
    const path = match[1].split(' ')[0] // Remove title if present
    if (!path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('data:')) {
      paths.push(path)
    }
  }

  while ((match = htmlImageRegex.exec(markdown)) !== null) {
    const path = match[1]
    if (!path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('data:')) {
      paths.push(path)
    }
  }

  return [...new Set(paths)] // Deduplicate
}

/**
 * Resolve relative path from strand location
 */
export function resolveAssetPath(strandPath: string, assetPath: string): string {
  if (assetPath.startsWith('/')) {
    return assetPath.slice(1) // Absolute from root
  }

  const strandDir = strandPath.split('/').slice(0, -1).join('/')
  const parts = [...strandDir.split('/'), ...assetPath.split('/')]
  const resolved: string[] = []

  for (const part of parts) {
    if (part === '..') {
      resolved.pop()
    } else if (part !== '.' && part !== '') {
      resolved.push(part)
    }
  }

  return resolved.join('/')
}

// ============================================================================
// RELATED STRANDS
// ============================================================================

/**
 * Find backlinks - strands that link to this strand
 */
export function findBacklinks(
  currentPath: string,
  allFiles: GitHubFile[]
): RelatedStrand[] {
  // This is a simplified version - real implementation would parse content
  // For now, return empty array as we'd need to scan all file contents
  return []
}

/**
 * Extract forward links from markdown content
 */
export function extractForwardLinks(
  markdown: string,
  allFiles: GitHubFile[]
): RelatedStrand[] {
  const links: RelatedStrand[] = []
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

  let match
  while ((match = linkRegex.exec(markdown)) !== null) {
    const href = match[2]

    // Check if it's an internal link
    if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')) {
      // Clean the path
      let cleanPath = href.split('#')[0].split('?')[0]
      if (!cleanPath.endsWith('.md')) {
        cleanPath += '.md'
      }

      // Check if file exists
      const foundFile = allFiles.find((f) =>
        f.path.endsWith(cleanPath) || f.path === cleanPath
      )

      if (foundFile) {
        links.push({
          path: foundFile.path,
          name: foundFile.name.replace('.md', ''),
          type: 'forwardlink',
        })
      }
    }
  }

  return links
}

// ============================================================================
// FORMULA COMPUTATION (Embark-style)
// ============================================================================

interface ComputedFormula {
  original: string
  fieldName?: string
  expression: string
  result: unknown
  error?: string
}

/**
 * Extract and compute all formulas from markdown content
 * Follows Embark's approach of reifying computations
 */
export async function computeFormulas(
  content: string,
  strandPath: string
): Promise<ComputedFormula[]> {
  const results: ComputedFormula[] = []

  // Match formula code blocks: ```formula or ```formula:fieldName
  const formulaBlockPattern = /```formula(?::([a-zA-Z0-9_-]+))?\n([\s\S]*?)\n```/g
  let match: RegExpExecArray | null

  while ((match = formulaBlockPattern.exec(content)) !== null) {
    const fieldName = match[1]
    const expression = match[2].trim()
    const original = match[0]

    try {
      const context = createFormulaContext({
        currentStrandPath: strandPath,
        mentions: [],
        fields: {},
        siblings: [],
      })

      const result = await evaluateFormula(expression, context)
      results.push({ original, fieldName, expression, result })
    } catch (error) {
      results.push({
        original,
        fieldName,
        expression,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Also match inline formulas: =FUNCTION(...)
  const inlineFormulaPattern = /=([A-Z_]+)\(([^)]*)\)/g

  while ((match = inlineFormulaPattern.exec(content)) !== null) {
    const expression = match[0]

    // Skip if already processed as part of a formula block
    if (results.some((r) => r.expression.includes(expression))) continue

    try {
      const context = createFormulaContext({
        currentStrandPath: strandPath,
        mentions: [],
        fields: {},
        siblings: [],
      })

      const result = await evaluateFormula(expression, context)
      results.push({ original: expression, expression, result })
    } catch (error) {
      results.push({
        original: expression,
        expression,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return results
}

/**
 * Replace formula blocks with computed values in content
 * Maintains readability while including computed results
 */
export function replaceFormulasWithResults(
  content: string,
  computedFormulas: ComputedFormula[]
): string {
  let result = content

  for (const formula of computedFormulas) {
    const valueStr = formula.error
      ? `[Error: ${formula.error}]`
      : formatFormulaResult(formula.result)

    if (formula.original.startsWith('```formula')) {
      // Replace code block with formatted result
      const replacement = formula.fieldName
        ? `**${formula.fieldName}:** ${valueStr}`
        : valueStr

      // Add the formula expression as a comment for reference
      const fullReplacement = `${replacement}\n\n<!-- Formula: ${formula.expression} -->`
      result = result.replace(formula.original, fullReplacement)
    } else {
      // Replace inline formula with just the value
      result = result.replace(formula.original, valueStr)
    }
  }

  return result
}

/**
 * Format formula result for display in exported content
 */
function formatFormulaResult(value: unknown): string {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'number') {
    // Format numbers nicely
    if (Number.isInteger(value)) return value.toString()
    return value.toFixed(2)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value.map((v) => formatFormulaResult(v)).join(', ')
  }
  if (typeof value === 'object') {
    // For objects, try to extract a meaningful display value
    const obj = value as Record<string, unknown>
    if (obj.label) return String(obj.label)
    if (obj.name) return String(obj.name)
    if (obj.value) return formatFormulaResult(obj.value)
    return JSON.stringify(obj)
  }
  return String(value)
}

/**
 * Process content with computed formulas and resolved mentions
 */
export async function processContentForExport(
  content: string,
  options: StrandExportOptions
): Promise<string> {
  let processed = content

  // Compute and replace formulas if enabled
  if (options.includeComputedFormulas) {
    try {
      const formulas = await computeFormulas(content, options.filePath)
      processed = replaceFormulasWithResults(processed, formulas)
    } catch (error) {
      console.warn('[StrandExporter] Formula computation failed:', error)
    }
  }

  // Resolve mentions if enabled
  if (options.includeResolvedMentions) {
    // Expand @[Label](id) mentions to include resolved data
    // For now, keep the labels as-is but could enhance with tooltips/metadata
    processed = processed.replace(
      /@\[([^\]]+?)\]\(([^)]+?)\)/g,
      (_, label) => `**@${label}**`
    )
  }

  return processed
}

// ============================================================================
// SCHEMA GENERATION
// ============================================================================

/**
 * Generate strand.yml schema content
 */
export function generateSchema(options: StrandExportOptions): string {
  const { metadata, filePath, fileName } = options

  const schema: Record<string, unknown> = {
    strand: {
      path: filePath,
      name: fileName.replace('.md', ''),
      type: 'document',
    },
    metadata: {
      title: metadata.title || fileName.replace('.md', ''),
      description: metadata.description || '',
      created: metadata.date || new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  }

  if (metadata.tags) {
    schema.taxonomy = { tags: metadata.tags }
  }

  if (metadata.author) {
    schema.attribution = { author: metadata.author }
  }

  // Convert to YAML-like format
  return formatAsYaml(schema)
}

/**
 * Simple YAML-like formatter (without external dependency)
 */
function formatAsYaml(obj: Record<string, unknown>, indent = 0): string {
  const spaces = '  '.repeat(indent)
  let result = ''

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n`
      result += formatAsYaml(value as Record<string, unknown>, indent + 1)
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`
      for (const item of value) {
        result += `${spaces}  - ${item}\n`
      }
    } else {
      result += `${spaces}${key}: ${value}\n`
    }
  }

  return result
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export strand as plain text
 * Includes computed formula values if enabled (Embark-style)
 */
export async function exportAsText(options: StrandExportOptions): Promise<string> {
  const processedContent = await processContentForExport(options.content, options)
  return stripMarkdown(processedContent)
}

/**
 * Export strand as plain text (sync version for backwards compatibility)
 */
export function exportAsTextSync(options: StrandExportOptions): string {
  return stripMarkdown(options.content)
}

/**
 * Export strand as JSON
 * Includes computed formula values and resolved mentions if enabled
 */
export async function exportAsJSON(options: StrandExportOptions): Promise<string> {
  const { metadata, content, filePath, fileName, allFiles = [] } = options

  const forwardLinks = extractForwardLinks(content, allFiles)

  // Compute formulas if enabled
  let computedFormulas: ComputedFormula[] = []
  if (options.includeComputedFormulas) {
    try {
      computedFormulas = await computeFormulas(content, filePath)
    } catch (error) {
      console.warn('[StrandExporter] Formula computation for JSON failed:', error)
    }
  }

  // Process content
  const processedContent = await processContentForExport(content, options)

  const data = {
    path: filePath,
    name: fileName,
    metadata: {
      ...metadata,
      exportedAt: new Date().toISOString(),
    },
    content: {
      raw: content,
      processed: processedContent !== content ? processedContent : undefined,
      plain: stripMarkdown(processedContent),
      wordCount: stripMarkdown(processedContent).split(/\s+/).filter(Boolean).length,
    },
    relations: {
      forwardLinks: forwardLinks.map((l) => ({ path: l.path, name: l.name })),
      images: extractImagePaths(content),
    },
    // Embark-style: Include computed formula data
    computations: computedFormulas.length > 0 ? {
      formulas: computedFormulas.map(f => ({
        fieldName: f.fieldName,
        expression: f.expression,
        result: f.result,
        error: f.error,
      })),
    } : undefined,
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Export strand as JSON (sync version for backwards compatibility)
 */
export function exportAsJSONSync(options: StrandExportOptions): string {
  const { metadata, content, filePath, fileName, allFiles = [] } = options

  const forwardLinks = extractForwardLinks(content, allFiles)

  const data = {
    path: filePath,
    name: fileName,
    metadata: {
      ...metadata,
      exportedAt: new Date().toISOString(),
    },
    content: {
      raw: content,
      plain: stripMarkdown(content),
      wordCount: stripMarkdown(content).split(/\s+/).filter(Boolean).length,
    },
    relations: {
      forwardLinks: forwardLinks.map((l) => ({ path: l.path, name: l.name })),
      images: extractImagePaths(content),
    },
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Export strand as PDF using browser print
 */
export async function exportAsPDF(
  options: StrandExportOptions,
  renderedHtml?: string
): Promise<Blob> {
  // Create a temporary iframe for printing
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    throw new Error('Could not create print document')
  }

  // Build print-optimized HTML
  const title = options.metadata.title || options.fileName.replace('.md', '')
  const htmlContent = renderedHtml || `<pre>${options.content}</pre>`

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @media print {
          body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            max-width: 100%;
            margin: 0;
            padding: 20mm;
            color: #000;
          }
          h1 { font-size: 24pt; margin-bottom: 0.5em; }
          h2 { font-size: 18pt; margin-top: 1.5em; }
          h3 { font-size: 14pt; margin-top: 1.2em; }
          pre, code {
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            background: #f5f5f5;
            padding: 0.5em;
            overflow-wrap: break-word;
          }
          img { max-width: 100%; height: auto; }
          a { color: #000; text-decoration: underline; }
          .metadata { 
            color: #666; 
            font-size: 10pt; 
            margin-bottom: 2em;
            padding-bottom: 1em;
            border-bottom: 1px solid #ccc;
          }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="metadata">
        ${options.metadata.author ? `<p>Author: ${options.metadata.author}</p>` : ''}
        ${options.metadata.date ? `<p>Date: ${options.metadata.date}</p>` : ''}
        <p>Exported: ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="content">
        ${htmlContent}
      </div>
    </body>
    </html>
  `)
  doc.close()

  // Trigger print dialog
  return new Promise((resolve, reject) => {
    iframe.onload = () => {
      try {
        iframe.contentWindow?.print()
        // Note: We can't actually capture the PDF blob from print dialog
        // User will need to select "Save as PDF" in their print dialog
        setTimeout(() => {
          document.body.removeChild(iframe)
          // Return empty blob - actual PDF is handled by browser
          resolve(new Blob([], { type: 'application/pdf' }))
        }, 1000)
      } catch (err) {
        document.body.removeChild(iframe)
        reject(err)
      }
    }
  })
}

/**
 * Trigger browser print dialog for PDF export
 */
export function triggerPrintForPDF(
  options: StrandExportOptions,
  renderedHtml?: string
): void {
  const title = options.metadata.title || options.fileName.replace('.md', '')
  const htmlContent = renderedHtml || `<pre style="white-space: pre-wrap;">${options.content}</pre>`

  // Open new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) {
    alert('Please allow popups for PDF export')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title} - Quarry Export</title>
      <style>
        body {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          color: #1a1a1a;
        }
        h1 { font-size: 24pt; margin-bottom: 0.5em; color: #000; }
        h2 { font-size: 18pt; margin-top: 1.5em; color: #222; }
        h3 { font-size: 14pt; margin-top: 1.2em; color: #333; }
        pre, code {
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          font-size: 10pt;
          background: #f5f5f5;
          padding: 0.5em;
          border-radius: 4px;
          overflow-wrap: break-word;
        }
        pre { padding: 1em; overflow-x: auto; }
        img { max-width: 100%; height: auto; }
        a { color: #0066cc; }
        blockquote {
          border-left: 3px solid #ccc;
          margin-left: 0;
          padding-left: 1em;
          color: #555;
        }
        .metadata { 
          color: #666; 
          font-size: 10pt; 
          margin-bottom: 2em;
          padding-bottom: 1em;
          border-bottom: 1px solid #e0e0e0;
        }
        .print-hint {
          background: #f0f7ff;
          border: 1px solid #0066cc;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 11pt;
        }
        @media print {
          .print-hint { display: none; }
          body { padding: 20mm; }
        }
      </style>
    </head>
    <body>
      <div class="print-hint">
        <strong>💡 Tip:</strong> Press <kbd>Ctrl+P</kbd> (or <kbd>Cmd+P</kbd> on Mac) and select 
        "Save as PDF" as the destination to export this document.
      </div>
      <h1>${title}</h1>
      <div class="metadata">
        ${options.metadata.author ? `<p><strong>Author:</strong> ${options.metadata.author}</p>` : ''}
        ${options.metadata.date ? `<p><strong>Date:</strong> ${options.metadata.date}</p>` : ''}
        ${options.metadata.tags?.length ? `<p><strong>Tags:</strong> ${Array.isArray(options.metadata.tags) ? options.metadata.tags.join(', ') : options.metadata.tags}</p>` : ''}
        <p><strong>Source:</strong> ${options.filePath}</p>
        <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <div class="content">
        ${htmlContent}
      </div>
    </body>
    </html>
  `)
  printWindow.document.close()

  // Auto-trigger print after a short delay
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

// ============================================================================
// ZIP BUNDLE EXPORT
// ============================================================================

/**
 * Fetch an asset from a URL and return as blob
 */
async function fetchAsset(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.blob()
  } catch {
    return null
  }
}

/**
 * Export strand as ZIP bundle with all assets
 */
export async function exportAsZipBundle(
  options: StrandExportOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<Blob> {
  const zip = new JSZip()
  const { content, metadata, filePath, fileName, allFiles = [], github } = options

  onProgress?.('Preparing bundle...', 0)

  // 1. Add markdown file
  const strandFolder = zip.folder('strand')
  strandFolder?.file(fileName, content)
  onProgress?.('Added markdown file', 10)

  // 2. Add schema file
  const schema = generateSchema(options)
  strandFolder?.file('strand.yml', schema)
  onProgress?.('Added schema', 20)

  // 3. Add metadata JSON
  const metadataJson = JSON.stringify(
    {
      ...metadata,
      exportedAt: new Date().toISOString(),
      sourcePath: filePath,
    },
    null,
    2
  )
  strandFolder?.file('metadata.json', metadataJson)
  onProgress?.('Added metadata', 30)

  // 4. Add related strands JSON
  const forwardLinks = extractForwardLinks(content, allFiles)
  const backlinks = findBacklinks(filePath, allFiles)
  const relatedJson = JSON.stringify(
    {
      forwardLinks: forwardLinks.map((l) => ({ path: l.path, name: l.name })),
      backlinks: backlinks.map((l) => ({ path: l.path, name: l.name })),
    },
    null,
    2
  )
  strandFolder?.file('related.json', relatedJson)
  onProgress?.('Added related strands', 40)

  // 5. Fetch and add assets (images)
  const imagePaths = extractImagePaths(content)
  if (imagePaths.length > 0 && github) {
    const assetsFolder = zip.folder('assets')
    let fetched = 0

    for (const imagePath of imagePaths) {
      const resolvedPath = resolveAssetPath(filePath, imagePath)
      const rawUrl = `https://raw.githubusercontent.com/${github.owner}/${github.repo}/${github.branch}/${resolvedPath}`

      const blob = await fetchAsset(rawUrl)
      if (blob) {
        const assetFileName = imagePath.split('/').pop() || 'asset'
        assetsFolder?.file(assetFileName, blob)
      }

      fetched++
      const progress = 40 + Math.round((fetched / imagePaths.length) * 50)
      onProgress?.(`Fetching assets (${fetched}/${imagePaths.length})`, progress)
    }
  } else {
    onProgress?.('No assets to fetch', 90)
  }

  // 6. Add README
  const readme = `# ${metadata.title || fileName.replace('.md', '')}

Exported from Quarry Codex on ${new Date().toLocaleString()}

## Contents

- \`strand/${fileName}\` - The markdown content
- \`strand/strand.yml\` - OpenStrand schema
- \`strand/metadata.json\` - Frontmatter metadata
- \`strand/related.json\` - Related strands (links)
${imagePaths.length > 0 ? '- `assets/` - Referenced images and media' : ''}

## Source

Path: \`${filePath}\`
${github ? `Repository: ${github.owner}/${github.repo}` : ''}
`
  zip.file('README.md', readme)
  onProgress?.('Finalizing...', 95)

  // Generate ZIP
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  onProgress?.('Complete!', 100)
  return blob
}

// ============================================================================
// DOCX EXPORT
// ============================================================================

/**
 * Convert markdown content to DOCX paragraphs
 */
function convertMarkdownToParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Remove frontmatter
  const content = markdown.replace(/^---[\s\S]*?---\n*/m, '')
  const lines = content.split('\n')

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

    // Numbered lists
    if (line.match(/^\d+\.\s/)) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^\d+\.\s/, ''),
          numbering: { reference: 'default-numbering', level: 0 },
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

    // Regular paragraphs with inline formatting
    paragraphs.push(
      new Paragraph({
        children: parseInlineFormatting(line),
        spacing: { after: 120 },
      })
    )
    i++
  }

  return paragraphs
}

/**
 * Parse inline formatting (bold, italic, code)
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = []
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }))
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New' }))
    } else if (part) {
      runs.push(new TextRun({ text: part }))
    }
  }

  return runs
}

/**
 * Export strand as DOCX document
 * Includes computed formula values if enabled (Embark-style)
 */
export async function exportAsDocx(options: StrandExportOptions): Promise<Blob> {
  const { metadata, fileName } = options
  const title = metadata.title || fileName.replace('.md', '')

  // Process content with computed formulas if enabled
  const content = await processContentForExport(options.content, options)

  // Create title page content
  const titleParagraphs: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 1440, after: 240 },
    }),
  ]

  // Add metadata
  if (metadata.author) {
    titleParagraphs.push(
      new Paragraph({
        text: `Author: ${metadata.author}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    )
  }

  if (metadata.date) {
    titleParagraphs.push(
      new Paragraph({
        text: `Date: ${metadata.date}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    )
  }

  titleParagraphs.push(
    new Paragraph({
      text: `Exported: ${new Date().toLocaleDateString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 720 },
    })
  )

  // Convert markdown content to paragraphs
  const contentParagraphs = convertMarkdownToParagraphs(content)

  // Create document
  const document = new Document({
    title,
    creator: 'Quarry Codex',
    description: `Exported from Quarry Codex on ${new Date().toLocaleDateString()}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [...titleParagraphs, ...contentParagraphs],
      },
    ],
  })

  // Generate blob
  return await Packer.toBlob(document)
}

// ============================================================================
// DOWNLOAD HELPERS
// ============================================================================

/**
 * Trigger file download in browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
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
 * Download strand as text file
 * Includes computed formula values if enabled
 */
export async function downloadAsText(options: StrandExportOptions): Promise<void> {
  const text = await exportAsText(options)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const filename = options.fileName.replace('.md', '.txt')
  downloadBlob(blob, filename)
}

/**
 * Download strand as JSON file
 * Includes computed formula values and resolved mentions if enabled
 */
export async function downloadAsJSON(options: StrandExportOptions): Promise<void> {
  const json = await exportAsJSON(options)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const filename = options.fileName.replace('.md', '.json')
  downloadBlob(blob, filename)
}

/**
 * Download strand as markdown file
 * Includes computed formula values if enabled
 */
export async function downloadAsMarkdown(options: StrandExportOptions): Promise<void> {
  const content = await processContentForExport(options.content, options)
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, options.fileName)
}

/**
 * Download strand as ZIP bundle
 */
export async function downloadAsZipBundle(
  options: StrandExportOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<void> {
  const blob = await exportAsZipBundle(options, onProgress)
  const filename = options.fileName.replace('.md', '-bundle.zip')
  downloadBlob(blob, filename)
}

/**
 * Download strand as DOCX document
 */
export async function downloadAsDocx(options: StrandExportOptions): Promise<void> {
  const blob = await exportAsDocx(options)
  const filename = options.fileName.replace('.md', '.docx')
  downloadBlob(blob, filename)
}

