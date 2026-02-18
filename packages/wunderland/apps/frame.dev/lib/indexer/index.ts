/**
 * Browser-Compatible Codex Indexer
 *
 * Indexes content for local storage and search.
 * Works in both browser (using IndexedDB) and Electron (using native SQLite).
 *
 * Features:
 * - Keyword extraction using TF-IDF
 * - Auto-categorization using vocabulary matching
 * - Summary generation
 * - Full-text search integration
 * - Skills detection from code patterns
 *
 * @module lib/indexer
 */

import { Vocabulary, getVocabulary, type ClassificationResult } from './vocabulary'
import { PorterStemmer, getStemmer } from './porter-stemmer'
import { saveStrand, type LocalStrand } from '../storage/localCodex'
import {
  reindexDynamicDocument,
  searchDynamicContent,
  indexFormulaResult,
  type DynamicSearchResult,
} from './dynamicDocumentIndex'
import type { MentionableEntity } from '@/lib/mentions/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface IndexEntry {
  path: string
  title: string
  summary: string
  content: string
  frontmatter?: Record<string, unknown>
  classification: ClassificationResult
  readingLevel: {
    gradeLevel: number
    readabilityScore: number
  }
  statistics: {
    sentences: number
    words: number
    characters: number
  }
  skills: string[]
  lastIndexed: string
}

export interface IndexStats {
  totalIndexed: number
  bySubject: Record<string, number>
  byTopic: Record<string, number>
  byDifficulty: Record<string, number>
  averageReadingLevel: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTENT PARSER
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Parse frontmatter from markdown content
 */
export function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  try {
    // Simple YAML-like parsing (key: value)
    const frontmatter: Record<string, unknown> = {}
    const lines = match[1].split('\n')

    for (const line of lines) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim()
        let value: unknown = line.slice(colonIndex + 1).trim()

        // Parse arrays
        if (value === '') {
          // Check for array on next lines
          continue
        }

        // Parse booleans
        if (value === 'true') value = true
        else if (value === 'false') value = false
        // Parse numbers
        else if (!isNaN(Number(value))) value = Number(value)
        // Remove quotes
        else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1)
        }

        frontmatter[key] = value
      }
    }

    return { frontmatter, body: content.slice(match[0].length) }
  } catch {
    return { frontmatter: {}, body: content }
  }
}

/**
 * Extract title from content
 */
export function extractTitle(content: string, frontmatter: Record<string, unknown>): string {
  // Check frontmatter first
  if (frontmatter.title && typeof frontmatter.title === 'string') {
    return frontmatter.title
  }

  // Look for first heading
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) {
    return headingMatch[1].trim()
  }

  // Fall back to first line
  const firstLine = content.split('\n')[0].trim()
  return firstLine.slice(0, 100) || 'Untitled'
}

/**
 * Generate extractive summary
 */
export function generateSummary(content: string, maxLength = 200): string {
  // Remove code blocks and formatting
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/[*_~]+/g, '') // Bold, italic, strikethrough
    .trim()

  // Split into sentences
  const sentences = cleanContent.split(/[.!?]+\s+/).filter((s) => s.length > 20)

  if (sentences.length === 0) {
    return cleanContent.slice(0, maxLength) + (cleanContent.length > maxLength ? '...' : '')
  }

  // Return first meaningful sentence
  const summary = sentences[0]
  return summary.length > maxLength ? summary.slice(0, maxLength - 3) + '...' : summary
}

/* ═══════════════════════════════════════════════════════════════════════════
   READING LEVEL CALCULATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Estimate syllables in a word (simple heuristic)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g) || []
  let count = vowelGroups.length

  // Adjust for silent e
  if (word.endsWith('e') && count > 1) count--

  // Adjust for -le endings
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
    count++
  }

  return Math.max(1, count)
}

/**
 * Calculate Flesch-Kincaid reading level
 */
