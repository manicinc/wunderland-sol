/**
 * Writing Prompts System for Codex
 * @module lib/quarry/prompts
 *
 * Provides categorized writing prompts to inspire strand creation.
 * Prompts are personalized based on mood, activity, and interests.
 *
 * Includes:
 * - 40 base prompts (original curated set)
 * - 80 nonfiction prompts (creative nonfiction writing prompts)
 */

import type { MoodState } from './mood'
import { NONFICTION_PROMPTS } from '@/lib/prompts/nonfictionPrompts'

/**
 * Prompt mode - determines which context a prompt appears in
 * - 'write': Creative writing (stories, essays, articles)
 * - 'reflect': Personal journaling and reflection
 * - 'both': Appears in both contexts
 */
export type PromptMode = 'write' | 'reflect' | 'both'

export interface WritingPrompt {
  id: string
  text: string
  category: PromptCategory
  mood?: MoodState[]  // Moods this prompt suits
  tags?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime?: string  // e.g., "5 min", "15 min", "1 hour"
  mode?: PromptMode  // Which mode this prompt appears in (defaults to 'both')
  imagePath?: string  // Path to the prompt cover image (e.g., "/prompts/r1.webp")
}

export type PromptCategory = 
  | 'reflection'
  | 'creative'
  | 'technical'
  | 'philosophical'
  | 'practical'
  | 'exploration'
  | 'personal'
  | 'learning'

export interface PromptCategoryConfig {
  label: string
  emoji: string
  color: string
  description: string
}

export const PROMPT_CATEGORIES: Record<PromptCategory, PromptCategoryConfig> = {
  reflection: {
    label: 'Reflection',
    emoji: '🪞',
    color: 'text-indigo-500',
    description: 'Look inward and document your thoughts',
  },
  creative: {
    label: 'Creative',
    emoji: '🎨',
    color: 'text-purple-500',
    description: 'Unleash your imagination',
  },
  technical: {
    label: 'Technical',
    emoji: '⚙️',
    color: 'text-blue-500',
    description: 'Document systems and processes',
  },
  philosophical: {
    label: 'Philosophical',
    emoji: '🤔',
    color: 'text-rose-500',
    description: 'Explore deep questions',
  },
  practical: {
    label: 'Practical',
    emoji: '🛠️',
    color: 'text-amber-500',
    description: 'How-tos and guides',
  },
  exploration: {
    label: 'Exploration',
    emoji: '🔭',
    color: 'text-cyan-500',
    description: 'Discover and document',
  },
  personal: {
    label: 'Personal',
    emoji: '📝',
    color: 'text-emerald-500',
    description: 'Your story and experiences',
  },
  learning: {
    label: 'Learning',
    emoji: '📚',
    color: 'text-orange-500',
    description: 'Document what you learn',
  },
}

/**
 * Curated writing prompts organized by category
 */
