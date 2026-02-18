/**
 * Connection Discovery - Automatically find relationships between strands
 * @module lib/collections/connectionDiscovery
 *
 * Discovers connections between strands based on:
 * - Shared tags
 * - Shared topics/subjects
 * - Same loom/weave hierarchy
 * - Backlinks (references in content)
 * - Explicit relationships in frontmatter
 */

import type { CollectionConnectionType, CollectionConnection } from '@/components/quarry/types'

/** Strand data for connection discovery */
export interface StrandForDiscovery {
  path: string
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  weaveSlug?: string
  loomSlug?: string
  relationships?: {
    references?: string[]
    prerequisites?: string[]
    seeAlso?: string[]
  }
  content?: string // For backlink discovery
}

/** Discovered connection result */
export interface DiscoveredConnection extends Omit<CollectionConnection, 'discovered'> {
  /** Why this connection was discovered */
  reason: string
  /** Shared items (tags, topics, etc.) */
  sharedItems?: string[]
}

/**
 * Discover connections between strands
 * Returns an array of discovered connections with types and reasoning
 */
export function discoverConnections(strands: StrandForDiscovery[]): DiscoveredConnection[] {
  const connections: DiscoveredConnection[] = []
  const seen = new Set<string>() // Prevent duplicates

  // Helper to add connection if not already added
  const addConnection = (conn: DiscoveredConnection) => {
    const key = `${conn.source}|${conn.target}|${conn.type}`
    const reverseKey = `${conn.target}|${conn.source}|${conn.type}`
    if (!seen.has(key) && !seen.has(reverseKey)) {
      seen.add(key)
      connections.push(conn)
    }
  }

  // Compare each pair of strands
  for (let i = 0; i < strands.length; i++) {
    for (let j = i + 1; j < strands.length; j++) {
      const a = strands[i]
      const b = strands[j]

      // 1. Shared tags
      const sharedTags = findSharedItems(a.tags, b.tags)
      if (sharedTags.length > 0) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'sharedTags',
          strength: Math.min(sharedTags.length / 3, 1), // Max strength at 3+ shared tags
          reason: `Shared tags: ${sharedTags.join(', ')}`,
          sharedItems: sharedTags,
        })
      }

      // 2. Shared topics
      const sharedTopics = findSharedItems(a.topics, b.topics)
      if (sharedTopics.length > 0) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'sharedTopics',
          strength: Math.min(sharedTopics.length / 2, 1), // Max strength at 2+ shared topics
          reason: `Shared topics: ${sharedTopics.join(', ')}`,
          sharedItems: sharedTopics,
        })
      }

      // 3. Shared subjects
      const sharedSubjects = findSharedItems(a.subjects, b.subjects)
      if (sharedSubjects.length > 0) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'sharedTopics', // Using sharedTopics for subjects too
          strength: Math.min(sharedSubjects.length / 2, 1),
          reason: `Shared subjects: ${sharedSubjects.join(', ')}`,
          sharedItems: sharedSubjects,
        })
      }

      // 4. Same loom
      if (a.loomSlug && a.loomSlug === b.loomSlug) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'sameLoom',
          strength: 0.6,
          reason: `Same loom: ${a.loomSlug}`,
        })
      }

      // 5. Same weave (weaker connection)
      if (a.weaveSlug && a.weaveSlug === b.weaveSlug && a.loomSlug !== b.loomSlug) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'sameWeave',
          strength: 0.3,
          reason: `Same weave: ${a.weaveSlug}`,
        })
      }

      // 6. Explicit references
      if (a.relationships?.references?.includes(b.path)) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'references',
          strength: 0.9,
          reason: 'Explicit reference in frontmatter',
        })
      }
      if (b.relationships?.references?.includes(a.path)) {
        addConnection({
          source: b.path,
          target: a.path,
          type: 'references',
          strength: 0.9,
          reason: 'Explicit reference in frontmatter',
        })
      }

      // 7. Prerequisites
      if (a.relationships?.prerequisites?.includes(b.path)) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'prerequisites',
          strength: 1.0,
          reason: 'Explicit prerequisite relationship',
        })
      }
      if (b.relationships?.prerequisites?.includes(a.path)) {
        addConnection({
          source: b.path,
          target: a.path,
          type: 'prerequisites',
          strength: 1.0,
          reason: 'Explicit prerequisite relationship',
        })
      }

      // 8. See also
      if (a.relationships?.seeAlso?.includes(b.path)) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'seeAlso',
          strength: 0.7,
          reason: 'Explicit see-also relationship',
        })
      }
      if (b.relationships?.seeAlso?.includes(a.path)) {
        addConnection({
          source: b.path,
          target: a.path,
          type: 'seeAlso',
          strength: 0.7,
          reason: 'Explicit see-also relationship',
        })
      }

      // 9. Backlinks in content
      if (a.content && a.content.includes(b.path)) {
        addConnection({
          source: a.path,
          target: b.path,
          type: 'backlink',
          strength: 0.8,
          reason: 'Referenced in content',
        })
      }
      if (b.content && b.content.includes(a.path)) {
        addConnection({
          source: b.path,
          target: a.path,
          type: 'backlink',
          strength: 0.8,
          reason: 'Referenced in content',
        })
      }
    }
  }

  // Sort by strength (strongest first)
  connections.sort((a, b) => (b.strength || 0) - (a.strength || 0))

  return connections
}

