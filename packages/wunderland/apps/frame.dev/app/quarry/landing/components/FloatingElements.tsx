'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'

interface FloatingElementsProps {
  /** Variant style */
  variant?: 'hero' | 'cta' | 'minimal'
  /** Base opacity */
  opacity?: number
  /** Enable mouse parallax */
  mouseParallax?: boolean
  /** Parallax intensity (0-1) */
  parallaxIntensity?: number
  /** Defer loading until after LCP (performance optimization) */
  defer?: boolean
}

/**
 * FloatingElements - Decorative geometric shapes with mouse parallax
 * Subtle, non-distracting background decoration
 * 
 * Performance optimizations:
 * - Respects prefers-reduced-motion
 * - Uses CSS transforms with will-change for GPU acceleration
 * - Reduces element count when deferred loading
 * - Lazy-loads after LCP when defer=true
 */
export function FloatingElements({
  variant = 'hero',
  opacity = 0.5,
  mouseParallax = true,
  parallaxIntensity = 0.02,
  defer = false,
}: FloatingElementsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isReady, setIsReady] = useState(!defer)

  // Use Framer Motion's built-in reduced motion detection
  const prefersReducedMotion = useReducedMotion()

  // Mouse position motion values
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring for smooth movement - only create if not reduced motion
  const springConfig = { stiffness: 50, damping: 30 }
  const smoothMouseX = useSpring(mouseX, springConfig)
  const smoothMouseY = useSpring(mouseY, springConfig)

  // Defer loading for performance - wait until after LCP
  useEffect(() => {
    setIsMounted(true)
    
    if (defer) {
      // Use requestIdleCallback for non-critical rendering
      const loadDeferred = () => setIsReady(true)
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(loadDeferred, { timeout: 2000 })
      } else {
        setTimeout(loadDeferred, 1500)
      }
    }
  }, [defer])

  // Element configurations by variant - reduce count for better performance
  // IMPORTANT: useMemo must be called unconditionally before any early returns
  const elements = useMemo(() => {
    const base = variant === 'hero' ? heroElements : variant === 'cta' ? ctaElements : minimalElements
    // Limit to 5 elements max for performance
    return base.slice(0, 5)
  }, [variant])

  useEffect(() => {
    if (!mouseParallax || prefersReducedMotion || !isReady) return

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1 range based on viewport center
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)
      mouseX.set(x)
      mouseY.set(y)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseParallax, mouseX, mouseY, prefersReducedMotion, isReady])

  // Don't render anything if reduced motion is preferred - use CSS fallback instead
  if (prefersReducedMotion) {
    return (
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ opacity: opacity * 0.5 }}
      >
        {/* Static CSS-only fallback for reduced motion */}
        <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute top-[30%] right-[10%] w-[200px] h-[200px] rounded-full bg-cyan-500/5 blur-2xl" />
      </div>
    )
  }

  if (!isMounted || !isReady) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity, willChange: 'opacity' }}
    >
      {elements.map((el, i) => (
        <FloatingShape
          key={i}
          {...el}
          mouseX={smoothMouseX}
          mouseY={smoothMouseY}
          parallaxIntensity={parallaxIntensity}
          index={i}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}
    </div>
  )
}

interface ShapeConfig {
  type: 'circle' | 'diamond' | 'ring' | 'dot'
  size: number
  x: string
  y: string
  color: string
  blur?: number
  parallaxFactor?: number
  animationDelay?: number
}

const heroElements: ShapeConfig[] = [
  { type: 'circle', size: 300, x: '10%', y: '20%', color: 'rgba(16, 185, 129, 0.08)', blur: 60, parallaxFactor: 0.3 },
  { type: 'circle', size: 200, x: '80%', y: '30%', color: 'rgba(6, 182, 212, 0.06)', blur: 40, parallaxFactor: 0.5 },
  { type: 'diamond', size: 20, x: '25%', y: '60%', color: 'rgba(16, 185, 129, 0.3)', parallaxFactor: 0.8 },
  { type: 'diamond', size: 12, x: '70%', y: '75%', color: 'rgba(6, 182, 212, 0.25)', parallaxFactor: 0.6 },
  { type: 'ring', size: 80, x: '85%', y: '60%', color: 'rgba(16, 185, 129, 0.1)', parallaxFactor: 0.4 },
  { type: 'dot', size: 6, x: '15%', y: '80%', color: 'rgba(16, 185, 129, 0.4)', parallaxFactor: 1 },
  { type: 'dot', size: 4, x: '60%', y: '15%', color: 'rgba(6, 182, 212, 0.35)', parallaxFactor: 0.9 },
  { type: 'dot', size: 5, x: '90%', y: '85%', color: 'rgba(16, 185, 129, 0.3)', parallaxFactor: 0.7 },
]

