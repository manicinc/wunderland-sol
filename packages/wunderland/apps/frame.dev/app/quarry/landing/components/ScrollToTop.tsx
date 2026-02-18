'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion'
import { ChevronUp } from 'lucide-react'

/**
 * ScrollToTop - Premium floating button with radial progress
 * 
 * Features:
 * - Radial progress ring showing scroll position
 * - Glassmorphism style with backdrop blur
 * - Smooth spring animations
 * - Hides when at top of page
 */
export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const { scrollYProgress } = useScroll()

  // Smooth spring animation for progress
  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // Transform scroll progress to rotation for a dynamic feel
  // Rotates slightly as you scroll
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360])

  useEffect(() => {
    const toggleVisibility = () => {
      // Show when scrolled past 100px
      if (window.scrollY > 100) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  // Radius and circumference for SVG circle
  const radius = 18
  const circumference = 2 * Math.PI * radius

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-8 right-8 z-50 group"
        >
          <button
            onClick={scrollToTop}
            className="relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg shadow-emerald-500/20 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border border-white/20 dark:border-white/10 transition-transform group-hover:-translate-y-1 group-hover:shadow-emerald-500/30"
            aria-label="Scroll to top"
          >
            {/* Background Circle (Track) */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-gray-200 dark:stroke-gray-700 fill-none"
                strokeWidth="3"
              />
              {/* Progress Circle (Indicator) */}
              <motion.circle
                cx="24"
                cy="24"
                r={radius}
                className="fill-none stroke-emerald-500 dark:stroke-emerald-400"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                style={{
                  pathLength,
                  strokeLinecap: 'round'
                }}
              />
            </svg>

            {/* Icon */}
            <motion.div
              className="relative z-10 text-emerald-600 dark:text-emerald-400"
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <ChevronUp className="w-5 h-5" strokeWidth={2.5} />
            </motion.div>

            {/* Absolute glow effect behind */}
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 dark:bg-emerald-400/10 blur-md -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ScrollToTop
