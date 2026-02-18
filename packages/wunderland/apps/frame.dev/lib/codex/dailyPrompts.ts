/**
 * Daily Prompts System for Codex
 * @module lib/quarry/dailyPrompts
 * 
 * Manages daily prompt selection with:
 * - One consistent primary prompt per day
 * - Up to 3 alternatives that can be selected
 * - Decay system to avoid repetition for ~30 days
 * - Mood-based filtering
 */

import { 
  WRITING_PROMPTS, 
  type WritingPrompt,
  type PromptCategory 
} from './prompts'
import type { MoodState } from './mood'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DailyPromptState {
  /** ISO date string (YYYY-MM-DD) for when this state was generated */
  date: string
  /** Primary prompt ID for the day */
  primaryId: string
  /** Alternative prompt IDs for the day */
  alternativeIds: string[]
  /** Currently selected prompt ID (primary or alternative) */
  selectedId: string
  /** IDs of prompts recently shown (for decay) */
  recentlyShownIds: string[]
}

export interface DailyPromptResult {
  /** The primary prompt for today */
  primary: WritingPrompt
  /** Alternative prompts for today */
  alternatives: WritingPrompt[]
  /** The currently selected prompt (may be primary or alternative) */
  selected: WritingPrompt
  /** Whether an alternative is currently selected */
  isAlternativeSelected: boolean
  /** Number of prompts in decay (won't repeat soon) */
  decayCount: number
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'fabric_daily_prompts_state'
const NUM_ALTERNATIVES = 3
const MAX_DECAY_SIZE = 30 // Don't repeat prompts for ~30 days

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Seeded random for consistent daily selection
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

/**
 * Get numeric seed from date
 */
function getDateSeed(dateStr: string): number {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const startOfYear = new Date(year, 0, 0)
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  return year * 1000 + dayOfYear
}

/**
 * Get state from localStorage
 */
function getStoredState(): DailyPromptState | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Save state to localStorage
 */
function saveState(state: DailyPromptState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * Shuffle array with seeded random
 */
function shuffleWithSeed<T>(arr: T[], random: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate new daily prompts
 */
function generateDailyPrompts(
  mood?: MoodState,
  recentlyShown: string[] = []
): DailyPromptState {
  const today = getTodayString()
  const seed = getDateSeed(today)
  const random = seededRandom(seed)
  
  // Filter by mood if provided
  let pool = mood
    ? WRITING_PROMPTS.filter(p => !p.mood || p.mood.includes(mood))
    : WRITING_PROMPTS
  
  if (pool.length < NUM_ALTERNATIVES + 1) {
    pool = [...WRITING_PROMPTS]
  }
  
  // Exclude recently shown (with fallback)
  const availablePool = pool.filter(p => !recentlyShown.includes(p.id))
  const finalPool = availablePool.length >= NUM_ALTERNATIVES + 1 ? availablePool : pool
  
  // Shuffle with seed for consistent daily selection
  const shuffled = shuffleWithSeed(finalPool, random)
  
  // Select primary and alternatives
  const primary = shuffled[0]
  const alternatives = shuffled.slice(1, 1 + NUM_ALTERNATIVES)
  
  // Add primary to recently shown
  const updatedRecent = [primary.id, ...recentlyShown].slice(0, MAX_DECAY_SIZE)
  
  return {
    date: today,
    primaryId: primary.id,
    alternativeIds: alternatives.map(p => p.id),
    selectedId: primary.id,
    recentlyShownIds: updatedRecent,
  }
}

/**
 * Get daily prompts with alternatives
 * Main entry point for the daily prompt system
 */
export function getDailyPrompts(mood?: MoodState): DailyPromptResult {
  const today = getTodayString()
  let state = getStoredState()
  
  // Generate new state if needed
  if (!state || state.date !== today) {
    state = generateDailyPrompts(mood, state?.recentlyShownIds || [])
    saveState(state)
  }
  
  // Resolve prompts
  const primary = WRITING_PROMPTS.find(p => p.id === state.primaryId) || WRITING_PROMPTS[0]
  const alternatives = state.alternativeIds
    .map(id => WRITING_PROMPTS.find(p => p.id === id))
    .filter((p): p is WritingPrompt => p !== undefined)
  const selected = WRITING_PROMPTS.find(p => p.id === state.selectedId) || primary
  
  return {
    primary,
    alternatives,
    selected,
    isAlternativeSelected: state.selectedId !== state.primaryId,
    decayCount: state.recentlyShownIds.length,
  }
}

/**
 * Select an alternative prompt
 * Updates the selected prompt and adds to decay list
 */
export function selectAlternativePrompt(promptId: string): DailyPromptResult | null {
  const state = getStoredState()
  if (!state) return null
  
  // Validate the prompt exists and is valid for today
  const validIds = [state.primaryId, ...state.alternativeIds]
  if (!validIds.includes(promptId)) return null
  
  // Update state
  const updatedRecent = promptId === state.primaryId
    ? state.recentlyShownIds // Primary was already added
    : [promptId, ...state.recentlyShownIds.filter(id => id !== promptId)].slice(0, MAX_DECAY_SIZE)
  
  const newState: DailyPromptState = {
    ...state,
    selectedId: promptId,
    recentlyShownIds: updatedRecent,
  }
  
  saveState(newState)
  return getDailyPrompts()
}

/**
 * Reset daily prompts (for testing/debugging)
 */
export function resetDailyPrompts(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Get recently shown prompt IDs (for debugging)
 */
export function getRecentlyShownIds(): string[] {
  const state = getStoredState()
  return state?.recentlyShownIds || []
}

/**
 * Force regenerate daily prompts (for testing)
 */
export function forceRegenerateDailyPrompts(mood?: MoodState): DailyPromptResult {
  const state = getStoredState()
  const newState = generateDailyPrompts(mood, state?.recentlyShownIds || [])
  saveState(newState)
  return getDailyPrompts(mood)
}
