/**
 * MOC (Map of Content) Generator
 * @module lib/taxonomy/mocGenerator
 *
 * Auto-generates topic entry point pages from taxonomy data.
 * Creates MOC strands for subjects and topics based on strand relationships.
 */

import { getDatabase } from '@/lib/codexDatabase'
import { getTaxonomyIndex, type TaxonomyIndexEntry } from './taxonomyIndex'
import type { TaxonomyLevel } from './hierarchyConfig'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Generated MOC content structure
 */
export interface GeneratedMOC {
  /** MOC title */
  title: string
  /** Taxonomy term this MOC covers */
  term: string
  /** Level (subject or topic) */
  level: TaxonomyLevel
  /** Generated frontmatter */
  frontmatter: MOCFrontmatter
  /** Generated markdown content */
  content: string
  /** Strands included in this MOC */
  strands: MOCStrandInfo[]
  /** Suggested path for the MOC file */
  suggestedPath: string
}

/**
 * MOC frontmatter structure
 */
export interface MOCFrontmatter {
  id: string
  slug: string
  title: string
  summary: string
  strandType: 'moc'
  isMOC: true
  mocConfig: {
    topic: string
    scope: 'subject' | 'topic'
    autoUpdate: boolean
  }
  maturity: {
    status: 'evergreen'
    futureValue: 'core'
  }
  taxonomy: {
    subjects: string[]
    topics: string[]
  }
  publishing: {
    author: string
    created: string
    license: string
  }
}

/**
 * Strand info for MOC content
 */
export interface MOCStrandInfo {
  path: string
  title: string
  summary?: string
  maturityStatus?: string
  tags?: string[]
  relationType?: string
  relationContext?: string
}

/**
 * Options for MOC generation
 */
export interface MOCGeneratorOptions {
  /** Minimum strands required to generate MOC */
  minStrands?: number
  /** Maximum strands per section */
  maxStrandsPerSection?: number
  /** Include maturity info in MOC */
  includeMaturity?: boolean
  /** Include relationship context */
  includeRelationships?: boolean
  /** Author name for generated MOCs */
  authorName?: string
}

const DEFAULT_OPTIONS: Required<MOCGeneratorOptions> = {
  minStrands: 3,
  maxStrandsPerSection: 50,
  includeMaturity: true,
  includeRelationships: true,
  authorName: 'Frame.dev Community',
}

// ============================================================================
// MOC GENERATION
// ============================================================================

/**
 * Generate MOC for a specific taxonomy term
 */
export async function generateMOCForTerm(
  term: string,
  level: TaxonomyLevel,
  options: MOCGeneratorOptions = {}
): Promise<GeneratedMOC | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const db = await getDatabase()
  if (!db) return null

  // Get all strands with this term
  const strands = await getStrandsForTerm(db, term, level)
  
  if (strands.length < opts.minStrands) {
    return null // Not enough strands to warrant a MOC
  }

  // Get relationships for context
  const relationships = opts.includeRelationships 
    ? await getRelationshipsForStrands(db, strands.map(s => s.path))
    : []

  // Enrich strands with relationship context
  const enrichedStrands = enrichStrandsWithRelationships(strands, relationships)

  // Generate frontmatter
  const frontmatter = generateFrontmatter(term, level, strands, opts)

  // Generate content
  const content = generateContent(term, level, enrichedStrands, opts)

  // Generate slug and path
  const slug = term.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const suggestedPath = level === 'subject' 
    ? `mocs/${slug}-moc.md`
    : `mocs/topics/${slug}-moc.md`

  return {
    title: `${term} - Map of Content`,
    term,
    level,
    frontmatter,
    content,
    strands: enrichedStrands,
    suggestedPath,
  }
}

/**
 * Generate MOCs for all subjects
 */
export async function generateSubjectMOCs(
  options: MOCGeneratorOptions = {}
): Promise<GeneratedMOC[]> {
  const index = await getTaxonomyIndex()
  const mocs: GeneratedMOC[] = []

  for (const [_normalized, entry] of index.subjects) {
    const moc = await generateMOCForTerm(entry.originalTerm, 'subject', options)
    if (moc) {
      mocs.push(moc)
    }
  }

  return mocs
}

/**
 * Generate MOCs for all topics
 */
export async function generateTopicMOCs(
  options: MOCGeneratorOptions = {}
): Promise<GeneratedMOC[]> {
  const index = await getTaxonomyIndex()
  const mocs: GeneratedMOC[] = []

  for (const [_normalized, entry] of index.topics) {
    const moc = await generateMOCForTerm(entry.originalTerm, 'topic', options)
    if (moc) {
      mocs.push(moc)
    }
  }

  return mocs
}

/**
 * Generate MOCs for top N most-used terms
 */
