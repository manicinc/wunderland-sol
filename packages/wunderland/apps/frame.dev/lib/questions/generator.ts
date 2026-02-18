/**
 * Question Generation Library
 * 
 * Shared NLP logic for generating suggested questions from content.
 * Used by:
 * - Build-time script (generate-suggested-questions.js)
 * - Server-side API (lib/api/routes/questions.ts)
 * - Client-side fallback (SuggestedQuestions.tsx)
 * 
 * @module lib/questions/generator
 */

// ============================================================================
// TYPES
// ============================================================================

export type QuestionType = 'definition' | 'comparison' | 'application' | 'exploration' | 'code' | 'concept'
export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type QuestionSource = 'manual' | 'auto' | 'prebuilt' | 'heading' | 'keyword' | 'entity' | 'entity-comparison' | 'code-detection' | 'generic'

export interface GeneratedQuestion {
  text: string
  type: QuestionType
  confidence: number
  source: QuestionSource
}

export interface PrebuiltQuestion {
  question: string
  difficulty: QuestionDifficulty
  tags: string[]
}

export interface ContentAnalysis {
  words: number
  headings: number
  codeBlocks: number
  links: number
  significance: number
  difficulty: number
}

export interface GenerationOptions {
  maxQuestions?: number
  includeCodeQuestions?: boolean
  includeComparisonQuestions?: boolean
  includeExplorationQuestions?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Common stop words to filter from keyword extraction */
export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they',
  'what', 'which', 'who', 'how', 'when', 'where', 'why', 'all', 'each', 'some', 'any',
  'more', 'most', 'other', 'into', 'over', 'such', 'no', 'not', 'only', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'can', 'use', 'using',
])

/** Regex patterns for detecting tech entities */
export const TECH_PATTERNS = {
  languages: /\b(JavaScript|TypeScript|Python|Rust|Go|Java|C\+\+|Ruby|PHP|Swift|Kotlin|SQL)\b/gi,
  frameworks: /\b(React|Vue|Angular|Next\.?js|Node\.?js|Express|Django|FastAPI|Spring|TensorFlow|PyTorch)\b/gi,
  concepts: /\b(API|REST|GraphQL|database|algorithm|function|component|module|class|interface|type|schema)\b/gi,
}

// ============================================================================
// CONTENT ANALYSIS
// ============================================================================

/**
 * Analyze markdown content to determine significance and difficulty
 */
