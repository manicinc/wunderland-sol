/**
 * WritingEffects - Canvas-based particle effects for writing mode
 * @module lib/write/writingEffects
 *
 * Provides visual flair through:
 * - Ink splatter particles on keystroke
 * - Ambient dust motes
 * - Punctuation flourishes
 */

import type { ThemeName } from '@/types/theme'

// ============================================================================
// TYPES
// ============================================================================

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'ink' | 'dust' | 'flourish'
  rotation?: number
  rotationSpeed?: number
}

export interface WritingEffectsConfig {
  /** Enable ink splatter on keystrokes */
  inkEnabled: boolean
  /** Enable ambient dust particles */
  dustEnabled: boolean
  /** Enable punctuation flourishes */
  flourishEnabled: boolean
  /** Overall intensity (0-1) */
  intensity: number
  /** Maximum particles */
  maxParticles: number
}

// ============================================================================
// THEME COLORS
// ============================================================================

const INK_COLORS: Record<string, string> = {
  light: 'rgba(139, 92, 246, 0.6)', // Purple
  dark: 'rgba(168, 85, 247, 0.5)',
  'sepia-light': 'rgba(62, 39, 35, 0.4)', // Brown ink
  'sepia-dark': 'rgba(212, 165, 116, 0.4)',
  'terminal-light': 'rgba(245, 184, 0, 0.5)', // Amber
  'terminal-dark': 'rgba(72, 208, 128, 0.5)', // Green
  'oceanic-light': 'rgba(8, 145, 178, 0.5)', // Cyan
  'oceanic-dark': 'rgba(34, 211, 238, 0.4)',
}

const DUST_COLORS: Record<string, string> = {
  light: 'rgba(161, 161, 170, 0.3)',
  dark: 'rgba(113, 113, 122, 0.2)',
  'sepia-light': 'rgba(212, 165, 116, 0.3)',
  'sepia-dark': 'rgba(139, 90, 43, 0.2)',
  'terminal-light': 'rgba(245, 184, 0, 0.2)',
  'terminal-dark': 'rgba(72, 208, 128, 0.15)',
  'oceanic-light': 'rgba(34, 211, 238, 0.2)',
  'oceanic-dark': 'rgba(34, 211, 238, 0.15)',
}

// ============================================================================
// WRITING EFFECTS ENGINE
// ============================================================================

export class WritingEffectsEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private animationId: number | null = null
  private theme: ThemeName = 'dark'
  private config: WritingEffectsConfig

  constructor(canvas: HTMLCanvasElement, config?: Partial<WritingEffectsConfig>) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get 2d context from canvas')
    }
    this.ctx = ctx

    this.config = {
      inkEnabled: true,
      dustEnabled: true,
      flourishEnabled: true,
      intensity: 0.7,
      maxParticles: 50,
      ...config,
    }
  }

  /**
   * Set the current theme for color matching
   */
  setTheme(theme: ThemeName) {
    this.theme = theme
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<WritingEffectsConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * Resize canvas to match container
   */
  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.scale(dpr, dpr)
  }

  /**
   * Spawn ink splatter particles at cursor position
   */
  spawnInkSplatter(x: number, y: number) {
    if (!this.config.inkEnabled) return
    if (this.particles.length >= this.config.maxParticles) return

    const color = INK_COLORS[this.theme] || INK_COLORS.dark
    const count = Math.floor(3 + Math.random() * 3 * this.config.intensity)

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2 * this.config.intensity

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // Slight upward bias
        life: 1,
        maxLife: 1,
        size: 0.5 + Math.random() * 2,
        color,
        type: 'ink',
      })
    }
  }

  /**
   * Spawn flourish particles for punctuation
   */
  spawnFlourish(x: number, y: number, char: string) {
    if (!this.config.flourishEnabled) return
    if (!'.!?;:'.includes(char)) return
    if (this.particles.length >= this.config.maxParticles) return

    const color = INK_COLORS[this.theme] || INK_COLORS.dark
    const count = char === '!' || char === '?' ? 5 : 3

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3 // Upward arc
      const speed = 2 + Math.random() * 2

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: 1 + Math.random() * 1.5,
        color,
        type: 'flourish',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      })
    }
  }

  /**
   * Spawn ambient dust motes
   */
  spawnDust() {
    if (!this.config.dustEnabled) return

    // Limit dust particles
    const dustCount = this.particles.filter((p) => p.type === 'dust').length
    if (dustCount >= 15) return

    const color = DUST_COLORS[this.theme] || DUST_COLORS.dark
    const width = this.canvas.width / (window.devicePixelRatio || 1)
    const height = this.canvas.height / (window.devicePixelRatio || 1)

    this.particles.push({
      x: Math.random() * width,
      y: height + 10,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.2 - Math.random() * 0.3,
      life: 1,
      maxLife: 1,
      size: 1 + Math.random() * 2,
      color,
      type: 'dust',
    })
  }

  /**
   * Main animation loop
   */
  private animate = () => {
    const width = this.canvas.width / (window.devicePixelRatio || 1)
    const height = this.canvas.height / (window.devicePixelRatio || 1)

    this.ctx.clearRect(0, 0, width, height)

    // Occasionally spawn dust
    if (this.config.dustEnabled && Math.random() < 0.02) {
      this.spawnDust()
    }

    // Update and render particles
    this.particles = this.particles.filter((p) => {
      // Update position
      p.x += p.vx
      p.y += p.vy

      // Apply physics based on type
      if (p.type === 'ink') {
        p.vy += 0.08 // Gravity
        p.vx *= 0.98 // Air resistance
      } else if (p.type === 'flourish') {
        p.vy += 0.04 // Lighter gravity
        if (p.rotationSpeed) {
          p.rotation = (p.rotation || 0) + p.rotationSpeed
        }
      } else if (p.type === 'dust') {
        // Gentle floating with slight wobble
        p.vx += Math.sin(Date.now() * 0.001 + p.x) * 0.005
      }

      // Decay life
      const decayRate = p.type === 'dust' ? 0.003 : 0.025
      p.life -= decayRate

      // Remove dead particles
      if (p.life <= 0) return false

      // Render particle
      this.ctx.save()
      this.ctx.globalAlpha = p.life * (p.type === 'dust' ? 0.5 : 1)
      this.ctx.fillStyle = p.color

      if (p.type === 'flourish' && p.rotation) {
        this.ctx.translate(p.x, p.y)
        this.ctx.rotate(p.rotation)
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.3)
      } else {
        this.ctx.beginPath()
        this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        this.ctx.fill()
      }

      this.ctx.restore()

      return true
    })

    this.animationId = requestAnimationFrame(this.animate)
  }

  /**
   * Start the animation loop
   */
  start() {
    if (!this.animationId) {
      this.animate()
    }
  }

  /**
   * Stop the animation loop
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = []
    const width = this.canvas.width / (window.devicePixelRatio || 1)
    const height = this.canvas.height / (window.devicePixelRatio || 1)
    this.ctx.clearRect(0, 0, width, height)
  }

  /**
   * Dispose of the engine
   */
  dispose() {
    this.stop()
    this.clear()
  }
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_WRITING_EFFECTS_CONFIG: WritingEffectsConfig = {
  inkEnabled: false, // Off by default (can be distracting)
  dustEnabled: false,
  flourishEnabled: false,
  intensity: 0.7,
  maxParticles: 50,
}
