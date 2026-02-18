/**
 * Collections Constants
 * @module lib/collections/constants
 *
 * System collection identifiers and default configurations.
 */

import type { CollectionMetadata } from '@/components/quarry/types'

// ============================================================================
// SYSTEM COLLECTION IDS
// ============================================================================

/** Favorites system collection ID */
export const FAVORITES_COLLECTION_ID = 'system-favorites'

/** Favorites collection title (cannot be renamed) */
export const FAVORITES_COLLECTION_TITLE = 'Favorites'

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default configuration for the Favorites system collection.
 * Created on first app launch.
 */
export const DEFAULT_FAVORITES_COLLECTION: Omit<CollectionMetadata, 'createdAt' | 'updatedAt'> = {
  id: FAVORITES_COLLECTION_ID,
  title: FAVORITES_COLLECTION_TITLE,
  description: 'Your favorite strands',
  icon: '⭐',
  color: '#facc15', // Yellow/gold star color
  strandPaths: [],
  viewMode: 'cards',
  isSystem: true,
  systemType: 'favorites',
  pinned: false,
  sortOrder: -1, // Sort before user collections
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a collection is a system collection
 */
export function isSystemCollection(collection: CollectionMetadata | null | undefined): boolean {
  return collection?.isSystem === true
}

/**
 * Check if a collection ID is a system collection ID
 */
export function isSystemCollectionId(id: string): boolean {
  return id === FAVORITES_COLLECTION_ID
}
