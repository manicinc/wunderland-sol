/**
 * Pixabay API Client
 * @module scripts/media-catalog/providers/pixabay
 * 
 * API Docs: https://pixabay.com/api/docs/
 */

import type { ProviderClient, ProviderSearchResult } from '../types'
import { PROVIDER_LICENSES } from '../types'

const API_BASE = 'https://pixabay.com/api'

interface PixabayImage {
  id: number
  pageURL: string
  type: string
  tags: string
  previewURL: string
  previewWidth: number
  previewHeight: number
  webformatURL: string
  webformatWidth: number
  webformatHeight: number
  largeImageURL: string
  imageWidth: number
  imageHeight: number
  imageSize: number
  views: number
  downloads: number
  collections: number
  likes: number
  comments: number
  user_id: number
  user: string
  userImageURL: string
}

interface PixabaySearchResponse {
  total: number
  totalHits: number
  hits: PixabayImage[]
}

export class PixabayClient implements ProviderClient {
  name = 'pixabay' as const
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Pixabay API key is required')
    }
    this.apiKey = apiKey
  }

  async search(
    query: string,
    options: { perPage?: number; page?: number } = {}
  ): Promise<ProviderSearchResult[]> {
    const { perPage = 15, page = 1 } = options

    const params = new URLSearchParams({
      key: this.apiKey,
      q: query,
      per_page: String(perPage),
      page: String(page),
      orientation: 'horizontal',
      image_type: 'photo',
      safesearch: 'true',
      min_width: '1280',
    })

    const response = await fetch(`${API_BASE}/?${params}`)

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status} ${response.statusText}`)
    }

    const data: PixabaySearchResponse = await response.json()

    return data.hits.map((image) => ({
      id: image.id,
      url: image.largeImageURL,
      thumbnailUrl: image.webformatURL,
      width: image.imageWidth,
      height: image.imageHeight,
      photographer: image.user,
      photographerUrl: `https://pixabay.com/users/${image.user}-${image.user_id}/`,
      sourceUrl: image.pageURL,
      tags: image.tags.split(', ').slice(0, 5),
      alt: `Photo by ${image.user} on Pixabay: ${image.tags}`,
    }))
  }

  getLicense() {
    return PROVIDER_LICENSES.pixabay
  }
}

export function createPixabayClient(): PixabayClient | null {
  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) {
    console.warn('[Pixabay] No API key found in PIXABAY_API_KEY')
    return null
  }
  return new PixabayClient(apiKey)
}

