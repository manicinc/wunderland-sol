/**
 * Academic Citation Types
 * @module citations/types
 *
 * Core type definitions for the citation system.
 * Supports DOI, arXiv, and manual citations with
 * multiple output formats (APA, MLA, Chicago, BibTeX).
 */

/**
 * Citation input type detection
 */
export type CitationInputType =
  | 'doi'      // 10.xxxx/yyyy format
  | 'arxiv'    // arxiv:YYMM.NNNNN or arXiv:YYMM.NNNNN
  | 'pmid'     // PubMed ID
  | 'url'      // Generic URL (may contain DOI/arXiv)
  | 'bibtex'   // BibTeX entry
  | 'ris'      // RIS format
  | 'text'     // Raw citation text

/**
 * Citation source (where the data came from)
 */
export type CitationSource =
  | 'crossref'
  | 'openalex'
  | 'semantic-scholar'
  | 'arxiv'
  | 'pubmed'
  | 'core'
  | 'manual'
  | 'bibtex-import'

/**
 * Citation document type
 */
export type CitationType =
  | 'article'        // Journal article
  | 'article-journal'
  | 'book'           // Book
  | 'chapter'        // Book chapter
  | 'conference'     // Conference paper
  | 'paper-conference'
  | 'thesis'         // PhD/Masters thesis
  | 'preprint'       // arXiv, bioRxiv, etc.
  | 'report'         // Technical report
  | 'dataset'        // Dataset
  | 'software'       // Software/code
  | 'webpage'        // Web page
  | 'other'

/**
 * Author information
 */
export interface Author {
  given?: string      // First name
  family: string      // Last name
  orcid?: string      // ORCID identifier
  affiliation?: string
  sequence?: 'first' | 'additional'
}

/**
 * Core citation object
 * This is stored in IndexedDB and can be rendered to any format
 */
export interface Citation {
  /** Unique identifier (DOI, arXiv ID, or generated UUID) */
  id: string

  /** Document type */
  type: CitationType

  /** Title of the work */
  title: string

  /** Author list */
  authors: Author[]

  /** Publication year */
  year: number

  /** Publication month (1-12) */
  month?: number

  /** DOI if available */
  doi?: string

  /** arXiv ID if available */
  arxivId?: string

  /** PubMed ID if available */
  pmid?: string

  /** Direct URL to the work */
  url?: string

  /** PDF URL if open access */
  pdfUrl?: string

  /** Abstract text */
  abstract?: string

  /** Journal/venue name */
  venue?: string

  /** Journal abbreviation */
  venueShort?: string

  /** Volume number */
  volume?: string

  /** Issue number */
  issue?: string

  /** Page range (e.g., "1-15") */
  pages?: string

  /** Publisher name */
  publisher?: string

  /** ISBN for books */
  isbn?: string

  /** ISSN for journals */
  issn?: string

  /** Number of citations (from Semantic Scholar) */
  citationCount?: number

  /** Number of references */
  referenceCount?: number

  /** Influential citation count (Semantic Scholar) */
  influentialCitationCount?: number

  /** Open access status */
  isOpenAccess?: boolean

  /** Keywords/tags */
  keywords?: string[]

  /** Where this citation data came from */
  source: CitationSource

  /** When this was cached/created */
  cachedAt: number

  /** Original raw data (for debugging) */
  raw?: unknown
}

/**
 * Citation style for formatting
 */
export type CitationStyle =
  | 'apa'        // APA 7th edition
  | 'mla'        // MLA 9th edition
  | 'chicago'    // Chicago 18th edition
  | 'harvard'    // Harvard style
  | 'ieee'       // IEEE style
  | 'vancouver'  // Vancouver style
  | 'bibtex'     // BibTeX format

/**
 * Formatted citation output
 */
export interface FormattedCitation {
  /** Citation ID */
  id: string

  /** Style used */
  style: CitationStyle

  /** Formatted HTML string */
  html: string

  /** Plain text version */
  text: string

  /** In-text citation (e.g., "(Smith, 2023)") */
  inText: string

  /** BibTeX entry if applicable */
  bibtex?: string
}

/**
 * Citation resolution result
 */
export interface CitationResolutionResult {
  /** Whether resolution was successful */
  success: boolean

  /** The resolved citation */
  citation?: Citation

  /** Error message if failed */
  error?: string

  /** Source that provided the data */
  source?: CitationSource

  /** Whether this came from cache */
  fromCache?: boolean

  /** Response latency in ms */
  latency?: number
}

/**
 * Paper search result
 */
export interface PaperSearchResult {
  /** Total results available */
  total: number

  /** Current page */
  page: number

  /** Results per page */
  perPage: number

  /** The citations */
  results: Citation[]

  /** Query that was executed */
  query: string

  /** Source API */
  source: CitationSource
}

/**
 * Citation cache entry
 */
export interface CitationCacheEntry {
  /** The citation data */
  citation: Citation

  /** When it was cached */
  cachedAt: number

  /** When it expires (30 days default) */
  expiresAt: number

  /** Access count for LRU */
  accessCount: number

  /** Last accessed time */
  lastAccessed: number
}

/**
 * Bibliography entry (for per-loom bibliographies)
 */
export interface BibliographyEntry {
  /** Citation ID */
  citationId: string

  /** Loom path (e.g., "cs/machine-learning") */
  loomPath: string

  /** Citation key for in-text references (e.g., "smith2023") */
  citeKey: string

  /** Order in bibliography */
  order: number

  /** When added */
  addedAt: number

  /** Notes about this citation */
  notes?: string
}

/**
 * Detection patterns for citation input
 */
export const CITATION_PATTERNS = {
  /** DOI pattern: 10.xxxx/yyyy */
  doi: /\b(10\.\d{4,}(?:\.\d+)*\/(?:(?!["&'<>])\S)+)\b/i,

  /** arXiv pattern: arxiv:YYMM.NNNNN or arXiv:YYMM.NNNNN or just YYMM.NNNNN */
  arxiv: /\b(?:arxiv:?\s*)?(\d{4}\.\d{4,5}(?:v\d+)?)\b/i,

  /** arXiv URL pattern */
  arxivUrl: /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,

  /** DOI URL pattern */
  doiUrl: /(?:doi\.org|dx\.doi\.org)\/(10\.\d{4,}(?:\.\d+)*\/(?:(?!["&'<>])\S)+)/i,

  /** PubMed ID pattern */
  pmid: /\bPMID:?\s*(\d+)\b/i,

  /** BibTeX entry detection */
  bibtex: /@\w+\s*\{[^}]+,/,

  /** RIS format detection */
  ris: /^TY\s+-\s+/m,
} as const

/**
 * Default citation style
 */
export const DEFAULT_CITATION_STYLE: CitationStyle = 'apa'

/**
 * Cache duration in milliseconds (30 days)
 */
export const CITATION_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000
