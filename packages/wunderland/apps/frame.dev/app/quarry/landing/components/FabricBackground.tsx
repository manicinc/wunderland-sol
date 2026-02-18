'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState, useMemo, lazy, Suspense } from 'react'

/**
 * FabricBackground - Dynamic organic weave patterns
 * Creates an immersive fabric-like background with flowing strands,
 * floating nodes, and subtle depth
 * 
 * Performance optimizations:
 * - Respects prefers-reduced-motion (uses static CSS gradients)
 * - Lazy-loads particles after LCP
 * - Reduces animation complexity
 * - Uses will-change for GPU acceleration
 */

interface FabricBackgroundProps {
  variant?: 'hero' | 'flowing' | 'woven' | 'spiral' | 'vertical' | 'minimal'
  opacity?: number
  animated?: boolean
  intensity?: 'subtle' | 'medium' | 'strong'
  /** Defer heavy animations until after LCP */
  defer?: boolean
}

export function FabricBackground({
  variant = 'hero',
  opacity = 0.06,
  animated = true,
  intensity = 'medium',
  defer = false,
}: FabricBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()
  const [showParticles, setShowParticles] = useState(false)
  
  // Defer particle loading for LCP optimization
  useEffect(() => {
    if (!animated || prefersReducedMotion || defer) {
      // Delay heavy animations
      const timer = setTimeout(() => setShowParticles(true), 2000)
      return () => clearTimeout(timer)
    }
    setShowParticles(true)
  }, [animated, prefersReducedMotion, defer])

  // Disable animations entirely for reduced motion
  const shouldAnimate = animated && !prefersReducedMotion

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Layered gradient background with depth - CSS only, always renders */}
      <div className="absolute inset-0">
        {/* Primary gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-white dark:from-gray-950 dark:via-gray-900/50 dark:to-gray-950" />
        
        {/* Radial glow accents - static, performant */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-500/[0.03] via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-cyan-500/[0.02] via-transparent to-transparent blur-3xl" />
        
        {/* Mesh gradient overlay - static */}
        <div 
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            background: `
              radial-gradient(ellipse at 20% 30%, rgba(16, 185, 129, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 70%, rgba(6, 182, 212, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.02) 0%, transparent 70%)
            `
          }}
        />
      </div>

      {/* Strand pattern based on variant - pass reduced motion state */}
      <div className="absolute inset-0" style={{ opacity }}>
        {variant === 'hero' && <HeroWeave animated={shouldAnimate} intensity={intensity} />}
        {variant === 'flowing' && <FlowingStrands animated={shouldAnimate} />}
        {variant === 'woven' && <WovenMesh animated={shouldAnimate} />}
        {variant === 'spiral' && <SpiralStrands animated={shouldAnimate} />}
        {variant === 'vertical' && <VerticalStrands animated={shouldAnimate} />}
        {variant === 'minimal' && <MinimalDots />}
      </div>

      {/* Floating particles overlay - lazy loaded, reduced count */}
      {(variant === 'hero' || variant === 'flowing') && showParticles && shouldAnimate && (
        <FloatingParticles count={intensity === 'strong' ? 12 : intensity === 'medium' ? 8 : 5} />
      )}
    </div>
  )
}

