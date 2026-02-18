/**
 * Browser-Compatible Categorization Algorithm
 * @module lib/categorization/algorithm
 *
 * Ported from scripts/categorize-strand.ts for browser/Web Worker execution.
 * Uses keyword-based NLP categorization without external dependencies.
 */

import type {
  CategorizationInput,
  CategorySuggestion,
  CategoryResult,
  CategoryDefinition,
  CategorizationConfig,
} from './types'

/**
 * Default category definitions with keywords
 */
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    path: 'weaves/wiki/tutorials/',
    label: 'Tutorials',
    description: 'Tutorials and learning guides',
    keywords: ['tutorial', 'guide', 'how-to', 'learn', 'step-by-step', 'getting started', 'introduction'],
    weight: 1.0,
  },
  {
    path: 'weaves/wiki/reference/',
    label: 'Reference',
    description: 'API and technical reference',
    keywords: ['api', 'reference', 'documentation', 'spec', 'specification', 'interface', 'method'],
    weight: 1.0,
  },
  {
    path: 'weaves/wiki/concepts/',
    label: 'Concepts',
    description: 'Conceptual explanations and theory',
    keywords: ['concept', 'theory', 'principle', 'fundamental', 'architecture', 'design', 'pattern'],
    weight: 1.0,
  },
  {
    path: 'weaves/wiki/best-practices/',
    label: 'Best Practices',
    description: 'Best practices and recommendations',
    keywords: ['best practice', 'recommendation', 'tip', 'guideline', 'convention', 'standard'],
    weight: 1.0,
  },
  {
    path: 'weaves/notes/',
    label: 'Notes',
    description: 'Personal notes and ideas',
    keywords: ['note', 'memo', 'thought', 'idea', 'draft', 'scratch'],
    weight: 1.0,
  },
  {
    path: 'weaves/projects/',
    label: 'Projects',
    description: 'Project documentation',
    keywords: ['project', 'implementation', 'build', 'create', 'develop', 'app', 'application'],
    weight: 1.0,
  },
  {
    path: 'weaves/research/',
    label: 'Research',
    description: 'Research and analysis',
    keywords: ['research', 'study', 'analysis', 'investigation', 'exploration', 'experiment'],
    weight: 1.0,
  },
]

/**
 * Default categorization config
 */
export const DEFAULT_CONFIG: CategorizationConfig = {
  enabled: true,
  auto_apply_threshold: 0.95,
  pr_threshold: 0.80,
  categories: DEFAULT_CATEGORIES,
  excluded_paths: ['weaves/inbox/', 'weaves/.templates/'],
  keyword_hints: {},
}

/**
 * Extract simple keywords from content using frequency analysis
 */
export function extractKeywords(content: string): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)

  // Count word frequencies
  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }

  // Return top keywords by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word)
}

/**
 * Parse frontmatter from markdown content
 * Uses simple regex-based parsing (js-yaml would require import)
 */
export function parseFrontmatter(content: string): {
  metadata: Record<string, any>
  body: string
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { metadata: {}, body: content }
  }

  try {
    // Simple YAML parsing for common fields (title, tags, taxonomy)
    const yamlContent = match[1]
    const metadata: Record<string, any> = {}

    // Parse title
    const titleMatch = yamlContent.match(/^title:\s*(.+)$/m)
    if (titleMatch) {
      metadata.title = titleMatch[1].trim().replace(/^['"]|['"]$/g, '')
    }

    // Parse summary
    const summaryMatch = yamlContent.match(/^summary:\s*(.+)$/m)
    if (summaryMatch) {
      metadata.summary = summaryMatch[1].trim().replace(/^['"]|['"]$/g, '')
    }

    // Parse tags array
    const tagsMatch = yamlContent.match(/^tags:\s*\[(.*?)\]/m)
    if (tagsMatch) {
      metadata.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''))
    }

    // Parse taxonomy topics
    const topicsMatch = yamlContent.match(/^\s*topics:\s*\[(.*?)\]/m)
    if (topicsMatch) {
      metadata.taxonomy = {
        topics: topicsMatch[1].split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''))
      }
    }

    return { metadata, body: match[2] }
  } catch {
    return { metadata: {}, body: content }
  }
}

/**
 * Extract title from metadata or content
 */
export function extractTitle(metadata: Record<string, any>, content: string): string {
  // Check metadata first
  if (metadata.title) {
    return metadata.title
  }

  // Look for first heading in content
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) {
    return headingMatch[1].trim()
  }

  return 'Untitled'
}

/**
 * Score a single category against content
 */
