'use client'

/**
 * Embed Node View for TipTap Editor
 * @module quarry/ui/tiptap/extensions/EmbedNodeView
 *
 * Renders embedded content with provider-specific styling
 * and edit controls.
 */

import React, { useState, useCallback } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import {
  ExternalLink,
  Trash2,
  Edit2,
  Globe,
  Code2,
  Figma,
  Video,
  Twitter,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseEmbedUrl, EmbedProvider } from './EmbedExtension'

// Provider icons and colors
const providerConfig: Record<EmbedProvider, { icon: React.ReactNode; color: string; name: string }> = {
  twitter: { icon: <Twitter className="w-4 h-4" />, color: 'bg-sky-500', name: 'Twitter/X' },
  codepen: { icon: <Code2 className="w-4 h-4" />, color: 'bg-zinc-800', name: 'CodePen' },
  codesandbox: { icon: <Code2 className="w-4 h-4" />, color: 'bg-zinc-900', name: 'CodeSandbox' },
  figma: { icon: <Figma className="w-4 h-4" />, color: 'bg-purple-600', name: 'Figma' },
  loom: { icon: <Video className="w-4 h-4" />, color: 'bg-indigo-600', name: 'Loom' },
  notion: { icon: <FileText className="w-4 h-4" />, color: 'bg-zinc-800', name: 'Notion' },
  generic: { icon: <Globe className="w-4 h-4" />, color: 'bg-zinc-600', name: 'Embed' },
}

export default function EmbedNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, provider, embedUrl, height, aspectRatio, caption } = node.attrs
  const [isEditing, setIsEditing] = useState(false)
  const [editUrl, setEditUrl] = useState(src || '')
  const [isLoaded, setIsLoaded] = useState(false)

  const config = providerConfig[provider as EmbedProvider] || providerConfig.generic

  // Calculate aspect ratio padding
  const getAspectRatioPadding = () => {
    if (aspectRatio) {
      const [w, h] = aspectRatio.split(':').map(Number)
      return `${(h / w) * 100}%`
    }
    return undefined
  }

  // Handle URL update
  const handleUpdateUrl = useCallback(() => {
    if (editUrl && editUrl !== src) {
      const parsed = parseEmbedUrl(editUrl)
      updateAttributes({
        src: editUrl,
        provider: parsed.provider,
        embedUrl: parsed.embedUrl,
        height: parsed.height,
        aspectRatio: parsed.aspectRatio,
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

  const paddingBottom = getAspectRatioPadding()

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
              {config.icon}
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Edit Embed URL
              </span>
            </div>
            <input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://..."
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
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Supported: Twitter/X, CodePen, CodeSandbox, Figma, Loom, Notion
            </div>
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
            {/* Embed container */}
            <div
              className="relative bg-zinc-200 dark:bg-zinc-700"
              style={paddingBottom ? { paddingBottom } : { height }}
            >
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    {config.icon}
                    <span className="text-sm">Loading {config.name}...</span>
                  </div>
                </div>
              )}
              <iframe
                src={embedUrl}
                className={cn(
                  paddingBottom ? 'absolute inset-0 w-full h-full' : 'w-full',
                  !isLoaded && 'opacity-0'
                )}
                style={!paddingBottom ? { height } : undefined}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                onLoad={() => setIsLoaded(true)}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
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
                title="Delete embed"
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
                <Globe className="w-6 h-6 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Add an embed
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Twitter, CodePen, Figma, and more
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
                Add Embed URL
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
