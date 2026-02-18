'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'

/**
 * AnimatedAgentOSLogo - Matches the nav SVG exactly but with animated gradients and glowing effects
 * Used in the hero section
 */
export function AnimatedAgentOSLogo({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '-')
  const gradientId = `hero-gradient-${id}`
  const glowId = `hero-glow-${id}`
  const pulseGlowId = `hero-pulse-glow-${id}`

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`relative flex items-center justify-center ${className}`}
    >
      {/* Outer glow effect */}
      <div 
        className="absolute inset-0 blur-3xl opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(139,92,246,0.2) 50%, transparent 70%)',
        }}
      />
      
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 80"
        className="relative z-10 w-[280px] h-[70px] sm:w-[360px] sm:h-[90px] md:w-[440px] md:h-[110px]"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Animated gradient for the neural network */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1">
              <animate 
                attributeName="stop-color" 
                values="#6366F1;#8B5CF6;#EC4899;#6366F1" 
                dur="4s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="50%" stopColor="#8B5CF6">
              <animate 
                attributeName="stop-color" 
                values="#8B5CF6;#EC4899;#6366F1;#8B5CF6" 
                dur="4s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="100%" stopColor="#EC4899">
              <animate 
                attributeName="stop-color" 
                values="#EC4899;#6366F1;#8B5CF6;#EC4899" 
                dur="4s" 
                repeatCount="indefinite" 
              />
            </stop>
          </linearGradient>

          {/* Glow filter for nodes */}
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Strong pulse glow filter */}
          <filter id={pulseGlowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Neural network - matching nav structure exactly but scaled for hero */}
        <g transform="translate(0, 0)">
          {/* Outer orbital rings */}
          <motion.circle 
            cx="30" cy="40" r="20" 
            fill="none" 
            stroke={`url(#${gradientId})`} 
            strokeWidth="0.5" 
            opacity="0.3"
            strokeDasharray="2 4"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: '30px 40px' }}
          />
          <motion.circle 
            cx="30" cy="40" r="26" 
            fill="none" 
            stroke={`url(#${gradientId})`} 
            strokeWidth="0.3" 
            opacity="0.2"
            strokeDasharray="1 6"
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: '30px 40px' }}
          />

          {/* Connection lines with pulse animation */}
          <line x1="30" y1="40" x2="15" y2="25" stroke={`url(#${gradientId})`} strokeWidth="1.5" opacity="0.6" filter={`url(#${glowId})`}>
            <animate attributeName="stroke-width" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
          </line>
          <line x1="30" y1="40" x2="45" y2="25" stroke={`url(#${gradientId})`} strokeWidth="1.5" opacity="0.6" filter={`url(#${glowId})`}>
            <animate attributeName="stroke-width" values="1.5;2.5;1.5" dur="2.3s" repeatCount="indefinite" />
          </line>
          <line x1="30" y1="40" x2="50" y2="45" stroke={`url(#${gradientId})`} strokeWidth="1.5" opacity="0.6" filter={`url(#${glowId})`}>
            <animate attributeName="stroke-width" values="1.5;2.5;1.5" dur="2.6s" repeatCount="indefinite" />
          </line>
          <line x1="30" y1="40" x2="30" y2="58" stroke={`url(#${gradientId})`} strokeWidth="1.5" opacity="0.6" filter={`url(#${glowId})`}>
            <animate attributeName="stroke-width" values="1.5;2.5;1.5" dur="2.1s" repeatCount="indefinite" />
          </line>
          <line x1="30" y1="40" x2="10" y2="45" stroke={`url(#${gradientId})`} strokeWidth="1.5" opacity="0.6" filter={`url(#${glowId})`}>
            <animate attributeName="stroke-width" values="1.5;2.5;1.5" dur="2.4s" repeatCount="indefinite" />
          </line>

          {/* Horizontal connection lines */}
          <line x1="15" y1="25" x2="45" y2="25" stroke="#6366F1" strokeWidth="1" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
          </line>
          <line x1="10" y1="45" x2="50" y2="45" stroke="#8B5CF6" strokeWidth="1" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3.5s" repeatCount="indefinite" />
          </line>

          {/* Center node - larger with enhanced glow */}
          <circle cx="30" cy="40" r="6" fill={`url(#${gradientId})`} filter={`url(#${pulseGlowId})`}>
            <animate attributeName="r" values="6;7.5;6" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Outer nodes with pulsing */}
          <circle cx="15" cy="25" r="4" fill="#6366F1" opacity="0.9" filter={`url(#${glowId})`}>
            <animate attributeName="r" values="4;5;4" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="45" cy="25" r="4" fill="#8B5CF6" opacity="0.9" filter={`url(#${glowId})`}>
            <animate attributeName="r" values="4;5;4" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="50" cy="45" r="4" fill="#EC4899" opacity="0.9" filter={`url(#${glowId})`}>
            <animate attributeName="r" values="4;5;4" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="30" cy="58" r="4" fill="#06B6D4" opacity="0.9" filter={`url(#${glowId})`}>
            <animate attributeName="r" values="4;5;4" dur="2.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2.3s" repeatCount="indefinite" />
          </circle>
          <circle cx="10" cy="45" r="4" fill="#6366F1" opacity="0.9" filter={`url(#${glowId})`}>
            <animate attributeName="r" values="4;5;4" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2.6s" repeatCount="indefinite" />
          </circle>

          {/* Signal pulses traveling along connections */}
          <circle r="2" fill="#FFF" filter={`url(#${pulseGlowId})`}>
            <animateMotion dur="2s" repeatCount="indefinite" path="M 30 40 L 15 25" />
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle r="2" fill="#FFF" filter={`url(#${pulseGlowId})`}>
            <animateMotion dur="2.3s" repeatCount="indefinite" path="M 30 40 L 45 25" />
            <animate attributeName="opacity" values="0;1;0" dur="2.3s" repeatCount="indefinite" />
          </circle>
          <circle r="2" fill="#FFF" filter={`url(#${pulseGlowId})`}>
            <animateMotion dur="2.6s" repeatCount="indefinite" path="M 30 40 L 50 45" />
            <animate attributeName="opacity" values="0;1;0" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle r="2" fill="#FFF" filter={`url(#${pulseGlowId})`}>
            <animateMotion dur="2.1s" repeatCount="indefinite" path="M 30 40 L 30 58" />
            <animate attributeName="opacity" values="0;1;0" dur="2.1s" repeatCount="indefinite" />
          </circle>
          <circle r="2" fill="#FFF" filter={`url(#${pulseGlowId})`}>
            <animateMotion dur="2.4s" repeatCount="indefinite" path="M 30 40 L 10 45" />
            <animate attributeName="opacity" values="0;1;0" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Text with animated gradient */}
        <defs>
          <linearGradient id={`text-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1">
              <animate attributeName="stop-color" values="#6366F1;#8B5CF6;#EC4899;#6366F1" dur="6s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#EC4899">
              <animate attributeName="stop-color" values="#EC4899;#6366F1;#8B5CF6;#EC4899" dur="6s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>

        <text
          x="70"
          y="45"
          fontFamily="var(--font-grotesk), system-ui, -apple-system, sans-serif"
          fontSize="32"
          fontWeight="700"
          fill="currentColor"
          filter={`url(#${glowId})`}
        >
          Agent<tspan fill={`url(#text-gradient-${id})`}>OS</tspan>
        </text>
      </svg>
    </motion.div>
  )
}