// Hero Weave - Complex interlocking fabric pattern for hero sections
// Optimized: Reduced strand count, simplified animations
function HeroWeave({ animated, intensity }: { animated: boolean; intensity: string }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Generate organic bezier strands - REDUCED count for performance
  const strands = useMemo(() => {
    const strandCount = intensity === 'strong' ? 6 : intensity === 'medium' ? 4 : 3
    return Array.from({ length: strandCount }, (_, i) => ({
      id: i,
      startY: 100 + (i * 150) + (Math.sin(i * 1.5) * 30),
      amplitude: 25 + (i % 3) * 15,
      frequency: 0.8 + (i % 4) * 0.2,
      phase: i * 0.5,
      speed: 15 + (i % 5) * 5,
      strokeWidth: 1 + (i % 3) * 0.5,
      opacity: 0.3 + (i % 4) * 0.15,
    }))
  }, [intensity])

  // Cross-weave strands (vertical/diagonal) - REDUCED count
  const crossStrands = useMemo(() => {
    const count = intensity === 'strong' ? 4 : intensity === 'medium' ? 3 : 2
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 200 + i * 300 + (i % 2) * 50,
      angle: -5 + (i % 3) * 5,
      delay: i * 0.3,
    }))
  }, [intensity])

  if (!mounted) return null

  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 1400 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        {/* Gradient for main strands */}
        <linearGradient id="heroStrandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="20%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="80%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>

        {/* Gradient for accent strands */}
        <linearGradient id="accentStrandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
          <stop offset="50%" stopColor="rgb(16, 185, 129)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="strandGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main flowing strands */}
      <g className="text-gray-400 dark:text-gray-500">
        {strands.map((strand) => (
          <motion.path
            key={strand.id}
            d={generateOrganicCurve(strand.startY, strand.amplitude, strand.frequency, strand.phase)}
            stroke="url(#heroStrandGradient)"
            strokeWidth={strand.strokeWidth}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={animated ? {
              pathLength: 1,
              opacity: strand.opacity,
            } : { pathLength: 1, opacity: strand.opacity }}
            transition={{
              pathLength: { duration: 2.5, delay: strand.id * 0.15, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 1, delay: strand.id * 0.15 },
            }}
          />
        ))}
      </g>

      {/* Accent strands with emerald glow */}
      <g filter="url(#strandGlow)">
        {[180, 420, 680].map((y, i) => (
          <motion.path
            key={`accent-${i}`}
            d={generateOrganicCurve(y, 35, 0.6, i * 2)}
            stroke="url(#accentStrandGradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={animated ? {
              pathLength: 1,
              opacity: 0.6,
            } : { pathLength: 1, opacity: 0.6 }}
            transition={{
              pathLength: { duration: 3, delay: 1 + i * 0.3, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 1.5, delay: 1 + i * 0.3 },
            }}
          />
        ))}
      </g>

      {/* Cross-weave diagonal strands */}
      <g className="text-gray-300 dark:text-gray-700">
        {crossStrands.map((strand) => (
          <motion.line
            key={`cross-${strand.id}`}
            x1={strand.x}
            y1="-50"
            x2={strand.x + strand.angle * 10}
            y2="950"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="12 24 8 16"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={animated ? {
              opacity: 0.4,
              pathLength: 1,
            } : { opacity: 0.4 }}
            transition={{
              opacity: { duration: 1.5, delay: strand.delay + 0.5 },
              pathLength: { duration: 2, delay: strand.delay + 0.5 },
            }}
          />
        ))}
      </g>

      {/* Intersection nodes - where strands cross - REDUCED to 4 nodes */}
      <g>
        {[
          { cx: 280, cy: 220 }, { cx: 700, cy: 350 },
          { cx: 450, cy: 550 }, { cx: 950, cy: 450 },
        ].map((node, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={node.cx}
            cy={node.cy}
            r="3"
            className="fill-emerald-500/30 dark:fill-emerald-400/20"
            initial={{ scale: 0, opacity: 0 }}
            animate={animated ? {
              scale: 1,
              opacity: 0.4,
            } : { scale: 1, opacity: 0.3 }}
            transition={{ duration: 1, delay: i * 0.2 }}
          />
        ))}
      </g>

      {/* Subtle connection lines between nodes */}
      <g className="text-emerald-500/10 dark:text-emerald-400/10">
        <motion.path
          d="M280 220 Q400 300 520 380"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 2 }}
        />
        <motion.path
          d="M520 380 Q650 330 780 280"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 2.3 }}
        />
        <motion.path
          d="M780 280 Q850 400 920 480"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 2.6 }}
        />
      </g>
    </svg>
  )
}

// Generate organic bezier curve path
function generateOrganicCurve(baseY: number, amplitude: number, frequency: number, phase: number): string {
  const points: string[] = []
  const width = 1500
  const segments = 8

  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width - 50
    const y = baseY + Math.sin((i * frequency) + phase) * amplitude + Math.cos((i * frequency * 0.5) + phase) * (amplitude * 0.3)
    
    if (i === 0) {
      points.push(`M${x} ${y}`)
    } else {
      const prevX = ((i - 1) / segments) * width - 50
      const prevY = baseY + Math.sin(((i - 1) * frequency) + phase) * amplitude + Math.cos(((i - 1) * frequency * 0.5) + phase) * (amplitude * 0.3)
      const cpX1 = prevX + (x - prevX) * 0.5
      const cpY1 = prevY + (Math.random() - 0.5) * 10
      const cpX2 = prevX + (x - prevX) * 0.5
      const cpY2 = y + (Math.random() - 0.5) * 10
      points.push(`C${cpX1} ${cpY1} ${cpX2} ${cpY2} ${x} ${y}`)
    }
  }

  return points.join(' ')
}

