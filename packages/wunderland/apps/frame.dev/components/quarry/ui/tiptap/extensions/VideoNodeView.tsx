'use client'

/**
 * Video Node View for TipTap Editor
 * @module quarry/ui/tiptap/extensions/VideoNodeView
 *
 * Renders embedded videos with responsive aspect ratio,
 * provider-specific styling, and edit controls.
 */

import React, { useState, useCallback } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { Play, ExternalLink, Trash2, Edit2, Youtube, Video as VideoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseVideoUrl, VideoProvider } from './VideoExtension'

// Provider icons
const ProviderIcon = ({ provider }: { provider: VideoProvider }) => {
  switch (provider) {
    case 'youtube':
      return <Youtube className="w-4 h-4" />
    case 'vimeo':
      return <VideoIcon className="w-4 h-4" />
    default:
      return <VideoIcon className="w-4 h-4" />
  }
}

// Provider colors
const providerColors: Record<VideoProvider, string> = {
  youtube: 'bg-red-600',
  vimeo: 'bg-blue-500',
  direct: 'bg-zinc-600',
  unknown: 'bg-zinc-500',
}

export default function VideoNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, provider, embedUrl, aspectRatio, caption } = node.attrs
  const [isEditing, setIsEditing] = useState(false)
  const [editUrl, setEditUrl] = useState(src || '')
  const [isLoaded, setIsLoaded] = useState(false)

  // Calculate aspect ratio padding
  const getAspectRatioPadding = () => {
    const [w, h] = (aspectRatio || '16:9').split(':').map(Number)
    return `${(h / w) * 100}%`
  }

  // Handle URL update
  const handleUpdateUrl = useCallback(() => {
    if (editUrl && editUrl !== src) {
      const parsed = parseVideoUrl(editUrl)
      updateAttributes({
        src: editUrl,
        provider: parsed.provider,
        videoId: parsed.videoId,
        embedUrl: parsed.embedUrl,
      })
    }
    setIsEditing(false)
  }, [editUrl, src, updateAttributes])

  // Handle caption update
  const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ caption: e.target.value })
  }, [updateAttributes])

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
          'relative rounded-xl overflow-hidden group',
          'bg-zinc-100 dark:bg-zinc-800',
          selected && 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-zinc-900'
        )}
      >
        {/* Edit mode */}
        {isEditing ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ProviderIcon provider={provider} />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Edit Video URL
              </span>
            </div>
            <input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
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
            {/* Video embed container */}
            <div className="relative" style={{ paddingBottom: getAspectRatioPadding() }}>
              {provider === 'direct' ? (
                // Direct video element
                <video
                  src={embedUrl}
                  controls
                  className="absolute inset-0 w-full h-full"
                  onLoadedData={() => setIsLoaded(true)}
                >
                  <source src={embedUrl} />
                  Your browser does not support the video tag.
                </video>
              ) : (
                // iframe embed for YouTube/Vimeo
                <>
                  {!isLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700">
                      <div className="flex flex-col items-center gap-2 text-zinc-500">
                        <Play className="w-12 h-12" />
                        <span className="text-sm">Loading video...</span>
                      </div>
                    </div>
                  )}
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setIsLoaded(true)}
                    loading="lazy"
                  />
                </>
              )}
            </div>

            {/* Overlay controls (visible on hover) */}
            <div
              className={cn(
                'absolute top-2 right-2 flex items-center gap-1',
                'opacity-0 group-hover:opacity-100 transition-opacity'
              )}
            >
              {/* Provider badge */}
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-white text-xs font-medium',
                  providerColors[provider as VideoProvider]
                )}
              >
                <ProviderIcon provider={provider as VideoProvider} />
                <span className="capitalize">{provider}</span>
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
                title="Delete video"
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
                <Play className="w-6 h-6 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Add a video
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  YouTube, Vimeo, or direct URL
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
                Add Video URL
              </button>
            </div>
          </div>
        )}

        {/* Caption input */}
        {embedUrl && !isEditing && (
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
