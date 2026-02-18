/**
 * Collections Module
 * @module lib/collections
 *
 * Provides collection management, connection discovery, cover generation, and utilities.
 */

export { useCollections } from './useCollections'
export type { CreateCollectionInput, UpdateCollectionInput, UseCollectionsReturn, CoverPatternType } from './useCollections'

export {
  FAVORITES_COLLECTION_ID,
  FAVORITES_COLLECTION_TITLE,
  DEFAULT_FAVORITES_COLLECTION,
  isSystemCollection,
  isSystemCollectionId,
} from './constants'

export { ensureFavoritesCollection, resetEnsureFavoritesState } from './ensureFavoritesCollection'

export { discoverConnections, analyzeSharedTags, analyzeSharedTopics } from './connectionDiscovery'
export type { DiscoveredConnection } from './connectionDiscovery'

export {
  generateCollectionCover,
  generateCollectionCoverDataUrl,
  generateDefaultCover,
  getPatternFromSeed,
  COVER_PATTERNS,
} from './coverGenerator'
export type { CoverPattern, CoverConfig } from './coverGenerator'
