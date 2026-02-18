/**
 * Save Strand Metadata
 *
 * Multi-target save handler for metadata edits.
 * Supports saving to: local database, vault filesystem, and GitHub PR.
 *
 * @module lib/content/saveStrandMetadata
 */

import type { ContentSource, StrandMetadata } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface SaveOptions {
  /** Updated strand metadata */
  strand: StrandMetadata
  /** Original strand metadata (for diff/comparison) */
  originalStrand: StrandMetadata
  /** Original markdown content body (without frontmatter) */
  contentBody: string
  /** Full path to the strand file */
  strandPath: string
  /** Current content source configuration */
  contentSource: ContentSource
  /** Vault directory handle if in hybrid/vault mode */
  vaultHandle?: FileSystemDirectoryHandle
  /** GitHub configuration for PR creation */
  githubConfig?: {
    owner: string
    repo: string
    branch: string
    /** GitHub Personal Access Token */
    pat?: string
  }
}

export interface SaveResult {
  /** Where the metadata was successfully saved */
  savedTo: Array<'database' | 'vault' | 'github'>
  /** URL to the created PR (if GitHub save succeeded) */
  prUrl?: string
  /** Branch name if a PR was created */
  prBranch?: string
  /** Any errors that occurred during save */
  errors: Array<{ target: 'database' | 'vault' | 'github'; error: string }>
}

export interface SaveTarget {
  database: boolean
  vault: boolean
  github: boolean
}

// ============================================================================
// FRONTMATTER SERIALIZATION
// ============================================================================

/**
 * Serialize a value for YAML frontmatter
 */
function serializeValue(value: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent)

  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'string') {
    // Quote strings that contain special characters
    if (value.includes('\n') || value.includes(':') || value.includes('#') || value.includes('"') || value.includes("'")) {
      // Multi-line strings use literal style
      if (value.includes('\n')) {
        return `|\n${value.split('\n').map(line => spaces + '  ' + line).join('\n')}`
      }
      // Escape quotes
      return `"${value.replace(/"/g, '\\"')}"`
    }
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    // Simple arrays inline
    if (value.every(v => typeof v === 'string' && !v.includes(',') && !v.includes('\n'))) {
      return `[${value.map(v => `"${v}"`).join(', ')}]`
    }
    // Complex arrays block-style
    return value.map(v => `\n${spaces}- ${serializeValue(v, indent + 1)}`).join('')
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null)
    if (entries.length === 0) return '{}'
    return entries.map(([k, v]) => {
      const serialized = serializeValue(v, indent + 1)
      if (serialized.startsWith('\n') || serialized.startsWith('|')) {
        return `\n${spaces}${k}:${serialized}`
      }
      return `\n${spaces}${k}: ${serialized}`
    }).join('')
  }

  return String(value)
}

/**
 * Build markdown file content with frontmatter
 */
