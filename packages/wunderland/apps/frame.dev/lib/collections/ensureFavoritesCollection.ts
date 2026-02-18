/**
 * Ensure Favorites Collection Exists
 * @module lib/collections/ensureFavoritesCollection
 *
 * Seed function to create the default Favorites collection if it doesn't exist.
 * Called during initial load of useCollections.
 */

import { FAVORITES_COLLECTION_ID, DEFAULT_FAVORITES_COLLECTION } from './constants'

let ensurePromise: Promise<void> | null = null
let hasEnsured = false

/**
 * Ensure the Favorites collection exists, creating it if needed.
 * Uses singleton pattern to prevent duplicate API calls.
 */
export async function ensureFavoritesCollection(): Promise<void> {
  // Already completed
  if (hasEnsured) return

  // In progress - wait for existing promise
  if (ensurePromise) return ensurePromise

  ensurePromise = doEnsure()
  try {
    await ensurePromise
    hasEnsured = true
  } finally {
    ensurePromise = null
  }
}

/**
 * Internal implementation
 */
async function doEnsure(): Promise<void> {
  try {
    // Check if Favorites collection exists
    const response = await fetch(`/api/collections?id=${FAVORITES_COLLECTION_ID}`)

    if (response.status === 404) {
      // Create the Favorites collection
      const createResponse = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: FAVORITES_COLLECTION_ID,
          title: DEFAULT_FAVORITES_COLLECTION.title,
          description: DEFAULT_FAVORITES_COLLECTION.description,
          icon: DEFAULT_FAVORITES_COLLECTION.icon,
          color: DEFAULT_FAVORITES_COLLECTION.color,
          strandPaths: DEFAULT_FAVORITES_COLLECTION.strandPaths,
          viewMode: DEFAULT_FAVORITES_COLLECTION.viewMode,
          isSystem: DEFAULT_FAVORITES_COLLECTION.isSystem,
          systemType: DEFAULT_FAVORITES_COLLECTION.systemType,
          sortOrder: DEFAULT_FAVORITES_COLLECTION.sortOrder,
        }),
      })

      if (createResponse.status === 409) {
        // Already exists - race condition, but that's fine
      } else if (!createResponse.ok) {
        console.warn('[ensureFavoritesCollection] Failed to create Favorites collection:', createResponse.status)
      }
    } else if (!response.ok) {
      // Some other error - log but don't block
      console.warn('[ensureFavoritesCollection] Error checking Favorites collection:', response.status)
    }
    // If 200, collection exists - nothing to do
  } catch (error) {
    // Network error or similar - log but don't block app
    console.warn('[ensureFavoritesCollection] Error ensuring Favorites collection:', error)
  }
}

/**
 * Reset the ensure state (for testing)
 */
export function resetEnsureFavoritesState(): void {
  hasEnsured = false
  ensurePromise = null
}
