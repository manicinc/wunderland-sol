'use client'

import { motion } from 'framer-motion'

interface CodexBookIconProps {
  className?: string
  isOpen?: boolean
}

export default function CodexBookIcon({ className = '', isOpen = false }: CodexBookIconProps) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 120 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ rotate: 0 }}
      animate={{ 
        rotate: isOpen ? [0, -5, 0] : 0,
      }}
      transition={{ 
        duration: 2,
        repeat: isOpen ? Infinity : 0,
        repeatType: 'reverse',
        ease: 'easeInOut'
      }}
    >
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#22C55E" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.85" />
        </linearGradient>
        
        <linearGradient id="bookSpine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#065F46" />
        </linearGradient>
        
        <linearGradient id="pageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEFEFE" />
          <stop offset="100%" stopColor="#F3F4F6" />
        </linearGradient>
        
        <radialGradient id="glossEffect" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        
        <filter id="glassMorphism" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
          <feComposite in="SourceGraphic" operator="over" />
        </filter>
        
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feFlood floodColor="#000000" floodOpacity="0.15"/>
          <feComposite in2="offsetblur" operator="in"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Book Shadow */}
      <ellipse 
        cx="60" 
        cy="155" 
        rx="45" 
        ry="5" 
        fill="black" 
        opacity="0.2" 
        filter="blur(8px)"
      />

      {/* Main Book Group */}
      <motion.g
        initial={{ scale: 1 }}
        animate={{ 
          scale: isOpen ? [1, 1.02, 1] : 1,
        }}
        transition={{
          duration: 3,
          repeat: isOpen ? Infinity : 0,
          repeatType: 'reverse',
          ease: 'easeInOut'
        }}
      >
        {/* Book Back Cover (slightly offset for 3D effect) */}
        <rect
          x="22"
          y="12"
          width="76"
          height="136"
          rx="4"
          fill="#047857"
          opacity="0.8"
        />

        {/* Book Spine */}
        <rect
          x="20"
          y="10"
          width="12"
          height="140"
          rx="2"
          fill="url(#bookSpine)"
          filter="url(#shadow)"
        />

        {/* Pages (thick edge effect) */}
        <g>
          {[...Array(5)].map((_, i) => (
            <motion.rect
              key={i}
              x={32 + i * 0.5}
              y={12 + i * 0.3}
              width={66 - i * 0.5}
              height={136 - i * 0.3}
              rx="2"
              fill="url(#pageGradient)"
              opacity={0.9 - i * 0.1}
              initial={{ x: 32 + i * 0.5 }}
              animate={isOpen ? { 
                x: [32 + i * 0.5, 34 + i * 0.8, 32 + i * 0.5] 
              } : {}}
              transition={{
                duration: 2.5,
                repeat: isOpen ? Infinity : 0,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: i * 0.1
              }}
            />
          ))}
        </g>

        {/* Book Front Cover */}
        <motion.rect
          x="20"
          y="10"
          width="80"
          height="140"
          rx="4"
          fill="url(#bookCover)"
          filter="url(#shadow)"
          initial={{ rotateY: 0 }}
          animate={isOpen ? { 
            rotateY: [0, -8, 0] 
          } : {}}
          transition={{
            duration: 3,
            repeat: isOpen ? Infinity : 0,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
          style={{ transformOrigin: '20px center', transformStyle: 'preserve-3d' }}
        />

        {/* Gloss Effect */}
        <rect
          x="20"
          y="10"
          width="80"
          height="140"
          rx="4"
          fill="url(#glossEffect)"
          opacity="0.7"
          style={{ pointerEvents: 'none' }}
        />

        {/* Quarry Codex Text */}
        <g filter="url(#glassMorphism)">
          {/* "FRAME" text */}
          <text
            x="60"
            y="65"
            textAnchor="middle"
            fontSize="14"
            fontWeight="900"
            fill="white"
            style={{ 
              letterSpacing: '0.1em',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          >
            FRAME
          </text>
          
          {/* "CODEX" text */}
          <text
            x="60"
            y="85"
            textAnchor="middle"
            fontSize="16"
            fontWeight="300"
            fill="white"
            style={{ 
              letterSpacing: '0.2em',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          >
            CODEX
          </text>
        </g>

        {/* Decorative Elements */}
        <motion.g
          initial={{ opacity: 0.6 }}
          animate={{ 
            opacity: isOpen ? [0.6, 1, 0.6] : 0.6,
          }}
          transition={{
            duration: 2,
            repeat: isOpen ? Infinity : 0,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
        >
          {/* Top decorative line */}
          <rect
            x="35"
            y="100"
            width="50"
            height="0.5"
            fill="white"
            opacity="0.5"
          />
          
          {/* Bottom decorative line */}
          <rect
            x="35"
            y="105"
            width="50"
            height="0.5"
            fill="white"
            opacity="0.5"
          />
          
          {/* Center diamond */}
          <rect
            x="58"
            y="101"
            width="4"
            height="4"
            fill="white"
            opacity="0.8"
            transform="rotate(45 60 103)"
          />
        </motion.g>

        {/* Interactive Glow Effect */}
        <motion.rect
          x="20"
          y="10"
          width="80"
          height="140"
          rx="4"
          fill="none"
          stroke="white"
          strokeWidth="1"
          opacity="0"
          initial={{ opacity: 0 }}
          animate={isOpen ? { 
            opacity: [0, 0.3, 0] 
          } : {}}
          transition={{
            duration: 2,
            repeat: isOpen ? Infinity : 0,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
          style={{ filter: 'blur(2px)' }}
        />
      </motion.g>
    </motion.svg>
  )
}
