/**
 * Utility functions for Quarry Codex viewer
 * @module codex/utils
 */

import type { NodeLevel, GitTreeItem, KnowledgeTreeNode, StrandMetadata, SearchOptions } from './types'
import { IGNORED_SEGMENTS, MARKDOWN_EXTENSIONS } from './constants'

/**
 * Check if a path should be ignored based on configured segments
 * @param value - Path or filename to check
 * @returns True if path should be ignored
 * 
 * @example
 * ```ts
 * shouldIgnorePath('.github/workflows') // true
 * shouldIgnorePath('weaves/tech/intro.md') // false
 * ```
 */
export function shouldIgnorePath(value: string = ''): boolean {
  if (!value) return false
  const segments = value.split('/')
  return IGNORED_SEGMENTS.some((ignored) => segments.includes(ignored) || value.startsWith(ignored))
}

/**
 * Check if a filename is a markdown file
 * @param filename - Filename to check
 * @returns True if file is markdown
 * 
 * @example
 * ```ts
 * isMarkdownFile('intro.md') // true
 * isMarkdownFile('README.mdx') // true
 * isMarkdownFile('config.yaml') // false
 * ```
 */
export function isMarkdownFile(filename: string = ''): boolean {
  const lower = filename.toLowerCase()
  return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/**
 * Determine the knowledge hierarchy level for a given path
 * @param path - Full path from repo root
 * @param type - Item type (file or dir)
 * @returns Hierarchy level
 * 
 * @example
 * ```ts
 * determineNodeLevel('weaves', 'dir') // 'fabric'
 * determineNodeLevel('weaves/tech', 'dir') // 'weave'
 * determineNodeLevel('weaves/tech/research', 'dir') // 'loom'
 * determineNodeLevel('weaves/tech/overview.md', 'file') // 'strand'
 * ```
 */
export function determineNodeLevel(path: string, type: 'file' | 'dir'): NodeLevel {
  if (!path) return 'fabric'

  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return 'fabric'

  const [root] = segments

  if (root === 'weaves') {
    // `weaves/` root
    if (segments.length === 1) {
      return 'fabric'
    }

    // `weaves/<slug>`
    if (segments.length === 2) {
      return type === 'dir' ? 'weave' : 'strand'
    }

    // Anything deeper inside a weave
    return type === 'dir' ? 'loom' : 'strand'
  }

  // Outside the canonical hierarchy we treat directories as generic folders
  return type === 'dir' ? 'folder' : 'strand'
}

/**
 * Build a hierarchical knowledge tree from flat Git tree items
 * @param items - Flat array of Git tree items
 * @returns Root-level tree nodes
 * 
 * @remarks
 * - Filters out non-markdown files
 * - Filters out ignored paths
 * - Calculates strand counts for each directory
 * - Sorts directories before files, then alphabetically
 */
export function buildKnowledgeTree(items: GitTreeItem[]): KnowledgeTreeNode[] {
  const root: KnowledgeTreeNode = {
    name: 'root',
    path: '',
    type: 'dir',
    children: [],
    strandCount: 0,
    level: 'fabric',
  }

  // Build tree structure
  items.forEach((item) => {
    if (item.type !== 'blob') return
    if (!isMarkdownFile(item.path)) return
    if (shouldIgnorePath(item.path)) return

    const segments = item.path.split('/')
    let currentNode = root

    segments.forEach((segment, index) => {
      const currentPath = segments.slice(0, index + 1).join('/')
      const isFile = index === segments.length - 1

      if (!currentNode.children) {
        currentNode.children = []
      }

      let childNode = currentNode.children.find((child) => child.name === segment)

      if (!childNode) {
        childNode = {
          name: segment,
          path: currentPath,
          type: isFile ? 'file' : 'dir',
          children: isFile ? undefined : [],
          strandCount: 0,
          level: determineNodeLevel(currentPath, isFile ? 'file' : 'dir'),
        }
        currentNode.children.push(childNode)
      }

      currentNode = childNode
    })
  })

  /**
   * Recursively tally strand counts and prune empty directories.
   * Also flattens legacy `looms/` and `strands/` folders so they
   * don't appear as extra navigation levels in the UI.
   *
   * @param node - Node to process
   * @returns Total strands in subtree
   */
  function tallyStrands(node: KnowledgeTreeNode): number {
    if (node.type === 'file') {
      node.strandCount = 1
      return 1
    }

    if (!node.children || node.children.length === 0) {
      node.strandCount = 0
      return 0
    }

    let subtotal = 0

    // First process children and drop any empty branches
    node.children = node.children
      .map((child) => {
        const count = tallyStrands(child)
        subtotal += count
        return { child, count }
      })
      .filter(({ count }) => count > 0)
      .map(({ child }) => child)

    // Flatten legacy `looms` and `strands` directories so that
    // their children appear directly under the parent directory.
    // This keeps the organic hierarchy while hiding old folder
    // names from the navigation tree.
    const flattenedChildren: KnowledgeTreeNode[] = []
    node.children.forEach((child) => {
      if (
        child.type === 'dir' &&
        (child.name === 'looms' || child.name === 'strands') &&
        child.children &&
        child.children.length > 0
      ) {
        flattenedChildren.push(...child.children)
      } else {
        flattenedChildren.push(child)
      }
    })

    node.children = flattenedChildren

    // Sort: directories first, then alphabetically
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    node.strandCount = subtotal
    return subtotal
  }

  tallyStrands(root)
  return root.children || []
}

/**
 * Parse YAML frontmatter from markdown content
 * @param content - Raw markdown content
 * @returns Parsed metadata object
 * 
 * @remarks
 * Simple YAML parser that handles basic key-value pairs.
 * For complex YAML, consider using a proper parser like `js-yaml`.
 * 
 * @example
 * ```ts
 * const md = `---
 * title: "Hello"
 * tags: [foo, bar]
 * ---
 * # Content`
 * 
 * parseWikiMetadata(md) // { title: "Hello", tags: "[foo, bar]" }
 * ```
 */
export function parseWikiMetadata(content: string): StrandMetadata {
  const lines = content.split('\n')
  const metadata: StrandMetadata = {}
  let inFrontmatter = false
  let frontmatterContent = ''

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true
      } else {
        // Parse YAML frontmatter
        try {
          const pairs = frontmatterContent.split('\n').filter(Boolean)
          pairs.forEach((pair) => {
            const colonIndex = pair.indexOf(':')
            if (colonIndex === -1) return

            const key = pair.slice(0, colonIndex).trim()
            const value = pair.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '')

            if (key && value) {
              metadata[key] = value
            }
          })
        } catch (e) {
          console.error('Error parsing frontmatter:', e)
        }
        break
      }
    } else if (inFrontmatter) {
      frontmatterContent += lines[i] + '\n'
    }
  }

  return metadata
}