function scoreCategory(
  category: CategoryDefinition,
  contentLower: string,
  titleLower: string,
  keywords: Set<string>,
  metadata: Record<string, any>
): { score: number; matches: string[] } {
  let score = 0
  const matches: string[] = []
  const weight = category.weight || 1.0

  // Check category keywords against content, title, and extracted keywords
  for (const kw of category.keywords) {
    if (contentLower.includes(kw)) {
      score += 0.15 * weight
      matches.push(`content contains "${kw}"`)
    }
    if (titleLower.includes(kw)) {
      score += 0.25 * weight
      matches.push(`title contains "${kw}"`)
    }
    if (keywords.has(kw)) {
      score += 0.1 * weight
      matches.push(`keyword: "${kw}"`)
    }
  }

  // Check metadata tags
  if (metadata.tags && Array.isArray(metadata.tags)) {
    for (const tag of metadata.tags) {
      const tagLower = String(tag).toLowerCase()
      if (category.keywords.some(kw => tagLower.includes(kw))) {
        score += 0.15 * weight
        matches.push(`tag: "${tag}"`)
      }
    }
  }

  // Check taxonomy topics
  if (metadata.taxonomy?.topics && Array.isArray(metadata.taxonomy.topics)) {
    for (const topic of metadata.taxonomy.topics) {
      const topicLower = String(topic).toLowerCase()
      if (category.keywords.some(kw => topicLower.includes(kw))) {
        score += 0.2 * weight
        matches.push(`topic: "${topic}"`)
      }
    }
  }

  return { score: Math.min(score, 1), matches }
}

/**
 * Suggest category based on content analysis
 */
export function suggestCategory(input: CategorizationInput): CategorySuggestion {
  const { content, title, frontmatter, config } = input
  const contentLower = content.toLowerCase()
  const titleLower = title.toLowerCase()
  const keywords = new Set(extractKeywords(content))
  const metadata = frontmatter || {}

  // Score each category
  const scores: Array<{
    path: string
    score: number
    matches: string[]
    description: string
  }> = []

  // Score configured categories
  const categories = config.categories || DEFAULT_CATEGORIES
  for (const category of categories) {
    // Skip excluded paths
    if (config.excluded_paths?.some(ep => category.path.startsWith(ep))) {
      continue
    }

    const { score, matches } = scoreCategory(
      category,
      contentLower,
      titleLower,
      keywords,
      metadata
    )

    if (score > 0) {
      scores.push({
        path: category.path,
        score,
        matches,
        description: category.description,
      })
    }
  }

  // Check keyword hints from config
  if (config.keyword_hints) {
    for (const [hintPath, hintKeywords] of Object.entries(config.keyword_hints)) {
      if (config.excluded_paths?.some(ep => hintPath.startsWith(ep))) {
        continue
      }

      let score = 0
      const matches: string[] = []

      for (const kw of hintKeywords) {
        if (contentLower.includes(kw)) {
          score += 0.15
          matches.push(`hint: content contains "${kw}"`)
        }
        if (titleLower.includes(kw)) {
          score += 0.25
          matches.push(`hint: title contains "${kw}"`)
        }
      }

      if (score > 0 && !scores.some(s => s.path === hintPath)) {
        scores.push({
          path: hintPath,
          score: Math.min(score, 1),
          matches,
          description: `Custom hint: ${hintPath}`,
        })
      }
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  // No matches found
  if (scores.length === 0) {
    return {
      category: 'weaves/inbox/',
      confidence: 0.3,
      reasoning: 'No category matches found. File should remain in inbox for manual review.',
      alternatives: [],
    }
  }

  // Return best match with alternatives
  const best = scores[0]
  return {
    category: best.path,
    confidence: best.score,
    reasoning: `${best.description}. ${best.matches.slice(0, 3).join('; ')}`,
    alternatives: scores.slice(1, 4).map(s => ({
      category: s.path,
      confidence: s.score,
      reasoning: s.matches.slice(0, 2).join('; '),
    })),
  }
}

/**
 * Categorize a single strand and return structured result
 */
export async function categorizeStrand(input: CategorizationInput): Promise<CategoryResult> {
  const { path, content, config } = input

  // Parse frontmatter
  const { metadata, body } = parseFrontmatter(content)

  // Extract title
  const title = input.title || extractTitle(metadata, body)

  // Get category suggestion
  const suggestion = suggestCategory({
    path,
    title,
    content: body,
    frontmatter: metadata,
    config,
  })

  // Determine action based on confidence thresholds
  const { auto_apply_threshold = 0.95, pr_threshold = 0.80 } = config

  let action: 'auto-apply' | 'suggest' | 'needs-triage'
  if (suggestion.confidence >= auto_apply_threshold) {
    action = 'auto-apply'
  } else if (suggestion.confidence >= pr_threshold) {
    action = 'suggest'
  } else {
    action = 'needs-triage'
  }

  // Extract current category from path
  const currentPath = path.replace(/\/[^/]+\.md$/, '/') || 'weaves/inbox/'

  return {
    filePath: path,
    currentPath,
    suggestion,
    action,
  }
}

/**
 * Batch categorize multiple strands
 */
export async function categorizeStrands(
  inputs: CategorizationInput[],
  onProgress?: (current: number, total: number) => void
): Promise<CategoryResult[]> {
  const results: CategoryResult[] = []

  for (let i = 0; i < inputs.length; i++) {
    const result = await categorizeStrand(inputs[i])
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, inputs.length)
    }
  }

  return results
}
