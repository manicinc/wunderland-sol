/**
 * Typewriter Sound Effects
 * @module lib/audio/typewriterSounds
 *
 * Generates realistic typewriter-style keystroke sounds using Web Audio API.
 * Uses impulse-based synthesis with filtered noise for authentic mechanical feel.
 */

// ============================================================================
// TYPES
// ============================================================================

export type SoundVariant = 'mechanical' | 'soft' | 'digital' | 'vintage'

export interface TypewriterSoundOptions {
  enabled: boolean
  volume: number // 0-1
  variant: SoundVariant
}

// ============================================================================
// SOUND CONFIGURATIONS - Tuned for realistic typewriter sounds
// ============================================================================

interface SoundConfig {
  // Click component (high frequency noise burst)
  clickFreq: number      // Bandpass center frequency
  clickQ: number         // Bandpass Q (narrower = more tonal)
  clickDecay: number     // Decay time in seconds
  clickLevel: number     // Volume level 0-1

  // Thump component (low frequency body)
  thumpFreq: number      // Low frequency for mechanical thump
  thumpDecay: number     // Decay time
  thumpLevel: number     // Volume level

  // Character
  variation: number      // Random pitch variation (0-1)
}

const SOUND_CONFIGS: Record<SoundVariant, SoundConfig> = {
  mechanical: {
    // Classic typewriter - sharp click with mechanical thump
    clickFreq: 3500,
    clickQ: 2,
    clickDecay: 0.025,
    clickLevel: 0.7,
    thumpFreq: 150,
    thumpDecay: 0.04,
    thumpLevel: 0.5,
    variation: 0.15,
  },
  soft: {
    // Quiet keyboard - muted click
    clickFreq: 2000,
    clickQ: 1.5,
    clickDecay: 0.02,
    clickLevel: 0.5,
    thumpFreq: 100,
    thumpDecay: 0.03,
    thumpLevel: 0.3,
    variation: 0.1,
  },
  digital: {
    // Cherry MX style - crisp and clicky
    clickFreq: 5000,
    clickQ: 4,
    clickDecay: 0.015,
    clickLevel: 0.8,
    thumpFreq: 200,
    thumpDecay: 0.02,
    thumpLevel: 0.4,
    variation: 0.05,
  },
  vintage: {
    // Classic 1950s typewriter - heavy mechanical with resonance
    clickFreq: 2800,
    clickQ: 3,
    clickDecay: 0.035,
    clickLevel: 0.85,
    thumpFreq: 120,
    thumpDecay: 0.05,
    thumpLevel: 0.65,
    variation: 0.2, // More variation for authentic feel
  },
}

// Key type modifiers
const KEY_CONFIGS: Record<string, { pitchMult: number; volumeMult: number; decayMult: number }> = {
  letter: { pitchMult: 1.0, volumeMult: 1.0, decayMult: 1.0 },
  space: { pitchMult: 0.7, volumeMult: 1.2, decayMult: 1.5 },    // Lower, louder, longer
  enter: { pitchMult: 0.5, volumeMult: 1.3, decayMult: 2.0 },    // Carriage return clunk
  backspace: { pitchMult: 1.1, volumeMult: 0.8, decayMult: 0.8 }, // Quick, lighter
}

// ============================================================================
// TYPEWRITER SOUND CLASS
// ============================================================================

export class TypewriterSounds {
  private audioContext: AudioContext | null = null
  private options: TypewriterSoundOptions
  private noiseBuffer: AudioBuffer | null = null
  private lastPlayTime = 0
  private minInterval = 25 // Minimum ms between sounds

  constructor(options: Partial<TypewriterSoundOptions> = {}) {
    this.options = {
      enabled: true,
      volume: 0.4,
      variant: 'mechanical',
      ...options,
    }
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.audioContext) return

