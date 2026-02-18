/**
 * Prompt Mode Service
 * @module lib/prompts/promptModeService
 *
 * Filters and selects prompts based on writing mode context.
 * Supports Write mode (creative/professional) and Reflect mode (journaling).
 */

import type { MoodState } from '@/lib/codex/mood'
import type { PromptMode, GalleryPrompt } from './types'
import { getPromptManager, type PromptManager } from './promptManager'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Project types for Write mode
 */
export type ProjectType = 'story' | 'essay' | 'article' | 'poem' | 'script' | 'other'

/**
 * Time of day for context-aware prompts
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/**
 * Context for prompt selection
 */
export interface PromptContext {
  /** Current writing mode */
  mode: 'write' | 'reflect'
  /** User's current mood */
  mood?: MoodState
  /** Time of day for time-aware prompts */
  timeOfDay: TimeOfDay
  /** Project type (for write mode) */
  projectType?: ProjectType
  /** Whether user appears stuck (no typing for 30s) */
  isStuck?: boolean
}

/**
 * Categories that map to each mode
 */
const WRITE_MODE_CATEGORIES = ['creative', 'exploration', 'technical', 'learning'] as const
const REFLECT_MODE_CATEGORIES = ['reflection', 'personal', 'practical'] as const
const BOTH_MODE_CATEGORIES = ['philosophical'] as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current time of day
 */
export function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * Simple hash function for consistent daily selection
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash
}

/**
 * Shuffle array with seed for consistent ordering
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array]
  let currentIndex = result.length
  let randomSeed = seed

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
// PROMPT MODE SERVICE
// ============================================================================

/**
 * Service for filtering and selecting prompts based on mode context
 */