/**
 * Strip YAML frontmatter from markdown content
 * @param content - Raw markdown content with frontmatter
 * @returns Markdown content without frontmatter
 * 
 * @example
 * ```ts
 * const md = `---
 * title: "Hello"
 * ---
 * # Content`
 * 
 * stripFrontmatter(md) // "# Content"
 * ```
 */
export function stripFrontmatter(content: string): string {
  if (!content) return ''
  const lines = content.split('\n')
  let inFrontmatter = false
  let frontmatterEnded = false
  let startIndex = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true
        startIndex = i
      } else {
        frontmatterEnded = true
        // Skip empty lines immediately after frontmatter
        let nextContentIndex = i + 1
        while (nextContentIndex < lines.length && !lines[nextContentIndex].trim()) {
          nextContentIndex++
        }
        // Return content starting from first non-empty line after frontmatter
        return lines.slice(nextContentIndex).join('\n')
      }
    }
  }

  // No frontmatter found, return original
  return content
}

/**
 * Parse YAML frontmatter from markdown content
 * Returns both the parsed metadata and the content without frontmatter
 * @param content - Markdown content with optional frontmatter
 * @returns Object with metadata and content
 *
 * @example
 * ```ts
 * const md = `---
 * title: "Hello World"
 * tags: [test, demo]
 * ---
 * # Content`
 *
 * const { metadata, content } = parseFrontmatter(md)
 * // metadata: { title: "Hello World", tags: ["test", "demo"] }
 * // content: "# Content"
 * ```
 */
