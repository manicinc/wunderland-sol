/**
 * Background Catalog Tests
 * @module __tests__/unit/lib/meditate/backgroundCatalog.test
 *
 * Tests for the meditation background image catalog system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAttribution,
  getDownloadFilename,
  getUserSelectedImages,
  setUserSelectedImages,
  getSlideshowSettings,
  setSlideshowSettings,
  type CatalogImage,
  type SlideshowSettings,
} from '@/lib/meditate/backgroundCatalog'

// ============================================================================
// TEST DATA
// ============================================================================

const mockImage: CatalogImage = {
  id: 'pexels-12345',
  provider: 'pexels',
  url: '/media/backgrounds/rain/pexels-12345.jpg',
  thumbnail: '/media/backgrounds/rain/thumbs/pexels-12345.jpg',
  width: 1920,
  height: 1080,
  photographer: 'John Doe',
  photographerUrl: 'https://pexels.com/@johndoe',
  sourceUrl: 'https://pexels.com/photo/12345',
  license: 'Pexels License',
  licenseUrl: 'https://pexels.com/license',
  tags: ['rain', 'window', 'cozy'],
  color: '#4a5568',
  downloadable: true,
  alt: 'Rain drops on a window',
}

const mockUnsplashImage: CatalogImage = {
  ...mockImage,
  id: 'unsplash-abc123',
  provider: 'unsplash',
  photographer: 'Jane Smith',
}

// ============================================================================
// ATTRIBUTION TESTS
// ============================================================================

describe('getAttribution', () => {
  it('generates correct attribution for Pexels image', () => {
    const attribution = getAttribution(mockImage)
    expect(attribution).toBe('Photo by John Doe on Pexels')
  })

  it('generates correct attribution for Unsplash image', () => {
    const attribution = getAttribution(mockUnsplashImage)
    expect(attribution).toBe('Photo by Jane Smith on Unsplash')
  })

  it('capitalizes provider name correctly', () => {
    const pixabayImage: CatalogImage = {
      ...mockImage,
      provider: 'pixabay',
    }
    const attribution = getAttribution(pixabayImage)
    expect(attribution).toContain('Pixabay')
  })

  it('handles giphy provider', () => {
    const giphyImage: CatalogImage = {
      ...mockImage,
      provider: 'giphy',
    }
    const attribution = getAttribution(giphyImage)
    expect(attribution).toContain('Giphy')
  })
})

// ============================================================================
// DOWNLOAD FILENAME TESTS
// ============================================================================

describe('getDownloadFilename', () => {
  it('generates filename from first two tags', () => {
    const filename = getDownloadFilename(mockImage)
    expect(filename).toBe('rain-window-pexels-12345.jpg')
  })

  it('handles single tag', () => {
    const singleTagImage: CatalogImage = {
      ...mockImage,
      tags: ['nature'],
    }
    const filename = getDownloadFilename(singleTagImage)
    expect(filename).toBe('nature-pexels-12345.jpg')
  })

  it('handles empty tags array', () => {
    const noTagImage: CatalogImage = {
      ...mockImage,
      tags: [],
    }
    const filename = getDownloadFilename(noTagImage)
    expect(filename).toBe('-pexels-12345.jpg')
  })

  it('limits to two tags maximum', () => {
    const manyTagsImage: CatalogImage = {
      ...mockImage,
      tags: ['one', 'two', 'three', 'four', 'five'],
    }
    const filename = getDownloadFilename(manyTagsImage)
    expect(filename).toBe('one-two-pexels-12345.jpg')
  })
})

// ============================================================================
// USER PREFERENCES - SELECTED IMAGES
// ============================================================================

describe('User Selected Images', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageMock[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getUserSelectedImages', () => {
    it('returns empty array when no selections stored', () => {
      const result = getUserSelectedImages('rain')
      expect(result).toEqual([])
    })

    it('returns stored selections for soundscape', () => {
      localStorageMock['meditate-selected-backgrounds'] = JSON.stringify({
        rain: ['img1', 'img2'],
        ocean: ['img3'],
      })
      const result = getUserSelectedImages('rain')
      expect(result).toEqual(['img1', 'img2'])
    })

    it('returns empty array for soundscape with no selections', () => {
      localStorageMock['meditate-selected-backgrounds'] = JSON.stringify({
        rain: ['img1'],
      })
      const result = getUserSelectedImages('ocean')
      expect(result).toEqual([])
    })

    it('handles malformed JSON gracefully', () => {
      localStorageMock['meditate-selected-backgrounds'] = 'not-valid-json'
      const result = getUserSelectedImages('rain')
      expect(result).toEqual([])
    })
  })

  describe('setUserSelectedImages', () => {
    it('stores selections for soundscape', () => {
      setUserSelectedImages('rain', ['img1', 'img2'])
      const stored = JSON.parse(localStorageMock['meditate-selected-backgrounds'])
      expect(stored.rain).toEqual(['img1', 'img2'])
    })

    it('preserves existing selections for other soundscapes', () => {
      localStorageMock['meditate-selected-backgrounds'] = JSON.stringify({
        ocean: ['ocean-img'],
      })
      setUserSelectedImages('rain', ['rain-img'])
      const stored = JSON.parse(localStorageMock['meditate-selected-backgrounds'])
      expect(stored.ocean).toEqual(['ocean-img'])
      expect(stored.rain).toEqual(['rain-img'])
    })

    it('overwrites existing selections for same soundscape', () => {
      localStorageMock['meditate-selected-backgrounds'] = JSON.stringify({
        rain: ['old-img'],
      })
      setUserSelectedImages('rain', ['new-img'])
      const stored = JSON.parse(localStorageMock['meditate-selected-backgrounds'])
      expect(stored.rain).toEqual(['new-img'])
    })
  })
})

// ============================================================================
// USER PREFERENCES - SLIDESHOW SETTINGS
// ============================================================================

describe('Slideshow Settings', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageMock[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getSlideshowSettings', () => {
    it('returns default settings when none stored', () => {
      const result = getSlideshowSettings()
      expect(result).toEqual({
        interval: 30000,
        transition: 'crossfade',
        transitionDuration: 2000,
        shuffle: true,
        blurOnInteract: true,
        blurIntensity: 8,
      })
    })

    it('returns stored settings', () => {
      localStorageMock['meditate-slideshow-settings'] = JSON.stringify({
        interval: 60000,
        transition: 'slide',
      })
      const result = getSlideshowSettings()
      expect(result.interval).toBe(60000)
      expect(result.transition).toBe('slide')
    })

    it('merges stored settings with defaults', () => {
      localStorageMock['meditate-slideshow-settings'] = JSON.stringify({
        interval: 45000,
      })
      const result = getSlideshowSettings()
      expect(result.interval).toBe(45000)
      expect(result.transition).toBe('crossfade') // Default
      expect(result.shuffle).toBe(true) // Default
    })

    it('handles malformed JSON gracefully', () => {
      localStorageMock['meditate-slideshow-settings'] = 'invalid'
      const result = getSlideshowSettings()
      expect(result.interval).toBe(30000) // Default
    })
  })

  describe('setSlideshowSettings', () => {
    it('stores partial settings', () => {
      setSlideshowSettings({ interval: 60000 })
      const stored = JSON.parse(localStorageMock['meditate-slideshow-settings'])
      expect(stored.interval).toBe(60000)
    })

    it('merges with existing settings', () => {
      localStorageMock['meditate-slideshow-settings'] = JSON.stringify({
        interval: 30000,
        transition: 'crossfade',
      })
      setSlideshowSettings({ transition: 'blur-fade' })
      const stored = JSON.parse(localStorageMock['meditate-slideshow-settings'])
      expect(stored.interval).toBe(30000)
      expect(stored.transition).toBe('blur-fade')
    })

    it('stores all setting properties', () => {
      const fullSettings: SlideshowSettings = {
        interval: 20000,
        transition: 'slide',
        transitionDuration: 1500,
        shuffle: false,
        blurOnInteract: false,
        blurIntensity: 12,
      }
      setSlideshowSettings(fullSettings)
      const stored = JSON.parse(localStorageMock['meditate-slideshow-settings'])
      expect(stored).toMatchObject(fullSettings)
    })
  })
})

// ============================================================================
// CATALOG IMAGE TYPE VALIDATION
// ============================================================================

describe('CatalogImage structure', () => {
  it('has all required properties', () => {
    expect(mockImage).toHaveProperty('id')
    expect(mockImage).toHaveProperty('provider')
    expect(mockImage).toHaveProperty('url')
    expect(mockImage).toHaveProperty('thumbnail')
    expect(mockImage).toHaveProperty('width')
    expect(mockImage).toHaveProperty('height')
    expect(mockImage).toHaveProperty('photographer')
    expect(mockImage).toHaveProperty('photographerUrl')
    expect(mockImage).toHaveProperty('sourceUrl')
    expect(mockImage).toHaveProperty('license')
    expect(mockImage).toHaveProperty('licenseUrl')
    expect(mockImage).toHaveProperty('tags')
    expect(mockImage).toHaveProperty('color')
    expect(mockImage).toHaveProperty('downloadable')
    expect(mockImage).toHaveProperty('alt')
  })

  it('has valid provider type', () => {
    const validProviders = ['pexels', 'pixabay', 'unsplash', 'giphy']
    expect(validProviders).toContain(mockImage.provider)
  })

  it('has valid dimensions', () => {
    expect(mockImage.width).toBeGreaterThan(0)
    expect(mockImage.height).toBeGreaterThan(0)
  })

  it('has valid color hex format', () => {
    expect(mockImage.color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('has array of tags', () => {
    expect(Array.isArray(mockImage.tags)).toBe(true)
    expect(mockImage.tags.length).toBeGreaterThan(0)
  })
})





