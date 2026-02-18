/**
 * Style Memory Tests
 * @module __tests__/unit/lib/images/styleMemory.test
 *
 * Tests for character and setting consistency across generated images.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  StyleMemory,
  create1984CharacterMemory,
  fromWorkProfile,
  toWorkProfileData,
  type CharacterDefinition,
  type SettingDefinition,
  type GlobalStyle,
  type CharacterMemory,
} from '@/lib/images/styleMemory'

// Mock the visualization presets
vi.mock('@/lib/visualization/presets', () => ({
  getStyle: vi.fn((id: string) => {
    if (id === 'test-preset') {
      return {
        id: 'test-preset',
        promptPrefix: 'Preset prefix:',
        promptSuffix: 'Preset suffix.',
      }
    }
    return undefined
  }),
}))

describe('Style Memory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // CharacterDefinition type
  // ============================================================================

  describe('CharacterDefinition type', () => {
    it('can create full character definition', () => {
      const character: CharacterDefinition = {
        id: 'char-1',
        name: 'Test Character',
        description: 'A test character for testing',
        visualTraits: ['tall', 'dark hair', 'blue eyes'],
        age: '30',
        gender: 'male',
        seed: 12345,
        referenceImage: 'http://example.com/image.jpg',
        styleProfileId: 'profile-1',
        promptModifiers: ['dramatic lighting'],
      }

      expect(character.id).toBe('char-1')
      expect(character.visualTraits).toHaveLength(3)
    })

    it('can create minimal character definition', () => {
      const character: CharacterDefinition = {
        id: 'char-2',
        name: 'Minimal Character',
        description: 'A minimal character',
        visualTraits: [],
      }

      expect(character.id).toBe('char-2')
      expect(character.age).toBeUndefined()
    })
  })

  // ============================================================================
  // SettingDefinition type
  // ============================================================================

  describe('SettingDefinition type', () => {
    it('can create full setting definition', () => {
      const setting: SettingDefinition = {
        id: 'set-1',
        name: 'Test Setting',
        description: 'A test setting for testing',
        visualStyle: ['dark', 'moody', 'atmospheric'],
        timePeriod: 'modern',
        mood: 'tense',
        colorPalette: ['gray', 'blue', 'black'],
        seed: 67890,
      }

      expect(setting.id).toBe('set-1')
      expect(setting.visualStyle).toHaveLength(3)
    })

    it('can create minimal setting definition', () => {
      const setting: SettingDefinition = {
        id: 'set-2',
        name: 'Minimal Setting',
        description: 'A minimal setting',
        visualStyle: [],
      }

      expect(setting.id).toBe('set-2')
      expect(setting.mood).toBeUndefined()
    })
  })

  // ============================================================================
  // GlobalStyle type
  // ============================================================================

  describe('GlobalStyle type', () => {
    it('can create full global style', () => {
      const style: GlobalStyle = {
        presetId: 'test-preset',
        customStyle: { name: 'Custom' },
        promptPrefix: 'Start with this:',
        promptSuffix: 'End with this.',
        negativePrompt: 'avoid this',
        consistencyStrategy: 'seed',
        masterSeed: 123456789,
      }

      expect(style.consistencyStrategy).toBe('seed')
      expect(style.masterSeed).toBe(123456789)
    })

    it('supports all consistency strategies', () => {
      const strategies: GlobalStyle['consistencyStrategy'][] = ['seed', 'reference', 'style-transfer']

      strategies.forEach((strategy) => {
        const style: GlobalStyle = {
          consistencyStrategy: strategy,
        }
        expect(style.consistencyStrategy).toBe(strategy)
      })
    })
  })

  // ============================================================================
  // StyleMemory constructor
  // ============================================================================

  describe('StyleMemory constructor', () => {
    it('creates new instance with project info', () => {
      const memory = new StyleMemory('project-1', 'Test Project')
      const info = memory.getProjectInfo()

      expect(info.projectId).toBe('project-1')
      expect(info.projectTitle).toBe('Test Project')
      expect(info.characterCount).toBe(0)
      expect(info.settingCount).toBe(0)
    })

    it('initializes with default global style', () => {
      const memory = new StyleMemory('project-1', 'Test Project')
      const style = memory.getGlobalStyle()

      expect(style.consistencyStrategy).toBe('seed')
    })
  })

  // ============================================================================
  // StyleMemory.fromJSON
  // ============================================================================

  describe('StyleMemory.fromJSON', () => {
    it('loads memory from JSON string', () => {
      const json = JSON.stringify({
        projectId: 'loaded-project',
        projectTitle: 'Loaded Project',
        characters: [{ id: 'char-1', name: 'Test', description: 'Test', visualTraits: [] }],
        settings: [],
        globalStyle: { consistencyStrategy: 'reference' },
        referenceImages: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-10T00:00:00Z',
      })

      const memory = StyleMemory.fromJSON(json)
      const info = memory.getProjectInfo()

      expect(info.projectId).toBe('loaded-project')
      expect(info.characterCount).toBe(1)
    })

    it('loads memory from object', () => {
      const data: CharacterMemory = {
        projectId: 'obj-project',
        projectTitle: 'Object Project',
        characters: [],
        settings: [{ id: 'set-1', name: 'Test', description: 'Test', visualStyle: [] }],
        globalStyle: { consistencyStrategy: 'seed' },
        referenceImages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const memory = StyleMemory.fromJSON(data)
      const info = memory.getProjectInfo()

      expect(info.projectId).toBe('obj-project')
      expect(info.settingCount).toBe(1)
    })

    it('converts date strings to Date objects', () => {
      const json = JSON.stringify({
        projectId: 'date-project',
        projectTitle: 'Date Project',
        characters: [],
        settings: [],
        globalStyle: { consistencyStrategy: 'seed' },
        referenceImages: [
          { imageUrl: 'http://example.com/img.jpg', createdAt: '2025-01-05T00:00:00Z' },
        ],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-10T00:00:00Z',
      })

      const memory = StyleMemory.fromJSON(json)
      const info = memory.getProjectInfo()

      expect(info.createdAt instanceof Date).toBe(true)
    })
  })

  // ============================================================================
  // StyleMemory.toJSON
  // ============================================================================

  describe('StyleMemory.toJSON', () => {
    it('exports memory to JSON format', () => {
      const memory = new StyleMemory('export-project', 'Export Project')
      memory.addCharacter({ name: 'Hero', description: 'The main hero', visualTraits: ['brave'] })

      const exported = memory.toJSON()

      expect(exported.projectId).toBe('export-project')
      expect(exported.characters.length).toBe(1)
      expect(exported.characters[0].name).toBe('Hero')
    })
  })

  // ============================================================================
  // StyleMemory.addCharacter
  // ============================================================================

  describe('StyleMemory.addCharacter', () => {
    it('adds character with generated ID', () => {
      const memory = new StyleMemory('project-1', 'Test')

      const char = memory.addCharacter({
        name: 'New Character',
        description: 'A new character',
        visualTraits: ['tall'],
      })

      expect(char.id).toMatch(/^char-/)
      expect(char.name).toBe('New Character')
    })

    it('adds character with provided ID', () => {
      const memory = new StyleMemory('project-1', 'Test')

      const char = memory.addCharacter({
        id: 'custom-id',
        name: 'Custom ID Character',
        description: 'Character with custom ID',
        visualTraits: [],
      })

      expect(char.id).toBe('custom-id')
    })

    it('generates seed for seed strategy', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.setGlobalStyle({ consistencyStrategy: 'seed' })

      const char = memory.addCharacter({
        name: 'Seeded Character',
        description: 'Should have seed',
        visualTraits: [],
      })

      expect(char.seed).toBeDefined()
      expect(typeof char.seed).toBe('number')
    })

    it('uses provided seed over generated', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.setGlobalStyle({ consistencyStrategy: 'seed' })

      const char = memory.addCharacter({
        name: 'Custom Seed',
        description: 'Has custom seed',
        visualTraits: [],
        seed: 999,
      })

      expect(char.seed).toBe(999)
    })

    it('updates existing character by ID', () => {
      const memory = new StyleMemory('project-1', 'Test')

      memory.addCharacter({ id: 'char-1', name: 'Original', description: 'Original', visualTraits: [] })
      memory.addCharacter({ id: 'char-1', name: 'Updated', description: 'Updated', visualTraits: [] })

      const chars = memory.getAllCharacters()
      expect(chars.length).toBe(1)
      expect(chars[0].name).toBe('Updated')
    })

    it('updates updatedAt timestamp', () => {
      const memory = new StyleMemory('project-1', 'Test')
      const initialInfo = memory.getProjectInfo()

      vi.advanceTimersByTime(1000)
      memory.addCharacter({ name: 'Test', description: 'Test', visualTraits: [] })

      const updatedInfo = memory.getProjectInfo()
      expect(updatedInfo.updatedAt.getTime()).toBeGreaterThan(initialInfo.updatedAt.getTime())
    })
  })

  // ============================================================================
  // StyleMemory.addSetting
  // ============================================================================

  describe('StyleMemory.addSetting', () => {
    it('adds setting with generated ID', () => {
      const memory = new StyleMemory('project-1', 'Test')

      const setting = memory.addSetting({
        name: 'New Setting',
        description: 'A new setting',
        visualStyle: ['moody'],
      })

      expect(setting.id).toMatch(/^set-/)
      expect(setting.name).toBe('New Setting')
    })

    it('adds setting with provided ID', () => {
      const memory = new StyleMemory('project-1', 'Test')

      const setting = memory.addSetting({
        id: 'custom-set-id',
        name: 'Custom ID Setting',
        description: 'Setting with custom ID',
        visualStyle: [],
      })

      expect(setting.id).toBe('custom-set-id')
    })

    it('generates seed for seed strategy', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.setGlobalStyle({ consistencyStrategy: 'seed' })

      const setting = memory.addSetting({
        name: 'Seeded Setting',
        description: 'Should have seed',
        visualStyle: [],
      })

      expect(setting.seed).toBeDefined()
    })

    it('updates existing setting by ID', () => {
      const memory = new StyleMemory('project-1', 'Test')

      memory.addSetting({ id: 'set-1', name: 'Original', description: 'Original', visualStyle: [] })
      memory.addSetting({ id: 'set-1', name: 'Updated', description: 'Updated', visualStyle: [] })

      const settings = memory.getAllSettings()
      expect(settings.length).toBe(1)
      expect(settings[0].name).toBe('Updated')
    })
  })

  // ============================================================================
  // StyleMemory.setGlobalStyle
  // ============================================================================

  describe('StyleMemory.setGlobalStyle', () => {
    it('updates global style', () => {
      const memory = new StyleMemory('project-1', 'Test')

      memory.setGlobalStyle({
        promptPrefix: 'New prefix',
        masterSeed: 12345,
      })

      const style = memory.getGlobalStyle()
      expect(style.promptPrefix).toBe('New prefix')
      expect(style.masterSeed).toBe(12345)
    })

    it('merges with existing style', () => {
      const memory = new StyleMemory('project-1', 'Test')

      memory.setGlobalStyle({ promptPrefix: 'Prefix' })
      memory.setGlobalStyle({ promptSuffix: 'Suffix' })

      const style = memory.getGlobalStyle()
      expect(style.promptPrefix).toBe('Prefix')
      expect(style.promptSuffix).toBe('Suffix')
    })

    it('changes consistency strategy', () => {
      const memory = new StyleMemory('project-1', 'Test')

      memory.setGlobalStyle({ consistencyStrategy: 'reference' })

      const style = memory.getGlobalStyle()
      expect(style.consistencyStrategy).toBe('reference')
    })
  })

  // ============================================================================
  // StyleMemory.addReferenceImage
  // ============================================================================

  describe('StyleMemory.addReferenceImage', () => {
    it('adds reference image for character', () => {
      const memory = new StyleMemory('project-1', 'Test')

      memory.addReferenceImage({
        characterId: 'char-1',
        imageUrl: 'http://example.com/char.jpg',
        seed: 111,
      })

      const info = memory.getProjectInfo()
      expect(info.referenceImageCount).toBe(1)
    })

    it('adds reference image for setting', () => {
      const memory = new StyleMemory('project-1', 'Test')

      memory.addReferenceImage({
        settingId: 'set-1',
        imageUrl: 'http://example.com/setting.jpg',
      })

      const info = memory.getProjectInfo()
      expect(info.referenceImageCount).toBe(1)
    })
  })

  // ============================================================================
  // StyleMemory.getCharacter
  // ============================================================================

  describe('StyleMemory.getCharacter', () => {
    it('finds character by ID', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addCharacter({ id: 'char-1', name: 'Hero', description: 'Main hero', visualTraits: [] })

      const char = memory.getCharacter('char-1')
      expect(char?.name).toBe('Hero')
    })

    it('finds character by name (case-insensitive)', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addCharacter({ id: 'char-1', name: 'Hero', description: 'Main hero', visualTraits: [] })

      const char = memory.getCharacter('hero')
      expect(char?.id).toBe('char-1')
    })

    it('returns undefined for not found', () => {
      const memory = new StyleMemory('project-1', 'Test')

      const char = memory.getCharacter('nonexistent')
      expect(char).toBeUndefined()
    })
  })

  // ============================================================================
  // StyleMemory.getSetting
  // ============================================================================

  describe('StyleMemory.getSetting', () => {
    it('finds setting by ID', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addSetting({ id: 'set-1', name: 'Castle', description: 'Dark castle', visualStyle: [] })

      const setting = memory.getSetting('set-1')
      expect(setting?.name).toBe('Castle')
    })

    it('finds setting by name (case-insensitive)', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addSetting({ id: 'set-1', name: 'Castle', description: 'Dark castle', visualStyle: [] })

      const setting = memory.getSetting('CASTLE')
      expect(setting?.id).toBe('set-1')
    })

    it('returns undefined for not found', () => {
      const memory = new StyleMemory('project-1', 'Test')

      const setting = memory.getSetting('nonexistent')
      expect(setting).toBeUndefined()
    })
  })

  // ============================================================================
  // StyleMemory.buildScenePrompt
  // ============================================================================

  describe('StyleMemory.buildScenePrompt', () => {
    it('builds prompt with scene description only', () => {
      const memory = new StyleMemory('project-1', 'Test')

      const result = memory.buildScenePrompt({
        sceneDescription: 'A dramatic scene',
      })

      expect(result.prompt).toContain('A dramatic scene')
    })

    it('includes global prefix and suffix', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.setGlobalStyle({
        promptPrefix: 'Start:',
        promptSuffix: 'End.',
      })

      const result = memory.buildScenePrompt({
        sceneDescription: 'Scene',
      })

      expect(result.prompt).toContain('Start:')
      expect(result.prompt).toContain('End.')
    })

    it('includes character descriptions', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addCharacter({
        name: 'Hero',
        description: 'Brave warrior',
        visualTraits: ['tall', 'armored'],
      })

      const result = memory.buildScenePrompt({
        sceneDescription: 'A battle',
        characterNames: ['Hero'],
      })

      expect(result.prompt).toContain('Characters:')
      expect(result.prompt).toContain('Hero')
      expect(result.prompt).toContain('Brave warrior')
    })

    it('includes setting descriptions', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addSetting({
        name: 'Castle',
        description: 'Dark gothic castle',
        visualStyle: ['moody', 'dramatic'],
        mood: 'tense',
      })

      const result = memory.buildScenePrompt({
        sceneDescription: 'A scene',
        settingName: 'Castle',
      })

      expect(result.prompt).toContain('Setting:')
      expect(result.prompt).toContain('Dark gothic castle')
      expect(result.prompt).toContain('Mood: tense')
    })

    it('returns character seed', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addCharacter({
        name: 'Hero',
        description: 'Main character',
        visualTraits: [],
        seed: 12345,
      })

      const result = memory.buildScenePrompt({
        sceneDescription: 'Scene',
        characterNames: ['Hero'],
      })

      expect(result.seed).toBe(12345)
    })

    it('returns setting seed if no character seed', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addSetting({
        name: 'Castle',
        description: 'Castle',
        visualStyle: [],
        seed: 67890,
      })

      const result = memory.buildScenePrompt({
        sceneDescription: 'Scene',
        settingName: 'Castle',
      })

      expect(result.seed).toBe(67890)
    })

    it('returns master seed as fallback', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.setGlobalStyle({ masterSeed: 999999 })

      const result = memory.buildScenePrompt({
        sceneDescription: 'Scene',
      })

      expect(result.seed).toBe(999999)
    })

    it('returns reference image from character', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addCharacter({
        name: 'Hero',
        description: 'Hero',
        visualTraits: [],
        referenceImage: 'http://example.com/hero.jpg',
      })

      const result = memory.buildScenePrompt({
        sceneDescription: 'Scene',
        characterNames: ['Hero'],
      })

      expect(result.referenceImage).toBe('http://example.com/hero.jpg')
    })

    it('includes additional details', () => {
      const memory = new StyleMemory('project-1', 'Test')

      const result = memory.buildScenePrompt({
        sceneDescription: 'Scene',
        additionalDetails: 'Extra details here',
      })

      expect(result.prompt).toContain('Extra details here')
    })

    it('uses preset style when set', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.setGlobalStyle({ presetId: 'test-preset' })

      const result = memory.buildScenePrompt({
        sceneDescription: 'Scene',
      })

      expect(result.prompt).toContain('Preset prefix:')
      expect(result.prompt).toContain('Preset suffix.')
    })

    it('explicit prefix/suffix overrides preset', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.setGlobalStyle({
        presetId: 'test-preset',
        promptPrefix: 'Custom prefix:',
      })

      const result = memory.buildScenePrompt({
        sceneDescription: 'Scene',
      })

      expect(result.prompt).toContain('Custom prefix:')
      expect(result.prompt).not.toContain('Preset prefix:')
    })
  })

  // ============================================================================
  // StyleMemory.getAllCharacters
  // ============================================================================

  describe('StyleMemory.getAllCharacters', () => {
    it('returns all characters', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addCharacter({ name: 'Hero', description: 'Hero', visualTraits: [] })
      memory.addCharacter({ name: 'Villain', description: 'Villain', visualTraits: [] })

      const chars = memory.getAllCharacters()
      expect(chars.length).toBe(2)
    })

    it('returns copy of array', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addCharacter({ name: 'Hero', description: 'Hero', visualTraits: [] })

      const chars = memory.getAllCharacters()
      chars.push({ id: 'fake', name: 'Fake', description: 'Fake', visualTraits: [] })

      expect(memory.getAllCharacters().length).toBe(1)
    })
  })

  // ============================================================================
  // StyleMemory.getAllSettings
  // ============================================================================

  describe('StyleMemory.getAllSettings', () => {
    it('returns all settings', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addSetting({ name: 'Castle', description: 'Castle', visualStyle: [] })
      memory.addSetting({ name: 'Forest', description: 'Forest', visualStyle: [] })

      const settings = memory.getAllSettings()
      expect(settings.length).toBe(2)
    })

    it('returns copy of array', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addSetting({ name: 'Castle', description: 'Castle', visualStyle: [] })

      const settings = memory.getAllSettings()
      settings.push({ id: 'fake', name: 'Fake', description: 'Fake', visualStyle: [] })

      expect(memory.getAllSettings().length).toBe(1)
    })
  })

  // ============================================================================
  // create1984CharacterMemory
  // ============================================================================

  describe('create1984CharacterMemory', () => {
    it('creates 1984 preset memory', () => {
      const memory = create1984CharacterMemory()
      const info = memory.getProjectInfo()

      expect(info.projectId).toBe('1984-orwell')
      expect(info.projectTitle).toBe('1984 by George Orwell')
    })

    it('includes Winston Smith', () => {
      const memory = create1984CharacterMemory()
      const winston = memory.getCharacter('Winston Smith')

      expect(winston).toBeDefined()
      expect(winston?.age).toBe('39')
    })

    it('includes Julia', () => {
      const memory = create1984CharacterMemory()
      const julia = memory.getCharacter('Julia')

      expect(julia).toBeDefined()
      expect(julia?.gender).toBe('female')
    })

    it('includes OBrien', () => {
      const memory = create1984CharacterMemory()
      const obrien = memory.getCharacter("O'Brien")

      expect(obrien).toBeDefined()
    })

    it('includes Big Brother', () => {
      const memory = create1984CharacterMemory()
      const bb = memory.getCharacter('Big Brother')

      expect(bb).toBeDefined()
      expect(bb?.visualTraits).toContain('heavy black mustache')
    })

    it('includes Victory Mansions setting', () => {
      const memory = create1984CharacterMemory()
      const setting = memory.getSetting('Victory Mansions')

      expect(setting).toBeDefined()
    })

    it('includes Ministry of Truth setting', () => {
      const memory = create1984CharacterMemory()
      const setting = memory.getSetting('Ministry of Truth')

      expect(setting).toBeDefined()
    })

    it('includes Room 101 setting', () => {
      const memory = create1984CharacterMemory()
      const setting = memory.getSetting('Room 101')

      expect(setting).toBeDefined()
      expect(setting?.mood).toContain('terrifying')
    })

    it('includes The Golden Country setting', () => {
      const memory = create1984CharacterMemory()
      const setting = memory.getSetting('The Golden Country')

      expect(setting).toBeDefined()
      expect(setting?.mood).toContain('peaceful')
    })

    it('has seed consistency strategy', () => {
      const memory = create1984CharacterMemory()
      const style = memory.getGlobalStyle()

      expect(style.consistencyStrategy).toBe('seed')
      expect(style.masterSeed).toBe(198419841984)
    })
  })

  // ============================================================================
  // fromWorkProfile
  // ============================================================================

  describe('fromWorkProfile', () => {
    it('creates StyleMemory from work profile', () => {
      const profile = {
        workId: 'work-1',
        workTitle: 'Test Work',
        illustrationPreset: {
          customizations: {
            promptPrefix: 'Profile prefix',
            promptSuffix: 'Profile suffix',
            negativePrompt: 'Profile negative',
          },
        },
        consistencyStrategy: 'seed',
        masterSeed: 12345,
        characters: [{ id: 'char-1', name: 'Hero', description: 'Hero', visualTraits: [] }],
        settings: [{ id: 'set-1', name: 'Castle', description: 'Castle', visualStyle: [] }],
        referenceImages: [],
      }

      const memory = fromWorkProfile(profile)
      const info = memory.getProjectInfo()

      expect(info.projectId).toBe('work-1')
      expect(info.characterCount).toBe(1)
      expect(info.settingCount).toBe(1)
    })

    it('imports reference images', () => {
      const profile = {
        workId: 'work-1',
        workTitle: 'Test Work',
        illustrationPreset: { customizations: {} },
        consistencyStrategy: 'seed',
        characters: [],
        settings: [],
        referenceImages: [
          { type: 'character', entityId: 'char-1', imageUrl: 'http://example.com/img.jpg', seed: 123 },
        ],
      }

      const memory = fromWorkProfile(profile)
      const info = memory.getProjectInfo()

      expect(info.referenceImageCount).toBe(1)
    })
  })

  // ============================================================================
  // toWorkProfileData
  // ============================================================================

  describe('toWorkProfileData', () => {
    it('exports StyleMemory to work profile format', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addCharacter({ name: 'Hero', description: 'Hero', visualTraits: [] })
      memory.addSetting({ name: 'Castle', description: 'Castle', visualStyle: [] })
      memory.setGlobalStyle({
        consistencyStrategy: 'seed',
        masterSeed: 12345,
        promptPrefix: 'Prefix',
      })

      const data = toWorkProfileData(memory)

      expect(data.characters.length).toBe(1)
      expect(data.settings.length).toBe(1)
      expect(data.consistencyStrategy).toBe('seed')
      expect(data.masterSeed).toBe(12345)
      expect(data.promptCustomizations?.promptPrefix).toBe('Prefix')
    })

    it('exports reference images with type mapping', () => {
      const memory = new StyleMemory('project-1', 'Test')
      memory.addReferenceImage({
        characterId: 'char-1',
        imageUrl: 'http://example.com/char.jpg',
        seed: 123,
      })
      memory.addReferenceImage({
        settingId: 'set-1',
        imageUrl: 'http://example.com/setting.jpg',
      })

      const data = toWorkProfileData(memory)

      expect(data.referenceImages.length).toBe(2)
      expect(data.referenceImages[0].type).toBe('character')
      expect(data.referenceImages[1].type).toBe('setting')
    })
  })
})
