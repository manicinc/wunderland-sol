/**
 * Citation Formatter - Format citations in various academic styles
 * @module research/citationFormatter
 *
 * Supports:
 * - BibTeX (for LaTeX)
 * - APA 7th Edition
 * - MLA 9th Edition
 * - Chicago/Turabian
 * - Harvard
 * - IEEE
 * - Vancouver
 * - Markdown link
 * - Plain text
 */

export type CitationStyle =
  | 'bibtex'
  | 'apa'
  | 'mla'
  | 'chicago'
  | 'harvard'
  | 'ieee'
  | 'vancouver'
  | 'markdown'
  | 'plaintext'

export interface CitationSource {
  title: string
  url: string
  authors?: string[]
  publishedDate?: string | Date
  accessedDate?: string | Date
  publisher?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  doi?: string
  abstract?: string
  type?: 'webpage' | 'article' | 'book' | 'paper' | 'news'
}

/**
 * Format a date for citations
 */
function formatDate(date: string | Date | undefined, style: CitationStyle): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : ''

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const shortMonths = [
    'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June',
    'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'
  ]

  switch (style) {
    case 'apa':
      return `${d.getFullYear()}, ${months[d.getMonth()]} ${d.getDate()}`
    case 'mla':
      return `${d.getDate()} ${shortMonths[d.getMonth()]} ${d.getFullYear()}`
    case 'chicago':
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    case 'ieee':
    case 'vancouver':
      return `${d.getFullYear()} ${shortMonths[d.getMonth()]} ${d.getDate()}`
    default:
      return d.toLocaleDateString()
  }
}

/**
 * Format authors for different citation styles
 */
function formatAuthors(authors: string[] | undefined, style: CitationStyle): string {
  if (!authors || authors.length === 0) return ''

  switch (style) {
    case 'apa':
      if (authors.length === 1) {
        return formatAuthorLastFirst(authors[0])
      } else if (authors.length === 2) {
        return `${formatAuthorLastFirst(authors[0])} & ${formatAuthorLastFirst(authors[1])}`
      } else {
        return `${formatAuthorLastFirst(authors[0])} et al.`
      }
    case 'mla':
      if (authors.length === 1) {
        return formatAuthorLastFirst(authors[0])
      } else if (authors.length === 2) {
        return `${formatAuthorLastFirst(authors[0])}, and ${authors[1]}`
      } else {
        return `${formatAuthorLastFirst(authors[0])}, et al.`
      }
    case 'chicago':
      if (authors.length === 1) {
        return formatAuthorLastFirst(authors[0])
      } else {
        return authors.map((a, i) =>
          i === 0 ? formatAuthorLastFirst(a) : a
        ).join(', ')
      }
    case 'bibtex':
      return authors.join(' and ')
    case 'ieee':
      return authors.map(a => {
        const parts = a.split(' ')
        if (parts.length === 1) return a
        const last = parts.pop()
        return `${parts.map(p => p[0] + '.').join(' ')} ${last}`
      }).join(', ')
    default:
      return authors.join(', ')
  }
}

/**
 * Format author as "Last, First"
 */
function formatAuthorLastFirst(author: string): string {
  const parts = author.trim().split(' ')
  if (parts.length === 1) return author
  const last = parts.pop()
  return `${last}, ${parts.join(' ')}`
}

/**
 * Generate a BibTeX key from title and authors
 */
function generateBibtexKey(source: CitationSource): string {
  const authorPart = source.authors?.[0]?.split(' ').pop()?.toLowerCase() || 'unknown'
  const year = source.publishedDate
    ? new Date(source.publishedDate).getFullYear()
    : new Date().getFullYear()
  const titleWord = source.title.split(' ')[0]?.toLowerCase().replace(/[^a-z]/g, '') || 'untitled'
  return `${authorPart}${year}${titleWord}`
}

/**
 * Format citation in specified style
 */
export function formatCitation(source: CitationSource, style: CitationStyle): string {
  const accessedDate = source.accessedDate || new Date()

  switch (style) {
    case 'bibtex':
      return formatBibtex(source)
    case 'apa':
      return formatAPA(source, accessedDate)
    case 'mla':
      return formatMLA(source, accessedDate)
    case 'chicago':
      return formatChicago(source, accessedDate)
    case 'harvard':
      return formatHarvard(source, accessedDate)
    case 'ieee':
      return formatIEEE(source, accessedDate)
    case 'vancouver':
      return formatVancouver(source, accessedDate)
    case 'markdown':
      return `[${source.title}](${source.url})`
    case 'plaintext':
    default:
      return `${source.title}. ${source.url}`
  }
}

