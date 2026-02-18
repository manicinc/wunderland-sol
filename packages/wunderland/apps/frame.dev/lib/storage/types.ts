/**
 * Database Connection Types
 * @module lib/storage/types
 *
 * Unified connection configuration types for all storage backends:
 * - Local vault (SQLite via sql-storage-adapter)
 * - GitHub repository
 * - Remote PostgreSQL
 *
 * Uses @framers/sql-storage-adapter for database operations.
 */

// ============================================================================
// BASE CONNECTION TYPES
// ============================================================================

/**
 * Connection status enum
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'syncing'

/**
 * Connection type discriminator
 */
export type ConnectionType = 'local' | 'github' | 'postgres'

/**
 * Base connection interface shared by all backends
 */
export interface BaseConnection {
  /** Unique identifier for this connection */
  id: string
  /** User-friendly name for the connection */
  name: string
  /** Type discriminator */
  type: ConnectionType
  /** Whether this is the currently active connection */
  isActive: boolean
  /** Current connection status */
  status: ConnectionStatus
  /** Last successful connection timestamp */
  lastConnected?: string
  /** Last error message if status is 'error' */
  lastError?: string
  /** Creation timestamp */
  createdAt: string
  /** Last modification timestamp */
  updatedAt: string
}

// ============================================================================
// LOCAL VAULT CONNECTION
// ============================================================================

/**
 * Local vault connection (SQLite + filesystem)
 *
 * In Electron: Uses better-sqlite3 or sql.js with IPC file access
 * In Browser: Uses IndexedDB adapter with sql.js
 */
export interface LocalConnection extends BaseConnection {
  type: 'local'
  /** Absolute path to vault directory (e.g., ~/Documents/Quarry) */
  vaultPath: string
  /** Vault name from vault.json config */
  vaultName?: string
  /** Whether vault is Electron-managed (auto-initialized) */
  isElectronVault?: boolean
  /** Storage adapter type being used */
  adapterType?: 'electron' | 'indexeddb' | 'sqljs' | 'better-sqlite3'
}

// ============================================================================
// GITHUB CONNECTION
// ============================================================================

/**
 * GitHub repository connection
 */
export interface GitHubConnection extends BaseConnection {
  type: 'github'
  /** GitHub repository owner (user or org) */
  owner: string
  /** Repository name */
  repo: string
  /** Branch to use (default: main) */
  branch: string
  /** Base path within repo for content (e.g., 'docs' or empty for root) */
  basePath?: string
  /** Personal Access Token (stored encrypted) */
  patEncrypted?: string
  /** Last known commit SHA */
  lastCommitSha?: string
  /** Whether PAT is configured */
  hasToken: boolean
}

// ============================================================================
// POSTGRESQL CONNECTION
// ============================================================================

/**
 * PostgreSQL database connection
 *
 * Uses @framers/sql-storage-adapter postgres adapter
 */
export interface PostgresConnection extends BaseConnection {
  type: 'postgres'
  /** Database host */
  host: string
  /** Database port (default: 5432) */
  port: number
  /** Database name */
  database: string
  /** Database username */
  username: string
  /** Password (stored encrypted, never in plain text) */
  passwordEncrypted?: string
  /** Whether password is configured */
  hasPassword: boolean
  /** Enable SSL connection */
  ssl: boolean
  /** SSL mode (disable, require, verify-ca, verify-full) */
  sslMode?: 'disable' | 'require' | 'verify-ca' | 'verify-full'
  /** Connection string (alternative to individual fields) */
  connectionString?: string
  /** Schema to use (default: public) */
  schema?: string
  /** Connection pool size (default: 10) */
  poolSize?: number
  /** Connection timeout in milliseconds */
  connectionTimeout?: number
}

// ============================================================================
// UNION TYPE
// ============================================================================

/**
 * Any database connection type
 */
export type DatabaseConnection = LocalConnection | GitHubConnection | PostgresConnection

// ============================================================================
// CONNECTION MANAGER TYPES
// ============================================================================

/**
 * Result of a connection test
 */
export interface ConnectionTestResult {
  success: boolean
  message: string
  latencyMs?: number
  version?: string
  details?: Record<string, unknown>
}

/**
 * Connection manager state
 */
export interface ConnectionManagerState {
  /** All saved connections */
  connections: DatabaseConnection[]
  /** Currently active connection ID */
  activeConnectionId: string | null
  /** Whether manager is initialized */
  isInitialized: boolean
  /** Whether a connection operation is in progress */
  isLoading: boolean
  /** Current error, if any */
  error: string | null
}

/**
 * Events emitted by connection manager
 */