const ctaElements: ShapeConfig[] = [
  { type: 'circle', size: 250, x: '5%', y: '50%', color: 'rgba(16, 185, 129, 0.1)', blur: 50, parallaxFactor: 0.3 },
  { type: 'circle', size: 180, x: '90%', y: '30%', color: 'rgba(6, 182, 212, 0.08)', blur: 35, parallaxFactor: 0.4 },
  { type: 'diamond', size: 16, x: '20%', y: '20%', color: 'rgba(16, 185, 129, 0.25)', parallaxFactor: 0.7 },
  { type: 'ring', size: 60, x: '75%', y: '70%', color: 'rgba(6, 182, 212, 0.12)', parallaxFactor: 0.5 },
]

const minimalElements: ShapeConfig[] = [
  { type: 'dot', size: 4, x: '10%', y: '30%', color: 'rgba(16, 185, 129, 0.3)', parallaxFactor: 0.8 },
  { type: 'dot', size: 3, x: '85%', y: '60%', color: 'rgba(6, 182, 212, 0.25)', parallaxFactor: 0.6 },
  { type: 'dot', size: 5, x: '50%', y: '80%', color: 'rgba(16, 185, 129, 0.2)', parallaxFactor: 0.9 },
]

interface FloatingShapeProps extends ShapeConfig {
  mouseX: ReturnType<typeof useSpring>
  mouseY: ReturnType<typeof useSpring>
  parallaxIntensity: number
  index: number
  prefersReducedMotion: boolean | null
}

function FloatingShape({
  type,
  size,
  x,
  y,
  color,
  blur = 0,
  parallaxFactor = 0.5,
  mouseX,
  mouseY,
  parallaxIntensity,
  index,
  prefersReducedMotion,
}: FloatingShapeProps) {
  // Transform mouse position to element movement
  const moveX = useTransform(mouseX, (v) => v * parallaxFactor * parallaxIntensity * 100)
  const moveY = useTransform(mouseY, (v) => v * parallaxFactor * parallaxIntensity * 100)

  const baseStyle = {
    position: 'absolute' as const,
    left: x,
    top: y,
    width: size,
    height: size,
    x: prefersReducedMotion ? 0 : moveX,
    y: prefersReducedMotion ? 0 : moveY,
    willChange: 'transform' as const,
  }

  // Simplified animation for better performance - use CSS animation class instead of JS
  // Only animate if not reduced motion
  const floatAnimation = prefersReducedMotion ? {} : {
    y: [0, -8, 0],
    transition: {
      duration: 6 + index * 0.5, // Slower = less CPU
      repeat: Infinity,
      ease: 'easeInOut',
      delay: index * 0.5,
    },
  }

  switch (type) {
    case 'circle':
      return (
        <motion.div
          style={{
            ...baseStyle,
            borderRadius: '50%',
            background: color,
            filter: blur ? `blur(${blur}px)` : undefined,
          }}
          animate={floatAnimation}
        />
      )
    case 'diamond':
      return (
        <motion.div
          style={{
            ...baseStyle,
            background: color,
            transform: 'rotate(45deg)',
          }}
          animate={floatAnimation}
        />
      )
    case 'ring':
      return (
        <motion.div
          style={{
            ...baseStyle,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            background: 'transparent',
          }}
          animate={floatAnimation}
        />
      )
    case 'dot':
      // Dots don't need scale/opacity animation - too expensive
      return (
        <motion.div
          style={{
            ...baseStyle,
            borderRadius: '50%',
            background: color,
          }}
          animate={floatAnimation}
        />
      )
    default:
      return null
  }
}

export default FloatingElements

