/**
 * Ambient Soundscapes
 * @module lib/audio/ambienceSounds
 *
 * Generates continuous ambient soundscapes using Web Audio API.
 * Uses synthesized audio for rain, cafe, forest, ocean, fireplace, lo-fi, and white noise.
 * Supports spatial audio positioning with StereoPannerNodes for 3D soundscapes.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  type SpatialPreset,
  type SpatialConfig,
  SPATIAL_PRESETS,
  createStereoPanner,
  animatePan,
  getRandomAccentPan,
  getAlternatingPan,
  createPanOscillation,
} from './spatialAudio'
import {
  type StockSound,
  STOCK_SOUND_MANIFEST,
  getRandomSound,
  getRandomInterval,
  getRandomPlaybackRate,
  hasAccentSounds,
} from './stockSoundManifest'

// Re-export spatial types for UI components
export type { SpatialPreset } from './spatialAudio'
export { SPATIAL_PRESETS, SPATIAL_PRESET_LABELS, SPATIAL_PRESET_DESCRIPTIONS } from './spatialAudio'

// ============================================================================
// TYPES
// ============================================================================

export type SoundscapeType =
  | 'rain'
  | 'cafe'
  | 'forest'
  | 'ocean'
  | 'fireplace'
  | 'lofi'
  | 'white-noise'
  | 'none'

export interface AmbienceSoundOptions {
  enabled: boolean
  soundscape: SoundscapeType
  volume: number // 0-1
}

export interface SoundscapeMetadata {
  id: SoundscapeType
  name: string
  description: string
  icon: string
  emoji: string
  color: string
}

// ============================================================================
// SOUNDSCAPE METADATA
// ============================================================================

export const SOUNDSCAPE_METADATA: SoundscapeMetadata[] = [
  { id: 'rain', name: 'Rain', description: 'Gentle rain on window', icon: 'CloudRain', emoji: '🌧️', color: '#60A5FA' },
  { id: 'cafe', name: 'Café', description: 'Busy coffee shop ambience', icon: 'Coffee', emoji: '☕', color: '#F59E0B' },
  { id: 'forest', name: 'Forest', description: 'Wind through trees, birds', icon: 'TreePine', emoji: '🌲', color: '#22C55E' },
  { id: 'ocean', name: 'Ocean', description: 'Waves on the shore', icon: 'Waves', emoji: '🌊', color: '#06B6D4' },
  { id: 'fireplace', name: 'Fireplace', description: 'Crackling fire', icon: 'Flame', emoji: '🔥', color: '#EF4444' },
  { id: 'lofi', name: 'Lo-fi', description: 'Soft ambient pads', icon: 'Music', emoji: '🎵', color: '#A855F7' },
  { id: 'white-noise', name: 'White Noise', description: 'Static background', icon: 'Radio', emoji: '📻', color: '#6B7280' },
  { id: 'none', name: 'Off', description: 'No ambient sound', icon: 'VolumeX', emoji: '🔇', color: '#374151' },
]

// Object lookup for soundscape info by type
export const SOUNDSCAPE_INFO: Record<SoundscapeType, SoundscapeMetadata> = Object.fromEntries(
  SOUNDSCAPE_METADATA.map(item => [item.id, item])
) as Record<SoundscapeType, SoundscapeMetadata>

// ============================================================================
// AMBIENCE SOUNDS CLASS
// ============================================================================

export class AmbienceSounds {
  private audioContext: AudioContext | null = null
  private options: AmbienceSoundOptions
  private noiseBuffer: AudioBuffer | null = null
  private masterGain: GainNode | null = null
  private activeNodes: AudioNode[] = []
  private activeOscillators: OscillatorNode[] = []
  private activeBufferSources: AudioBufferSourceNode[] = []
  private intervalIds: number[] = []
  private isPlaying = false
  private analyserNode: AnalyserNode | null = null

  // Spatial audio
  private spatialPreset: SpatialPreset = 'stereo'
  private spatialConfig: SpatialConfig = SPATIAL_PRESETS.stereo
  private basePanner: StereoPannerNode | null = null
  private detailPanner: StereoPannerNode | null = null
  private accentPanner: StereoPannerNode | null = null
  private panOscillationCleanup: (() => void) | null = null

  // Stock sounds
  private useStockSounds: boolean = true
  private accentVolume: number = 0.2
  private stockSoundBuffers: Map<number, AudioBuffer> = new Map()
  private accentTimeoutId: number | null = null

  constructor(options: Partial<AmbienceSoundOptions> = {}) {
    this.options = {
      enabled: false,
      soundscape: 'rain',
      volume: 0.3,
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

      // Create master gain
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = this.options.volume

      // Create analyser for visualizations
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 256
      this.analyserNode.smoothingTimeConstant = 0.8

      // Create spatial panners for each audio layer
      this.basePanner = createStereoPanner(this.audioContext, this.spatialConfig.base)
      this.detailPanner = createStereoPanner(this.audioContext, this.spatialConfig.detail)
      this.accentPanner = createStereoPanner(this.audioContext, this.spatialConfig.accent)

      // Connect panners to master gain
      this.basePanner.connect(this.masterGain)
      this.detailPanner.connect(this.masterGain)
      this.accentPanner.connect(this.masterGain)

      this.masterGain.connect(this.analyserNode)
      this.analyserNode.connect(this.audioContext.destination)
    } catch (error) {
      console.warn('[AmbienceSounds] Failed to initialize:', error)
    }
  }

  /**
   * Get analyser node for visualizations
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode
  }

  /**
   * Create noise buffer - brown noise for natural ambient sound
   */
  private createNoiseBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized')

    const sampleRate = this.audioContext.sampleRate
    const bufferSize = sampleRate * 2 // 2 seconds buffer for seamless looping
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate brown noise (integrated white noise - sounds more natural)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
      data[i] *= 3.5 // Amplify
    }

    return buffer
  }

  /**
   * Stop all active sounds
   */
  private stopAllSounds(): void {
    // Stop all oscillators
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop()
        osc.disconnect()
      } catch (e) { /* Already stopped */ }
    })
    this.activeOscillators = []

    // Stop all buffer sources
    this.activeBufferSources.forEach(source => {
      try {
        source.stop()
        source.disconnect()
      } catch (e) { /* Already stopped */ }
    })
    this.activeBufferSources = []

    // Disconnect all nodes
    this.activeNodes.forEach(node => {
      try {
        node.disconnect()
      } catch (e) { /* Already disconnected */ }
    })
    this.activeNodes = []

    // Clear intervals
    this.intervalIds.forEach(id => clearInterval(id))
    this.intervalIds = []

    // Stop accent playback
    this.stopAccentPlayback()
  }

  /**
   * Play the current soundscape
   */
  play(): void {
    if (!this.audioContext || !this.masterGain || this.isPlaying) return
    if (this.options.soundscape === 'none') return

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    this.isPlaying = true
    this.options.enabled = true

    // Start the appropriate soundscape
    switch (this.options.soundscape) {
      case 'rain':
        this.createRain()
        break
      case 'cafe':
        this.createCafe()
        break
      case 'forest':
        this.createForest()
        break
      case 'ocean':
        this.createOcean()
        break
      case 'fireplace':
        this.createFireplace()
        break
      case 'lofi':
        this.createLofi()
        break
      case 'white-noise':
        this.createWhiteNoise()
        break
    }
  }

  /**
   * Stop playing
   */
  stop(): void {
    if (!this.isPlaying) return

    // Fade out
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.5)

      setTimeout(() => {
        this.stopAllSounds()
        this.isPlaying = false
        this.options.enabled = false
        if (this.masterGain) {
          this.masterGain.gain.value = this.options.volume
        }
      }, 600)
    } else {
      this.stopAllSounds()
      this.isPlaying = false
      this.options.enabled = false
    }
  }

  /**
   * Graceful fade out over specified duration (for timer completion)
   * @param durationMs - fade duration in milliseconds (default 3000ms = 3 seconds)
   */
  fadeOut(durationMs: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isPlaying || !this.masterGain || !this.audioContext) {
        resolve()
        return
      }

      const durationSec = durationMs / 1000
      const now = this.audioContext.currentTime
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.linearRampToValueAtTime(0, now + durationSec)

      setTimeout(() => {
        this.stopAllSounds()
        this.isPlaying = false
        this.options.enabled = false
        if (this.masterGain) {
          this.masterGain.gain.value = this.options.volume
        }
        resolve()
      }, durationMs + 100)
    })
  }

  /**
   * Toggle play/stop
   */
  toggle(): void {
    if (this.isPlaying) {
      this.stop()
    } else {
      this.play()
    }
  }

  // ============================================================================
  // SOUNDSCAPE GENERATORS
  // ============================================================================

  /**
   * Rain - Brown noise with random droplet pings
   */
  private createRain(): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return

    // Base rain noise → basePanner
    const rainSource = this.audioContext.createBufferSource()
    rainSource.buffer = this.noiseBuffer
    rainSource.loop = true

    // Low-pass filter for smooth rain
    const rainFilter = this.audioContext.createBiquadFilter()
    rainFilter.type = 'lowpass'
    rainFilter.frequency.value = 400
    rainFilter.Q.value = 0.5

    const rainGain = this.audioContext.createGain()
    rainGain.gain.value = 0.7

    rainSource.connect(rainFilter)
    rainFilter.connect(rainGain)
    rainGain.connect(this.basePanner ?? this.masterGain)
    rainSource.start()

    this.activeBufferSources.push(rainSource)
    this.activeNodes.push(rainFilter, rainGain)

    // Higher frequency rain detail → detailPanner
    const detailSource = this.audioContext.createBufferSource()
    detailSource.buffer = this.noiseBuffer
    detailSource.loop = true

    const detailFilter = this.audioContext.createBiquadFilter()
    detailFilter.type = 'bandpass'
    detailFilter.frequency.value = 2000
    detailFilter.Q.value = 1

    const detailGain = this.audioContext.createGain()
    detailGain.gain.value = 0.08

    detailSource.connect(detailFilter)
    detailFilter.connect(detailGain)
    detailGain.connect(this.detailPanner ?? this.masterGain)
    detailSource.start()

    this.activeBufferSources.push(detailSource)
    this.activeNodes.push(detailFilter, detailGain)

    // Random droplet pings → accentPanner with random pan position
    const createDroplet = () => {
      if (!this.audioContext || !this.accentPanner || !this.isPlaying) return

      const osc = this.audioContext.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 2500 + Math.random() * 1500 // Tighter, less harsh range

      const dropGain = this.audioContext.createGain()
      const now = this.audioContext.currentTime
      dropGain.gain.setValueAtTime(0, now)
      dropGain.gain.linearRampToValueAtTime(0.02, now + 0.001) // Softer pings
      dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

      // Random pan position for each droplet
      const dropPanner = createStereoPanner(this.audioContext, getRandomAccentPan(this.spatialConfig))
      osc.connect(dropGain)
      dropGain.connect(dropPanner)
      dropPanner.connect(this.accentPanner)
      osc.start(now)
      osc.stop(now + 0.06)

      // Cleanup panner after sound ends
      setTimeout(() => dropPanner.disconnect(), 100)
    }

    // Schedule random droplets (sparser, less frequent)
    const dropletInterval = setInterval(() => {
      if (Math.random() > 0.85) createDroplet()
    }, 150) as unknown as number
    this.intervalIds.push(dropletInterval)

    // Start stock sound accent playback if enabled
    this.startAccentPlayback()
  }

  /**
   * Cafe - Pink noise with periodic clink sounds
   */
  private createCafe(): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return

    // Background chatter (filtered noise) → basePanner
    const chatterSource = this.audioContext.createBufferSource()
    chatterSource.buffer = this.noiseBuffer
    chatterSource.loop = true

    const chatterFilter = this.audioContext.createBiquadFilter()
    chatterFilter.type = 'bandpass'
    chatterFilter.frequency.value = 800
    chatterFilter.Q.value = 0.3

    const chatterGain = this.audioContext.createGain()
    chatterGain.gain.value = 0.4

    chatterSource.connect(chatterFilter)
    chatterFilter.connect(chatterGain)
    chatterGain.connect(this.basePanner ?? this.masterGain)
    chatterSource.start()

    this.activeBufferSources.push(chatterSource)
    this.activeNodes.push(chatterFilter, chatterGain)

    // Higher murmur layer → detailPanner
    const murmurSource = this.audioContext.createBufferSource()
    murmurSource.buffer = this.noiseBuffer
    murmurSource.loop = true

    const murmurFilter = this.audioContext.createBiquadFilter()
    murmurFilter.type = 'bandpass'
    murmurFilter.frequency.value = 2000
    murmurFilter.Q.value = 0.5

    const murmurGain = this.audioContext.createGain()
    murmurGain.gain.value = 0.10 // Reduced from 0.15 - too present

    murmurSource.connect(murmurFilter)
    murmurFilter.connect(murmurGain)
    murmurGain.connect(this.detailPanner ?? this.masterGain)
    murmurSource.start()

    this.activeBufferSources.push(murmurSource)
    this.activeNodes.push(murmurFilter, murmurGain)

    // Random cup/plate clinks → accentPanner with random pan
    const createClink = () => {
      if (!this.audioContext || !this.accentPanner || !this.isPlaying) return

      const osc = this.audioContext.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 3500 + Math.random() * 1000 // Tighter range

      const clinkGain = this.audioContext.createGain()
      const now = this.audioContext.currentTime
      clinkGain.gain.setValueAtTime(0, now)
      clinkGain.gain.linearRampToValueAtTime(0.025, now + 0.003) // Softer, slower attack
      clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

      const clinkFilter = this.audioContext.createBiquadFilter()
      clinkFilter.type = 'highpass'
      clinkFilter.frequency.value = 2000

      // Random pan position for each clink
      const clinkPanner = createStereoPanner(this.audioContext, getRandomAccentPan(this.spatialConfig))
      osc.connect(clinkFilter)
      clinkFilter.connect(clinkGain)
      clinkGain.connect(clinkPanner)
      clinkPanner.connect(this.accentPanner)
      osc.start(now)
      osc.stop(now + 0.2)

      // Cleanup panner after sound ends
      setTimeout(() => clinkPanner.disconnect(), 250)
    }

    // Schedule random clinks (sparser)
    const clinkInterval = setInterval(() => {
      if (Math.random() > 0.92) createClink()
    }, 800) as unknown as number
    this.intervalIds.push(clinkInterval)

    // Start stock sound accent playback if enabled
    this.startAccentPlayback()
  }

  /**
   * Forest - Wind noise with bird chirps
   */
  private createForest(): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return

    // Wind base → basePanner
    const windSource = this.audioContext.createBufferSource()
    windSource.buffer = this.noiseBuffer
    windSource.loop = true

    const windFilter = this.audioContext.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 300
    windFilter.Q.value = 0.3

    const windGain = this.audioContext.createGain()
    windGain.gain.value = 0.5

    windSource.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(this.basePanner ?? this.masterGain)
    windSource.start()

    this.activeBufferSources.push(windSource)
    this.activeNodes.push(windFilter, windGain)

    // Rustling leaves (higher frequency) → detailPanner
    const rustleSource = this.audioContext.createBufferSource()
    rustleSource.buffer = this.noiseBuffer
    rustleSource.loop = true

    const rustleFilter = this.audioContext.createBiquadFilter()
    rustleFilter.type = 'bandpass'
    rustleFilter.frequency.value = 3000
    rustleFilter.Q.value = 1.2 // Less resonant

    const rustleGain = this.audioContext.createGain()
    rustleGain.gain.value = 0.08

    rustleSource.connect(rustleFilter)
    rustleFilter.connect(rustleGain)
    rustleGain.connect(this.detailPanner ?? this.masterGain)
    rustleSource.start()

    this.activeBufferSources.push(rustleSource)
    this.activeNodes.push(rustleFilter, rustleGain)

    // Bird chirp → accentPanner with random pan
    const createChirp = () => {
      if (!this.audioContext || !this.accentPanner || !this.isPlaying) return

      const baseFreq = 2000 + Math.random() * 2000
      const numChirps = Math.floor(Math.random() * 3) + 1
      // Each bird gets a consistent pan position
      const birdPan = getRandomAccentPan(this.spatialConfig)

      for (let i = 0; i < numChirps; i++) {
        setTimeout(() => {
          if (!this.audioContext || !this.accentPanner || !this.isPlaying) return

          const osc = this.audioContext.createOscillator()
          osc.type = 'sine'

          const now = this.audioContext.currentTime
          const freq = baseFreq + Math.random() * 500
          osc.frequency.setValueAtTime(freq, now)
          osc.frequency.linearRampToValueAtTime(freq * 1.2, now + 0.03)
          osc.frequency.linearRampToValueAtTime(freq * 0.9, now + 0.06)

          const chirpGain = this.audioContext.createGain()
          chirpGain.gain.setValueAtTime(0, now)
          chirpGain.gain.linearRampToValueAtTime(0.025, now + 0.015) // Softer, gentler onset
          chirpGain.gain.linearRampToValueAtTime(0.015, now + 0.04)
          chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

          // Each chirp from the same bird uses the same pan position
          const chirpPanner = createStereoPanner(this.audioContext, birdPan)
          osc.connect(chirpGain)
          chirpGain.connect(chirpPanner)
          chirpPanner.connect(this.accentPanner!)
          osc.start(now)
          osc.stop(now + 0.1)

          // Cleanup panner after sound ends
          setTimeout(() => chirpPanner.disconnect(), 150)
        }, i * 80)
      }
    }

    // Schedule bird chirps (sparser)
    const chirpInterval = setInterval(() => {
      if (Math.random() > 0.95) createChirp()
    }, 1500) as unknown as number
    this.intervalIds.push(chirpInterval)

    // Start stock sound accent playback if enabled
    this.startAccentPlayback()
  }

  /**
   * Ocean - Low frequency waves with white noise rushes
   */
  private createOcean(): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return

    // Deep ocean rumble → basePanner (centered for immersion)
    const rumbleOsc = this.audioContext.createOscillator()
    rumbleOsc.type = 'sine'
    rumbleOsc.frequency.value = 40 // Deeper, less audible

    const rumbleGain = this.audioContext.createGain()
    rumbleGain.gain.value = 0.10 // Subtle presence

    const rumbleFilter = this.audioContext.createBiquadFilter()
    rumbleFilter.type = 'lowpass'
    rumbleFilter.frequency.value = 100

    rumbleOsc.connect(rumbleFilter)
    rumbleFilter.connect(rumbleGain)
    rumbleGain.connect(this.basePanner ?? this.masterGain)
    rumbleOsc.start()

    this.activeOscillators.push(rumbleOsc)
    this.activeNodes.push(rumbleFilter, rumbleGain)

    // Wave generator → detailPanner with alternating left/right
    let waveIndex = 0
    const createWave = () => {
      if (!this.audioContext || !this.detailPanner || !this.noiseBuffer || !this.isPlaying) return

      const waveSource = this.audioContext.createBufferSource()
      waveSource.buffer = this.noiseBuffer

      const waveFilter = this.audioContext.createBiquadFilter()
      waveFilter.type = 'lowpass'
      waveFilter.frequency.value = 500
      waveFilter.Q.value = 0.5

      const waveGain = this.audioContext.createGain()
      const now = this.audioContext.currentTime
      const duration = 3 + Math.random() * 2

      waveGain.gain.setValueAtTime(0, now)
      waveGain.gain.linearRampToValueAtTime(0.3, now + duration * 0.3) // Less overwhelming
      waveGain.gain.linearRampToValueAtTime(0.4, now + duration * 0.5)
      waveGain.gain.linearRampToValueAtTime(0.15, now + duration * 0.7)
      waveGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

      // Alternating left/right for wave movement effect
      const wavePanner = createStereoPanner(this.audioContext, getAlternatingPan(this.spatialConfig, waveIndex++))
      waveSource.connect(waveFilter)
      waveFilter.connect(waveGain)
      waveGain.connect(wavePanner)
      wavePanner.connect(this.detailPanner!)
      waveSource.start(now)
      waveSource.stop(now + duration)

      // Cleanup panner after wave ends
      setTimeout(() => wavePanner.disconnect(), (duration + 0.5) * 1000)
    }

    // Schedule waves (more realistic timing)
    createWave()
    const waveInterval = setInterval(() => {
      createWave()
    }, 5000 + Math.random() * 3000) as unknown as number
    this.intervalIds.push(waveInterval)

    // Constant surf sound → basePanner
    const surfSource = this.audioContext.createBufferSource()
    surfSource.buffer = this.noiseBuffer
    surfSource.loop = true

    const surfFilter = this.audioContext.createBiquadFilter()
    surfFilter.type = 'bandpass'
    surfFilter.frequency.value = 1000
    surfFilter.Q.value = 0.5

    const surfGain = this.audioContext.createGain()
    surfGain.gain.value = 0.15

    surfSource.connect(surfFilter)
    surfFilter.connect(surfGain)
    surfGain.connect(this.basePanner ?? this.masterGain)
    surfSource.start()

    this.activeBufferSources.push(surfSource)
    this.activeNodes.push(surfFilter, surfGain)

    // Start stock sound accent playback if enabled (seagulls)
    this.startAccentPlayback()
  }

  /**
   * Fireplace - Crackling noise with pops
   */
  private createFireplace(): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return

    // Base fire crackle → detailPanner
    const crackleSource = this.audioContext.createBufferSource()
    crackleSource.buffer = this.noiseBuffer
    crackleSource.loop = true

    const crackleFilter = this.audioContext.createBiquadFilter()
    crackleFilter.type = 'bandpass'
    crackleFilter.frequency.value = 1500
    crackleFilter.Q.value = 2

    const crackleGain = this.audioContext.createGain()
    crackleGain.gain.value = 0.25

    crackleSource.connect(crackleFilter)
    crackleFilter.connect(crackleGain)
    crackleGain.connect(this.detailPanner ?? this.masterGain)
    crackleSource.start()

    this.activeBufferSources.push(crackleSource)
    this.activeNodes.push(crackleFilter, crackleGain)

    // Low rumble of fire → basePanner (centered)
    const rumbleSource = this.audioContext.createBufferSource()
    rumbleSource.buffer = this.noiseBuffer
    rumbleSource.loop = true

    const rumbleFilter = this.audioContext.createBiquadFilter()
    rumbleFilter.type = 'lowpass'
    rumbleFilter.frequency.value = 150
    rumbleFilter.Q.value = 0.5

    const rumbleGain = this.audioContext.createGain()
    rumbleGain.gain.value = 0.3

    rumbleSource.connect(rumbleFilter)
    rumbleFilter.connect(rumbleGain)
    rumbleGain.connect(this.basePanner ?? this.masterGain)
    rumbleSource.start()

    this.activeBufferSources.push(rumbleSource)
    this.activeNodes.push(rumbleFilter, rumbleGain)

    // Random pops and crackles → accentPanner with random pan
    const createPop = () => {
      if (!this.audioContext || !this.accentPanner || !this.noiseBuffer || !this.isPlaying) return

      const popSource = this.audioContext.createBufferSource()
      popSource.buffer = this.noiseBuffer

      const popFilter = this.audioContext.createBiquadFilter()
      popFilter.type = 'bandpass'
      popFilter.frequency.value = 2000 + Math.random() * 3000
      popFilter.Q.value = 2.5 // Less resonant/harsh

      const popGain = this.audioContext.createGain()
      const now = this.audioContext.currentTime
      popGain.gain.setValueAtTime(0, now)
      popGain.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.06, now + 0.002) // Gentler pops, softer onset
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02 + Math.random() * 0.03)

      // Random pan position for each pop
      const popPanner = createStereoPanner(this.audioContext, getRandomAccentPan(this.spatialConfig))
      popSource.connect(popFilter)
      popFilter.connect(popGain)
      popGain.connect(popPanner)
      popPanner.connect(this.accentPanner)
      popSource.start(now)
      popSource.stop(now + 0.1)

      // Cleanup panner after sound ends
      setTimeout(() => popPanner.disconnect(), 150)
    }

    // Schedule pops (much fewer)
    const popInterval = setInterval(() => {
      if (Math.random() > 0.8) createPop()
    }, 200) as unknown as number
    this.intervalIds.push(popInterval)

    // Start stock sound accent playback if enabled
    this.startAccentPlayback()
  }

  /**
   * Lo-fi - Soft ambient pads with chord progression
   */
  private createLofi(): void {
    if (!this.audioContext || !this.masterGain) return

    // Chord frequencies (Am7 - Dm7 - Gmaj7 - Cmaj7 style)
    const chords = [
      [220, 261.63, 329.63, 392], // Am7
      [293.66, 349.23, 440, 523.25], // Dm7
      [196, 246.94, 293.66, 369.99], // G
      [261.63, 329.63, 392, 493.88], // Cmaj7
    ]

    let chordIndex = 0

    const playChord = () => {
      if (!this.audioContext || !this.basePanner || !this.isPlaying) return

      const chord = chords[chordIndex]
      chordIndex = (chordIndex + 1) % chords.length

      chord.forEach((freq, i) => {
        const osc = this.audioContext!.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq

        // Slight detuning for warmth (less wobbly)
        const detune = (Math.random() - 0.5) * 6
        osc.detune.value = detune

        const filter = this.audioContext!.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 800
        filter.Q.value = 1

        const noteGain = this.audioContext!.createGain()
        const now = this.audioContext!.currentTime

        // Slower attack, sustain, slow release (dreamier)
        noteGain.gain.setValueAtTime(0, now)
        noteGain.gain.linearRampToValueAtTime(0.08 - i * 0.015, now + 0.7)
        noteGain.gain.setValueAtTime(0.08 - i * 0.015, now + 3)
        noteGain.gain.linearRampToValueAtTime(0.04, now + 4)
        noteGain.gain.linearRampToValueAtTime(0, now + 5)

        // Chord notes go through basePanner (centered, ambient)
        osc.connect(filter)
        filter.connect(noteGain)
        noteGain.connect(this.basePanner!)
        osc.start(now)
        osc.stop(now + 5.5)

        // Track oscillator so it can be stopped when user clicks stop
        this.activeOscillators.push(osc)
        this.activeNodes.push(filter, noteGain)
      })
    }

    // Add vinyl crackle → detailPanner
    const crackleSource = this.audioContext.createBufferSource()
    crackleSource.buffer = this.noiseBuffer
    crackleSource.loop = true

    const crackleFilter = this.audioContext.createBiquadFilter()
    crackleFilter.type = 'highpass'
    crackleFilter.frequency.value = 5000

    const crackleGain = this.audioContext.createGain()
    crackleGain.gain.value = 0.015 // Even more subtle vinyl

    crackleSource.connect(crackleFilter)
    crackleFilter.connect(crackleGain)
    crackleGain.connect(this.detailPanner ?? this.masterGain)
    crackleSource.start()

    this.activeBufferSources.push(crackleSource)
    this.activeNodes.push(crackleFilter, crackleGain)

    // Play initial chord and schedule progression
    playChord()
    const chordInterval = setInterval(playChord, 4000) as unknown as number
    this.intervalIds.push(chordInterval)
  }

  /**
   * White Noise - Simple continuous noise with warmth filter
   */
  private createWhiteNoise(): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return

    const noiseSource = this.audioContext.createBufferSource()
    noiseSource.buffer = this.noiseBuffer
    noiseSource.loop = true

    // Add lowpass filter for warmer, less harsh sound
    const warmthFilter = this.audioContext.createBiquadFilter()
    warmthFilter.type = 'lowpass'
    warmthFilter.frequency.value = 8000
    warmthFilter.Q.value = 0.5

    const noiseGain = this.audioContext.createGain()
    noiseGain.gain.value = 0.35 // Softer default

    // White noise goes through filter → basePanner (centered, simple)
    noiseSource.connect(warmthFilter)
    warmthFilter.connect(noiseGain)
    noiseGain.connect(this.basePanner ?? this.masterGain)
    noiseSource.start()

    this.activeBufferSources.push(noiseSource)
    this.activeNodes.push(warmthFilter, noiseGain)
  }

  // ============================================================================
  // STOCK SOUND ACCENT PLAYBACK
  // ============================================================================

  /**
   * Start accent sound playback loop
   * Schedules random stock sounds at intervals defined in the manifest
   */
  private startAccentPlayback(): void {
    if (!this.useStockSounds || !this.audioContext || !this.accentPanner) return
    if (!hasAccentSounds(this.options.soundscape)) return

    this.stopAccentPlayback()
    this.scheduleNextAccent()
  }

  /**
   * Stop accent sound playback
   */
  private stopAccentPlayback(): void {
    if (this.accentTimeoutId !== null) {
      clearTimeout(this.accentTimeoutId)
      this.accentTimeoutId = null
    }
  }

  /**
   * Schedule the next accent sound
   */
  private scheduleNextAccent(): void {
    if (!this.isPlaying || !this.useStockSounds) return

    const interval = getRandomInterval(this.options.soundscape)
    this.accentTimeoutId = setTimeout(() => {
      this.playRandomAccentSound()
      this.scheduleNextAccent()
    }, interval) as unknown as number
  }

  /**
   * Play a random accent sound from the manifest
   */
  private async playRandomAccentSound(): Promise<void> {
    if (!this.audioContext || !this.accentPanner || !this.isPlaying) return

    const sound = getRandomSound(this.options.soundscape)
    if (!sound) return

    try {
      const buffer = await this.loadStockSound(sound)
      if (!buffer || !this.isPlaying) return

      this.playAccentSound(buffer, sound)
    } catch (error) {
      console.warn('[AmbienceSounds] Failed to play accent sound:', error)
    }
  }

  /**
   * Load a stock sound from Freesound CDN
   * Caches the decoded AudioBuffer for reuse
   */
  private async loadStockSound(sound: StockSound): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null

    // Check cache first
    if (this.stockSoundBuffers.has(sound.id)) {
      return this.stockSoundBuffers.get(sound.id)!
    }

    try {
      const response = await fetch(sound.previewUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

      // Cache the buffer
      this.stockSoundBuffers.set(sound.id, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.warn(`[AmbienceSounds] Failed to load ${sound.name}:`, error)
      return null
    }
  }

  /**
   * Play an accent sound through the accent panner with random positioning
   */
  private playAccentSound(buffer: AudioBuffer, sound: StockSound): void {
    if (!this.audioContext || !this.accentPanner || !this.isPlaying) return

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer

    // Apply random playback rate within the sound's range
    source.playbackRate.value = getRandomPlaybackRate(sound)

    // Create gain for volume control
    const gain = this.audioContext.createGain()
    gain.gain.value = this.accentVolume * sound.volumeMultiplier

    // Create panner with random position
    const panner = createStereoPanner(
      this.audioContext,
      getRandomAccentPan(this.spatialConfig)
    )

    // Connect: source → gain → panner → accentPanner
    source.connect(gain)
    gain.connect(panner)
    panner.connect(this.accentPanner)

    source.start()

    // Cleanup after sound ends
    const duration = (buffer.duration / source.playbackRate.value) * 1000
    setTimeout(() => {
      try {
        source.disconnect()
        gain.disconnect()
        panner.disconnect()
      } catch (e) { /* Already disconnected */ }
    }, duration + 100)
  }

  // ============================================================================
  // SPATIAL AUDIO CONTROL
  // ============================================================================

  /**
   * Set spatial audio preset
   */
  setSpatialPreset(preset: SpatialPreset): void {
    this.spatialPreset = preset
    this.spatialConfig = SPATIAL_PRESETS[preset]

    // Update existing panners
    if (this.basePanner) {
      animatePan(this.basePanner, this.spatialConfig.base, 0.3)
    }
    if (this.detailPanner) {
      // Detail panner uses a side (left or right)
      const side = Math.random() > 0.5 ? 1 : -1
      animatePan(this.detailPanner, this.spatialConfig.detail * side, 0.3)
    }
    if (this.accentPanner) {
      animatePan(this.accentPanner, this.spatialConfig.accent, 0.3)
    }

    // Handle pan oscillation for immersive mode
    if (this.panOscillationCleanup) {
      this.panOscillationCleanup()
      this.panOscillationCleanup = null
    }

    if (this.spatialConfig.movement && this.accentPanner) {
      this.panOscillationCleanup = createPanOscillation(
        this.accentPanner,
        this.spatialConfig
      )
    }
  }

  /**
   * Get current spatial preset
   */
  getSpatialPreset(): SpatialPreset {
    return this.spatialPreset
  }

  /**
   * Set whether to use stock sounds
   */
  setUseStockSounds(enabled: boolean): void {
    this.useStockSounds = enabled
    if (!enabled) {
      this.stopAccentPlayback()
    } else if (this.isPlaying) {
      this.startAccentPlayback()
    }
  }

  /**
   * Set accent volume (0-1)
   */
  setAccentVolume(volume: number): void {
    this.accentVolume = Math.max(0, Math.min(1, volume))
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.options.volume = Math.max(0, Math.min(1, volume))
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.linearRampToValueAtTime(this.options.volume, now + 0.1)
    }
  }

  /**
   * Set soundscape type with optional crossfade
   * @param soundscape - the new soundscape type
   * @param crossfadeDurationMs - crossfade duration (default 500ms, 0 for instant switch)
   */
  async setSoundscape(soundscape: SoundscapeType, crossfadeDurationMs: number = 500): Promise<void> {
    // If same soundscape or not playing, just switch
    if (soundscape === this.options.soundscape) {
      return
    }

    const wasPlaying = this.isPlaying

    if (wasPlaying && crossfadeDurationMs > 0 && this.masterGain && this.audioContext) {
      // Crossfade: fade out old soundscape
      const durationSec = crossfadeDurationMs / 1000
      const now = this.audioContext.currentTime
      const currentVolume = this.masterGain.gain.value

      this.masterGain.gain.setValueAtTime(currentVolume, now)
      this.masterGain.gain.linearRampToValueAtTime(0, now + durationSec)

      // Wait for fade out
      await new Promise(resolve => setTimeout(resolve, crossfadeDurationMs))

      // Switch soundscape
      this.stopAllSounds()
      this.isPlaying = false
      this.options.soundscape = soundscape

      if (soundscape !== 'none') {
        // Start new soundscape at 0 volume
        this.play()

        // Fade in new soundscape
        if (this.masterGain && this.audioContext) {
          const fadeInNow = this.audioContext.currentTime
          this.masterGain.gain.setValueAtTime(0, fadeInNow)
          this.masterGain.gain.linearRampToValueAtTime(this.options.volume, fadeInNow + durationSec)
        }
      }
    } else {
      // Instant switch (no crossfade)
      if (wasPlaying) {
        this.stopAllSounds()
        this.isPlaying = false
      }
      this.options.soundscape = soundscape
      if (wasPlaying && soundscape !== 'none') {
        this.play()
      }
    }
  }

  /**
   * Get current options
   */
  getOptions(): AmbienceSoundOptions {
    return { ...this.options }
  }

  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopAllSounds()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.noiseBuffer = null
    this.masterGain = null
    this.analyserNode = null
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: AmbienceSounds | null = null

