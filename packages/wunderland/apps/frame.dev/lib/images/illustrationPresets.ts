/**
 * Illustration Style Presets
 * @module lib/images/illustrationPresets
 *
 * Predefined illustration styles for AI-generated book illustrations.
 * Separate from visualization presets (page layout/typography).
 */

export type IllustrationArtStyle =
  | 'line-art'
  | 'watercolor'
  | 'editorial'
  | 'photorealistic'
  | 'minimalist'
  | 'diagram'
  | 'cartoon'
  | 'pencil-sketch'

export type IllustrationColorTreatment =
  | 'muted'
  | 'vibrant'
  | 'monochrome'
  | 'duotone'
  | 'full-color'

export type IllustrationDetailLevel =
  | 'minimal'
  | 'moderate'
  | 'detailed'
  | 'highly-detailed'

export type IllustrationCategory =
  | 'narrative'
  | 'technical'
  | 'educational'
  | 'artistic'

export interface IllustrationPreset {
  id: string
  name: string
  description: string
  category: IllustrationCategory

  // AI generation prompts
  promptPrefix: string
  promptSuffix: string
  negativePrompt: string

  // Style characteristics
  artStyle: IllustrationArtStyle
  colorTreatment: IllustrationColorTreatment
  detailLevel: IllustrationDetailLevel

  // Consistency strategy
  defaultStrategy: 'seed' | 'reference' | 'style-transfer'

  // Auto-recommendation mapping
  suitableFor: string[] // ['fiction-adult', 'technical-docs', etc.]

  // Provider preferences
  preferredProvider: 'openai' | 'replicate'
  modelPreference?: string

  // Example keywords for this style
  exampleKeywords?: string[]
}

/**
 * All available illustration presets
 */
export const ILLUSTRATION_PRESETS: Record<string, IllustrationPreset> = {
  'line-art-editorial': {
    id: 'line-art-editorial',
    name: 'Line Art Editorial',
    description: 'Clean black and white line drawings, perfect for classic fiction and editorial content',
    category: 'narrative',

    promptPrefix: 'Clean editorial line art illustration in black and white.',
    promptSuffix: 'Crisp lines, clear composition, minimal shading, professional editorial style. High contrast, no gradients.',
    negativePrompt: 'color, gradient, blur, photorealistic, messy lines, sketchy, rough',

    artStyle: 'line-art',
    colorTreatment: 'monochrome',
    detailLevel: 'moderate',

    defaultStrategy: 'seed',

    suitableFor: ['fiction-adult', 'fiction-ya', 'non-fiction-general', 'literary'],

    preferredProvider: 'openai',

    exampleKeywords: ['classic', 'editorial', 'clean', 'professional', 'literary'],
  },

  'muted-watercolor': {
    id: 'muted-watercolor',
    name: 'Muted Watercolor',
    description: 'Soft, artistic watercolor style with muted tones for literary fiction',
    category: 'artistic',

    promptPrefix: 'Soft watercolor illustration with muted, desaturated colors.',
    promptSuffix: 'Gentle washes, subtle color blending, artistic and contemplative mood. Painterly texture, organic edges, atmospheric.',
    negativePrompt: 'vibrant colors, sharp lines, photorealistic, digital, neon, bright, saturated',

    artStyle: 'watercolor',
    colorTreatment: 'muted',
    detailLevel: 'moderate',

    defaultStrategy: 'reference',

    suitableFor: ['fiction-literary', 'fiction-adult', 'memoir', 'poetry'],

    preferredProvider: 'replicate',
    modelPreference: 'flux-dev',

    exampleKeywords: ['literary', 'artistic', 'contemplative', 'soft', 'emotional'],
  },

  'technical-diagram': {
    id: 'technical-diagram',
    name: 'Technical Diagram',
    description: 'Precise, clean diagrams for technical documentation and educational content',
    category: 'technical',

    promptPrefix: 'Technical diagram illustration with clean lines and labels.',
    promptSuffix: 'Precise geometry, clear labels, minimalist color palette (blue, gray, white), professional documentation style. Isometric or flat design, ample whitespace.',
    negativePrompt: 'artistic, painterly, messy, hand-drawn, photorealistic, cluttered, decorative',

    artStyle: 'diagram',
    colorTreatment: 'duotone',
    detailLevel: 'detailed',

    defaultStrategy: 'seed',

    suitableFor: ['technical-docs', 'educational-technical', 'non-fiction-technical', 'howto'],

    preferredProvider: 'openai',

    exampleKeywords: ['technical', 'diagram', 'architecture', 'system', 'process', 'workflow'],
  },

  'photorealistic-scene': {
    id: 'photorealistic-scene',
    name: 'Photorealistic Scene',
    description: 'Detailed, realistic scene illustrations for immersive storytelling',
    category: 'narrative',

    promptPrefix: 'Photorealistic scene illustration with cinematic lighting.',
    promptSuffix: 'Highly detailed, realistic textures, dramatic lighting, depth of field, professional photography quality. Rich colors, atmospheric perspective.',
    negativePrompt: 'cartoon, sketch, line art, flat colors, abstract, simplified, low detail',

    artStyle: 'photorealistic',
    colorTreatment: 'full-color',
    detailLevel: 'highly-detailed',

    defaultStrategy: 'reference',

    suitableFor: ['fiction-thriller', 'fiction-scifi', 'fiction-historical', 'non-fiction-narrative'],

    preferredProvider: 'replicate',
    modelPreference: 'flux-pro',

    exampleKeywords: ['realistic', 'immersive', 'cinematic', 'detailed', 'dramatic'],
  },

  'minimalist-symbolic': {
    id: 'minimalist-symbolic',
    name: 'Minimalist Symbolic',
    description: 'Abstract, minimalist representations focusing on core concepts',
    category: 'artistic',

    promptPrefix: 'Minimalist symbolic illustration with simple geometric shapes.',
    promptSuffix: 'Clean composition, limited color palette (2-3 colors), negative space, abstract representation of concepts. Modern, sophisticated aesthetic.',
    negativePrompt: 'detailed, realistic, busy, complex, photographic, ornate, cluttered',

    artStyle: 'minimalist',
    colorTreatment: 'duotone',
    detailLevel: 'minimal',

    defaultStrategy: 'seed',

    suitableFor: ['non-fiction-business', 'non-fiction-self-help', 'educational-concepts', 'philosophy'],

    preferredProvider: 'openai',

    exampleKeywords: ['minimal', 'concept', 'abstract', 'modern', 'symbolic'],
  },

  'childrens-cartoon': {
    id: 'childrens-cartoon',
    name: "Children's Cartoon",
    description: 'Playful, colorful cartoon style perfect for children\'s books',
    category: 'narrative',

    promptPrefix: "Playful children's book illustration with vibrant colors and friendly characters.",
    promptSuffix: 'Soft rounded shapes, bright happy colors, approachable and fun style. Simple forms, expressive faces, whimsical details.',
    negativePrompt: 'scary, dark, realistic, complex, adult themes, muted colors, serious',

    artStyle: 'cartoon',
    colorTreatment: 'vibrant',
    detailLevel: 'moderate',

    defaultStrategy: 'reference',

    suitableFor: ['fiction-children', 'educational-children', 'picture-book'],

    preferredProvider: 'replicate',
    modelPreference: 'flux-dev',

    exampleKeywords: ['children', 'playful', 'colorful', 'fun', 'friendly', 'whimsical'],
  },

  'pencil-sketch': {
    id: 'pencil-sketch',
    name: 'Pencil Sketch',
    description: 'Hand-drawn pencil sketch aesthetic for journals and intimate narratives',
    category: 'artistic',

    promptPrefix: 'Hand-drawn pencil sketch illustration with graphite shading.',
    promptSuffix: 'Visible pencil strokes, organic hatching and cross-hatching, sketch-like quality. Raw, authentic feel with subtle smudging and texture.',
    negativePrompt: 'digital, clean lines, perfect, polished, color, photographic, vector',

    artStyle: 'pencil-sketch',
    colorTreatment: 'monochrome',
    detailLevel: 'moderate',

    defaultStrategy: 'seed',

    suitableFor: ['memoir', 'journal', 'fiction-personal', 'poetry', 'non-fiction-memoir'],

    preferredProvider: 'openai',

    exampleKeywords: ['sketch', 'hand-drawn', 'personal', 'intimate', 'journal', 'raw'],
  },

  'noir-graphic-novel': {
    id: 'noir-graphic-novel',
    name: 'Noir Graphic Novel',
    description: 'High-contrast dramatic style for thrillers and dark fiction',
    category: 'narrative',

    promptPrefix: 'Noir graphic novel illustration with high contrast and dramatic shadows.',
    promptSuffix: 'Strong black shadows, stark lighting, limited color palette (black, white, one accent color). Moody, cinematic, dramatic atmosphere. Bold composition.',
    negativePrompt: 'bright colors, soft lighting, cheerful, pastel, light mood, gentle, cute',

    artStyle: 'editorial',
    colorTreatment: 'duotone',
    detailLevel: 'detailed',

    defaultStrategy: 'reference',

    suitableFor: ['fiction-thriller', 'fiction-mystery', 'fiction-noir', 'fiction-dystopian'],

    preferredProvider: 'replicate',
    modelPreference: 'flux-dev',

    exampleKeywords: ['noir', 'dark', 'dramatic', 'thriller', 'mystery', 'moody', 'shadow'],
  },
}

