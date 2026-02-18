/**
 * Academic Paper Detection
 * @module lib/research/academicDetector
 *
 * Detects academic paper URLs and extracts identifiers for citation resolution.
 */

import type { WebSearchResult } from './types'

/**
 * Academic source patterns
 */
const ACADEMIC_DOMAINS = [
  'arxiv.org',
  'doi.org',
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'semanticscholar.org',
  'scholar.google.com',
  'jstor.org',
  'springer.com',
  'nature.com',
  'science.org',
  'sciencedirect.com',
  'wiley.com',
  'ieee.org',
  'acm.org',
  'plos.org',
  'frontiersin.org',
  'mdpi.com',
  'biorxiv.org',
  'medrxiv.org',
  'researchgate.net',
  'academia.edu',
  'ssrn.com',
  'openreview.net',
  'aclanthology.org',
  'proceedings.mlr.press',
  'neurips.cc',
  'proceedings.neurips.cc',
]

/**
 * Check if a URL is from an academic source
 */
export function isAcademicUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    return ACADEMIC_DOMAINS.some(domain => hostname.includes(domain))
  } catch {
    return false
  }
}

/**
 * Detect the academic source name from a URL
 */
export function detectAcademicSource(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    if (hostname.includes('arxiv.org')) return 'arXiv'
    if (hostname.includes('doi.org')) return 'DOI'
    if (hostname.includes('pubmed') || hostname.includes('ncbi.nlm.nih.gov')) return 'PubMed'
    if (hostname.includes('semanticscholar.org')) return 'Semantic Scholar'
    if (hostname.includes('scholar.google.com')) return 'Google Scholar'
    if (hostname.includes('jstor.org')) return 'JSTOR'
    if (hostname.includes('springer.com')) return 'Springer'
    if (hostname.includes('nature.com')) return 'Nature'
    if (hostname.includes('science.org')) return 'Science'
    if (hostname.includes('sciencedirect.com')) return 'ScienceDirect'
    if (hostname.includes('wiley.com')) return 'Wiley'
    if (hostname.includes('ieee.org')) return 'IEEE'
    if (hostname.includes('acm.org')) return 'ACM'
    if (hostname.includes('plos.org')) return 'PLOS'
    if (hostname.includes('frontiersin.org')) return 'Frontiers'
    if (hostname.includes('mdpi.com')) return 'MDPI'
    if (hostname.includes('biorxiv.org')) return 'bioRxiv'
    if (hostname.includes('medrxiv.org')) return 'medRxiv'
    if (hostname.includes('researchgate.net')) return 'ResearchGate'
    if (hostname.includes('academia.edu')) return 'Academia.edu'
    if (hostname.includes('ssrn.com')) return 'SSRN'
    if (hostname.includes('openreview.net')) return 'OpenReview'
    if (hostname.includes('aclanthology.org')) return 'ACL Anthology'
    if (hostname.includes('proceedings.mlr.press')) return 'PMLR'
    if (hostname.includes('neurips.cc')) return 'NeurIPS'

    return null
  } catch {
    return null
  }
}

/**
 * Check if a search result appears to be an academic paper
 */
export function isAcademicResult(result: WebSearchResult): boolean {
  // Check URL domain
  if (isAcademicUrl(result.url)) {
    return true
  }

  // Check for DOI in URL
  if (result.url.includes('doi.org/') || result.url.includes('/doi/')) {
    return true
  }

  // Check for arXiv ID in URL
  if (/arxiv\.org\/abs\/\d{4}\.\d{4,5}/i.test(result.url)) {
    return true
  }

  return false
}

/**
 * Extract citation identifier from a URL
 * Returns DOI, arXiv ID, or PMID if found
 */
export function extractCitationId(url: string): {
  type: 'doi' | 'arxiv' | 'pmid' | 'url'
  id: string
} | null {
  try {
    // DOI patterns
    const doiMatch = url.match(/(?:doi\.org\/|\/doi\/)(10\.\d{4,}[^\s]+)/i)
    if (doiMatch) {
      return { type: 'doi', id: doiMatch[1] }
    }

    // arXiv patterns
    const arxivMatch = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i)
    if (arxivMatch) {
      return { type: 'arxiv', id: arxivMatch[1] }
    }

    // PubMed ID
    const pmidMatch = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)
    if (pmidMatch) {
      return { type: 'pmid', id: pmidMatch[1] }
    }

    // bioRxiv/medRxiv (they use DOIs)
    const biorxivMatch = url.match(/(?:biorxiv|medrxiv)\.org\/content\/(10\.\d{4,}[^\s/]+)/i)
    if (biorxivMatch) {
      return { type: 'doi', id: biorxivMatch[1] }
    }

    // Semantic Scholar paper
    const s2Match = url.match(/semanticscholar\.org\/paper\/[^/]+\/([a-f0-9]{40})/i)
    if (s2Match) {
      // Return the URL for S2 since we need to look up the paper
      return { type: 'url', id: url }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Get citation-ready input from a search result
 * Returns a string that can be passed to CitationInput
 */
export function getCitationInput(result: WebSearchResult): string {
  const extracted = extractCitationId(result.url)

  if (extracted) {
    switch (extracted.type) {
      case 'doi':
        return extracted.id
      case 'arxiv':
        return extracted.id
      case 'pmid':
        return `PMID:${extracted.id}`
      case 'url':
        return extracted.id
    }
  }

  // Fallback to URL
  return result.url
}

/**
 * Enrich search results with academic metadata
 */
export function enrichWithAcademicInfo(results: WebSearchResult[]): Array<WebSearchResult & {
  isAcademic: boolean
  citationId: ReturnType<typeof extractCitationId>
}> {
  return results.map(result => ({
    ...result,
    isAcademic: isAcademicResult(result),
    citationId: extractCitationId(result.url),
  }))
}
