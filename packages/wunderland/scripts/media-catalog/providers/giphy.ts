/**
 * Giphy API Client
 * @module scripts/media-catalog/providers/giphy
 * 
 * API Docs: https://developers.giphy.com/docs/api
 * 
 * Note: Giphy is for GIFs/animations - useful for lofi aesthetic backgrounds
 */

import type { ProviderClient, ProviderSearchResult } from '../types'
import { PROVIDER_LICENSES } from '../types'

const API_BASE = 'https://api.giphy.com/v1/gifs'

interface GiphyImage {
  url: string
  width: string
  height: string
  size?: string
  mp4?: string
  webp?: string
}

interface GiphyGif {
  id: string
  type: string
  url: string
  slug: string
  title: string
  rating: string
  source: string
  source_tld: string
  source_post_url: string
  username: string
  user?: {
    username: string
    display_name: string
    profile_url: string
  }
  images: {
    original: GiphyImage
    downsized: GiphyImage
    downsized_medium: GiphyImage
    fixed_width: GiphyImage
    fixed_height: GiphyImage
    preview_gif: GiphyImage
  }
}

interface GiphySearchResponse {
  data: GiphyGif[]
  pagination: {
    total_count: number
    count: number
    offset: number
  }
  meta: {
    status: number
    msg: string
    response_id: string
  }
}

export class GiphyClient implements ProviderClient {
  name = 'giphy' as const
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Giphy API key is required')
    }
    this.apiKey = apiKey
  }

  async search(
    query: string,
    options: { perPage?: number; page?: number } = {}
  ): Promise<ProviderSearchResult[]> {
    const { perPage = 15, page = 1 } = options
    const offset = (page - 1) * perPage

    const params = new URLSearchParams({
      api_key: this.apiKey,
      q: query,
      limit: String(perPage),
      offset: String(offset),
      rating: 'g', // Safe for work
      lang: 'en',
    })

    const response = await fetch(`${API_BASE}/search?${params}`)

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status} ${response.statusText}`)
    }

    const data: GiphySearchResponse = await response.json()

    return data.data.map((gif) => ({
      id: gif.id,
      url: gif.images.original.url,
      thumbnailUrl: gif.images.fixed_width.url,
      width: parseInt(gif.images.original.width, 10),
      height: parseInt(gif.images.original.height, 10),
      photographer: gif.user?.display_name || gif.username || 'Unknown',
      photographerUrl: gif.user?.profile_url || `https://giphy.com/channel/${gif.username}`,
      sourceUrl: gif.url,
      tags: gif.title.split(' ').filter((w) => w.length > 2).slice(0, 5),
      alt: gif.title || 'GIF from Giphy',
    }))
  }

  getLicense() {
    return PROVIDER_LICENSES.giphy
  }
}

export function createGiphyClient(): GiphyClient | null {
  const apiKey = process.env.GIPHY_API_KEY
  if (!apiKey) {
    console.warn('[Giphy] No API key found in GIPHY_API_KEY')
    return null
  }
  return new GiphyClient(apiKey)
}

