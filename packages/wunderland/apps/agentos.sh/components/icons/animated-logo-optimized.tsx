'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, memo, useId, useRef, useMemo } from 'react'
import { useTheme } from 'next-themes'

export const AnimatedAgentOSLogoOptimized = memo(function AnimatedAgentOSLogoOptimized({
  size = 120,
  className = ""
}: {
  size?: number
  className?: string
}) {
  const [isClient, setIsClient] = useState(false)
  const { resolvedTheme } = useTheme()
  const gradientId = useId().replace(/:/g, "-")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => setIsClient(true), [])

  const isDark = resolvedTheme === 'dark'

  // Elegant color palette - memoized to prevent useEffect dependency changes
  const colors = useMemo(() => isDark
    ? { primary: '#a78bfa', secondary: '#c084fc', tertiary: '#67e8f9', accent: '#f0abfc' }
    : { primary: '#7c3aed', secondary: '#a855f7', tertiary: '#06b6d4', accent: '#d946ef' }
  , [isDark])

  // Smooth organic blob animation
  useEffect(() => {
    if (!isClient || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    let time = 0

    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      time += 0.008

      const cx = size / 2
      const cy = size / 2
      const baseR = size * 0.32

      // Single smooth organic blob
      ctx.save()
      ctx.beginPath()
      
      const points = 72
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        const n1 = Math.sin(angle * 3 + time) * 0.08
        const n2 = Math.cos(angle * 2 - time * 0.7) * 0.06
        const n3 = Math.sin(angle * 5 + time * 1.2) * 0.04
        const r = baseR * (1 + n1 + n2 + n3)
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      // Soft gradient fill
      const grad = ctx.createRadialGradient(cx - size * 0.1, cy - size * 0.1, 0, cx, cy, baseR * 1.3)
      grad.addColorStop(0, colors.primary + '40')
      grad.addColorStop(0.5, colors.secondary + '25')
      grad.addColorStop(1, 'transparent')
      
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()

      // Soft inner glow
      ctx.save()
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.5)
      innerGrad.addColorStop(0, colors.primary + '30')
      innerGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = innerGrad
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationRef.current)
  }, [isClient, size, isDark, colors])

  if (!isClient) {
    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* Minimal SVG network */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id={`g-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
        </defs>

        <g opacity="0.6">
          {/* Simple connections */}
          {[[50,50,35,35],[50,50,65,35],[50,50,65,65],[50,50,35,65]].map(([x1,y1,x2,y2], i) => (
            <motion.line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={`url(#g-${gradientId})`}
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, opacity: [0.3, 0.6, 0.3] }}
              transition={{ 
                pathLength: { duration: 1, delay: i * 0.1 },
                opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
            />
          ))}
        </g>

        {/* Center node */}
        <motion.circle
          cx={50} cy={50} r={6}
          fill={`url(#g-${gradientId})`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Corner nodes */}
        {[[35,35],[65,35],[65,65],[35,65]].map(([x,y], i) => (
          <motion.circle
            key={i}
            cx={x} cy={y} r={3}
            fill={colors.tertiary}
            opacity={0.7}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
          />
        ))}
      </svg>
    </motion.div>
  )
})
