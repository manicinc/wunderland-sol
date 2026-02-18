/**
 * Remote Template System Type Definitions
 * @module lib/templates/types
 *
 * @description
 * Types for remote template fetching from GitHub repositories.
 * Extends existing template types from components/quarry/templates/types.
 */

import type {
  StrandTemplate,
  TemplateCategory,
  TemplateCategoryMeta,
  TemplateField,
  FrontmatterConfig,
  TemplateDifficulty,
} from '@/components/quarry/templates/types'

// Re-export types needed by other modules
export type {
  TemplateCategory,
  TemplateCategoryMeta,
  StrandTemplate,
  TemplateField,
  FrontmatterConfig,
  TemplateDifficulty,
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Template source identifiers */
export type TemplateSource = 'local' | 'remote'

/** Remote repository configuration */
export interface TemplateRepository {
  /** Unique identifier (e.g., 'framersai/quarry-templates') */
  id: string
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** Branch to fetch from (default: 'main') */
  branch: string
  /** Display name */
  name: string
  /** Repository description */
  description: string
  /** Whether this source is enabled */
  enabled: boolean
  /** Whether this is the official source */
  isOfficial: boolean
  /** Last successful sync timestamp */
  lastSynced?: number
  /** Custom icon URL (optional) */
  iconUrl?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRY TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Remote registry format (registry.json in repo) */
export interface RemoteTemplateRegistry {
  /** Registry schema version */
  schemaVersion: '1.0' | '1.1'
  /** Registry last updated ISO timestamp */
  lastUpdated: string
  /** Repository metadata */
  repository: {
    name: string
    description: string
    author: string
    website?: string
    license: string
  }
  /** Category definitions (extends/overrides local categories) */
  categories: TemplateCategoryMeta[]
  /** Template entries with versioning */
  templates: RemoteTemplateEntry[]
}

/** Template entry in registry */
export interface RemoteTemplateEntry {
  /** Template file path relative to templates/ */
  path: string
  /** Template ID (must be unique within registry) */
  id: string
  /** Semantic version */
  version: string
  /** Category ID */
  category: TemplateCategory
  /** Short description for list view */
  summary: string
  /** SHA hash for change detection */
  sha?: string
  /** Template size in bytes */
  size?: number
  /** Featured flag */
  featured?: boolean
  /** Minimum Quarry version required */
  minQuarryVersion?: string
  /** Dependencies (other template IDs) */
  dependencies?: string[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   REMOTE TEMPLATE TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Remote template with full data */
export interface RemoteTemplate extends StrandTemplate {
  /** Source identifier */
  source: 'remote'
  /** Repository this template comes from */
  sourceId: string
  /** Remote-specific metadata */
  remote: {
    /** Repository path */
    path: string
    /** Version in registry */
    version: string
    /** SHA for cache validation */
    sha?: string
    /** When this version was published */
    publishedAt?: string
    /** Download count (if tracked) */
    downloads?: number
  }
}

/** Local template with source field for unified handling */
export interface LocalTemplate extends StrandTemplate {
  /** Source identifier */
  source: 'local'
}

/** Unified template type */
export type UnifiedTemplate = LocalTemplate | RemoteTemplate

/* ═══════════════════════════════════════════════════════════════════════════
   CACHE TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Cached template entry for IndexedDB */
export interface CachedTemplateEntry {
  /** Composite key: sourceId:templateId */
  id: string
  /** Full template data */
  template: RemoteTemplate
  /** When cached */
  cachedAt: number
  /** Cache expiry timestamp */
  expiresAt: number
  /** Access count for LRU */
  accessCount: number
  /** Last accessed timestamp */
  lastAccessed: number
}

/** Cached registry entry for IndexedDB */
export interface CachedRegistryEntry {
  /** Repository ID (owner/repo) */
  id: string
  /** Full registry data */
  registry: RemoteTemplateRegistry
  /** When cached */
  cachedAt: number
  /** Cache expiry timestamp */
  expiresAt: number
  /** ETag for conditional requests */
  etag?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREFERENCES TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** User's template source preferences */
export interface TemplateSourcePreferences {
  /** Configured repositories */
  repositories: TemplateRepository[]
  /** Installed remote templates (by composite ID) */
  installed: Record<
    string,
    {
      installedAt: number
      installedVersion: string
      hasUpdate?: boolean
      latestVersion?: string
    }
  >
  /** Hidden templates (user dismissed) */
  hidden: string[]
  /** Last global sync timestamp */
  lastGlobalSync?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Sync status for UI */
export interface TemplateSyncStatus {
  /** Whether sync is in progress */
  isSyncing: boolean
  /** Current repository being synced */
  currentRepo?: string
  /** Progress (0-100) */
  progress?: number
  /** Last error if any */
  error?: string
  /** Last successful sync timestamp */
  lastSyncAt?: number
}

/** Rate limit status */
export interface GitHubRateLimitStatus {
  /** Requests remaining */
  remaining: number
  /** Total limit */
  limit: number
  /** Reset timestamp */
  resetAt: Date
  /** Whether we have a PAT configured */
  hasAuth: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Template fetch error types */
export enum TemplateErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_REGISTRY = 'INVALID_REGISTRY',
  INVALID_TEMPLATE = 'INVALID_TEMPLATE',
  CACHE_ERROR = 'CACHE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

/** Custom error class for template operations */
export class TemplateError extends Error {
  constructor(
    public type: TemplateErrorType,
    message: string,
    public retryAfter?: number,
    public repoId?: string
  ) {
    super(message)
    this.name = 'TemplateError'
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE CREATION TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Draft template being created/edited */
export interface TemplateDraft {
  /** Draft ID (generated on first save) */
  id?: string
  /** Template name */
  name: string
  /** Category */
  category: TemplateCategory
  /** Lucide icon name */
  icon: string
  /** Full description */
  description: string
  /** Short description for list view */
  shortDescription: string
  /** Difficulty level */
  difficulty: TemplateDifficulty
  /** Estimated time to complete */
  estimatedTime: string
  /** Related tags */
  tags: string[]
  /** Version (defaults to 1.0.0) */
  version: string
  /** Author name */
  author: string
  /** Whether to mark as featured */
  featured: boolean
  /** Form field definitions */
  fields: TemplateField[]
  /** Frontmatter configuration */
  frontmatter: FrontmatterConfig
  /** Markdown template with {placeholders} */
  template: string
  /** Default form values */
  defaultData: Record<string, unknown>
  /** Draft created timestamp */
  createdAt?: number
  /** Last modified timestamp */
  updatedAt?: number
}

/** Target configuration for publishing */
export interface PublishTarget {
  /** Target repository */
  repository: TemplateRepository
  /** Path within templates/ folder (e.g., "technical/my-template.json") */
  path: string
  /** Whether to update registry.json */
  updateRegistry: boolean
  /** Commit message */
  commitMessage: string
  /** Create PR instead of direct commit */
  createPR: boolean
  /** PR title (if createPR is true) */
  prTitle?: string
  /** PR body (if createPR is true) */
  prBody?: string
  /** Branch name for PR */
  branchName?: string
}

/** Result from publish operation */
export interface PublishResult {
  /** Whether publish succeeded */
  success: boolean
  /** URL to created file, commit, or PR */
  url?: string
  /** Commit SHA */
  sha?: string
  /** PR number (if PR was created) */
  prNumber?: number
  /** Error message if failed */
  error?: string
  /** Error type for specific handling */
  errorType?: 'auth' | 'permission' | 'conflict' | 'network' | 'validation'
}

/** Local draft storage format */
export interface TemplateDraftStorage {
  /** Saved drafts by ID */
  drafts: Record<string, TemplateDraft>
  /** Last modified timestamps for sorting */
  lastModified: Record<string, number>
  /** Storage version for migrations */
  version: number
}

/** Template validation result */
export interface TemplateValidation {
  /** Whether template is valid */
  valid: boolean
  /** Validation errors */
  errors: {
    field: string
    message: string
  }[]
  /** Validation warnings (non-blocking) */
  warnings: {
    field: string
    message: string
  }[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

/** Default official template repository */
export const OFFICIAL_TEMPLATE_REPO: TemplateRepository = {
  id: 'framersai/quarry-templates',
  owner: 'framersai',
  repo: 'quarry-templates',
  branch: 'main',
  name: 'Quarry Official Templates',
  description: 'Official template collection for Quarry Codex',
  enabled: true,
  isOfficial: true,
}

/** Cache TTL constants in milliseconds */
export const CACHE_TTL = {
  /** Registry cache duration (4 hours) */
  REGISTRY: 4 * 60 * 60 * 1000,
  /** Template cache duration (24 hours) */
  TEMPLATE: 24 * 60 * 60 * 1000,
  /** Stale-while-revalidate duration (7 days) */
  STALE_WHILE_REVALIDATE: 7 * 24 * 60 * 60 * 1000,
} as const

/** Cache limits */
export const CACHE_LIMITS = {
  /** Maximum cached templates */
  MAX_TEMPLATES: 500,
  /** Maximum cached registries */
  MAX_REGISTRIES: 20,
} as const

/** Storage keys */
export const STORAGE_KEYS = {
  /** Template source preferences */
  PREFERENCES: 'quarry-template-sources',
  /** Sync status */
  SYNC_STATUS: 'quarry-template-sync-status',
  /** Template drafts */
  DRAFTS: 'quarry-template-drafts',
} as const
