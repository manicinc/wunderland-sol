#!/usr/bin/env npx tsx
/**
 * Categorize Strand Script
 * @module scripts/categorize-strand
 *
 * Analyzes a strand from the inbox and suggests a category.
 * Used by GitHub Actions workflow for auto-categorization.
 *
 * Usage:
 *   npx tsx scripts/categorize-strand.ts <file-path>
 *
 * Output:
 *   JSON to stdout with category suggestion
 */

import * as fs from 'fs'
import * as path from 'path'
// @ts-ignore - js-yaml types not installed, but script runs via tsx
import * as yaml from 'js-yaml'

// Note: In production, these would be imported from the compiled NLP module
// For GitHub Actions, we'll use a simplified version inline

interface StrandMetadata {
  title?: string
  summary?: string
  tags?: string[]
  taxonomy?: {
    topics?: string[]
    subjects?: string[]
  }
}

interface CategorySuggestion {
  path: string
  confidence: number
  reasoning: string
  alternatives?: Array<{ path: string; confidence: number; reasoning: string }>
}

interface CategorizationConfig {
  enabled: boolean
  confidence_threshold: number
  auto_merge_enabled: boolean
  use_llm_fallback: boolean
  inbox_path: string
  excluded_paths: string[]
  category_hints?: Record<string, { path: string; keywords: string[] }>
}

// Known categories with keywords
const KNOWN_CATEGORIES = [
  {
    path: 'weaves/wiki/tutorials/',
    keywords: ['tutorial', 'guide', 'how-to', 'learn', 'step-by-step', 'getting started', 'introduction'],
    description: 'Tutorials and learning guides'
  },
  {
    path: 'weaves/wiki/reference/',
    keywords: ['api', 'reference', 'documentation', 'spec', 'specification', 'interface', 'method'],
    description: 'API and technical reference'
  },
  {
    path: 'weaves/wiki/concepts/',
    keywords: ['concept', 'theory', 'principle', 'fundamental', 'architecture', 'design', 'pattern'],
    description: 'Conceptual explanations and theory'
  },
  {
    path: 'weaves/wiki/best-practices/',
    keywords: ['best practice', 'recommendation', 'tip', 'guideline', 'convention', 'standard'],
    description: 'Best practices and recommendations'
  },
  {
    path: 'weaves/notes/',
    keywords: ['note', 'memo', 'thought', 'idea', 'draft', 'scratch'],
    description: 'Personal notes and ideas'
  },
  {
    path: 'weaves/projects/',
    keywords: ['project', 'implementation', 'build', 'create', 'develop', 'app', 'application'],
    description: 'Project documentation'
  },
  {
    path: 'weaves/research/',
    keywords: ['research', 'study', 'analysis', 'investigation', 'exploration', 'experiment'],
    description: 'Research and analysis'
  },
]

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): { metadata: StrandMetadata; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { metadata: {}, body: content }
  }

  try {
    const metadata = yaml.load(match[1]) as StrandMetadata
    return { metadata, body: match[2] }
  } catch {
    return { metadata: {}, body: content }
  }
}

/**
 * Extract simple keywords from content
 */
function extractKeywords(content: string): string[] {
  const words = content.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)

  // Count word frequencies
  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }

  // Return top keywords
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word)
}

/**
 * Suggest category based on content analysis
 */
