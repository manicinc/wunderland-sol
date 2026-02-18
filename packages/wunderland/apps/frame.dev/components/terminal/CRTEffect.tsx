/**
 * CRT Effect Component - Retro monitor visual effects
 * @module terminal/CRTEffect
 * 
 * @remarks
 * Adds authentic CRT monitor effects:
 * - Scan lines
 * - Screen curvature
 * - Phosphor glow
 * - RGB separation
 * - Static noise
 * - Flicker
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'

interface CRTEffectProps {
  /** Enable scan lines */
  scanLines?: boolean
  /** Enable screen curvature */
  curvature?: boolean
  /** Enable flicker effect */
  flicker?: boolean
  /** Enable RGB separation */
  rgbSeparation?: boolean
  /** Enable static noise */
  noise?: boolean
  /** Intensity of effects (0-1) */
  intensity?: number
  /** Children to wrap */
  children: React.ReactNode
}

/**
 * CRT monitor effect wrapper
 */
export default function CRTEffect({
  scanLines = true,
  curvature = true,
  flicker = true,
  rgbSeparation = true,
  noise = true,
  intensity = 0.7,
  children,
}: CRTEffectProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isTerminal = theme?.includes('terminal')

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isTerminal) {
    return <>{children}</>
  }

  return (
    <div className="crt-wrapper relative">
      {/* Main content with effects */}
      <div 
        className="crt-content relative"
        style={{
          filter: rgbSeparation ? `
            drop-shadow(-1px 0 0 rgba(255, 0, 0, ${intensity * 0.3}))
            drop-shadow(1px 0 0 rgba(0, 255, 255, ${intensity * 0.3}))
          ` : undefined
        }}
      >
        {children}
      </div>

      {/* Scan lines overlay */}
      {scanLines && (
        <div 
          className="crt-scanlines pointer-events-none fixed inset-0 z-[9998]"
          style={{
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              transparent 48%,
              rgba(0, 0, 0, ${intensity * 0.1}) 50%,
              transparent 52%,
              transparent 100%
            )`,
            backgroundSize: '100% 4px',
            animation: 'scan-lines 8s linear infinite',
          }}
        />
      )}

      {/* Screen curvature effect */}
      {curvature && (
        <div 
          className="crt-curvature pointer-events-none fixed inset-0 z-[9997]"
          style={{
            boxShadow: `
              inset 0 0 120px rgba(0, 0, 0, ${intensity * 0.3}),
              inset 0 0 40px rgba(0, 0, 0, ${intensity * 0.2})
            `,
            borderRadius: '2%',
          }}
        />
      )}

      {/* Flicker effect */}
      {flicker && (
        <motion.div 
          className="crt-flicker pointer-events-none fixed inset-0 z-[9996]"
          animate={{
            opacity: [0, intensity * 0.03, 0, intensity * 0.01, 0],
          }}
          transition={{
            duration: 0.15,
            repeat: Infinity,
            repeatDelay: Math.random() * 5,
          }}
          style={{
            backgroundColor: theme === 'terminal-light' ? '#ffb000' : '#00ff00',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Static noise */}
      {noise && <NoiseOverlay intensity={intensity} />}

      {/* Phosphor glow border */}
      <div 
        className="crt-glow pointer-events-none fixed inset-0 z-[9995]"
        style={{
          boxShadow: `
            0 0 100px ${theme === 'terminal-light' ? '#ffb00040' : '#00ff0040'},
            inset 0 0 60px ${theme === 'terminal-light' ? '#ffb00020' : '#00ff0020'}
          `,
        }}
      />

      <style jsx global>{`
        @keyframes scan-lines {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }

        /* Add slight screen warp for curvature */
        .crt-wrapper {
          perspective: 1000px;
        }

        /* Terminal cursor blink globally */
        @keyframes terminal-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .terminal-cursor {
          animation: terminal-blink 1s step-end infinite;
        }

        /* Phosphor text glow */
        .terminal-light .terminal-text,
        .terminal-dark .terminal-text {
          text-shadow: 
            0 0 2px currentColor,
            0 0 5px currentColor,
            0 0 10px currentColor;
        }

        /* Make text slightly blurry like old CRTs */
        .terminal-light body,
        .terminal-dark body {
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: none;
          -moz-osx-font-smoothing: unset;
        }
      `}</style>
    </div>
  )
}

/**
 * Animated static noise overlay
 */
function NoiseOverlay({ intensity }: { intensity: number }) {
  const [noiseData, setNoiseData] = useState('')

  useEffect(() => {
    // Generate random noise pattern
    const generateNoise = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''

      canvas.width = 100
      canvas.height = 100

      const imageData = ctx.createImageData(100, 100)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255
        data[i] = value     // red
        data[i + 1] = value // green
        data[i + 2] = value // blue
        data[i + 3] = Math.random() * 255 * intensity * 0.05 // alpha
      }

      ctx.putImageData(imageData, 0, 0)
      return canvas.toDataURL()
    }

    const updateNoise = () => {
      setNoiseData(generateNoise())
    }

    updateNoise()
    const interval = setInterval(updateNoise, 100)

    return () => clearInterval(interval)
  }, [intensity])

  return (
    <div 
      className="crt-noise pointer-events-none fixed inset-0 z-[9994]"
      style={{
        backgroundImage: `url(${noiseData})`,
        backgroundRepeat: 'repeat',
        opacity: intensity * 0.05,
        mixBlendMode: 'multiply',
      }}
    />
  )
}

/**
 * Terminal boot sequence animation
 */
export function TerminalBootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([])
  const { theme } = useTheme()

  useEffect(() => {
    const bootMessages = [
      'FRAME CODEX BIOS v4.1.0',
      'Copyright (C) 2024 Framers AI',
      '',
      'CPU: Neural Core i9-9900K @ 5.0GHz',
      'Memory Test: 32768MB OK',
      '',
      'Detecting primary knowledge drive...',
      'Knowledge Graph initialized',
      'Loading strands... Done',
      '',
      'Starting Frame OS...',
      '[  OK  ] Started Knowledge Indexing Service',
      '[  OK  ] Started Semantic Analysis Engine',
      '[  OK  ] Started Graph Traversal System',
      '[  OK  ] Mounted /codex filesystem',
      '',
      'Quarry Codex Ready.',
      ''
    ]

    let currentLine = 0
    const interval = setInterval(() => {
      if (currentLine < bootMessages.length) {
        setLines(prev => [...prev, bootMessages[currentLine]])
        currentLine++
      } else {
        clearInterval(interval)
        setTimeout(onComplete, 500)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className={`
      fixed inset-0 z-[10000] 
      ${theme === 'terminal-light' ? 'bg-black text-amber-500' : 'bg-black text-green-500'}
      font-mono p-8 overflow-hidden
    `}>
      {lines.map((line, i) => (
        <div key={i} className="leading-relaxed">
          {line}
        </div>
      ))}
      <span className="terminal-cursor inline-block w-2 h-4 bg-current" />
    </div>
  )
}
