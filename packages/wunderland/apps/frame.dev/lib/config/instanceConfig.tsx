/**
 * Instance Configuration
 *
 * Allows users to customize their Quarry instance name.
 * Examples: "Quarry Notes", "Quarry Health", "Quarry School", "My Knowledge Base"
 *
 * Configuration sources (in priority order):
 * 1. localStorage (for user-set preferences)
 * 2. Environment variable NEXT_PUBLIC_FABRIC_INSTANCE_NAME
 * 3. SQL storage (for self-hosted with full permissions)
 * 4. Default: "Quarry"
 *
 * The full branding is: "Quarry [Suffix]"
 * e.g., "Quarry Codex", "Quarry Notes", "Quarry Garden"
 *
 * @module lib/config/instanceConfig
 */

'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface InstanceConfig {
  /** The app suffix name (e.g., "Codex", "Garden", "Notes", "Library") - "Quarry" brand is immutable */
  codexName: string
  /** Custom tagline (optional) */
  tagline?: string
  /** Accent color for the suffix (hex) */
  suffixColor?: string
  /** Whether to show the suffix at all */
  showCodexSuffix: boolean
  /** Custom icon URL (optional, falls back to fabric icon) */
  iconUrl?: string
}

export interface InstanceConfigContextValue {
  config: InstanceConfig
  setConfig: (config: Partial<InstanceConfig>) => void
  resetToDefaults: () => void
  /** Full display name (e.g., "Quarry Codex") */
  displayName: string
  /** The brand name - always "Quarry" */
  brandName: string
  /** The customizable suffix (e.g., "Codex", "Garden", "Notes") */
  codexName: string
  /** Is using custom configuration */
  isCustomized: boolean
  /** Whether config has been loaded from storage */
  isLoaded: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'fabric_instance_config'

export const DEFAULT_INSTANCE_CONFIG: InstanceConfig = {
  codexName: 'Codex',
  tagline: 'Your knowledge fabric',
  showCodexSuffix: true,
  suffixColor: undefined, // Uses theme default (emerald)
  iconUrl: undefined, // Uses default fabric icon
}

/** Preset suffix names for quick selection - "Quarry" brand is always constant */
export const INSTANCE_PRESETS: Array<{ 
  codexName: string
  tagline: string
  emoji?: string
  color?: string // Preset color for the suffix
}> = [
  { codexName: 'Codex', tagline: 'Your knowledge fabric', emoji: '📚', color: '#10b981' }, // emerald
  { codexName: 'Garden', tagline: 'Cultivate your knowledge', emoji: '🌱', color: '#22c55e' }, // green
  { codexName: 'Notes', tagline: 'Personal knowledge base', emoji: '📝', color: '#3b82f6' }, // blue
  { codexName: 'Library', tagline: 'Your digital library', emoji: '📖', color: '#8b5cf6' }, // purple
  { codexName: 'Vault', tagline: 'Secure knowledge storage', emoji: '🔐', color: '#6366f1' }, // indigo
  { codexName: 'Wiki', tagline: 'Personal encyclopedia', emoji: '📜', color: '#06b6d4' }, // cyan
  { codexName: 'Lab', tagline: 'Experiments & findings', emoji: '🧪', color: '#f59e0b' }, // amber
  { codexName: 'Archive', tagline: 'Historical records', emoji: '🗄️', color: '#78716c' }, // stone
  { codexName: 'Atlas', tagline: 'Map your knowledge', emoji: '🗺️', color: '#14b8a6' }, // teal
  { codexName: 'Chronicle', tagline: 'Your story unfolds', emoji: '📔', color: '#ec4899' }, // pink
]

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getEnvConfig(): Partial<InstanceConfig> {
  if (typeof window === 'undefined') return {}
  
  const envCodexName = process.env.NEXT_PUBLIC_FABRIC_CODEX_NAME
  const envTagline = process.env.NEXT_PUBLIC_FABRIC_TAGLINE
  const envSuffixColor = process.env.NEXT_PUBLIC_FABRIC_SUFFIX_COLOR
  
  const config: Partial<InstanceConfig> = {}
  if (envCodexName) config.codexName = envCodexName
  if (envTagline) config.tagline = envTagline
  if (envSuffixColor) config.suffixColor = envSuffixColor
  
  return config
}

function loadFromStorage(): InstanceConfig {
  if (typeof window === 'undefined') return DEFAULT_INSTANCE_CONFIG
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      
      // Migration: old 'name' field -> new 'codexName' field
      // Previously the whole name was customizable (e.g., "My Notes")
      // Now "Fabric" is fixed and only the suffix is customizable (e.g., "Codex", "Garden")
      if (parsed.name && !parsed.codexName) {
        // If old name was "Fabric", use "Codex" as suffix
        // Otherwise, use the old name as the new suffix
        parsed.codexName = parsed.name === 'Fabric' ? 'Codex' : parsed.name
        delete parsed.name
      }
      
      // Migration: old 'accentColor' -> new 'suffixColor'
      if (parsed.accentColor && !parsed.suffixColor) {
        parsed.suffixColor = parsed.accentColor
        delete parsed.accentColor
      }
      
      return { ...DEFAULT_INSTANCE_CONFIG, ...parsed }
    }
  } catch (e) {
    console.warn('[InstanceConfig] Failed to load from storage:', e)
  }
  
  // Apply environment variables
  const envConfig = getEnvConfig()
  return { ...DEFAULT_INSTANCE_CONFIG, ...envConfig }
}