export class PromptModeService {
  private manager: PromptManager | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the service
   */
  async init(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      this.manager = await getPromptManager()
      this.initialized = true
    })()

    await this.initPromise
  }

  /**
   * Get the underlying manager
   */
  getManager(): PromptManager {
    if (!this.manager) {
      throw new Error('PromptModeService not initialized')
    }
    return this.manager
  }

  // ============================================================================
  // MODE-BASED FILTERING
  // ============================================================================

  /**
   * Get all prompts filtered by mode
   * Returns prompts where mode matches OR mode is 'both'
   */
  async getPromptsForMode(mode: 'write' | 'reflect'): Promise<GalleryPrompt[]> {
    const allPrompts = await this.manager!.getAllPrompts()

    return allPrompts.filter(prompt => {
      // If prompt has explicit mode field, use it
      if (prompt.mode) {
        return prompt.mode === mode || prompt.mode === 'both'
      }

      // Fallback: infer from category
      if (mode === 'write') {
        return WRITE_MODE_CATEGORIES.includes(prompt.category as any) ||
               BOTH_MODE_CATEGORIES.includes(prompt.category as any)
      } else {
        return REFLECT_MODE_CATEGORIES.includes(prompt.category as any) ||
               BOTH_MODE_CATEGORIES.includes(prompt.category as any)
      }
    })
  }

  /**
   * Get prompts count by mode
   */
  async getPromptCountByMode(): Promise<{ write: number; reflect: number; both: number }> {
    const allPrompts = await this.manager!.getAllPrompts()

    let write = 0
    let reflect = 0
    let both = 0

    for (const prompt of allPrompts) {
      if (prompt.mode === 'write') write++
      else if (prompt.mode === 'reflect') reflect++
      else if (prompt.mode === 'both') both++
      else {
        // Infer from category
        if (WRITE_MODE_CATEGORIES.includes(prompt.category as any)) write++
        else if (REFLECT_MODE_CATEGORIES.includes(prompt.category as any)) reflect++
        else if (BOTH_MODE_CATEGORIES.includes(prompt.category as any)) both++
      }
    }

    return { write, reflect, both }
  }

  // ============================================================================
  // CONTEXT-AWARE DAILY PROMPT
  // ============================================================================

  /**
   * Get the daily prompt based on full context
   */
  async getDailyPromptForContext(context: PromptContext): Promise<GalleryPrompt> {
    // Get mode-filtered prompts
    let prompts = await this.getPromptsForMode(context.mode)

    // Further filter by mood if provided
    if (context.mood) {
      const moodFiltered = prompts.filter(p =>
        !p.mood || p.mood.includes(context.mood!)
      )
      if (moodFiltered.length > 0) {
        prompts = moodFiltered
      }
    }

    // For write mode, filter by project type if provided
    if (context.mode === 'write' && context.projectType) {
      const typeFiltered = this.filterByProjectType(prompts, context.projectType)
      if (typeFiltered.length > 0) {
        prompts = typeFiltered
      }
    }

    // For reflect mode, prefer time-appropriate prompts
    if (context.mode === 'reflect') {
      const timeFiltered = this.filterByTimeOfDay(prompts, context.timeOfDay)
      if (timeFiltered.length > 0) {
        prompts = timeFiltered
      }
    }

    // Fallback if no prompts match
    if (prompts.length === 0) {
      prompts = await this.getPromptsForMode(context.mode)
    }

    // Select deterministically based on date
    const today = new Date().toDateString()
    const hash = hashString(today + context.mode)
    const index = Math.abs(hash) % prompts.length

    return prompts[index]
  }

  /**
   * Filter prompts suitable for a project type
   */
  private filterByProjectType(prompts: GalleryPrompt[], projectType: ProjectType): GalleryPrompt[] {
    const typeKeywords: Record<ProjectType, string[]> = {
      story: ['character', 'story', 'fiction', 'narrative', 'plot', 'world', 'discover'],
      essay: ['explore', 'argue', 'explain', 'describe', 'analyze', 'document'],
      article: ['document', 'explain', 'guide', 'how', 'what', 'system'],
      poem: ['describe', 'feel', 'emotion', 'image', 'moment'],
      script: ['dialogue', 'scene', 'character', 'conversation'],
      other: [],
    }

    const keywords = typeKeywords[projectType]
    if (keywords.length === 0) return prompts

    return prompts.filter(p => {
      const text = p.text.toLowerCase()
      return keywords.some(keyword => text.includes(keyword))
    })
  }

  /**
   * Filter prompts suitable for time of day
   */
  private filterByTimeOfDay(prompts: GalleryPrompt[], timeOfDay: TimeOfDay): GalleryPrompt[] {
    const timeKeywords: Record<TimeOfDay, string[]> = {
      morning: ['morning', 'today', 'intention', 'plan', 'start', 'gratitude', 'grateful'],
      afternoon: ['focus', 'progress', 'doing', 'working', 'challenge'],
      evening: ['reflect', 'review', 'learned', 'happened', 'day'],
      night: ['dream', 'tomorrow', 'hope', 'imagine', 'wonder'],
    }

    const keywords = timeKeywords[timeOfDay]
    const filtered = prompts.filter(p => {
      const text = p.text.toLowerCase()
      return keywords.some(keyword => text.includes(keyword))
    })

    // Return filtered if any match, otherwise return all
    return filtered.length > 0 ? filtered : prompts
  }

  // ============================================================================
  // CONTINUATION PROMPTS (WHEN STUCK)
  // ============================================================================

  /**
   * Get prompts for when the writer is stuck mid-writing
   */
  async getContinuationPrompts(
    currentText: string,
    projectType: ProjectType,
    count: number = 3
  ): Promise<GalleryPrompt[]> {
    const allPrompts = await this.getPromptsForMode('write')

    // Continuation-style prompts (start with "What if", "Describe", etc.)
    const continuationPatterns = [
      /^what (if|happens|would)/i,
      /^describe/i,
      /^imagine/i,
      /^suddenly/i,
      /^the (next|following)/i,
      /^your character/i,
      /^a character/i,
    ]

    const continuationPrompts = allPrompts.filter(p =>
      continuationPatterns.some(pattern => pattern.test(p.text))
    )

    // Filter by project type
    const typeFiltered = this.filterByProjectType(
      continuationPrompts.length > 0 ? continuationPrompts : allPrompts,
      projectType
    )

    // Shuffle with today's date for variety but consistency
    const shuffled = shuffleWithSeed(typeFiltered, hashString(new Date().toDateString() + 'stuck'))

    return shuffled.slice(0, count)
  }

  // ============================================================================
  // REFLECTION PROMPTS
  // ============================================================================

  /**
   * Get a time-appropriate reflection prompt
   */
  async getReflectionPrompt(
    timeOfDay: TimeOfDay = getCurrentTimeOfDay(),
    mood?: MoodState
  ): Promise<GalleryPrompt> {
    return this.getDailyPromptForContext({
      mode: 'reflect',
      mood,
      timeOfDay,
    })
  }

  /**
   * Get alternative reflection prompts
   */
  async getReflectionAlternatives(
    timeOfDay: TimeOfDay = getCurrentTimeOfDay(),
    mood?: MoodState,
    count: number = 3
  ): Promise<GalleryPrompt[]> {
    const daily = await this.getReflectionPrompt(timeOfDay, mood)
    let prompts = await this.getPromptsForMode('reflect')

    // Filter by mood if provided
    if (mood) {
      const moodFiltered = prompts.filter(p =>
        !p.mood || p.mood.includes(mood)
      )
      if (moodFiltered.length > count + 1) {
        prompts = moodFiltered
      }
    }

    // Remove the daily prompt
    const filtered = prompts.filter(p => p.id !== daily.id)

    // Shuffle and return
    const shuffled = shuffleWithSeed(filtered, hashString(new Date().toDateString() + 'reflect-alt'))
    return shuffled.slice(0, count)
  }

  /**
   * Get morning-specific prompts (intentions, gratitude)
   */
  async getMorningPrompts(count: number = 5): Promise<GalleryPrompt[]> {
    const prompts = await this.getPromptsForMode('reflect')
    const morningPrompts = this.filterByTimeOfDay(prompts, 'morning')
    const shuffled = shuffleWithSeed(morningPrompts, hashString(new Date().toDateString() + 'morning'))
    return shuffled.slice(0, count)
  }

  /**
   * Get evening-specific prompts (review, reflection)
   */
  async getEveningPrompts(count: number = 5): Promise<GalleryPrompt[]> {
    const prompts = await this.getPromptsForMode('reflect')
    const eveningPrompts = this.filterByTimeOfDay(prompts, 'evening')
    const shuffled = shuffleWithSeed(eveningPrompts, hashString(new Date().toDateString() + 'evening'))
    return shuffled.slice(0, count)
  }

  // ============================================================================
  // WRITE MODE PROMPTS
  // ============================================================================

  /**
   * Get writing prompts for a specific project type
   */
  async getWritingPromptsForProject(
    projectType: ProjectType,
    count: number = 5
  ): Promise<GalleryPrompt[]> {
    const prompts = await this.getPromptsForMode('write')
    const typeFiltered = this.filterByProjectType(prompts, projectType)

    const toShuffle = typeFiltered.length >= count ? typeFiltered : prompts
    const shuffled = shuffleWithSeed(toShuffle, hashString(new Date().toDateString() + projectType))

    return shuffled.slice(0, count)
  }

  /**
   * Get story starter prompts
   */
  async getStoryStarters(count: number = 5): Promise<GalleryPrompt[]> {
    const prompts = await this.getPromptsForMode('write')

    // Story starters typically have these patterns
    const starters = prompts.filter(p => {
      const text = p.text.toLowerCase()
      return (
        p.category === 'creative' ||
        text.includes('story') ||
        text.includes('character') ||
        text.includes('wakes up') ||
        text.includes('discovers') ||
        text.includes('one day')
      )
    })

    const shuffled = shuffleWithSeed(
      starters.length >= count ? starters : prompts,
      hashString(new Date().toDateString() + 'starters')
    )

    return shuffled.slice(0, count)
  }

  /**
   * Get prompts for continuing a stuck story
   */
  async getUnstuckPrompts(count: number = 3): Promise<GalleryPrompt[]> {
    return this.getContinuationPrompts('', 'story', count)
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance: PromptModeService | null = null

/**
 * Get the singleton PromptModeService instance
 */
export async function getPromptModeService(): Promise<PromptModeService> {
  if (!serviceInstance) {
    serviceInstance = new PromptModeService()
    await serviceInstance.init()
  }
  return serviceInstance
}
