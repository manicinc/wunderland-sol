/**
 * Unsplash API Client
 * @module scripts/media-catalog/providers/unsplash
 * 
 * API Docs: https://unsplash.com/documentation
 */

import type { ProviderClient, ProviderSearchResult } from '../types'
import { PROVIDER_LICENSES } from '../types'

const API_BASE = 'https://api.unsplash.com'

interface UnsplashPhoto {
  id: string
  created_at: string
  updated_at: string
  width: number
  height: number
  color: string
  blur_hash: string
  description: string | null
  alt_description: string | null
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  links: {
    self: string
    html: string
    download: string
    download_location: string
  }
  user: {
    id: string
    username: string
    name: string
    portfolio_url: string | null
    bio: string | null
    location: string | null
    links: {
      self: string
      html: string
      photos: string
      likes: string
      portfolio: string
    }
  }
  tags?: Array<{ title: string }>
}

interface UnsplashSearchResponse {
  total: number
  total_pages: number
  results: UnsplashPhoto[]
}

export class UnsplashClient implements ProviderClient {
  name = 'unsplash' as const
  private accessKey: string

  constructor(accessKey: string) {
    if (!accessKey) {
      throw new Error('Unsplash Access Key is required')
    }
    this.accessKey = accessKey
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

    const response = await fetch(`${API_BASE}/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${this.accessKey}`,
        'Accept-Version': 'v1',
      },
    })

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`)
    }

    const data: UnsplashSearchResponse = await response.json()

    return data.results.map((photo) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      width: photo.width,
      height: photo.height,
      photographer: photo.user.name,
      photographerUrl: `${photo.user.links.html}?utm_source=quarry&utm_medium=referral`,
      sourceUrl: `${photo.links.html}?utm_source=quarry&utm_medium=referral`,
      tags: photo.tags?.map((t) => t.title).slice(0, 5) || [],
      color: photo.color,
      alt: photo.alt_description || photo.description || `Photo by ${photo.user.name} on Unsplash`,
    }))
  }

  /**
   * Trigger download event (required by Unsplash API guidelines)
   */
  async triggerDownload(downloadLocation: string): Promise<void> {
    try {
      await fetch(downloadLocation, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
      })
    } catch (error) {
      console.warn('[Unsplash] Failed to trigger download event:', error)
    }
  }

  getLicense() {
    return PROVIDER_LICENSES.unsplash
  }
}

export function createUnsplashClient(): UnsplashClient | null {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    console.warn('[Unsplash] No API key found in UNSPLASH_ACCESS_KEY')
    return null
  }
  return new UnsplashClient(accessKey)
}

