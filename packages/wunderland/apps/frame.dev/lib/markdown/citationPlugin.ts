/**
 * Markdown Citation Plugin
 * @module lib/markdown/citationPlugin
 *
 * Parses and renders [@...] citation syntax in markdown.
 * Supports DOI, arXiv, and custom citation keys.
 *
 * @example
 * // Inline citation syntax
 * [@doi:10.1038/nature12373]
 * [@arxiv:2301.00001]
 * [@smith2023]
 *
 * // With page numbers
 * [@doi:10.1038/nature12373, p. 42]
 */

import type { Citation, CitationStyle } from '@/lib/citations/types'
import {
  resolveCitation,
  formatCitation,
  getCachedByDOI,
  getCachedByArxivId,
} from '@/lib/citations'

/**
 * Citation reference in markdown
 */
export interface CitationReference {
  /** Raw citation key (e.g., "doi:10.1038/xyz" or "smith2023") */
  key: string
  /** Type of citation reference */
  type: 'doi' | 'arxiv' | 'pmid' | 'custom'
  /** The identifier value */
  id: string
  /** Optional page reference */
  page?: string
  /** Position in source text */
  position: {
    start: number
    end: number
  }
}

/**
 * Parsed citation result
 */
export interface ParsedCitation {
  reference: CitationReference
  citation?: Citation
  formatted?: string
  error?: string
}

/**
 * Citation pattern: [@key] or [@key, page]
 * Supports:
 * - [@doi:10.1234/xyz]
 * - [@arxiv:2301.00001]
 * - [@pmid:12345678]
 * - [@smith2023]
 * - [@doi:10.1234/xyz, p. 42]
 */
const CITATION_PATTERN = /\[@([^\]]+)\]/g

/**
 * Parse a single citation key
 */
function parseCitationKey(rawKey: string): Omit<CitationReference, 'position'> {
  // Split key and page reference
  const [keyPart, pagePart] = rawKey.split(',').map(s => s.trim())

  // Check for typed references
  if (keyPart.startsWith('doi:')) {
    return {
      key: rawKey,
      type: 'doi',
      id: keyPart.slice(4).trim(),
      page: pagePart,
    }
  }

  if (keyPart.startsWith('arxiv:')) {
    return {
      key: rawKey,
      type: 'arxiv',
      id: keyPart.slice(6).trim(),
      page: pagePart,
    }
  }

  if (keyPart.startsWith('pmid:')) {
    return {
      key: rawKey,
      type: 'pmid',
      id: keyPart.slice(5).trim(),
      page: pagePart,
    }
  }

  // Custom key (e.g., smith2023)
  return {
    key: rawKey,
    type: 'custom',
    id: keyPart,
    page: pagePart,
  }
}

/**
 * Extract all citation references from markdown text
 */
export function extractCitations(markdown: string): CitationReference[] {
  const citations: CitationReference[] = []
  let match

  while ((match = CITATION_PATTERN.exec(markdown)) !== null) {
    const parsed = parseCitationKey(match[1])
    citations.push({
      ...parsed,
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    })
  }

  return citations
}

/**
 * Check if text contains citation references
 */
export function hasCitations(markdown: string): boolean {
  return CITATION_PATTERN.test(markdown)
}

/**
 * Resolve a single citation reference
 */