function formatBibtex(source: CitationSource): string {
  const key = generateBibtexKey(source)
  const type = source.type === 'paper' || source.journal ? 'article' :
               source.type === 'book' ? 'book' : 'misc'

  const fields: string[] = []
  fields.push(`  title = {${source.title}}`)
  if (source.authors?.length) {
    fields.push(`  author = {${source.authors.join(' and ')}}`)
  }
  if (source.publishedDate) {
    fields.push(`  year = {${new Date(source.publishedDate).getFullYear()}}`)
  }
  if (source.journal) {
    fields.push(`  journal = {${source.journal}}`)
  }
  if (source.volume) {
    fields.push(`  volume = {${source.volume}}`)
  }
  if (source.issue) {
    fields.push(`  number = {${source.issue}}`)
  }
  if (source.pages) {
    fields.push(`  pages = {${source.pages}}`)
  }
  if (source.doi) {
    fields.push(`  doi = {${source.doi}}`)
  }
  if (source.url) {
    fields.push(`  url = {${source.url}}`)
  }
  if (source.publisher) {
    fields.push(`  publisher = {${source.publisher}}`)
  }

  return `@${type}{${key},\n${fields.join(',\n')}\n}`
}

function formatAPA(source: CitationSource, accessedDate: string | Date): string {
  const parts: string[] = []

  // Authors
  if (source.authors?.length) {
    parts.push(formatAuthors(source.authors, 'apa'))
  }

  // Date
  if (source.publishedDate) {
    parts.push(`(${new Date(source.publishedDate).getFullYear()})`)
  } else {
    parts.push('(n.d.)')
  }

  // Title (italicized for web)
  parts.push(`*${source.title}*.`)

  // Publisher/Journal
  if (source.journal) {
    parts.push(`*${source.journal}*`)
    if (source.volume) {
      parts.push(`, ${source.volume}`)
      if (source.issue) parts.push(`(${source.issue})`)
    }
    if (source.pages) parts.push(`, ${source.pages}`)
    parts.push('.')
  } else if (source.publisher) {
    parts.push(`${source.publisher}.`)
  }

  // URL
  parts.push(`Retrieved ${formatDate(accessedDate, 'apa')}, from ${source.url}`)

  return parts.join(' ')
}

function formatMLA(source: CitationSource, accessedDate: string | Date): string {
  const parts: string[] = []

  // Authors
  if (source.authors?.length) {
    parts.push(formatAuthors(source.authors, 'mla') + '.')
  }

  // Title in quotes for articles, italics for books
  if (source.type === 'article' || source.journal) {
    parts.push(`"${source.title}."`)
  } else {
    parts.push(`*${source.title}*.`)
  }

  // Container (journal/website)
  if (source.journal) {
    parts.push(`*${source.journal}*,`)
    if (source.volume) parts.push(`vol. ${source.volume},`)
    if (source.issue) parts.push(`no. ${source.issue},`)
  } else if (source.publisher) {
    parts.push(`*${source.publisher}*,`)
  }

  // Date
  if (source.publishedDate) {
    parts.push(formatDate(source.publishedDate, 'mla') + ',')
  }

  // Pages
  if (source.pages) {
    parts.push(`pp. ${source.pages},`)
  }

  // URL
  parts.push(source.url + '.')

  // Accessed date
  parts.push(`Accessed ${formatDate(accessedDate, 'mla')}.`)

  return parts.join(' ')
}

function formatChicago(source: CitationSource, accessedDate: string | Date): string {
  const parts: string[] = []

  // Authors
  if (source.authors?.length) {
    parts.push(formatAuthors(source.authors, 'chicago') + '.')
  }

  // Title
  if (source.journal) {
    parts.push(`"${source.title}."`)
    parts.push(`*${source.journal}*`)
    if (source.volume) {
      parts.push(`${source.volume}`)
      if (source.issue) parts.push(`, no. ${source.issue}`)
    }
    if (source.publishedDate) {
      parts.push(`(${new Date(source.publishedDate).getFullYear()})`)
    }
    if (source.pages) parts.push(`: ${source.pages}`)
    parts.push('.')
  } else {
    parts.push(`"${source.title}."`)
    if (source.publisher) parts.push(`${source.publisher}.`)
    if (source.publishedDate) {
      parts.push(formatDate(source.publishedDate, 'chicago') + '.')
    }
  }

  // URL and accessed date
  parts.push(`${source.url}.`)

  return parts.join(' ')
}