export interface ConnectionManagerEvents {
  'connection:added': { connection: DatabaseConnection }
  'connection:updated': { connection: DatabaseConnection }
  'connection:removed': { connectionId: string }
  'connection:activated': { connection: DatabaseConnection }
  'connection:deactivated': { connectionId: string }
  'connection:status-changed': { connectionId: string; status: ConnectionStatus }
  'connection:error': { connectionId: string; error: string }
}

// ============================================================================
// SYNC TYPES
// ============================================================================

/**
 * Sync status for a connection
 */
export interface SyncStatus {
  /** Connection ID this status belongs to */
  connectionId: string
  /** Whether sync is currently in progress */
  isSyncing: boolean
  /** Last successful sync timestamp */
  lastSync?: string
  /** Number of pending local changes */
  pendingChanges: number
  /** Number of conflicts needing resolution */
  conflictCount: number
  /** Current sync progress (0-100) */
  progress?: number
  /** Current sync operation message */
  message?: string
}

/**
 * Device in the sync registry
 */
export interface SyncDevice {
  /** Unique device ID */
  id: string
  /** Device name */
  name: string
  /** Device type */
  type: 'electron' | 'web' | 'mobile' | 'unknown'
  /** Platform (darwin, win32, linux, ios, android, web) */
  platform: string
  /** Last seen timestamp */
  lastSeen: string
  /** Whether device is currently online */
  isOnline: boolean
  /** App version on this device */
  appVersion?: string
}

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

/**
 * GitHub repository configuration for storage
 * Simplified version of GitHubConnection for use in StorageManager
 */
export interface GitHubRepoConfig {
  /** Repository owner (user or org) */
  owner: string
  /** Repository name */
  repo: string
  /** Branch to sync with */
  branch: string
  /** Personal Access Token (optional for public repos) */
  pat?: string
  /** Base path within repo for content */
  basePath?: string
}

/**
 * Local storage configuration
 */
export interface LocalStorageConfig {
  /** Database name for IndexedDB */
  dbName?: string
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number
  /** Performance tier */
  performanceTier?: 'fast' | 'balanced' | 'accurate' | 'efficient'
}

// ============================================================================
// CONFIGURATION DEFAULTS
// ============================================================================

/**
 * Default values for new connections
 */
export const CONNECTION_DEFAULTS = {
  local: {
    vaultPath: '~/Documents/Quarry',
    adapterType: 'indexeddb' as const,
  },
  github: {
    branch: 'main',
    basePath: '',
  },
  postgres: {
    port: 5432,
    ssl: true,
    sslMode: 'require' as const,
    schema: 'public',
    poolSize: 10,
    connectionTimeout: 30000,
  },
} as const


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new local connection with defaults
 */
export function createLocalConnection(
  partial: Partial<LocalConnection> & { id: string; name: string; vaultPath: string }
): LocalConnection {
  const now = new Date().toISOString()
  return {
    type: 'local',
    isActive: false,
    status: 'disconnected',
    createdAt: now,
    updatedAt: now,
    adapterType: CONNECTION_DEFAULTS.local.adapterType,
    ...partial,
  }
}

/**
 * Create a new GitHub connection with defaults
 */
export function createGitHubConnection(
  partial: Partial<GitHubConnection> & { id: string; name: string; owner: string; repo: string }
): GitHubConnection {
  const now = new Date().toISOString()
  return {
    type: 'github',
    isActive: false,
    status: 'disconnected',
    createdAt: now,
    updatedAt: now,
    branch: CONNECTION_DEFAULTS.github.branch,
    basePath: CONNECTION_DEFAULTS.github.basePath,
    hasToken: false,
    ...partial,
  }
}

/**
 * Create a new Postgres connection with defaults
 */
export function createPostgresConnection(
  partial: Partial<PostgresConnection> & { id: string; name: string; host: string; database: string; username: string }
): PostgresConnection {
  const now = new Date().toISOString()
  return {
    type: 'postgres',
    isActive: false,
    status: 'disconnected',
    createdAt: now,
    updatedAt: now,
    port: CONNECTION_DEFAULTS.postgres.port,
    ssl: CONNECTION_DEFAULTS.postgres.ssl,
    sslMode: CONNECTION_DEFAULTS.postgres.sslMode,
    schema: CONNECTION_DEFAULTS.postgres.schema,
    poolSize: CONNECTION_DEFAULTS.postgres.poolSize,
    connectionTimeout: CONNECTION_DEFAULTS.postgres.connectionTimeout,
    hasPassword: false,
    ...partial,
  }
}

/**
 * Build a PostgreSQL connection string from connection config
 */
export function buildPostgresConnectionString(config: PostgresConnection, password?: string): string {
  const { host, port, database, username, ssl } = config
  const sslParam = ssl ? '?sslmode=require' : ''
  const passwordPart = password ? `:${encodeURIComponent(password)}` : ''
  return `postgresql://${encodeURIComponent(username)}${passwordPart}@${host}:${port}/${database}${sslParam}`
}

