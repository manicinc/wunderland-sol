'use client'

import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'

/**
 * ScrollProgress - Floating progress bar showing scroll position
 * Thin emerald bar fixed to top, scales with scroll progress
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const prefersReducedMotion = useReducedMotion()
  
  // Smooth spring animation for progress (or instant if reduced motion)
  const scaleX = useSpring(scrollYProgress, prefersReducedMotion ? {
    stiffness: 1000,
    damping: 100,
  } : {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400 origin-left z-[100]"
      style={{ scaleX }}
    />
  )
}

export default ScrollProgress

