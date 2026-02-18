/**
 * Pexels API Client
 * @module scripts/media-catalog/providers/pexels
 * 
 * API Docs: https://www.pexels.com/api/documentation/
 */

import type { ProviderClient, ProviderSearchResult } from '../types'
import { PROVIDER_LICENSES } from '../types'

const API_BASE = 'https://api.pexels.com/v1'

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  photographer_id: number
  avg_color: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  liked: boolean
  alt: string
}

interface PexelsSearchResponse {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page?: string
}

export class PexelsClient implements ProviderClient {
  name = 'pexels' as const
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Pexels API key is required')
    }
    this.apiKey = apiKey
  }

  async search(
    query: string,
    options: { perPage?: number; page?: number } = {}
  ): Promise<ProviderSearchResult[]> {
    const { perPage = 15, page = 1 } = options

    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      page: String(page),
      orientation: 'landscape',
    })

    const response = await fetch(`${API_BASE}/search?${params}`, {
      headers: {
        Authorization: this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`)
    }

    const data: PexelsSearchResponse = await response.json()

    return data.photos.map((photo) => ({
      id: photo.id,
      url: photo.src.large2x || photo.src.large,
      thumbnailUrl: photo.src.medium,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      sourceUrl: photo.url,
      tags: photo.alt ? photo.alt.split(' ').slice(0, 5) : [],
      color: photo.avg_color,
      alt: photo.alt || `Photo by ${photo.photographer}`,
    }))
  }

  getLicense() {
    return PROVIDER_LICENSES.pexels
  }
}

export function createPexelsClient(): PexelsClient | null {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    console.warn('[Pexels] No API key found in PEXELS_API_KEY')
    return null
  }
  return new PexelsClient(apiKey)
}