/**
 * Parse a PostgreSQL connection string into config fields
 */
export function parsePostgresConnectionString(connectionString: string): Partial<PostgresConnection> | null {
  try {
    const url = new URL(connectionString)
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      return null
    }
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading /
      username: decodeURIComponent(url.username),
      ssl: url.searchParams.get('sslmode') !== 'disable',
      sslMode: (url.searchParams.get('sslmode') as PostgresConnection['sslMode']) || 'require',
    }
  } catch {
    return null
  }
}

/**
 * Get display label for connection type
 */
export function getConnectionTypeLabel(type: ConnectionType): string {
  switch (type) {
    case 'local':
      return 'Local Vault'
    case 'github':
      return 'GitHub'
    case 'postgres':
      return 'PostgreSQL'
  }
}

/**
 * Get icon name for connection type (Lucide icon)
 */
export function getConnectionTypeIcon(type: ConnectionType): string {
  switch (type) {
    case 'local':
      return 'HardDrive'
    case 'github':
      return 'Github'
    case 'postgres':
      return 'Database'
  }
}

// ============================================================================
// STORABLE ENTITIES
// ============================================================================

/**
 * Storage sync status for entities
 */
export type EntitySyncStatus = 'synced' | 'pending' | 'conflict' | 'local-only'

/**
 * Base interface for all storable entities
 */
export interface StorableEntity {
  /** Unique identifier */
  id: string
  /** Entity type discriminator */
  type: string
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string
  /** Sync status with remote */
  syncStatus: EntitySyncStatus
  /** Content hash for conflict detection (SHA-256) */
  contentHash?: string
  /** Version for optimistic locking */
  version?: number
}

/**
 * Strand entity (content item)
 */
export interface StorableStrand extends StorableEntity {
  type: 'strand'
  /** Content path (e.g., 'wiki/getting-started/intro') */
  path: string
  /** URL-friendly slug */
  slug: string
  /** Display title */
  title: string
  /** Markdown content */
  content: string
  /** Parsed frontmatter */
  frontmatter: Record<string, unknown>
  /** Parent weave slug */
  weave: string
  /** Parent loom slug (optional) */
  loom?: string
  /** Word count */
  wordCount?: number
  /** AI-generated summary */
  summary?: string
  /** GitHub URL for synced strands */
  githubUrl?: string
  /** GitHub SHA for version tracking */
  githubSha?: string
}

/**
 * Collection entity (curated strand groups)
 */
export interface StorableCollection extends StorableEntity {
  type: 'collection'
  /** Collection title */
  title: string
  /** Optional description */
  description?: string
  /** Emoji or icon identifier */
  icon?: string
  /** Theme color (hex) */
  color?: string
  /** Ordered list of strand paths */
  strandPaths: string[]
  /** View mode preference */
  viewMode?: 'cards' | 'grid' | 'timeline' | 'graph' | 'freeform'
  /** Whether collection is pinned */
  pinned?: boolean
  /** Sort order for pinned collections */
  sortOrder?: number
  /** Custom strand positions (for drag-drop reordering) */
  positions?: Record<string, { x: number; y: number }>
}

/**
 * Draft entity (unpublished content)
 */
export interface StorableDraft extends StorableEntity {
  type: 'draft'
  /** Path if editing existing strand, undefined if new */
  strandPath?: string
  /** Draft title */
  title: string
  /** Draft content (Markdown) */
  content: string
  /** Draft frontmatter */
  frontmatter: Record<string, unknown>
  /** Whether this is a new strand or edit */
  isNew: boolean
  /** Target weave for new strands */
  targetWeave?: string
  /** Target loom for new strands */
  targetLoom?: string
  /** Parent version hash (for merge detection) */
  parentVersion?: string
  /** Auto-save timestamp */
  lastAutoSave?: string
}

/**
 * Bookmark entity
 */
export interface StorableBookmark extends StorableEntity {
  type: 'bookmark'
  /** Bookmarked strand path */
  strandPath: string
  /** Optional note */
  note?: string
  /** Tags for organization */
  tags?: string[]
  /** Scroll position when bookmarked */
  scrollPosition?: number
}

/**
 * User preference settings
 */
export interface StorablePreferences extends StorableEntity {
  type: 'preferences'
  /** Theme preference */
  theme?: string
  /** Sidebar collapsed state */
  sidebarCollapsed?: boolean
  /** Right panel collapsed state */
  rightPanelCollapsed?: boolean
  /** Font size preference */
  fontSize?: number
  /** Last visited strand */
  lastStrandPath?: string
  /** Recently viewed strands */
  recentStrands?: string[]
  /** Custom settings map */
  custom?: Record<string, unknown>
}

