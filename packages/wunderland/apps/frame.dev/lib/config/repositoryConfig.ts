/**
 * Repository Configuration
 * @module lib/config/repositoryConfig
 *
 * @description
 * Configures URLs for the FABRIC plugin registry and Codex source repository.
 * These can be customized via environment variables for self-hosted deployments.
 *
 * Default repositories:
 * - Plugins: framersai/quarry-plugins (MIT licensed, open source)
 * - Codex: framersai/frame.dev (MIT licensed, open source)
 *
 * @example
 * ```env
 * # Custom plugin registry
 * NEXT_PUBLIC_PLUGIN_REGISTRY_REPO=myorg/my-quarry-plugins
 * NEXT_PUBLIC_PLUGIN_REGISTRY_URL=https://my-registry.example.com/plugins.json
 *
 * # Custom Codex source
 * NEXT_PUBLIC_CODEX_REPO=myorg/my-codex-fork
 * ```
 */

import { isPublicAccess } from './publicAccess'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RepositoryConfig {
  /** GitHub repository for plugins (org/repo format) */
  pluginRepo: string
  /** Full URL to plugin registry JSON */
  pluginRegistryUrl: string
  /** GitHub repository for Codex source (org/repo format) */
  codexRepo: string
  /** Whether URLs can be edited (only when not in public access mode) */
  canEdit: boolean
  /** Whether to show documentation from external repos */
  showExternalDocs: boolean
}

export interface PluginRepoInfo {
  /** Repository name */
  name: string
  /** Repository owner */
  owner: string
  /** Full GitHub URL */
  url: string
  /** URL to contributing guide */
  contributingUrl: string
  /** URL to documentation */
  docsUrl: string
  /** URL to issues */
  issuesUrl: string
  /** License type */
  license: string
  /** Whether this is the official registry */
  isOfficial: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PLUGIN_REPO = 'framersai/quarry-plugins'
const DEFAULT_PLUGIN_REGISTRY_URL = 'https://raw.githubusercontent.com/framersai/quarry-plugins/main/registry.json'
const DEFAULT_CODEX_REPO = 'framersai/frame.dev'

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the configured plugin repository
 */
export function getPluginRepo(): string {
  return process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO || DEFAULT_PLUGIN_REPO
}

/**
 * Get the plugin registry URL
 */
export function getPluginRegistryUrl(): string {
  return process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL || DEFAULT_PLUGIN_REGISTRY_URL
}

/**
 * Get the Codex source repository
 */
export function getCodexRepo(): string {
  return process.env.NEXT_PUBLIC_CODEX_REPO || DEFAULT_CODEX_REPO
}

/**
 * Get full repository configuration
 */
export function getRepositoryConfig(): RepositoryConfig {
  const publicAccess = isPublicAccess()
  
  return {
    pluginRepo: getPluginRepo(),
    pluginRegistryUrl: getPluginRegistryUrl(),
    codexRepo: getCodexRepo(),
    canEdit: !publicAccess,
    showExternalDocs: publicAccess,
  }
}

/**
 * Get detailed plugin repository info
 */
export function getPluginRepoInfo(): PluginRepoInfo {
  const repo = getPluginRepo()
  const [owner, name] = repo.split('/')
  const isOfficial = repo === DEFAULT_PLUGIN_REPO
  
  return {
    name: name || 'quarry-plugins',
    owner: owner || 'framersai',
    url: `https://github.com/${repo}`,
    contributingUrl: `https://github.com/${repo}/blob/main/CONTRIBUTING.md`,
    docsUrl: `https://github.com/${repo}/blob/main/README.md`,
    issuesUrl: `https://github.com/${repo}/issues`,
    license: 'MIT',
    isOfficial,
  }
}

/**
 * Get Codex repository URL
 */
export function getCodexRepoUrl(): string {
  return `https://github.com/${getCodexRepo()}`
}

/**
 * Check if using official repositories
 */
export function isUsingOfficialRepos(): boolean {
  return (
    getPluginRepo() === DEFAULT_PLUGIN_REPO &&
    getCodexRepo() === DEFAULT_CODEX_REPO
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE OVERRIDES (for non-public mode)
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'fabric_repository_config'

interface StoredConfig {
  pluginRepo?: string
  pluginRegistryUrl?: string
  codexRepo?: string
}

/**
 * Get user's custom repository config from local storage
 */
export function getStoredConfig(): StoredConfig {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save custom repository config to local storage
 * Only works when not in public access mode
 */
export function saveStoredConfig(config: Partial<StoredConfig>): boolean {
  if (typeof window === 'undefined') return false
  if (isPublicAccess()) return false
  
  try {
    const current = getStoredConfig()
    const updated = { ...current, ...config }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return true
  } catch {
    return false
  }
}

/**
 * Clear custom repository config
 */
export function clearStoredConfig(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Get effective plugin repo (checking local storage first if allowed)
 */
export function getEffectivePluginRepo(): string {
  if (!isPublicAccess()) {
    const stored = getStoredConfig()
    if (stored.pluginRepo) return stored.pluginRepo
  }
  return getPluginRepo()
}

/**
 * Get effective plugin registry URL (checking local storage first if allowed)
 */
export function getEffectivePluginRegistryUrl(): string {
  if (!isPublicAccess()) {
    const stored = getStoredConfig()
    if (stored.pluginRegistryUrl) return stored.pluginRegistryUrl
  }
  return getPluginRegistryUrl()
}

/**
 * Get effective Codex repo (checking local storage first if allowed)
 */
export function getEffectiveCodexRepo(): string {
  if (!isPublicAccess()) {
    const stored = getStoredConfig()
    if (stored.codexRepo) return stored.codexRepo
  }
  return getCodexRepo()
}