    try {
      this.audioContext = new AudioContext()
      this.noiseBuffer = this.createNoiseBuffer()
    } catch (error) {
      console.warn('[TypewriterSounds] Failed to initialize:', error)
    }
  }

  /**
   * Create noise buffer - using pink-ish noise for more natural sound
   */
  private createNoiseBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized')

    const sampleRate = this.audioContext.sampleRate
    const bufferSize = sampleRate * 0.1 // 100ms buffer
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate noise with slight low-frequency bias (more natural)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      // Pink noise approximation
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
      b6 = white * 0.115926
      data[i] = pink * 0.11 // Normalize
    }

    return buffer
  }

  /**
   * Play keystroke sound
   */
  play(keyType: 'letter' | 'space' | 'enter' | 'backspace' = 'letter'): void {
    if (!this.options.enabled || !this.audioContext || !this.noiseBuffer) return

    // Throttle sounds
    const now = performance.now()
    if (now - this.lastPlayTime < this.minInterval) return
    this.lastPlayTime = now

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    const config = SOUND_CONFIGS[this.options.variant]
    const keyConfig = KEY_CONFIGS[keyType]
    const time = this.audioContext.currentTime

    // Random variation
    const pitchVar = 1 + (Math.random() - 0.5) * config.variation

    // Master output
    const masterGain = this.audioContext.createGain()
    masterGain.gain.value = this.options.volume * keyConfig.volumeMult
    masterGain.connect(this.audioContext.destination)

    // ========== CLICK COMPONENT (filtered noise burst) ==========
    const clickSource = this.audioContext.createBufferSource()
    clickSource.buffer = this.noiseBuffer

    // Bandpass filter for the "click" character
    const clickFilter = this.audioContext.createBiquadFilter()
    clickFilter.type = 'bandpass'
    clickFilter.frequency.value = config.clickFreq * keyConfig.pitchMult * pitchVar
    clickFilter.Q.value = config.clickQ

    // Highpass to remove rumble
    const clickHighpass = this.audioContext.createBiquadFilter()
    clickHighpass.type = 'highpass'
    clickHighpass.frequency.value = 500

    // Click envelope - very fast attack, quick decay
    const clickGain = this.audioContext.createGain()
    const clickDecay = config.clickDecay * keyConfig.decayMult
    clickGain.gain.setValueAtTime(0, time)
    clickGain.gain.linearRampToValueAtTime(config.clickLevel, time + 0.001) // 1ms attack
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + clickDecay)

    clickSource.connect(clickFilter)
    clickFilter.connect(clickHighpass)
    clickHighpass.connect(clickGain)
    clickGain.connect(masterGain)

    clickSource.start(time)
    clickSource.stop(time + clickDecay + 0.01)

    // ========== THUMP COMPONENT (low frequency body) ==========
    const thumpOsc = this.audioContext.createOscillator()
    thumpOsc.type = 'sine'
    thumpOsc.frequency.setValueAtTime(config.thumpFreq * keyConfig.pitchMult * pitchVar, time)
    thumpOsc.frequency.exponentialRampToValueAtTime(
      config.thumpFreq * 0.5 * keyConfig.pitchMult,
      time + config.thumpDecay * keyConfig.decayMult
    )

    // Thump envelope
    const thumpGain = this.audioContext.createGain()
    const thumpDecay = config.thumpDecay * keyConfig.decayMult
    thumpGain.gain.setValueAtTime(0, time)
    thumpGain.gain.linearRampToValueAtTime(config.thumpLevel, time + 0.002)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, time + thumpDecay)

    // Lowpass to keep it subtle
    const thumpFilter = this.audioContext.createBiquadFilter()
    thumpFilter.type = 'lowpass'
    thumpFilter.frequency.value = 300

    thumpOsc.connect(thumpFilter)
    thumpFilter.connect(thumpGain)
    thumpGain.connect(masterGain)

    thumpOsc.start(time)
    thumpOsc.stop(time + thumpDecay + 0.01)

    // ========== TRANSIENT CLICK (sharp attack) ==========
    // Short burst of higher frequency for the initial "tick"
    const tickSource = this.audioContext.createBufferSource()
    tickSource.buffer = this.noiseBuffer

    const tickFilter = this.audioContext.createBiquadFilter()
    tickFilter.type = 'highpass'
    tickFilter.frequency.value = 6000

    const tickGain = this.audioContext.createGain()
    tickGain.gain.setValueAtTime(0, time)
    tickGain.gain.linearRampToValueAtTime(0.3, time + 0.0005) // 0.5ms attack
    tickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.008) // 8ms decay

    tickSource.connect(tickFilter)
    tickFilter.connect(tickGain)
    tickGain.connect(masterGain)

    tickSource.start(time)
    tickSource.stop(time + 0.02)
  }

  /**
   * Play sound for a keyboard event
   */
  playForKey(event: KeyboardEvent): void {
    if (!this.options.enabled) return

    // Ignore modifier keys and function keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape',
         'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ].includes(event.key)) {
      return
    }

    let keyType: 'letter' | 'space' | 'enter' | 'backspace' = 'letter'

    if (event.key === ' ') {
      keyType = 'space'
    } else if (event.key === 'Enter') {
      keyType = 'enter'
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      keyType = 'backspace'
    }

    this.play(keyType)
  }

  /**
   * Update options
   */
  setOptions(options: Partial<TypewriterSoundOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get current options
   */
  getOptions(): TypewriterSoundOptions {
    return { ...this.options }
  }

  /**
   * Enable/disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.options.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Set sound variant
   */
  setVariant(variant: SoundVariant): void {
    this.options.variant = variant
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.noiseBuffer = null
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: TypewriterSounds | null = null

/**
 * Get the shared TypewriterSounds instance
 */
export function getTypewriterSounds(): TypewriterSounds {
  if (!instance) {
    instance = new TypewriterSounds()
  }
  return instance
}

/**
 * Initialize the typewriter sounds (call after user interaction)
 */
export async function initTypewriterSounds(): Promise<TypewriterSounds> {
  const sounds = getTypewriterSounds()
  await sounds.init()
  return sounds
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react'

export interface UseTypewriterSoundsOptions extends Partial<TypewriterSoundOptions> {
  /** Automatically attach to keydown events */
  autoAttach?: boolean
}

export interface UseTypewriterSoundsReturn {
  /** Play a keystroke sound */
  play: (keyType?: 'letter' | 'space' | 'enter' | 'backspace') => void
  /** Play sound for a keyboard event */
  playForKey: (event: KeyboardEvent) => void
  /** Toggle sounds on/off */
  toggle: () => void
  /** Set enabled state */
  setEnabled: (enabled: boolean) => void
  /** Set volume */
  setVolume: (volume: number) => void
  /** Set sound variant */
  setVariant: (variant: SoundVariant) => void
  /** Current enabled state */
  enabled: boolean
  /** Current volume */
  volume: number
  /** Current variant */
  variant: SoundVariant
  /** Whether sounds are initialized */
  initialized: boolean
}

/**
 * React hook for typewriter sound effects
 */
export function useTypewriterSounds(
  options: UseTypewriterSoundsOptions = {}
): UseTypewriterSoundsReturn {
  const { autoAttach = false, ...soundOptions } = options

  const soundsRef = useRef<TypewriterSounds | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [enabled, setEnabledState] = useState(soundOptions.enabled ?? true)
  const [volume, setVolumeState] = useState(soundOptions.volume ?? 0.4)
  const [variant, setVariantState] = useState<SoundVariant>(soundOptions.variant ?? 'mechanical')

  // Initialize on first user interaction
  useEffect(() => {
    const sounds = getTypewriterSounds()
    soundsRef.current = sounds

    // Apply initial options
    sounds.setOptions({
      enabled,
      volume,
      variant,
    })

    const initOnInteraction = async () => {
      await sounds.init()
      setInitialized(true)
      document.removeEventListener('click', initOnInteraction)
      document.removeEventListener('keydown', initOnInteraction)
    }

    document.addEventListener('click', initOnInteraction, { once: true })
    document.addEventListener('keydown', initOnInteraction, { once: true })

    return () => {
      document.removeEventListener('click', initOnInteraction)
      document.removeEventListener('keydown', initOnInteraction)
    }
  }, [])

  // Update sounds when options change
  useEffect(() => {
    soundsRef.current?.setOptions({ enabled, volume, variant })
  }, [enabled, volume, variant])

  // Auto-attach to keydown events
  useEffect(() => {
    if (!autoAttach || !initialized) return

    const handleKeydown = (e: KeyboardEvent) => {
      soundsRef.current?.playForKey(e)
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [autoAttach, initialized])

  const play = useCallback((keyType: 'letter' | 'space' | 'enter' | 'backspace' = 'letter') => {
    soundsRef.current?.play(keyType)
  }, [])

  const playForKey = useCallback((event: KeyboardEvent) => {
    soundsRef.current?.playForKey(event)
  }, [])

  const toggle = useCallback(() => {
    setEnabledState((prev) => !prev)
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
  }, [])

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.max(0, Math.min(1, value)))
  }, [])

  const setVariant = useCallback((value: SoundVariant) => {
    setVariantState(value)
  }, [])

  return {
    play,
    playForKey,
    toggle,
    setEnabled,
    setVolume,
    setVariant,
    enabled,
    volume,
    variant,
    initialized,
  }
}