export function analyzeContent(content: string): ContentAnalysis {
  const words = content.trim().split(/\s+/).length
  const headings = (content.match(/^#{1,3}\s+.+$/gm) || []).length
  const codeBlocks = (content.match(/```/g) || []).length / 2
  const links = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length

  // Calculate significance score (0-100)
  let significance = 0
  significance += Math.min(words / 100, 30) // Length (max 30)
  significance += headings * 5 // Structure (5 pts per heading)
  significance += codeBlocks * 8 // Technical content (8 pts per code block)
  significance += links * 2 // References (2 pts per link)

  // Calculate difficulty (0-100)
  const avgWordLength = content.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / (words || 1)
  const technicalTerms = (content.match(/\b(API|SDK|CLI|HTTP|JSON|YAML|async|await|function|class|interface|type|const|let|var)\b/gi) || []).length

  let difficulty = 0
  difficulty += Math.min((avgWordLength - 4) * 10, 30) // Word complexity (max 30)
  difficulty += Math.min(technicalTerms / 5, 40) // Technical density (max 40)
  difficulty += Math.min(codeBlocks * 10, 30) // Code complexity (max 30)

  return {
    words,
    headings,
    codeBlocks,
    links,
    significance: Math.min(Math.round(significance), 100),
    difficulty: Math.min(Math.round(difficulty), 100),
  }
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

/**
 * Extract keywords from content using simple TF-like scoring
 */
export function extractKeywords(content: string, limit = 10): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))

  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
}

/**
 * Extract headings from markdown content
 */
export function extractHeadings(content: string): string[] {
  if (!content) return []
  const headingPattern = /^#{1,3}\s+(.+)$/gm
  const headings: string[] = []
  let match
  while ((match = headingPattern.exec(content)) !== null) {
    headings.push(match[1].trim())
  }
  return headings
}

/**
 * Extract tech entities (languages, frameworks, concepts)
 */
export function extractTechEntities(content: string): string[] {
  const entities = new Set<string>()
  for (const pattern of Object.values(TECH_PATTERNS)) {
    let match: RegExpExecArray | null
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(content)) !== null) {
      entities.add(match[0])
    }
  }
  return Array.from(entities)
}

/**
 * Check if content has code blocks
 */
export function hasCodeBlocks(content: string): boolean {
  return /```[\s\S]*?```/.test(content)
}

/**
 * Extract title from frontmatter or first heading
 */
export function extractTitle(content: string, fallbackPath?: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/title:\s*["']?(.+?)["']?\s*$/m)
  if (titleMatch) return titleMatch[1]
  if (fallbackPath) {
    return fallbackPath.split('/').pop()?.replace(/\.md$/, '').replace(/-/g, ' ') || 'this topic'
  }
  return 'this topic'
}

// ============================================================================
// QUESTION GENERATION
// ============================================================================

/**
 * Infer question type from text
 */
export function inferQuestionType(question: string): QuestionType {
  const q = question.toLowerCase()
  if (q.startsWith('what is') || q.includes('explain')) return 'definition'
  if (q.includes('compare') || q.includes('difference')) return 'comparison'
  if (q.includes('how do') || q.includes('implement') || q.includes('configure')) return 'application'
  if (q.includes('code') || q.includes('example')) return 'code'
  if (q.includes('concept') || q.includes('key')) return 'concept'
  return 'exploration'
}

/**
 * Convert prebuilt question to generated question format
 */
export function prebuiltToGenerated(
  prebuilt: PrebuiltQuestion,
  isManual: boolean
): GeneratedQuestion {
  return {
    text: prebuilt.question,
    type: inferQuestionType(prebuilt.question),
    confidence: isManual ? 1.0 : 0.8,
    source: isManual ? 'manual' : 'prebuilt',
  }
}

/**
 * Generate questions from content using NLP heuristics
 */
export function generateQuestionsFromContent(
  content: string,
  strandPath?: string,
  options: GenerationOptions = {}
): GeneratedQuestion[] {
  const {
    maxQuestions,
    includeCodeQuestions = true,
    includeComparisonQuestions = true,
    includeExplorationQuestions = true,
  } = options

  if (!content || content.length < 100) return []

  const questions: GeneratedQuestion[] = []
  const keywords = extractKeywords(content, 15)
  const headings = extractHeadings(content)
  const techEntities = extractTechEntities(content)
  const hasCode = hasCodeBlocks(content)

  // Extract strand name for context
  const strandName = extractTitle(content, strandPath)

  // 1. Questions from headings (high confidence)
  for (const heading of headings.slice(0, 3)) {
    // Skip generic headings
    if (/^(introduction|overview|summary|conclusion|references)$/i.test(heading)) continue

    questions.push({
      text: `What is ${heading.toLowerCase()}?`,
      type: 'definition',
      confidence: 0.9,
      source: 'heading',
    })

    if (heading.toLowerCase().includes('how')) {
      questions.push({
        text: heading.endsWith('?') ? heading : `${heading}?`,
        type: 'application',
        confidence: 0.85,
        source: 'heading',
      })
    }
  }

  // 2. Questions from tech entities (high confidence)
  for (const entity of techEntities.slice(0, 4)) {
    questions.push({
      text: `How is ${entity} used in ${strandName}?`,
      type: 'application',
      confidence: 0.85,
      source: 'entity',
    })
  }

  // 3. Questions from keywords (medium confidence)
  for (const keyword of keywords.slice(0, 5)) {
    // Skip if already covered by headings or entities
    if (headings.some(h => h.toLowerCase().includes(keyword))) continue
    if (techEntities.some(e => e.toLowerCase() === keyword)) continue

    questions.push({
      text: `Can you explain ${keyword} in the context of ${strandName}?`,
      type: 'concept',
      confidence: 0.7,
      source: 'keyword',
    })
  }

  // 4. Code-specific questions
  if (includeCodeQuestions && hasCode) {
    questions.push({
      text: `Walk me through the code examples in ${strandName}`,
      type: 'code',
      confidence: 0.8,
      source: 'code-detection',
    })
    questions.push({
      text: `What are the key implementation details shown in the code?`,
      type: 'code',
      confidence: 0.75,
      source: 'code-detection',
    })
  }

  // 5. Comparison questions (if multiple entities)
  if (includeComparisonQuestions && techEntities.length >= 2) {
    const [first, second] = techEntities
    questions.push({
      text: `How does ${first} compare to ${second} in this context?`,
      type: 'comparison',
      confidence: 0.7,
      source: 'entity-comparison',
    })
  }

  // 6. Exploration questions
  if (includeExplorationQuestions) {
    questions.push({
      text: `What are the key takeaways from ${strandName}?`,
      type: 'exploration',
      confidence: 0.65,
      source: 'generic',
    })

    questions.push({
      text: `What should I learn next after understanding ${strandName}?`,
      type: 'exploration',
      confidence: 0.6,
      source: 'generic',
    })
  }

  // Sort by confidence and dedupe
  const seen = new Set<string>()
  const filtered = questions
    .sort((a, b) => b.confidence - a.confidence)
    .filter(q => {
      const key = q.text.toLowerCase().slice(0, 30)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return maxQuestions ? filtered.slice(0, maxQuestions) : filtered
}

/**
 * Generate questions using template-based approach (for build-time script)
 * Uses deterministic selection based on path hash
 */
export function generateTemplateQuestions(
  content: string,
  docPath: string,
  analysis: ContentAnalysis
): PrebuiltQuestion[] {
  // Only generate questions for significant content (score >= 20)
  if (analysis.significance < 20) {
    return []
  }

  const title = extractTitle(content, docPath)
  const headings = extractHeadings(content)

  // Generate 1-5 questions based on significance
  const questionCount = Math.min(
    Math.ceil(analysis.significance / 25),
    5
  )

  // Question templates based on difficulty and content type
  const templates: string[] = []

  if (analysis.difficulty < 40) {
    templates.push(
      `What is ${title}?`,
      `How does ${title} work?`,
      `When should I use ${title}?`
    )
  } else {
    templates.push(
      `How do I implement ${title}?`,
      `What are the key concepts in ${title}?`
    )
    if (headings.length >= 2) {
      templates.push(`What is the difference between ${headings[0]} and ${headings[1]}?`)
    }
  }

  if (analysis.codeBlocks > 0) {
    templates.push(
      `Show me an example of ${title}`,
      `How do I configure ${title}?`
    )
  }

  if (headings.length > 2) {
    templates.push(
      `Explain ${headings[0]}`,
      `What is ${headings[1]} used for?`
    )
  }

  // Randomly select questions (deterministic based on path hash)
  const hash = docPath.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
  const shuffled = templates.sort(() => ((hash * 9301 + 49297) % 233280) / 233280 - 0.5)

  // Determine difficulty level
  const difficulty: QuestionDifficulty = 
    analysis.difficulty < 40 ? 'beginner' : 
    analysis.difficulty < 70 ? 'intermediate' : 
    'advanced'

  return shuffled.slice(0, questionCount).map(q => ({
    question: q,
    difficulty,
    tags: headings.slice(0, 3),
  }))
}

// ============================================================================
// FRONTMATTER PARSING
// ============================================================================

interface FrontmatterQuestion {
  question?: string
  difficulty?: QuestionDifficulty
  tags?: string[]
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(markdown: string): {
  frontmatter: Record<string, unknown> | null
  content: string
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const match = markdown.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: null, content: markdown }
  }

  const frontmatterStr = match[1]
  const content = markdown.slice(match[0].length)

  try {
    const frontmatter = parseSimpleYaml(frontmatterStr)
    return { frontmatter, content }
  } catch (e) {
    console.warn('[Questions] Failed to parse frontmatter:', e)
    return { frontmatter: null, content: markdown }
  }
}

/**
 * Simple YAML parser for frontmatter
 * Handles: strings, arrays, objects, nested suggestedQuestions
 */
function parseSimpleYaml(yamlStr: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = yamlStr.split('\n')
  let currentKey: string | null = null
  let currentArray: unknown[] | null = null
  let currentArrayItem: Record<string, unknown> | string | null = null
  let inArray = false
  let arrayIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    // Check for array item start
    const arrayItemMatch = line.match(/^(\s*)- (.*)$/)
    if (arrayItemMatch && inArray) {
      // Save previous item if exists
      if (currentArrayItem !== null && currentArray) {
        currentArray.push(currentArrayItem)
      }

      const itemContent = arrayItemMatch[2].trim()

      // Check if it's a key-value pair
      const kvMatch = itemContent.match(/^(\w+):\s*(.*)$/)
      if (kvMatch) {
        currentArrayItem = {}
        const value = kvMatch[2].trim()
        if (value) {
          // Handle inline arrays like [tag1, tag2]
          if (value.startsWith('[') && value.endsWith(']')) {
            (currentArrayItem as Record<string, unknown>)[kvMatch[1]] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
          } else {
            (currentArrayItem as Record<string, unknown>)[kvMatch[1]] = value.replace(/^["']|["']$/g, '')
          }
        }
      } else {
        // Simple string array item
        currentArrayItem = itemContent.replace(/^["']|["']$/g, '')
      }
      continue
    }

    // Check for nested key in array item
    const nestedKeyMatch = line.match(/^(\s+)(\w+):\s*(.*)$/)
    if (nestedKeyMatch && inArray && currentArrayItem !== null && typeof currentArrayItem === 'object') {
      const indent = nestedKeyMatch[1].length
      if (indent > arrayIndent) {
        const key = nestedKeyMatch[2]
        const value = nestedKeyMatch[3].trim()
        if (value) {
          // Handle inline arrays
          if (value.startsWith('[') && value.endsWith(']')) {
            currentArrayItem[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
          } else {
            currentArrayItem[key] = value.replace(/^["']|["']$/g, '')
          }
        }
        continue
      }
    }

    // Check for top-level key
    const keyMatch = trimmed.match(/^(\w+):\s*(.*)$/)
    if (keyMatch) {
      // Save current array if we were building one
      if (inArray && currentKey && currentArray) {
        if (currentArrayItem !== null) {
          currentArray.push(currentArrayItem)
        }
        result[currentKey] = currentArray
        inArray = false
        currentArray = null
        currentArrayItem = null
      }

      const key = keyMatch[1]
      const value = keyMatch[2].trim()

      if (!value) {
        // Could be start of array or nested object
        currentKey = key
        // Check next line to see if it's an array
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
          inArray = true
          currentArray = []
          currentArrayItem = null
          const nextLineMatch = lines[i + 1].match(/^(\s*)/)
          arrayIndent = nextLineMatch ? nextLineMatch[1].length : 0
        }
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        result[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
      } else {
        // Simple value
        result[key] = value.replace(/^["']|["']$/g, '')
      }
    }
  }

  // Save final array if we were building one
  if (inArray && currentKey && currentArray) {
    if (currentArrayItem !== null) {
      currentArray.push(currentArrayItem)
    }
    result[currentKey] = currentArray
  }

  return result
}

/**
 * Extract manual questions from frontmatter
 */
export function extractManualQuestions(
  frontmatter: Record<string, unknown> | null
): PrebuiltQuestion[] | null {
  if (!frontmatter || !frontmatter.suggestedQuestions) {
    return null
  }

  const questions = frontmatter.suggestedQuestions
  if (!Array.isArray(questions) || questions.length === 0) {
    return null
  }

  // Validate and normalize questions
  return questions
    .filter((q): q is FrontmatterQuestion | string => q && (typeof q === 'string' || (typeof q === 'object' && 'question' in q)))
    .map(q => {
      if (typeof q === 'string') {
        return { question: q, difficulty: 'intermediate' as QuestionDifficulty, tags: [] }
      }
      return {
        question: q.question || '',
        difficulty: q.difficulty || 'intermediate',
        tags: Array.isArray(q.tags) ? q.tags : [],
      }
    })
    .filter(q => q.question)
}

