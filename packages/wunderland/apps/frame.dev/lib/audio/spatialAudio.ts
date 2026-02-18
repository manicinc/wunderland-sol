/**
 * Spatial Audio Utilities
 * @module lib/audio/spatialAudio
 *
 * Provides spatial audio positioning presets and utilities for 3D soundscapes.
 * Uses StereoPannerNode for left/right positioning with smooth transitions.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Spatial audio preset names
 * - mono: All sounds centered (accessibility, mono speakers)
 * - stereo: Subtle left/right spread (default, non-distracting)
 * - immersive: Full 3D positioning with movement (headphones recommended)
 */
export type SpatialPreset = 'mono' | 'stereo' | 'immersive'

/**
 * Configuration for spatial positioning of audio layers
 */
export interface SpatialConfig {
  /** Pan position for base layer (-1 left to 1 right) */
  base: number
  /** Pan position for detail layer */
  detail: number
  /** Pan position for accent sounds */
  accent: number
  /** Whether accent sounds should drift left/right over time */
  movement: boolean
  /** Movement speed in seconds per cycle (if movement enabled) */
  movementSpeed: number
  /** Movement range (-range to +range) */
  movementRange: number
}

// ============================================================================
// PRESETS
// ============================================================================

/**
 * Spatial audio presets
 *
 * Mono: Everything centered - safe for all setups
 * Stereo: Subtle spread - pleasant without being distracting
 * Immersive: Full 3D - best with headphones
 */
export const SPATIAL_PRESETS: Record<SpatialPreset, SpatialConfig> = {
  mono: {
    base: 0,
    detail: 0,
    accent: 0,
    movement: false,
    movementSpeed: 0,
    movementRange: 0,
  },
  stereo: {
    base: 0,
    detail: 0.25,
    accent: 0.4,
    movement: false,
    movementSpeed: 0,
    movementRange: 0,
  },
  immersive: {
    base: 0,
    detail: 0.5,
    accent: 0.7,
    movement: true,
    movementSpeed: 8, // 8 seconds per L-R cycle
    movementRange: 0.8,
  },
}

/**
 * Human-readable labels for spatial presets
 */
export const SPATIAL_PRESET_LABELS: Record<SpatialPreset, string> = {
  mono: 'Mono',
  stereo: 'Stereo',
  immersive: 'Immersive',
}

/**
 * Descriptions for each spatial preset
 */
export const SPATIAL_PRESET_DESCRIPTIONS: Record<SpatialPreset, string> = {
  mono: 'Centered audio, works with any speaker setup',
  stereo: 'Subtle left/right spread for depth',
  immersive: 'Full 3D positioning with movement (headphones recommended)',
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Create a StereoPannerNode with initial pan value
 */
export function createStereoPanner(
  ctx: AudioContext,
  pan: number = 0
): StereoPannerNode {
  const panner = ctx.createStereoPanner()
  panner.pan.value = clampPan(pan)
  return panner
}

/**
 * Smoothly transition pan value over time
 *
 * @param panner - The StereoPannerNode to animate
 * @param targetPan - Target pan value (-1 to 1)
 * @param duration - Transition duration in seconds
 */
export function animatePan(
  panner: StereoPannerNode,
  targetPan: number,
  duration: number = 0.1
): void {
  const ctx = panner.context as AudioContext
  panner.pan.setTargetAtTime(
    clampPan(targetPan),
    ctx.currentTime,
    duration / 3 // Time constant (reaches ~95% of target in duration)
  )
}

/**
 * Create a smooth oscillating pan animation for immersive mode
 *
 * @param panner - The StereoPannerNode to animate
 * @param config - Spatial configuration with movement settings
 * @returns Cleanup function to stop the animation
 */
export function createPanOscillation(
  panner: StereoPannerNode,
  config: SpatialConfig
): () => void {
  if (!config.movement || config.movementSpeed <= 0) {
    return () => {} // No-op if movement disabled
  }

  const ctx = panner.context as AudioContext
  let animationId: number | null = null
  let startTime = ctx.currentTime

  const animate = () => {
    const elapsed = ctx.currentTime - startTime
    const phase = (elapsed / config.movementSpeed) * Math.PI * 2
    const pan = Math.sin(phase) * config.movementRange

    panner.pan.setTargetAtTime(pan, ctx.currentTime, 0.05)
    animationId = requestAnimationFrame(animate)
  }

  animationId = requestAnimationFrame(animate)

  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
    }
  }
}

/**
 * Get a random pan position within the accent range
 * Used for one-shot accent sounds that play at random positions
 */
export function getRandomAccentPan(config: SpatialConfig): number {
  if (config.accent === 0) return 0
  const side = Math.random() > 0.5 ? 1 : -1
  const intensity = 0.5 + Math.random() * 0.5 // 50-100% of max
  return side * config.accent * intensity
}

/**
 * Get alternating pan positions for stereo spread
 * Useful for detail layers that should alternate left/right
 */
export function getAlternatingPan(
  config: SpatialConfig,
  index: number
): number {
  const side = index % 2 === 0 ? 1 : -1
  return side * config.detail
}

/**
 * Clamp pan value to valid range
 */
function clampPan(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

// ============================================================================
// AUDIO GRAPH HELPERS
// ============================================================================

/**
 * Insert a StereoPannerNode between two existing nodes
 *
 * @param source - Source node (will be disconnected from destination)
 * @param destination - Destination node
 * @param panner - Panner to insert
 */
export function insertPanner(
  source: AudioNode,
  destination: AudioNode,
  panner: StereoPannerNode
): void {
  source.disconnect(destination)
  source.connect(panner)
  panner.connect(destination)
}

/**
 * Create a complete spatial audio chain:
 * source -> gain -> panner -> destination
 */
export function createSpatialChain(
  ctx: AudioContext,
  destination: AudioNode,
  initialPan: number = 0,
  initialGain: number = 1
): {
  gain: GainNode
  panner: StereoPannerNode
  connect: (source: AudioNode) => void
  disconnect: () => void
} {
  const gain = ctx.createGain()
  gain.gain.value = initialGain

  const panner = createStereoPanner(ctx, initialPan)

  gain.connect(panner)
  panner.connect(destination)

  return {
    gain,
    panner,
    connect: (source: AudioNode) => source.connect(gain),
    disconnect: () => {
      gain.disconnect()
      panner.disconnect()
    },
  }
}

export default SPATIAL_PRESETS