/**
 * Find items shared between two arrays
 */
function findSharedItems(a?: string[], b?: string[]): string[] {
  if (!a || !b || a.length === 0 || b.length === 0) {
    return []
  }
  const setB = new Set(b.map((s) => s.toLowerCase()))
  return a.filter((item) => setB.has(item.toLowerCase()))
}

/**
 * Analyze shared tags between all strands
 * Returns a map of tag -> strand paths that share it
 */
export function analyzeSharedTags(
  strands: StrandForDiscovery[]
): Map<string, string[]> {
  const tagMap = new Map<string, string[]>()

  for (const strand of strands) {
    if (strand.tags) {
      for (const tag of strand.tags) {
        const normalizedTag = tag.toLowerCase()
        const existing = tagMap.get(normalizedTag) || []
        existing.push(strand.path)
        tagMap.set(normalizedTag, existing)
      }
    }
  }

  // Filter to only tags shared by 2+ strands
  const sharedTags = new Map<string, string[]>()
  for (const [tag, paths] of tagMap) {
    if (paths.length >= 2) {
      sharedTags.set(tag, paths)
    }
  }

  return sharedTags
}

/**
 * Analyze shared topics between all strands
 * Returns a map of topic -> strand paths that share it
 */
export function analyzeSharedTopics(
  strands: StrandForDiscovery[]
): Map<string, string[]> {
  const topicMap = new Map<string, string[]>()

  for (const strand of strands) {
    const topics = [...(strand.topics || []), ...(strand.subjects || [])]
    for (const topic of topics) {
      const normalizedTopic = topic.toLowerCase()
      const existing = topicMap.get(normalizedTopic) || []
      existing.push(strand.path)
      topicMap.set(normalizedTopic, existing)
    }
  }

  // Filter to only topics shared by 2+ strands
  const sharedTopics = new Map<string, string[]>()
  for (const [topic, paths] of topicMap) {
    if (paths.length >= 2) {
      sharedTopics.set(topic, paths)
    }
  }

  return sharedTopics
}

/**
 * Convert discovered connections to CollectionConnection format
 */
export function toCollectionConnections(
  discovered: DiscoveredConnection[]
): CollectionConnection[] {
  return discovered.map((d) => ({
    source: d.source,
    target: d.target,
    type: d.type,
    discovered: true,
    strength: d.strength,
    label: d.reason,
  }))
}
