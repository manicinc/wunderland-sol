/**
 * Media Provider Registry
 * @module scripts/media-catalog/providers
 */

export { PexelsClient, createPexelsClient } from './pexels'
export { PixabayClient, createPixabayClient } from './pixabay'
export { UnsplashClient, createUnsplashClient } from './unsplash'
export { GiphyClient, createGiphyClient } from './giphy'

import type { ProviderClient, MediaProvider } from '../types'
import { createPexelsClient } from './pexels'
import { createPixabayClient } from './pixabay'
import { createUnsplashClient } from './unsplash'
import { createGiphyClient } from './giphy'

/**
 * Create all available provider clients based on environment variables
 */
export function createAllProviders(): Map<MediaProvider, ProviderClient> {
  const providers = new Map<MediaProvider, ProviderClient>()

  const pexels = createPexelsClient()
  if (pexels) providers.set('pexels', pexels)

  const pixabay = createPixabayClient()
  if (pixabay) providers.set('pixabay', pixabay)

  const unsplash = createUnsplashClient()
  if (unsplash) providers.set('unsplash', unsplash)

  const giphy = createGiphyClient()
  if (giphy) providers.set('giphy', giphy)

  return providers
}

/**
 * Create specific providers
 */
export function createProviders(names: MediaProvider[]): Map<MediaProvider, ProviderClient> {
  const all = createAllProviders()
  const selected = new Map<MediaProvider, ProviderClient>()
  
  for (const name of names) {
    const provider = all.get(name)
    if (provider) {
      selected.set(name, provider)
    }
  }
  
  return selected
}