/**
 * Get the shared AmbienceSounds instance
 */
export function getAmbienceSounds(): AmbienceSounds {
  if (!instance) {
    instance = new AmbienceSounds()
  }
  return instance
}

/**
 * Initialize the ambience sounds (call after user interaction)
 */
export async function initAmbienceSounds(): Promise<AmbienceSounds> {
  const sounds = getAmbienceSounds()
  await sounds.init()
  return sounds
}

// ============================================================================
// REACT HOOK
// ============================================================================

export interface UseAmbienceSoundsOptions extends Partial<AmbienceSoundOptions> {
  /** Auto-initialize on mount */
  autoInit?: boolean
}

export interface UseAmbienceSoundsReturn {
  /** Play the soundscape */
  play: () => void
  /** Stop the soundscape */
  stop: () => void
  /** Toggle play/stop */
  toggle: () => void
  /** Graceful fade out (for timer completion) */
  fadeOut: (durationMs?: number) => Promise<void>
  /** Set volume */
  setVolume: (volume: number) => void
  /** Set soundscape type */
  setSoundscape: (type: SoundscapeType) => void
  /** Whether currently playing */
  isPlaying: boolean
  /** Current volume */
  volume: number
  /** Current soundscape */
  soundscape: SoundscapeType
  /** Whether initialized */
  initialized: boolean
  /** Get analyser for visualizations */
  getAnalyser: () => AnalyserNode | null
  /** Set spatial audio preset */
  setSpatialPreset: (preset: SpatialPreset) => void
  /** Current spatial preset */
  spatialPreset: SpatialPreset
  /** Set whether to use stock sounds */
  setUseStockSounds: (enabled: boolean) => void
  /** Set accent volume */
  setAccentVolume: (volume: number) => void
  /** Set sleep timer in minutes (0 to disable) */
  setSleepTimer: (minutes: number) => void
  /** Clear sleep timer */
  clearSleepTimer: () => void
  /** Sleep timer duration in minutes (0 if disabled) */
  sleepTimer: number
  /** Remaining time in seconds (null if no timer) */
  sleepTimerRemaining: number | null
}