/**
 * Get a preset by ID
 */
export function getIllustrationPreset(id: string): IllustrationPreset | undefined {
  return ILLUSTRATION_PRESETS[id]
}

/**
 * Get all preset IDs
 */
export function getAllPresetIds(): string[] {
  return Object.keys(ILLUSTRATION_PRESETS)
}

/**
 * Get all presets as array
 */
export function getAllPresets(): IllustrationPreset[] {
  return Object.values(ILLUSTRATION_PRESETS)
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: IllustrationCategory): IllustrationPreset[] {
  return getAllPresets().filter(p => p.category === category)
}

/**
 * Get presets suitable for a specific content type
 */
export function getPresetsForContentType(contentType: string): IllustrationPreset[] {
  return getAllPresets().filter(p =>
    p.suitableFor.some(s => s.includes(contentType.toLowerCase()))
  )
}

/**
 * Find best preset match based on keywords
 */
export function findPresetByKeywords(keywords: string[]): IllustrationPreset | null {
  const lowerKeywords = keywords.map(k => k.toLowerCase())

  // Score each preset based on keyword matches
  const scored = getAllPresets().map(preset => {
    const allPresetKeywords = [
      ...preset.exampleKeywords || [],
      ...preset.suitableFor,
      preset.category,
      preset.artStyle,
    ].map(k => k.toLowerCase())

    const matchCount = lowerKeywords.filter(kw =>
      allPresetKeywords.some(pk => pk.includes(kw) || kw.includes(pk))
    ).length

    return { preset, score: matchCount }
  })

  // Return highest scoring preset
  scored.sort((a, b) => b.score - a.score)

  return scored[0] && scored[0].score > 0 ? scored[0].preset : null
}

/**
 * Get default preset (fallback)
 */
export function getDefaultPreset(): IllustrationPreset {
  return ILLUSTRATION_PRESETS['line-art-editorial']
}
