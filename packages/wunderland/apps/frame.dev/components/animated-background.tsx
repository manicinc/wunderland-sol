'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'

// Pre-generate particle data to avoid hydration mismatches
// Values are deterministic based on index for consistent SSR/client rendering
function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    // Use seeded random-like values based on index for consistency
    const seed = (i + 1) * 0.1
    return {
      id: i,
      r: 1 + (seed % 2), // radius between 1-3
      x: ((i * 37) % 100), // distribute across width
      y: ((i * 53) % 100), // distribute across height
      opacity: 0.2 + ((i * 17) % 50) / 100, // 0.2-0.7
      duration: 10 + ((i * 23) % 20), // 10-30 seconds
      targetY: -((i * 31) % 100), // animation target
    }
  })
}

const PARTICLES = generateParticles(20)

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-obsidian-950">
      {/* Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian-950 via-obsidian-900 to-obsidian-950 opacity-80" />

      {/* Animated Orbs/Glows */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-frame-green blur-[120px] opacity-20 mix-blend-screen"
      />

      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -50, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-600 blur-[120px] opacity-20 mix-blend-screen"
      />

       <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5
        }}
        className="absolute top-[20%] left-[50%] transform -translate-x-1/2 w-[60vw] h-[60vw] rounded-full bg-purple-900 blur-[150px] opacity-10 mix-blend-screen"
      />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                           linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
        }}
      />

      {/* Floating Particles (SVG) */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {PARTICLES.map((particle) => (
          <motion.circle
            key={particle.id}
            r={particle.r}
            fill="#fff"
            filter="url(#glow)"
            initial={{
              x: `${particle.x}%`,
              y: `${particle.y}%`,
              opacity: particle.opacity,
            }}
            animate={{
              y: [null, `${particle.targetY}%`],
              opacity: [null, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  )
}