/**
 * React hook for ambient soundscapes
 */
export function useAmbienceSounds(
  options: UseAmbienceSoundsOptions = {}
): UseAmbienceSoundsReturn {
  const { autoInit = true, ...soundOptions } = options

  const soundsRef = useRef<AmbienceSounds | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(soundOptions.volume ?? 0.3)
  const [soundscape, setSoundscapeState] = useState<SoundscapeType>(
    soundOptions.soundscape ?? 'rain'
  )
  const [spatialPreset, setSpatialPresetState] = useState<SpatialPreset>('stereo')

  // Sleep timer state
  const [sleepTimer, setSleepTimerState] = useState(0) // minutes
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null) // seconds
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sleepCountdownRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize
  useEffect(() => {
    const sounds = getAmbienceSounds()
    soundsRef.current = sounds

    if (autoInit) {
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
    }
  }, [autoInit])

  const play = useCallback(() => {
    soundsRef.current?.play()
    setIsPlaying(true)
  }, [])

  const stop = useCallback(() => {
    soundsRef.current?.stop()
    setIsPlaying(false)
  }, [])

  const fadeOut = useCallback(async (durationMs?: number) => {
    await soundsRef.current?.fadeOut(durationMs)
    setIsPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop()
    } else {
      play()
    }
  }, [isPlaying, play, stop])

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value))
    setVolumeState(clamped)
    soundsRef.current?.setVolume(clamped)
  }, [])

  const setSoundscape = useCallback((type: SoundscapeType) => {
    setSoundscapeState(type)
    soundsRef.current?.setSoundscape(type)
  }, [])

  const getAnalyser = useCallback(() => {
    return soundsRef.current?.getAnalyser() ?? null
  }, [])

  const setSpatialPreset = useCallback((preset: SpatialPreset) => {
    setSpatialPresetState(preset)
    soundsRef.current?.setSpatialPreset(preset)
  }, [])

  const setUseStockSounds = useCallback((enabled: boolean) => {
    soundsRef.current?.setUseStockSounds(enabled)
  }, [])

  const setAccentVolume = useCallback((value: number) => {
    soundsRef.current?.setAccentVolume(value)
  }, [])

  // Clear sleep timer
  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current)
      sleepTimerRef.current = null
    }
    if (sleepCountdownRef.current) {
      clearInterval(sleepCountdownRef.current)
      sleepCountdownRef.current = null
    }
    setSleepTimerState(0)
    setSleepTimerRemaining(null)
  }, [])

  // Set sleep timer (minutes)
  const setSleepTimer = useCallback((minutes: number) => {
    // Clear any existing timer
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current)
    }
    if (sleepCountdownRef.current) {
      clearInterval(sleepCountdownRef.current)
    }

    if (minutes <= 0) {
      clearSleepTimer()
      return
    }

    const seconds = minutes * 60
    setSleepTimerState(minutes)
    setSleepTimerRemaining(seconds)

    // Countdown interval
    sleepCountdownRef.current = setInterval(() => {
      setSleepTimerRemaining(prev => {
        if (prev === null || prev <= 1) {
          return null
        }
        return prev - 1
      })
    }, 1000)

    // Main timer - fade out when complete
    sleepTimerRef.current = setTimeout(async () => {
      await soundsRef.current?.fadeOut(5000) // 5 second fade out
      setIsPlaying(false)
      clearSleepTimer()
    }, seconds * 1000)
  }, [clearSleepTimer])

  // Clear timer when sound stops
  useEffect(() => {
    if (!isPlaying && sleepTimerRef.current) {
      clearSleepTimer()
    }
  }, [isPlaying, clearSleepTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
      if (sleepCountdownRef.current) clearInterval(sleepCountdownRef.current)
    }
  }, [])

  return {
    play,
    stop,
    toggle,
    fadeOut,
    setVolume,
    setSoundscape,
    isPlaying,
    volume,
    soundscape,
    initialized,
    getAnalyser,
    setSpatialPreset,
    spatialPreset,
    setUseStockSounds,
    setAccentVolume,
    setSleepTimer,
    clearSleepTimer,
    sleepTimer,
    sleepTimerRemaining,
  }
}
