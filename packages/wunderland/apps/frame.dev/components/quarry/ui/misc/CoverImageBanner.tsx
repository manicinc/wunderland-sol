/**
 * Cover Image Banner
 * @module codex/ui/CoverImageBanner
 * 
 * @remarks
 * Displays a cover image banner for strands that have a coverImage defined.
 * Supports:
 * - Full-width hero banner
 * - Gradient overlays for text readability
 * - Responsive height
 * - Loading states
 * - Error handling with graceful fallback
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageOff, RefreshCw } from 'lucide-react'

interface CoverImageBannerProps {
  /** Cover image URL */
  src: string
  /** Alt text for accessibility */
  alt?: string
  /** Optional title to overlay */
  title?: string
  /** Optional subtitle */
  subtitle?: string
  /** Current theme */
  theme?: string
  /** Height variant */
  height?: 'sm' | 'md' | 'lg' | 'xl'
  /** Show gradient overlay */
  showOverlay?: boolean
  /** Custom className */
  className?: string
}

const heightClasses = {
  sm: 'h-32 sm:h-40',
  md: 'h-40 sm:h-52',
  lg: 'h-52 sm:h-64',
  xl: 'h-64 sm:h-80',
}

/**
 * Cover image banner component with loading states and overlays
 */
export default function CoverImageBanner({
  src,
  alt = 'Cover image',
  title,
  subtitle,
  theme = 'light',
  height = 'md',
  showOverlay = true,
  className = '',
}: CoverImageBannerProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [retryCount, setRetryCount] = useState(0)
  
  const isDark = theme?.includes('dark')

  const handleLoad = () => {
    setImageState('loaded')
  }

  const handleError = () => {
    setImageState('error')
  }

  const handleRetry = () => {
    setImageState('loading')
    setRetryCount(prev => prev + 1)
  }

  if (!src) return null

  return (
    <div 
      className={`
        relative w-full ${heightClasses[height]} overflow-hidden rounded-xl
        ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
        ${className}
      `}
    >
      {/* Loading State */}
      <AnimatePresence>
        {imageState === 'loading' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`
                w-10 h-10 rounded-full border-2 border-t-transparent animate-spin
                ${isDark ? 'border-zinc-600' : 'border-zinc-300'}
              `} />
              <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Loading image...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {imageState === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div className={`
                p-3 rounded-full
                ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
              `}>
                <ImageOff className={`w-6 h-6 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Failed to load cover image
                </p>
                <button
                  onClick={handleRetry}
                  className={`
                    mt-2 flex items-center gap-1.5 text-xs font-medium mx-auto
                    ${isDark 
                      ? 'text-cyan-400 hover:text-cyan-300' 
                      : 'text-cyan-600 hover:text-cyan-500'}
                  `}
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image */}
      <motion.img
        key={`${src}-${retryCount}`}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ 
          opacity: imageState === 'loaded' ? 1 : 0,
          scale: imageState === 'loaded' ? 1 : 1.05,
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient Overlay */}
      {showOverlay && imageState === 'loaded' && (
        <div className={`
          absolute inset-0
          bg-gradient-to-t from-black/70 via-black/20 to-transparent
        `} />
      )}

      {/* Title Overlay */}
      {(title || subtitle) && imageState === 'loaded' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="absolute bottom-0 left-0 right-0 p-4 sm:p-6"
        >
          {title && (
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 drop-shadow-lg">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm sm:text-base text-white/80 drop-shadow-md max-w-2xl">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}

      {/* Decorative corner accent */}
      {imageState === 'loaded' && (
        <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
          <div className="
            absolute -top-12 -right-12 w-24 h-24 
            bg-gradient-to-br from-cyan-500/30 to-transparent
            transform rotate-45
          " />
        </div>
      )}
    </div>
  )
}

/**
 * Compact variant for card views
 */
export function CoverImageThumbnail({
  src,
  alt = 'Thumbnail',
  theme = 'light',
  className = '',
}: Pick<CoverImageBannerProps, 'src' | 'alt' | 'theme' | 'className'>) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const isDark = theme?.includes('dark')

  if (!src) return null

  return (
    <div 
      className={`
        relative w-full aspect-video overflow-hidden rounded-lg
        ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
        ${className}
      `}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff className={`w-5 h-5 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`
          absolute inset-0 w-full h-full object-cover
          transition-opacity duration-300
          ${loaded ? 'opacity-100' : 'opacity-0'}
        `}
      />
    </div>
  )
}






