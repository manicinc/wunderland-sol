'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useInView } from 'framer-motion'

/**
 * KnowledgeFlowViz - Abstract particle flow visualization
 * Represents knowledge flowing through a connected system
 * Used in the hero section as an abstract, utilitarian visualization
 *
 * Features:
 * - Compact mode for mobile (smaller, fewer particles)
 * - Dynamic floating words/tags that drift across the canvas
 * - Words spawn from particles, connections, and randomly
 * - Varied motion patterns (drift, orbit, float)
 */

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  colorIndex: number
  alpha: number
  pulsePhase: number
  pulseSpeed: number
}

interface Connection {
  from: number
  to: number
  strength: number
}

interface DataPulse {
  fromIndex: number
  toIndex: number
  progress: number
  speed: number
}

// Floating word with dynamic movement
interface FloatingWord {
  x: number
  y: number
  vx: number
  vy: number
  word: string
  alpha: number
  targetAlpha: number
  fadeSpeed: number
  scale: number
  colorIndex: number
  rotation: number
  rotationSpeed: number
  lifetime: number
  maxLifetime: number
  type: 'drift' | 'orbit' | 'attached' | 'pulse'
  attachedTo?: number // particle index if attached
  orbitCenter?: { x: number; y: number }
  orbitRadius?: number
  orbitAngle?: number
  orbitSpeed?: number
}

// Knowledge-related words - expanded list
const KNOWLEDGE_WORDS = [
  // Core concepts
  'notes', 'tags', 'links', 'ideas', 'sync', 'learn', 'think', 'write', 'read', 'grow',
  'connect', 'discover', 'organize', 'focus', 'flow', 'insight', 'memory', 'knowledge',
  'wisdom', 'create', 'capture', 'review', 'explore', 'understand', 'remember',
  // Actions
  'search', 'find', 'save', 'share', 'edit', 'draft', 'publish', 'archive', 'export',
  // Features
  '#ai', '#offline', '#local', '#privacy', '#open', '#sync', '#markdown', '#graph',
  '#backlinks', '#search', '#tags', '#folders', '#themes', '#mobile', '#desktop',
  // Concepts
  'zettelkasten', 'PKM', 'atomic', 'evergreen', 'fleeting', 'permanent', 'index',
  'MOC', 'hub', 'cluster', 'thread', 'weave', 'fabric', 'strand', 'pattern',
]

// Quarry color palette
const COLORS = {
  light: [
    'rgba(16, 185, 129, 0.6)',   // emerald
    'rgba(20, 184, 166, 0.55)',  // teal
    'rgba(6, 182, 212, 0.5)',    // cyan
    'rgba(14, 165, 233, 0.5)',   // sky
  ],
  dark: [
    'rgba(52, 211, 153, 0.7)',   // emerald
    'rgba(45, 212, 191, 0.65)',  // teal
    'rgba(34, 211, 238, 0.6)',   // cyan
    'rgba(56, 189, 248, 0.6)',   // sky
  ],
}

const TEXT_COLORS = {
  light: [
    'rgba(16, 185, 129, 0.85)',   // emerald
    'rgba(20, 184, 166, 0.8)',    // teal
    'rgba(6, 182, 212, 0.75)',    // cyan
    'rgba(14, 165, 233, 0.75)',   // sky
  ],
  dark: [
    'rgba(52, 211, 153, 0.9)',    // emerald
    'rgba(45, 212, 191, 0.85)',   // teal
    'rgba(34, 211, 238, 0.8)',    // cyan
    'rgba(56, 189, 248, 0.8)',    // sky
  ],
}

const CONNECTION_COLORS = {
  light: 'rgba(16, 185, 129, 0.12)',
  dark: 'rgba(52, 211, 153, 0.18)',
}

const PULSE_COLORS = {
  light: 'rgba(16, 185, 129, 0.8)',
  dark: 'rgba(52, 211, 153, 0.9)',
}

interface KnowledgeFlowVizProps {
  compact?: boolean
}

