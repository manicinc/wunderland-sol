/**
 * Ambience Settings
 * @module lib/write/ambienceSettings
 *
 * User preferences for ambient soundscapes in the Write section.
 * Controls soundscape selection, volume, mood sync, and fade behavior.
 */

import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import type { MoodState } from '@/lib/codex/mood'
import type { SpatialPreset } from '@/lib/audio/spatialAudio'

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'codex-ambience-settings'

// ============================================================================
// TYPES
// ============================================================================

export interface AmbienceSettings {
  /** Whether ambience is enabled */
  enabled: boolean
  /** Current soundscape type */
  soundscape: SoundscapeType
  /** Volume level (0-1) */
  volume: number
  /** Fade in when starting to write */
  autoFadeIn: boolean
  /** Fade in duration in seconds */
  fadeInDuration: number
  /** Auto-select soundscape based on mood */
  moodSync: boolean
  /** Remember last used soundscape */
  rememberLastUsed: boolean
  /** Fade out ambience when timer completes */
  fadeOnTimerComplete: boolean
  /** Timer fade out duration in seconds */
  timerFadeDuration: number
  /** Current preset (null = custom) */
  activePreset: AmbiencePresetId | null
  /** Spatial audio preset for 3D positioning */
  spatialPreset: SpatialPreset
  /** Enable stock sound accents (water drops, bird chirps, etc.) */
  useStockSounds: boolean
  /** Volume multiplier for accent sounds (0-1) */
  accentVolume: number
}

// ============================================================================
// PRESETS
// ============================================================================

export type AmbiencePresetId = 'deep-focus' | 'casual-writing' | 'brainstorm' | 'relaxed'

export interface AmbiencePreset {
  id: AmbiencePresetId
  name: string
  description: string
  icon: string
  settings: Pick<AmbienceSettings, 'soundscape' | 'volume' | 'autoFadeIn' | 'fadeOnTimerComplete'>
}

/**
 * Pre-configured ambience presets
 */
export const AMBIENCE_PRESETS: AmbiencePreset[] = [
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    description: 'Minimal distractions, steady background',
    icon: 'Target',
    settings: {
      soundscape: 'white-noise',
      volume: 0.2,
      autoFadeIn: true,
      fadeOnTimerComplete: true,
    },
  },
  {
    id: 'casual-writing',
    name: 'Casual Writing',
    description: 'Café vibes, creative flow',
    icon: 'Coffee',
    settings: {
      soundscape: 'cafe',
      volume: 0.35,
      autoFadeIn: true,
      fadeOnTimerComplete: false,
    },
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Lo-fi beats for creative thinking',
    icon: 'Sparkles',
    settings: {
      soundscape: 'lofi',
      volume: 0.3,
      autoFadeIn: true,
      fadeOnTimerComplete: false,
    },
  },
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'Nature sounds for calm writing',
    icon: 'Waves',
    settings: {
      soundscape: 'ocean',
      volume: 0.25,
      autoFadeIn: true,
      fadeOnTimerComplete: true,
    },
  },
]

/**
 * Get preset by ID
 */
