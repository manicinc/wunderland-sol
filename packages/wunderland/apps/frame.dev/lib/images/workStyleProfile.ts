/**
 * Work Style Profile System
 * @module lib/images/workStyleProfile
 *
 * Manages illustration style profiles for PDF/EPUB works.
 * Extends StyleMemory for work-specific configuration.
 */

import type { CharacterDefinition, SettingDefinition } from './styleMemory'
import type { IllustrationPreset } from './illustrationPresets'

// Re-export types for convenience
export type { CharacterDefinition, SettingDefinition }

/**
 * Content analysis result from LLM/NLP
 */
export interface ContentAnalysis {
  genre: string
  contentType: 'fiction' | 'non-fiction' | 'technical' | 'educational' | 'mixed'
  targetAudience: string
  narrativeStyle?: string
  mood?: string
  keyThemes: string[]
  confidence: number
  method: 'claude' | 'openai' | 'nlp'
}

/**
 * Color palette for illustrations
 */
export interface ColorPalette {
  primary: string[] // Hex colors
  accent: string[]  // Hex colors
  mood: string      // Description
  source: 'auto-detected' | 'user-selected'
}

/**
 * Reference image for consistency
 */
export interface ReferenceImage {
  id: string
  type: 'character' | 'setting' | 'style'
  entityId?: string // Character/setting ID if applicable
  imageUrl: string
  dataUrl?: string  // Base64 for persistence
  seed?: number
  generatedAt: Date
}

/**
 * Illustration preset configuration for a work
 */
export interface WorkIllustrationPreset {
  presetId: string
  customizations?: {
    promptPrefix?: string
    promptSuffix?: string
    negativePrompt?: string
    colorTreatment?: IllustrationPreset['colorTreatment']
    detailLevel?: IllustrationPreset['detailLevel']
  }
  userModified: boolean
}

/**
 * Complete style profile for a PDF/EPUB work
 */
export interface WorkStyleProfile {
  // Identity
  workId: string
  workTitle: string
  workType: 'pdf' | 'epub'
  uploadedAt: Date

  // Content analysis
  analysis: ContentAnalysis

  // Illustration style
  illustrationPreset: WorkIllustrationPreset

  // Entities (characters, settings)
  characters: CharacterDefinition[]
  settings: SettingDefinition[]

  // Visual identity
  colorPalette: ColorPalette

  // Consistency strategy
  consistencyStrategy: 'seed' | 'reference' | 'style-transfer'
  masterSeed?: number
  referenceImages: ReferenceImage[]

  // Metadata
  totalChunks: number
  illustrationsGenerated: number
  lastUpdated: Date

  // Source info (optional)
  sourceFile?: {
    filename: string
    size: number
    pageCount?: number
  }
}

/**
 * Style suggestions for user review
 */
export interface StyleSuggestions {
  recommendedPresetId: string
  reasoning: string
  alternativePresets: string[]
  suggestedColorPalette: ColorPalette
  suggestedConsistencyStrategy: 'seed' | 'reference' | 'style-transfer'
  confidence: number
}

/**
 * Create a new work style profile
 */
export function createWorkStyleProfile(
  workId: string,
  workTitle: string,
  workType: 'pdf' | 'epub',
  analysis: ContentAnalysis,
  options?: {
    presetId?: string
    colorPalette?: ColorPalette
    consistencyStrategy?: 'seed' | 'reference' | 'style-transfer'
    characters?: CharacterDefinition[]
    settings?: SettingDefinition[]
    totalChunks?: number
  }
): WorkStyleProfile {
  const now = new Date()

  return {
    workId,
    workTitle,
    workType,
    uploadedAt: now,

    analysis,

    illustrationPreset: {
      presetId: options?.presetId || 'line-art-editorial',
      customizations: undefined,
      userModified: false,
    },

    characters: options?.characters || [],
    settings: options?.settings || [],

    colorPalette: options?.colorPalette || {
      primary: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6'],
      accent: ['#3498DB', '#E74C3C'],
      mood: 'neutral professional',
      source: 'auto-detected',
    },

    consistencyStrategy: options?.consistencyStrategy || 'seed',
    masterSeed: undefined,
    referenceImages: [],

    totalChunks: options?.totalChunks || 0,
    illustrationsGenerated: 0,
    lastUpdated: now,
  }
}