function formatHarvard(source: CitationSource, accessedDate: string | Date): string {
  const parts: string[] = []

  // Authors
  if (source.authors?.length) {
    parts.push(formatAuthors(source.authors, 'apa'))
  }

  // Year
  if (source.publishedDate) {
    parts.push(`(${new Date(source.publishedDate).getFullYear()})`)
  }

  // Title
  parts.push(`'${source.title}',`)

  // Journal/Publisher
  if (source.journal) {
    parts.push(`*${source.journal}*,`)
    if (source.volume) parts.push(`vol. ${source.volume},`)
    if (source.issue) parts.push(`no. ${source.issue},`)
    if (source.pages) parts.push(`pp. ${source.pages},`)
  } else if (source.publisher) {
    parts.push(`${source.publisher},`)
  }

  // URL and accessed
  parts.push(`Available at: ${source.url}`)
  parts.push(`[Accessed ${formatDate(accessedDate, 'apa')}].`)

  return parts.join(' ')
}

function formatIEEE(source: CitationSource, accessedDate: string | Date): string {
  const parts: string[] = []

  // Authors
  if (source.authors?.length) {
    parts.push(formatAuthors(source.authors, 'ieee') + ',')
  }

  // Title
  parts.push(`"${source.title},"`)

  // Journal/Publisher
  if (source.journal) {
    parts.push(`*${source.journal}*,`)
    if (source.volume) parts.push(`vol. ${source.volume},`)
    if (source.issue) parts.push(`no. ${source.issue},`)
    if (source.pages) parts.push(`pp. ${source.pages},`)
  } else if (source.publisher) {
    parts.push(`${source.publisher},`)
  }

  // Date
  if (source.publishedDate) {
    parts.push(formatDate(source.publishedDate, 'ieee') + '.')
  }

  // URL
  parts.push(`[Online]. Available: ${source.url}.`)
  parts.push(`[Accessed: ${formatDate(accessedDate, 'ieee')}].`)

  return parts.join(' ')
}

function formatVancouver(source: CitationSource, accessedDate: string | Date): string {
  const parts: string[] = []

  // Authors
  if (source.authors?.length) {
    const formatted = source.authors.slice(0, 6).map(a => {
      const p = a.split(' ')
      if (p.length === 1) return a
      const last = p.pop()
      return `${last} ${p.map(n => n[0]).join('')}`
    }).join(', ')
    parts.push(formatted + (source.authors.length > 6 ? ', et al.' : '.'))
  }

  // Title
  parts.push(source.title + '.')

  // Journal
  if (source.journal) {
    parts.push(source.journal)
    if (source.publishedDate) {
      parts.push(new Date(source.publishedDate).getFullYear().toString())
    }
    if (source.volume) {
      parts.push(`;${source.volume}`)
      if (source.issue) parts.push(`(${source.issue})`)
    }
    if (source.pages) parts.push(`:${source.pages}`)
    parts.push('.')
  }

  // URL
  parts.push(`Available from: ${source.url}`)

  return parts.join(' ')
}

/**
 * Export multiple citations in a format
 */
export function exportCitations(sources: CitationSource[], style: CitationStyle): string {
  if (style === 'bibtex') {
    return sources.map(s => formatCitation(s, style)).join('\n\n')
  }
  return sources.map((s, i) => `[${i + 1}] ${formatCitation(s, style)}`).join('\n\n')
}

/**
 * Get available citation styles with labels
 */
export function getCitationStyles(): Array<{ id: CitationStyle; label: string; description: string }> {
  return [
    { id: 'apa', label: 'APA 7th', description: 'American Psychological Association' },
    { id: 'mla', label: 'MLA 9th', description: 'Modern Language Association' },
    { id: 'chicago', label: 'Chicago', description: 'Chicago/Turabian style' },
    { id: 'harvard', label: 'Harvard', description: 'Harvard referencing' },
    { id: 'ieee', label: 'IEEE', description: 'Institute of Electrical and Electronics Engineers' },
    { id: 'vancouver', label: 'Vancouver', description: 'Medical/scientific journals' },
    { id: 'bibtex', label: 'BibTeX', description: 'LaTeX bibliography format' },
    { id: 'markdown', label: 'Markdown', description: 'Markdown link format' },
    { id: 'plaintext', label: 'Plain Text', description: 'Simple text format' },
  ]
}
