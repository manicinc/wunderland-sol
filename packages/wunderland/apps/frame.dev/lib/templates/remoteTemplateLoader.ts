/**
 * Remote Template Loader Service
 * @module lib/templates/remoteTemplateLoader
 *
 * @description
 * Fetches templates from GitHub repositories with:
 * - Automatic fallback from GraphQL to REST API
 * - Rate limit awareness and request queuing
 * - ETag-based conditional requests
 * - IndexedDB caching with LRU eviction
 */

import type {
  TemplateRepository,
  RemoteTemplateRegistry,
  RemoteTemplateEntry,
  RemoteTemplate,
  TemplateSyncStatus,
  GitHubRateLimitStatus,
} from './types'
import {
  TemplateError,
  TemplateErrorType,
  OFFICIAL_TEMPLATE_REPO,
  STORAGE_KEYS,
} from './types'
import {
  getCachedRegistry,
  setCachedRegistry,
  isRegistryFresh,
  isRegistryUsable,
  getCachedTemplate,
  setCachedTemplate,
  getTemplateCacheKey,
  isTemplateFresh,
  isTemplateUsable,
  getAllCachedTemplates,
  getCachedTemplatesByRepo,
} from './templateCache'
import type { StrandTemplate } from '@/components/quarry/templates/types'

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
═══════════════════════════════════════════════════════════════════════════ */

/** GitHub raw content base URL (no rate limiting) */
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com'

/** GitHub API base URL */
const GITHUB_API_URL = 'https://api.github.com'

