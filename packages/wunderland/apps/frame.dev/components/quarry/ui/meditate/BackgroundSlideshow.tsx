'use client'

/**
 * Background Slideshow
 * @module components/quarry/ui/meditate/BackgroundSlideshow
 * 
 * Animated background slideshow for the Meditation Focus page.
 * Features crossfade transitions, blur on interaction, and soundscape matching.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import {
  getImagesForSoundscape,
  getAllImages,
  type CatalogImage,
  type SlideshowConfig,
} from '@/lib/meditate/backgroundCatalog'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface BackgroundSlideshowProps {
  /** Current soundscape for image matching */
  soundscape: SoundscapeType
  /** Whether ambience is playing */
  isPlaying: boolean
  /** Whether user is interacting (for blur) */
  isInteracting: boolean
  /** Enable blur on interaction */
  blurOnInteract?: boolean
  /** Blur intensity in pixels */
  blurIntensity?: number
  /** Slide interval in ms */
  interval?: number
  /** Transition type */
  transition?: 'crossfade' | 'blur-fade' | 'slide'
  /** Transition duration in ms */
  transitionDuration?: number
  /** Custom className */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function BackgroundSlideshow({
  soundscape,
  isPlaying,
  isInteracting,
  blurOnInteract = true,
  blurIntensity = 8,
  interval = 30000,
  transition = 'crossfade',
  transitionDuration = 2000,
  className,
}: BackgroundSlideshowProps) {
  const [images, setImages] = useState<CatalogImage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load images for soundscape
  useEffect(() => {
    async function loadImages() {
      let imgs: CatalogImage[]
      
      if (soundscape === 'none') {
        imgs = await getAllImages()
      } else {
        imgs = await getImagesForSoundscape(soundscape)
      }
      
      // Shuffle images
      imgs = shuffleArray([...imgs])
      
      setImages(imgs)
      setCurrentIndex(0)
      setIsLoaded(true)
    }

    loadImages()
  }, [soundscape])

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying || images.length <= 1) return

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, interval)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isPlaying, images.length, interval])

  // Current image
  const currentImage = images[currentIndex]
  const nextImage = images[(currentIndex + 1) % images.length]

  // Blur style
  const blurStyle = blurOnInteract && isInteracting
    ? { filter: `blur(${blurIntensity}px)` }
    : { filter: 'blur(0px)' }

  // Transition variants
  const variants = {
    crossfade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    'blur-fade': {
      initial: { opacity: 0, filter: 'blur(20px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(20px)' },
    },
    slide: {
      initial: { opacity: 0, x: 100 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -100 },
    },
  }

  // Fallback gradient
  const fallbackGradient = 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'

  if (!isLoaded) {
    return (
      <div
        className={cn('absolute inset-0 transition-all duration-500', className)}
        style={{ background: fallbackGradient, ...blurStyle }}
      />
    )
  }

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {/* Background layer */}
      <div
        className="absolute inset-0 transition-[filter] duration-500"
        style={blurStyle}
      >
        <AnimatePresence mode="wait">
          {currentImage ? (
            <motion.div
              key={currentImage.id}
              variants={variants[transition]}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: transitionDuration / 1000 }}
              className="absolute inset-0"
            >
              <Image
                src={currentImage.url}
                alt={currentImage.alt}
                fill
                priority
                className="object-cover"
                sizes="100vw"
                onError={() => {
                  // Skip to next image on error
                  setCurrentIndex((prev) => (prev + 1) % images.length)
                }}
              />
              {/* Subtle overlay for text readability */}
              <div className="absolute inset-0 bg-black/20" />
            </motion.div>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: fallbackGradient }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Preload next image */}
      {nextImage && nextImage.id !== currentImage?.id && (
        <div className="hidden">
          <Image
            src={nextImage.url}
            alt={nextImage.alt}
            width={1}
            height={1}
            priority={false}
          />
        </div>
      )}

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}