export function calculateReadingLevel(content: string): {
  gradeLevel: number
  readabilityScore: number
  sentences: number
  words: number
} {
  // Clean content
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/#{1,6}\s/g, '')
    .trim()

  // Count sentences and words
  const sentences = cleanContent.split(/[.!?]+\s+/).filter((s) => s.length > 10)
  const words = cleanContent.split(/\s+/).filter((w) => w.length > 0)

  if (sentences.length === 0 || words.length === 0) {
    return { gradeLevel: 0, readabilityScore: 0, sentences: 0, words: 0 }
  }

  // Count syllables
  const totalSyllables = words.reduce((sum, word) => {
    const clean = word.replace(/[^\w]/g, '')
    return sum + countSyllables(clean)
  }, 0)

  const avgWordsPerSentence = words.length / sentences.length
  const avgSyllablesPerWord = totalSyllables / words.length

  // Flesch-Kincaid Grade Level
  const gradeLevel = Math.max(
    0,
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
  )

  // Flesch Reading Ease (0-100, higher = easier)
  const readabilityScore = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord)
  )

  return {
    gradeLevel: Math.round(gradeLevel * 10) / 10,
    readabilityScore: Math.round(readabilityScore),
    sentences: sentences.length,
    words: words.length,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CODE SKILL DETECTION
═══════════════════════════════════════════════════════════════════════════ */

const LANG_TO_SKILL: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  rust: 'rust',
  go: 'go',
  golang: 'go',
  java: 'java',
  csharp: 'csharp',
  cs: 'csharp',
  cpp: 'cpp',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  sql: 'sql',
  bash: 'shell',
  sh: 'shell',
  html: 'html',
  css: 'css',
  scss: 'css',
  yaml: 'yaml',
  json: 'json',
  graphql: 'graphql',
  dockerfile: 'docker',
  terraform: 'terraform',
  jsx: 'react',
  tsx: 'react',
  vue: 'vue',
  svelte: 'svelte',
}

const PACKAGE_TO_SKILL: Record<string, string> = {
  react: 'react',
  'react-dom': 'react',
  next: 'nextjs',
  vue: 'vue',
  nuxt: 'nuxt',
  express: 'express',
  fastify: 'fastify',
  mongoose: 'mongodb',
  prisma: 'prisma',
  jest: 'jest',
  vitest: 'vitest',
  cypress: 'cypress',
  playwright: 'playwright',
  webpack: 'webpack',
  vite: 'vite',
  docker: 'docker',
  kubernetes: 'kubernetes',
  graphql: 'graphql',
  apollo: 'apollo',
  redux: 'redux',
  zustand: 'zustand',
  tailwindcss: 'tailwind',
}