export function getAmbiencePreset(id: AmbiencePresetId): AmbiencePreset | undefined {
  return AMBIENCE_PRESETS.find(p => p.id === id)
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default ambience settings
 */
export const DEFAULT_AMBIENCE_SETTINGS: AmbienceSettings = {
  enabled: false,
  soundscape: 'rain',
  volume: 0.3,
  autoFadeIn: true,
  fadeInDuration: 3,
  moodSync: false,
  rememberLastUsed: true,
  fadeOnTimerComplete: true,
  timerFadeDuration: 3,
  activePreset: null,
  spatialPreset: 'stereo',
  useStockSounds: true,
  accentVolume: 0.3,
}

// ============================================================================
// MOOD SYNC MAPPING
// ============================================================================

/**
 * Maps mood states to recommended soundscapes
 */
export const MOOD_SOUNDSCAPE_MAP: Record<MoodState, SoundscapeType> = {
  focused: 'lofi',
  creative: 'cafe',
  curious: 'cafe',
  relaxed: 'ocean',
  energetic: 'cafe',
  reflective: 'rain',
  anxious: 'forest',
  grateful: 'fireplace',
  tired: 'rain',
  peaceful: 'ocean',
  excited: 'cafe',
  neutral: 'white-noise',
}

/**
 * Get recommended soundscape for a mood
 */
export function getSoundscapeForMood(mood: MoodState): SoundscapeType {
  return MOOD_SOUNDSCAPE_MAP[mood] || 'rain'
}

// ============================================================================
// SETTINGS CRUD
// ============================================================================

/**
 * Get current ambience settings
 */
export function getAmbienceSettings(): AmbienceSettings {
  if (typeof window === 'undefined') return DEFAULT_AMBIENCE_SETTINGS

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_AMBIENCE_SETTINGS
    return { ...DEFAULT_AMBIENCE_SETTINGS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_AMBIENCE_SETTINGS
  }
}

/**
 * Save ambience settings
 */
export function saveAmbienceSettings(settings: Partial<AmbienceSettings>): void {
  if (typeof window === 'undefined') return

  const current = getAmbienceSettings()
  const updated = { ...current, ...settings }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('[AmbienceSettings] Failed to save:', error)
  }
}

/**
 * Reset to default settings
 */
export function resetAmbienceSettings(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('[AmbienceSettings] Failed to reset:', error)
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react'

export interface UseAmbienceSettingsReturn {
  settings: AmbienceSettings
  isLoading: boolean
  setSetting: <K extends keyof AmbienceSettings>(key: K, value: AmbienceSettings[K]) => void
  setSettings: (updates: Partial<AmbienceSettings>) => void
  resetToDefaults: () => void
  applyPreset: (presetId: AmbiencePresetId) => void
  clearPreset: () => void
}

/**
 * React hook for ambience settings
 */
export function useAmbienceSettings(): UseAmbienceSettingsReturn {
  const [settings, setSettingsState] = useState<AmbienceSettings>(DEFAULT_AMBIENCE_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings on mount
  useEffect(() => {
    setSettingsState(getAmbienceSettings())
    setIsLoading(false)
  }, [])

  const setSetting = useCallback(<K extends keyof AmbienceSettings>(
    key: K,
    value: AmbienceSettings[K]
  ) => {
    setSettingsState(prev => {
      const updated = { ...prev, [key]: value }
      saveAmbienceSettings({ [key]: value })
      return updated
    })
  }, [])

  const setSettings = useCallback((updates: Partial<AmbienceSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...updates }
      saveAmbienceSettings(updates)
      return updated
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    resetAmbienceSettings()
    setSettingsState(DEFAULT_AMBIENCE_SETTINGS)
  }, [])

  const applyPreset = useCallback((presetId: AmbiencePresetId) => {
    const preset = getAmbiencePreset(presetId)
    if (!preset) return

    const updates = {
      ...preset.settings,
      activePreset: presetId,
    }
    setSettingsState(prev => {
      const updated = { ...prev, ...updates }
      saveAmbienceSettings(updates)
      return updated
    })
  }, [])

  const clearPreset = useCallback(() => {
    setSetting('activePreset', null)
  }, [setSetting])

  return {
    settings,
    isLoading,
    setSetting,
    setSettings,
    resetToDefaults,
    applyPreset,
    clearPreset,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getAmbienceSettings,
  saveAmbienceSettings,
  resetAmbienceSettings,
  getSoundscapeForMood,
  getAmbiencePreset,
  useAmbienceSettings,
  MOOD_SOUNDSCAPE_MAP,
  DEFAULT_AMBIENCE_SETTINGS,
  AMBIENCE_PRESETS,
}
