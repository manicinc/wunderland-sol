/**
 * Tag Persistence Layer
 * @module lib/storage/tagPersistence
 *
 * Stores rejected tags so they don't reappear when blocks are reloaded
 * from the codex-blocks.json index. This handles the disconnect between
 * the NLP-generated tags and user preferences.
 *
 * Rejected tags are stored in localStorage with the strand path as key.
 */

const REJECTED_TAGS_KEY = 'quarry_rejected_tags'
const TAG_PERSISTENCE_VERSION = 1

export interface RejectedTag {
  tag: string
  blockId: string
  strandPath: string
  rejectedAt: string
  source?: 'suggested' | 'inline' | 'accepted'
}

interface RejectedTagsStore {
  version: number
  rejectedTags: RejectedTag[]
  lastUpdated: string
}

/**
 * Load the rejected tags store from localStorage
 */
function loadStore(): RejectedTagsStore {
  try {
    const stored = localStorage.getItem(REJECTED_TAGS_KEY)
    if (!stored) {
      return { version: TAG_PERSISTENCE_VERSION, rejectedTags: [], lastUpdated: new Date().toISOString() }
    }
    const data: RejectedTagsStore = JSON.parse(stored)
    if (data.version !== TAG_PERSISTENCE_VERSION) {
      // Migration could happen here
      console.warn('[tagPersistence] Version mismatch, resetting store')
      return { version: TAG_PERSISTENCE_VERSION, rejectedTags: [], lastUpdated: new Date().toISOString() }
    }
    return data
  } catch (error) {
    console.warn('[tagPersistence] Failed to load store:', error)
    return { version: TAG_PERSISTENCE_VERSION, rejectedTags: [], lastUpdated: new Date().toISOString() }
  }
}

/**
 * Save the rejected tags store to localStorage
 */
function saveStore(store: RejectedTagsStore): void {
  try {
    store.lastUpdated = new Date().toISOString()
    localStorage.setItem(REJECTED_TAGS_KEY, JSON.stringify(store))
  } catch (error) {
    console.warn('[tagPersistence] Failed to save store:', error)
  }
}

/**
 * Persist a rejected tag
 */
export async function persistRejectedTag(data: Omit<RejectedTag, 'rejectedAt'>): Promise<void> {
  const store = loadStore()

  // Check if already rejected
  const exists = store.rejectedTags.some(
    rt => rt.strandPath === data.strandPath &&
         rt.blockId === data.blockId &&
         rt.tag === data.tag
  )

  if (!exists) {
    store.rejectedTags.push({
      ...data,
      rejectedAt: new Date().toISOString(),
    })
    saveStore(store)
    console.log('[tagPersistence] Persisted rejected tag:', data.tag)
  }
}

/**
 * Get all rejected tags for a strand path
 */
export function getRejectedTags(strandPath: string): RejectedTag[] {
  const store = loadStore()
  return store.rejectedTags.filter(rt => rt.strandPath === strandPath)
}

/**
 * Get all rejected tags for a specific block
 */
export function getRejectedTagsForBlock(strandPath: string, blockId: string): RejectedTag[] {
  const store = loadStore()
  return store.rejectedTags.filter(
    rt => rt.strandPath === strandPath && rt.blockId === blockId
  )
}

/**
 * Check if a specific tag is rejected for a block
 */
export function isTagRejected(strandPath: string, blockId: string, tag: string): boolean {
  const store = loadStore()
  return store.rejectedTags.some(
    rt => rt.strandPath === strandPath &&
         rt.blockId === blockId &&
         rt.tag === tag
  )
}

/**
 * Check if a tag is rejected anywhere in a strand (for inline tags)
 */
export function isTagRejectedInStrand(strandPath: string, tag: string): boolean {
  const store = loadStore()
  return store.rejectedTags.some(
    rt => rt.strandPath === strandPath && rt.tag === tag
  )
}

/**
 * Remove a rejected tag (restore it)
 */
export async function removeRejectedTag(strandPath: string, blockId: string, tag: string): Promise<void> {
  const store = loadStore()
  store.rejectedTags = store.rejectedTags.filter(
    rt => !(rt.strandPath === strandPath && rt.blockId === blockId && rt.tag === tag)
  )
  saveStore(store)
  console.log('[tagPersistence] Removed rejected tag:', tag)
}

/**
 * Clear all rejected tags for a strand
 */
export async function clearRejectedTags(strandPath: string): Promise<void> {
  const store = loadStore()
  store.rejectedTags = store.rejectedTags.filter(rt => rt.strandPath !== strandPath)
  saveStore(store)
}

/**
 * Get counts of rejected tags per strand
 */
export function getRejectedTagStats(): Record<string, number> {
  const store = loadStore()
  const stats: Record<string, number> = {}
  for (const rt of store.rejectedTags) {
    stats[rt.strandPath] = (stats[rt.strandPath] || 0) + 1
  }
  return stats
}

/**
 * Export all rejected tags (for debugging or backup)
 */
export function exportRejectedTags(): RejectedTag[] {
  const store = loadStore()
  return store.rejectedTags
}