const PATTERN_SKILLS: Array<{ pattern: RegExp; skill: string }> = [
  { pattern: /git\s+(clone|commit|push|pull|merge|rebase)/gi, skill: 'git' },
  { pattern: /docker\s+(build|run|compose)/gi, skill: 'docker' },
  { pattern: /kubectl|kubernetes/gi, skill: 'kubernetes' },
  { pattern: /github\s*actions?|\.github\/workflows/gi, skill: 'github-actions' },
  { pattern: /REST\s*API|RESTful/gi, skill: 'rest-api' },
  { pattern: /GraphQL\s*(query|mutation)/gi, skill: 'graphql' },
  { pattern: /WebSocket|Socket\.io/gi, skill: 'websockets' },
  { pattern: /useState|useReducer|useEffect/gi, skill: 'react-hooks' },
  { pattern: /describe\s*\(|it\s*\(|test\s*\(|expect\s*\(/gi, skill: 'testing' },
  { pattern: /SELECT\s+.*\s+FROM|INSERT\s+INTO/gi, skill: 'sql' },
  { pattern: /JWT|Bearer\s+token|OAuth/gi, skill: 'authentication' },
  { pattern: /async\s+function|await\s+|Promise\./gi, skill: 'async-programming' },
]

/**
 * Extract skills from code patterns in content
 */
export function extractSkillsFromCode(content: string): string[] {
  const skills = new Set<string>()

  // Code block language detection
  const codeBlockLangs = content.matchAll(/```(\w+)/g)
  for (const match of codeBlockLangs) {
    const lang = match[1].toLowerCase()
    if (LANG_TO_SKILL[lang]) {
      skills.add(LANG_TO_SKILL[lang])
    }
  }

  // Import/require analysis
  const importPatterns = [
    /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]

  for (const pattern of importPatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      const pkg = (match[1] || '').toLowerCase()
      if (!pkg) continue

      for (const [key, skill] of Object.entries(PACKAGE_TO_SKILL)) {
        if (pkg === key || pkg.startsWith(key + '/') || pkg.startsWith('@' + key + '/')) {
          skills.add(skill)
          break
        }
      }
    }
  }

  // Pattern-based detection
  for (const { pattern, skill } of PATTERN_SKILLS) {
    if (pattern.test(content)) {
      skills.add(skill)
    }
  }

  return Array.from(skills)
}

/* ═══════════════════════════════════════════════════════════════════════════
   INDEXER CLASS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Browser-compatible content indexer
 */
export class ContentIndexer {
  private vocabulary: Vocabulary

  constructor() {
    this.vocabulary = getVocabulary()
  }

  /**
   * Index a single document
   */
  index(path: string, content: string): IndexEntry {
    const { frontmatter, body } = parseFrontmatter(content)
    const title = extractTitle(body, frontmatter)
    const summary = (frontmatter.summary as string) || generateSummary(body)

    // Classify content
    const fullText = `${title} ${summary} ${body}`
    const classification = this.vocabulary.classify(fullText)

    // Calculate reading level
    const readingLevel = calculateReadingLevel(body)

    // Extract code skills
    const codeSkills = extractSkillsFromCode(content)
    const allSkills = [...new Set([...classification.skills, ...codeSkills])].slice(0, 15)

    return {
      path,
      title,
      summary,
      content: body,
      frontmatter,
      classification: {
        ...classification,
        skills: allSkills,
      },
      readingLevel: {
        gradeLevel: readingLevel.gradeLevel,
        readabilityScore: readingLevel.readabilityScore,
      },
      statistics: {
        sentences: readingLevel.sentences,
        words: readingLevel.words,
        characters: body.length,
      },
      skills: allSkills,
      lastIndexed: new Date().toISOString(),
    }
  }

  /**
   * Index and save a document to local storage
   * Also indexes dynamic document features (formulas, mentions) for search
   */
  async indexAndSave(path: string, content: string): Promise<LocalStrand> {
    const entry = this.index(path, content)

    // Save to local storage
    const strand = await saveStrand({
      path,
      title: entry.title,
      content: entry.content,
      frontmatter: entry.frontmatter ? JSON.stringify(entry.frontmatter) : undefined,
      indexedAt: entry.lastIndexed,
      tags: entry.classification.keywords.join(','),
      summary: entry.summary,
    })

    // Also index dynamic document features (formulas, mentions)
    try {
      const { mentions, formulas } = this.extractDynamicFeatures(content, path)
      
      if (mentions.length > 0 || formulas.length > 0) {
        await reindexDynamicDocument(path, mentions, formulas, content)
      }
    } catch (error) {
      // Don't fail the main indexing if dynamic indexing fails
      console.warn('[ContentIndexer] Dynamic document indexing failed:', error)
    }

    return strand
  }

  /**
   * Extract dynamic document features (mentions and formulas) from content
   */
  private extractDynamicFeatures(
    content: string,
    path: string
  ): {
    mentions: MentionableEntity[]
    formulas: Array<{ formula: string; result: unknown; fieldName?: string; blockId?: string }>
  } {
    const mentions: MentionableEntity[] = []
    const formulas: Array<{ formula: string; result: unknown; fieldName?: string; blockId?: string }> = []

    // Extract @mentions: @[Label](id) or simple @label patterns
    const mentionPatterns = [
      /@\[([^\]]+?)\]\(([^)]+?)\)/g,  // @[Label](id) format
      /@([A-Z][a-zA-Z0-9-]+)/g,        // @CamelCase format
    ]

    for (const pattern of mentionPatterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(content)) !== null) {
        const label = match[1]
        const id = match[2] || `mention-${label.toLowerCase().replace(/\s+/g, '-')}`
        
        // Infer entity type from patterns
        const type = this.inferMentionType(label)
        
        mentions.push({
          id,
          label,
          type,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as MentionableEntity)
      }
    }

    // Extract formula blocks: ```formula or =FUNCTION() patterns
    const formulaBlockPattern = /```formula(?::([a-zA-Z0-9_-]+))?\n([\s\S]*?)\n```/g
    let formulaMatch: RegExpExecArray | null
    
    while ((formulaMatch = formulaBlockPattern.exec(content)) !== null) {
      const fieldName = formulaMatch[1]
      const expression = formulaMatch[2].trim()
      
      formulas.push({
        formula: expression,
        result: null, // Result will be computed on demand
        fieldName,
        blockId: undefined,
      })
    }

    // Also detect inline formulas: =ADD(...), =SUM(...), etc.
    const inlineFormulaPattern = /=([A-Z_]+)\(([^)]*)\)/g
    let inlineMatch: RegExpExecArray | null
    
    while ((inlineMatch = inlineFormulaPattern.exec(content)) !== null) {
      const expression = inlineMatch[0]
      
      // Avoid duplicates from formula blocks
      if (!formulas.some(f => f.formula === expression)) {
        formulas.push({
          formula: expression,
          result: null,
          fieldName: undefined,
          blockId: undefined,
        })
      }
    }

    return { mentions, formulas }
  }

  /**
   * Infer mention entity type from label patterns
   */
  private inferMentionType(label: string): MentionableEntity['type'] {
    const lowerLabel = label.toLowerCase()
    
    // Date patterns
    if (/\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}/i.test(label)) {
      return 'date'
    }
    
    // Event patterns (contains date-like words or event indicators)
    if (/meeting|conference|summit|event|party|dinner|lunch|call|appointment/i.test(lowerLabel)) {
      return 'event'
    }
    
    // Place patterns (capitalized, may have location indicators)
    if (/city|town|airport|hotel|restaurant|station|park|museum|building|street|avenue|road|drive/i.test(lowerLabel)) {
      return 'place'
    }
    
    // Document patterns (file-like)
    if (/\.md$|\.txt$|\.doc|note|document|file|page/i.test(lowerLabel)) {
      return 'strand'
    }
    
    // Tag patterns (starts with # or category-like)
    if (label.startsWith('#') || /tag|category|label/i.test(lowerLabel)) {
      return 'tag'
    }
    
    // Default to person for capitalized names
    if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(label)) {
      return 'person'
    }
    
    // Generic fallback
    return 'strand'
  }

  /**
   * Index multiple documents
   */
  indexMany(documents: Array<{ path: string; content: string }>): IndexEntry[] {
    return documents.map(({ path, content }) => this.index(path, content))
  }

  /**
   * Calculate statistics from indexed entries
   */
  calculateStats(entries: IndexEntry[]): IndexStats {
    const stats: IndexStats = {
      totalIndexed: entries.length,
      bySubject: {},
      byTopic: {},
      byDifficulty: {},
      averageReadingLevel: 0,
    }

    let totalReadingLevel = 0

    for (const entry of entries) {
      // Count subjects
      for (const subject of entry.classification.subjects) {
        stats.bySubject[subject] = (stats.bySubject[subject] || 0) + 1
      }

      // Count topics
      for (const topic of entry.classification.topics) {
        stats.byTopic[topic] = (stats.byTopic[topic] || 0) + 1
      }

      // Count difficulty
      const difficulty = entry.classification.difficulty
      stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1

      // Sum reading levels
      totalReadingLevel += entry.readingLevel.gradeLevel
    }

    if (entries.length > 0) {
      stats.averageReadingLevel = Math.round((totalReadingLevel / entries.length) * 10) / 10
    }

    return stats
  }
}

// Singleton instance
let indexerInstance: ContentIndexer | null = null

/**
 * Get shared indexer instance
 */
export function getIndexer(): ContentIndexer {
  if (!indexerInstance) {
    indexerInstance = new ContentIndexer()
  }
  return indexerInstance
}

/* ═══════════════════════════════════════════════════════════════════════════
   DYNAMIC CONTENT SEARCH
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Search content including dynamic document features (formulas, mentions)
 * This provides a unified search interface that includes computed values
 * and mention relationships alongside regular content search.
 */
export async function searchWithDynamicContent(
  query: string,
  options?: {
    includeDynamic?: boolean
    dynamicTypes?: Array<'formula' | 'mention' | 'relationship'>
    limit?: number
  }
): Promise<{
  standard: IndexEntry[]
  dynamic: DynamicSearchResult[]
}> {
  const limit = options?.limit || 20
  const includeDynamic = options?.includeDynamic ?? true

  // Get dynamic content results if enabled
  let dynamicResults: DynamicSearchResult[] = []
  if (includeDynamic) {
    try {
      dynamicResults = await searchDynamicContent(query, {
        types: options?.dynamicTypes,
        limit,
      })
    } catch (error) {
      console.warn('[ContentIndexer] Dynamic search failed:', error)
    }
  }

  return {
    standard: [], // Standard results would come from the caller's context
    dynamic: dynamicResults,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export { Vocabulary, getVocabulary } from './vocabulary'
export { PorterStemmer, getStemmer } from './porter-stemmer'

// Re-export dynamic document indexing utilities
export {
  searchDynamicContent,
  indexFormulaResult,
  reindexDynamicDocument,
  getRelatedMentions,
  getCoOccurringEntities,
  clearDynamicIndex,
  searchFormulas,
  searchMentionRelationships,
} from './dynamicDocumentIndex'
export type { DynamicSearchResult, IndexedFormulaResult, MentionRelationship } from './dynamicDocumentIndex'

export default {
  ContentIndexer,
  getIndexer,
  parseFrontmatter,
  extractTitle,
  generateSummary,
  calculateReadingLevel,
  extractSkillsFromCode,
  searchWithDynamicContent,
}
