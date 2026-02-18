#!/usr/bin/env npx tsx
/**
 * Full Index Rebuild Script
 * @script scripts/rebuild-full-index.ts
 *
 * Regenerates all indexes from scratch at deploy time.
 * Run: `npm run rebuild:index` or `npx tsx scripts/rebuild-full-index.ts`
 *
 * Regenerates:
 * - Vocabulary embeddings (via generate-vocabulary-embeddings.ts)
 * - Document classifications (subjects, topics, skills, difficulty)
 * - Supertag mappings (vocabulary → supertag associations)
 * - Search index (for semantic search)
 *
 * @module scripts/rebuild-full-index
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface DocumentIndex {
  path: string
  title: string
  summary: string
  subjects: string[]
  topics: string[]
  tags: string[]
  skills: string[]
  difficulty: string
  lastModified: string
}

interface SupertagMapping {
  term: string
  category: string
  suggestedSupertags: Array<{
    tagName: string
    confidence: number
    reason: string
  }>
}

interface RebuildResult {
  vocabularyEmbeddings: {
    success: boolean
    terms: number
    path: string
  }
  documentIndex: {
    success: boolean
    documents: number
    path: string
  }
  supertagMappings: {
    success: boolean
    mappings: number
    path: string
  }
  searchIndex: {
    success: boolean
    entries: number
    path: string
  }
  duration: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   VOCABULARY → SUPERTAG MAPPINGS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Mapping from vocabulary classification terms to suggested supertags
 */
const VOCABULARY_SUPERTAG_MAPPINGS: Record<string, string[]> = {
  // Subjects
  technology: ['project', 'article'],
  science: ['article', 'book', 'idea'],
  philosophy: ['idea', 'book', 'question'],
  ai: ['project', 'idea', 'article'],
  knowledge: ['book', 'article'],

  // Topics
  'getting-started': ['task'],
  architecture: ['project', 'decision'],
  troubleshooting: ['task', 'question'],
  performance: ['project', 'task'],
  security: ['decision', 'project'],

  // Difficulty
  beginner: ['habit'],
  intermediate: ['task', 'article'],
  advanced: ['project', 'article'],
}

function generateSupertagMapping(
  term: string,
  category: string
): SupertagMapping {
  const suggestedSupertags = VOCABULARY_SUPERTAG_MAPPINGS[term] || []

  return {
    term,
    category,
    suggestedSupertags: suggestedSupertags.map((tagName, index) => ({
      tagName,
      confidence: Math.max(0.5, 1 - index * 0.15),
      reason: `${category}: ${term}`,
    })),
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOCUMENT DISCOVERY
═══════════════════════════════════════════════════════════════════════════ */

interface DiscoveredDocument {
  path: string
  title: string
  content: string
  frontmatter: Record<string, unknown>
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  try {
    // Simple YAML parsing for common frontmatter fields
    const yamlContent = match[1]
    const frontmatter: Record<string, unknown> = {}

    for (const line of yamlContent.split('\n')) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim()
        let value: unknown = line.substring(colonIndex + 1).trim()

        // Handle arrays (simple format: [item1, item2])
        if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        }

        frontmatter[key] = value
      }
    }

    return { frontmatter, body: match[2] }
  } catch {
    return { frontmatter: {}, body: content }
  }
}

/**
 * Discover all markdown documents in content directories
 */
function discoverDocuments(
  baseDir: string,
  patterns: string[] = ['weaves', 'docs', 'blog']
): DiscoveredDocument[] {
  const documents: DiscoveredDocument[] = []

  for (const pattern of patterns) {
    const contentDir = path.join(baseDir, pattern)
    if (!fs.existsSync(contentDir)) {
      console.log(`  Skipping ${pattern} (not found)`)
      continue
    }

    const walkDir = (dir: string, relativePath = ''): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relPath = path.join(relativePath, entry.name)

        if (entry.isDirectory()) {
          walkDir(fullPath, relPath)
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const { frontmatter, body } = parseFrontmatter(content)

            // Extract title from frontmatter or first heading
            let title = frontmatter.title as string | undefined
            if (!title) {
              const headingMatch = body.match(/^#\s+(.+)$/m)
              title = headingMatch?.[1] || entry.name.replace(/\.mdx?$/, '')
            }

            documents.push({
              path: path.join(pattern, relPath),
              title,
              content: body.substring(0, 5000), // Limit for classification
              frontmatter,
            })
          } catch (err) {
            console.warn(`  Failed to read ${fullPath}:`, (err as Error).message)
          }
        }
      }
    }

    walkDir(contentDir)
    console.log(`  Found ${documents.filter(d => d.path.startsWith(pattern)).length} documents in ${pattern}`)
  }

  return documents
}

