/**
 * Floating Sidebar Collapse Toggle
 * @module codex/ui/SidebarCollapseToggle
 * 
 * An elegant floating button that collapses/expands the sidebar
 * with beautiful animations and premium visual design
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SidebarCollapseToggleProps {
  /** Whether sidebar is currently open */
  isOpen: boolean
  /** Toggle callback */
  onToggle: () => void
  /** Which side the sidebar is on */
  side?: 'left' | 'right'
  /** Current theme */
  theme?: string
  /** Additional class names */
  className?: string
}

/**
 * Custom SVG icon for sidebar toggle - elegant chevron design
 */
function SidebarIcon({ isOpen, side, isHovered }: { isOpen: boolean; side: 'left' | 'right'; isHovered: boolean }) {
  // Determine direction based on sidebar state and side
  const shouldPointRight = side === 'left' ? !isOpen : isOpen
  
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible"
    >
      {/* Background glow on hover */}
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        fill="currentColor"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: isHovered ? 0.1 : 0,
          scale: isHovered ? 1 : 0.8
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Sidebar panel representation */}
      <motion.rect
        x="3"
        y="4"
        width="6"
        height="16"
        rx="1.5"
        fill="currentColor"
        initial={{ opacity: 0.3 }}
        animate={{ 
          opacity: isOpen ? 0.6 : 0.25,
          x: isOpen ? 0 : -1
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      />
      
      {/* Divider line - use translateX instead of animating x1/x2 to avoid SVG attribute errors */}
      <motion.line
        x1="10"
        y1="6"
        x2="10"
        y2="18"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        initial={{ opacity: 0.2, translateX: 0 }}
        animate={{ 
          opacity: isOpen ? 0.4 : 0.15,
          translateX: isOpen ? 0 : -2
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Chevron arrow - animated */}
      <motion.path
        d={shouldPointRight ? "M14 8L18 12L14 16" : "M18 8L14 12L18 16"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={false}
        animate={{ 
          x: isHovered ? (shouldPointRight ? 1 : -1) : 0,
          opacity: 1
        }}
        transition={{ 
          duration: 0.2,
          ease: "easeOut"
        }}
      />
      
      {/* Second chevron for emphasis on hover */}
      <motion.path
        d={shouldPointRight ? "M14 8L18 12L14 16" : "M18 8L14 12L18 16"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ opacity: 0, x: shouldPointRight ? -4 : 4 }}
        animate={{ 
          opacity: isHovered ? 0.4 : 0,
          x: isHovered ? (shouldPointRight ? -2 : 2) : (shouldPointRight ? -4 : 4)
        }}
        transition={{ duration: 0.2 }}
      />
    </svg>
  )
}

export default function SidebarCollapseToggle({
  isOpen,
  onToggle,
  side = 'left',
  theme = 'light',
  className = '',
}: SidebarCollapseToggleProps) {
  const isDark = theme.includes('dark')
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  
  // Position based on side
  const positionClasses = side === 'left' 
    ? 'left-0' 
    : 'right-0'
  
  return (
    <motion.button
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      animate={{ 
        opacity: 1, 
        x: 0,
        scale: isPressed ? 0.92 : isHovered ? 1.02 : 1,
      }}
      transition={{
        opacity: { duration: 0.4, ease: "easeOut" },
        x: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
        scale: { duration: 0.15, ease: "easeOut" }
      }}
      className={`
        fixed top-1/2 -translate-y-1/2 z-50
        ${positionClasses}
        w-7 h-14
        flex items-center justify-center
        cursor-pointer
        ${side === 'left' 
          ? 'rounded-r-xl border-l-0 pl-0.5' 
          : 'rounded-l-xl border-r-0 pr-0.5'
        }
        flex
        ${className}
      `}
      style={{
        background: isDark 
          ? `linear-gradient(${side === 'left' ? '90deg' : '270deg'}, 
              rgba(39, 39, 42, 0.95) 0%, 
              rgba(39, 39, 42, 0.85) 100%)`
          : `linear-gradient(${side === 'left' ? '90deg' : '270deg'}, 
              rgba(255, 255, 255, 0.98) 0%, 
              rgba(250, 250, 250, 0.92) 100%)`,
        boxShadow: isHovered 
          ? isDark
            ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 4px 20px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)'
          : isDark
            ? '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)'
            : '0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'box-shadow 0.3s ease',
      }}
      aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${side} sidebar`}
      title={`${isOpen ? 'Collapse' : 'Expand'} sidebar (s)`}
    >
      {/* Inner glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-r-xl overflow-hidden pointer-events-none"
        style={{
          borderRadius: side === 'left' ? '0 12px 12px 0' : '12px 0 0 12px',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div 
          className={`
            absolute inset-0
            ${isDark 
              ? 'bg-gradient-to-r from-zinc-700/20 to-zinc-600/10' 
              : 'bg-gradient-to-r from-zinc-200/30 to-zinc-100/20'
            }
          `}
        />
      </motion.div>
      
      {/* Icon container with rotation animation on state change */}
      <motion.div
        className={`
          relative z-10 
          ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
        `}
        animate={{ 
          color: isHovered 
            ? isDark ? '#e4e4e7' : '#27272a'
            : isDark ? '#a1a1aa' : '#71717a',
          rotate: isPressed ? (side === 'left' ? -5 : 5) : 0,
        }}
        transition={{ duration: 0.15 }}
      >
        <SidebarIcon isOpen={isOpen} side={side} isHovered={isHovered} />
      </motion.div>
      
      {/* Ripple effect on click */}
      <AnimatePresence>
        {isPressed && (
          <motion.div
            className={`
              absolute inset-0 
              ${side === 'left' ? 'rounded-r-xl' : 'rounded-l-xl'}
              ${isDark ? 'bg-white/10' : 'bg-black/5'}
            `}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 1.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      
      {/* Subtle edge highlight */}
      <div 
        className={`
          absolute ${side === 'left' ? 'right-0' : 'left-0'} top-0 bottom-0 
          w-px
          ${isDark 
            ? 'bg-gradient-to-b from-transparent via-zinc-600/30 to-transparent' 
            : 'bg-gradient-to-b from-transparent via-zinc-300/50 to-transparent'
          }
        `}
      />
    </motion.button>
  )
}