/** Rate limit thresholds */
const RATE_LIMIT = {
  /** Minimum remaining requests before slowing down */
  WARN_THRESHOLD: 10,
  /** Stop making requests when below this */
  STOP_THRESHOLD: 5,
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════════════════ */

/** Current rate limit status */
let rateLimitStatus: GitHubRateLimitStatus = {
  remaining: 60,
  limit: 60,
  resetAt: new Date(),
  hasAuth: false,
}

/** Sync status subscribers */
const syncStatusSubscribers = new Set<(status: TemplateSyncStatus) => void>()

/** Current sync status */
let currentSyncStatus: TemplateSyncStatus = {
  isSyncing: false,
  progress: 0,
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get GitHub personal access token from settings
 */
function getGitHubToken(): string | null {
  if (typeof window === 'undefined') return null

  try {
    // Try to get from localStorage settings
    const settings = localStorage.getItem('codex-settings')
    if (settings) {
      const parsed = JSON.parse(settings)
      return parsed.githubToken || parsed.github?.pat || null
    }
  } catch {
    // Ignore parsing errors
  }
  return null
}

/**
 * Update rate limit status from response headers
 */
function updateRateLimitFromHeaders(headers: Headers): void {
  const remaining = headers.get('X-RateLimit-Remaining')
  const limit = headers.get('X-RateLimit-Limit')
  const reset = headers.get('X-RateLimit-Reset')

  if (remaining) {
    rateLimitStatus.remaining = parseInt(remaining, 10)
  }
  if (limit) {
    rateLimitStatus.limit = parseInt(limit, 10)
  }
  if (reset) {
    rateLimitStatus.resetAt = new Date(parseInt(reset, 10) * 1000)
  }
  rateLimitStatus.hasAuth = !!getGitHubToken()
}

/**
 * Notify sync status subscribers
 */
function notifySyncStatus(status: Partial<TemplateSyncStatus>): void {
  currentSyncStatus = { ...currentSyncStatus, ...status }
  syncStatusSubscribers.forEach((callback) => callback(currentSyncStatus))
}

/**
 * Check if we can make API requests
 */
function canMakeRequest(): boolean {
  if (rateLimitStatus.remaining <= RATE_LIMIT.STOP_THRESHOLD) {
    if (Date.now() < rateLimitStatus.resetAt.getTime()) {
      return false
    }
    // Reset has passed, assume we have requests again
    rateLimitStatus.remaining = rateLimitStatus.hasAuth ? 5000 : 60
  }
  return true
}

/**
 * Get fetch headers with optional auth
 */
function getHeaders(etag?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  }

  const token = getGitHubToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (etag) {
    headers['If-None-Match'] = etag
  }

  return headers
}

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRY FETCHING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch registry from a repository
 */
export async function fetchRegistry(
  repo: TemplateRepository,
  options?: { forceRefresh?: boolean }
): Promise<RemoteTemplateRegistry> {
  // Check cache first
  const cached = await getCachedRegistry(repo.id)

  // Return fresh cache
  if (cached && isRegistryFresh(cached) && !options?.forceRefresh) {
    return cached.registry
  }

  // Try network
  if (navigator.onLine && canMakeRequest()) {
    try {
      const registry = await fetchRegistryFromGitHub(repo, cached?.etag)

      // If we got a registry, cache it
      if (registry) {
        return registry
      }

      // 304 Not Modified - use cached
      if (cached) {
        return cached.registry
      }
    } catch (error) {
      console.warn('[RemoteTemplateLoader] Network error fetching registry:', error)

      // Fall back to stale cache if available
      if (cached && isRegistryUsable(cached)) {
        return cached.registry
      }

      throw error
    }
  }

  // Offline or rate limited - use cache if available
  if (cached && isRegistryUsable(cached)) {
    return cached.registry
  }

  throw new TemplateError(
    TemplateErrorType.NETWORK_ERROR,
    `Cannot fetch registry for ${repo.id} - offline and no cache available`,
    undefined,
    repo.id
  )
}

/**
 * Fetch registry from GitHub (raw content URL)
 */
async function fetchRegistryFromGitHub(
  repo: TemplateRepository,
  etag?: string
): Promise<RemoteTemplateRegistry | null> {
  const url = `${GITHUB_RAW_URL}/${repo.owner}/${repo.repo}/${repo.branch}/registry.json`

  const response = await fetch(url, {
    headers: etag ? { 'If-None-Match': etag } : {},
    cache: 'no-cache',
  })

  if (response.status === 304) {
    // Not modified
    return null
  }

  if (response.status === 404) {
    throw new TemplateError(
      TemplateErrorType.NOT_FOUND,
      `Registry not found in ${repo.id}`,
      undefined,
      repo.id
    )
  }

  if (!response.ok) {
    throw new TemplateError(
      TemplateErrorType.NETWORK_ERROR,
      `Failed to fetch registry: ${response.status}`,
      undefined,
      repo.id
    )
  }

  const registry: RemoteTemplateRegistry = await response.json()

  // Validate registry
  if (!registry.schemaVersion || !registry.templates) {
    throw new TemplateError(
      TemplateErrorType.INVALID_REGISTRY,
      'Invalid registry format',
      undefined,
      repo.id
    )
  }

  // Cache the registry
  const newEtag = response.headers.get('ETag') || undefined
  await setCachedRegistry(repo.id, registry, newEtag)

  return registry
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE FETCHING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch a single template
 */
export async function fetchTemplate(
  repo: TemplateRepository,
  entry: RemoteTemplateEntry
): Promise<RemoteTemplate> {
  const cacheKey = getTemplateCacheKey(repo.id, entry.id)

  // Check cache first
  const cached = await getCachedTemplate(cacheKey)

  // Return fresh cache
  if (cached && isTemplateFresh(cached)) {
    // Check if SHA matches (template hasn't changed)
    if (!entry.sha || cached.template.remote.sha === entry.sha) {
      return cached.template
    }
  }

  // Try network
  if (navigator.onLine) {
    try {
      const template = await fetchTemplateFromGitHub(repo, entry)
      await setCachedTemplate(template)
      return template
    } catch (error) {
      console.warn('[RemoteTemplateLoader] Error fetching template:', error)

      // Fall back to stale cache
      if (cached && isTemplateUsable(cached)) {
        return cached.template
      }

      throw error
    }
  }

  // Offline - use cache if available
  if (cached && isTemplateUsable(cached)) {
    return cached.template
  }

  throw new TemplateError(
    TemplateErrorType.NETWORK_ERROR,
    `Cannot fetch template ${entry.id} - offline and no cache available`,
    undefined,
    repo.id
  )
}

/**
 * Fetch template from GitHub (raw content URL)
 */
async function fetchTemplateFromGitHub(
  repo: TemplateRepository,
  entry: RemoteTemplateEntry
): Promise<RemoteTemplate> {
  const url = `${GITHUB_RAW_URL}/${repo.owner}/${repo.repo}/${repo.branch}/templates/${entry.path}`

  const response = await fetch(url, { cache: 'no-cache' })

  if (response.status === 404) {
    throw new TemplateError(
      TemplateErrorType.NOT_FOUND,
      `Template ${entry.id} not found`,
      undefined,
      repo.id
    )
  }

  if (!response.ok) {
    throw new TemplateError(
      TemplateErrorType.NETWORK_ERROR,
      `Failed to fetch template: ${response.status}`,
      undefined,
      repo.id
    )
  }

  const baseTemplate: StrandTemplate = await response.json()

  // Validate template
  if (!baseTemplate.id || !baseTemplate.name || !baseTemplate.template) {
    throw new TemplateError(
      TemplateErrorType.INVALID_TEMPLATE,
      `Invalid template format for ${entry.id}`,
      undefined,
      repo.id
    )
  }

  // Convert to RemoteTemplate
  const remoteTemplate: RemoteTemplate = {
    ...baseTemplate,
    source: 'remote',
    sourceId: repo.id,
    remote: {
      path: entry.path,
      version: entry.version,
      sha: entry.sha,
      publishedAt: new Date().toISOString(),
    },
  }

  return remoteTemplate
}

/**
 * Fetch all templates from a repository
 */
export async function fetchAllTemplates(
  repo: TemplateRepository,
  options?: {
    categories?: string[]
    featuredOnly?: boolean
    maxConcurrent?: number
  }
): Promise<RemoteTemplate[]> {
  const registry = await fetchRegistry(repo)

  let entries = registry.templates

  // Filter by category
  if (options?.categories?.length) {
    entries = entries.filter((e) => options.categories!.includes(e.category))
  }

  // Filter featured only
  if (options?.featuredOnly) {
    entries = entries.filter((e) => e.featured)
  }

  // Fetch templates with concurrency control
  const maxConcurrent = options?.maxConcurrent || 5
  const templates: RemoteTemplate[] = []
  const total = entries.length

  notifySyncStatus({
    isSyncing: true,
    currentRepo: repo.id,
    progress: 0,
  })

  for (let i = 0; i < entries.length; i += maxConcurrent) {
    const batch = entries.slice(i, i + maxConcurrent)
    const results = await Promise.allSettled(
      batch.map((entry) => fetchTemplate(repo, entry))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        templates.push(result.value)
      } else {
        console.warn('[RemoteTemplateLoader] Failed to fetch template:', result.reason)
      }
    }

    notifySyncStatus({
      progress: Math.round(((i + batch.length) / total) * 100),
    })
  }

  notifySyncStatus({
    isSyncing: false,
    progress: 100,
    lastSyncAt: Date.now(),
  })

  return templates
}

/* ═══════════════════════════════════════════════════════════════════════════
   UPDATE CHECKING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Check for updates across all configured repositories
 */
export async function checkForUpdates(
  repos: TemplateRepository[]
): Promise<
  Map<string, { hasUpdates: boolean; newTemplates: number; updatedTemplates: number }>
> {
  const results = new Map<
    string,
    { hasUpdates: boolean; newTemplates: number; updatedTemplates: number }
  >()

  for (const repo of repos) {
    if (!repo.enabled) {
      results.set(repo.id, { hasUpdates: false, newTemplates: 0, updatedTemplates: 0 })
      continue
    }

    try {
      // Fetch fresh registry
      const registry = await fetchRegistry(repo, { forceRefresh: true })

      // Get cached templates for this repo
      const cached = await getCachedTemplatesByRepo(repo.id)
      const cachedMap = new Map(cached.map((c) => [c.template.id, c]))

      let newTemplates = 0
      let updatedTemplates = 0

      for (const entry of registry.templates) {
        const cachedEntry = cachedMap.get(entry.id)

        if (!cachedEntry) {
          newTemplates++
        } else if (entry.sha && cachedEntry.template.remote.sha !== entry.sha) {
          updatedTemplates++
        } else if (entry.version !== cachedEntry.template.remote.version) {
          updatedTemplates++
        }
      }

      results.set(repo.id, {
        hasUpdates: newTemplates > 0 || updatedTemplates > 0,
        newTemplates,
        updatedTemplates,
      })
    } catch (error) {
      console.warn(`[RemoteTemplateLoader] Error checking updates for ${repo.id}:`, error)
      results.set(repo.id, { hasUpdates: false, newTemplates: 0, updatedTemplates: 0 })
    }
  }

  return results
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS & SUBSCRIPTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(): Promise<GitHubRateLimitStatus> {
  // Try to refresh rate limit from API
  if (navigator.onLine) {
    try {
      const response = await fetch(`${GITHUB_API_URL}/rate_limit`, {
        headers: getHeaders(),
      })

      if (response.ok) {
        updateRateLimitFromHeaders(response.headers)
      }
    } catch {
      // Use cached status
    }
  }

  return { ...rateLimitStatus }
}

/**
 * Subscribe to sync status changes
 */
export function subscribeSyncStatus(
  callback: (status: TemplateSyncStatus) => void
): () => void {
  syncStatusSubscribers.add(callback)
  // Immediately notify with current status
  callback(currentSyncStatus)

  return () => {
    syncStatusSubscribers.delete(callback)
  }
}

/** Alias for subscribeToSyncStatus */
export const subscribeToSyncStatus = subscribeSyncStatus

/**
 * Get current sync status
 */
export function getSyncStatus(): TemplateSyncStatus {
  return { ...currentSyncStatus }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREFERENCES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get template source preferences
 */
export function getTemplateSourcePreferences(): {
  enabled: boolean
  repositories: TemplateRepository[]
} {
  if (typeof window === 'undefined') {
    return { enabled: true, repositories: [OFFICIAL_TEMPLATE_REPO] }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES)
    if (stored) {
      const prefs = JSON.parse(stored)
      // Ensure official repo is always included
      const hasOfficial = prefs.repositories?.some(
        (r: TemplateRepository) => r.isOfficial
      )
      if (!hasOfficial) {
        prefs.repositories = [OFFICIAL_TEMPLATE_REPO, ...(prefs.repositories || [])]
      }
      // Default enabled to true if not set
      if (prefs.enabled === undefined) {
        prefs.enabled = true
      }
      return prefs
    }
  } catch {
    // Ignore parsing errors
  }

  return { enabled: true, repositories: [OFFICIAL_TEMPLATE_REPO] }
}

/**
 * Save template source preferences
 */
export function saveTemplateSourcePreferences(prefs: {
  enabled?: boolean
  repositories: TemplateRepository[]
}): void {
  if (typeof window === 'undefined') return

  try {
    // Merge with existing preferences to preserve enabled state if not provided
    const existing = getTemplateSourcePreferences()
    const merged = {
      enabled: prefs.enabled ?? existing.enabled,
      repositories: prefs.repositories,
    }
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(merged))
  } catch (error) {
    console.error('[RemoteTemplateLoader] Error saving preferences:', error)
  }
}

/**
 * Add a new template repository
 */
export function addTemplateRepository(
  owner: string,
  repo: string,
  branch: string = 'main'
): TemplateRepository {
  const fullRepo: TemplateRepository = {
    id: `${owner}/${repo}`,
    owner,
    repo,
    branch,
    name: repo,
    description: `Templates from ${owner}/${repo}`,
    enabled: true,
    isOfficial: false,
  }

  const prefs = getTemplateSourcePreferences()

  // Check if already exists
  if (prefs.repositories.some((r) => r.id === fullRepo.id)) {
    throw new Error(`Repository ${fullRepo.id} already exists`)
  }

  prefs.repositories.push(fullRepo)
  saveTemplateSourcePreferences(prefs)

  return fullRepo
}

/**
 * Remove a template repository
 */
export function removeTemplateRepository(repoId: string): void {
  const prefs = getTemplateSourcePreferences()

  // Don't allow removing official repo
  const repo = prefs.repositories.find((r) => r.id === repoId)
  if (repo?.isOfficial) {
    throw new Error('Cannot remove official template repository')
  }

  prefs.repositories = prefs.repositories.filter((r) => r.id !== repoId)
  saveTemplateSourcePreferences(prefs)
}

/**
 * Toggle repository enabled state
 */
export function toggleTemplateRepository(repoId: string, enabled: boolean): void {
  const prefs = getTemplateSourcePreferences()
  const repo = prefs.repositories.find((r) => r.id === repoId)

  if (repo) {
    repo.enabled = enabled
    saveTemplateSourcePreferences(prefs)
  }
}

/** Alias for setRepositoryEnabled */
export const setRepositoryEnabled = toggleTemplateRepository

/**
 * Parse GitHub URL to extract owner, repo, and optional branch
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  // Handle various GitHub URL formats
  const patterns = [
    // https://github.com/owner/repo/tree/branch
    { pattern: /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)/, hasBranch: true },
    // https://github.com/owner/repo
    { pattern: /github\.com\/([^/]+)\/([^/]+)/, hasBranch: false },
    // git@github.com:owner/repo.git
    { pattern: /github\.com:([^/]+)\/([^/.]+)/, hasBranch: false },
    // owner/repo
    { pattern: /^([^/]+)\/([^/]+)$/, hasBranch: false },
  ]

  for (const { pattern, hasBranch } of patterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '').replace(/\/.*$/, ''),
        branch: hasBranch ? match[3] : undefined,
      }
    }
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   UNIFIED TEMPLATE ACCESS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get all remote templates from all enabled repositories
 */
export async function getAllRemoteTemplates(forceRefresh = false): Promise<RemoteTemplate[]> {
  const prefs = getTemplateSourcePreferences()
  const enabledRepos = prefs.repositories.filter((r) => r.enabled)

  // Try to get from cache first
  const cachedTemplates = await getAllCachedTemplates()
  const cachedMap = new Map(cachedTemplates.map((c) => [c.id, c.template]))

  // If we have cached templates and are offline, return them
  if (!navigator.onLine && cachedTemplates.length > 0) {
    return cachedTemplates.map((c) => c.template)
  }

  // If not forcing refresh and have valid cache, return cached
  if (!forceRefresh && cachedTemplates.length > 0) {
    // Check if any cached template is still fresh
    const anyFresh = cachedTemplates.some((c) =>
      c.expiresAt > Date.now()
    )
    if (anyFresh) {
      return cachedTemplates.map((c) => c.template)
    }
  }

  // Fetch from all enabled repositories
  const allTemplates: RemoteTemplate[] = []

  for (const repo of enabledRepos) {
    try {
      const templates = await fetchAllTemplates(repo)
      allTemplates.push(...templates)
    } catch (error) {
      console.warn(`[RemoteTemplateLoader] Error fetching from ${repo.id}:`, error)

      // Use cached templates for this repo
      const repoTemplates = Array.from(cachedMap.values()).filter(
        (t) => t.sourceId === repo.id
      )
      allTemplates.push(...repoTemplates)
    }
  }

  return allTemplates
}

/**
 * Search remote templates
 */
export async function searchRemoteTemplates(
  query: string,
  options?: { category?: string; featured?: boolean }
): Promise<RemoteTemplate[]> {
  const templates = await getAllRemoteTemplates()
  const lowerQuery = query.toLowerCase()

  return templates.filter((t) => {
    // Text match
    const textMatch =
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.shortDescription.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))

    // Category filter
    const categoryMatch = !options?.category || t.category === options.category

    // Featured filter
    const featuredMatch = !options?.featured || t.featured

    return textMatch && categoryMatch && featuredMatch
  })
}