export async function resolveCitationReference(
  ref: CitationReference
): Promise<ParsedCitation> {
  try {
    let citation: Citation | null = null

    // Try cache first for DOI/arXiv
    if (ref.type === 'doi') {
      citation = await getCachedByDOI(ref.id)
    } else if (ref.type === 'arxiv') {
      citation = await getCachedByArxivId(ref.id)
    }

    // If not cached, resolve via API
    if (!citation) {
      const input = ref.type === 'doi'
        ? ref.id
        : ref.type === 'arxiv'
        ? `arxiv:${ref.id}`
        : ref.id

      const result = await resolveCitation(input)
      if (result.success && result.citation) {
        citation = result.citation
      }
    }

    if (citation) {
      return {
        reference: ref,
        citation,
      }
    }

    return {
      reference: ref,
      error: 'Could not resolve citation',
    }
  } catch (error) {
    return {
      reference: ref,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Resolve all citations in markdown
 */
export async function resolveAllCitations(
  markdown: string
): Promise<Map<string, ParsedCitation>> {
  const refs = extractCitations(markdown)
  const results = new Map<string, ParsedCitation>()

  // Deduplicate by key
  const uniqueRefs = new Map<string, CitationReference>()
  for (const ref of refs) {
    if (!uniqueRefs.has(ref.key)) {
      uniqueRefs.set(ref.key, ref)
    }
  }

  // Resolve in parallel
  const resolutions = await Promise.all(
    Array.from(uniqueRefs.values()).map(resolveCitationReference)
  )

  for (const parsed of resolutions) {
    results.set(parsed.reference.key, parsed)
  }

  return results
}

/**
 * Format an in-text citation
 */
export function formatInTextCitation(
  parsed: ParsedCitation,
  style: CitationStyle = 'apa'
): string {
  if (!parsed.citation) {
    return `[${parsed.reference.key}]`
  }

  const formatted = formatCitation(parsed.citation, style)
  let text = formatted.inText

  // Add page reference if present
  if (parsed.reference.page) {
    // APA/Chicago style: (Author, Year, p. X)
    if (style === 'apa' || style === 'chicago' || style === 'harvard') {
      text = text.replace(/\)$/, `, ${parsed.reference.page})`)
    } else {
      text = `${text} ${parsed.reference.page}`
    }
  }

  return text
}

/**
 * Render citations in markdown as formatted in-text citations
 */
export async function renderCitations(
  markdown: string,
  style: CitationStyle = 'apa'
): Promise<string> {
  const resolved = await resolveAllCitations(markdown)
  let result = markdown

  // Replace in reverse order to preserve positions
  const refs = extractCitations(markdown).sort(
    (a, b) => b.position.start - a.position.start
  )

  for (const ref of refs) {
    const parsed = resolved.get(ref.key)
    if (parsed) {
      const formatted = formatInTextCitation(parsed, style)
      result =
        result.slice(0, ref.position.start) +
        formatted +
        result.slice(ref.position.end)
    }
  }

  return result
}

/**
 * Generate bibliography section from citations in markdown
 */
export async function generateBibliography(
  markdown: string,
  style: CitationStyle = 'apa'
): Promise<string> {
  const resolved = await resolveAllCitations(markdown)
  const citations: Citation[] = []

  for (const parsed of resolved.values()) {
    if (parsed.citation) {
      citations.push(parsed.citation)
    }
  }

  if (citations.length === 0) {
    return ''
  }

  // Sort by first author's family name, then by year
  citations.sort((a, b) => {
    const aName = a.authors[0]?.family || ''
    const bName = b.authors[0]?.family || ''
    if (aName !== bName) {
      return aName.localeCompare(bName)
    }
    return a.year - b.year
  })

  // Format each citation
  const entries = citations.map(citation => {
    const formatted = formatCitation(citation, style)
    return formatted.text
  })

  return entries.join('\n\n')
}

/**
 * React hook for rendering citations in markdown
 * (Server-side safe - returns null if not in browser)
 */
export function useCitationRenderer(
  markdown: string,
  style: CitationStyle = 'apa'
): {
  renderedMarkdown: string | null
  bibliography: string | null
  loading: boolean
  error: string | null
} {
  // This would be implemented as a React hook in a component file
  // For now, just export the async functions
  return {
    renderedMarkdown: null,
    bibliography: null,
    loading: false,
    error: 'Use renderCitations() directly',
  }
}

/**
 * Convert citation references to HTML for preview
 */
export function citationToHtml(
  parsed: ParsedCitation,
  style: CitationStyle = 'apa'
): string {
  if (!parsed.citation) {
    return `<span class="citation citation-error" data-key="${parsed.reference.key}">[${parsed.reference.key}]</span>`
  }

  const formatted = formatCitation(parsed.citation, style)
  const inText = formatInTextCitation(parsed, style)

  return `<span class="citation" data-key="${parsed.reference.key}" data-doi="${parsed.citation.doi || ''}" title="${formatted.text.replace(/"/g, '&quot;')}">${inText}</span>`
}

/**
 * Process markdown and replace citation syntax with HTML spans
 */
export async function processCitationsToHtml(
  markdown: string,
  style: CitationStyle = 'apa'
): Promise<string> {
  const resolved = await resolveAllCitations(markdown)
  let result = markdown

  // Replace in reverse order to preserve positions
  const refs = extractCitations(markdown).sort(
    (a, b) => b.position.start - a.position.start
  )

  for (const ref of refs) {
    const parsed = resolved.get(ref.key)
    if (parsed) {
      const html = citationToHtml(parsed, style)
      result =
        result.slice(0, ref.position.start) +
        html +
        result.slice(ref.position.end)
    }
  }

  return result
}