export function buildMarkdownWithFrontmatter(
  metadata: StrandMetadata,
  contentBody: string
): string {
  const lines: string[] = ['---']

  // Core fields
  if (metadata.id) lines.push(`id: "${metadata.id}"`)
  if (metadata.slug) lines.push(`slug: "${metadata.slug}"`)
  lines.push(`title: "${(metadata.title || '').replace(/"/g, '\\"')}"`)
  if (metadata.version) lines.push(`version: "${metadata.version}"`)

  // Summary
  if (metadata.summary) {
    lines.push(`summary: "${metadata.summary.replace(/"/g, '\\"')}"`)
  }

  // Tags
  if (metadata.tags) {
    const tagsArray = Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags]
    if (tagsArray.length > 0) {
      lines.push(`tags: [${tagsArray.map(t => `"${t}"`).join(', ')}]`)
    }
  }

  // Skills
  if (metadata.skills && metadata.skills.length > 0) {
    lines.push(`skills: [${metadata.skills.map(s => `"${s}"`).join(', ')}]`)
  }

  // Taxonomy
  if (metadata.taxonomy) {
    const hasSubjects = metadata.taxonomy.subjects && metadata.taxonomy.subjects.length > 0
    const hasTopics = metadata.taxonomy.topics && metadata.taxonomy.topics.length > 0
    if (hasSubjects || hasTopics) {
      lines.push('taxonomy:')
      if (hasSubjects) {
        lines.push(`  subjects: [${metadata.taxonomy.subjects!.map(s => `"${s}"`).join(', ')}]`)
      }
      if (hasTopics) {
        lines.push(`  topics: [${metadata.taxonomy.topics!.map(t => `"${t}"`).join(', ')}]`)
      }
    }
  }

  // Difficulty
  if (metadata.difficulty !== undefined) {
    if (typeof metadata.difficulty === 'object') {
      lines.push('difficulty:')
      const d = metadata.difficulty as { overall?: number; cognitive?: number; prerequisites?: number; conceptual?: number }
      if (d.overall !== undefined) lines.push(`  overall: ${d.overall}`)
      if (d.cognitive !== undefined) lines.push(`  cognitive: ${d.cognitive}`)
      if (d.prerequisites !== undefined) lines.push(`  prerequisites: ${d.prerequisites}`)
      if (d.conceptual !== undefined) lines.push(`  conceptual: ${d.conceptual}`)
    } else {
      lines.push(`difficulty: ${metadata.difficulty}`)
    }
  }

  // Content type
  if (metadata.contentType) {
    lines.push(`contentType: "${metadata.contentType}"`)
  }

  // Relationships - handle both object and array formats
  if (metadata.relationships) {
    // Check if it's an array (legacy format) or object (new format)
    if (Array.isArray(metadata.relationships)) {
      // Array format - convert to simpler form
      if (metadata.relationships.length > 0) {
        lines.push('relationships:')
        for (const rel of metadata.relationships) {
          lines.push(`  - type: "${rel.type}"`)
          lines.push(`    target: "${rel.target}"`)
        }
      }
    } else {
      // Object format with prerequisites, references, seeAlso
      const rels = metadata.relationships as { prerequisites?: string[]; references?: string[]; seeAlso?: string[] }
      const hasRelations = (
        (rels.prerequisites?.length ?? 0) > 0 ||
        (rels.references?.length ?? 0) > 0 ||
        (rels.seeAlso?.length ?? 0) > 0
      )
      if (hasRelations) {
        lines.push('relationships:')
        if (rels.prerequisites?.length) {
          lines.push(`  prerequisites: [${rels.prerequisites.map(p => `"${p}"`).join(', ')}]`)
        }
        if (rels.references?.length) {
          lines.push(`  references: [${rels.references.map(r => `"${r}"`).join(', ')}]`)
        }
        if (rels.seeAlso?.length) {
          lines.push(`  seeAlso: [${rels.seeAlso.map(s => `"${s}"`).join(', ')}]`)
        }
      }
    }
  }

  // Publishing
  if (metadata.publishing) {
    const hasPublishing = metadata.publishing.status || metadata.publishing.lastUpdated
    if (hasPublishing) {
      lines.push('publishing:')
      if (metadata.publishing.status) lines.push(`  status: "${metadata.publishing.status}"`)
      if (metadata.publishing.lastUpdated) lines.push(`  lastUpdated: "${metadata.publishing.lastUpdated}"`)
    }
  }

  // Notes
  if (metadata.notes) {
    if (Array.isArray(metadata.notes)) {
      if (metadata.notes.length > 0) {
        lines.push(`notes: [${metadata.notes.map(n => `"${n.replace(/"/g, '\\"')}"`).join(', ')}]`)
      }
    } else if (typeof metadata.notes === 'string' && metadata.notes.trim()) {
      lines.push(`notes: "${metadata.notes.replace(/"/g, '\\"')}"`)
    }
  }

  // SEO
  if (metadata.seo) {
    lines.push('seo:')
    if (metadata.seo.index !== undefined) lines.push(`  index: ${metadata.seo.index}`)
    if (metadata.seo.follow !== undefined) lines.push(`  follow: ${metadata.seo.follow}`)
    if (metadata.seo.metaDescription) lines.push(`  metaDescription: "${metadata.seo.metaDescription.replace(/"/g, '\\"')}"`)
    if (metadata.seo.canonicalUrl) lines.push(`  canonicalUrl: "${metadata.seo.canonicalUrl}"`)
  }

  // Reader settings
  if (metadata.readerSettings) {
    lines.push('readerSettings:')
    if (metadata.readerSettings.illustrationMode) {
      lines.push(`  illustrationMode: "${metadata.readerSettings.illustrationMode}"`)
    }
  }

  lines.push('---')
  lines.push('')
  lines.push(contentBody)

  return lines.join('\n')
}

// ============================================================================
// SAVE TARGETS HELPER
// ============================================================================

/**
 * Determine which save targets are available
 */
export function determineSaveTargets(
  contentSource: ContentSource,
  vaultHandle?: FileSystemDirectoryHandle,
  githubPat?: string
): SaveTarget {
  return {
    database: true, // Always save to local database
    vault: !!vaultHandle && (contentSource.type === 'sqlite' || contentSource.type === 'hybrid' || contentSource.type === 'filesystem'),
    github: contentSource.type === 'github' && !!githubPat,
  }
}

/**
 * Get human-readable description of save targets
 */
export function describeSaveTargets(targets: SaveTarget): string[] {
  const descriptions: string[] = []

  if (targets.database) {
    descriptions.push('Local Database (IndexedDB)')
  }
  if (targets.vault) {
    descriptions.push('Vault Folder (filesystem)')
  }
  if (targets.github) {
    descriptions.push('GitHub (Pull Request)')
  }

  return descriptions
}

// ============================================================================
// MAIN SAVE FUNCTION
// ============================================================================

