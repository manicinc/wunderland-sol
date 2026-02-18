/**
 * Auto Link Detector
 * @module lib/linkSuggestion/autoDetector
 *
 * Detects potential links in content by matching text against existing strand titles.
 * Uses fuzzy matching and NLP techniques to find mentions that could be linked.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandInfo {
  /** Strand path */
  path: string
  /** Display title */
  title: string
  /** Tags for additional matching */
  tags?: string[]
  /** Aliases or alternate names */
  aliases?: string[]
}

export interface UnlinkedMention {
  /** The matched text in the content */
  matchedText: string
  /** The strand that could be linked */
  targetStrand: StrandInfo
  /** Position in content where match starts */
  startIndex: number
  /** Position in content where match ends */
  endIndex: number
  /** Confidence score (0-1) */
  confidence: number
  /** Whether this is an exact title match */
  isExactMatch: boolean
  /** Context snippet around the match */
  context: string
}

export interface DetectionOptions {
  /** Minimum confidence score to include (default: 0.7) */
  minConfidence?: number
  /** Maximum number of suggestions to return (default: 10) */
  maxSuggestions?: number
  /** Whether to match case-insensitively (default: true) */
  caseInsensitive?: boolean
  /** Context characters to include around match (default: 50) */
  contextLength?: number
  /** Ignore matches inside existing [[...]] links (default: true) */
  ignoreExistingLinks?: boolean
  /** Minimum word length to match (default: 3) */
  minWordLength?: number
}

export interface DetectionResult {
  /** Detected unlinked mentions */
  mentions: UnlinkedMention[]
  /** Total strands checked */
  strandsChecked: number
  /** Processing time in ms */
  processingTime: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get context snippet around a position
 */
function getContext(content: string, start: number, end: number, length: number): string {
  const contextStart = Math.max(0, start - length)
  const contextEnd = Math.min(content.length, end + length)
  
  let context = content.slice(contextStart, contextEnd)
  
  // Add ellipsis if truncated
  if (contextStart > 0) context = '...' + context
  if (contextEnd < content.length) context = context + '...'
  
  return context.replace(/\n/g, ' ').trim()
}

/**
 * Find positions of existing [[...]] links to exclude
 */
function findExistingLinkRanges(content: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  const linkPattern = /\[\[([^\]]+)\]\]/g
  let match