/* ═══════════════════════════════════════════════════════════════════════════
   CLASSIFICATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Simple summarization (first 200 chars of content)
 */
function generateSummary(content: string): string {
  // Remove markdown formatting
  const cleaned = content
    .replace(/#+\s/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()

  return cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : '')
}

/**
 * Simple keyword extraction from content
 */
function extractKeywords(content: string): string[] {
  // Common tech keywords to look for
  const techKeywords = [
    'api', 'react', 'typescript', 'javascript', 'python', 'database', 'sql',
    'docker', 'kubernetes', 'aws', 'cloud', 'machine-learning', 'ai', 'neural',
    'authentication', 'authorization', 'security', 'performance', 'optimization',
    'testing', 'deployment', 'ci/cd', 'git', 'architecture', 'design-pattern',
    'microservice', 'serverless', 'graphql', 'rest', 'websocket', 'cache',
  ]

  const contentLower = content.toLowerCase()
  const found = techKeywords.filter(kw => contentLower.includes(kw.replace('-', ' ')) || contentLower.includes(kw))

  return [...new Set(found)].slice(0, 10)
}

/**
 * Simple difficulty detection
 */
function detectDifficulty(content: string): string {
  const contentLower = content.toLowerCase()

  if (
    contentLower.includes('advanced') ||
    contentLower.includes('complex') ||
    contentLower.includes('optimization') ||
    contentLower.includes('internals')
  ) {
    return 'advanced'
  }

  if (
    contentLower.includes('beginner') ||
    contentLower.includes('introduction') ||
    contentLower.includes('getting started') ||
    contentLower.includes('tutorial')
  ) {
    return 'beginner'
  }

  return 'intermediate'
}

/**
 * Classify a document (simplified version for build-time)
 */
