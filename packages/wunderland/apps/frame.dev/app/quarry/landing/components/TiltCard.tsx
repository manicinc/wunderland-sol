'use client'

import { useRef, useState, ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Maximum tilt angle in degrees */
  maxTilt?: number
  /** Perspective distance */
  perspective?: number
  /** Enable glow effect that follows cursor */
  glowEffect?: boolean
  /** Glow color (CSS color value) */
  glowColor?: string
  /** Scale on hover */
  hoverScale?: number
  /** Disable on touch devices */
  disableOnTouch?: boolean
}

/**
 * TiltCard - 3D perspective tilt effect on hover
 * Mouse position tracking with subtle glow following cursor
 */
export function TiltCard({
  children,
  className = '',
  maxTilt = 10,
  perspective = 1000,
  glowEffect = true,
  glowColor = 'rgba(16, 185, 129, 0.15)',
  hoverScale = 1.02,
  disableOnTouch = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Motion values for smooth animation
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Spring config for smooth movement
  const springConfig = { stiffness: 300, damping: 30 }
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig)
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig)

  // Glow position
  const glowX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springConfig)
  const glowY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Normalize to -0.5 to 0.5 range
    x.set((e.clientX - centerX) / rect.width)
    y.set((e.clientY - centerY) / rect.height)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    x.set(0)
    y.set(0)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  // Check for touch device
  const isTouchDevice = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  if (disableOnTouch && isTouchDevice) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: hoverScale }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="w-full h-full"
      >
        {children}

        {/* Glow effect overlay */}
        {glowEffect && isHovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-inherit"
            style={{
              background: `radial-gradient(circle at ${glowX.get()}% ${glowY.get()}%, ${glowColor}, transparent 50%)`,
              borderRadius: 'inherit',
            }}
          />
        )}
      </motion.div>
    </motion.div>
  )
}

/**
 * Simple hover lift effect without 3D tilt
 */
export function HoverLift({
  children,
  className = '',
  liftAmount = -8,
  scale = 1.02,
}: {
  children: ReactNode
  className?: string
  liftAmount?: number
  scale?: number
}) {
  return (
    <motion.div
      className={className}
      whileHover={{
        y: liftAmount,
        scale,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  )
}

export default TiltCard