function saveToStorage(config: InstanceConfig): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('[InstanceConfig] Failed to save to storage:', e)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const InstanceConfigContext = createContext<InstanceConfigContextValue | null>(null)

export function InstanceConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<InstanceConfig>(DEFAULT_INSTANCE_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Load config on mount
  useEffect(() => {
    const loaded = loadFromStorage()
    setConfigState(loaded)
    setIsLoaded(true)
  }, [])
  
  const setConfig = useCallback((partial: Partial<InstanceConfig>) => {
    setConfigState(prev => {
      const updated = { ...prev, ...partial }
      saveToStorage(updated)
      return updated
    })
  }, [])
  
  const resetToDefaults = useCallback(() => {
    const envConfig = getEnvConfig()
    const defaults = { ...DEFAULT_INSTANCE_CONFIG, ...envConfig }
    setConfigState(defaults)
    saveToStorage(defaults)
  }, [])
  
  // "Quarry" is always the brand prefix, codexName is the customizable suffix
  const displayName = config.showCodexSuffix
    ? `Quarry ${config.codexName}`
    : 'Quarry'
    
  const isCustomized = config.codexName !== 'Codex' || 
    config.tagline !== DEFAULT_INSTANCE_CONFIG.tagline ||
    !!config.suffixColor ||
    !!config.iconUrl
  
  const value: InstanceConfigContextValue = {
    config,
    setConfig,
    resetToDefaults,
    displayName,
    brandName: 'Quarry', // Brand name
    codexName: config.codexName,
    isCustomized,
    isLoaded,
  }
  
  // Don't render children until config is loaded to avoid flash
  if (!isLoaded) {
    return null
  }
  
  return (
    <InstanceConfigContext.Provider value={value}>
      {children}
    </InstanceConfigContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to access instance configuration
 */
export function useInstanceConfig(): InstanceConfigContextValue {
  const context = useContext(InstanceConfigContext)
  
  // Fallback for components outside provider
  if (!context) {
    return {
      config: DEFAULT_INSTANCE_CONFIG,
      setConfig: () => {},
      resetToDefaults: () => {},
      displayName: 'Quarry Codex',
      brandName: 'Quarry',
      codexName: 'Codex',
      isCustomized: false,
      isLoaded: false,
    }
  }
  
  return context
}

/**
 * Get instance config synchronously (for SSR or non-React contexts)
 */
export function getInstanceConfig(): InstanceConfig {
  return loadFromStorage()
}

/**
 * Get full display name synchronously
 */
export function getDisplayName(): string {
  const config = loadFromStorage()
  return config.showCodexSuffix ? `Quarry ${config.codexName}` : 'Quarry'
}

