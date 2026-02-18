'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useId, useRef } from 'react'

interface LiquifyMorphTextProps {
  words: string[]
  className?: string
  /** If provided, controls which word is shown externally. Otherwise, cycles automatically. */
  activeIndex?: number
  /** Interval in ms between word changes (only used if activeIndex is not provided) */
  interval?: number
}

/**
 * LiquifyMorphText - Creates a fluid morphing effect between words
 * Uses SVG filters to create organic, liquify-like transitions
 */
export function LiquifyMorphText({ 
  words, 
  className = '', 
  activeIndex,
  interval = 6500 
}: LiquifyMorphTextProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevIndexRef = useRef<number>(-1)
  const id = useId().replace(/:/g, '-')
  const filterId = `liquify-filter-${id}`

  // Use external index if provided, otherwise use internal
  const currentIndex = activeIndex !== undefined ? activeIndex : internalIndex

  // Trigger animation when index changes
  useEffect(() => {
    if (prevIndexRef.current !== -1 && prevIndexRef.current !== currentIndex) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 800)
      return () => clearTimeout(timer)
    }
    prevIndexRef.current = currentIndex
  }, [currentIndex])

  // Internal cycling (only if activeIndex is not provided)
  useEffect(() => {
    if (activeIndex !== undefined) return

    const timer = setInterval(() => {
      setInternalIndex((prev) => (prev + 1) % words.length)
    }, interval)

    return () => clearInterval(timer)
  }, [words.length, interval, activeIndex])

  const currentWord = words[currentIndex] || words[0]

  return (
    <span className={`relative inline-block ${className}`}>
      {/* SVG filter definitions */}
      <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
        <defs>
          {/* Turbulence-based liquify effect */}
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="3"
              result="noise"
              seed={currentIndex}
            >
              <animate
                attributeName="baseFrequency"
                values="0.012;0.018;0.008;0.012"
                dur="5s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                attributeName="scale"
                values="0;30;18;0"
                dur="0.8s"
                begin="indefinite"
                fill="freeze"
                id={`${filterId}-anim`}
              />
            </feDisplacementMap>
          </filter>
        </defs>
      </svg>

      {/* Animated text with liquify effect */}
      <AnimatePresence mode="wait">
        <motion.span
          key={currentWord}
          className="inline-block relative"
          style={{
            background: `linear-gradient(135deg, 
              var(--color-accent-primary) 0%, 
              var(--color-accent-secondary) 40%, 
              var(--color-accent-tertiary) 100%)`,
            backgroundSize: '200% 200%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: isAnimating ? `url(#${filterId})` : 'none',
            animation: 'gradient-shift 6s ease infinite',
          }}
          initial={{ 
            opacity: 0, 
            y: 30, 
            scale: 0.9,
            rotateX: -15,
          }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            rotateX: 0,
          }}
          exit={{ 
            opacity: 0, 
            y: -30, 
            scale: 1.1,
            rotateX: 15,
          }}
          transition={{ 
            duration: 0.7, 
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Glow layer behind text */}
          <motion.span 
            className="absolute inset-0 blur-xl opacity-40 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, 
                var(--color-accent-primary) 0%, 
                var(--color-accent-secondary) 40%, 
                var(--color-accent-tertiary) 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            aria-hidden="true"
          >
            {currentWord}
          </motion.span>
          {currentWord}
        </motion.span>
      </AnimatePresence>

      <style jsx global>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </span>
  )
}

export default LiquifyMorphText
