'use client'

/**
 * Ask Navigation Icon
 * @module codex/ui/AskNavIcon
 * 
 * @description
 * A beautiful, animated SVG icon for the Ask feature - 
 * the standout feature of the Quarry Codex notebook.
 * 
 * Features:
 * - Morphing neural/brain animation on hover
 * - Sparkle effects on click
 * - Pulsing glow for active state
 * - Cursor transforms to pointer with custom effect
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AskNavIconProps {
  /** Whether the icon is currently active */
  isActive?: boolean
  /** Size in pixels */
  size?: number
  /** Theme */
  theme?: 'light' | 'dark'
  /** Click handler */
  onClick?: () => void
  /** Hover handler */
  onHover?: (isHovering: boolean) => void
  /** Additional class names */
  className?: string
}

/**
 * Sparkle particles that appear on click
 */
function SparkleParticles({ isVisible }: { isVisible: boolean }) {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    angle: (i * 60) * (Math.PI / 180),
    delay: i * 0.05,
  }))

  return (
    <AnimatePresence>
      {isVisible && particles.map((p) => (
        <motion.circle
          key={p.id}
          initial={{ 
            cx: 16, 
            cy: 16, 
            r: 1,
            opacity: 1,
          }}
          animate={{ 
            cx: 16 + Math.cos(p.angle) * 14,
            cy: 16 + Math.sin(p.angle) * 14,
            r: 0,
            opacity: 0,
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: p.delay,
            ease: 'easeOut',
          }}
          fill="currentColor"
          className="text-cyan-400"
        />
      ))}
    </AnimatePresence>
  )
}

/**
 * Neural network nodes and connections
 */
function NeuralNetwork({ 
  isHovered, 
  isActive,
  isDark,
}: { 
  isHovered: boolean
  isActive: boolean 
  isDark: boolean
}) {
  // Node positions for the neural network pattern
  const nodes = [
    { id: 'center', cx: 16, cy: 16, r: isHovered ? 4 : 3 },
    { id: 'top', cx: 16, cy: 6, r: isHovered ? 2.5 : 2 },
    { id: 'topRight', cx: 24, cy: 10, r: isHovered ? 2.5 : 2 },
    { id: 'bottomRight', cx: 24, cy: 22, r: isHovered ? 2.5 : 2 },
    { id: 'bottom', cx: 16, cy: 26, r: isHovered ? 2.5 : 2 },
    { id: 'bottomLeft', cx: 8, cy: 22, r: isHovered ? 2.5 : 2 },
    { id: 'topLeft', cx: 8, cy: 10, r: isHovered ? 2.5 : 2 },
  ]
  
  // Connections from center to outer nodes
  const connections = nodes.slice(1).map(node => ({
    x1: 16,
    y1: 16,
    x2: node.cx,
    y2: node.cy,
    id: `conn-${node.id}`,
  }))

  const primaryColor = isDark 
    ? (isActive ? '#22d3ee' : '#6366f1') // cyan-400 or indigo-500
    : (isActive ? '#0891b2' : '#4f46e5') // cyan-600 or indigo-600
  
  const secondaryColor = isDark ? '#a855f7' : '#7c3aed' // purple-500 or violet-600

  return (
    <g>
      {/* Glow filter for active state */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>
      </defs>

      {/* Connections (lines) - static SVG lines, animation only on opacity */}
      {connections.map((conn, idx) => (
        <motion.line
          key={conn.id}
          x1={String(conn.x1)}
          y1={String(conn.y1)}
          x2={String(conn.x2)}
          y2={String(conn.y2)}
          stroke="url(#neuralGradient)"
          strokeWidth={isHovered ? 1.5 : 1}
          initial={{ strokeOpacity: 0.4, pathLength: 1 }}
          animate={{
            strokeOpacity: isHovered ? [0.4, 0.9, 0.4] : 0.4,
            pathLength: isHovered ? [0.8, 1, 0.8] : 1,
          }}
          transition={{
            duration: 1.5,
            delay: idx * 0.1,
            repeat: isHovered ? Infinity : 0,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Nodes (circles) */}
      {nodes.map((node, idx) => {
        const nodeRadius = node.r ?? 3
        return (
          <motion.circle
            key={node.id}
            cx={node.cx}
            cy={node.cy}
            r={nodeRadius}
            fill={node.id === 'center' ? 'url(#neuralGradient)' : primaryColor}
            filter={isActive && node.id === 'center' ? 'url(#glow)' : undefined}
            initial={{ r: nodeRadius, opacity: node.id === 'center' ? 1 : 0.8 }}
            animate={
              isHovered
                ? {
                    r: [nodeRadius, nodeRadius + 0.5, nodeRadius],
                    opacity: [0.7, 1, 0.7],
                  }
                : {
                    r: nodeRadius,
                    opacity: node.id === 'center' ? 1 : 0.8,
                  }
            }
            transition={{
              duration: 1.2,
              delay: idx * 0.08,
              repeat: isHovered ? Infinity : 0,
              ease: 'easeInOut',
            }}
          />
        )
      })}

      {/* Data flow pulses on hover - use transform instead of cx/cy animation */}
      {isHovered && connections.map((conn, idx) => {
        const dx = conn.x2 - conn.x1
        const dy = conn.y2 - conn.y1
        return (
          <motion.circle
            key={`pulse-${conn.id}`}
            cx={conn.x1}
            cy={conn.y1}
            r={1.5}
            fill={secondaryColor}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{
              x: [0, dx],
              y: [0, dy],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.8,
              delay: idx * 0.15,
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </g>
  )
}

/**
 * Main Ask Navigation Icon Component
 */
export default function AskNavIcon({
  isActive = false,
  size = 32,
  theme = 'dark',
  onClick,
  onHover,
  className = '',
}: AskNavIconProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showSparkles, setShowSparkles] = useState(false)
  const isDark = theme === 'dark'

  const handleClick = useCallback(() => {
    setShowSparkles(true)
    setTimeout(() => setShowSparkles(false), 500)
    onClick?.()
  }, [onClick])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    onHover?.(true)
  }, [onHover])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    onHover?.(false)
  }, [onHover])

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ 
        width: size, 
        height: size,
        cursor: 'pointer',
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Background glow for active state */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: isDark 
              ? 'radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(8,145,178,0.2) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Main SVG */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={false}
        animate={{
          rotate: isHovered ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          duration: 0.5,
          ease: 'easeInOut',
        }}
      >
        <NeuralNetwork 
          isHovered={isHovered} 
          isActive={isActive}
          isDark={isDark}
        />
        <SparkleParticles isVisible={showSparkles} />
      </motion.svg>

      {/* Hover ring */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: isDark ? 'rgba(139,92,246,0.5)' : 'rgba(124,58,237,0.5)',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Compact version for use in navigation bars
 */
export function AskNavIconCompact({
  isActive = false,
  theme = 'dark',
  onClick,
  className = '',
}: Omit<AskNavIconProps, 'size'>) {
  return (
    <AskNavIcon
      size={24}
      isActive={isActive}
      theme={theme}
      onClick={onClick}
      className={className}
    />
  )
}

/**
 * Large version for featured placement
 */
export function AskNavIconLarge({
  isActive = false,
  theme = 'dark',
  onClick,
  className = '',
}: Omit<AskNavIconProps, 'size'>) {
  return (
    <AskNavIcon
      size={48}
      isActive={isActive}
      theme={theme}
      onClick={onClick}
      className={className}
    />
  )
}