export const WRITING_PROMPTS: WritingPrompt[] = [
  // Reflection prompts (mode: reflect - personal journaling)
  { id: 'r1', imagePath: '/prompts/r1.webp', text: 'What lesson took you the longest to learn, and why?', category: 'reflection', mood: ['reflective'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'reflect' },
  { id: 'r2', imagePath: '/prompts/r2.webp', text: 'Describe a moment that changed how you see the world.', category: 'reflection', mood: ['reflective', 'curious'], difficulty: 'intermediate', estimatedTime: '15 min', mode: 'reflect' },
  { id: 'r3', imagePath: '/prompts/r3.webp', text: 'What would your 10-years-ago self think of you today?', category: 'reflection', mood: ['reflective'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'reflect' },
  { id: 'r4', imagePath: '/prompts/r4.webp', text: 'Write about a failure that taught you something valuable.', category: 'reflection', mood: ['reflective'], difficulty: 'intermediate', estimatedTime: '15 min', mode: 'reflect' },
  { id: 'r5', imagePath: '/prompts/r5.webp', text: 'What beliefs have you changed your mind about? Why?', category: 'reflection', mood: ['reflective', 'curious'], difficulty: 'advanced', estimatedTime: '20 min', mode: 'reflect' },

  // Creative prompts (mode: write - creative writing)
  { id: 'c1', imagePath: '/prompts/c1.webp', text: 'Invent a word for a feeling that doesn\'t have a name yet.', category: 'creative', mood: ['creative'], difficulty: 'beginner', estimatedTime: '5 min', mode: 'write' },
  { id: 'c2', imagePath: '/prompts/c2.webp', text: 'Describe an ordinary object as if you\'re seeing it for the first time.', category: 'creative', mood: ['creative', 'curious'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'write' },
  { id: 'c3', imagePath: '/prompts/c3.webp', text: 'Write a letter to a technology that will exist in 50 years.', category: 'creative', mood: ['creative'], difficulty: 'intermediate', estimatedTime: '15 min', mode: 'write' },
  { id: 'c4', imagePath: '/prompts/c4.webp', text: 'Create a mini-mythology to explain something in your daily life.', category: 'creative', mood: ['creative'], difficulty: 'intermediate', estimatedTime: '20 min', mode: 'write' },
  { id: 'c5', imagePath: '/prompts/c5.webp', text: 'Write the opening paragraph of your autobiography.', category: 'creative', mood: ['creative', 'reflective'], difficulty: 'intermediate', estimatedTime: '15 min', mode: 'both' },

  // Technical prompts (mode: write - articles, documentation)
  { id: 't1', imagePath: '/prompts/t1.webp', text: 'Document a process you do unconsciously—now that you\'re aware, what do you notice?', category: 'technical', mood: ['focused'], difficulty: 'beginner', estimatedTime: '15 min', mode: 'write' },
  { id: 't2', imagePath: '/prompts/t2.webp', text: 'Explain a complex concept you understand to a complete beginner.', category: 'technical', mood: ['focused', 'energetic'], difficulty: 'intermediate', estimatedTime: '20 min', mode: 'write' },
  { id: 't3', imagePath: '/prompts/t3.webp', text: 'Write about a bug you fixed and what you learned from it.', category: 'technical', mood: ['focused'], difficulty: 'intermediate', estimatedTime: '15 min', mode: 'write' },
  { id: 't4', imagePath: '/prompts/t4.webp', text: 'Create a decision tree for a choice you make regularly.', category: 'technical', mood: ['focused'], difficulty: 'advanced', estimatedTime: '25 min', mode: 'write' },
  { id: 't5', imagePath: '/prompts/t5.webp', text: 'Document your ideal workflow for a task you do often.', category: 'technical', mood: ['focused', 'relaxed'], difficulty: 'intermediate', estimatedTime: '20 min', mode: 'write' },

  // Philosophical prompts (mode: both - works for essays and journaling)
  { id: 'p1', imagePath: '/prompts/p1.webp', text: 'What is something everyone believes that you think is wrong?', category: 'philosophical', mood: ['reflective', 'curious'], difficulty: 'advanced', estimatedTime: '20 min', mode: 'both' },
  { id: 'p2', imagePath: '/prompts/p2.webp', text: 'If you could ask humanity one question, what would it be?', category: 'philosophical', mood: ['curious'], difficulty: 'intermediate', estimatedTime: '15 min', mode: 'both' },
  { id: 'p3', imagePath: '/prompts/p3.webp', text: 'What does "home" mean to you beyond a physical place?', category: 'philosophical', mood: ['reflective'], difficulty: 'intermediate', estimatedTime: '15 min', mode: 'both' },
  { id: 'p4', imagePath: '/prompts/p4.webp', text: 'Is there such a thing as too much knowledge?', category: 'philosophical', mood: ['curious', 'reflective'], difficulty: 'advanced', estimatedTime: '25 min', mode: 'both' },
  { id: 'p5', imagePath: '/prompts/p5.webp', text: 'What would you do differently if no one was watching?', category: 'philosophical', mood: ['reflective'], difficulty: 'intermediate', estimatedTime: '15 min', mode: 'reflect' },

  // Practical prompts (mode: reflect - personal how-tos)
  { id: 'pr1', imagePath: '/prompts/pr1.webp', text: 'Write a guide to the best local spots only you know about.', category: 'practical', mood: ['relaxed', 'energetic'], difficulty: 'beginner', estimatedTime: '15 min', mode: 'reflect' },
  { id: 'pr2', imagePath: '/prompts/pr2.webp', text: 'Document your morning routine and why each step matters.', category: 'practical', mood: ['focused', 'relaxed'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'reflect' },
  { id: 'pr3', imagePath: '/prompts/pr3.webp', text: 'Create a troubleshooting guide for a problem you\'ve solved before.', category: 'practical', mood: ['focused'], difficulty: 'intermediate', estimatedTime: '20 min', mode: 'write' },
  { id: 'pr4', imagePath: '/prompts/pr4.webp', text: 'Write a packing list and rationale for your ideal trip.', category: 'practical', mood: ['relaxed', 'energetic'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'reflect' },
  { id: 'pr5', imagePath: '/prompts/pr5.webp', text: 'Document a skill you\'ve mastered in a way others could follow.', category: 'practical', mood: ['focused', 'energetic'], difficulty: 'advanced', estimatedTime: '30 min', mode: 'write' },

  // Exploration prompts (mode: write - research, articles)
  { id: 'e1', imagePath: '/prompts/e1.webp', text: 'Fall down a Wikipedia rabbit hole for 20 minutes. Document the strangest connection you found.', category: 'exploration', mood: ['curious', 'energetic'], difficulty: 'intermediate', estimatedTime: '25 min', mode: 'write' },
  { id: 'e2', imagePath: '/prompts/e2.webp', text: 'Find three connections between two seemingly unrelated topics.', category: 'exploration', mood: ['curious', 'creative'], difficulty: 'advanced', estimatedTime: '20 min', mode: 'write' },
  { id: 'e3', imagePath: '/prompts/e3.webp', text: 'Pick something you pass every day but never really see. Research its hidden story.', category: 'exploration', mood: ['curious', 'relaxed'], difficulty: 'beginner', estimatedTime: '15 min', mode: 'write' },
  { id: 'e4', imagePath: '/prompts/e4.webp', text: 'Investigate the origin story of something you use daily.', category: 'exploration', mood: ['curious'], difficulty: 'intermediate', estimatedTime: '20 min', mode: 'write' },
  { id: 'e5', imagePath: '/prompts/e5.webp', text: 'Map out an ecosystem (physical, digital, or social) you\'re part of.', category: 'exploration', mood: ['curious', 'focused'], difficulty: 'advanced', estimatedTime: '30 min', mode: 'both' },

  // Personal prompts (mode: reflect - personal journaling)
  { id: 'pe1', imagePath: '/prompts/pe1.webp', text: 'Describe a tradition your family would never skip—and the one time someone tried to.', category: 'personal', mood: ['reflective', 'relaxed'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'reflect' },
  { id: 'pe2', imagePath: '/prompts/pe2.webp', text: 'Pick a family member and write about their reputation in your family—the stories everyone tells.', category: 'personal', mood: ['reflective', 'curious'], difficulty: 'beginner', estimatedTime: '15 min', mode: 'reflect' },
  { id: 'pe3', imagePath: '/prompts/pe3.webp', text: 'What are you currently obsessed with? Explain the fascination.', category: 'personal', mood: ['energetic', 'curious'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'reflect' },
  { id: 'pe4', imagePath: '/prompts/pe4.webp', text: 'Write a letter to someone who shaped who you are today.', category: 'personal', mood: ['reflective'], difficulty: 'intermediate', estimatedTime: '20 min', mode: 'reflect' },
  { id: 'pe5', imagePath: '/prompts/pe5.webp', text: 'Document a recipe that has special meaning to you.', category: 'personal', mood: ['relaxed'], difficulty: 'beginner', estimatedTime: '15 min', mode: 'reflect' },

  // Learning prompts (mode: write - articles, study guides)
  { id: 'l1', imagePath: '/prompts/l1.webp', text: 'What misconception did you recently unlearn? How did you discover the truth?', category: 'learning', mood: ['focused', 'curious'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'both' },
  { id: 'l2', imagePath: '/prompts/l2.webp', text: 'Teach a concept by explaining it three different ways.', category: 'learning', mood: ['focused', 'creative'], difficulty: 'advanced', estimatedTime: '25 min', mode: 'write' },
  { id: 'l3', imagePath: '/prompts/l3.webp', text: 'Create a study guide for something you want to remember.', category: 'learning', mood: ['focused'], difficulty: 'intermediate', estimatedTime: '20 min', mode: 'write' },
  { id: 'l4', imagePath: '/prompts/l4.webp', text: 'What skill looked easy until you tried to learn it? What surprised you?', category: 'learning', mood: ['reflective', 'curious'], difficulty: 'beginner', estimatedTime: '10 min', mode: 'both' },
  { id: 'l5', imagePath: '/prompts/l5.webp', text: 'Document the key insights from a book, video, or article.', category: 'learning', mood: ['focused', 'relaxed'], difficulty: 'intermediate', estimatedTime: '20 min', mode: 'write' },
]

/**
 * All prompts combined (base + nonfiction)
 * Total: 120 prompts (40 base + 80 nonfiction)
 */
export const ALL_PROMPTS: WritingPrompt[] = [...WRITING_PROMPTS, ...NONFICTION_PROMPTS]

/**
 * Get prompts filtered by mood
 */
export function getPromptsByMood(mood: MoodState): WritingPrompt[] {
  return ALL_PROMPTS.filter(p => !p.mood || p.mood.includes(mood))
}

/**
 * Get prompts filtered by category
 */
export function getPromptsByCategory(category: PromptCategory): WritingPrompt[] {
  return ALL_PROMPTS.filter(p => p.category === category)
}

/**
 * Get random prompt, optionally filtered
 */
export function getRandomPrompt(options?: {
  mood?: MoodState
  category?: PromptCategory
  difficulty?: WritingPrompt['difficulty']
}): WritingPrompt {
  let pool = [...ALL_PROMPTS]

  if (options?.mood) {
    pool = pool.filter(p => !p.mood || p.mood.includes(options.mood!))
  }

  if (options?.category) {
    pool = pool.filter(p => p.category === options.category)
  }

  if (options?.difficulty) {
    pool = pool.filter(p => p.difficulty === options.difficulty)
  }

  if (pool.length === 0) {
    pool = ALL_PROMPTS // Fallback to all
  }

  return pool[Math.floor(Math.random() * pool.length)]
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY PROMPT SYSTEM WITH DECAY
// ═══════════════════════════════════════════════════════════════════════════

interface DailyPromptState {
  /** ISO date string for when this state was set */
  date: string
  /** Primary prompt ID for the day */
  primaryPromptId: string
  /** Alternative prompt IDs for the day */
  alternativeIds: string[]
  /** Index of currently selected alternative (0 = primary, 1+ = alternatives) */
  selectedIndex: number
  /** IDs of prompts recently shown (for decay) */
  recentlyShownIds: string[]
}

const DAILY_PROMPT_KEY = 'fabric_daily_prompt_state'
const MAX_RECENTLY_SHOWN = 30 // Don't repeat prompts for ~30 days
const NUM_ALTERNATIVES = 3 // Number of alternative prompts available per day

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get the stored daily prompt state
 */
function getDailyPromptState(): DailyPromptState | null {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem(DAILY_PROMPT_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Save daily prompt state
 */
function saveDailyPromptState(state: DailyPromptState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(DAILY_PROMPT_KEY, JSON.stringify(state))
}

/**
 * Seeded random number generator for consistent daily selection
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

/**
 * Get day of year as seed
 */
function getDaySeed(): number {
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 0)
  const diff = today.getTime() - startOfYear.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay) + today.getFullYear() * 1000
}

/**
 * Get daily prompt (consistent for the day based on date)
 * Features:
 * - Consistent primary prompt per day
 * - Up to 3 alternative prompts selectable
 * - Decay system to avoid repeating prompts too soon
 */
export function getDailyPrompt(mood?: MoodState | null): WritingPrompt {
  const today = getTodayString()
  let state = getDailyPromptState()
  
  // Check if we need to generate new prompts for today
  if (!state || state.date !== today) {
    state = generateDailyPrompts(mood ?? undefined, state?.recentlyShownIds || [])
    saveDailyPromptState(state)
  }
  
  // Get the currently selected prompt
  const selectedId = state.selectedIndex === 0 
    ? state.primaryPromptId 
    : state.alternativeIds[state.selectedIndex - 1]
  
  const prompt = ALL_PROMPTS.find(p => p.id === selectedId)

  // Fallback if prompt not found
  if (!prompt) {
    return ALL_PROMPTS[0]
  }
  
  return prompt
}

/**
 * Generate daily prompts with decay logic
 */
function generateDailyPrompts(mood?: MoodState, recentlyShown: string[] = []): DailyPromptState {
  const today = getTodayString()
  const seed = getDaySeed()
  const random = seededRandom(seed)
  
  // Filter pool by mood if specified
  let pool = mood
    ? ALL_PROMPTS.filter(p => !p.mood || p.mood.includes(mood))
    : ALL_PROMPTS

  if (pool.length === 0) pool = [...ALL_PROMPTS]
  
  // Exclude recently shown prompts
  const availablePool = pool.filter(p => !recentlyShown.includes(p.id))
  const finalPool = availablePool.length >= 4 ? availablePool : pool
  
  // Sort by seeded random to get consistent daily selection
  const shuffled = [...finalPool].sort(() => random() - 0.5)
  
  // Select primary + alternatives
  const primary = shuffled[0]
  const alternatives = shuffled.slice(1, 1 + NUM_ALTERNATIVES)
  
  return {
    date: today,
    primaryPromptId: primary.id,
    alternativeIds: alternatives.map(p => p.id),
    selectedIndex: 0,
    recentlyShownIds: [primary.id, ...recentlyShown].slice(0, MAX_RECENTLY_SHOWN),
  }
}

/**
 * Get alternative prompts for today
 */
export function getDailyAlternatives(mood?: MoodState | null): WritingPrompt[] {
  const today = getTodayString()
  let state = getDailyPromptState()
  
  if (!state || state.date !== today) {
    state = generateDailyPrompts(mood ?? undefined, state?.recentlyShownIds || [])
    saveDailyPromptState(state)
  }
  
  return state.alternativeIds
    .map(id => ALL_PROMPTS.find(p => p.id === id))
    .filter((p): p is WritingPrompt => p !== undefined)
}

/**
 * Select an alternative prompt for today
 * Returns the selected prompt
 */
export function selectDailyAlternative(index: number): WritingPrompt | null {
  const state = getDailyPromptState()
  if (!state) return null
  
  // Update selected index (0 = primary, 1-3 = alternatives)
  const newIndex = Math.max(0, Math.min(index, NUM_ALTERNATIVES))
  
  // Add the new selection to recently shown
  const newPromptId = newIndex === 0 
    ? state.primaryPromptId 
    : state.alternativeIds[newIndex - 1]
  
  const updatedRecentlyShown = [
    newPromptId,
    ...state.recentlyShownIds.filter(id => id !== newPromptId)
  ].slice(0, MAX_RECENTLY_SHOWN)
  
  saveDailyPromptState({
    ...state,
    selectedIndex: newIndex,
    recentlyShownIds: updatedRecentlyShown,
  })
  
  return ALL_PROMPTS.find(p => p.id === newPromptId) || null
}

/**
 * Get the currently selected daily prompt index
 */
export function getDailyPromptIndex(): number {
  const state = getDailyPromptState()
  return state?.selectedIndex || 0
}

/**
 * Get multiple random prompts
 */
export function getRandomPrompts(count: number, options?: {
  mood?: MoodState
  excludeIds?: string[]
}): WritingPrompt[] {
  let pool = [...ALL_PROMPTS]
  
  if (options?.mood) {
    pool = pool.filter(p => !p.mood || p.mood.includes(options.mood!))
  }
  
  if (options?.excludeIds) {
    pool = pool.filter(p => !options.excludeIds!.includes(p.id))
  }
  
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  
  return pool.slice(0, count)
}