/**
 * Block tags cache for a strand
 * Stores dynamically extracted block tags per-strand with TTL
 */
export interface StorableBlockTagsCache extends StorableEntity {
  type: 'block-tags-cache'
  /** Strand path this cache belongs to */
  strandPath: string
  /** Cached blocks with their tags */
  blocks: Array<{
    id: string
    line: number
    endLine?: number
    type: string
    headingLevel?: number
    headingText?: string
    tags: string[]
    suggestedTags: Array<{
      tag: string
      confidence: number
      source: string
      reasoning?: string
    }>
    worthiness?: { score: number; signals?: Record<string, number> }
    extractiveSummary?: string
    warrantsIllustration?: boolean
  }>
  /** Content hash of the strand markdown (for invalidation) */
  strandContentHash: string
  /** When this cache expires (ISO 8601) */
  expiresAt: string
}

// ============================================================================
// STORAGE ADAPTER INTERFACE
// ============================================================================

/**
 * Generic storage adapter interface
 * Implemented by LocalStorageAdapter, GitHubStorageAdapter, BrowserCacheAdapter
 */
export interface StorageAdapter {
  /** Adapter name for logging */
  readonly name: string

  /** Whether adapter supports write operations */
  readonly canWrite: boolean

  /** Initialize the adapter */
  initialize(): Promise<void>

  /** Close/cleanup the adapter */
  close(): Promise<void>

  // ========================================================================
  // STRAND OPERATIONS
  // ========================================================================

  getStrand(path: string): Promise<StorableStrand | null>
  getAllStrands(): Promise<StorableStrand[]>
  getStrandsByWeave(weave: string): Promise<StorableStrand[]>
  getStrandsByLoom(loom: string): Promise<StorableStrand[]>
  saveStrand(strand: StorableStrand): Promise<void>
  deleteStrand(path: string): Promise<void>

  // ========================================================================
  // COLLECTION OPERATIONS
  // ========================================================================

  getCollection(id: string): Promise<StorableCollection | null>
  getAllCollections(): Promise<StorableCollection[]>
  saveCollection(collection: StorableCollection): Promise<void>
  deleteCollection(id: string): Promise<void>

  // ========================================================================
  // DRAFT OPERATIONS
  // ========================================================================

  getDraft(id: string): Promise<StorableDraft | null>
  getAllDrafts(): Promise<StorableDraft[]>
  saveDraft(draft: StorableDraft): Promise<void>
  deleteDraft(id: string): Promise<void>

  // ========================================================================
  // BOOKMARK OPERATIONS
  // ========================================================================

  getBookmark(strandPath: string): Promise<StorableBookmark | null>
  getAllBookmarks(): Promise<StorableBookmark[]>
  saveBookmark(bookmark: StorableBookmark): Promise<void>
  deleteBookmark(strandPath: string): Promise<void>

  // ========================================================================
  // PREFERENCES OPERATIONS
  // ========================================================================

  getPreferences(): Promise<StorablePreferences | null>
  savePreferences(prefs: StorablePreferences): Promise<void>

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

  /** Get all entities with pending sync status */
  getPendingEntities(): Promise<StorableEntity[]>

  /** Update sync status for multiple entities */
  updateSyncStatus(ids: string[], status: EntitySyncStatus): Promise<void>

  /** Clear all data (for reset/testing) */
  clearAll(): Promise<void>
}

// ============================================================================
// STORAGE MANAGER TYPES
// ============================================================================

/**
 * Pending change for sync queue
 */
export interface PendingChange {
  entityType: 'strand' | 'collection' | 'draft' | 'bookmark' | 'preferences'
  entityId: string
  action: 'create' | 'update' | 'delete'
  timestamp: string
  retryCount: number
}

/**
 * Sync result
 */
export interface StorageSyncResult {
  success: boolean
  pushed: number
  pulled: number
  conflicts: number
  errors: string[]
  duration: number
}

/**
 * Conflict details
 */
export interface SyncConflict {
  entityType: string
  entityId: string
  localEntity: StorableEntity
  remoteEntity: StorableEntity
  localHash: string
  remoteHash: string
  resolvedBy?: 'local' | 'remote' | 'manual'
}

/**
 * Storage event types
 */
export type StorageEventType =
  | 'initialized'
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'conflict-detected'
  | 'entity-saved'
  | 'entity-deleted'
  | 'offline'
  | 'online'
  | 'github-configured'
  | 'github-disconnected'

/**
 * Storage event payload
 */
export interface StorageEvent {
  type: StorageEventType
  timestamp: string
  data?: unknown
}

/**
 * Storage event listener
 */
export type StorageEventListener = (event: StorageEvent) => void