function suggestCategory(
  content: string,
  metadata: StrandMetadata,
  config: CategorizationConfig
): CategorySuggestion {
  const contentLower = content.toLowerCase()
  const titleLower = (metadata.title || '').toLowerCase()
  const keywords = extractKeywords(content)
  const keywordSet = new Set(keywords)

  // Score each category
  const scores: Array<{ path: string; score: number; matches: string[]; description: string }> = []

  // Check built-in categories
  for (const category of KNOWN_CATEGORIES) {
    if (config.excluded_paths?.some(ep => category.path.startsWith(ep))) {
      continue
    }

    let score = 0
    const matches: string[] = []

    for (const kw of category.keywords) {
      if (contentLower.includes(kw)) {
        score += 0.15
        matches.push(`content contains "${kw}"`)
      }
      if (titleLower.includes(kw)) {
        score += 0.25
        matches.push(`title contains "${kw}"`)
      }
      if (keywordSet.has(kw)) {
        score += 0.1
        matches.push(`keyword: "${kw}"`)
      }
    }

    // Check metadata tags
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        const tagLower = tag.toLowerCase()
        if (category.keywords.some(kw => tagLower.includes(kw))) {
          score += 0.15
          matches.push(`tag: "${tag}"`)
        }
      }
    }

    // Check taxonomy topics
    if (metadata.taxonomy?.topics) {
      for (const topic of metadata.taxonomy.topics) {
        const topicLower = topic.toLowerCase()
        if (category.keywords.some(kw => topicLower.includes(kw))) {
          score += 0.2
          matches.push(`topic: "${topic}"`)
        }
      }
    }

    if (score > 0) {
      scores.push({
        path: category.path,
        score: Math.min(score, 1),
        matches,
        description: category.description
      })
    }
  }

  // Check config category hints
  if (config.category_hints) {
    for (const [name, hint] of Object.entries(config.category_hints)) {
      if (config.excluded_paths?.some(ep => hint.path.startsWith(ep))) {
        continue
      }

      let score = 0
      const matches: string[] = []

      for (const kw of hint.keywords) {
        if (contentLower.includes(kw)) {
          score += 0.15
          matches.push(`hint "${name}": content contains "${kw}"`)
        }
        if (titleLower.includes(kw)) {
          score += 0.25
          matches.push(`hint "${name}": title contains "${kw}"`)
        }
      }

      if (score > 0 && !scores.some(s => s.path === hint.path)) {
        scores.push({
          path: hint.path,
          score: Math.min(score, 1),
          matches,
          description: `Custom category: ${name}`
        })
      }
    }
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    return {
      path: config.inbox_path || 'weaves/inbox/',
      confidence: 0.3,
      reasoning: 'No category matches found',
      alternatives: []
    }
  }

  const best = scores[0]
  return {
    path: best.path,
    confidence: best.score,
    reasoning: `${best.description}. ${best.matches.slice(0, 3).join('; ')}`,
    alternatives: scores.slice(1, 4).map(s => ({
      path: s.path,
      confidence: s.score,
      reasoning: s.matches.slice(0, 2).join('; ')
    }))
  }
}

/**
 * Load categorization config
 */
function loadConfig(): CategorizationConfig {
  const configPaths = [
    '.github/categorization-config.yml',
    '.github/categorization-config.yaml',
    'categorization-config.yml'
  ]

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      return yaml.load(content) as CategorizationConfig
    }
  }

  // Default config
  return {
    enabled: true,
    confidence_threshold: 0.8,
    auto_merge_enabled: true,
    use_llm_fallback: true,
    inbox_path: 'weaves/inbox/',
    excluded_paths: ['weaves/inbox/', 'weaves/.templates/']
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/categorize-strand.ts <file-path>')
    process.exit(1)
  }

  const filePath = args[0]

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  // Load config
  const config = loadConfig()

  if (!config.enabled) {
    console.log(JSON.stringify({
      status: 'disabled',
      message: 'Auto-categorization is disabled'
    }))
    process.exit(0)
  }

  // Read and parse file
  const content = fs.readFileSync(filePath, 'utf-8')
  const { metadata, body } = parseFrontmatter(content)

  // Get title from metadata or first heading
  if (!metadata.title) {
    const headingMatch = body.match(/^#\s+(.+)$/m)
    if (headingMatch) {
      metadata.title = headingMatch[1].trim()
    }
  }

  // Suggest category
  const suggestion = suggestCategory(body, metadata, config)

  // Determine action based on confidence
  const meetsThreshold = suggestion.confidence >= config.confidence_threshold
  const action = meetsThreshold && config.auto_merge_enabled
    ? 'auto-move'
    : suggestion.confidence >= 0.5
      ? 'suggest'
      : 'needs-triage'

  // Output result
  const result = {
    status: 'success',
    file: filePath,
    currentPath: path.dirname(filePath).replace(/\\/g, '/') + '/',
    suggestion,
    action,
    meetsThreshold,
    config: {
      threshold: config.confidence_threshold,
      autoMerge: config.auto_merge_enabled
    }
  }

  console.log(JSON.stringify(result, null, 2))

  // Set GitHub Actions outputs if running in CI
  if (process.env.GITHUB_OUTPUT) {
    const outputs = [
      `suggested_path=${suggestion.path}`,
      `confidence=${suggestion.confidence}`,
      `action=${action}`,
      `meets_threshold=${meetsThreshold}`
    ]

    fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs.join('\n') + '\n')
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
