/**
 * Session Linking Service
 * @module lib/research/sessionLinking
 *
 * Provides functionality for linking research sessions together,
 * managing tags, merging sessions, and finding related sessions.
 */

import type { ResearchSession, SessionLink, SessionLinkType } from './types'
import { getSession, updateSession, getAllSessions, createSession } from './sessions'

// ============================================================================
// DATABASE ACCESS
// ============================================================================

const DB_NAME = 'quarry-research'
const DB_VERSION = 2
const LINKS_STORE_NAME = 'session-links'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })

  return dbPromise
}

function generateLinkId(): string {
  return `link_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// ============================================================================
// SESSION LINKS
// ============================================================================

/**
 * Create a link between two sessions
 */
export async function linkSessions(
  sourceSessionId: string,
  targetSessionId: string,
  linkType: SessionLinkType = 'related',
  description?: string
): Promise<SessionLink> {
  const db = await openDB()

  // Verify both sessions exist
  const [sourceSession, targetSession] = await Promise.all([
    getSession(sourceSessionId),
    getSession(targetSessionId),
  ])

  if (!sourceSession) {
    throw new Error(`Source session not found: ${sourceSessionId}`)
  }
  if (!targetSession) {
    throw new Error(`Target session not found: ${targetSessionId}`)
  }

  const link: SessionLink = {
    id: generateLinkId(),
    sourceSessionId,
    targetSessionId,
    linkType,
    description,
    createdAt: Date.now(),
  }

  // Store the link
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LINKS_STORE_NAME, 'readwrite')
    const store = tx.objectStore(LINKS_STORE_NAME)
    const request = store.add(link)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })

  // Update both sessions' linkedSessions arrays
  const sourceLinks = sourceSession.linkedSessions || []
  const targetLinks = targetSession.linkedSessions || []

  if (!sourceLinks.includes(targetSessionId)) {
    await updateSession(sourceSessionId, {
      linkedSessions: [...sourceLinks, targetSessionId],
    })
  }

  if (!targetLinks.includes(sourceSessionId)) {
    await updateSession(targetSessionId, {
      linkedSessions: [...targetLinks, sourceSessionId],
    })
  }

  // Dispatch event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('session-links-changed', {
        detail: { sourceSessionId, targetSessionId, linkType },
      })
    )
  }

  return link
}

/**
 * Remove a link between two sessions
 */
export async function unlinkSessions(
  sourceSessionId: string,
  targetSessionId: string
): Promise<boolean> {
  const db = await openDB()

  // Find and delete the link
  const links = await getSessionLinks(sourceSessionId)
  const linkToRemove = links.find(
    (l) =>
      (l.sourceSessionId === sourceSessionId && l.targetSessionId === targetSessionId) ||
      (l.sourceSessionId === targetSessionId && l.targetSessionId === sourceSessionId)
  )

  if (linkToRemove) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LINKS_STORE_NAME, 'readwrite')
      const store = tx.objectStore(LINKS_STORE_NAME)
      const request = store.delete(linkToRemove.id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Update both sessions
  const [sourceSession, targetSession] = await Promise.all([
    getSession(sourceSessionId),
    getSession(targetSessionId),
  ])

  if (sourceSession) {
    await updateSession(sourceSessionId, {
      linkedSessions: (sourceSession.linkedSessions || []).filter((id) => id !== targetSessionId),
    })
  }

  if (targetSession) {
    await updateSession(targetSessionId, {
      linkedSessions: (targetSession.linkedSessions || []).filter((id) => id !== sourceSessionId),
    })
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('session-links-changed', {
        detail: { sourceSessionId, targetSessionId, removed: true },
      })
    )
  }

  return true
}

/**
 * Get all links for a session
 */
export async function getSessionLinks(sessionId: string): Promise<SessionLink[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(LINKS_STORE_NAME, 'readonly')
    const store = tx.objectStore(LINKS_STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const allLinks = request.result as SessionLink[]
      const sessionLinks = allLinks.filter(
        (l) => l.sourceSessionId === sessionId || l.targetSessionId === sessionId
      )
      resolve(sessionLinks)
    }
  })
}

/**
 * Get linked sessions with their details
 */
export async function getLinkedSessionsWithDetails(
  sessionId: string
): Promise<Array<{ session: ResearchSession; link: SessionLink }>> {
  const links = await getSessionLinks(sessionId)
  const results: Array<{ session: ResearchSession; link: SessionLink }> = []

  for (const link of links) {
    const linkedId = link.sourceSessionId === sessionId ? link.targetSessionId : link.sourceSessionId
    const session = await getSession(linkedId)
    if (session) {
      results.push({ session, link })
    }
  }

  return results
}

// ============================================================================
// TAGS
// ============================================================================

/**
 * Add a tag to a session
 */
export async function addTagToSession(sessionId: string, tag: string): Promise<ResearchSession | null> {
  const session = await getSession(sessionId)
  if (!session) return null

  const normalizedTag = tag.toLowerCase().trim()
  const currentTags = session.tags || []

  if (currentTags.includes(normalizedTag)) {
    return session
  }

  return updateSession(sessionId, {
    tags: [...currentTags, normalizedTag],
  })
}

/**
 * Remove a tag from a session
 */
export async function removeTagFromSession(
  sessionId: string,
  tag: string
): Promise<ResearchSession | null> {
  const session = await getSession(sessionId)
  if (!session) return null

  const normalizedTag = tag.toLowerCase().trim()
  const currentTags = session.tags || []

  return updateSession(sessionId, {
    tags: currentTags.filter((t) => t !== normalizedTag),
  })
}

/**
 * Get all sessions with a specific tag
 */
export async function getSessionsByTag(tag: string): Promise<ResearchSession[]> {
  const allSessions = await getAllSessions()
  const normalizedTag = tag.toLowerCase().trim()

  return allSessions.filter((session) => session.tags?.includes(normalizedTag))
}

/**
 * Get all unique tags across all sessions
 */
export async function getAllTags(): Promise<Array<{ tag: string; count: number }>> {
  const allSessions = await getAllSessions()
  const tagCounts = new Map<string, number>()

  allSessions.forEach((session) => {
    session.tags?.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    })
  })

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Bulk update tags for a session
 */
export async function setSessionTags(
  sessionId: string,
  tags: string[]
): Promise<ResearchSession | null> {
  const normalizedTags = tags.map((t) => t.toLowerCase().trim()).filter(Boolean)
  const uniqueTags = [...new Set(normalizedTags)]

  return updateSession(sessionId, { tags: uniqueTags })
}

// ============================================================================
// MERGE SESSIONS
// ============================================================================

/**
 * Merge multiple sessions into a new session
 */
export async function mergeSessions(
  sessionIds: string[],
  options: {
    newTopic?: string
    keepOriginals?: boolean
    mergeTags?: boolean
  } = {}
): Promise<ResearchSession> {
  const { newTopic, keepOriginals = true, mergeTags = true } = options

  // Get all sessions
  const sessions = await Promise.all(sessionIds.map((id) => getSession(id)))
  const validSessions = sessions.filter((s): s is ResearchSession => s !== null)

  if (validSessions.length === 0) {
    throw new Error('No valid sessions to merge')
  }

  // Combine data from all sessions
  const allQueries = [...new Set(validSessions.flatMap((s) => s.queries))]
  const allTags = mergeTags ? [...new Set(validSessions.flatMap((s) => s.tags || []))] : []

  // Deduplicate saved results by ID
  const resultMap = new Map()
  validSessions.forEach((s) => {
    s.savedResults.forEach((r) => {
      if (!resultMap.has(r.id)) {
        resultMap.set(r.id, r)
      }
    })
  })
  const allResults = Array.from(resultMap.values())

  // Combine notes
  const allNotes = validSessions
    .filter((s) => s.notes.trim())
    .map((s) => `## From: ${s.topic}\n\n${s.notes}`)
    .join('\n\n---\n\n')

  // Create merged topic
  const mergedTopic = newTopic || validSessions.map((s) => s.topic).join(' + ')

  // Create the new merged session
  const mergedSession = await createSession(mergedTopic, {
    query: allQueries[0] || mergedTopic,
    tags: allTags,
  })

  // Update with combined data
  await updateSession(mergedSession.id, {
    queries: allQueries,
    savedResults: allResults,
    notes: allNotes,
    linkedSessions: sessionIds, // Link to original sessions
  })

  // Link original sessions to merged session
  for (const originalId of sessionIds) {
    await linkSessions(mergedSession.id, originalId, 'merged', 'Merged session')
  }

  // Dispatch event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sessions-merged', {
        detail: { mergedSessionId: mergedSession.id, originalSessionIds: sessionIds },
      })
    )
  }

  return (await getSession(mergedSession.id))!
}

