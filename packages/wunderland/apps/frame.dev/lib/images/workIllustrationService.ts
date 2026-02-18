/**
 * Work Illustration Service
 * @module lib/images/workIllustrationService
 *
 * Profile-aware illustration generation for PDF/EPUB works.
 * Applies work style profiles to ensure visual consistency.
 */

import type { WorkStyleProfile, ReferenceImage } from './workStyleProfile'
import { getIllustrationPreset } from './illustrationPresets'
import type { GeneratedImage, GenerateOptions } from './service'
import { generateImage } from './service'
import { incrementIllustrationCount, addReferenceImage } from './workStyleProfile'

export interface IllustrationContext {
  chunkId?: string
  pageNumber?: number
  illustrationIndex?: number
  characterNames?: string[]
  settingName?: string
  sceneDescription?: string
}

export interface WorkGenerateOptions extends Omit<GenerateOptions, 'promptPrefix' | 'promptSuffix' | 'negativePrompt' | 'seed'> {
  /** Override provider preference from preset */
  provider?: 'openai' | 'replicate'
  /** Force specific seed (overrides profile strategy) */
  forceSeed?: number
  /** Generate reference image for first occurrence */
  generateReference?: boolean
}

/**
 * Generate illustration for a work with profile-aware styling
 */
export async function generateWorkIllustration(
  profile: WorkStyleProfile,
  context: IllustrationContext,
  options: WorkGenerateOptions
): Promise<{
  image: GeneratedImage
  updatedProfile: WorkStyleProfile
}> {
  // Load illustration preset
  const preset = getIllustrationPreset(profile.illustrationPreset.presetId)
  if (!preset) {
    throw new Error(`Illustration preset not found: ${profile.illustrationPreset.presetId}`)
  }

  // Build enhanced prompt with profile context
  const enhancedPrompt = buildWorkPrompt(profile, context, options.prompt)

  // Determine seed based on consistency strategy
  const seed = determineSeed(profile, context, options.forceSeed)

  // Find reference image if using reference strategy
  const referenceImage = findReferenceImage(profile, context)

  // Merge preset styles with any customizations
  const customizations = profile.illustrationPreset.customizations
  const promptPrefix = customizations?.promptPrefix || preset.promptPrefix
  const promptSuffix = customizations?.promptSuffix || preset.promptSuffix
  const negativePrompt = customizations?.negativePrompt || preset.negativePrompt

  // Determine provider (user override > preset preference)
  const provider = options.provider || preset.preferredProvider

  // Generate the image
  const image = await generateImage({
    ...options,
    prompt: enhancedPrompt,
    promptPrefix,
    promptSuffix,
    negativePrompt,
    seed,
    referenceImage,
    model: options.model || preset.modelPreference,
    metadata: {
      ...options.metadata,
      workId: profile.workId,
      workTitle: profile.workTitle,
      presetId: profile.illustrationPreset.presetId,
      chunkId: context.chunkId,
      pageNumber: context.pageNumber,
      illustrationIndex: context.illustrationIndex,
    },
  }, provider)

  // Update profile
  let updatedProfile = incrementIllustrationCount(profile)

  // Store as reference image if first of its kind
  if (options.generateReference && shouldStoreAsReference(profile, context)) {
    const type = context.characterNames && context.characterNames.length > 0
      ? 'character'
      : context.settingName
      ? 'setting'
      : 'style'

    const entityId = context.characterNames?.[0] || context.settingName

    const refImage: Omit<ReferenceImage, 'id' | 'generatedAt'> = {
      type,
      entityId,
      imageUrl: image.url,
      dataUrl: image.base64,
      seed,
    }

    updatedProfile = addReferenceImage(updatedProfile, refImage)
  }

  return { image, updatedProfile }
}

/**
 * Build prompt with work-specific context
 */
function buildWorkPrompt(
  profile: WorkStyleProfile,
  context: IllustrationContext,
  basePrompt: string
): string {
  let prompt = basePrompt

  // Add character descriptions if mentioned
  if (context.characterNames && context.characterNames.length > 0) {
    const characterDescriptions = context.characterNames
      .map(name => {
        const char = profile.characters.find(c => c.name.toLowerCase() === name.toLowerCase())
        if (char) {
          const traits = char.visualTraits.join(', ')
          return `${char.name}: ${char.description}. Visual traits: ${traits}.`
        }
        return null
      })
      .filter(Boolean)
      .join(' ')

    if (characterDescriptions) {
      prompt = `${characterDescriptions}\n\n${prompt}`
    }
  }

  // Add setting description if mentioned
  if (context.settingName) {
    const setting = profile.settings.find(s => s.name.toLowerCase() === context.settingName!.toLowerCase())
    if (setting) {
      const styleDesc = setting.visualStyle.join(', ')
      const settingInfo = `Setting: ${setting.name}. ${setting.description}. Visual style: ${styleDesc}.`
      prompt = `${settingInfo}\n\n${prompt}`
    }
  }

  // Add color palette guidance
  const colors = profile.colorPalette.primary.slice(0, 3).join(', ')
  const moodNote = `Color palette mood: ${profile.colorPalette.mood}. Dominant colors: ${colors}.`

  prompt = `${prompt}\n\n${moodNote}`

  return prompt
}

/**
 * Determine seed based on consistency strategy
 */
