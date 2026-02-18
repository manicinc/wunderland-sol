/**
 * Social Import Card Component
 * @module codex/ui/SocialImportCard
 *
 * @remarks
 * URL paste input with auto-detect and preview for importing
 * social media content as strands. Shows platform branding,
 * metadata preview, and engagement stats before import.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  Loader2,
  X,
  ExternalLink,
  FileText,
  AlertCircle,
  Check,
  Edit3,
  Image as ImageIcon,
} from 'lucide-react'
import { detectPlatformFromUrl, type SocialPlatform, type SocialEngagement, type SocialMedia } from '@/lib/social/platforms'
import SocialPlatformIcon from './SocialPlatformIcon'
import { SocialEngagementBar } from './SocialSourceBadge'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SocialScrapeResult {
  content: string
  title: string
  metadata: {
    author?: string
    siteName?: string
    platform?: {
      id: string
      name: string
      icon: string
      color: string
    }
    postId?: string
    username?: string
    profileUrl?: string
    engagement?: SocialEngagement
    media?: SocialMedia
    hashtags?: string[]
    mentions?: string[]
    postedAt?: string
  }
}

interface SocialImportCardProps {
  /** Callback when content is imported */
  onImport: (result: SocialScrapeResult, url: string) => void
  /** Callback to edit metadata before import */
  onEditMetadata?: (result: SocialScrapeResult, url: string) => void
  /** Callback when card is dismissed */
  onCancel?: () => void
  /** Initial URL to scrape (optional) */
  initialUrl?: string
  /** Auto-scrape on URL paste */
  autoScrape?: boolean
  /** Show card inline vs modal-style */
  variant?: 'inline' | 'card'
  /** Additional CSS classes */
  className?: string
}

type ImportState = 'idle' | 'detecting' | 'scraping' | 'preview' | 'error'

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Social Import Card
 *
 * @example
 * ```tsx
 * <SocialImportCard
 *   onImport={(result, url) => {
 *     createStrandFromSocial(result, url)
 *   }}
 *   onCancel={() => setShowImport(false)}
 * />
 * ```
 */
