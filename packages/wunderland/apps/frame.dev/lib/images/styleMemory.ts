/**
 * Style Memory System
 * @module lib/images/styleMemory
 *
 * Manages character and setting consistency across generated images.
 * Supports three consistency strategies:
 * - Seed-based: Same seed + similar prompt = similar appearance
 * - Reference-based: Generate character sheet, use as reference
 * - Style transfer: First image sets the style for subsequent images
 */

import { getStyle, type VisualizationStyle } from '../visualization/presets'

export interface CharacterDefinition {
  /** Unique character ID */
  id: string
  /** Character name */
  name: string
  /** Detailed description */
  description: string
  /** Visual traits for consistent appearance */
  visualTraits: string[]
  /** Age description */
  age?: string
  /** Gender */
  gender?: string
  /** Fixed seed for this character (seed strategy) */
  seed?: number
  /** Reference image URL (reference strategy) */
  referenceImage?: string
  /** Style profile ID (style transfer strategy) */
  styleProfileId?: string
  /** Additional prompt modifiers */
  promptModifiers?: string[]
}

export interface SettingDefinition {
  /** Unique setting ID */
  id: string
  /** Setting name */
  name: string
  /** Detailed description */
  description: string
  /** Visual style keywords */
  visualStyle: string[]
  /** Time period */
  timePeriod?: string
  /** Mood/atmosphere */
  mood?: string
  /** Color palette keywords */
  colorPalette?: string[]
  /** Fixed seed for this setting */
  seed?: number
}

export interface GlobalStyle {
  /** Linked visualization preset ID */
  presetId?: string
  /** Custom visualization style */
  customStyle?: Partial<VisualizationStyle>
  /** Custom prompt prefix */
  promptPrefix?: string
  /** Custom prompt suffix */
  promptSuffix?: string
  /** Negative prompt (things to avoid) */
  negativePrompt?: string
  /** Consistency strategy */
  consistencyStrategy: 'seed' | 'reference' | 'style-transfer'
  /** Master seed (for seed strategy) */
  masterSeed?: number
}

export interface CharacterMemory {
  /** Project/book ID */
  projectId: string
  /** Project title */
  projectTitle: string
  /** Characters in this project */
  characters: CharacterDefinition[]
  /** Settings/locations in this project */
  settings: SettingDefinition[]
  /** Global style configuration */
  globalStyle: GlobalStyle
  /** Generated reference images */
  referenceImages: {
    characterId?: string
    settingId?: string
    imageUrl: string
    seed?: number
    createdAt: Date
  }[]
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
}

/**
 * Style Memory Manager
 * Handles character/setting persistence and prompt building
 */
export class StyleMemory {
  private memory: CharacterMemory

