/**
 * Stock Sound Manifest
 * @module lib/audio/stockSoundManifest
 *
 * Curated collection of Freesound.org sound effects for each soundscape.
 * All sounds are Creative Commons licensed (CC0 or CC-BY).
 *
 * Sound URLs use Freesound CDN preview format:
 * https://cdn.freesound.org/previews/{id_prefix}/{id}_{id}-lq.mp3
 *
 * Attribution is included for CC-BY sounds.
 */

import type { SoundscapeType } from './ambienceSounds'

// ============================================================================
// TYPES
// ============================================================================

export interface StockSound {
  /** Freesound sound ID */
  id: number
  /** Human-readable name */
  name: string
  /** Direct URL to MP3 preview (low quality but instant load) */
  previewUrl: string
  /** Duration in seconds (approximate) */
  duration: number
  /** License type */
  license: 'CC0' | 'CC-BY' | 'CC-BY-NC'
  /** Attribution text (required for CC-BY) */
  attribution?: string
  /** Playback rate range for variation [min, max] */
  playbackRate: [number, number]
  /** Volume multiplier (some sounds are louder than others) */
  volumeMultiplier: number
  /** Tags for categorization */
  tags: string[]
}

export interface SoundscapeAccents {
  /** Primary accent sounds (played more frequently) */
  primary: StockSound[]
  /** Secondary accent sounds (played less frequently) */
  secondary: StockSound[]
  /** Rare accent sounds (played occasionally for variety) */
  rare: StockSound[]
  /** Minimum interval between accent plays (ms) */
  minInterval: number
  /** Maximum interval between accent plays (ms) */
  maxInterval: number
}

// ============================================================================
// HELPER
// ============================================================================

/**
 * Generate Freesound preview URL from sound ID
 * Preview format: https://cdn.freesound.org/previews/{prefix}/{id}_{id}-lq.mp3
 */
function freesoundPreview(id: number): string {
  const prefix = Math.floor(id / 1000)
  return `https://cdn.freesound.org/previews/${prefix}/${id}_${id}-lq.mp3`
}

// ============================================================================
// RAIN SOUNDSCAPE ACCENTS
// ============================================================================

const RAIN_ACCENTS: SoundscapeAccents = {
  primary: [
    {
      id: 683102,
      name: 'Water Drop',
      previewUrl: freesoundPreview(683102),
      duration: 1,
      license: 'CC0',
      playbackRate: [0.8, 1.3],
      volumeMultiplier: 0.6,
      tags: ['water', 'drop', 'drip'],
    },
    {
      id: 543649,
      name: 'Water Droplets',
      previewUrl: freesoundPreview(543649),
      duration: 2,
      license: 'CC0',
      playbackRate: [0.9, 1.2],
      volumeMultiplier: 0.5,
      tags: ['water', 'droplets', 'drip'],
    },
    {
      id: 165206,
      name: 'Water Drop Sound',
      previewUrl: freesoundPreview(165206),
      duration: 1,
      license: 'CC0',
      playbackRate: [0.7, 1.4],
      volumeMultiplier: 0.7,
      tags: ['water', 'drop', 'stereo'],
    },
    {
      id: 217207,
      name: 'WaterDrop',
      previewUrl: freesoundPreview(217207),
      duration: 1,
      license: 'CC0',
      playbackRate: [0.8, 1.2],
      volumeMultiplier: 0.6,
      tags: ['water', 'drop'],
    },
  ],
  secondary: [
    {
      id: 546279,
      name: 'Single Drip',
      previewUrl: freesoundPreview(546279),
      duration: 1,
      license: 'CC0',
      playbackRate: [0.9, 1.1],
      volumeMultiplier: 0.4,
      tags: ['drip', 'single'],
    },
    {
      id: 267221,
      name: 'Water Droplet',
      previewUrl: freesoundPreview(267221),
      duration: 1,
      license: 'CC0',
      playbackRate: [0.85, 1.15],
      volumeMultiplier: 0.5,
      tags: ['water', 'droplet'],
    },
  ],
  rare: [
    {
      id: 527664,
      name: 'Thunder',
      previewUrl: freesoundPreview(527664),
      duration: 33,
      license: 'CC0',
      playbackRate: [0.8, 1.0],
      volumeMultiplier: 0.3,
      tags: ['thunder', 'storm', 'distant'],
    },
    {
      id: 2523,
      name: 'Thunder Storm',
      previewUrl: freesoundPreview(2523),
      duration: 10,
      license: 'CC-BY',
      attribution: 'RHumphries on Freesound.org',
      playbackRate: [0.9, 1.0],
      volumeMultiplier: 0.25,
      tags: ['thunder', 'storm', 'rain'],
    },
  ],
  minInterval: 4000,
  maxInterval: 10000,
}

// ============================================================================
// CAFE SOUNDSCAPE ACCENTS
// ============================================================================