/**
 * Update work style profile
 */
export function updateWorkStyleProfile(
  profile: WorkStyleProfile,
  updates: Partial<WorkStyleProfile>
): WorkStyleProfile {
  return {
    ...profile,
    ...updates,
    lastUpdated: new Date(),
  }
}

/**
 * Add character to profile
 */
export function addCharacterToProfile(
  profile: WorkStyleProfile,
  character: Omit<CharacterDefinition, 'id' | 'seed'> & { id?: string }
): WorkStyleProfile {
  const id = character.id || `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  // Generate deterministic seed from character name
  const seed = hashStringToSeed(profile.workId + '-' + character.name)

  const fullCharacter: CharacterDefinition = {
    ...character,
    id,
    seed,
  }

  const characters = [...profile.characters.filter(c => c.id !== id), fullCharacter]

  return updateWorkStyleProfile(profile, { characters })
}

/**
 * Add setting to profile
 */
export function addSettingToProfile(
  profile: WorkStyleProfile,
  setting: Omit<SettingDefinition, 'id' | 'seed'> & { id?: string }
): WorkStyleProfile {
  const id = setting.id || `setting-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  // Generate deterministic seed from setting name
  const seed = hashStringToSeed(profile.workId + '-' + setting.name)

  const fullSetting: SettingDefinition = {
    ...setting,
    id,
    seed,
  }

  const settings = [...profile.settings.filter(s => s.id !== id), fullSetting]

  return updateWorkStyleProfile(profile, { settings })
}

/**
 * Add reference image to profile
 */
export function addReferenceImage(
  profile: WorkStyleProfile,
  image: Omit<ReferenceImage, 'id' | 'generatedAt'>
): WorkStyleProfile {
  const referenceImage: ReferenceImage = {
    ...image,
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    generatedAt: new Date(),
  }

  const referenceImages = [...profile.referenceImages, referenceImage]

  return updateWorkStyleProfile(profile, { referenceImages })
}

/**
 * Update illustration preset in profile
 */
export function updateIllustrationPreset(
  profile: WorkStyleProfile,
  presetId: string,
  customizations?: WorkIllustrationPreset['customizations']
): WorkStyleProfile {
  return updateWorkStyleProfile(profile, {
    illustrationPreset: {
      presetId,
      customizations,
      userModified: !!customizations || profile.illustrationPreset.presetId !== presetId,
    },
  })
}

/**
 * Increment illustration count
 */
export function incrementIllustrationCount(profile: WorkStyleProfile): WorkStyleProfile {
  return updateWorkStyleProfile(profile, {
    illustrationsGenerated: profile.illustrationsGenerated + 1,
  })
}

/**
 * Serialize profile to JSON
 */
export function serializeWorkStyleProfile(profile: WorkStyleProfile): string {
  return JSON.stringify(profile)
}

/**
 * Deserialize profile from JSON
 */
export function deserializeWorkStyleProfile(json: string): WorkStyleProfile {
  const data = JSON.parse(json)
  return {
    ...data,
    uploadedAt: new Date(data.uploadedAt),
    lastUpdated: new Date(data.lastUpdated),
    referenceImages: data.referenceImages?.map((ri: { generatedAt: string }) => ({
      ...ri,
      generatedAt: new Date(ri.generatedAt),
    })) || [],
  }
}

/**
 * Hash string to seed number (deterministic)
 */
function hashStringToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Check if profile is complete (has minimum required data)
 */
export function isProfileComplete(profile: WorkStyleProfile): boolean {
  return !!(
    profile.workId &&
    profile.workTitle &&
    profile.illustrationPreset?.presetId &&
    profile.analysis?.contentType
  )
}

/**
 * Get profile summary for display
 */
export function getProfileSummary(profile: WorkStyleProfile): {
  title: string
  preset: string
  characterCount: number
  settingCount: number
  illustrationCount: number
  confidence: number
} {
  return {
    title: profile.workTitle,
    preset: profile.illustrationPreset.presetId,
    characterCount: profile.characters.length,
    settingCount: profile.settings.length,
    illustrationCount: profile.illustrationsGenerated,
    confidence: profile.analysis.confidence,
  }
}
