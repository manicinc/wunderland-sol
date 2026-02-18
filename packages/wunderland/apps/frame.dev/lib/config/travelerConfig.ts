/**
 * Traveler (User) Configuration
 * 
 * Allows customization of the user display name (default: "Traveler")
 * Similar to how Fabric instance name can be customized.
 * 
 * Backend-specific behavior:
 * - SQLite/Local: Can be changed anytime by anyone with access
 * - GitHub backend: Requires PAT with write permissions to update
 * 
 * @module lib/config/travelerConfig
 */

import { getLocalStorage, setLocalStorage } from '@/lib/localStorage'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TravelerConfig {
  /** Display name (default: "Traveler") */
  name: string
  /** Optional title/role (e.g., "Knowledge Keeper", "Student", "Researcher") */
  title?: string
  /** Avatar URL (base64 data URL or external URL) */
  avatarUrl?: string
  /** Accent color for personalization (hex) */
  accentColor?: string
  /** When profile was created */
  createdAt?: string
  /** Last updated */
  updatedAt?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const LOCAL_STORAGE_KEY = 'fabric-traveler-config'

export const DEFAULT_TRAVELER_CONFIG: TravelerConfig = {
  name: 'Traveler',
  title: 'Knowledge Seeker',
  accentColor: '#8b5cf6', // violet-500
}

/**
 * Preset traveler names with titles
 */
export const PRESET_TRAVELERS = [
  { name: 'Traveler', title: 'Knowledge Seeker', icon: '🧭', description: 'Default explorer of knowledge' },
  { name: 'Scholar', title: 'Academic', icon: '📚', description: 'Dedicated to deep learning' },
  { name: 'Researcher', title: 'Investigator', icon: '🔬', description: 'Evidence-based discovery' },
  { name: 'Creator', title: 'Builder', icon: '🛠️', description: 'Making ideas real' },
  { name: 'Student', title: 'Learner', icon: '🎓', description: 'Growing every day' },
  { name: 'Writer', title: 'Wordsmith', icon: '✍️', description: 'Crafting narratives' },
  { name: 'Thinker', title: 'Philosopher', icon: '💭', description: 'Contemplating ideas' },
  { name: 'Explorer', title: 'Adventurer', icon: '🗺️', description: 'Discovering new territories' },
  { name: 'Curator', title: 'Collector', icon: '🏛️', description: 'Organizing knowledge' },
  { name: 'Mentor', title: 'Guide', icon: '🌟', description: 'Sharing wisdom' },
]

/**
 * Preset accent colors for traveler personalization
 */
export const TRAVELER_ACCENT_COLORS = [
  { name: 'Violet', value: '#8b5cf6', class: 'bg-violet-500' },
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500' },
  { name: 'Teal', value: '#14b8a6', class: 'bg-teal-500' },
  { name: 'Emerald', value: '#10b981', class: 'bg-emerald-500' },
  { name: 'Amber', value: '#f59e0b', class: 'bg-amber-500' },
  { name: 'Rose', value: '#f43f5e', class: 'bg-rose-500' },
  { name: 'Purple', value: '#a855f7', class: 'bg-purple-500' },
  { name: 'Pink', value: '#ec4899', class: 'bg-pink-500' },
]

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current traveler configuration.
 * Priority: Local Storage > Environment Variables > Default
 */
export function getTravelerConfig(): TravelerConfig {
  // 1. Check local storage for user preferences
  const storedConfig = getLocalStorage<TravelerConfig>(LOCAL_STORAGE_KEY)
  if (storedConfig) {
    return { ...DEFAULT_TRAVELER_CONFIG, ...storedConfig }
  }

  // 2. Check environment variables for deployment-specific settings
  const envName = process.env.NEXT_PUBLIC_FABRIC_TRAVELER_NAME
  const envTitle = process.env.NEXT_PUBLIC_FABRIC_TRAVELER_TITLE
  const envAccentColor = process.env.NEXT_PUBLIC_FABRIC_TRAVELER_ACCENT_COLOR

  if (envName || envTitle || envAccentColor) {
    return {
      name: envName || DEFAULT_TRAVELER_CONFIG.name,
      title: envTitle || DEFAULT_TRAVELER_CONFIG.title,
      accentColor: envAccentColor || DEFAULT_TRAVELER_CONFIG.accentColor,
    }
  }

  // 3. Fallback to default
  return DEFAULT_TRAVELER_CONFIG
}

/**
 * Set the traveler configuration in local storage.
 */
export function setTravelerConfig(config: Partial<TravelerConfig>): void {
  const currentConfig = getTravelerConfig()
  const newConfig: TravelerConfig = {
    ...currentConfig,
    ...config,
    updatedAt: new Date().toISOString(),
  }
  
  // Set createdAt if not already set
  if (!newConfig.createdAt) {
    newConfig.createdAt = new Date().toISOString()
  }
  
  setLocalStorage(LOCAL_STORAGE_KEY, newConfig)
}

/**
 * Reset traveler configuration to defaults.
 */
export function resetTravelerConfig(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  }
}

/**
 * Get greeting based on time of day and traveler name
 */
export function getTravelerGreeting(name?: string): string {
  const hour = new Date().getHours()
  const travelerName = name || getTravelerConfig().name
  
  if (hour < 12) {
    return `Good morning, ${travelerName}`
  } else if (hour < 17) {
    return `Good afternoon, ${travelerName}`
  } else {
    return `Good evening, ${travelerName}`
  }
}

/**
 * Check if traveler can edit config (depends on backend)
 */
export function canEditTravelerConfig(backendType: 'local' | 'github' | 'hybrid', hasPAT: boolean): {
  canEdit: boolean
  reason?: string
} {
  switch (backendType) {
    case 'local':
      return { canEdit: true }
    
    case 'github':
      if (hasPAT) {
        return { canEdit: true }
      }
      return {
        canEdit: false,
        reason: 'GitHub backend requires a Personal Access Token (PAT) with write permissions to update your profile. Add your PAT in Settings → GitHub Integration.',
      }
    
    case 'hybrid':
      return { canEdit: true }
    
    default:
      return { canEdit: true }
  }
}