export function parseFrontmatter(content: string): {
  metadata: Record<string, any>
  content: string
  hasFrontmatter: boolean
} {
  const lines = content.split('\n')
  let inFrontmatter = false
  let frontmatterLines: string[] = []
  let contentStartIndex = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFrontmatter && i === 0) {
        // Start of frontmatter (must be at beginning)
        inFrontmatter = true
      } else if (inFrontmatter) {
        // End of frontmatter
        // Skip empty lines after frontmatter
        contentStartIndex = i + 1
        while (contentStartIndex < lines.length && !lines[contentStartIndex].trim()) {
          contentStartIndex++
        }

        // Parse the frontmatter YAML
        const yamlContent = frontmatterLines.join('\n')
        let metadata: Record<string, any> = {}

        try {
          // Simple YAML parsing for common cases
          // For production, consider using a library like js-yaml
          metadata = parseSimpleYAML(yamlContent)
        } catch (error) {
          console.warn('Failed to parse frontmatter:', error)
        }

        return {
          metadata,
          content: lines.slice(contentStartIndex).join('\n'),
          hasFrontmatter: true,
        }
      }
    } else if (inFrontmatter) {
      frontmatterLines.push(lines[i])
    }
  }

  // No valid frontmatter found
  return {
    metadata: {},
    content,
    hasFrontmatter: false,
  }
}

/**
 * Simple YAML parser for common frontmatter patterns
 * Handles: strings, numbers, booleans, arrays
 * @param yaml - YAML string to parse
 * @returns Parsed object
 */
function parseSimpleYAML(yaml: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = yaml.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.substring(0, colonIndex).trim()
    let value = trimmed.substring(colonIndex + 1).trim()

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    // Parse arrays [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',').map(item => item.trim())
      result[key] = items.map(item => {
        // Remove quotes from array items
        if ((item.startsWith('"') && item.endsWith('"')) ||
            (item.startsWith("'") && item.endsWith("'"))) {
          return item.slice(1, -1)
        }
        return item
      })
      continue
    }

    // Parse booleans
    if (value === 'true') {
      result[key] = true
      continue
    }
    if (value === 'false') {
      result[key] = false
      continue
    }

    // Parse numbers
    if (!isNaN(Number(value)) && value !== '') {
      result[key] = Number(value)
      continue
    }

    // String value
    result[key] = value
  }

  return result
}

/**
 * Format a node name for display (remove extension, replace hyphens)
 * @param name - Raw filename or directory name
 * @returns Formatted display name
 * 
 * @example
 * ```ts
 * formatNodeName('intro-to-recursion.md') // "intro to recursion"
 * formatNodeName('machine-learning') // "machine learning"
 * ```
 */
export function formatNodeName(name: string): string {
  return name.replace(/\.(md|mdx)$/i, '').replace(/-/g, ' ')
}

/**
 * Rewrite relative image URLs to raw GitHub URLs
 * @param src - Original image src
 * @param repoOwner - Repository owner
 * @param repoName - Repository name
 * @param branch - Branch name
 * @returns Absolute GitHub raw URL
 * 
 * @example
 * ```ts
 * rewriteImageUrl('logos/codex.svg', 'framersai', 'codex', 'main')
 * // 'https://raw.githubusercontent.com/framersai/quarry/main/logos/codex.svg'
 * ```
 */
