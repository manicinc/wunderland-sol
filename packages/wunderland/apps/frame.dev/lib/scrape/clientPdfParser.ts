/**
 * Client-Side PDF Parser using PDF.js
 * @module lib/scrape/clientPdfParser
 *
 * Browser-based PDF text extraction using Mozilla's PDF.js library.
 * Works entirely client-side without requiring a server.
 *
 * Features:
 * - Extracts text content page-by-page
 * - Preserves basic document structure
 * - Extracts PDF metadata (title, author, etc.)
 * - Handles remote PDFs via CORS proxy if needed
 */

import { fetchWithCorsProxy } from './corsProxy'

/** PDF parsing result */
export interface PdfParseResult {
  success: boolean
  content?: string
  title?: string
  author?: string
  pageCount?: number
  metadata?: Record<string, unknown>
  error?: string
}

/** PDF.js library types (minimal) */
interface PDFDocumentProxy {
  numPages: number
  getMetadata(): Promise<{
    info: {
      Title?: string
      Author?: string
      Subject?: string
      Creator?: string
      Producer?: string
      CreationDate?: string
      ModDate?: string
    }
    metadata: unknown
  }>
  getPage(pageNum: number): Promise<PDFPageProxy>
}

interface PDFPageProxy {
  getTextContent(): Promise<{
    items: Array<{ str: string; transform?: number[] }>
  }>
}

interface PDFJSLib {
  getDocument(source: { data: ArrayBuffer } | { url: string }): {
    promise: Promise<PDFDocumentProxy>
  }
  GlobalWorkerOptions: {
    workerSrc: string
  }
}

// Cached PDF.js library reference
let pdfjsLib: PDFJSLib | null = null
let loadingPromise: Promise<PDFJSLib> | null = null

/**
 * Dynamically load PDF.js library
 * Uses dynamic import to avoid bundling in initial load
 */
async function loadPdfJs(): Promise<PDFJSLib> {
  // Return cached library
  if (pdfjsLib) {
    return pdfjsLib
  }

  // Return existing loading promise to avoid duplicate loads
  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    try {
      // Dynamic import of pdfjs-dist
      const pdfjs = await import('pdfjs-dist')
      
      // Set worker source to our locally copied worker
      // This file should be copied by scripts/copy-pdfjs-worker.js
      const workerSrc = '/pdfjs/pdf.worker.min.mjs'
      
      // Check if we're in browser and configure worker
      if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
      }

      pdfjsLib = pdfjs as unknown as PDFJSLib
      return pdfjsLib
    } catch (error) {
      loadingPromise = null
      throw new Error(`Failed to load PDF.js: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })()

  return loadingPromise
}

/**
 * Extract text from a single PDF page
 */
async function extractPageText(page: PDFPageProxy): Promise<string> {
  const textContent = await page.getTextContent()
  
  // Combine all text items
  const lines: string[] = []
  let lastY: number | null = null
  let currentLine = ''

  for (const item of textContent.items) {
    const text = item.str
    
    // Check if this is a new line (different Y position)
    const y = item.transform?.[5] ?? 0
    
    if (lastY !== null && Math.abs(y - lastY) > 5) {
      // New line detected
      if (currentLine.trim()) {
        lines.push(currentLine.trim())
      }
      currentLine = text
    } else {
      // Same line, append with space
      currentLine += (currentLine ? ' ' : '') + text
    }
    
    lastY = y
  }

  // Add last line
  if (currentLine.trim()) {
    lines.push(currentLine.trim())
  }

  return lines.join('\n')
}

/**
 * Parse a PDF from an ArrayBuffer
 */
async function parsePdfFromBuffer(buffer: ArrayBuffer): Promise<PdfParseResult> {
  try {
    const pdfjs = await loadPdfJs()
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: buffer })
    const pdf = await loadingTask.promise

    // Extract metadata
    const metadata = await pdf.getMetadata()
    const info = metadata.info || {}

    // Extract text from all pages
    const pageTexts: string[] = []
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const pageText = await extractPageText(page)
      
      if (pageText.trim()) {
        // Add page separator for multi-page documents
        if (pageTexts.length > 0) {
          pageTexts.push('\n---\n')
        }
        pageTexts.push(pageText)
      }
    }

    const content = pageTexts.join('\n')

    return {
      success: true,
      content,
      title: info.Title || undefined,
      author: info.Author || undefined,
      pageCount: pdf.numPages,
      metadata: {
        subject: info.Subject,
        creator: info.Creator,
        producer: info.Producer,
        creationDate: info.CreationDate,
        modDate: info.ModDate,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Fetch PDF from URL and parse it
 * Uses CORS proxy if direct fetch fails
 */
export async function parsePdfFromUrl(url: string): Promise<PdfParseResult> {
  // First, try direct fetch (works for same-origin or CORS-enabled URLs)
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/pdf',
      },
    })

    if (response.ok) {
      const buffer = await response.arrayBuffer()
      return parsePdfFromBuffer(buffer)
    }
  } catch {
    // Direct fetch failed, try CORS proxy
  }

  // Try fetching through CORS proxy
  try {
    const proxyResult = await fetchWithCorsProxy(url)
    
    if (!proxyResult.success || !proxyResult.content) {
      return {
        success: false,
        error: proxyResult.error || 'Failed to fetch PDF through proxy',
      }
    }

    // The proxy returns text content, but we need the binary data
    // For PDFs, we need to use a different approach with the proxy

    // Try to convert base64 if the proxy returns it that way
    // Most CORS proxies don't handle binary well, so this is a fallback

    // For allorigins, the content is the raw HTML/text, not suitable for binary PDFs
    // We need to fetch the PDF directly through a binary-capable method

    // Attempt to fetch PDF through the proxy URL directly (not through the wrapper)
    const directProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
    
    const proxyResponse = await fetch(directProxyUrl, {
      headers: {
        'Accept': 'application/pdf',
      },
    })

    if (!proxyResponse.ok) {
      return {
        success: false,
        error: `Proxy fetch failed: ${proxyResponse.status} ${proxyResponse.statusText}`,
      }
    }

    const buffer = await proxyResponse.arrayBuffer()
    return parsePdfFromBuffer(buffer)
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Parse a PDF from a File object (from file input or drag-drop)
 */
export async function parsePdfFromFile(file: File): Promise<PdfParseResult> {
  try {
    const buffer = await file.arrayBuffer()
    const result = await parsePdfFromBuffer(buffer)
    
    // Use filename as title if not present in PDF metadata
    if (result.success && !result.title) {
      result.title = file.name.replace(/\.pdf$/i, '')
    }
    
    return result
  } catch (error) {
    return {
      success: false,
      error: `Failed to read PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Format PDF content as Markdown
 */
export function formatPdfAsMarkdown(
  result: PdfParseResult,
  sourceUrl?: string
): string {
  if (!result.success || !result.content) {
    return ''
  }

  const lines: string[] = []

  // Title
  const title = result.title || 'PDF Document'
  lines.push(`# ${title}`)
  lines.push('')

  // Metadata block
  if (result.author || sourceUrl || result.pageCount) {
    if (result.author) {
      lines.push(`> **Author:** ${result.author}`)
    }
    if (sourceUrl) {
      lines.push(`> **Source:** [${sourceUrl}](${sourceUrl})`)
    }
    if (result.pageCount) {
      lines.push(`> **Pages:** ${result.pageCount}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // Content
  lines.push(result.content)

  return lines.join('\n')
}

/**
 * Check if PDF.js is available and ready
 */
export async function isPdfJsAvailable(): Promise<boolean> {
  try {
    await loadPdfJs()
    return true
  } catch {
    return false
  }
}

