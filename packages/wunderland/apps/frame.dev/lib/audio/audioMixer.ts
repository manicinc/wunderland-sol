/**
 * Audio Mixer
 * @module lib/audio/audioMixer
 *
 * @description
 * Mix multiple audio streams with individual gain control using WebAudio API.
 * Supports real-time level monitoring for VU meters.
 */

import type { MixerConfig, MixerSource, AudioSourceType } from './types'
import { DEFAULT_MIXER_CONFIG, AudioError, AudioErrorType } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   INTERNAL TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface InternalSource {
  id: string
  type: AudioSourceType
  stream: MediaStream
  sourceNode: MediaStreamAudioSourceNode
  gainNode: GainNode
  analyserNode: AnalyserNode
  muted: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIO MIXER CLASS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * AudioMixer - Combine multiple audio streams with gain control
 *
 * @example
 * ```typescript
 * const mixer = new AudioMixer()
 *
 * // Add microphone
 * const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
 * mixer.addSource('mic', 'microphone', micStream, 1.0)
 *
 * // Add system audio
 * const systemStream = await getSystemAudio('tab')
 * mixer.addSource('system', 'tab', systemStream, 0.8)
 *
 * // Get mixed output for recording
 * const mixedStream = mixer.getOutputStream()
 * const recorder = new MediaRecorder(mixedStream)
 *
 * // Adjust levels
 * mixer.setGain('mic', 1.2)
 * mixer.setGain('system', 0.5)
 *
 * // Get levels for VU meter
 * const levels = mixer.getLevels()
 *
 * // Cleanup
 * mixer.dispose()
 * ```
 */
export class AudioMixer {
  private context: AudioContext
  private destination: MediaStreamAudioDestinationNode
  private sources: Map<string, InternalSource> = new Map()
  private config: MixerConfig
  private levelUpdateCallback?: (levels: Map<string, number>) => void
  private levelAnimationFrame?: number

  constructor(config: Partial<MixerConfig> = {}) {
    this.config = { ...DEFAULT_MIXER_CONFIG, ...config }

    try {
      this.context = new AudioContext({
        sampleRate: this.config.outputSampleRate,
      })
      this.destination = this.context.createMediaStreamDestination()
    } catch (error) {
      throw new AudioError(
        AudioErrorType.MIXER_ERROR,
        `Failed to create AudioContext: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SOURCE MANAGEMENT
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Add an audio source to the mixer
   */
  addSource(
    id: string,
    type: AudioSourceType,
    stream: MediaStream,
    gain: number = 1.0
  ): void {
    // Remove existing source with same ID
    if (this.sources.has(id)) {
      this.removeSource(id)
    }

    try {
      // Create source node from stream
      const sourceNode = this.context.createMediaStreamSource(stream)

      // Create gain node for volume control
      const gainNode = this.context.createGain()
      gainNode.gain.value = gain

      // Create analyser for level monitoring
      const analyserNode = this.context.createAnalyser()
      analyserNode.fftSize = 256
      analyserNode.smoothingTimeConstant = 0.3

      // Connect: source -> gain -> analyser -> destination
      sourceNode.connect(gainNode)
      gainNode.connect(analyserNode)
      analyserNode.connect(this.destination)

      this.sources.set(id, {
        id,
        type,
        stream,
        sourceNode,
        gainNode,
        analyserNode,
        muted: false,
      })
    } catch (error) {
      throw new AudioError(
        AudioErrorType.MIXER_ERROR,
        `Failed to add source ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Remove an audio source from the mixer
   */
  removeSource(id: string): boolean {
    const source = this.sources.get(id)
    if (!source) return false

    // Disconnect nodes
    try {
      source.analyserNode.disconnect()
      source.gainNode.disconnect()
      source.sourceNode.disconnect()
    } catch {
      // Ignore disconnection errors
    }

    this.sources.delete(id)
    return true
  }

  /**
   * Check if a source exists
   */
  hasSource(id: string): boolean {
    return this.sources.has(id)
  }

  /**
   * Get all source IDs
   */
  getSourceIds(): string[] {
    return Array.from(this.sources.keys())
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     GAIN CONTROL
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Set gain for a source (0-2, where 1 is unity gain)
   */
  setGain(id: string, gain: number): boolean {
    const source = this.sources.get(id)
    if (!source) return false

    // Clamp gain to 0-2 range
    const clampedGain = Math.max(0, Math.min(2, gain))
    source.gainNode.gain.setValueAtTime(clampedGain, this.context.currentTime)
    return true
  }

  /**
   * Get current gain for a source
   */
  getGain(id: string): number | null {
    const source = this.sources.get(id)
    return source?.gainNode.gain.value ?? null
  }

  /**
   * Mute a source (preserves gain setting)
   */
  mute(id: string): boolean {
    const source = this.sources.get(id)
    if (!source) return false

    source.muted = true
    source.gainNode.gain.setValueAtTime(0, this.context.currentTime)
    return true
  }

  /**
   * Unmute a source (restores previous gain)
   */
  unmute(id: string, gain?: number): boolean {
    const source = this.sources.get(id)
    if (!source) return false

    source.muted = false
    const targetGain = gain ?? (id === 'mic' ? this.config.micGain : this.config.systemGain)
    source.gainNode.gain.setValueAtTime(targetGain, this.context.currentTime)
    return true
  }

  /**
   * Check if a source is muted
   */
  isMuted(id: string): boolean {
    return this.sources.get(id)?.muted ?? false
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LEVEL MONITORING
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Get current audio level for a source (0-1)
   */
  getLevel(id: string): number {
    const source = this.sources.get(id)
    if (!source) return 0

    const dataArray = new Uint8Array(source.analyserNode.frequencyBinCount)
    source.analyserNode.getByteFrequencyData(dataArray)

    // Calculate RMS average
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)

    // Normalize to 0-1
    return rms / 255
  }

  /**
   * Get levels for all sources
   */
  getLevels(): Map<string, number> {
    const levels = new Map<string, number>()
    for (const id of this.sources.keys()) {
      levels.set(id, this.getLevel(id))
    }
    return levels
  }

  /**
   * Start continuous level monitoring
   * Calls the callback with updated levels at ~60fps
   */
  startLevelMonitoring(callback: (levels: Map<string, number>) => void): void {
    this.levelUpdateCallback = callback

    const updateLevels = () => {
      if (this.levelUpdateCallback) {
        this.levelUpdateCallback(this.getLevels())
        this.levelAnimationFrame = requestAnimationFrame(updateLevels)
      }
    }

    updateLevels()
  }

  /**
   * Stop level monitoring
   */
  stopLevelMonitoring(): void {
    this.levelUpdateCallback = undefined
    if (this.levelAnimationFrame) {
      cancelAnimationFrame(this.levelAnimationFrame)
      this.levelAnimationFrame = undefined
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     OUTPUT
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Get the mixed output stream for recording
   */
  getOutputStream(): MediaStream {
    return this.destination.stream
  }

  /**
   * Get info about all sources
   */
  getSources(): MixerSource[] {
    return Array.from(this.sources.values()).map(source => ({
      id: source.id,
      type: source.type,
      gain: source.gainNode.gain.value,
      muted: source.muted,
      level: this.getLevel(source.id),
    }))
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LIFECYCLE
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Resume audio context (needed after user interaction)
   */
  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  /**
   * Suspend audio context (reduce CPU usage when not recording)
   */
  async suspend(): Promise<void> {
    if (this.context.state === 'running') {
      await this.context.suspend()
    }
  }

  /**
   * Get audio context state
   */
  getState(): AudioContextState {
    return this.context.state
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    // Stop level monitoring
    this.stopLevelMonitoring()

    // Remove all sources
    for (const id of this.sources.keys()) {
      this.removeSource(id)
    }

    // Close audio context
    if (this.context.state !== 'closed') {
      this.context.close().catch(console.error)
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FACTORY FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a mixer with microphone and system audio
 */
export async function createMixedRecordingSetup(
  micStream: MediaStream,
  systemStream: MediaStream,
  config?: Partial<MixerConfig>
): Promise<{ mixer: AudioMixer; outputStream: MediaStream }> {
  const mixer = new AudioMixer(config)

  mixer.addSource('mic', 'microphone', micStream, config?.micGain ?? 1.0)
  mixer.addSource('system', 'tab', systemStream, config?.systemGain ?? 0.8)

  await mixer.resume()

  return {
    mixer,
    outputStream: mixer.getOutputStream(),
  }
}

/**
 * Create a simple pass-through mixer for a single source
 */
export function createSingleSourceMixer(
  stream: MediaStream,
  type: AudioSourceType = 'microphone'
): AudioMixer {
  const mixer = new AudioMixer()
  mixer.addSource('main', type, stream)
  return mixer
}
