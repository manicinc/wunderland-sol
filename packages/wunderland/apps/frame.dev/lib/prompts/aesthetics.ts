/**
 * Cohesive Aesthetic Styles for Prompt Images
 * @module lib/prompts/aesthetics
 *
 * V7 STORYBOOK ILLUSTRATION STYLE
 *
 * All prompt images share a cohesive children's book illustration aesthetic:
 * - Clean, charming, recognizable objects
 * - Simple lines, flat pastel colors
 * - White background for clarity
 * - NOT abstract, NOT photorealistic, NOT icon-like
 *
 * Each prompt gets a unique object based on its theme/keywords.
 */

import type { PromptCategory } from '@/lib/codex/prompts'
import type { MoodState } from '@/lib/codex/mood'

/**
 * Aesthetic style definition for image generation
 */
export interface AestheticStyle {
  id: string
  name: string
  description: string
  sdPromptBase: string
  colorPalette: string
  mood: string
  negativePrompt: string
}

/**
 * V7 STORYBOOK BASE STYLE - all prompts share this foundation
 */
const STORYBOOK_BASE_STYLE = `children's book illustration, digital art smooth, \
simple clean lines, flat pastel colors, white background, \
centered composition, charming friendly aesthetic, single recognizable object`

/**
 * V7 NEGATIVE PROMPT - prevents unwanted elements
 */
const STORYBOOK_NEGATIVE_PROMPT = `no text, no letters, no words, no people, no faces, no hands, \
no abstract shapes, no complex scenes, no photography, no 3D rendering, \
no realistic textures, no busy backgrounds, no dark colors`

/**
 * Keyword → Object mapping for prompt-specific illustrations
 * Maps common prompt themes to charming, recognizable objects
 */
const KEYWORD_OBJECTS: Array<[RegExp, string]> = [
  // Reflection & Growth
  [/lesson|learn|growth|grow/, 'a small potted plant with new leaves'],
  [/mirror|reflect|self|identity/, 'a cute hand mirror with ornate frame'],
  [/change|transform|evolve/, 'a butterfly emerging from cocoon'],
  [/past|memory|remember|nostalgia/, 'an old photograph in a frame'],

  // Creative & Imagination
  [/creative|create|invent|imagine/, 'a paintbrush with colorful paint blob'],
  [/write|letter|story|words/, 'a fountain pen with ink bottle'],
  [/dream|wish|hope|future/, 'a paper airplane in flight'],
  [/music|song|melody/, 'a cute ukulele or small guitar'],
  [/art|draw|paint|color/, 'an artist palette with brushes'],

  // Exploration & Discovery
  [/explore|discover|adventure/, 'vintage brass binoculars'],
  [/research|investigate|search/, 'a magnifying glass with sparkle'],
  [/mystery|secret|hidden/, 'a rolled treasure map with wax seal'],
  [/travel|journey|path/, 'a vintage suitcase with stickers'],
  [/map|direction|compass/, 'a golden compass'],

  // Knowledge & Learning
  [/book|read|study|learn/, 'a charming stack of books with bookmark'],
  [/idea|lightbulb|eureka/, 'a glowing lightbulb'],
  [/knowledge|wisdom|teach/, 'an open book with glasses'],
  [/school|education|class/, 'a cute school backpack'],

  // Practical & Organization
  [/plan|organize|list|todo/, 'a spiral notebook with checkmarks'],
  [/goal|achieve|success/, 'a trophy or medal'],
  [/time|schedule|clock/, 'a cute alarm clock'],
  [/work|productivity|focus/, 'a desk lamp'],
  [/tool|build|craft/, 'a wooden toolbox'],

  // Personal & Emotional
  [/home|family|tradition/, 'a cozy armchair with cushion'],
  [/friend|relationship|connect/, 'two coffee cups together'],
  [/love|heart|care/, 'a heart-shaped locket'],
  [/comfort|cozy|warm/, 'a steaming cup of tea'],
  [/gratitude|thankful|appreciate/, 'a gift box with ribbon'],

  // Nature & Environment
  [/nature|tree|forest|garden/, 'a small tree with birds'],
  [/flower|bloom|spring/, 'a flower in a vase'],
  [/ocean|sea|water|wave/, 'a cute sailboat'],
  [/sky|cloud|weather/, 'fluffy clouds with sun'],
  [/animal|pet|creature/, 'a friendly owl'],

  // Abstract & Philosophical
  [/think|thought|philosophy|wonder/, 'a crystal ball on stand'],
  [/question|curious|why/, 'a question mark balloon'],
  [/universe|cosmic|infinite/, 'a telescope pointing at stars'],
  [/balance|harmony|peace/, 'stacked zen stones'],

  // Technical & Modern
  [/technology|digital|computer|code/, 'a cute retro computer'],
  [/data|science|math/, 'geometric shapes and graphs'],
  [/communicate|message|chat/, 'speech bubbles'],
]

/**
 * Category-based aesthetics - V7 STORYBOOK STYLE with accent colors
 *
 * All categories use the same storybook illustration style, colors vary by category.
 */