export function KnowledgeFlowViz({ compact = false }: KnowledgeFlowVizProps) {
  // Adjust settings based on compact mode
  const PARTICLE_COUNT = compact ? 30 : 55
  const CONNECTION_DISTANCE = compact ? 120 : 160
  const MAX_CONNECTIONS_PER_PARTICLE = compact ? 3 : 4
  const MAX_FLOATING_WORDS = compact ? 12 : 25
  const WORD_SPAWN_INTERVAL = compact ? 800 : 600 // Slower spawn rate for more stable feel

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const connectionsRef = useRef<Connection[]>([])
  const pulsesRef = useRef<DataPulse[]>([])
  const floatingWordsRef = useRef<FloatingWord[]>([])
  const lastPulseTime = useRef<number>(0)
  const lastWordSpawn = useRef<number>(0)
  const frameCount = useRef<number>(0)
  const isInView = useInView(containerRef, { margin: '-50px' })
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })

  // Detect dark mode
  const isDarkRef = useRef(false)
  useEffect(() => {
    const checkDark = () => {
      isDarkRef.current = document.documentElement.classList.contains('dark')
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Check for reduced motion preference
  const prefersReducedMotion = useRef(false)
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Get random word
  const getRandomWord = useCallback(() => {
    return KNOWLEDGE_WORDS[Math.floor(Math.random() * KNOWLEDGE_WORDS.length)]
  }, [])

  // Spawn a floating word with dynamic properties
  const spawnFloatingWord = useCallback((
    x: number,
    y: number,
    type: FloatingWord['type'],
    attachedTo?: number
  ) => {
    const { width, height } = dimensionsRef.current
    if (width === 0 || height === 0) return

    const word: FloatingWord = {
      x,
      y,
      vx: (Math.random() - 0.5) * (compact ? 0.15 : 0.25),
      vy: (Math.random() - 0.5) * (compact ? 0.15 : 0.25) - 0.1, // Slight upward bias
      word: getRandomWord(),
      alpha: 0,
      targetAlpha: 0.7 + Math.random() * 0.3, // More stable opacity
      fadeSpeed: 0.008 + Math.random() * 0.004, // Slower fade
      scale: compact ? 0.7 + Math.random() * 0.3 : 0.8 + Math.random() * 0.4,
      colorIndex: Math.floor(Math.random() * 4),
      rotation: (Math.random() - 0.5) * 0.1, // Less rotation
      rotationSpeed: (Math.random() - 0.5) * 0.0005, // Much slower rotation
      lifetime: 0,
      maxLifetime: compact ? 400 + Math.random() * 200 : 600 + Math.random() * 300, // Much longer lifetime
      type,
      attachedTo,
    }

    // Configure based on type
    if (type === 'orbit') {
      word.orbitCenter = { x, y }
      word.orbitRadius = 20 + Math.random() * 40
      word.orbitAngle = Math.random() * Math.PI * 2
      word.orbitSpeed = (Math.random() - 0.5) * 0.03
      word.x = x + Math.cos(word.orbitAngle) * word.orbitRadius
      word.y = y + Math.sin(word.orbitAngle) * word.orbitRadius
    }

    floatingWordsRef.current.push(word)
  }, [compact, getRandomWord])

  // Initialize particles
  const initParticles = useCallback((width: number, height: number) => {
    dimensionsRef.current = { width, height }
    const particles: Particle[] = []
    const velocityScale = compact ? 0.25 : 0.4
    const sizeMin = compact ? 2 : 2.5
    const sizeRange = compact ? 2.5 : 3.5

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * velocityScale,
        vy: (Math.random() - 0.5) * velocityScale,
        size: sizeMin + Math.random() * sizeRange,
        colorIndex: Math.floor(Math.random() * 4),
        alpha: 0.5 + Math.random() * 0.4,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
      })
    }
    particlesRef.current = particles

    // Spawn initial floating words spread across canvas with staggered lifetimes
    floatingWordsRef.current = []
    const initialWords = compact ? 6 : 12
    for (let i = 0; i < initialWords; i++) {
      const x = 50 + Math.random() * (width - 100)
      const y = 50 + Math.random() * (height - 100)
      const types: FloatingWord['type'][] = ['drift', 'orbit', 'drift', 'drift']
      spawnFloatingWord(x, y, types[Math.floor(Math.random() * types.length)])
      
      // Stagger initial words so they're at different points in their lifecycle
      const lastWord = floatingWordsRef.current[floatingWordsRef.current.length - 1]
      if (lastWord) {
        // Set random starting lifetime so words don't all fade in together
        lastWord.lifetime = Math.floor(Math.random() * 200) + 60 // Already past fade-in
        lastWord.alpha = lastWord.targetAlpha // Start at full alpha
      }
    }
  }, [PARTICLE_COUNT, compact, spawnFloatingWord])

  // Update connections based on particle positions
  const updateConnections = useCallback(() => {
    const particles = particlesRef.current
    const connections: Connection[] = []
    const connectionCount: number[] = new Array(particles.length).fill(0)

    for (let i = 0; i < particles.length; i++) {
      if (connectionCount[i] >= MAX_CONNECTIONS_PER_PARTICLE) continue

      for (let j = i + 1; j < particles.length; j++) {
        if (connectionCount[j] >= MAX_CONNECTIONS_PER_PARTICLE) continue

        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < CONNECTION_DISTANCE) {
          connections.push({
            from: i,
            to: j,
            strength: 1 - distance / CONNECTION_DISTANCE,
          })
          connectionCount[i]++
          connectionCount[j]++
        }
      }
    }

    connectionsRef.current = connections
  }, [CONNECTION_DISTANCE, MAX_CONNECTIONS_PER_PARTICLE])

  // Spawn words from various sources
  const spawnWords = useCallback((time: number) => {
    if (floatingWordsRef.current.length >= MAX_FLOATING_WORDS) return
    if (time - lastWordSpawn.current < WORD_SPAWN_INTERVAL) return

    const particles = particlesRef.current
    const connections = connectionsRef.current
    const { width, height } = dimensionsRef.current

    // Random spawn type
    const spawnType = Math.random()

    if (spawnType < 0.3 && particles.length > 0) {
      // Spawn from random particle
      const p = particles[Math.floor(Math.random() * particles.length)]
      const type = Math.random() < 0.3 ? 'orbit' : 'attached'
      spawnFloatingWord(p.x, p.y, type, particles.indexOf(p))
    } else if (spawnType < 0.5 && connections.length > 0) {
      // Spawn along a random connection
      const conn = connections[Math.floor(Math.random() * connections.length)]
      const p1 = particles[conn.from]
      const p2 = particles[conn.to]
      const t = 0.2 + Math.random() * 0.6
      const x = p1.x + (p2.x - p1.x) * t
      const y = p1.y + (p2.y - p1.y) * t
      spawnFloatingWord(x, y, 'pulse')
    } else {
      // Random position on canvas
      const x = 60 + Math.random() * (width - 120)
      const y = 60 + Math.random() * (height - 120)
      spawnFloatingWord(x, y, 'drift')
    }

    lastWordSpawn.current = time
  }, [MAX_FLOATING_WORDS, WORD_SPAWN_INTERVAL, spawnFloatingWord])

  // Spawn a data pulse along a random connection
  const maybeSpawnPulse = useCallback((time: number) => {
    const pulseInterval = compact ? 600 : 400
    if (time - lastPulseTime.current > pulseInterval && connectionsRef.current.length > 0) {
      if (Math.random() < 0.4) {
        const conn = connectionsRef.current[Math.floor(Math.random() * connectionsRef.current.length)]
        pulsesRef.current.push({
          fromIndex: conn.from,
          toIndex: conn.to,
          progress: 0,
          speed: 0.018 + Math.random() * 0.012,
        })
        lastPulseTime.current = time
      }
    }
  }, [compact])

  // Main animation loop
  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    frameCount.current++
    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    const isDark = isDarkRef.current
    const colors = isDark ? COLORS.dark : COLORS.light
    const textColors = isDark ? TEXT_COLORS.dark : TEXT_COLORS.light
    const connectionColor = isDark ? CONNECTION_COLORS.dark : CONNECTION_COLORS.light
    const pulseColor = isDark ? PULSE_COLORS.dark : PULSE_COLORS.light

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const particles = particlesRef.current

    // Update particles
    if (!prefersReducedMotion.current) {
      for (const p of particles) {
        // Move
        p.x += p.vx
        p.y += p.vy

        // Pulse
        p.pulsePhase += p.pulseSpeed

        // Bounce off edges with some padding
        if (p.x < 30 || p.x > width - 30) p.vx *= -1
        if (p.y < 30 || p.y > height - 30) p.vy *= -1

        // Keep in bounds
        p.x = Math.max(15, Math.min(width - 15, p.x))
        p.y = Math.max(15, Math.min(height - 15, p.y))
      }
    }

    // Update connections
    updateConnections()

    // Draw connections
    ctx.lineWidth = compact ? 0.8 : 1.2
    for (const conn of connectionsRef.current) {
      const p1 = particles[conn.from]
      const p2 = particles[conn.to]

      ctx.strokeStyle = connectionColor
      ctx.globalAlpha = conn.strength * (compact ? 0.5 : 0.7)
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Draw particles
    for (const p of particles) {
      const pulse = Math.sin(p.pulsePhase) * 0.3 + 0.7
      const size = p.size * pulse

      ctx.fillStyle = colors[p.colorIndex]
      ctx.globalAlpha = p.alpha * pulse * (compact ? 0.8 : 1)
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()

      // Glow effect
      if (!compact || Math.random() < 0.3) {
        const glowSize = compact ? size * 2 : size * 3
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize)
        gradient.addColorStop(0, colors[p.colorIndex])
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.globalAlpha = p.alpha * (compact ? 0.15 : 0.25) * pulse
        ctx.beginPath()
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    // Update and draw data pulses
    if (!prefersReducedMotion.current) {
      maybeSpawnPulse(time)
      spawnWords(time)

      const newPulses: DataPulse[] = []
      for (const pulse of pulsesRef.current) {
        pulse.progress += pulse.speed

        if (pulse.progress < 1) {
          newPulses.push(pulse)

          const p1 = particles[pulse.fromIndex]
          const p2 = particles[pulse.toIndex]
          const x = p1.x + (p2.x - p1.x) * pulse.progress
          const y = p1.y + (p2.y - p1.y) * pulse.progress

          // Draw pulse
          const pulseSize = (compact ? 3 : 4.5) + Math.sin(pulse.progress * Math.PI) * (compact ? 2 : 2.5)
          ctx.fillStyle = pulseColor
          ctx.globalAlpha = (1 - pulse.progress * 0.5) * (compact ? 0.7 : 1)
          ctx.beginPath()
          ctx.arc(x, y, pulseSize, 0, Math.PI * 2)
          ctx.fill()

          // Trail effect
          const trailLength = compact ? 4 : 6
          for (let t = 1; t <= trailLength; t++) {
            const trailProgress = Math.max(0, pulse.progress - t * 0.04)
            const tx = p1.x + (p2.x - p1.x) * trailProgress
            const ty = p1.y + (p2.y - p1.y) * trailProgress
            ctx.globalAlpha = (1 - t / trailLength) * (compact ? 0.25 : 0.35)
            ctx.beginPath()
            ctx.arc(tx, ty, pulseSize * (1 - t / trailLength), 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      pulsesRef.current = newPulses

      // Update and draw floating words
      const newWords: FloatingWord[] = []
      for (const word of floatingWordsRef.current) {
        word.lifetime++

        // Fade in/out based on lifetime - gentle transitions
        const fadeInFrames = 60 // 1 second at 60fps
        const fadeOutStart = word.maxLifetime - 80 // Start fading out earlier but slower
        
        if (word.lifetime < fadeInFrames) {
          // Smooth ease-in
          const t = word.lifetime / fadeInFrames
          word.alpha = word.targetAlpha * (t * t) // Quadratic ease-in
        } else if (word.lifetime > fadeOutStart) {
          // Smooth ease-out
          const t = (word.lifetime - fadeOutStart) / (word.maxLifetime - fadeOutStart)
          word.alpha = word.targetAlpha * (1 - t * t) // Quadratic ease-out
        } else {
          // Hold steady at target alpha
          word.alpha = word.targetAlpha
        }

        // Update position based on type
        if (word.type === 'orbit' && word.orbitCenter && word.orbitRadius !== undefined && word.orbitAngle !== undefined && word.orbitSpeed !== undefined) {
          word.orbitAngle += word.orbitSpeed
          word.x = word.orbitCenter.x + Math.cos(word.orbitAngle) * word.orbitRadius
          word.y = word.orbitCenter.y + Math.sin(word.orbitAngle) * word.orbitRadius
          // Drift the orbit center slowly
          word.orbitCenter.x += word.vx * 0.3
          word.orbitCenter.y += word.vy * 0.3
        } else if (word.type === 'attached' && word.attachedTo !== undefined) {
          const p = particles[word.attachedTo]
          if (p) {
            // Follow particle with offset
            word.x += (p.x + 15 - word.x) * 0.08
            word.y += (p.y - 10 - word.y) * 0.08
          }
        } else {
          // Drift movement
          word.x += word.vx
          word.y += word.vy
          // Add slight wave motion
          word.x += Math.sin(word.lifetime * 0.02) * 0.2
          word.y += Math.cos(word.lifetime * 0.015) * 0.15
        }

        // Update rotation
        word.rotation += word.rotationSpeed

        // Keep alive if still visible
        if (word.lifetime < word.maxLifetime && word.alpha > 0.01 &&
            word.x > -50 && word.x < width + 50 &&
            word.y > -50 && word.y < height + 50) {
          newWords.push(word)

          // Draw word
          ctx.save()
          ctx.translate(word.x, word.y)
          ctx.rotate(word.rotation)

          const fontSize = compact ? 10 + word.scale * 3 : 11 + word.scale * 4
          ctx.font = `${word.word.startsWith('#') ? 'bold ' : ''}${fontSize}px system-ui, -apple-system, sans-serif`
          ctx.fillStyle = textColors[word.colorIndex]
          ctx.globalAlpha = word.alpha
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(word.word, 0, 0)

          ctx.restore()
        }
      }
      floatingWordsRef.current = newWords
    }
    ctx.globalAlpha = 1

    // Continue animation if in view
    if (isInView) {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [isInView, updateConnections, maybeSpawnPulse, spawnWords, compact])

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }

      initParticles(rect.width, rect.height)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [initParticles])

  // Start/stop animation based on visibility
  useEffect(() => {
    if (isInView && !prefersReducedMotion.current) {
      animationRef.current = requestAnimationFrame(animate)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isInView, animate])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${compact ? 'min-h-[200px]' : 'min-h-[400px]'}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}
