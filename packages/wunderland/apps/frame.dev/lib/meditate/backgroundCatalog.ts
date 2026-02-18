/**
 * Background Catalog Service
 * @module lib/meditate/backgroundCatalog
 * 
 * Client-side library for loading and managing background images
 * from the media catalog for the Meditation Focus page.
 */

import type { SoundscapeType } from '@/lib/audio/ambienceSounds'

// ============================================================================
// TYPES
// ============================================================================

export type MediaProvider = 'pexels' | 'pixabay' | 'unsplash' | 'giphy'

export type ImageCategory = 
  | 'rain' 
  | 'ocean' 
  | 'forest' 
  | 'cafe' 
  | 'fireplace' 
  | 'lofi' 
  | 'white-noise'
  | 'nature' 
  | 'urban' 
  | 'abstract' 
  | 'cozy' 
  | 'space'
  | 'storm'
  | 'night'
  | 'sunset'
  | 'mountains'

export interface CatalogImage {
  /** Unique identifier (provider-id format) */
  id: string
  /** Source provider */
  provider: MediaProvider
  /** Local URL path */
  url: string
  /** Thumbnail URL path */
  thumbnail: string
  /** Original width */
  width: number
  /** Original height */
  height: number
  /** Photographer/creator name */
  photographer: string
  /** Photographer profile URL */
  photographerUrl: string
  /** Original source URL */
  sourceUrl: string
  /** License name */
  license: string
  /** License URL */
  licenseUrl: string
  /** Descriptive tags */
  tags: string[]
  /** Dominant color hex */
  color: string
  /** Whether user can download */
  downloadable: boolean
  /** Alt text for accessibility */
  alt: string
  /** Processed file size in bytes */
  fileSize?: number
  /** Thumbnail file size in bytes */
  thumbnailSize?: number
}

export interface CategoryData {
  images: CatalogImage[]
  count: number
  lastUpdated: string
}

export interface ProviderInfo {
  name: string
  license: string
  licenseUrl: string
  attributionRequired: boolean
}

export interface MediaCatalog {
  version: string
  generatedAt: string
  totalImages: number
  categories: Record<string, CategoryData>
  soundscapeMapping: Record<string, string[]>
  providers: Record<MediaProvider, ProviderInfo>
}

export interface SlideshowConfig {
  /** Images to cycle through */
  images: CatalogImage[]
  /** Transition interval in ms */
  interval: number
  /** Transition type */
  transition: 'crossfade' | 'blur-fade' | 'slide'
  /** Transition duration in ms */
  transitionDuration: number
  /** Shuffle order */
  shuffle: boolean
}

// ============================================================================
// CATALOG LOADER
// ============================================================================

let catalogCache: MediaCatalog | null = null
let catalogPromise: Promise<MediaCatalog> | null = null

/**
 * Get the base URL for media assets
 * On quarry.space, assets are hosted on frame.dev
 * On frame.dev or localhost, use relative paths
 */
function getMediaBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  
  const hostname = window.location.hostname
  
  // On quarry.space domain, use absolute URLs to frame.dev
  if (hostname === 'quarry.space' || hostname.endsWith('.quarry.space')) {
    return 'https://frame.dev'
  }
  
  // On localhost or frame.dev, use relative paths
  return ''
}

/**
 * Load the background catalog
 */
