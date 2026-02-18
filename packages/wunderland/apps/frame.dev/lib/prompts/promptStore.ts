/**
 * Prompt Store - IndexedDB Storage
 * @module lib/prompts/promptStore
 *
 * Persistent storage for prompts and cached images using IndexedDB.
 * Handles curated prompt import, custom prompt creation, and image caching.
 */

import { WRITING_PROMPTS } from '@/lib/codex/prompts'
import { NONFICTION_PROMPTS } from './nonfictionPrompts'
import { WRITERS_DIGEST_PROMPTS } from './writersDigestPrompts'
import type {
  GalleryPrompt,
  PromptFilter,
  PromptPreferences,
  PromptStoreState,
  ImageStyle,
} from './types'
import { DEFAULT_PROMPT_PREFERENCES } from './types'

// Static image catalog mapping prompt IDs to image paths
// This is loaded at build time if images have been pre-generated
interface ImageCatalogEntry {
  id: string
  imagePath: string
}

let staticImageCatalog: Map<string, string> | null = null

/**
 * Get the base URL for prompt images
 * On quarry.space, images are hosted on frame.dev
 * On frame.dev or localhost, use relative paths
 */
function getPromptImageBaseUrl(): string {
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
 * Load static image catalog (if available)
 * Images are served from /prompts/{id}.png
 */
async function loadImageCatalog(): Promise<Map<string, string>> {
  if (staticImageCatalog) return staticImageCatalog

  staticImageCatalog = new Map()
  const baseUrl = getPromptImageBaseUrl()

  try {
    // Try to fetch the catalog - use frame.dev on quarry.space
    const catalogUrl = baseUrl ? `${baseUrl}/prompts/catalog.json` : '/prompts/catalog.json'
    const response = await fetch(catalogUrl)
    if (response.ok) {
      const catalog = await response.json()
      if (catalog.images && Array.isArray(catalog.images)) {
        for (const entry of catalog.images) {
          if (entry.id && entry.imagePath) {
            // Prepend base URL for absolute paths on quarry.space
            const fullPath = baseUrl ? `${baseUrl}${entry.imagePath}` : entry.imagePath
            staticImageCatalog.set(entry.id, fullPath)
          }
        }
        console.log(`[PromptStore] Loaded ${staticImageCatalog.size} pre-generated images from ${baseUrl || 'local'}`)
      }
    }
  } catch (error) {
    // Catalog not available - images will be generated on-demand
    console.log('[PromptStore] No pre-generated image catalog found')
  }

  return staticImageCatalog
}

/**
 * Get static image URL for a prompt ID
 */
function getStaticImageUrl(promptId: string): string | undefined {
  return staticImageCatalog?.get(promptId)
}

/**
 * Get placeholder image URL for a category
 * Falls back to category-specific SVG placeholders when no generated image exists
 */
function getPlaceholderImageUrl(category: string): string {
  const validCategories = [
    'creative',
    'reflection',
    'philosophical',
    'personal',
    'technical',
    'practical',
    'learning',
    'exploration',
  ]
  const safeCategory = validCategories.includes(category) ? category : 'creative'
  const baseUrl = getPromptImageBaseUrl()
  return `${baseUrl}/prompts/placeholders/${safeCategory}.svg`
}

const DB_NAME = 'frame-prompts'
const DB_VERSION = 1
const STORE_PROMPTS = 'prompts'
const STORE_PREFERENCES = 'preferences'
const STORE_META = 'meta'

/**
 * Prompt Store class for IndexedDB operations
 */
export class PromptStore {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('[PromptStore] IndexedDB not available')
        resolve()
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[PromptStore] Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Prompts store with indexes
        if (!db.objectStoreNames.contains(STORE_PROMPTS)) {
          const promptStore = db.createObjectStore(STORE_PROMPTS, { keyPath: 'id' })
          promptStore.createIndex('category', 'category', { unique: false })
          promptStore.createIndex('isCustom', 'isCustom', { unique: false })
          promptStore.createIndex('isFavorite', 'isFavorite', { unique: false })
          promptStore.createIndex('useCount', 'useCount', { unique: false })
        }

        // Preferences store
        if (!db.objectStoreNames.contains(STORE_PREFERENCES)) {
          db.createObjectStore(STORE_PREFERENCES, { keyPath: 'id' })
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' })
        }
      }
    })

    await this.initPromise

    // Load static image catalog first
    await loadImageCatalog()

    await this.ensureCuratedPrompts()
  }

  /**
   * Import curated prompts if not already present
   */
  private async ensureCuratedPrompts(): Promise<void> {
    const existing = await this.getAllPrompts()
    const existingIds = new Set(existing.map(p => p.id))

    // Import base prompts if not present
    const curatedCount = existing.filter(p => !p.isCustom && !p.id.startsWith('wd-') && !p.id.startsWith('n')).length
    if (curatedCount === 0) {
      await this.importCuratedPrompts()
    }

    // Import nonfiction prompts if not present
    const nonfictionCount = existing.filter(p => p.id.startsWith('n')).length
    if (nonfictionCount < NONFICTION_PROMPTS.length) {
      await this.importNonfictionPrompts(existingIds)
    }

    // Import Writer's Digest prompts if not present
    const wdCount = existing.filter(p => p.id.startsWith('wd-')).length
    if (wdCount < WRITERS_DIGEST_PROMPTS.length) {
      await this.importWritersDigestPrompts(existingIds)
    }
  }

  /**
   * Import curated prompts from lib/quarry/prompts.ts
   */
  async importCuratedPrompts(): Promise<void> {
    if (!this.db) return

    const now = new Date().toISOString()
    const prompts: GalleryPrompt[] = WRITING_PROMPTS.map((wp) => {
      const staticImage = getStaticImageUrl(wp.id)
      return {
        ...wp,
        mode: wp.mode || 'both',
        isCustom: false,
        isFavorite: false,
        useCount: 0,
        createdAt: now,
        // Attach pre-generated image if available, otherwise use category placeholder
        imageUrl: staticImage || getPlaceholderImageUrl(wp.category),
      }
    })

    const tx = this.db.transaction(STORE_PROMPTS, 'readwrite')
    const store = tx.objectStore(STORE_PROMPTS)

    for (const prompt of prompts) {
      store.put(prompt)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Import Writer's Digest prompts
   */
  async importWritersDigestPrompts(existingIds?: Set<string>): Promise<number> {
    if (!this.db) return 0

    const now = new Date().toISOString()
    let added = 0

    const tx = this.db.transaction(STORE_PROMPTS, 'readwrite')
    const store = tx.objectStore(STORE_PROMPTS)

    for (const wp of WRITERS_DIGEST_PROMPTS) {
      // Skip if already exists
      if (existingIds?.has(wp.id)) continue

      const staticImage = getStaticImageUrl(wp.id)
      const prompt: GalleryPrompt = {
        ...wp,
        isCustom: false,
        isFavorite: false,
        useCount: 0,
        createdAt: now,
        // Attach pre-generated image if available, otherwise use category placeholder
        imageUrl: staticImage || wp.imagePath || getPlaceholderImageUrl(wp.category),
      }
      store.put(prompt)
      added++
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log(`[PromptStore] Imported ${added} Writer's Digest prompts`)
        resolve(added)
      }
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Import nonfiction prompts
   */
  async importNonfictionPrompts(existingIds?: Set<string>): Promise<number> {
    if (!this.db) return 0

    const now = new Date().toISOString()
    let added = 0

    const tx = this.db.transaction(STORE_PROMPTS, 'readwrite')
    const store = tx.objectStore(STORE_PROMPTS)

    for (const wp of NONFICTION_PROMPTS) {
      // Skip if already exists
      if (existingIds?.has(wp.id)) continue

      const staticImage = getStaticImageUrl(wp.id)
      const prompt: GalleryPrompt = {
        ...wp,
        mode: wp.mode || 'both',
        isCustom: false,
        isFavorite: false,
        useCount: 0,
        createdAt: now,
        // Attach pre-generated image if available, otherwise use category placeholder
        imageUrl: staticImage || wp.imagePath || getPlaceholderImageUrl(wp.category),
      }
      store.put(prompt)
      added++
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log(`[PromptStore] Imported ${added} nonfiction prompts`)
        resolve(added)
      }
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Get all prompts
   * Always computes imageUrl based on current domain to handle cross-domain caching
   * Falls back to category-specific placeholder SVGs when no generated image exists
   */
  async getAllPrompts(): Promise<GalleryPrompt[]> {
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_PROMPTS, 'readonly')
      const store = tx.objectStore(STORE_PROMPTS)
      const request = store.getAll()

      request.onsuccess = () => {
        const prompts = request.result || []

        // Always recompute imageUrl based on current domain
        // This handles cached prompts that may have URLs from a different domain
        const enrichedPrompts = prompts.map(prompt => {
          // First check static catalog (which has correct base URL for current domain)
          const staticImage = getStaticImageUrl(prompt.id)
          if (staticImage) {
            return { ...prompt, imageUrl: staticImage }
          }
          // Use category-specific placeholder as fallback
          return { ...prompt, imageUrl: getPlaceholderImageUrl(prompt.category) }
        })

        resolve(enrichedPrompts)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a single prompt by ID
   * Always computes imageUrl based on current domain to handle cross-domain caching
   * Falls back to category-specific placeholder SVG when no generated image exists
   */
  async getPrompt(id: string): Promise<GalleryPrompt | null> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_PROMPTS, 'readonly')
      const store = tx.objectStore(STORE_PROMPTS)
      const request = store.get(id)

      request.onsuccess = () => {
        const prompt = request.result || null
        if (prompt) {
          // Always recompute imageUrl based on current domain
          const staticImage = getStaticImageUrl(prompt.id)
          if (staticImage) {
            resolve({ ...prompt, imageUrl: staticImage })
            return
          }
          // Use category-specific placeholder as fallback
          resolve({ ...prompt, imageUrl: getPlaceholderImageUrl(prompt.category) })
          return
        }
        resolve(prompt)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save or update a prompt
   */
  async savePrompt(prompt: GalleryPrompt): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_PROMPTS, 'readwrite')
      const store = tx.objectStore(STORE_PROMPTS)
      const request = store.put(prompt)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete a prompt (only custom prompts can be deleted)
   */
  async deletePrompt(id: string): Promise<boolean> {
    if (!this.db) return false

    const prompt = await this.getPrompt(id)
    if (!prompt || !prompt.isCustom) {
      return false // Can only delete custom prompts
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_PROMPTS, 'readwrite')
      const store = tx.objectStore(STORE_PROMPTS)
      const request = store.delete(id)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Set image for a prompt
   */
  async setPromptImage(
    id: string,
    imageUrl: string,
    imagePrompt: string,
    style: ImageStyle
  ): Promise<void> {
    const prompt = await this.getPrompt(id)
    if (!prompt) return

    prompt.imageUrl = imageUrl
    prompt.imagePrompt = imagePrompt
    prompt.imageStyle = style
    prompt.imageGeneratedAt = new Date().toISOString()

    await this.savePrompt(prompt)
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const prompt = await this.getPrompt(id)
    if (!prompt) return false

    prompt.isFavorite = !prompt.isFavorite
    await this.savePrompt(prompt)

    return prompt.isFavorite
  }

  /**
   * Record prompt usage
   */
  async recordUsage(id: string): Promise<void> {
    const prompt = await this.getPrompt(id)
    if (!prompt) return

    prompt.useCount = (prompt.useCount || 0) + 1
    prompt.lastUsedAt = new Date().toISOString()

    await this.savePrompt(prompt)
  }

  /**
   * Filter prompts based on criteria
   */
  async filterPrompts(filter: PromptFilter): Promise<GalleryPrompt[]> {
    let prompts = await this.getAllPrompts()

    if (filter.category) {
      prompts = prompts.filter(p => p.category === filter.category)
    }

    if (filter.mood) {
      prompts = prompts.filter(p => !p.mood || p.mood.includes(filter.mood!))
    }

    if (filter.difficulty) {
      prompts = prompts.filter(p => p.difficulty === filter.difficulty)
    }

    if (filter.onlyFavorites) {
      prompts = prompts.filter(p => p.isFavorite)
    }

    if (filter.onlyWithImages) {
      prompts = prompts.filter(p => !!p.imageUrl)
    }

    if (filter.onlyCustom) {
      prompts = prompts.filter(p => p.isCustom)
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      prompts = prompts.filter(p =>
        p.text.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower) ||
        (p.tags?.some(t => t.toLowerCase().includes(searchLower)))
      )
    }

    return prompts
  }

  /**
   * Get prompts without images
   */
  async getPromptsWithoutImages(): Promise<GalleryPrompt[]> {
    const prompts = await this.getAllPrompts()
    return prompts.filter(p => !p.imageUrl)
  }

  /**
   * Get favorite prompts
   */
  async getFavorites(): Promise<GalleryPrompt[]> {
    return this.filterPrompts({ onlyFavorites: true })
  }

  /**
   * Get most used prompts
   */
  async getMostUsed(limit: number = 10): Promise<GalleryPrompt[]> {
    const prompts = await this.getAllPrompts()
    return prompts
      .filter(p => p.useCount > 0)
      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
      .slice(0, limit)
  }

  /**
   * Get recently used prompts
   */
  async getRecentlyUsed(limit: number = 10): Promise<GalleryPrompt[]> {
    const prompts = await this.getAllPrompts()
    return prompts
      .filter(p => p.lastUsedAt)
      .sort((a, b) => {
        const aTime = new Date(a.lastUsedAt!).getTime()
        const bTime = new Date(b.lastUsedAt!).getTime()
        return bTime - aTime
      })
      .slice(0, limit)
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<PromptPreferences> {
    if (!this.db) return DEFAULT_PROMPT_PREFERENCES

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_PREFERENCES, 'readonly')
      const store = tx.objectStore(STORE_PREFERENCES)
      const request = store.get('user')

      request.onsuccess = () => {
        const result = request.result
        resolve(result?.preferences || DEFAULT_PROMPT_PREFERENCES)
      }
      request.onerror = () => resolve(DEFAULT_PROMPT_PREFERENCES)
    })
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: PromptPreferences): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_PREFERENCES, 'readwrite')
      const store = tx.objectStore(STORE_PREFERENCES)
      const request = store.put({ id: 'user', preferences })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get prompt statistics
   */
  async getStats(): Promise<{
    total: number
    curated: number
    custom: number
    withImages: number
    favorites: number
    totalUses: number
  }> {
    const prompts = await this.getAllPrompts()

    return {
      total: prompts.length,
      curated: prompts.filter(p => !p.isCustom).length,
      custom: prompts.filter(p => p.isCustom).length,
      withImages: prompts.filter(p => !!p.imageUrl).length,
      favorites: prompts.filter(p => p.isFavorite).length,
      totalUses: prompts.reduce((sum, p) => sum + (p.useCount || 0), 0),
    }
  }

  /**
   * Clear all image data (to free up storage)
   */
  async clearAllImages(): Promise<void> {
    const prompts = await this.getAllPrompts()

    for (const prompt of prompts) {
      if (prompt.imageUrl) {
        prompt.imageUrl = undefined
        prompt.imagePrompt = undefined
        prompt.imageStyle = undefined
        prompt.imageGeneratedAt = undefined
        await this.savePrompt(prompt)
      }
    }
  }

  /**
   * Export prompts for sharing
   */
  async exportPrompts(ids?: string[]): Promise<string> {
    let prompts = await this.getAllPrompts()

    if (ids) {
      prompts = prompts.filter(p => ids.includes(p.id))
    }

    // Remove image data for smaller export
    const exportData = prompts.map(p => ({
      ...p,
      imageUrl: undefined,
      imagePrompt: undefined,
    }))

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }
}

// Singleton instance
let storeInstance: PromptStore | null = null

/**
 * Get the singleton PromptStore instance
 */
export async function getPromptStore(): Promise<PromptStore> {
  if (!storeInstance) {
    storeInstance = new PromptStore()
    await storeInstance.init()
  }
  return storeInstance
}