// Floating particles - OPTIMIZED: fewer particles, simpler animation
function FloatingParticles({ count }: { count: number }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Use deterministic positions for SSR compatibility
  const particles = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (i * 17 + 10) % 90, // Spread evenly
      y: (i * 23 + 15) % 85,
      size: 2 + (i % 3),
      duration: 20 + (i % 4) * 5, // Slower = less CPU
    })), [count]
  )

  if (!mounted) return null

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-emerald-500/20 dark:bg-emerald-400/15"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            willChange: 'transform',
          }}
          animate={{
            y: [0, -20, 0], // Simpler animation
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// Flowing horizontal strands - for other sections
function FlowingStrands({ animated }: { animated: boolean }) {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <linearGradient id="strandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Multiple flowing strands at different positions */}
      {[
        { y: 100, delay: 0, duration: 20 },
        { y: 200, delay: 2, duration: 25 },
        { y: 320, delay: 1, duration: 22 },
        { y: 450, delay: 3, duration: 28 },
        { y: 550, delay: 0.5, duration: 24 },
        { y: 650, delay: 2.5, duration: 26 },
        { y: 750, delay: 1.5, duration: 21 },
      ].map((strand, i) => (
        <motion.path
          key={i}
          d={`M-100 ${strand.y} Q300 ${strand.y + 30} 600 ${strand.y} T1300 ${strand.y - 20}`}
          stroke="url(#strandGradient)"
          strokeWidth="1.5"
          className="text-gray-400 dark:text-gray-600"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={animated ? {
            pathLength: 1,
            opacity: 1,
            x: [0, 100, 0],
          } : { pathLength: 1, opacity: 1 }}
          transition={animated ? {
            pathLength: { duration: 2, delay: strand.delay * 0.3 },
            opacity: { duration: 1, delay: strand.delay * 0.3 },
            x: { duration: strand.duration, repeat: Infinity, ease: "linear" }
          } : {
            duration: 2,
            delay: strand.delay * 0.3
          }}
        />
      ))}

      {/* Subtle connecting fibers */}
      {[150, 380, 600].map((x, i) => (
        <motion.line
          key={`fiber-${i}`}
          x1={x}
          y1="0"
          x2={x + 50}
          y2="800"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="4 8"
          className="text-gray-300 dark:text-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 2, delay: i * 0.5 }}
        />
      ))}
    </svg>
  )
}

// Woven mesh pattern - for feature sections
function WovenMesh({ animated }: { animated: boolean }) {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="wovenPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          {/* Horizontal weave */}
          <motion.path
            d="M0 5 Q5 3 10 5 T20 5"
            stroke="currentColor"
            strokeWidth="0.3"
            fill="none"
            className="text-gray-400 dark:text-gray-600"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
          />
          <motion.path
            d="M0 15 Q5 17 10 15 T20 15"
            stroke="currentColor"
            strokeWidth="0.3"
            fill="none"
            className="text-gray-400 dark:text-gray-600"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.2 }}
          />
          {/* Vertical weave */}
          <motion.path
            d="M5 0 Q3 5 5 10 T5 20"
            stroke="currentColor"
            strokeWidth="0.3"
            fill="none"
            className="text-gray-300 dark:text-gray-700"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.4 }}
          />
          <motion.path
            d="M15 0 Q17 5 15 10 T15 20"
            stroke="currentColor"
            strokeWidth="0.3"
            fill="none"
            className="text-gray-300 dark:text-gray-700"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.6 }}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wovenPattern)" />
    </svg>
  )
}

// Spiral concentric strands - for learning sections
function SpiralStrands({ animated }: { animated: boolean }) {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
    >
      <g transform="translate(400, 300)">
        {/* Concentric spiral rings */}
        {[1, 2, 3, 4, 5].map((ring, i) => (
          <motion.circle
            key={i}
            r={ring * 80}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray={`${ring * 20} ${ring * 40}`}
            className="text-gray-400 dark:text-gray-600"
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={animated ? {
              scale: 1,
              opacity: 0.6,
              rotate: ring % 2 === 0 ? 360 : -360
            } : { scale: 1, opacity: 0.6 }}
            transition={animated ? {
              scale: { duration: 1, delay: i * 0.2 },
              opacity: { duration: 0.5, delay: i * 0.2 },
              rotate: { duration: 60 + ring * 10, repeat: Infinity, ease: "linear" }
            } : {
              duration: 1,
              delay: i * 0.2
            }}
          />
        ))}

        {/* Spiral path */}
        <motion.path
          d="M0 0 Q40 -20 80 0 T160 0 Q200 20 240 0 T320 0"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          className="text-gray-500 dark:text-gray-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, delay: 1 }}
        />
      </g>
    </svg>
  )
}

// Vertical strands - for pricing/structure sections
function VerticalStrands({ animated }: { animated: boolean }) {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 400 600"
      preserveAspectRatio="none"
    >
      {[40, 100, 160, 220, 280, 340].map((x, i) => (
        <motion.line
          key={i}
          x1={x}
          y1="-50"
          x2={x + (i % 2 === 0 ? 10 : -10)}
          y2="650"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8 16"
          className="text-gray-300 dark:text-gray-700"
          initial={{ opacity: 0, y: -20 }}
          animate={animated ? {
            opacity: 0.5,
            y: [0, 10, 0]
          } : { opacity: 0.5 }}
          transition={animated ? {
            opacity: { duration: 0.8, delay: i * 0.1 },
            y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" }
          } : {
            duration: 0.8,
            delay: i * 0.1
          }}
        />
      ))}
    </svg>
  )
}

// Minimal dot pattern - fallback
function MinimalDots() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }}
    />
  )
}

export default FabricBackground
