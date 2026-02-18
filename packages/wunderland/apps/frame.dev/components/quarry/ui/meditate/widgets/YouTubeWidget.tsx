'use client'

/**
 * YouTube Widget
 * @module components/quarry/ui/meditate/widgets/YouTubeWidget
 * 
 * YouTube player with:
 * - Paste URL to play
 * - Curated playlists
 * - Search/browse (with API key)
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Link,
  Search,
  Music,
  ListMusic,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface YouTubeWidgetProps {
  theme: ThemeName
}

interface CuratedPlaylist {
  id: string
  title: string
  description: string
  thumbnail: string
  videoId: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   CURATED PLAYLISTS
═══════════════════════════════════════════════════════════════════════════ */

const CURATED_PLAYLISTS: CuratedPlaylist[] = [
  {
    id: 'lofi-beats',
    title: 'Lofi Hip Hop',
    description: 'Chill beats to study/relax to',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    videoId: 'jfKfPfyJRdk',
  },
  {
    id: 'jazz-cafe',
    title: 'Jazz Cafe',
    description: 'Smooth jazz for focus',
    thumbnail: 'https://i.ytimg.com/vi/Dx5qFachd3A/hqdefault.jpg',
    videoId: 'Dx5qFachd3A',
  },
  {
    id: 'rain-sounds',
    title: 'Rain Sounds',
    description: 'Relaxing rain for sleep',
    thumbnail: 'https://i.ytimg.com/vi/mPZkdNFkNps/hqdefault.jpg',
    videoId: 'mPZkdNFkNps',
  },
  {
    id: 'classical',
    title: 'Classical Focus',
    description: 'Mozart, Bach & more',
    thumbnail: 'https://i.ytimg.com/vi/Bo-pLQtYDwM/hqdefault.jpg',
    videoId: 'Bo-pLQtYDwM',
  },
  {
    id: 'synthwave',
    title: 'Synthwave',
    description: 'Retro electronic vibes',
    thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    videoId: '4xDzrJKXOOY',
  },
  {
    id: 'ambient',
    title: 'Ambient Space',
    description: 'Ethereal soundscapes',
    thumbnail: 'https://i.ytimg.com/vi/nMfPqeZjc2c/hqdefault.jpg',
    videoId: 'nMfPqeZjc2c',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function YouTubeWidget({ theme }: YouTubeWidgetProps) {
  const isDark = isDarkTheme(theme)
  
  const [tab, setTab] = useState<'url' | 'curated' | 'search'>('curated')
  const [urlInput, setUrlInput] = useState('')
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Extract video ID from URL
  const extractVideoId = useCallback((url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }, [])

  // Handle URL submit
  const handleUrlSubmit = useCallback(() => {
    const videoId = extractVideoId(urlInput)
    if (videoId) {
      setCurrentVideoId(videoId)
      setIsPlaying(true)
    }
  }, [urlInput, extractVideoId])

  // Play curated playlist
  const playCurated = useCallback((playlist: CuratedPlaylist) => {
    setCurrentVideoId(playlist.videoId)
    setIsPlaying(true)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className={cn(
        'flex border-b',
        isDark ? 'border-white/10' : 'border-black/10'
      )}>
        {(['curated', 'url', 'search'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-sm font-medium capitalize',
              'transition-all duration-200',
              tab === t
                ? isDark
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-black border-b-2 border-purple-500'
                : isDark
                  ? 'text-white/50 hover:text-white/70'
                  : 'text-black/50 hover:text-black/70'
            )}
          >
            {t === 'url' ? 'Paste URL' : t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        <AnimatePresence mode="wait">
          {tab === 'curated' && (
            <motion.div
              key="curated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-2"
            >
              {CURATED_PLAYLISTS.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => playCurated(playlist)}
                  className={cn(
                    'flex flex-col rounded-lg overflow-hidden',
                    'transition-all duration-200',
                    currentVideoId === playlist.videoId
                      ? 'ring-2 ring-purple-500'
                      : isDark
                        ? 'hover:bg-white/5'
                        : 'hover:bg-black/5'
                  )}
                >
                  <div className="aspect-video bg-black/20 relative">
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {currentVideoId === playlist.videoId && isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Music className="w-6 h-6 text-white animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className={cn(
                      'text-xs font-medium truncate',
                      isDark ? 'text-white' : 'text-black'
                    )}>
                      {playlist.title}
                    </div>
                    <div className={cn(
                      'text-[10px] truncate',
                      isDark ? 'text-white/50' : 'text-black/50'
                    )}>
                      {playlist.description}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {tab === 'url' && (
            <motion.div
              key="url"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste YouTube URL..."
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm',
                    'outline-none',
                    isDark
                      ? 'bg-white/10 text-white placeholder:text-white/40'
                      : 'bg-black/5 text-black placeholder:text-black/40'
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
                <button
                  onClick={handleUrlSubmit}
                  className={cn(
                    'px-3 py-2 rounded-lg',
                    'bg-purple-500/20 hover:bg-purple-500/30',
                    'text-purple-400'
                  )}
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>

              <div className={cn(
                'text-xs text-center py-4',
                isDark ? 'text-white/40' : 'text-black/40'
              )}>
                <Link className="w-4 h-4 mx-auto mb-2 opacity-50" />
                Paste a YouTube video or playlist URL
              </div>
            </motion.div>
          )}

          {tab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search YouTube..."
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm',
                    'outline-none',
                    isDark
                      ? 'bg-white/10 text-white placeholder:text-white/40'
                      : 'bg-black/5 text-black placeholder:text-black/40'
                  )}
                />
                <button
                  className={cn(
                    'px-3 py-2 rounded-lg',
                    'bg-purple-500/20 hover:bg-purple-500/30',
                    'text-purple-400'
                  )}
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className={cn(
                'text-xs text-center py-4',
                isDark ? 'text-white/40' : 'text-black/40'
              )}>
                <Search className="w-4 h-4 mx-auto mb-2 opacity-50" />
                Add YouTube API key in settings to enable search
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player */}
      {currentVideoId && (
        <div className={cn(
          'border-t p-3',
          isDark ? 'border-white/10' : 'border-black/10'
        )}>
          <div className="aspect-video rounded-lg overflow-hidden bg-black mb-2">
            <iframe
              src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                'p-2 rounded-lg',
                isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                'p-2 rounded-lg',
                isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
              )}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <a
              href={`https://youtube.com/watch?v=${currentVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'ml-auto p-2 rounded-lg',
                isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/60'
              )}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}