const CAFE_ACCENTS: SoundscapeAccents = {
  primary: [
    {
      id: 370973,
      name: 'Coffee Shop Ambience',
      previewUrl: freesoundPreview(370973),
      duration: 60,
      license: 'CC0',
      playbackRate: [1.0, 1.0],
      volumeMultiplier: 0.3,
      tags: ['cafe', 'ambience', 'background'],
    },
    {
      id: 32490,
      name: 'Coffee Shop Ambiance',
      previewUrl: freesoundPreview(32490),
      duration: 45,
      license: 'CC-BY',
      attribution: 'digifishmusic on Freesound.org',
      playbackRate: [1.0, 1.0],
      volumeMultiplier: 0.25,
      tags: ['cafe', 'bookstore', 'binaural'],
    },
  ],
  secondary: [
    {
      id: 813868,
      name: 'Northtown Coffee',
      previewUrl: freesoundPreview(813868),
      duration: 30,
      license: 'CC0',
      playbackRate: [1.0, 1.0],
      volumeMultiplier: 0.2,
      tags: ['cafe', 'espresso', 'chatter'],
    },
  ],
  rare: [],
  minInterval: 20000,
  maxInterval: 60000,
}

// ============================================================================
// FOREST SOUNDSCAPE ACCENTS
// ============================================================================

const FOREST_ACCENTS: SoundscapeAccents = {
  primary: [
    {
      id: 387978,
      name: 'Birds Singing',
      previewUrl: freesoundPreview(387978),
      duration: 30,
      license: 'CC0',
      playbackRate: [0.9, 1.1],
      volumeMultiplier: 0.4,
      tags: ['birds', 'singing', 'nature'],
    },
    {
      id: 427400,
      name: 'Forest Ambient Loop',
      previewUrl: freesoundPreview(427400),
      duration: 60,
      license: 'CC0',
      playbackRate: [1.0, 1.0],
      volumeMultiplier: 0.3,
      tags: ['forest', 'ambient', 'loop'],
    },
  ],
  secondary: [
    {
      id: 276294,
      name: 'Leaves in Wind',
      previewUrl: freesoundPreview(276294),
      duration: 20,
      license: 'CC0',
      playbackRate: [0.9, 1.1],
      volumeMultiplier: 0.35,
      tags: ['leaves', 'wind', 'rustle'],
    },
    {
      id: 183496,
      name: 'Wind and Leaves',
      previewUrl: freesoundPreview(183496),
      duration: 15,
      license: 'CC0',
      playbackRate: [0.95, 1.05],
      volumeMultiplier: 0.3,
      tags: ['wind', 'leaves', 'nature'],
    },
  ],
  rare: [
    {
      id: 195498,
      name: 'Robin Hoods Bay Insect',
      previewUrl: freesoundPreview(195498),
      duration: 10,
      license: 'CC0',
      playbackRate: [0.8, 1.2],
      volumeMultiplier: 0.2,
      tags: ['insect', 'buzz', 'nature'],
    },
    {
      id: 377322,
      name: 'Field Insects',
      previewUrl: freesoundPreview(377322),
      duration: 15,
      license: 'CC0',
      playbackRate: [0.9, 1.1],
      volumeMultiplier: 0.15,
      tags: ['insects', 'field', 'ambient'],
    },
  ],
  minInterval: 12000,
  maxInterval: 30000,
}

// ============================================================================
// OCEAN SOUNDSCAPE ACCENTS
// ============================================================================

const OCEAN_ACCENTS: SoundscapeAccents = {
  primary: [
    {
      id: 263786,
      name: 'Seagull Single Call',
      previewUrl: freesoundPreview(263786),
      duration: 2,
      license: 'CC0',
      playbackRate: [0.85, 1.15],
      volumeMultiplier: 0.4,
      tags: ['seagull', 'call', 'bird'],
    },
    {
      id: 738675,
      name: 'Seagull Call Squawk',
      previewUrl: freesoundPreview(738675),
      duration: 3,
      license: 'CC0',
      playbackRate: [0.9, 1.1],
      volumeMultiplier: 0.35,
      tags: ['seagull', 'squawk', 'cry'],
    },
    {
      id: 197743,
      name: 'Seagull',
      previewUrl: freesoundPreview(197743),
      duration: 2,
      license: 'CC0',
      playbackRate: [0.9, 1.1],
      volumeMultiplier: 0.4,
      tags: ['seagull', 'bird'],
    },
  ],
  secondary: [
    {
      id: 317432,
      name: 'Seagull Screech',
      previewUrl: freesoundPreview(317432),
      duration: 2,
      license: 'CC0',
      playbackRate: [0.8, 1.2],
      volumeMultiplier: 0.3,
      tags: ['seagull', 'screech'],
    },
    {
      id: 110096,
      name: 'Slow Seagull',
      previewUrl: freesoundPreview(110096),
      duration: 3,
      license: 'CC0',
      playbackRate: [0.9, 1.0],
      volumeMultiplier: 0.35,
      tags: ['seagull', 'slow', 'distant'],
    },
  ],
  rare: [
    {
      id: 623933,
      name: 'Gull at Coast',
      previewUrl: freesoundPreview(623933),
      duration: 5,
      license: 'CC0',
      playbackRate: [0.95, 1.05],
      volumeMultiplier: 0.25,
      tags: ['gull', 'coast', 'morning'],
    },
  ],
  minInterval: 8000,
  maxInterval: 20000,
}

