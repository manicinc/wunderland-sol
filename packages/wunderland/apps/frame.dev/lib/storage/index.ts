/**
 * Unified Storage Layer
 * @module lib/storage
 *
 * High-level storage abstraction supporting:
 * - Local SQLite/IndexedDB (via @framers/sql-storage-adapter)
 * - Browser localStorage fallback
 * - GitHub repository sync (future)
 *
 * @example
 * ```tsx
 * import { useStorage, useCollectionsStorage } from '@/lib/storage'
 *
 * function MyComponent() {
 *   const { ready, saveCollection } = useStorage()
 *   // or
 *   const { collections, createCollection } = useCollectionsStorage()
 * }
 * ```
 */

// Core types
export type {
    // Connection types
    ConnectionStatus,
    ConnectionType,
    BaseConnection,
    LocalConnection,
    GitHubConnection,
    PostgresConnection,
    DatabaseConnection,
    ConnectionTestResult,
    ConnectionManagerState,
    ConnectionManagerEvents,
    SyncStatus,
    SyncDevice,

    // Storable entities
    EntitySyncStatus,
    StorableEntity,
    StorableStrand,
    StorableCollection,
    StorableDraft,
    StorableBookmark,
    StorablePreferences,

    // Adapter interface
    StorageAdapter,

    // Sync types
    PendingChange,
    StorageSyncResult,
    SyncConflict,

    // Event types
    StorageEventType,
    StorageEvent,
    StorageEventListener,

    // Config
    LocalStorageConfig,
    GitHubRepoConfig,
} from './types'

// Helper functions
export {
    CONNECTION_DEFAULTS,
    createLocalConnection,
    createGitHubConnection,
    createPostgresConnection,
    buildPostgresConnectionString,
    parsePostgresConnectionString,
    getConnectionTypeLabel,
    getConnectionTypeIcon,
} from './types'

// Adapters
export { LocalStorageAdapter } from './adapters/LocalStorageAdapter'
export { BrowserCacheAdapter } from './adapters/BrowserCacheAdapter'
export { GitHubStorageAdapter } from './adapters/GitHubStorageAdapter'

// Storage Manager
export {
    StorageManager,
    getStorageManager,
    resetStorageManager,
    type StorageManagerConfig,
} from './StorageManager'

// React hooks
export {
    useStorage,
    useCollectionsStorage,
    type UseStorageState,
    type UseStorageResult,
} from './useStorage'