  constructor(projectId: string, projectTitle: string) {
    this.memory = {
      projectId,
      projectTitle,
      characters: [],
      settings: [],
      globalStyle: {
        consistencyStrategy: 'seed',
      },
      referenceImages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Load memory from JSON
   */
  static fromJSON(json: string | CharacterMemory): StyleMemory {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const instance = new StyleMemory(data.projectId, data.projectTitle)
    instance.memory = {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      referenceImages: data.referenceImages?.map((ri: { createdAt: string | Date }) => ({
        ...ri,
        createdAt: new Date(ri.createdAt),
      })) || [],
    }
    return instance
  }

  /**
   * Export memory to JSON
   */
  toJSON(): CharacterMemory {
    return { ...this.memory }
  }

  /**
   * Add or update a character
   */
  addCharacter(character: Omit<CharacterDefinition, 'id'> & { id?: string }): CharacterDefinition {
    const id = character.id || `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const existingIndex = this.memory.characters.findIndex(c => c.id === id)

    const charDef: CharacterDefinition = {
      ...character,
      id,
      // Generate a seed if using seed strategy and none provided
      seed: character.seed ?? (this.memory.globalStyle.consistencyStrategy === 'seed'
        ? this.generateCharacterSeed(character.name)
        : undefined),
    }

    if (existingIndex >= 0) {
      this.memory.characters[existingIndex] = charDef
    } else {
      this.memory.characters.push(charDef)
    }

    this.memory.updatedAt = new Date()
    return charDef
  }

  /**
   * Add or update a setting
   */
  addSetting(setting: Omit<SettingDefinition, 'id'> & { id?: string }): SettingDefinition {
    const id = setting.id || `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const existingIndex = this.memory.settings.findIndex(s => s.id === id)

    const settingDef: SettingDefinition = {
      ...setting,
      id,
      seed: setting.seed ?? (this.memory.globalStyle.consistencyStrategy === 'seed'
        ? this.generateSettingSeed(setting.name)
        : undefined),
    }

    if (existingIndex >= 0) {
      this.memory.settings[existingIndex] = settingDef
    } else {
      this.memory.settings.push(settingDef)
    }

    this.memory.updatedAt = new Date()
    return settingDef
  }

  /**
   * Set global style configuration
   */
  setGlobalStyle(style: Partial<GlobalStyle>) {
    this.memory.globalStyle = {
      ...this.memory.globalStyle,
      ...style,
    }
    this.memory.updatedAt = new Date()
  }

  /**
   * Add a reference image
   */
  addReferenceImage(params: {
    characterId?: string
    settingId?: string
    imageUrl: string
    seed?: number
  }) {
    this.memory.referenceImages.push({
      ...params,
      createdAt: new Date(),
    })
    this.memory.updatedAt = new Date()
  }

  /**
   * Get a character by ID or name
   */
  getCharacter(idOrName: string): CharacterDefinition | undefined {
    return this.memory.characters.find(
      c => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase()
    )
  }

  /**
   * Get a setting by ID or name
   */
  getSetting(idOrName: string): SettingDefinition | undefined {
    return this.memory.settings.find(
      s => s.id === idOrName || s.name.toLowerCase() === idOrName.toLowerCase()
    )
  }

  /**
   * Build a prompt for a scene with consistent characters/settings
   */
  buildScenePrompt(params: {
    sceneDescription: string
    characterNames?: string[]
    settingName?: string
    additionalDetails?: string
  }): {
    prompt: string
    seed?: number
    referenceImage?: string
  } {
    const parts: string[] = []
    let seed: number | undefined
    let referenceImage: string | undefined

    const presetStyle = this.memory.globalStyle.presetId ? getStyle(this.memory.globalStyle.presetId) : undefined

    // Add global style prefix (explicit overrides preset)
    const prefix = this.memory.globalStyle.promptPrefix || presetStyle?.promptPrefix
    if (prefix) {
      parts.push(prefix)
    }

    // Add setting context
    if (params.settingName) {
      const setting = this.getSetting(params.settingName)
      if (setting) {
        parts.push(`Setting: ${setting.description}`)
        if (setting.visualStyle.length > 0) {
          parts.push(`Visual style: ${setting.visualStyle.join(', ')}`)
        }
        if (setting.mood) {
          parts.push(`Mood: ${setting.mood}`)
        }
        if (setting.seed !== undefined && !seed) {
          seed = setting.seed
        }
      }
    }

    // Add character descriptions
    if (params.characterNames && params.characterNames.length > 0) {
      const characterDescriptions: string[] = []

      for (const name of params.characterNames) {
        const char = this.getCharacter(name)
        if (char) {
          const charDesc = [
            char.name,
            char.description,
            ...char.visualTraits,
          ].filter(Boolean).join(', ')
          characterDescriptions.push(charDesc)

          // Use character's seed if no seed set yet
          if (char.seed !== undefined && !seed) {
            seed = char.seed
          }

          // Use character's reference image
          if (char.referenceImage && !referenceImage) {
            referenceImage = char.referenceImage
          }
        }
      }

      if (characterDescriptions.length > 0) {
        parts.push(`Characters: ${characterDescriptions.join('; ')}`)
      }
    }

    // Add scene description
    parts.push(params.sceneDescription)

    // Add additional details
    if (params.additionalDetails) {
      parts.push(params.additionalDetails)
    }

    // Add global style suffix (explicit overrides preset)
    const suffix = this.memory.globalStyle.promptSuffix || presetStyle?.promptSuffix
    if (suffix) {
      parts.push(suffix)
    }

    // Use master seed if no specific seed
    if (!seed && this.memory.globalStyle.masterSeed) {
      seed = this.memory.globalStyle.masterSeed
    }

    return {
      prompt: parts.filter(Boolean).join('\n\n'),
      seed,
      referenceImage,
    }
  }

  /**
   * Generate a deterministic seed from a name
   * This ensures the same character always gets the same seed
   */
  private generateCharacterSeed(name: string): number {
    let hash = 0
    const str = `${this.memory.projectId}-char-${name.toLowerCase()}`
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Generate a deterministic seed from a setting name
   */
  private generateSettingSeed(name: string): number {
    let hash = 0
    const str = `${this.memory.projectId}-set-${name.toLowerCase()}`
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  /**
   * Get all characters
   */
  getAllCharacters(): CharacterDefinition[] {
    return [...this.memory.characters]
  }

  /**
   * Get all settings
   */
  getAllSettings(): SettingDefinition[] {
    return [...this.memory.settings]
  }

  /**
   * Get the global style
   */
  getGlobalStyle(): GlobalStyle {
    return { ...this.memory.globalStyle }
  }

  /**
   * Get project info
   */
  getProjectInfo() {
    return {
      projectId: this.memory.projectId,
      projectTitle: this.memory.projectTitle,
      characterCount: this.memory.characters.length,
      settingCount: this.memory.settings.length,
      referenceImageCount: this.memory.referenceImages.length,
      createdAt: this.memory.createdAt,
      updatedAt: this.memory.updatedAt,
    }
  }
}

/**
 * Create default character memory for 1984
 */
export function create1984CharacterMemory(): StyleMemory {
  const memory = new StyleMemory('1984-orwell', '1984 by George Orwell')

  // Set global style
  memory.setGlobalStyle({
    consistencyStrategy: 'seed',
    masterSeed: 198419841984,
    promptPrefix: 'Dystopian illustration in the style of 1940s propaganda posters mixed with noir photography.',
    promptSuffix: 'Muted color palette dominated by grays, browns, and washed-out blues. Oppressive atmosphere, surveillance state aesthetic. Industrial, brutalist architecture. Dramatic lighting with harsh shadows.',
    negativePrompt: 'bright colors, cheerful, modern technology, smartphones, happy, colorful',
  })

  // Add main characters
  memory.addCharacter({
    name: 'Winston Smith',
    description: 'A 39-year-old man with a varicose ulcer on his right ankle, a small, frail figure with fair hair and a naturally sanguine face roughened by coarse soap and blunt razor blades',
    visualTraits: [
      'thin and frail',
      'fair hair',
      'pale, weathered face',
      'blue overalls (Party uniform)',
      'haunted, weary expression',
      'late 30s appearance',
    ],
    age: '39',
    gender: 'male',
  })

  memory.addCharacter({
    name: 'Julia',
    description: 'A bold, dark-haired girl of about 26-27, with a thick dark hair, freckled face, and athletic build from working in the Fiction Department',
    visualTraits: [
      'dark hair',
      'freckled face',
      'athletic build',
      'mid-20s',
      'bright, defiant eyes',
      'red sash of the Junior Anti-Sex League',
    ],
    age: '26-27',
    gender: 'female',
  })

  memory.addCharacter({
    name: "O'Brien",
    description: 'A large, burly man with a thick neck and coarse, humorous, brutal face. Member of the Inner Party.',
    visualTraits: [
      'large and burly',
      'thick neck',
      'coarse features',
      'black Inner Party uniform',
      'intelligent, penetrating gaze',
      'middle-aged',
    ],
    gender: 'male',
  })

  memory.addCharacter({
    name: 'Big Brother',
    description: 'The face of the Party - a man of about 45 with heavy black mustache and ruggedly handsome features',
    visualTraits: [
      'heavy black mustache',
      'about 45 years old',
      'ruggedly handsome',
      'stern, watchful expression',
      'propaganda poster style',
      'larger than life presence',
    ],
    age: '45',
    gender: 'male',
  })

  // Add settings
  memory.addSetting({
    name: 'Victory Mansions',
    description: 'A run-down apartment building with gritty hallways that smell of boiled cabbage and old rag mats. Telescreen in every room.',
    visualStyle: [
      'decrepit apartment building',
      'peeling paint',
      'dim corridors',
      'telescreen on wall',
      'sparse furnishings',
    ],
    mood: 'oppressive, surveilled, decaying',
    timePeriod: '1984 (alternate history)',
  })

  memory.addSetting({
    name: 'Ministry of Truth',
    description: 'An enormous pyramidal structure of glittering white concrete, soaring up 300 meters. One of the four ministries that dominate London.',
    visualStyle: [
      'massive white pyramid',
      'brutalist architecture',
      'imposing scale',
      'slogans on walls',
      'endless corridors',
    ],
    mood: 'intimidating, totalitarian, monolithic',
    timePeriod: '1984 (alternate history)',
  })

  memory.addSetting({
    name: 'Room 101',
    description: 'The torture chamber in the Ministry of Love. A bright, windowless room with white porcelain walls and harsh lighting.',
    visualStyle: [
      'clinical white room',
      'harsh fluorescent lighting',
      'no windows',
      'metal chair in center',
      'sterile and terrifying',
    ],
    mood: 'terrifying, clinical, hopeless',
    timePeriod: '1984 (alternate history)',
  })

  memory.addSetting({
    name: 'The Golden Country',
    description: "Winston's recurring dream - an idyllic pastoral landscape with a stream, willows, and green meadows",
    visualStyle: [
      'pastoral English countryside',
      'flowing stream',
      'willow trees',
      'green meadows',
      'golden sunlight',
      'dreamlike quality',
    ],
    mood: 'peaceful, nostalgic, dreamlike',
    colorPalette: ['golden', 'green', 'blue sky', 'warm'],
  })

  return memory
}

/**
 * WORK PROFILE INTEGRATION
 * Functions to convert between WorkStyleProfile and StyleMemory
 */

/**
 * Create StyleMemory from WorkStyleProfile
 */
export function fromWorkProfile(profile: any): StyleMemory {
  const memory = new StyleMemory(profile.workId, profile.workTitle)

  // Set global style from profile
  memory.setGlobalStyle({
    promptPrefix: profile.illustrationPreset.customizations?.promptPrefix,
    promptSuffix: profile.illustrationPreset.customizations?.promptSuffix,
    negativePrompt: profile.illustrationPreset.customizations?.negativePrompt,
    consistencyStrategy: profile.consistencyStrategy,
    masterSeed: profile.masterSeed,
  })

  // Add characters from profile
  for (const char of profile.characters) {
    memory.addCharacter(char)
  }

  // Add settings from profile
  for (const setting of profile.settings) {
    memory.addSetting(setting)
  }

  // Add reference images
  for (const refImage of profile.referenceImages) {
    memory.addReferenceImage({
      characterId: refImage.type === 'character' ? refImage.entityId : undefined,
      settingId: refImage.type === 'setting' ? refImage.entityId : undefined,
      imageUrl: refImage.imageUrl,
      seed: refImage.seed,
    })
  }

  return memory
}

/**
 * Export StyleMemory to WorkStyleProfile format
 */
export function toWorkProfileData(memory: StyleMemory): {
  characters: CharacterDefinition[]
  settings: SettingDefinition[]
  consistencyStrategy: 'seed' | 'reference' | 'style-transfer'
  masterSeed?: number
  referenceImages: any[]
  promptCustomizations?: {
    promptPrefix?: string
    promptSuffix?: string
    negativePrompt?: string
  }
} {
  const memoryData = memory.toJSON()

  return {
    characters: memoryData.characters,
    settings: memoryData.settings,
    consistencyStrategy: memoryData.globalStyle.consistencyStrategy,
    masterSeed: memoryData.globalStyle.masterSeed,
    referenceImages: memoryData.referenceImages.map(ri => ({
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: ri.characterId ? 'character' : ri.settingId ? 'setting' : 'style',
      entityId: ri.characterId || ri.settingId,
      imageUrl: ri.imageUrl,
      seed: ri.seed,
      generatedAt: ri.createdAt,
    })),
    promptCustomizations: {
      promptPrefix: memoryData.globalStyle.promptPrefix,
      promptSuffix: memoryData.globalStyle.promptSuffix,
      negativePrompt: memoryData.globalStyle.negativePrompt,
    },
  }
}