async function classifyDocument(doc: DiscoveredDocument): Promise<DocumentIndex> {
  const keywords = extractKeywords(doc.content)

  // Extract subjects from keywords
  const subjects: string[] = []
  if (keywords.some(k => ['react', 'typescript', 'javascript', 'python', 'api', 'database'].includes(k))) {
    subjects.push('technology')
  }
  if (keywords.some(k => ['machine-learning', 'ai', 'neural'].includes(k))) {
    subjects.push('ai')
  }

  // Extract topics
  const topics: string[] = []
  if (keywords.some(k => ['architecture', 'design-pattern', 'microservice'].includes(k))) {
    topics.push('architecture')
  }
  if (keywords.some(k => ['security', 'authentication', 'authorization'].includes(k))) {
    topics.push('security')
  }
  if (keywords.some(k => ['performance', 'optimization', 'cache'].includes(k))) {
    topics.push('performance')
  }

  // Skills are specific technologies
  const skills = keywords.filter(k =>
    ['react', 'typescript', 'javascript', 'python', 'docker', 'kubernetes', 'aws', 'graphql'].includes(k)
  )

  // Tags from frontmatter or keywords
  const frontmatterTags = Array.isArray(doc.frontmatter.tags)
    ? doc.frontmatter.tags
    : typeof doc.frontmatter.tags === 'string'
      ? [doc.frontmatter.tags]
      : []
  const tags = [...new Set([...frontmatterTags, ...keywords.slice(0, 5)])] as string[]

  return {
    path: doc.path,
    title: doc.title,
    summary: generateSummary(doc.content),
    subjects: subjects.length > 0 ? subjects : ['general'],
    topics: topics.length > 0 ? topics : ['general'],
    tags,
    skills,
    difficulty: detectDifficulty(doc.content),
    lastModified: new Date().toISOString(),
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH INDEX
═══════════════════════════════════════════════════════════════════════════ */

interface SearchIndexEntry {
  id: string
  path: string
  title: string
  summary: string
  subjects: string[]
  topics: string[]
  tags: string[]
  skills: string[]
  difficulty: string
  searchText: string
}

function buildSearchIndex(documents: DocumentIndex[]): SearchIndexEntry[] {
  return documents.map((doc, index) => ({
    id: `doc_${index}`,
    path: doc.path,
    title: doc.title,
    summary: doc.summary,
    subjects: doc.subjects,
    topics: doc.topics,
    tags: doc.tags,
    skills: doc.skills,
    difficulty: doc.difficulty,
    searchText: [
      doc.title,
      doc.summary,
      ...doc.subjects,
      ...doc.topics,
      ...doc.tags,
      ...doc.skills,
      doc.difficulty,
    ].join(' ').toLowerCase(),
  }))
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN REBUILD FUNCTION
═══════════════════════════════════════════════════════════════════════════ */

async function rebuildFullIndex(): Promise<RebuildResult> {
  console.log('═'.repeat(60))
  console.log('FULL INDEX REBUILD')
  console.log('═'.repeat(60))

  const startTime = Date.now()
  const outputDir = path.join(process.cwd(), 'public', 'data')

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const result: RebuildResult = {
    vocabularyEmbeddings: { success: false, terms: 0, path: '' },
    documentIndex: { success: false, documents: 0, path: '' },
    supertagMappings: { success: false, mappings: 0, path: '' },
    searchIndex: { success: false, entries: 0, path: '' },
    duration: 0,
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 1: Vocabulary Embeddings
  ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[1/4] Generating vocabulary embeddings...')
  try {
    execSync('npx tsx scripts/generate-vocabulary-embeddings.ts', {
      cwd: process.cwd(),
      stdio: 'inherit',
    })

    const embeddingsPath = path.join(outputDir, 'vocabulary-embeddings.json')
    if (fs.existsSync(embeddingsPath)) {
      const data = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'))
      result.vocabularyEmbeddings = {
        success: true,
        terms: data.stats?.totalTerms || 0,
        path: embeddingsPath,
      }
      console.log(`  ✓ Generated ${result.vocabularyEmbeddings.terms} vocabulary term embeddings`)
    }
  } catch (err) {
    console.error('  ✗ Failed to generate vocabulary embeddings:', (err as Error).message)
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 2: Document Classification
  ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[2/4] Classifying documents...')
  try {
    // Discover documents from multiple content directories
    const publicDir = path.join(process.cwd(), 'public', 'examples')
    const docsDir = path.join(process.cwd(), 'docs')
    const blogDir = path.join(process.cwd(), 'content')

    let allDocuments: DiscoveredDocument[] = []

    // Check public/examples for sample content
    if (fs.existsSync(publicDir)) {
      allDocuments = [...allDocuments, ...discoverDocuments(publicDir, ['weaves'])]
    }

    // Check docs folder
    if (fs.existsSync(docsDir)) {
      const docsFiles = discoverDocuments(docsDir, ['.'])
      allDocuments = [...allDocuments, ...docsFiles.map(d => ({ ...d, path: `docs/${d.path}` }))]
    }

    // Check content folder for blog
    if (fs.existsSync(blogDir)) {
      const blogFiles = discoverDocuments(blogDir, ['.'])
      allDocuments = [...allDocuments, ...blogFiles.map(d => ({ ...d, path: `blog/${d.path}` }))]
    }

    console.log(`  Found ${allDocuments.length} total documents`)

    // Classify each document
    const classifiedDocuments: DocumentIndex[] = []
    for (const doc of allDocuments) {
      const indexed = await classifyDocument(doc)
      classifiedDocuments.push(indexed)
    }

    // Write document index
    const documentIndexPath = path.join(outputDir, 'document-index.json')
    const documentIndexData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      documents: classifiedDocuments,
      stats: {
        total: classifiedDocuments.length,
        byDifficulty: {
          beginner: classifiedDocuments.filter(d => d.difficulty === 'beginner').length,
          intermediate: classifiedDocuments.filter(d => d.difficulty === 'intermediate').length,
          advanced: classifiedDocuments.filter(d => d.difficulty === 'advanced').length,
        },
      },
    }
    fs.writeFileSync(documentIndexPath, JSON.stringify(documentIndexData, null, 2))

    result.documentIndex = {
      success: true,
      documents: classifiedDocuments.length,
      path: documentIndexPath,
    }
    console.log(`  ✓ Classified ${result.documentIndex.documents} documents`)
  } catch (err) {
    console.error('  ✗ Failed to classify documents:', (err as Error).message)
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 3: Supertag Mappings
  ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[3/4] Generating supertag mappings...')
  try {
    const mappings: SupertagMapping[] = []

    // Generate mappings for all vocabulary terms
    const vocabularyTerms = Object.keys(VOCABULARY_SUPERTAG_MAPPINGS)
    for (const term of vocabularyTerms) {
      // Determine category
      let category = 'general'
      if (['technology', 'science', 'philosophy', 'ai', 'knowledge'].includes(term)) {
        category = 'subject'
      } else if (['getting-started', 'architecture', 'troubleshooting', 'performance', 'security'].includes(term)) {
        category = 'topic'
      } else if (['beginner', 'intermediate', 'advanced'].includes(term)) {
        category = 'difficulty'
      }

      mappings.push(generateSupertagMapping(term, category))
    }

    // Write supertag mappings
    const mappingsPath = path.join(outputDir, 'supertag-mappings.json')
    const mappingsData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      mappings,
      stats: {
        total: mappings.length,
        withSuggestions: mappings.filter(m => m.suggestedSupertags.length > 0).length,
      },
    }
    fs.writeFileSync(mappingsPath, JSON.stringify(mappingsData, null, 2))

    result.supertagMappings = {
      success: true,
      mappings: mappings.length,
      path: mappingsPath,
    }
    console.log(`  ✓ Generated ${result.supertagMappings.mappings} supertag mappings`)
  } catch (err) {
    console.error('  ✗ Failed to generate supertag mappings:', (err as Error).message)
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 4: Search Index
  ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[4/4] Building search index...')
  try {
    // Load document index
    const documentIndexPath = path.join(outputDir, 'document-index.json')
    if (fs.existsSync(documentIndexPath)) {
      const docData = JSON.parse(fs.readFileSync(documentIndexPath, 'utf-8'))
      const searchIndex = buildSearchIndex(docData.documents)

      // Write search index
      const searchIndexPath = path.join(outputDir, 'search-index.json')
      const searchIndexData = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        entries: searchIndex,
        stats: {
          total: searchIndex.length,
        },
      }
      fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndexData, null, 2))

      result.searchIndex = {
        success: true,
        entries: searchIndex.length,
        path: searchIndexPath,
      }
      console.log(`  ✓ Built search index with ${result.searchIndex.entries} entries`)
    }
  } catch (err) {
    console.error('  ✗ Failed to build search index:', (err as Error).message)
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Summary
  ───────────────────────────────────────────────────────────────────────── */
  result.duration = Date.now() - startTime

  console.log('\n' + '═'.repeat(60))
  console.log('REBUILD COMPLETE')
  console.log('═'.repeat(60))
  console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`)
  console.log('')
  console.log('Results:')
  console.log(`  Vocabulary: ${result.vocabularyEmbeddings.success ? '✓' : '✗'} ${result.vocabularyEmbeddings.terms} terms`)
  console.log(`  Documents:  ${result.documentIndex.success ? '✓' : '✗'} ${result.documentIndex.documents} classified`)
  console.log(`  Supertags:  ${result.supertagMappings.success ? '✓' : '✗'} ${result.supertagMappings.mappings} mappings`)
  console.log(`  Search:     ${result.searchIndex.success ? '✓' : '✗'} ${result.searchIndex.entries} entries`)
  console.log('')
  console.log('Output files:')
  if (result.vocabularyEmbeddings.path) console.log(`  ${result.vocabularyEmbeddings.path}`)
  if (result.documentIndex.path) console.log(`  ${result.documentIndex.path}`)
  if (result.supertagMappings.path) console.log(`  ${result.supertagMappings.path}`)
  if (result.searchIndex.path) console.log(`  ${result.searchIndex.path}`)

  return result
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENTRY POINT
═══════════════════════════════════════════════════════════════════════════ */

rebuildFullIndex()
  .then(result => {
    const allSuccess =
      result.vocabularyEmbeddings.success &&
      result.documentIndex.success &&
      result.supertagMappings.success &&
      result.searchIndex.success

    process.exit(allSuccess ? 0 : 1)
  })
  .catch(err => {
    console.error('Rebuild failed:', err)
    process.exit(1)
  })
