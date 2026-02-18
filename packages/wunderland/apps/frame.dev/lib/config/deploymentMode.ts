/**
 * Deployment Mode Configuration
 *
 * Defines the two deployment modes for Frame.dev:
 * - static: Free open-source edition on GitHub Pages
 * - offline: Paid edition with full offline support
 *
 * @module lib/config/deploymentMode
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Deployment mode determines the operating environment
 */
export type DeploymentMode = 'static' | 'offline'

/**
 * Edition type for licensing
 */
export type Edition = 'community' | 'premium'

/**
 * Storage backend selection
 */
export type StorageBackendType = 'indexeddb' | 'sqlite' | 'auto'

/**
 * Content source for knowledge data
 */
export type ContentSourceType = 'github' | 'local' | 'hybrid'

/**
 * Platform detection result
 */
export type PlatformType = 'web' | 'electron' | 'capacitor' | 'pwa'

// ============================================================================
// FEATURE FLAGS INTERFACE
// ============================================================================

/**
 * Complete feature flags configuration
 */
export interface FeatureFlags {
  // Mode identification
  deploymentMode: DeploymentMode
  edition: Edition
  isOfflineMode: boolean
  isStaticMode: boolean
  isPaidVersion: boolean

  // Platform
  platform: PlatformType

  // Storage configuration
  storageBackend: StorageBackendType
  allowLocalSqlite: boolean

  // Content source
  contentSource: ContentSourceType
  requirePAT: boolean

  // Premium features (gated in community edition)
  enableQuizzes: boolean
  enableFlashcards: boolean
  enableQnA: boolean
  enableExport: boolean
  enableAdvancedThemes: boolean
  enableGamification: boolean
  enableAIGeneration: boolean
  enableLearningStudio: boolean

  // FABRIC community features
  enablePlugins: boolean

  // Always-enabled features
  enableSpiralPath: boolean
  enableSemanticSearch: boolean
  enableBookmarks: boolean
  enableKnowledgeGraph: boolean
  enableReadingProgress: boolean

  // License status
  licenseValid: boolean
  licenseType: 'none' | 'premium' | 'trial'
  licenseExpiry: Date | null
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default feature flags for community (free) edition
 */
export const COMMUNITY_DEFAULTS: FeatureFlags = {
  deploymentMode: 'static',
  edition: 'community',
  isOfflineMode: false,
  isStaticMode: true,
  isPaidVersion: false,

  platform: 'web',

  storageBackend: 'indexeddb',
  allowLocalSqlite: false,

  contentSource: 'github',
  requirePAT: true,

  // Premium features DISABLED
  enableQuizzes: false,
  enableFlashcards: false,
  enableQnA: false,
  enableExport: false,
  enableAdvancedThemes: false,
  enableGamification: false,
  enableAIGeneration: false,
  enableLearningStudio: false,

  // FABRIC community features
  enablePlugins: true,

  // Core features ENABLED
  enableSpiralPath: true,
  enableSemanticSearch: true,
  enableBookmarks: true,
  enableKnowledgeGraph: true,
  enableReadingProgress: true,

  licenseValid: false,
  licenseType: 'none',
  licenseExpiry: null,
}

/**
 * Default feature flags for premium (paid) edition
 */
export const PREMIUM_DEFAULTS: FeatureFlags = {
  deploymentMode: 'offline',
  edition: 'premium',
  isOfflineMode: true,
  isStaticMode: false,
  isPaidVersion: true,

  platform: 'web',

  storageBackend: 'auto',
  allowLocalSqlite: true,

  contentSource: 'local',
  requirePAT: false,

  // ALL features ENABLED
  enableQuizzes: true,
  enableFlashcards: true,
  enableQnA: true,
  enableExport: true,
  enableAdvancedThemes: true,
  enableGamification: true,
  enableAIGeneration: true,
  enableLearningStudio: true,

  // FABRIC community features (also enabled in premium)
  enablePlugins: true,

  enableSpiralPath: true,
  enableSemanticSearch: true,
  enableBookmarks: true,
  enableKnowledgeGraph: true,
  enableReadingProgress: true,

  licenseValid: true,
  licenseType: 'premium',
  licenseExpiry: null,
}

/**
 * Default feature flags for FABRIC community edition
 * Open-source viewer with plugin support, without premium AI features
 */
export const FABRIC_DEFAULTS: FeatureFlags = {
  ...COMMUNITY_DEFAULTS,
  edition: 'community',

  // FABRIC keeps plugins enabled
  enablePlugins: true,

  // FABRIC keeps export enabled for community
  enableExport: true,
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  if (!isBrowser()) return false
  return !!(
    window.navigator.userAgent.toLowerCase().includes('electron') ||
    (window as unknown as { electronAPI?: unknown }).electronAPI
  )
}

/**
 * Check if running in Capacitor
 */
export function isCapacitor(): boolean {
  if (!isBrowser()) return false
  return !!(window as unknown as { Capacitor?: unknown }).Capacitor
}

/**
 * Check if running as PWA (installed)
 */
export function isPWA(): boolean {
  if (!isBrowser()) return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/**
 * Detect current platform
 */
export function detectPlatform(): PlatformType {
  if (isElectron()) return 'electron'
  if (isCapacitor()) return 'capacitor'
  if (isPWA()) return 'pwa'
  return 'web'
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  if (!isBrowser()) return true
  return navigator.onLine
}

/**
 * Check if running in static export mode (no API routes available)
 *
 * Returns true if:
 * 1. NEXT_PUBLIC_DEPLOYMENT_MODE is set to 'static'
 * 2. Running on GitHub Pages, Cloudflare Pages, or Netlify (detected by hostname)
 */
export function isStaticExport(): boolean {
  // Build-time: check env var
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'static') return true

  // Runtime fallback: detect static hosting platforms by hostname
  if (isBrowser()) {
    const host = window.location.hostname
    if (host.endsWith('.github.io')) return true
    if (host.endsWith('.pages.dev')) return true  // Cloudflare Pages
    if (host.endsWith('.netlify.app')) return true
    if (host === 'frame.dev' || host.endsWith('.frame.dev')) return true  // GitHub Pages custom domain
    if (host === 'quarry.space' || host.endsWith('.quarry.space')) return true  // Static hosting
    if (host.endsWith('.vercel.app')) return false // Vercel has API routes
  }

  return false
}

// ============================================================================
// BUILD-TIME CONFIGURATION
// ============================================================================

/**
 * Get deployment mode from environment
 */
export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE
  if (mode === 'offline') return 'offline'
  return 'static'
}

/**
 * Get edition from environment
 * Defaults to 'premium' when not specified (full codebase)
 */
export function getEdition(): Edition {
  const edition = process.env.NEXT_PUBLIC_EDITION
  if (edition === 'community') return 'community'
  return 'premium'
}

/**
 * Check if this is a premium build
 */
export function isPremiumBuild(): boolean {
  return getEdition() === 'premium'
}

/**
 * Get license server URL
 */
export function getLicenseServerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_LICENSE_SERVER || 'https://license.frame.dev/api'
  )
}