export default function SocialImportCard({
  onImport,
  onEditMetadata,
  onCancel,
  initialUrl = '',
  autoScrape = true,
  variant = 'card',
  className = '',
}: SocialImportCardProps) {
  const [url, setUrl] = useState(initialUrl)
  const [state, setState] = useState<ImportState>('idle')
  const [platform, setPlatform] = useState<SocialPlatform | null>(null)
  const [result, setResult] = useState<SocialScrapeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Detect platform when URL changes
  useEffect(() => {
    if (!url.trim()) {
      setPlatform(null)
      setState('idle')
      setError(null)
      return
    }

    // Quick platform detection
    const detected = detectPlatformFromUrl(url)
    setPlatform(detected)

    if (detected && autoScrape) {
      // Auto-scrape after a short delay
      const timer = setTimeout(() => {
        handleScrape()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [url, autoScrape])

  // Handle URL scraping
  const handleScrape = useCallback(async () => {
    if (!url.trim()) return

    setState('scraping')
    setError(null)

    try {
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to fetch (${response.status})`)
      }

      const data: SocialScrapeResult = await response.json()
      setResult(data)
      setState('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scrape URL')
      setState('error')
    }
  }, [url])

  // Handle import action
  const handleImport = () => {
    if (result) {
      onImport(result, url)
    }
  }

  // Handle edit action
  const handleEdit = () => {
    if (result && onEditMetadata) {
      onEditMetadata(result, url)
    }
  }

  // Handle URL paste
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setUrl(text)
      }
    } catch {
      // Clipboard access denied
    }
  }

  // Reset state
  const handleReset = () => {
    setUrl('')
    setState('idle')
    setPlatform(null)
    setResult(null)
    setError(null)
  }

  const isCard = variant === 'card'

  return (
    <div
      className={`
        ${isCard ? 'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm' : ''}
        ${className}
      `}
    >
      {/* URL Input Section */}
      <div className={`${isCard ? 'p-4' : 'pb-4'}`}>
        <div className="relative">
          {/* Platform indicator */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {platform ? (
              <SocialPlatformIcon platform={platform} size="sm" showBackground />
            ) : (
              <Link2 className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* URL input */}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
            placeholder="Paste social media URL..."
            className={`
              w-full pl-10 pr-24 py-2.5 rounded-lg
              bg-gray-50 dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              focus:border-blue-500 dark:focus:border-blue-400
              focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400
              text-sm placeholder:text-gray-400
              transition-colors
              ${platform ? 'border-l-2' : ''}
            `}
            style={{
              borderLeftColor: platform?.color,
            }}
            disabled={state === 'scraping'}
          />

          {/* Action buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {state === 'scraping' && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            )}

            {url && state !== 'scraping' && (
              <button
                onClick={handleReset}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {!url && (
              <button
                onClick={handlePaste}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Paste
              </button>
            )}

            {url && state === 'idle' && platform && (
              <button
                onClick={handleScrape}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded font-medium"
              >
                Fetch
              </button>
            )}
          </div>
        </div>

        {/* Supported platforms hint */}
        {state === 'idle' && !url && (
          <p className="mt-2 text-xs text-gray-400">
            Supports Reddit, Twitter/X, Instagram, Pinterest, YouTube, TikTok, and more
          </p>
        )}
      </div>

      {/* Error State */}
      <AnimatePresence>
        {state === 'error' && error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`${isCard ? 'px-4 pb-4' : 'pb-4'}`}
          >
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={handleScrape}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview State */}
      <AnimatePresence>
        {state === 'preview' && result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`border-t border-gray-200 dark:border-gray-800 ${isCard ? 'p-4' : 'pt-4'}`}
          >
            {/* Preview content */}
            <div className="space-y-3">
              {/* Header with platform and title */}
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                {result.metadata.media?.images?.[0] ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <img
                      src={result.metadata.media.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : result.metadata.media?.thumbnails?.[0] ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <img
                      src={result.metadata.media.thumbnails[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    {result.metadata.platform ? (
                      <SocialPlatformIcon
                        platform={result.metadata.platform.id}
                        size="lg"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                )}

                {/* Title and author */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                    {result.title}
                  </h4>

                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {result.metadata.platform && (
                      <span
                        className="font-medium"
                        style={{ color: result.metadata.platform.color }}
                      >
                        {result.metadata.platform.name}
                      </span>
                    )}

                    {result.metadata.username && (
                      <>
                        <span>•</span>
                        <span>{result.metadata.username}</span>
                      </>
                    )}

                    {result.metadata.author && !result.metadata.username && (
                      <>
                        <span>•</span>
                        <span>{result.metadata.author}</span>
                      </>
                    )}
                  </div>

                  {/* Engagement stats */}
                  {result.metadata.engagement && (
                    <div className="mt-2">
                      <SocialEngagementBar
                        engagement={result.metadata.engagement}
                        platform={result.metadata.platform?.id}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Hashtags */}
              {result.metadata.hashtags && result.metadata.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {result.metadata.hashtags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                  {result.metadata.hashtags.length > 5 && (
                    <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
                      +{result.metadata.hashtags.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Media count */}
              {result.metadata.media && (
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {result.metadata.media.images.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {result.metadata.media.images.length} image
                      {result.metadata.media.images.length !== 1 && 's'}
                    </span>
                  )}
                </div>
              )}

              {/* Content preview */}
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {result.content.slice(0, 200)}
                {result.content.length > 200 && '...'}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                Import as Strand
              </button>

              {onEditMetadata && (
                <button
                  onClick={handleEdit}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Edit metadata before import"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleReset}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* View original link */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              View original
              <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel button for card variant */}
      {isCard && onCancel && state === 'idle' && (
        <div className="px-4 pb-4 flex justify-end">
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPACT URL INPUT VARIANT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Compact URL input for inline use
 */
export function SocialUrlInput({
  onDetect,
  placeholder = 'Paste social URL...',
  className = '',
}: {
  onDetect: (url: string, platform: SocialPlatform | null) => void
  placeholder?: string
  className?: string
}) {
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState<SocialPlatform | null>(null)

  useEffect(() => {
    const detected = url.trim() ? detectPlatformFromUrl(url) : null
    setPlatform(detected)
  }, [url])

  const handleSubmit = () => {
    if (url.trim()) {
      onDetect(url, platform)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        {platform ? (
          <SocialPlatformIcon platform={platform} size="xs" showBackground />
        ) : (
          <Link2 className="w-3.5 h-3.5 text-gray-400" />
        )}
      </div>

      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={placeholder}
        className={`
          w-full pl-9 pr-3 py-1.5 text-xs rounded-md
          bg-gray-50 dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          placeholder:text-gray-400
        `}
        style={{
          borderLeftColor: platform?.color,
          borderLeftWidth: platform ? 2 : 1,
        }}
      />
    </div>
  )
}