// ============================================================================
// FIREPLACE SOUNDSCAPE ACCENTS
// ============================================================================

const FIREPLACE_ACCENTS: SoundscapeAccents = {
  primary: [
    {
      id: 414767,
      name: 'Crackling Fire',
      previewUrl: freesoundPreview(414767),
      duration: 60,
      license: 'CC0',
      playbackRate: [0.95, 1.05],
      volumeMultiplier: 0.4,
      tags: ['fire', 'crackling', 'fireplace'],
    },
    {
      id: 370938,
      name: 'Fire Crackling',
      previewUrl: freesoundPreview(370938),
      duration: 30,
      license: 'CC0',
      playbackRate: [0.9, 1.1],
      volumeMultiplier: 0.45,
      tags: ['fire', 'wood', 'popping'],
    },
  ],
  secondary: [
    {
      id: 800660,
      name: 'Inside Fireplace',
      previewUrl: freesoundPreview(800660),
      duration: 20,
      license: 'CC0',
      playbackRate: [0.95, 1.05],
      volumeMultiplier: 0.35,
      tags: ['fireplace', 'crackling', 'processed'],
    },
    {
      id: 263994,
      name: 'Fireplace Long',
      previewUrl: freesoundPreview(263994),
      duration: 180,
      license: 'CC0',
      playbackRate: [1.0, 1.0],
      volumeMultiplier: 0.3,
      tags: ['fireplace', 'long', 'real'],
    },
  ],
  rare: [],
  minInterval: 15000,
  maxInterval: 40000,
}

// ============================================================================
// LOFI SOUNDSCAPE ACCENTS
// ============================================================================

const LOFI_ACCENTS: SoundscapeAccents = {
  // Lo-fi primarily uses synthesis, minimal stock sounds
  primary: [],
  secondary: [],
  rare: [],
  minInterval: 30000,
  maxInterval: 60000,
}

// ============================================================================
// WHITE NOISE SOUNDSCAPE ACCENTS
// ============================================================================

const WHITENOISE_ACCENTS: SoundscapeAccents = {
  // White noise is pure synthesis, no stock sounds
  primary: [],
  secondary: [],
  rare: [],
  minInterval: 60000,
  maxInterval: 120000,
}

// ============================================================================
// MANIFEST EXPORT
// ============================================================================

/**
 * Complete manifest of accent sounds for each soundscape
 */
export const STOCK_SOUND_MANIFEST: Record<SoundscapeType, SoundscapeAccents> = {
  rain: RAIN_ACCENTS,
  cafe: CAFE_ACCENTS,
  forest: FOREST_ACCENTS,
  ocean: OCEAN_ACCENTS,
  fireplace: FIREPLACE_ACCENTS,
  lofi: LOFI_ACCENTS,
  'white-noise': WHITENOISE_ACCENTS,
  none: {
    primary: [],
    secondary: [],
    rare: [],
    minInterval: 0,
    maxInterval: 0,
  },
}

/**
 * Get all sounds for a soundscape (flattened)
 */
export function getAllSoundsForSoundscape(
  soundscape: SoundscapeType
): StockSound[] {
  const accents = STOCK_SOUND_MANIFEST[soundscape]
  return [...accents.primary, ...accents.secondary, ...accents.rare]
}

/**
 * Get a random sound from a soundscape based on probability
 * - 60% chance: primary
 * - 30% chance: secondary
 * - 10% chance: rare
 */
export function getRandomSound(soundscape: SoundscapeType): StockSound | null {
  const accents = STOCK_SOUND_MANIFEST[soundscape]
  const roll = Math.random()

  if (roll < 0.6 && accents.primary.length > 0) {
    return accents.primary[Math.floor(Math.random() * accents.primary.length)]
  } else if (roll < 0.9 && accents.secondary.length > 0) {
    return accents.secondary[
      Math.floor(Math.random() * accents.secondary.length)
    ]
  } else if (accents.rare.length > 0) {
    return accents.rare[Math.floor(Math.random() * accents.rare.length)]
  }

  // Fallback to primary if available
  if (accents.primary.length > 0) {
    return accents.primary[Math.floor(Math.random() * accents.primary.length)]
  }

  return null
}

/**
 * Get random interval for next accent play
 */
export function getRandomInterval(soundscape: SoundscapeType): number {
  const accents = STOCK_SOUND_MANIFEST[soundscape]
  return (
    accents.minInterval +
    Math.random() * (accents.maxInterval - accents.minInterval)
  )
}

/**
 * Get random playback rate within sound's range
 */
export function getRandomPlaybackRate(sound: StockSound): number {
  const [min, max] = sound.playbackRate
  return min + Math.random() * (max - min)
}

/**
 * Check if soundscape has accent sounds
 */
export function hasAccentSounds(soundscape: SoundscapeType): boolean {
  const accents = STOCK_SOUND_MANIFEST[soundscape]
  return (
    accents.primary.length > 0 ||
    accents.secondary.length > 0 ||
    accents.rare.length > 0
  )
}

export default STOCK_SOUND_MANIFEST
