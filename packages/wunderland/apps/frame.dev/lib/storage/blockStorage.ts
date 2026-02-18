/**
 * Client-Side Block Storage
 * @module lib/storage/blockStorage
 *
 * Provides client-side storage for block tags when API routes
 * are not available (static export mode).
 *
 * Uses localStorage as primary storage with JSON serialization.
 */

import type { StrandBlock, SuggestedTag } from '@/lib/blockDatabase'

const STORAGE_KEY_PREFIX = 'quarry_blocks_'
const STORAGE_VERSION = 1

interface StoredBlockData {
  version: number
  blocks: StrandBlock[]
  lastUpdated: string
}

/**
 * Get the storage key for a strand path
 */
function getStorageKey(strandPath: string): string {
  // Normalize path and create a safe storage key
  const normalizedPath = strandPath.replace(/[^a-zA-Z0-9-_/]/g, '_')
  return `${STORAGE_KEY_PREFIX}${normalizedPath}`
}

/**
 * Get locally stored blocks for a strand
 */
export async function getLocalBlocks(strandPath: string): Promise<StrandBlock[]> {
  try {
    const key = getStorageKey(strandPath)
    const stored = localStorage.getItem(key)

    if (!stored) {
      return []
    }

    const data: StoredBlockData = JSON.parse(stored)

    // Version check for future migrations
    if (data.version !== STORAGE_VERSION) {
      console.warn('[blockStorage] Storage version mismatch, returning empty')
      return []
    }

    return data.blocks || []
  } catch (error) {
    console.warn('[blockStorage] Failed to load local blocks:', error)
    return []
  }
}

/**
 * Save blocks to local storage
 */
export async function saveLocalBlocks(
  strandPath: string,
  blocks: StrandBlock[]
): Promise<void> {
  try {
    const key = getStorageKey(strandPath)
    const data: StoredBlockData = {
      version: STORAGE_VERSION,
      blocks,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn('[blockStorage] Failed to save local blocks:', error)
  }
}

/**
 * Update a block's tags locally
 */
export async function updateLocalBlockTag(
  strandPath: string,
  blockId: string,
  action: 'accept' | 'reject' | 'add' | 'remove',
  tag: string
): Promise<StrandBlock[]> {
  const blocks = await getLocalBlocks(strandPath)

  const updatedBlocks = blocks.map((block) => {
    if (block.blockId !== blockId) return block

    const currentTags = block.tags || []
    const currentSuggestions = block.suggestedTags || []

    switch (action) {
      case 'accept':
        return {
          ...block,
          tags: currentTags.includes(tag)
            ? currentTags
            : [...currentTags, tag],
          suggestedTags: currentSuggestions.filter(
            (st: SuggestedTag) => st.tag !== tag
          ),
        }
      case 'reject':
        return {
          ...block,
          suggestedTags: currentSuggestions.filter(
            (st: SuggestedTag) => st.tag !== tag
          ),
        }
      case 'add':
        return {
          ...block,
          tags: currentTags.includes(tag)
            ? currentTags
            : [...currentTags, tag],
        }
      case 'remove':
        return {
          ...block,
          tags: currentTags.filter((t: string) => t !== tag),
        }
      default:
        return block
    }
  })

  await saveLocalBlocks(strandPath, updatedBlocks)
  return updatedBlocks
}

/**
 * Clear all locally stored blocks for a strand
 */
export async function clearLocalBlocks(strandPath: string): Promise<void> {
  try {
    const key = getStorageKey(strandPath)
    localStorage.removeItem(key)
  } catch (error) {
    console.warn('[blockStorage] Failed to clear local blocks:', error)
  }
}

/**
 * Get all strand paths that have locally stored blocks
 */
export function getLocalBlockStrandPaths(): string[] {
  const paths: string[] = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const path = key.substring(STORAGE_KEY_PREFIX.length)
        paths.push(path)
      }
    }
  } catch (error) {
    console.warn('[blockStorage] Failed to enumerate local blocks:', error)
  }

  return paths
}
