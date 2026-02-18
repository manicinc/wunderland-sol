'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  pulsePhase: number
  connectionStrength: number
  layer: number
}

interface Connection {
  from: number
  to: number
  strength: number
  pulseOffset: number
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const connectionsRef = useRef<Connection[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const isVisibleRef = useRef(true)
  const prefersReducedMotion = useRef(false)
  const { theme: currentTheme, resolvedTheme } = useTheme()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const themeMap = useMemo(
    () => ({
      'sakura-sunset': ['#FFB6C1', '#FF69B4', '#FF1493', '#FFC0CB'],
      'twilight-neo': ['#00FFFF', '#8A2BE2', '#00BFFF', '#9370DB'],
      'aurora-daybreak': ['#FF0096', '#64C8FF', '#FF64C8', '#9664FF'],
      'warm-embrace': ['#FFD700', '#FF8C00', '#FFA500', '#FFC107'],
      'retro-terminus': ['#00FF00', '#32CD32', '#00FF00', '#7CFC00']
    }),
    []
  )

  const getThemeColors = useCallback(
    () => themeMap[currentTheme as keyof typeof themeMap] || themeMap['aurora-daybreak'],
    [currentTheme, themeMap]
  )

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mediaQuery.matches
    
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // IntersectionObserver to pause animation when not visible
  useEffect(() => {
    if (!canvasRef.current) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
      },
      { threshold: 0 }
    )
    
    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    canvas.width = dimensions.width
    canvas.height = dimensions.height

    const colors = getThemeColors()
    const isDark = resolvedTheme === 'dark'

    // Skip animation entirely if user prefers reduced motion
    if (prefersReducedMotion.current) {
      return
    }

    // Initialize particles with layers for depth - OPTIMIZED COUNT for performance
    const particleCount = window.matchMedia('(max-width: 640px)').matches ? 30 : 80
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.1 + Math.random() * 0.5, // Falling effect
      radius: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulsePhase: Math.random() * Math.PI * 2,
      connectionStrength: 0.3 + Math.random() * 0.7,
      layer: Math.floor(Math.random() * 3) // 0: back, 1: middle, 2: front
    }))

    // Create intelligent connections
    const updateConnections = () => {
      connectionsRef.current = []
      const maxDistance = 150 // Reduced max distance for denser look

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x
          const dy = particlesRef.current[i].y - particlesRef.current[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            connectionsRef.current.push({
              from: i,
              to: j,
              strength: 1 - (distance / maxDistance),
              pulseOffset: Math.random() * Math.PI * 2
            })
          }
        }
      }
    }

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    let frame = 0
    const animate = () => {
      // Skip frame if not visible (performance optimization)
      if (!isVisibleRef.current) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      ctx.clearRect(0, 0, dimensions.width, dimensions.height)

      // Apply high-fidelity gradient background
      const gradient = ctx.createRadialGradient(
        dimensions.width / 2,
        dimensions.height / 2,
        0,
        dimensions.width / 2,
        dimensions.height / 2,
        dimensions.width / 2
      )

      if (isDark) {
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.02)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)')
      } else {
        // Enhanced gradient for light mode with subtle color tints
        gradient.addColorStop(0, 'rgba(250, 250, 255, 0.1)')
        gradient.addColorStop(0.5, 'rgba(245, 245, 255, 0.15)')
        gradient.addColorStop(1, 'rgba(240, 240, 255, 0.2)')
      }

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)

      frame++
      const time = frame * 0.01

      // Update and render particles by layer
      for (let layer = 0; layer < 3; layer++) {
        const layerParticles = particlesRef.current.filter(p => p.layer === layer)

        layerParticles.forEach((particle, i) => {
          // Update particle position with purposeful movement
          particle.x += particle.vx * (1 + layer * 0.3) // Front layers move faster
          particle.y += particle.vy * (1 + layer * 0.3)

          // Add organic floating motion
          particle.x += Math.sin(time + i) * 0.2
          particle.y += Math.cos(time + i * 0.7) * 0.2

          // Mouse interaction - particles attracted/repelled
          const mouseDistance = Math.sqrt(
            Math.pow(particle.x - mouseRef.current.x, 2) +
            Math.pow(particle.y - mouseRef.current.y, 2)
          )

          if (mouseDistance < 150) {
            const angle = Math.atan2(
              particle.y - mouseRef.current.y,
              particle.x - mouseRef.current.x
            )
            const force = (150 - mouseDistance) / 150
            particle.x += Math.cos(angle) * force * 2
            particle.y += Math.sin(angle) * force * 2
          }

          // Boundary collision with wrap-around for matrix feel
          if (particle.x < 0) particle.x = dimensions.width
          if (particle.x > dimensions.width) particle.x = 0
          if (particle.y > dimensions.height) particle.y = 0 // Wrap to top

          // Update pulse phase
          particle.pulsePhase += 0.02

          // Render particle with depth effect - enhanced for light mode
          const pulseSize = 1 + Math.sin(particle.pulsePhase) * 0.3
          const baseOpacity = isDark ? 0.2 : 0.35 // Higher base opacity for light mode
          const opacity = baseOpacity + layer * 0.1 + Math.sin(particle.pulsePhase) * 0.1

          // Outer glow
          const glowGradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.radius * pulseSize * 4
          )
          glowGradient.addColorStop(0, particle.color + '40')
          glowGradient.addColorStop(0.5, particle.color + '20')
          glowGradient.addColorStop(1, particle.color + '00')

          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.radius * pulseSize * 4, 0, Math.PI * 2)
          ctx.fill()

          // Core particle
          ctx.fillStyle = particle.color + Math.floor(opacity * 255).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.radius * pulseSize, 0, Math.PI * 2)
          ctx.fill()
        })
      }

      // Update and render connections
      updateConnections()
      connectionsRef.current.forEach(connection => {
        const p1 = particlesRef.current[connection.from]
        const p2 = particlesRef.current[connection.to]

        // Pulsing connection - adjusted for both modes
        const pulse = Math.sin(time * 2 + connection.pulseOffset) * 0.5 + 0.5
        const baseConnectionOpacity = isDark ? 0.1 : 0.15 // Slightly higher for light mode
        const opacity = connection.strength * baseConnectionOpacity * pulse

        // Draw gradient connection
        const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
        gradient.addColorStop(0, p1.color + Math.floor(opacity * 255).toString(16).padStart(2, '0'))
        gradient.addColorStop(0.5, colors[0] + Math.floor(opacity * 255 * 0.5).toString(16).padStart(2, '0'))
        gradient.addColorStop(1, p2.color + Math.floor(opacity * 255).toString(16).padStart(2, '0'))

        ctx.strokeStyle = gradient
        ctx.lineWidth = 0.5 + pulse * 0.5
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)

        // Create curved connections for more organic feel
        const midX = (p1.x + p2.x) / 2 + Math.sin(time + connection.pulseOffset) * 20
        const midY = (p1.y + p2.y) / 2 + Math.cos(time + connection.pulseOffset) * 20
        ctx.quadraticCurveTo(midX, midY, p2.x, p2.y)
        ctx.stroke()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions, resolvedTheme, getThemeColors])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        opacity: resolvedTheme === 'dark' ? 0.6 : 0.4, // Lower opacity for light mode
        mixBlendMode: resolvedTheme === 'dark' ? 'screen' : 'multiply' // Different blend mode for light
      }}
    />
  )
}
