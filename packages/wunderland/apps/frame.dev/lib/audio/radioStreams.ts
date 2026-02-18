/**
 * Radio Streams
 * @module lib/audio/radioStreams
 *
 * Lo-fi and ambient radio stream definitions for the Write section.
 * Uses YouTube live streams and other embeddable sources.
 */

// ============================================================================
// TYPES
// ============================================================================

export type RadioGenre = 'lofi' | 'jazz' | 'classical' | 'ambient' | 'nature'

export interface RadioStream {
  id: string
  name: string
  description: string
  /** YouTube video ID or direct stream URL */
  url: string
  /** 'youtube' for embeds, 'direct' for audio streams */
  provider: 'youtube' | 'direct'
  genre: RadioGenre
  /** Thumbnail URL (optional) */
  thumbnail?: string
  /** Is this a 24/7 live stream */
  isLive?: boolean
}

export interface RadioGenreInfo {
  id: RadioGenre
  name: string
  description: string
  icon: string
  color: string
}

// ============================================================================
// GENRE METADATA
// ============================================================================

export const RADIO_GENRES: RadioGenreInfo[] = [
  {
    id: 'lofi',
    name: 'Lo-fi',
    description: 'Chill beats to relax/study to',
    icon: 'Music',
    color: '#A855F7',
  },
  {
    id: 'jazz',
    name: 'Jazz',
    description: 'Smooth jazz and cafe vibes',
    icon: 'Coffee',
    color: '#F59E0B',
  },
  {
    id: 'classical',
    name: 'Classical',
    description: 'Piano and orchestral pieces',
    icon: 'Piano',
    color: '#3B82F6',
  },
  {
    id: 'ambient',
    name: 'Ambient',
    description: 'Atmospheric soundscapes',
    icon: 'Cloud',
    color: '#06B6D4',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Nature sounds and field recordings',
    icon: 'TreePine',
    color: '#22C55E',
  },
]

// ============================================================================
// RADIO STREAMS
// ============================================================================

/**
 * Curated list of radio streams
 * Note: YouTube video IDs may change, update as needed
 */
export const RADIO_STREAMS: RadioStream[] = [
  // Lo-fi
  {
    id: 'lofi-girl',
    name: 'Lofi Girl',
    description: '24/7 lofi hip hop radio',
    url: 'jfKfPfyJRdk', // YouTube video ID
    provider: 'youtube',
    genre: 'lofi',
    isLive: true,
  },
  {
    id: 'chillhop',
    name: 'Chillhop Music',
    description: 'Jazzy & lofi hip hop beats',
    url: '5yx6BWlEVcY',
    provider: 'youtube',
    genre: 'lofi',
    isLive: true,
  },
  {
    id: 'lofi-sleep',
    name: 'Lofi Sleep',
    description: 'Sleepy lofi beats',
    url: 'rUxyKA_-grg',
    provider: 'youtube',
    genre: 'lofi',
    isLive: true,
  },

  // Jazz
  {
    id: 'coffee-jazz',
    name: 'Coffee Shop Jazz',
    description: 'Relaxing jazz for work',
    url: 'VMAPTo7RVCo',
    provider: 'youtube',
    genre: 'jazz',
    isLive: true,
  },
  {
    id: 'smooth-jazz',
    name: 'Smooth Jazz',
    description: 'Smooth jazz 24/7',
    url: 'Dx5qFachd3A',
    provider: 'youtube',
    genre: 'jazz',
    isLive: true,
  },

  // Classical
  {
    id: 'piano-relax',
    name: 'Piano Relaxation',
    description: 'Calm piano music',
    url: '77ZozI0rw7w',
    provider: 'youtube',
    genre: 'classical',
    isLive: true,
  },
  {
    id: 'classical-focus',
    name: 'Classical Focus',
    description: 'Classical music for concentration',
    url: 'mIYzp5rcTvU',
    provider: 'youtube',
    genre: 'classical',
    isLive: true,
  },

  // Ambient
  {
    id: 'ambient-worlds',
    name: 'Ambient Worlds',
    description: 'Ethereal ambient soundscapes',
    url: 'S_MOd40zlYU',
    provider: 'youtube',
    genre: 'ambient',
    isLive: true,
  },
  {
    id: 'space-ambient',
    name: 'Space Ambient',
    description: 'Cosmic ambient music',
    url: 'c7O91GDWGPU',
    provider: 'youtube',
    genre: 'ambient',
    isLive: true,
  },

  // Nature
  {
    id: 'rain-sounds',
    name: 'Rain Sounds',
    description: 'Relaxing rain for sleep',
    url: 'mPZkdNFkNps',
    provider: 'youtube',
    genre: 'nature',
    isLive: true,
  },
  {
    id: 'forest-sounds',
    name: 'Forest Ambience',
    description: 'Birds and forest sounds',
    url: 'xNN7iTA57jM',
    provider: 'youtube',
    genre: 'nature',
    isLive: true,
  },
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get streams by genre
 */
export function getStreamsByGenre(genre: RadioGenre): RadioStream[] {
  return RADIO_STREAMS.filter(stream => stream.genre === genre)
}

/**
 * Get stream by ID
 */
export function getStreamById(id: string): RadioStream | undefined {
  return RADIO_STREAMS.find(stream => stream.id === id)
}

/**
 * Get genre info by ID
 */
export function getGenreInfo(genre: RadioGenre): RadioGenreInfo | undefined {
  return RADIO_GENRES.find(g => g.id === genre)
}

/**
 * Build YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string, autoplay = true): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    loop: '1',
    mute: '0',
    controls: '0',
    showinfo: '0',
    modestbranding: '1',
    rel: '0',
    enablejsapi: '1',
  })
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    maxres: 'maxresdefault',
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  RADIO_STREAMS,
  RADIO_GENRES,
  getStreamsByGenre,
  getStreamById,
  getGenreInfo,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
}
