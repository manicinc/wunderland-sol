'use client'

/**
 * Audio Node View for TipTap Editor
 * @module quarry/ui/tiptap/extensions/AudioNodeView
 *
 * Renders embedded audio with a custom player UI,
 * progress bar, and provider-specific styling.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { Play, Pause, Volume2, VolumeX, ExternalLink, Trash2, Edit2, Music, Headphones } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseAudioUrl, AudioProvider } from './AudioExtension'

// Provider icons and colors
const providerConfig: Record<AudioProvider, { icon: React.ReactNode; color: string; name: string }> = {
  soundcloud: { icon: <Music className="w-4 h-4" />, color: 'bg-orange-500', name: 'SoundCloud' },
  spotify: { icon: <Headphones className="w-4 h-4" />, color: 'bg-green-500', name: 'Spotify' },
  direct: { icon: <Music className="w-4 h-4" />, color: 'bg-violet-600', name: 'Audio' },
  unknown: { icon: <Music className="w-4 h-4" />, color: 'bg-zinc-500', name: 'Audio' },
}

// Format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function AudioNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, provider, embedUrl, title, caption } = node.attrs
  const [isEditing, setIsEditing] = useState(false)
  const [editUrl, setEditUrl] = useState(src || '')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const config = providerConfig[provider as AudioProvider] || providerConfig.unknown

  // Handle URL update
  const handleUpdateUrl = useCallback(() => {
    if (editUrl && editUrl !== src) {
      const parsed = parseAudioUrl(editUrl)
      updateAttributes({
        src: editUrl,
        provider: parsed.provider,
        embedUrl: parsed.embedUrl,
      })
    }
    setIsEditing(false)
  }, [editUrl, src, updateAttributes])

  // Handle title update
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ title: e.target.value })
  }, [updateAttributes])

  // Handle caption update
  const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ caption: e.target.value })
  }, [updateAttributes])

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  // Mute toggle
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  // Seek
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [])

  // Time update handler
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration || 0)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [embedUrl])

  // Handle delete
  const handleDelete = useCallback(() => {
    deleteNode()
  }, [deleteNode])

  // Open in new tab
  const handleOpenExternal = useCallback(() => {
    if (src) {
      window.open(src, '_blank', 'noopener,noreferrer')
    }
  }, [src])

  return (
    <NodeViewWrapper className="relative my-4">
      <div
        className={cn(
          'relative rounded-xl overflow-hidden',
          'bg-zinc-100 dark:bg-zinc-800',
          selected && 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-zinc-900'
        )}
      >
        {/* Edit mode */}
        {isEditing ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              {config.icon}
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Edit Audio URL
              </span>
            </div>
            <input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://example.com/audio.mp3"
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-white dark:bg-zinc-700',
                'border border-zinc-300 dark:border-zinc-600',
                'text-zinc-900 dark:text-zinc-100',
                'placeholder-zinc-400 dark:placeholder-zinc-500',
                'focus:outline-none focus:ring-2 focus:ring-violet-500/50'
              )}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateUrl()
                if (e.key === 'Escape') setIsEditing(false)
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdateUrl}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  'bg-violet-600 text-white hover:bg-violet-700'
                )}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                )}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : embedUrl ? (
          <>
            {/* SoundCloud/Spotify iframe embed */}
            {(provider === 'soundcloud' || provider === 'spotify') ? (
              <div className="relative">
                <iframe
                  src={embedUrl}
                  width="100%"
                  height={provider === 'spotify' ? 152 : 166}
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-t-xl"
                />
              </div>
            ) : (
              /* Custom audio player for direct files */
              <div className="p-4">
                {/* Hidden audio element */}
                <audio ref={audioRef} src={embedUrl} preload="metadata" />

                {/* Player UI */}
                <div className="flex items-center gap-4">
                  {/* Play button */}
                  <button
                    onClick={togglePlay}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      'bg-violet-600 text-white hover:bg-violet-700',
                      'transition-colors'
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>

                  {/* Progress and info */}
                  <div className="flex-1 space-y-1">
                    {/* Title */}
                    <input
                      type="text"
                      value={title || ''}
                      onChange={handleTitleChange}
                      placeholder="Audio title..."
                      className={cn(
                        'w-full text-sm font-medium bg-transparent',
                        'text-zinc-800 dark:text-zinc-200',
                        'placeholder-zinc-400 dark:placeholder-zinc-500',
                        'focus:outline-none'
                      )}
                    />

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-10">
                        {formatTime(currentTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className={cn(
                          'flex-1 h-1.5 rounded-full appearance-none cursor-pointer',
                          'bg-zinc-300 dark:bg-zinc-600',
                          '[&::-webkit-slider-thumb]:appearance-none',
                          '[&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3',
                          '[&::-webkit-slider-thumb]:rounded-full',
                          '[&::-webkit-slider-thumb]:bg-violet-600'
                        )}
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-10">
                        {formatTime(duration)}
                      </span>
                    </div>
                  </div>

                  {/* Volume toggle */}
                  <button
                    onClick={toggleMute}
                    className={cn(
                      'p-2 rounded-lg',
                      'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
                      'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    )}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons (hover) */}
            <div
              className={cn(
                'absolute top-2 right-2 flex items-center gap-1',
                'opacity-0 hover:opacity-100 transition-opacity'
              )}
            >
              {/* Provider badge */}
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-white text-xs font-medium',
                  config.color
                )}
              >
                {config.icon}
                <span>{config.name}</span>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  'p-1.5 rounded-lg',
                  'bg-black/50 text-white hover:bg-black/70',
                  'transition-colors'
                )}
                title="Edit URL"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Open external */}
              <button
                onClick={handleOpenExternal}
                className={cn(
                  'p-1.5 rounded-lg',
                  'bg-black/50 text-white hover:bg-black/70',
                  'transition-colors'
                )}
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              {/* Delete button */}
              <button
                onClick={handleDelete}
                className={cn(
                  'p-1.5 rounded-lg',
                  'bg-red-500/80 text-white hover:bg-red-600',
                  'transition-colors'
                )}
                title="Delete audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          // Empty state - prompt for URL
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                <Music className="w-6 h-6 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Add audio
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  MP3, WAV, or streaming URL
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-violet-600 text-white hover:bg-violet-700',
                  'transition-colors'
                )}
              >
                Add Audio URL
              </button>
            </div>
          </div>
        )}

        {/* Caption input */}
        {embedUrl && !isEditing && provider !== 'soundcloud' && provider !== 'spotify' && (
          <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700">
            <input
              type="text"
              value={caption || ''}
              onChange={handleCaptionChange}
              placeholder="Add a caption..."
              className={cn(
                'w-full text-sm text-center bg-transparent',
                'text-zinc-600 dark:text-zinc-400',
                'placeholder-zinc-400 dark:placeholder-zinc-500',
                'focus:outline-none'
              )}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
