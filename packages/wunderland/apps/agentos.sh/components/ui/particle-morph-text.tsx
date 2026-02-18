
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface ParticleMorphProps {
  text: string
  className?: string
  fontSize?: number
  particleCount?: number
  animationDuration?: number
}

type Particle = {
  x: number
  y: number
  tx: number
  ty: number
  size: number
  color: string
  delay: number
}

export default function ParticleMorphText({
  text,
  className = '',
  fontSize = 60,
  particleCount = 140,
  animationDuration = 0.8,
}: ParticleMorphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>()
  const startTimeRef = useRef<number>(0)
  const showTimeoutRef = useRef<number | null>(null)
  const settledRef = useRef(false)
  const [isTextVisible, setIsTextVisible] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return () => undefined

    // Reset visibility state for new text
    setIsTextVisible(false)
    settledRef.current = false
    if (showTimeoutRef.current) {
      window.clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }

    ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    const measured = ctx.measureText(text)
    const width = Math.ceil(measured.width) + 32
    const height = Math.ceil(fontSize * 1.6)

    canvas.width = width
    canvas.height = height

    ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    ctx.fillStyle = '#fff'
    ctx.fillText(text, width / 2, height / 2)

    const { data } = ctx.getImageData(0, 0, width, height)
    const targets: Array<[number, number]> = []

    const sampling = Math.max(2, Math.floor(fontSize / 24))
    for (let y = 0; y < height; y += sampling) {
      for (let x = 0; x < width; x += sampling) {
        const alpha = data[(y * width + x) * 4 + 3]
        if (alpha > 160) targets.push([x, y])
      }
    }

    if (!targets.length) {
      setIsTextVisible(true)
      return () => undefined
    }

    setDimensions({ width, height })

    const colors = [
      'var(--color-accent-primary)',
      'var(--color-accent-secondary)',
      'var(--color-accent-tertiary)',
    ]

    const particles: Particle[] = []
    const totalParticles = Math.min(particleCount, targets.length)
    for (let i = 0; i < totalParticles; i++) {
      const target = targets[Math.floor((i / totalParticles) * targets.length)]
      const angle = Math.random() * Math.PI * 2
      const distance = width * 0.6 + Math.random() * width * 0.4
      particles.push({
        x: target[0] + Math.cos(angle) * distance,
        y: target[1] + Math.sin(angle) * distance,
        tx: target[0],
        ty: target[1],
        size: 3 + Math.random() * 4,
        color: colors[i % colors.length],
        delay: Math.random() * 90,
      })
    }

    particlesRef.current = particles

    const canvasEl = canvasRef.current
    if (!canvasEl) return () => undefined

    const dpr = window.devicePixelRatio || 1
    canvasEl.width = width * dpr
    canvasEl.height = height * dpr
    canvasEl.style.width = `${width}px`
    canvasEl.style.height = `${height}px`

    const renderCtx = canvasEl.getContext('2d')
    if (!renderCtx) return () => undefined
    renderCtx.scale(dpr, dpr)

    startTimeRef.current = performance.now()

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current
      renderCtx.clearRect(0, 0, width, height)

      renderCtx.save()
      renderCtx.filter = 'blur(2px) contrast(12)'
      let completed = 0

      particlesRef.current.forEach((particle) => {
        if (elapsed < particle.delay) return

        const progress = Math.min(
          (elapsed - particle.delay) / (animationDuration * 1000),
          1,
        )
        const ease = 1 - Math.pow(1 - progress, 3)

        particle.x += (particle.tx - particle.x) * (0.18 * ease + 0.02)
        particle.y += (particle.ty - particle.y) * (0.18 * ease + 0.02)

        const distance = Math.hypot(particle.tx - particle.x, particle.ty - particle.y)
        if (distance < 1.4) completed += 1

        const gradient = renderCtx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size,
        )
        gradient.addColorStop(0, particle.color)
        gradient.addColorStop(1, 'transparent')

        renderCtx.globalAlpha = 0.8
        renderCtx.fillStyle = gradient
        renderCtx.beginPath()
        renderCtx.arc(particle.x, particle.y, particle.size * (1.1 - ease * 0.2), 0, Math.PI * 2)
        renderCtx.fill()
      })

      renderCtx.restore()

      const completionRatio = completed / particlesRef.current.length
      if (!settledRef.current && completionRatio > 0.8) {
        settledRef.current = true
        showTimeoutRef.current = window.setTimeout(() => {
          setIsTextVisible(true)
        }, 120)
      }

      if (elapsed < animationDuration * 1400) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (showTimeoutRef.current) {
        window.clearTimeout(showTimeoutRef.current)
        showTimeoutRef.current = null
      }
    }
  }, [text, fontSize, particleCount, animationDuration])

  return (
    <span
      className="relative inline-flex items-center justify-start align-middle"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <motion.span
        className={`relative inline-block ${className}`}
        initial={{ opacity: 0, filter: 'blur(14px)' }}
        animate={{ opacity: isTextVisible ? 1 : 0, filter: isTextVisible ? 'blur(0px)' : 'blur(14px)' }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        {text}
      </motion.span>
    </span>
  )
}