export async function loadCatalog(): Promise<MediaCatalog> {
  if (catalogCache) {
    return catalogCache
  }

  if (catalogPromise) {
    return catalogPromise
  }

  const baseUrl = getMediaBaseUrl()
  const catalogUrl = baseUrl 
    ? `${baseUrl}/media/backgrounds/catalog.json`
    : '/media/backgrounds/catalog.json'

  catalogPromise = fetch(catalogUrl)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load catalog: ${res.status}`)
      }
      return res.json()
    })
    .then((data: MediaCatalog) => {
      // If loading from frame.dev, we need to prefix all image URLs
      if (baseUrl) {
        // Update all image URLs to use absolute paths
        for (const category of Object.values(data.categories)) {
          for (const image of category.images) {
            if (!image.url.startsWith('http')) {
              image.url = `${baseUrl}${image.url}`
            }
            if (!image.thumbnail.startsWith('http')) {
              image.thumbnail = `${baseUrl}${image.thumbnail}`
            }
          }
        }
      }
      catalogCache = data
      return data
    })

  return catalogPromise
}

/**
 * Get images for a specific category
 */
export async function getImagesByCategory(
  category: ImageCategory
): Promise<CatalogImage[]> {
  const catalog = await loadCatalog()
  return catalog.categories[category]?.images || []
}

/**
 * Get images matching a soundscape
 */
export async function getImagesForSoundscape(
  soundscape: SoundscapeType
): Promise<CatalogImage[]> {
  if (soundscape === 'none') {
    return []
  }

  const catalog = await loadCatalog()
  const categories = catalog.soundscapeMapping[soundscape] || []
  const images: CatalogImage[] = []

  for (const category of categories) {
    const categoryImages = catalog.categories[category]?.images || []
    images.push(...categoryImages)
  }

  return images
}

/**
 * Get all available images
 */
export async function getAllImages(): Promise<CatalogImage[]> {
  const catalog = await loadCatalog()
  const images: CatalogImage[] = []

  for (const category of Object.values(catalog.categories)) {
    images.push(...category.images)
  }

  return images
}

/**
 * Get a random image for a soundscape
 */
export async function getRandomImageForSoundscape(
  soundscape: SoundscapeType
): Promise<CatalogImage | null> {
  const images = await getImagesForSoundscape(soundscape)
  if (images.length === 0) return null
  return images[Math.floor(Math.random() * images.length)]
}

/**
 * Search images by tags
 */
export async function searchImages(query: string): Promise<CatalogImage[]> {
  const catalog = await loadCatalog()
  const queryLower = query.toLowerCase()
  const results: CatalogImage[] = []

  for (const category of Object.values(catalog.categories)) {
    for (const image of category.images) {
      const matchesTags = image.tags.some((tag) =>
        tag.toLowerCase().includes(queryLower)
      )
      const matchesAlt = image.alt.toLowerCase().includes(queryLower)

      if (matchesTags || matchesAlt) {
        results.push(image)
      }
    }
  }

  return results
}

/**
 * Get available categories with image counts
 */
export async function getCategories(): Promise<
  Array<{ category: ImageCategory; count: number }>
> {
  const catalog = await loadCatalog()
  return Object.entries(catalog.categories)
    .filter(([_, data]) => data.count > 0)
    .map(([category, data]) => ({
      category: category as ImageCategory,
      count: data.count,
    }))
}

/**
 * Get provider info for attribution
 */
export async function getProviderInfo(
  provider: MediaProvider
): Promise<ProviderInfo | null> {
  const catalog = await loadCatalog()
  return catalog.providers[provider] || null
}

/**
 * Generate attribution text for an image
 */
export function getAttribution(image: CatalogImage): string {
  return `Photo by ${image.photographer} on ${image.provider.charAt(0).toUpperCase() + image.provider.slice(1)}`
}

/**
 * Generate download filename for an image
 */
export function getDownloadFilename(image: CatalogImage): string {
  const tags = image.tags.slice(0, 2).join('-')
  return `${tags}-${image.id}.jpg`
}

// ============================================================================
// SLIDESHOW UTILITIES
// ============================================================================

/**
 * Create slideshow config for a soundscape
 */
export async function createSlideshowForSoundscape(
  soundscape: SoundscapeType,
  options: Partial<SlideshowConfig> = {}
): Promise<SlideshowConfig> {
  const images = await getImagesForSoundscape(soundscape)
  
  const config: SlideshowConfig = {
    images,
    interval: options.interval ?? 30000, // 30 seconds default
    transition: options.transition ?? 'crossfade',
    transitionDuration: options.transitionDuration ?? 2000,
    shuffle: options.shuffle ?? true,
  }

  if (config.shuffle && config.images.length > 0) {
    config.images = shuffleArray([...config.images])
  }

  return config
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

const SELECTED_IMAGES_KEY = 'meditate-selected-backgrounds'
const SLIDESHOW_SETTINGS_KEY = 'meditate-slideshow-settings'

/**
 * Get user's selected images for a soundscape
 */
export function getUserSelectedImages(soundscape: SoundscapeType): string[] {
  try {
    const stored = localStorage.getItem(SELECTED_IMAGES_KEY)
    if (!stored) return []
    const selections = JSON.parse(stored) as Record<string, string[]>
    return selections[soundscape] || []
  } catch {
    return []
  }
}

/**
 * Save user's selected images for a soundscape
 */
export function setUserSelectedImages(
  soundscape: SoundscapeType,
  imageIds: string[]
): void {
  try {
    const stored = localStorage.getItem(SELECTED_IMAGES_KEY)
    const selections = stored ? JSON.parse(stored) : {}
    selections[soundscape] = imageIds
    localStorage.setItem(SELECTED_IMAGES_KEY, JSON.stringify(selections))
  } catch (error) {
    console.warn('[BackgroundCatalog] Failed to save selections:', error)
  }
}

export interface SlideshowSettings {
  interval: number
  transition: 'crossfade' | 'blur-fade' | 'slide'
  transitionDuration: number
  shuffle: boolean
  blurOnInteract: boolean
  blurIntensity: number
}

const DEFAULT_SLIDESHOW_SETTINGS: SlideshowSettings = {
  interval: 30000,
  transition: 'crossfade',
  transitionDuration: 2000,
  shuffle: true,
  blurOnInteract: true,
  blurIntensity: 8, // px
}

/**
 * Get slideshow settings
 */
export function getSlideshowSettings(): SlideshowSettings {
  try {
    const stored = localStorage.getItem(SLIDESHOW_SETTINGS_KEY)
    if (!stored) return DEFAULT_SLIDESHOW_SETTINGS
    return { ...DEFAULT_SLIDESHOW_SETTINGS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_SLIDESHOW_SETTINGS
  }
}

/**
 * Save slideshow settings
 */
export function setSlideshowSettings(
  settings: Partial<SlideshowSettings>
): void {
  try {
    const current = getSlideshowSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(SLIDESHOW_SETTINGS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.warn('[BackgroundCatalog] Failed to save settings:', error)
  }
}

