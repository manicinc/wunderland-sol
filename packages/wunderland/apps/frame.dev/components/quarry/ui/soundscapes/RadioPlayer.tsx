/**
 * Radio Player
 * @module components/quarry/ui/RadioPlayer
 *
 * Minimal lo-fi radio player with YouTube stream support.
 * Integrates with the ambient soundscape system.
 */

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Music,
  Coffee,
  Piano,
  Cloud,
  TreePine,
  ChevronDown,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  RADIO_STREAMS,
  RADIO_GENRES,
  getStreamsByGenre,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  type RadioStream,
  type RadioGenre,
  type RadioGenreInfo,
} from '@/lib/audio/radioStreams'

// ============================================================================
// TYPES
// ============================================================================

export interface RadioPlayerProps {
  /** Whether the player is expanded */
  expanded?: boolean
  /** Dark mode */
  isDark?: boolean
  /** Callback when stream changes */
  onStreamChange?: (stream: RadioStream | null) => void
  /** Callback when play state changes */
  onPlayStateChange?: (isPlaying: boolean) => void
  /** Additional class names */
  className?: string
}

// ============================================================================
// ICON MAP
// ============================================================================

const GENRE_ICONS: Record<RadioGenre, React.ElementType> = {
  lofi: Music,
  jazz: Coffee,
  classical: Piano,
  ambient: Cloud,
  nature: TreePine,
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RadioPlayer({
  expanded = false,
  isDark = true,
  onStreamChange,
  onPlayStateChange,
  className,
}: RadioPlayerProps) {
  const [currentStream, setCurrentStream] = useState<RadioStream | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<RadioGenre>('lofi')
  const [showGenreMenu, setShowGenreMenu] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Get streams for selected genre
  const genreStreams = getStreamsByGenre(selectedGenre)
  const currentGenreInfo = RADIO_GENRES.find(g => g.id === selectedGenre)

  // Handle stream selection
  const selectStream = useCallback((stream: RadioStream) => {
    setCurrentStream(stream)
    setIsPlaying(true)
    setIsLoading(true)
    onStreamChange?.(stream)
    onPlayStateChange?.(true)
  }, [onStreamChange, onPlayStateChange])

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!currentStream) {
      // Select first stream if none selected
      const firstStream = genreStreams[0]
      if (firstStream) {
        selectStream(firstStream)
      }
      return
    }

    const newState = !isPlaying
    setIsPlaying(newState)
    onPlayStateChange?.(newState)

    // Control iframe playback via postMessage
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: newState ? 'playVideo' : 'pauseVideo',
        }),
        '*'
      )
    }
  }, [currentStream, isPlaying, genreStreams, selectStream, onPlayStateChange])

  // Navigate streams
  const nextStream = useCallback(() => {
    if (!currentStream) return
    const currentIndex = genreStreams.findIndex(s => s.id === currentStream.id)
    const nextIndex = (currentIndex + 1) % genreStreams.length
    selectStream(genreStreams[nextIndex])
  }, [currentStream, genreStreams, selectStream])

  const prevStream = useCallback(() => {
    if (!currentStream) return
    const currentIndex = genreStreams.findIndex(s => s.id === currentStream.id)
    const prevIndex = currentIndex <= 0 ? genreStreams.length - 1 : currentIndex - 1
    selectStream(genreStreams[prevIndex])
  }, [currentStream, genreStreams, selectStream])

  // Handle volume
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)

    // Control iframe volume via postMessage
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'setVolume',
          args: [newVolume * 100],
        }),
        '*'
      )
    }
  }, [])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: newMuted ? 'mute' : 'unMute',
        }),
        '*'
      )
    }
  }, [isMuted])

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  // Select genre
  const handleGenreSelect = useCallback((genre: RadioGenre) => {
    setSelectedGenre(genre)
    setShowGenreMenu(false)
    // Optionally auto-play first stream of new genre
    const streams = getStreamsByGenre(genre)
    if (streams.length > 0 && isPlaying) {
      selectStream(streams[0])
    } else {
      setCurrentStream(null)
      setIsPlaying(false)
    }
  }, [isPlaying, selectStream])

  // Get icon for genre
  const GenreIcon = currentGenreInfo ? GENRE_ICONS[currentGenreInfo.id] : Radio

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        isDark ? 'bg-zinc-900/80 border border-zinc-800' : 'bg-white/80 border border-zinc-200',
        className
      )}
    >
      {/* Hidden YouTube iframe */}
      {currentStream && isPlaying && (
        <iframe
          ref={iframeRef}
          src={getYouTubeEmbedUrl(currentStream.url, true)}
          className="hidden"
          allow="autoplay"
          onLoad={handleIframeLoad}
        />
      )}

      {/* Header with genre selector */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center gap-2">
          <Radio className={cn(
            'w-4 h-4',
            isPlaying ? 'text-purple-400' : isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
          <span className={cn(
            'text-sm font-medium',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            Lo-fi Radio
          </span>
        </div>

        {/* Genre dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowGenreMenu(!showGenreMenu)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
              isDark
                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
            )}
          >
            <GenreIcon className="w-3.5 h-3.5" />
            <span>{currentGenreInfo?.name || 'Select'}</span>
            <ChevronDown className={cn(
              'w-3 h-3 transition-transform',
              showGenreMenu && 'rotate-180'
            )} />
          </button>

          <AnimatePresence>
            {showGenreMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={cn(
                  'absolute right-0 top-full mt-1 z-20 rounded-lg shadow-xl overflow-hidden min-w-[140px]',
                  isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
                )}
              >
                {RADIO_GENRES.map((genre) => {
                  const Icon = GENRE_ICONS[genre.id]
                  return (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreSelect(genre.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                        selectedGenre === genre.id
                          ? isDark
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-purple-100 text-purple-700'
                          : isDark
                          ? 'text-zinc-300 hover:bg-zinc-700'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      )}
                    >
                      <Icon className="w-4 h-4" style={{ color: genre.color }} />
                      <span>{genre.name}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Now Playing */}
      <div className={cn(
        'px-3 py-3',
        isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'
      )}>
        {currentStream ? (
          <div className="flex items-center gap-3">
            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={getYouTubeThumbnail(currentStream.url, 'hq')}
                alt={currentStream.name}
                className="w-full h-full object-cover"
              />
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
              {isPlaying && !isLoading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-white rounded-full"
                        animate={{
                          height: ['8px', '16px', '8px'],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}>
                {currentStream.name}
              </p>
              <p className={cn(
                'text-xs truncate',
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              )}>
                {currentStream.description}
              </p>
              {currentStream.isLive && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] text-red-400 uppercase tracking-wide">Live</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={cn(
            'text-center py-2',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <p className="text-sm">Select a station to play</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-t',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevStream}
            disabled={!currentStream}
            className={cn(
              'p-1.5 rounded-lg transition-colors disabled:opacity-30',
              isDark
                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800'
            )}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isPlaying
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : isDark
                ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
            )}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>

          <button
            onClick={nextStream}
            disabled={!currentStream}
            className={cn(
              'p-1.5 rounded-lg transition-colors disabled:opacity-30',
              isDark
                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800'
            )}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isDark
                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800'
            )}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className={cn(
              'w-16 h-1 rounded-full appearance-none cursor-pointer',
              isDark ? 'bg-zinc-700' : 'bg-zinc-300',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-3',
              '[&::-webkit-slider-thumb]:h-3',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-purple-500',
              '[&::-webkit-slider-thumb]:cursor-pointer'
            )}
          />
        </div>
      </div>

      {/* Station List (expanded view) */}
      {expanded && (
        <div className={cn(
          'border-t max-h-48 overflow-y-auto',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          {genreStreams.map((stream) => (
            <button
              key={stream.id}
              onClick={() => selectStream(stream)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                currentStream?.id === stream.id
                  ? isDark
                    ? 'bg-purple-500/20'
                    : 'bg-purple-100'
                  : isDark
                  ? 'hover:bg-zinc-800'
                  : 'hover:bg-zinc-100'
              )}
            >
              <img
                src={getYouTubeThumbnail(stream.url, 'default')}
                alt={stream.name}
                className="w-10 h-10 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  currentStream?.id === stream.id
                    ? 'text-purple-400'
                    : isDark
                    ? 'text-zinc-200'
                    : 'text-zinc-800'
                )}>
                  {stream.name}
                </p>
                <p className={cn(
                  'text-xs truncate',
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                )}>
                  {stream.description}
                </p>
              </div>
              {stream.isLive && (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPACT PLAYER
// ============================================================================

export interface CompactRadioPlayerProps {
  isDark?: boolean
  className?: string
}

/**
 * Compact radio player for inline/sidebar use
 */
export function CompactRadioPlayer({
  isDark = true,
  className,
}: CompactRadioPlayerProps) {
  const [currentStream, setCurrentStream] = useState<RadioStream | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const togglePlay = useCallback(() => {
    if (!currentStream) {
      const stream = RADIO_STREAMS[0]
      setCurrentStream(stream)
      setIsPlaying(true)
      return
    }

    const newState = !isPlaying
    setIsPlaying(newState)

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: newState ? 'playVideo' : 'pauseVideo',
        }),
        '*'
      )
    }
  }, [currentStream, isPlaying])

  const nextStream = useCallback(() => {
    const currentIndex = currentStream
      ? RADIO_STREAMS.findIndex(s => s.id === currentStream.id)
      : -1
    const nextIndex = (currentIndex + 1) % RADIO_STREAMS.length
    setCurrentStream(RADIO_STREAMS[nextIndex])
    setIsPlaying(true)
  }, [currentStream])

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100',
      className
    )}>
      {/* Hidden iframe */}
      {currentStream && isPlaying && (
        <iframe
          ref={iframeRef}
          src={getYouTubeEmbedUrl(currentStream.url, true)}
          className="hidden"
          allow="autoplay"
        />
      )}

      <button
        onClick={togglePlay}
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          isPlaying
            ? 'bg-purple-500 text-white'
            : isDark
            ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
        )}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs font-medium truncate',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {currentStream?.name || 'Lo-fi Radio'}
        </p>
        {isPlaying && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-400">LIVE</span>
          </div>
        )}
      </div>

      <button
        onClick={nextStream}
        className={cn(
          'p-1 rounded transition-colors',
          isDark
            ? 'text-zinc-500 hover:text-zinc-300'
            : 'text-zinc-400 hover:text-zinc-600'
        )}
      >
        <SkipForward className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