export const CATEGORY_AESTHETICS: Record<PromptCategory, AestheticStyle> = {
  reflection: {
    id: 'reflection',
    name: 'Reflection',
    description: 'Self-reflection and introspection prompts',
    sdPromptBase: STORYBOOK_BASE_STYLE,
    colorPalette: 'soft lavender, periwinkle, light purple',
    mood: 'gentle and thoughtful',
    negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Creative writing and imagination prompts',
    sdPromptBase: STORYBOOK_BASE_STYLE,
    colorPalette: 'coral, peach, warm orange',
    mood: 'playful and joyful',
    negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
  },
  technical: {
    id: 'technical',
    name: 'Technical',
    description: 'Technical and documentation prompts',
    sdPromptBase: STORYBOOK_BASE_STYLE,
    colorPalette: 'teal, cool blue, mint',
    mood: 'focused and modern',
    negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
  },
  philosophical: {
    id: 'philosophical',
    name: 'Philosophical',
    description: 'Deep questions and philosophical prompts',
    sdPromptBase: STORYBOOK_BASE_STYLE,
    colorPalette: 'deep indigo, soft gold, navy',
    mood: 'contemplative wonder',
    negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
  },
  practical: {
    id: 'practical',
    name: 'Practical',
    description: 'Practical guides and how-to prompts',
    sdPromptBase: STORYBOOK_BASE_STYLE,
    colorPalette: 'warm amber, sage green, cream',
    mood: 'organized and productive',
    negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
  },
  exploration: {
    id: 'exploration',
    name: 'Exploration',
    description: 'Discovery and curiosity prompts',
    sdPromptBase: STORYBOOK_BASE_STYLE,
    colorPalette: 'golden yellow, teal, ocean blue',
    mood: 'curious adventure',
    negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
  },
  personal: {
    id: 'personal',
    name: 'Personal',
    description: 'Personal stories and memories prompts',
    sdPromptBase: STORYBOOK_BASE_STYLE,
    colorPalette: 'warm rose, soft peach, cream',
    mood: 'cozy and intimate',
    negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
  },
  learning: {
    id: 'learning',
    name: 'Learning',
    description: 'Learning and education prompts',
    sdPromptBase: STORYBOOK_BASE_STYLE,
    colorPalette: 'emerald green, warm gold, cream',
    mood: 'discovery and enlightenment',
    negativePrompt: STORYBOOK_NEGATIVE_PROMPT,
  },
}

/**
 * Mood-based accent colors - simplified for flat illustration style
 * Just adds subtle color hints, doesn't change the overall aesthetic
 */
export const MOOD_PALETTES: Record<MoodState, string> = {
  focused: 'subtle blue accent',
  creative: 'warm coral highlights',
  curious: 'soft amber glow',
  relaxed: 'soft teal tint',
  energetic: 'warm orange accent',
  reflective: 'soft purple hint',
  anxious: 'muted warm tones',
  grateful: 'soft rose accent',
  tired: 'gentle gray tones',
  peaceful: 'soft seafoam accent',
  excited: 'bright accent colors',
  neutral: 'balanced neutral tones',
}

/**
 * Generate a complete prompt for V7 storybook illustration
 *
 * Uses keyword matching to select a specific, recognizable object
 * for each prompt, ensuring distinct and charming illustrations.
 *
 * @param promptText - The writing prompt text
 * @param category - The prompt category
 * @param primaryMood - Optional primary mood for color hints
 * @returns A complete SD prompt string for DALL-E
 */
export function generateSDPrompt(
  promptText: string,
  category: PromptCategory,
  primaryMood?: MoodState
): string {
  const aesthetic = CATEGORY_AESTHETICS[category] || CATEGORY_AESTHETICS.reflection

  // Find matching object based on prompt keywords
  const object = findMatchingObject(promptText, category)

  // Build V7 storybook prompt
  const parts = [
    aesthetic.sdPromptBase,
    object,
    `${aesthetic.colorPalette} tones`,
    `${aesthetic.mood} mood`,
    aesthetic.negativePrompt,
  ].filter(Boolean)

  return parts.join(', ')
}

/**
 * Find a matching object for the prompt based on keywords
 */
function findMatchingObject(promptText: string, category: PromptCategory): string {
  const text = promptText.toLowerCase()

  // Check keyword mappings first
  for (const [pattern, object] of KEYWORD_OBJECTS) {
    if (pattern.test(text)) {
      return object
    }
  }

  // Fallback objects by category
  const categoryFallbacks: Record<PromptCategory, string> = {
    reflection: 'a cute hand mirror with ornate frame',
    creative: 'a paintbrush with colorful paint blob',
    exploration: 'vintage brass binoculars',
    philosophical: 'a crystal ball on a small stand',
    learning: 'a charming stack of books with bookmark',
    practical: 'a spiral notebook with checkmarks',
    personal: 'a cozy armchair with cushion',
    technical: 'a cute retro computer with rounded edges',
  }

  return categoryFallbacks[category] || 'a charming decorative object'
}

/**
 * Generate a complete prompt with negative prompt
 */
export function generateSDPromptWithNegative(
  promptText: string,
  category: PromptCategory,
  primaryMood?: MoodState
): { prompt: string; negativePrompt: string } {
  const aesthetic = CATEGORY_AESTHETICS[category] || CATEGORY_AESTHETICS.reflection

  return {
    prompt: generateSDPrompt(promptText, category, primaryMood),
    negativePrompt: aesthetic.negativePrompt,
  }
}


/**
 * Get aesthetic by category ID
 */
export function getAesthetic(category: PromptCategory): AestheticStyle {
  return CATEGORY_AESTHETICS[category] || CATEGORY_AESTHETICS.reflection
}

/**
 * Get all aesthetic names for UI display
 */
export function getAestheticNames(): { id: PromptCategory; name: string }[] {
  return Object.entries(CATEGORY_AESTHETICS).map(([id, aesthetic]) => ({
    id: id as PromptCategory,
    name: aesthetic.name,
  }))
}
