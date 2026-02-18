/**
 * Media Catalog Types
 * @module scripts/media-catalog/types
 */

export type MediaProvider = 'pexels' | 'pixabay' | 'unsplash' | 'giphy'

export type SoundscapeCategory = 
  | 'rain' 
  | 'ocean' 
  | 'forest' 
  | 'cafe' 
  | 'fireplace' 
  | 'lofi' 
  | 'white-noise'

export type ImageCategory = 
  | SoundscapeCategory 
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
  /** Original width (before processing) */
  width: number
  /** Original height (before processing) */
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
  /** Original provider ID */
  originalId: string | number
  /** Processed file size in bytes (optional, added during processing) */
  fileSize?: number
  /** Thumbnail file size in bytes (optional) */
  thumbnailSize?: number
  /** Path to original hi-res backup (optional, admin only) */
  backupPath?: string
}

export interface CategoryData {
  images: CatalogImage[]
  count: number
  lastUpdated: string
}

export interface MediaCatalog {
  version: string
  generatedAt: string
  totalImages: number
  categories: Record<ImageCategory, CategoryData>
  soundscapeMapping: Record<SoundscapeCategory, ImageCategory[]>
  providers: {
    [key in MediaProvider]: {
      name: string
      license: string
      licenseUrl: string
      attributionRequired: boolean
    }
  }
}

export interface FetchOptions {
  category?: ImageCategory
  limit?: number
  catalogOnly?: boolean
  force?: boolean
  providers?: MediaProvider[]
}

export interface ProviderSearchResult {
  id: string | number
  url: string
  thumbnailUrl: string
  width: number
  height: number
  photographer: string
  photographerUrl: string
  sourceUrl: string
  tags: string[]
  color?: string
  alt?: string
}

export interface ProviderClient {
  name: MediaProvider
  search(query: string, options?: { perPage?: number; page?: number }): Promise<ProviderSearchResult[]>
  getLicense(): { name: string; url: string; attributionRequired: boolean }
}

// Search queries for each category
export const CATEGORY_QUERIES: Record<ImageCategory, string[]> = {
  rain: ['rain window', 'rainy day', 'rain drops glass', 'storm clouds', 'rainy city'],
  ocean: ['ocean waves', 'beach sunset', 'sea horizon', 'coastal', 'underwater'],
  forest: ['forest path', 'misty forest', 'autumn trees', 'woodland', 'jungle'],
  cafe: ['coffee shop interior', 'cozy cafe', 'coffee aesthetic', 'bakery', 'reading nook'],
  fireplace: ['fireplace', 'cozy fire', 'cabin interior', 'warm light', 'candles'],
  lofi: ['lofi aesthetic', 'anime room', 'vaporwave', 'retro computer', 'neon night'],
  'white-noise': ['abstract minimal', 'geometric pattern', 'noise texture', 'gradient'],
  nature: ['landscape', 'meadow', 'river stream', 'waterfall', 'flowers field'],
  urban: ['city night', 'street lights', 'urban sunset', 'rooftop view', 'tokyo streets'],
  abstract: ['abstract art', 'geometric shapes', 'fluid art', 'marble texture', 'bokeh lights'],
  cozy: ['hygge', 'blanket reading', 'warm interior', 'fairy lights', 'window seat'],
  space: ['galaxy', 'nebula', 'stars night sky', 'aurora borealis', 'moon'],
  storm: ['lightning', 'thunderstorm', 'dark clouds', 'dramatic sky'],
  night: ['night city', 'starry sky', 'moonlight', 'midnight blue'],
  sunset: ['golden hour', 'sunset clouds', 'dusk', 'twilight'],
  mountains: ['mountain peak', 'alpine lake', 'snowy mountains', 'mountain sunrise'],
}

// Map soundscapes to relevant image categories
export const SOUNDSCAPE_TO_CATEGORIES: Record<SoundscapeCategory, ImageCategory[]> = {
  rain: ['rain', 'storm', 'urban', 'cozy'],
  ocean: ['ocean', 'nature', 'sunset'],
  forest: ['forest', 'nature', 'mountains'],
  cafe: ['cafe', 'cozy', 'urban'],
  fireplace: ['fireplace', 'cozy', 'night'],
  lofi: ['lofi', 'urban', 'night', 'abstract'],
  'white-noise': ['abstract', 'space', 'nature'],
}

// Provider license info
export const PROVIDER_LICENSES: Record<MediaProvider, { name: string; url: string; attributionRequired: boolean }> = {
  pexels: {
    name: 'Pexels License',
    url: 'https://www.pexels.com/license/',
    attributionRequired: false,
  },
  pixabay: {
    name: 'Pixabay License',
    url: 'https://pixabay.com/service/license/',
    attributionRequired: false,
  },
  unsplash: {
    name: 'Unsplash License',
    url: 'https://unsplash.com/license',
    attributionRequired: true,
  },
  giphy: {
    name: 'Giphy Terms',
    url: 'https://giphy.com/terms',
    attributionRequired: true,
  },
}