  while ((match = linkPattern.exec(content)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return ranges
}

/**
 * Check if a position is inside an existing link
 */
function isInsideExistingLink(
  position: number,
  ranges: Array<{ start: number; end: number }>
): boolean {
  return ranges.some((range) => position >= range.start && position < range.end)
}

/**
 * Calculate similarity score between two strings (normalized Levenshtein)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1 === s2) return 1

  const len1 = s1.length
  const len2 = s2.length

  if (len1 === 0 || len2 === 0) return 0

  // Simple length-based penalty for very different lengths
  const lengthRatio = Math.min(len1, len2) / Math.max(len1, len2)
  if (lengthRatio < 0.5) return 0

  // Check for substring match (high confidence)
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.85 + 0.15 * lengthRatio
  }

  // Levenshtein distance
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0))

  for (let i = 0; i <= len1; i++) matrix[i][0] = i
  for (let j = 0; j <= len2; j++) matrix[0][j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  return 1 - distance / maxLen
}

/**
 * Check if a word is a common stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'this', 'that', 'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she',
    'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
    'her', 'our', 'their', 'what', 'which', 'who', 'whom', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than',
    'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
  ])
  return stopWords.has(word.toLowerCase())
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Detect potential unlinked mentions in content
 */
export function detectUnlinkedMentions(
  content: string,
  strands: StrandInfo[],
  options: DetectionOptions = {}
): DetectionResult {
  const startTime = performance.now()

  const {
    minConfidence = 0.7,
    maxSuggestions = 10,
    caseInsensitive = true,
    contextLength = 50,
    ignoreExistingLinks = true,
    minWordLength = 3,
  } = options

  const mentions: UnlinkedMention[] = []
  const existingLinkRanges = ignoreExistingLinks ? findExistingLinkRanges(content) : []

  for (const strand of strands) {
    // Skip very short titles
    if (strand.title.length < minWordLength) continue

    // Skip if title is just a stop word
    if (isStopWord(strand.title)) continue

    // Build list of terms to search for (title + aliases)
    const searchTerms = [strand.title, ...(strand.aliases || [])]

    for (const term of searchTerms) {
      // Skip very short terms
      if (term.length < minWordLength) continue

      // Create regex for finding the term
      const flags = caseInsensitive ? 'gi' : 'g'
      const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, flags)

      let match
      while ((match = pattern.exec(content)) !== null) {
        const startIndex = match.index
        const endIndex = match.index + match[0].length

        // Skip if inside existing link
        if (ignoreExistingLinks && isInsideExistingLink(startIndex, existingLinkRanges)) {
          continue
        }

        // Calculate confidence
        const matchedText = match[0]
        const isExactMatch = matchedText.toLowerCase() === term.toLowerCase()
        const similarity = calculateSimilarity(matchedText, strand.title)
        const confidence = isExactMatch ? 1.0 : similarity

        if (confidence >= minConfidence) {
          const context = getContext(content, startIndex, endIndex, contextLength)

          mentions.push({
            matchedText,
            targetStrand: strand,
            startIndex,
            endIndex,
            confidence,
            isExactMatch,
            context,
          })
        }
      }
    }
  }

  // Sort by confidence (highest first) and deduplicate by position
  const seen = new Set<string>()
  const uniqueMentions = mentions
    .sort((a, b) => b.confidence - a.confidence)
    .filter((mention) => {
      const key = `${mention.startIndex}-${mention.endIndex}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, maxSuggestions)

  return {
    mentions: uniqueMentions,
    strandsChecked: strands.length,
    processingTime: performance.now() - startTime,
  }
}

/**
 * Extract significant terms from content for matching
 * Returns terms that could be strand titles
 */
export function extractSignificantTerms(content: string): string[] {
  // Remove markdown formatting
  const plainText = content
    .replace(/\[\[([^\]]+)\]\]/g, '') // Remove wikilinks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/[#*_`~]/g, '') // Remove formatting chars
    .replace(/\n+/g, ' ') // Normalize whitespace

  // Split into sentences and extract capitalized phrases
  const capitalizedPhrases: string[] = []
  const sentencePattern = /[.!?]+/
  const sentences = plainText.split(sentencePattern)

  for (const sentence of sentences) {
    // Skip first word of sentence (naturally capitalized)
    const words = sentence.trim().split(/\s+/)
    let currentPhrase: string[] = []

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      // Check if word is capitalized (proper noun)
      if (word.length > 2 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        currentPhrase.push(word)
      } else if (currentPhrase.length > 0) {
        // End of capitalized sequence
        capitalizedPhrases.push(currentPhrase.join(' '))
        currentPhrase = []
      }
    }
    if (currentPhrase.length > 0) {
      capitalizedPhrases.push(currentPhrase.join(' '))
    }
  }

  // Deduplicate and filter
  const unique = [...new Set(capitalizedPhrases)]
    .filter((phrase) => phrase.length >= 3 && !isStopWord(phrase))

  return unique
}

/**
 * Get suggestions for auto-linking based on content and available strands
 */
export async function getAutoLinkSuggestions(
  content: string,
  fetchStrands: () => Promise<StrandInfo[]>,
  options?: DetectionOptions
): Promise<DetectionResult> {
  try {
    const strands = await fetchStrands()
    return detectUnlinkedMentions(content, strands, options)
  } catch (error) {
    console.error('[AutoDetector] Failed to get suggestions:', error)
    return {
      mentions: [],
      strandsChecked: 0,
      processingTime: 0,
    }
  }
}

export default {
  detectUnlinkedMentions,
  extractSignificantTerms,
  getAutoLinkSuggestions,
}

