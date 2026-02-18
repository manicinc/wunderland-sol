/**
 * Prompt Manager - High-Level Operations
 * @module lib/prompts/promptManager
 *
 * Combines PromptStore and PromptImageGenerator for unified prompt operations.
 * Handles daily prompts, image generation, and prompt lifecycle.
 */

import { getOrCreateDailyNote } from '@/lib/dailyNotes'
import type { MoodState } from '@/lib/codex/mood'
import type { PromptCategory } from '@/lib/codex/prompts'
import { PromptStore, getPromptStore } from './promptStore'
import { PromptImageGenerator, getPromptImageGenerator } from './promptImageGenerator'
import type {
  GalleryPrompt,
  PromptFilter,
  ImageStyle,
  PromptPreferences,
} from './types'
import { DEFAULT_PROMPT_PREFERENCES } from './types'

// Rate limit: ~5 images per minute (12 second delay)
const IMAGE_GENERATION_DELAY_MS = 12000

/**
 * Progress callback for batch operations
 */
export type ProgressCallback = (current: number, total: number, prompt?: GalleryPrompt) => void

/**
 * Prompt Manager class
 */
export class PromptManager {
  private store: PromptStore | null = null
  private imageGenerator: PromptImageGenerator | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the manager
   */
  async init(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      this.store = await getPromptStore()
      this.imageGenerator = await getPromptImageGenerator()
      this.initialized = true
    })()

    await this.initPromise
  }

  /**
   * Get the prompt store
   */
  getStore(): PromptStore {
    if (!this.store) {
      throw new Error('PromptManager not initialized')
    }
    return this.store
  }

  /**
   * Get the image generator
   */
  getImageGenerator(): PromptImageGenerator {
    if (!this.imageGenerator) {
      throw new Error('PromptManager not initialized')
    }
    return this.imageGenerator
  }

  /**
   * Check if image generation is available
   */
  canGenerateImages(): boolean {
    return this.imageGenerator?.isReady() || false
  }

  // ============================================================================
  // DAILY PROMPT
  // ============================================================================

  /**
   * Get today's prompt based on date hash and optional mood
   */
  async getDailyPrompt(mood?: MoodState): Promise<GalleryPrompt> {
    const prompts = await this.store!.filterPrompts({ mood })
    if (prompts.length === 0) {
      const all = await this.store!.getAllPrompts()
      return all[0]
    }

    const today = new Date().toDateString()
    const hash = this.hashString(today)
    const index = Math.abs(hash) % prompts.length

    return prompts[index]
  }

  /**
   * Get alternative prompts for today (different from daily prompt)
   */
  async getDailyAlternatives(mood?: MoodState, count: number = 3): Promise<GalleryPrompt[]> {
    const daily = await this.getDailyPrompt(mood)
    const prompts = await this.store!.filterPrompts({ mood })

    const filtered = prompts.filter(p => p.id !== daily.id)
    const shuffled = this.shuffleWithSeed(filtered, this.hashString(new Date().toDateString() + 'alt'))

    return shuffled.slice(0, count)
  }

  /**
   * Simple string hash function for consistent daily selection
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }

  /**
   * Seeded shuffle for consistent ordering
   */
  private shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const result = [...array]
    let currentIndex = result.length
    let randomSeed = seed

    // Simple seeded random
    const seededRandom = () => {
      randomSeed = (randomSeed * 9301 + 49297) % 233280
      return randomSeed / 233280
    }

    while (currentIndex !== 0) {
      const randomIndex = Math.floor(seededRandom() * currentIndex)
      currentIndex--
      ;[result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]]
    }

    return result
  }

  // ============================================================================
  // IMAGE GENERATION
  // ============================================================================

  /**
   * Ensure a prompt has an image, generating one if needed
   */
  async ensureImage(promptId: string, style?: ImageStyle): Promise<string | null> {
    const prompt = await this.store!.getPrompt(promptId)
    if (!prompt) return null

    // Already has image
    if (prompt.imageUrl) {
      return prompt.imageUrl
    }

    // Generate new image
    if (!this.canGenerateImages()) {
      return null
    }

    const preferences = await this.store!.getPreferences()
    const imageStyle = style || preferences.defaultImageStyle

    try {
      const result = await this.imageGenerator!.generateImage(prompt.text, imageStyle)

      await this.store!.setPromptImage(
        promptId,
        result.imageData,
        result.revisedPrompt,
        imageStyle
      )

      return result.imageData
    } catch (error) {
      console.error('[PromptManager] Failed to generate image:', error)
      return null
    }
  }

  /**
   * Generate images for all prompts without images
   */
  async generateAllImages(
    style: ImageStyle,
    onProgress?: ProgressCallback,
    abortSignal?: AbortSignal
  ): Promise<{ success: number; failed: number }> {
    const prompts = await this.store!.getPromptsWithoutImages()
    let success = 0
    let failed = 0

    for (let i = 0; i < prompts.length; i++) {
      if (abortSignal?.aborted) {
        break
      }

      const prompt = prompts[i]
      onProgress?.(i + 1, prompts.length, prompt)

      try {
        const result = await this.imageGenerator!.generateImage(prompt.text, style)
        await this.store!.setPromptImage(
          prompt.id,
          result.imageData,
          result.revisedPrompt,
          style
        )
        success++
      } catch (error) {
        console.error(`[PromptManager] Failed to generate image for ${prompt.id}:`, error)
        failed++
      }

      // Rate limit delay (skip on last item)
      if (i < prompts.length - 1 && !abortSignal?.aborted) {
        await new Promise(resolve => setTimeout(resolve, IMAGE_GENERATION_DELAY_MS))
      }
    }

    return { success, failed }
  }

  /**
   * Regenerate image for a prompt
   */
  async regenerateImage(promptId: string, style: ImageStyle): Promise<string | null> {
    const prompt = await this.store!.getPrompt(promptId)
    if (!prompt || !this.canGenerateImages()) {
      return null
    }

    try {
      const result = await this.imageGenerator!.generateImage(prompt.text, style)

      await this.store!.setPromptImage(
        promptId,
        result.imageData,
        result.revisedPrompt,
        style
      )

      return result.imageData
    } catch (error) {
      console.error('[PromptManager] Failed to regenerate image:', error)
      return null
    }
  }

  // ============================================================================
  // PROMPT CRUD
  // ============================================================================

  /**
   * Create a new custom prompt
   */
  async createPrompt(
    text: string,
    category: PromptCategory,
    mood?: MoodState[],
    options?: {
      difficulty?: 'beginner' | 'intermediate' | 'advanced'
      tags?: string[]
      generateImage?: boolean
      imageStyle?: ImageStyle
    }
  ): Promise<GalleryPrompt> {
    const now = new Date().toISOString()
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const prompt: GalleryPrompt = {
      id,
      text,
      category,
      mood,
      difficulty: options?.difficulty || 'intermediate',
      tags: options?.tags || [],
      isCustom: true,
      isFavorite: false,
      useCount: 0,
      createdAt: now,
      mode: 'both',
    }

    await this.store!.savePrompt(prompt)

    // Generate image if requested
    if (options?.generateImage && this.canGenerateImages()) {
      await this.ensureImage(id, options.imageStyle)
    }

    return (await this.store!.getPrompt(id))!
  }

  /**
   * Update a custom prompt
   */
  async updatePrompt(
    id: string,
    updates: Partial<Pick<GalleryPrompt, 'text' | 'category' | 'mood' | 'difficulty' | 'tags'>>
  ): Promise<GalleryPrompt | null> {
    const prompt = await this.store!.getPrompt(id)
    if (!prompt || !prompt.isCustom) {
      return null // Can only edit custom prompts
    }

    Object.assign(prompt, updates)
    await this.store!.savePrompt(prompt)

    return prompt
  }

  /**
   * Delete a custom prompt
   */
  async deletePrompt(id: string): Promise<boolean> {
    return this.store!.deletePrompt(id)
  }

  // ============================================================================
  // USAGE TRACKING
  // ============================================================================

  /**
   * Use a prompt (records usage and optionally links to daily note)
   */
  async usePrompt(promptId: string): Promise<{
    prompt: GalleryPrompt
    dailyNote: Awaited<ReturnType<typeof getOrCreateDailyNote>> | null
  }> {
    await this.store!.recordUsage(promptId)
    const prompt = await this.store!.getPrompt(promptId)

    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`)
    }

    // Get or create today's daily note
    let dailyNote = null
    try {
      const today = new Date().toISOString().split('T')[0]
      dailyNote = await getOrCreateDailyNote(today)
    } catch (error) {
      console.warn('[PromptManager] Could not get daily note:', error)
    }

    return { prompt, dailyNote }
  }

  // ============================================================================
  // FAVORITES
  // ============================================================================

  /**
   * Toggle favorite status for a prompt
   */
  async toggleFavorite(id: string): Promise<boolean> {
    return this.store!.toggleFavorite(id)
  }

  /**
   * Get all favorite prompts
   */
  async getFavorites(): Promise<GalleryPrompt[]> {
    return this.store!.getFavorites()
  }

  // ============================================================================
  // FILTERING & SEARCH
  // ============================================================================

  /**
   * Get all prompts
   */
  async getAllPrompts(): Promise<GalleryPrompt[]> {
    return this.store!.getAllPrompts()
  }

  /**
   * Get a single prompt
   */
  async getPrompt(id: string): Promise<GalleryPrompt | null> {
    return this.store!.getPrompt(id)
  }

  /**
   * Filter prompts
   */
  async filterPrompts(filter: PromptFilter): Promise<GalleryPrompt[]> {
    return this.store!.filterPrompts(filter)
  }

  /**
   * Get most used prompts
   */
  async getMostUsed(limit?: number): Promise<GalleryPrompt[]> {
    return this.store!.getMostUsed(limit)
  }

  /**
   * Get recently used prompts
   */
  async getRecentlyUsed(limit?: number): Promise<GalleryPrompt[]> {
    return this.store!.getRecentlyUsed(limit)
  }

  // ============================================================================
  // PREFERENCES
  // ============================================================================

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<PromptPreferences> {
    return this.store!.getPreferences()
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: PromptPreferences): Promise<void> {
    return this.store!.savePreferences(preferences)
  }

  /**
   * Update a single preference
   */
  async updatePreference<K extends keyof PromptPreferences>(
    key: K,
    value: PromptPreferences[K]
  ): Promise<void> {
    const current = await this.getPreferences()
    current[key] = value
    await this.savePreferences(current)
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get prompt statistics
   */
  async getStats(): Promise<{
    total: number
    curated: number
    custom: number
    withImages: number
    favorites: number
    totalUses: number
  }> {
    return this.store!.getStats()
  }

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  /**
   * Clear all cached images to free up storage
   */
  async clearAllImages(): Promise<void> {
    return this.store!.clearAllImages()
  }

  /**
   * Re-import curated prompts (useful after updates)
   */
  async reimportCuratedPrompts(): Promise<void> {
    return this.store!.importCuratedPrompts()
  }

  /**
   * Export prompts for sharing
   */
  async exportPrompts(ids?: string[]): Promise<string> {
    return this.store!.exportPrompts(ids)
  }
}

// Singleton instance
let managerInstance: PromptManager | null = null

/**
 * Get the singleton PromptManager instance
 */
export async function getPromptManager(): Promise<PromptManager> {
  if (!managerInstance) {
    managerInstance = new PromptManager()
    await managerInstance.init()
  }
  return managerInstance
}