function determineSeed(
  profile: WorkStyleProfile,
  context: IllustrationContext,
  forceSeed?: number
): number | undefined {
  // Force seed overrides everything
  if (forceSeed !== undefined) {
    return forceSeed
  }

  // Strategy-based seed
  switch (profile.consistencyStrategy) {
    case 'seed':
      // Use character seed if character is mentioned
      if (context.characterNames && context.characterNames.length > 0) {
        const charName = context.characterNames[0]
        const char = profile.characters.find(c => c.name.toLowerCase() === charName.toLowerCase())
        if (char?.seed) {
          return char.seed
        }
      }

      // Use setting seed if setting is mentioned
      if (context.settingName) {
        const setting = profile.settings.find(s => s.name.toLowerCase() === context.settingName!.toLowerCase())
        if (setting?.seed) {
          return setting.seed
        }
      }

      // Use master seed as fallback
      return profile.masterSeed

    case 'reference':
      // Reference strategy doesn't use seeds (uses referenceImage instead)
      return undefined

    case 'style-transfer':
      // Style transfer uses the first image's style
      return profile.referenceImages.length === 0 ? Date.now() : undefined

    default:
      return undefined
  }
}

/**
 * Find reference image for consistency
 */
function findReferenceImage(
  profile: WorkStyleProfile,
  context: IllustrationContext
): string | undefined {
  if (profile.consistencyStrategy !== 'reference' && profile.consistencyStrategy !== 'style-transfer') {
    return undefined
  }

  // Look for character reference
  if (context.characterNames && context.characterNames.length > 0) {
    const charName = context.characterNames[0]
    const char = profile.characters.find(c => c.name.toLowerCase() === charName.toLowerCase())
    if (char) {
      const refImage = profile.referenceImages.find(ri => ri.type === 'character' && ri.entityId === char.id)
      if (refImage) {
        return refImage.imageUrl
      }
    }
  }

  // Look for setting reference
  if (context.settingName) {
    const setting = profile.settings.find(s => s.name.toLowerCase() === context.settingName!.toLowerCase())
    if (setting) {
      const refImage = profile.referenceImages.find(ri => ri.type === 'setting' && ri.entityId === setting.id)
      if (refImage) {
        return refImage.imageUrl
      }
    }
  }

  // Use first style reference as fallback (for style-transfer strategy)
  if (profile.consistencyStrategy === 'style-transfer' && profile.referenceImages.length > 0) {
    const styleRef = profile.referenceImages.find(ri => ri.type === 'style')
    if (styleRef) {
      return styleRef.imageUrl
    }
    // If no style reference, use any reference
    return profile.referenceImages[0].imageUrl
  }

  return undefined
}

/**
 * Check if this illustration should be stored as a reference
 */
function shouldStoreAsReference(
  profile: WorkStyleProfile,
  context: IllustrationContext
): boolean {
  // Only for reference or style-transfer strategies
  if (profile.consistencyStrategy !== 'reference' && profile.consistencyStrategy !== 'style-transfer') {
    return false
  }

  // For character: store if this is the first image of this character
  if (context.characterNames && context.characterNames.length > 0) {
    const charName = context.characterNames[0]
    const char = profile.characters.find(c => c.name.toLowerCase() === charName.toLowerCase())
    if (char) {
      const existing = profile.referenceImages.find(ri => ri.type === 'character' && ri.entityId === char.id)
      return !existing
    }
  }

  // For setting: store if this is the first image of this setting
  if (context.settingName) {
    const setting = profile.settings.find(s => s.name.toLowerCase() === context.settingName!.toLowerCase())
    if (setting) {
      const existing = profile.referenceImages.find(ri => ri.type === 'setting' && ri.entityId === setting.id)
      return !existing
    }
  }

  // For style-transfer: store the very first image
  if (profile.consistencyStrategy === 'style-transfer') {
    return profile.referenceImages.length === 0
  }

  return false
}

/**
 * Batch generate illustrations for multiple contexts
 */
export async function generateWorkIllustrationBatch(
  profile: WorkStyleProfile,
  contexts: IllustrationContext[],
  options: Omit<WorkGenerateOptions, 'prompt'> & { prompts: string[] }
): Promise<{
  images: GeneratedImage[]
  updatedProfile: WorkStyleProfile
}> {
  if (contexts.length !== options.prompts.length) {
    throw new Error('Number of contexts must match number of prompts')
  }

  const images: GeneratedImage[] = []
  let currentProfile = profile

  // Generate sequentially to maintain reference tracking
  for (let i = 0; i < contexts.length; i++) {
    const result = await generateWorkIllustration(
      currentProfile,
      contexts[i],
      {
        ...options,
        prompt: options.prompts[i],
      }
    )

    images.push(result.image)
    currentProfile = result.updatedProfile
  }

  return { images, updatedProfile: currentProfile }
}

/**
 * Estimate cost for work illustration generation
 */
export function estimateWorkIllustrationCost(
  profile: WorkStyleProfile,
  count: number,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
  quality: 'standard' | 'hd' = 'standard'
): number {
  const preset = getIllustrationPreset(profile.illustrationPreset.presetId)
  if (!preset) {
    return 0
  }

  // Cost per image based on provider and settings
  let costPerImage = 0

  if (preset.preferredProvider === 'openai') {
    // OpenAI DALL-E 3 pricing
    if (size === '1024x1024') {
      costPerImage = quality === 'hd' ? 0.08 : 0.04
    } else {
      // Non-square is 2x cost
      costPerImage = quality === 'hd' ? 0.12 : 0.08
    }
  } else {
    // Replicate Flux pricing
    const model = preset.modelPreference || 'flux-dev'
    if (model === 'flux-schnell') {
      costPerImage = 0.003
    } else if (model === 'flux-dev') {
      costPerImage = 0.025
    } else if (model === 'flux-pro') {
      costPerImage = 0.055
    }
  }

  return costPerImage * count
}