export function rewriteImageUrl(
  src: string,
  repoOwner: string,
  repoName: string,
  branch: string = 'main'
): string {
  if (!src || src.startsWith('http')) return src
  const base = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/`
  return base + src.replace(/^\//, '')
}

/**
 * Filter files based on search options
 * @param files - Array of files to filter
 * @param options - Search options
 * @param fileContents - Map of file paths to content (for full-text search)
 * @returns Filtered files
 */
export function filterFiles<T extends { name: string; path: string; type: 'file' | 'dir' }>(
  files: T[],
  options: SearchOptions,
  fileContents: Map<string, string> = new Map()
): T[] {
  if (!options.query) return files

  const rawQuery = options.query.trim()
  if (!rawQuery) return files

  const normalizedQuery = options.caseSensitive ? rawQuery : rawQuery.toLowerCase()
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean)

  // Very small synonym map for common technical terms.
  // This keeps search fully client-side and deterministic.
  const SYNONYMS: Record<string, string[]> = {
    ai: ['artificial intelligence'],
    llm: ['large language model', 'language model'],
    nlp: ['natural language processing'],
    kb: ['knowledge base', 'knowledge graph'],
    doc: ['docs', 'documentation'],
    tutorial: ['guide', 'how-to', 'walkthrough'],
    performance: ['latency', 'speed'],
    mobile: ['responsive', 'touch'],
  }

  const expandedTokens = new Set<string>(queryTokens)
  queryTokens.forEach((token) => {
    const synonyms = SYNONYMS[token]
    if (synonyms) {
      synonyms.forEach((syn) => {
        expandedTokens.add(options.caseSensitive ? syn : syn.toLowerCase())
      })
    }
  })

  /**
   * Simple Levenshtein distance for typo tolerance.
   * Optimized for short tokens (length <= 32).
   */
  const levenshtein = (a: string, b: string): number => {
    if (a === b) return 0
    if (!a.length) return b.length
    if (!b.length) return a.length

    const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1))

    for (let i = 0; i <= a.length; i++) dp[i][0] = i
    for (let j = 0; j <= b.length; j++) dp[0][j] = j

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost // substitution
        )
      }
    }

    return dp[a.length][b.length]
  }

  /**
   * Compute a relevance score for a file.
   * Higher scores are returned first.
   */
  const scored: Array<{ file: T; score: number }> = files.map((file) => {
    let score = 0

    const rawName = file.name
    const name = options.caseSensitive ? rawName : rawName.toLowerCase()
    const normalizedName = name.replace(/[-_]+/g, ' ')

    // Exact name query match
    if (options.searchNames && normalizedName.includes(normalizedQuery)) {
      score += 100
    }

    // Token + synonym matches against name
    if (options.searchNames) {
      const nameTokens = normalizedName.split(/\s+/).filter(Boolean)
      expandedTokens.forEach((token) => {
        nameTokens.forEach((word) => {
          if (word.includes(token)) {
            score += 20
          } else if (token.length >= 3 && word.length >= 3) {
            const distance = levenshtein(token, word)
            if (distance === 1) {
              score += 10 // very close typo
            } else if (distance === 2) {
              score += 5 // small typo
            }
          }
        })
      })
    }

    // Content-based scoring
    if (options.searchContent && file.type === 'file') {
      const content = fileContents.get(file.path)
      if (content) {
        const searchContent = options.caseSensitive ? content : content.toLowerCase()

        expandedTokens.forEach((token) => {
          if (searchContent.includes(token)) {
            score += 15
          }
        })

        // Bonus for exact phrase match
        if (searchContent.includes(normalizedQuery)) {
          score += 40
        }
      }
    }

    return { file, score }
  })

  // Filter out files with zero score and sort by relevance then name
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.file.name.localeCompare(b.file.name)
    })
    .map(({ file }) => file)
}

/**
 * Debounce a function call
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