export async function generateTopMOCs(
  topN: number = 20,
  options: MOCGeneratorOptions = {}
): Promise<GeneratedMOC[]> {
  const index = await getTaxonomyIndex()
  const mocs: GeneratedMOC[] = []

  // Get top subjects
  const topSubjects = Array.from(index.subjects.values())
    .sort((a, b) => b.documentCount - a.documentCount)
    .slice(0, topN)

  for (const entry of topSubjects) {
    const moc = await generateMOCForTerm(entry.originalTerm, 'subject', options)
    if (moc) {
      mocs.push(moc)
    }
  }

  // Get top topics
  const topTopics = Array.from(index.topics.values())
    .sort((a, b) => b.documentCount - a.documentCount)
    .slice(0, topN)

  for (const entry of topTopics) {
    const moc = await generateMOCForTerm(entry.originalTerm, 'topic', options)
    if (moc) {
      mocs.push(moc)
    }
  }

  return mocs
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get strands that use a specific taxonomy term
 */
async function getStrandsForTerm(
  db: Awaited<ReturnType<typeof getDatabase>>,
  term: string,
  level: TaxonomyLevel
): Promise<MOCStrandInfo[]> {
  if (!db) return []

  const termLower = term.toLowerCase()
  let query: string

  if (level === 'subject') {
    query = `
      SELECT path, title, summary, frontmatter, maturity_status
      FROM strands
      WHERE LOWER(subjects) LIKE ?
      ORDER BY title ASC
    `
  } else if (level === 'topic') {
    query = `
      SELECT path, title, summary, frontmatter, maturity_status
      FROM strands
      WHERE LOWER(topics) LIKE ?
      ORDER BY title ASC
    `
  } else {
    query = `
      SELECT path, title, summary, frontmatter, maturity_status
      FROM strands
      WHERE LOWER(tags) LIKE ?
      ORDER BY title ASC
    `
  }

  try {
    const rows = await db.all(query, [`%${termLower}%`]) as any[]
    
    return (rows || []).map(row => ({
      path: row.path,
      title: row.title || 'Untitled',
      summary: row.summary || undefined,
      maturityStatus: row.maturity_status || undefined,
      tags: row.frontmatter ? parseJsonField(row.frontmatter)?.tags : undefined,
    }))
  } catch (error) {
    console.error('[MOCGenerator] Failed to get strands for term:', error)
    return []
  }
}

/**
 * Get relationships between strands
 */
async function getRelationshipsForStrands(
  db: Awaited<ReturnType<typeof getDatabase>>,
  strandPaths: string[]
): Promise<Array<{
  sourceStrandPath: string
  targetStrandPath: string
  relationType: string
  context?: string
}>> {
  if (!db || strandPaths.length === 0) return []

  try {
    const placeholders = strandPaths.map(() => '?').join(',')
    const rows = await db.all(`
      SELECT source_strand_path, target_strand_path, relation_type, context
      FROM strand_relationships
      WHERE source_strand_path IN (${placeholders})
        OR target_strand_path IN (${placeholders})
    `, [...strandPaths, ...strandPaths]) as any[]

    return (rows || []).map(row => ({
      sourceStrandPath: row.source_strand_path,
      targetStrandPath: row.target_strand_path,
      relationType: row.relation_type,
      context: row.context || undefined,
    }))
  } catch (error) {
    console.error('[MOCGenerator] Failed to get relationships:', error)
    return []
  }
}

/**
 * Enrich strands with relationship context
 */
function enrichStrandsWithRelationships(
  strands: MOCStrandInfo[],
  relationships: Array<{
    sourceStrandPath: string
    targetStrandPath: string
    relationType: string
    context?: string
  }>
): MOCStrandInfo[] {
  const relationshipMap = new Map<string, { type: string; context?: string }>()

  for (const rel of relationships) {
    // Store relationship info for both source and target
    if (!relationshipMap.has(rel.sourceStrandPath)) {
      relationshipMap.set(rel.sourceStrandPath, { type: rel.relationType, context: rel.context })
    }
    if (!relationshipMap.has(rel.targetStrandPath)) {
      relationshipMap.set(rel.targetStrandPath, { type: rel.relationType, context: rel.context })
    }
  }

  return strands.map(strand => {
    const relInfo = relationshipMap.get(strand.path)
    return {
      ...strand,
      relationType: relInfo?.type,
      relationContext: relInfo?.context,
    }
  })
}

/**
 * Generate MOC frontmatter
 */
function generateFrontmatter(
  term: string,
  level: TaxonomyLevel,
  strands: MOCStrandInfo[],
  opts: Required<MOCGeneratorOptions>
): MOCFrontmatter {
  const slug = term.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const now = new Date().toISOString().split('T')[0]

  return {
    id: `moc-${slug}-${Date.now().toString(36)}`,
    slug: `${slug}-moc`,
    title: `${term} - Map of Content`,
    summary: `Entry point for all ${term} content. Organizes ${strands.length} strands for navigation and discovery.`,
    strandType: 'moc',
    isMOC: true,
    mocConfig: {
      topic: term,
      scope: level === 'subject' ? 'subject' : 'topic',
      autoUpdate: true,
    },
    maturity: {
      status: 'evergreen',
      futureValue: 'core',
    },
    taxonomy: {
      subjects: level === 'subject' ? [term] : [],
      topics: level === 'topic' ? [term] : [],
    },
    publishing: {
      author: opts.authorName,
      created: now,
      license: 'CC-BY-4.0',
    },
  }
}

/**
 * Generate MOC markdown content
 */
function generateContent(
  term: string,
  level: TaxonomyLevel,
  strands: MOCStrandInfo[],
  opts: Required<MOCGeneratorOptions>
): string {
  const lines: string[] = []

  lines.push(`# ${term}`)
  lines.push('')
  lines.push(`> This Map of Content organizes all strands related to **${term}**.`)
  lines.push('')

  // Group strands by maturity if enabled
  if (opts.includeMaturity) {
    const grouped = groupByMaturity(strands)
    
    if (grouped.evergreen.length > 0) {
      lines.push('## 🌲 Core Concepts (Evergreen)')
      lines.push('')
      for (const strand of grouped.evergreen.slice(0, opts.maxStrandsPerSection)) {
        lines.push(formatStrandLink(strand, opts.includeRelationships))
      }
      lines.push('')
    }

    if (grouped.permanent.length > 0) {
      lines.push('## 📚 Permanent Notes')
      lines.push('')
      for (const strand of grouped.permanent.slice(0, opts.maxStrandsPerSection)) {
        lines.push(formatStrandLink(strand, opts.includeRelationships))
      }
      lines.push('')
    }

    if (grouped.literature.length > 0) {
      lines.push('## 📖 Literature Notes')
      lines.push('')
      for (const strand of grouped.literature.slice(0, opts.maxStrandsPerSection)) {
        lines.push(formatStrandLink(strand, opts.includeRelationships))
      }
      lines.push('')
    }

    if (grouped.fleeting.length > 0) {
      lines.push('## ✏️ Fleeting Notes')
      lines.push('')
      for (const strand of grouped.fleeting.slice(0, opts.maxStrandsPerSection)) {
        lines.push(formatStrandLink(strand, opts.includeRelationships))
      }
      lines.push('')
    }

    if (grouped.uncategorized.length > 0) {
      lines.push('## 📝 All Related Notes')
      lines.push('')
      for (const strand of grouped.uncategorized.slice(0, opts.maxStrandsPerSection)) {
        lines.push(formatStrandLink(strand, opts.includeRelationships))
      }
      lines.push('')
    }
  } else {
    // Simple alphabetical list
    lines.push('## Related Strands')
    lines.push('')
    for (const strand of strands.slice(0, opts.maxStrandsPerSection)) {
      lines.push(formatStrandLink(strand, opts.includeRelationships))
    }
    lines.push('')
  }

  // Add navigation section
  lines.push('---')
  lines.push('')
  lines.push('*This MOC was auto-generated based on taxonomy data. It updates automatically when new strands are added.*')

  return lines.join('\n')
}

/**
 * Format a strand as a markdown link
 */
function formatStrandLink(strand: MOCStrandInfo, includeRelationships: boolean): string {
  let line = `- [[${strand.path}|${strand.title}]]`
  
  if (strand.summary) {
    line += ` - ${strand.summary.slice(0, 100)}${strand.summary.length > 100 ? '...' : ''}`
  }

  if (includeRelationships && strand.relationContext) {
    line += ` *(${strand.relationContext})*`
  }

  return line
}

/**
 * Group strands by maturity status
 */
function groupByMaturity(strands: MOCStrandInfo[]): {
  evergreen: MOCStrandInfo[]
  permanent: MOCStrandInfo[]
  literature: MOCStrandInfo[]
  fleeting: MOCStrandInfo[]
  uncategorized: MOCStrandInfo[]
} {
  const groups = {
    evergreen: [] as MOCStrandInfo[],
    permanent: [] as MOCStrandInfo[],
    literature: [] as MOCStrandInfo[],
    fleeting: [] as MOCStrandInfo[],
    uncategorized: [] as MOCStrandInfo[],
  }

  for (const strand of strands) {
    switch (strand.maturityStatus) {
      case 'evergreen':
        groups.evergreen.push(strand)
        break
      case 'permanent':
        groups.permanent.push(strand)
        break
      case 'literature':
        groups.literature.push(strand)
        break
      case 'fleeting':
        groups.fleeting.push(strand)
        break
      default:
        groups.uncategorized.push(strand)
    }
  }

  return groups
}

/**
 * Parse JSON field safely
 */
function parseJsonField(jsonStr: string): Record<string, any> | null {
  try {
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}