/**
 * Save strand metadata to multiple targets
 *
 * @param options - Save configuration
 * @returns Result with success/error status per target
 */
export async function saveStrandMetadata(options: SaveOptions): Promise<SaveResult> {
  const {
    strand,
    originalStrand,
    contentBody,
    strandPath,
    contentSource,
    vaultHandle,
    githubConfig,
  } = options

  const result: SaveResult = {
    savedTo: [],
    errors: [],
  }

  // Determine which targets are available
  const targets = determineSaveTargets(contentSource, vaultHandle, githubConfig?.pat)

  // 1. Always save to local database
  if (targets.database) {
    try {
      const { updateStrandMetadata } = await import('./sqliteStore')
      await updateStrandMetadata(strandPath, strand, contentBody)
      result.savedTo.push('database')
      console.log('[saveStrandMetadata] Saved to database:', strandPath)
    } catch (error) {
      console.error('[saveStrandMetadata] Database save failed:', error)
      result.errors.push({
        target: 'database',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // 2. Save to vault if available
  if (targets.vault && vaultHandle) {
    try {
      const { writeVaultFile } = await import('../vault')
      const markdownContent = buildMarkdownWithFrontmatter(strand, contentBody)

      // Convert strand path to vault-relative path
      // e.g., "weaves/ai/looms/ml/strands/intro.md" stays the same
      await writeVaultFile(vaultHandle, strandPath, markdownContent)
      result.savedTo.push('vault')
      console.log('[saveStrandMetadata] Saved to vault:', strandPath)
    } catch (error) {
      console.error('[saveStrandMetadata] Vault save failed:', error)
      result.errors.push({
        target: 'vault',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // 3. Create GitHub PR if in GitHub mode with PAT
  if (targets.github && githubConfig?.pat) {
    try {
      const { createMetadataPR } = await import('../github/createMetadataPR')
      const prResult = await createMetadataPR({
        path: strandPath,
        oldMetadata: originalStrand,
        newMetadata: strand,
        contentBody,
        config: {
          owner: githubConfig.owner,
          repo: githubConfig.repo,
          branch: githubConfig.branch,
          pat: githubConfig.pat,
        },
      })

      result.savedTo.push('github')
      result.prUrl = prResult.prUrl
      result.prBranch = prResult.branch
      console.log('[saveStrandMetadata] Created GitHub PR:', prResult.prUrl)
    } catch (error) {
      console.error('[saveStrandMetadata] GitHub PR creation failed:', error)
      result.errors.push({
        target: 'github',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return result
}

// ============================================================================
// METADATA DIFF HELPER
// ============================================================================

/**
 * Generate a summary of what changed between old and new metadata
 */
export function generateMetadataDiff(
  oldMetadata: StrandMetadata,
  newMetadata: StrandMetadata
): string[] {
  const changes: string[] = []

  if (oldMetadata.title !== newMetadata.title) {
    changes.push(`Title: "${oldMetadata.title}" → "${newMetadata.title}"`)
  }

  if (oldMetadata.summary !== newMetadata.summary) {
    changes.push('Summary updated')
  }

  const getTagsString = (tags: string | string[] | undefined): string => {
    if (!tags) return ''
    return Array.isArray(tags) ? tags.join(', ') : tags
  }
  const oldTags = getTagsString(oldMetadata.tags)
  const newTags = getTagsString(newMetadata.tags)
  if (oldTags !== newTags) {
    changes.push(`Tags: [${oldTags}] → [${newTags}]`)
  }

  const oldSubjects = (oldMetadata.taxonomy?.subjects || []).join(', ')
  const newSubjects = (newMetadata.taxonomy?.subjects || []).join(', ')
  if (oldSubjects !== newSubjects) {
    changes.push(`Subjects: [${oldSubjects}] → [${newSubjects}]`)
  }

  const oldTopics = (oldMetadata.taxonomy?.topics || []).join(', ')
  const newTopics = (newMetadata.taxonomy?.topics || []).join(', ')
  if (oldTopics !== newTopics) {
    changes.push(`Topics: [${oldTopics}] → [${newTopics}]`)
  }

  const oldDiff = typeof oldMetadata.difficulty === 'object'
    ? (oldMetadata.difficulty as { overall?: number }).overall
    : oldMetadata.difficulty
  const newDiff = typeof newMetadata.difficulty === 'object'
    ? (newMetadata.difficulty as { overall?: number }).overall
    : newMetadata.difficulty
  if (oldDiff !== newDiff) {
    changes.push(`Difficulty: ${oldDiff ?? 'unset'} → ${newDiff ?? 'unset'}`)
  }

  const oldStatus = oldMetadata.publishing?.status
  const newStatus = newMetadata.publishing?.status
  if (oldStatus !== newStatus) {
    changes.push(`Status: ${oldStatus ?? 'unset'} → ${newStatus ?? 'unset'}`)
  }

  if (changes.length === 0) {
    changes.push('No significant changes detected')
  }

  return changes
}