// ============================================================================
// RELATED SESSIONS (SUGGESTIONS)
// ============================================================================

/**
 * Calculate word similarity between two strings
 */
function calculateWordSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  )
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  )

  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = new Set([...words1].filter((w) => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size // Jaccard similarity
}

/**
 * Suggest related sessions based on content similarity
 */
export async function suggestRelatedSessions(
  sessionId: string,
  maxSuggestions: number = 5
): Promise<Array<{ session: ResearchSession; score: number; reasons: string[] }>> {
  const session = await getSession(sessionId)
  if (!session) return []

  const allSessions = await getAllSessions()
  const otherSessions = allSessions.filter((s) => s.id !== sessionId)

  // Already linked sessions
  const linkedIds = new Set(session.linkedSessions || [])

  const suggestions: Array<{ session: ResearchSession; score: number; reasons: string[] }> = []

  for (const other of otherSessions) {
    if (linkedIds.has(other.id)) continue

    let score = 0
    const reasons: string[] = []

    // Topic similarity
    const topicSimilarity = calculateWordSimilarity(session.topic, other.topic)
    if (topicSimilarity > 0.2) {
      score += topicSimilarity * 0.3
      reasons.push('Similar topic')
    }

    // Query overlap
    const queryText1 = session.queries.join(' ')
    const queryText2 = other.queries.join(' ')
    const querySimilarity = calculateWordSimilarity(queryText1, queryText2)
    if (querySimilarity > 0.15) {
      score += querySimilarity * 0.3
      reasons.push('Similar queries')
    }

    // Tag overlap
    const tags1 = new Set(session.tags || [])
    const tags2 = new Set(other.tags || [])
    const tagOverlap = [...tags1].filter((t) => tags2.has(t))
    if (tagOverlap.length > 0) {
      score += (tagOverlap.length / Math.max(tags1.size, tags2.size, 1)) * 0.25
      reasons.push(`Shared tags: ${tagOverlap.join(', ')}`)
    }

    // Domain overlap in saved results
    const domains1 = new Set(session.savedResults.map((r) => r.domain))
    const domains2 = new Set(other.savedResults.map((r) => r.domain))
    const domainOverlap = [...domains1].filter((d) => domains2.has(d))
    if (domainOverlap.length > 0) {
      score += (domainOverlap.length / Math.max(domains1.size, domains2.size, 1)) * 0.15
      reasons.push('Shared sources')
    }

    // Temporal proximity (sessions created around the same time)
    const timeDiff = Math.abs(session.createdAt - other.createdAt)
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
    if (daysDiff < 7) {
      score += 0.05
      reasons.push('Created around same time')
    }

    if (score > 0.1 && reasons.length > 0) {
      suggestions.push({ session: other, score, reasons })
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, maxSuggestions)
}

/**
 * Get child sessions (sessions that branch from this one)
 */
export async function getChildSessions(sessionId: string): Promise<ResearchSession[]> {
  const allSessions = await getAllSessions()
  return allSessions.filter((s) => s.parentSessionId === sessionId)
}

/**
 * Get session lineage (parent chain)
 */
export async function getSessionLineage(sessionId: string): Promise<ResearchSession[]> {
  const lineage: ResearchSession[] = []
  let currentId = sessionId

  while (currentId) {
    const session = await getSession(currentId)
    if (!session) break

    lineage.push(session)
    currentId = session.parentSessionId || ''
  }

  return lineage.reverse() // Root first
}

/**
 * Create a branch session from an existing session
 */
export async function branchSession(
  parentSessionId: string,
  newTopic: string,
  options: {
    copyResults?: boolean
    copyTags?: boolean
  } = {}
): Promise<ResearchSession> {
  const { copyResults = false, copyTags = true } = options

  const parent = await getSession(parentSessionId)
  if (!parent) {
    throw new Error(`Parent session not found: ${parentSessionId}`)
  }

  const branchSession = await createSession(newTopic, {
    parentSessionId,
    tags: copyTags ? parent.tags : [],
  })

  if (copyResults && parent.savedResults.length > 0) {
    await updateSession(branchSession.id, {
      savedResults: [...parent.savedResults],
    })
  }

  // Link the branch to parent
  await linkSessions(branchSession.id, parentSessionId, 'subtopic', `Branched from: ${parent.topic}`)

  return (await getSession(branchSession.id))!
}
