/**
 * Microphone Audio Service
 * @module lib/audio/microphoneAudio
 *
 * Handles microphone access, calibration, and audio analysis for visualizations.
 * Processes audio locally - never records or transmits data.
 */

export type MicrophoneStatus = 'idle' | 'requesting' | 'calibrating' | 'active' | 'denied' | 'error'

export interface MicrophoneAudioState {
  status: MicrophoneStatus
  noiseFloor: number
  isCalibrated: boolean
  errorMessage?: string
}

interface MicrophoneAudioOptions {
  fftSize?: number
  smoothingTimeConstant?: number
  calibrationDuration?: number
  beatSensitivity?: number  // 0-1, higher = more sensitive
  beatCooldownMs?: number
}

const DEFAULT_OPTIONS: Required<MicrophoneAudioOptions> = {
  fftSize: 256,
  smoothingTimeConstant: 0.6,
  calibrationDuration: 3000,
  beatSensitivity: 0.5,     // Default medium sensitivity
  beatCooldownMs: 100,
}

const STORAGE_KEY = 'mic-audio-calibration'

/**
 * Microphone Audio Service
 * Manages microphone access, noise calibration, and frequency analysis
 */
class MicrophoneAudioService {
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private analyserNode: AnalyserNode | null = null
  private options: Required<MicrophoneAudioOptions>

  private _status: MicrophoneStatus = 'idle'
  private _noiseFloor: number = 0
  private _isCalibrated: boolean = false
  private _errorMessage?: string

  private dataArray: Uint8Array<ArrayBuffer> | null = null
  private normalizedDataArray: Uint8Array<ArrayBuffer> | null = null

  // Callbacks for state changes
  private onStateChange?: (state: MicrophoneAudioState) => void

  constructor(options: MicrophoneAudioOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    // Try to restore calibration from localStorage
    this.loadCalibration()
  }

  // Getters
  get status(): MicrophoneStatus { return this._status }
  get noiseFloor(): number { return this._noiseFloor }
  get isCalibrated(): boolean { return this._isCalibrated }
  get errorMessage(): string | undefined { return this._errorMessage }

  /**
   * Set state change callback
   */
  setOnStateChange(callback: (state: MicrophoneAudioState) => void): void {
    this.onStateChange = callback
  }

  /**
   * Get current state
   */
  getState(): MicrophoneAudioState {
    return {
      status: this._status,
      noiseFloor: this._noiseFloor,
      isCalibrated: this._isCalibrated,
      errorMessage: this._errorMessage,
    }
  }

  /**
   * Update status and notify
   */
  private setStatus(status: MicrophoneStatus, errorMessage?: string): void {
    this._status = status
    this._errorMessage = errorMessage
    this.onStateChange?.(this.getState())
  }

  /**
   * Load calibration from localStorage
   */
  private loadCalibration(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (typeof data.noiseFloor === 'number') {
          this._noiseFloor = data.noiseFloor
          this._isCalibrated = true
        }
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Save calibration to localStorage
   */
  private saveCalibration(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        noiseFloor: this._noiseFloor,
        timestamp: Date.now(),
      }))
    } catch {
      // Ignore errors
    }
  }

  /**
   * Request microphone permission and initialize audio context
   */
  async requestPermission(): Promise<boolean> {
    if (this._status === 'active') {
      return true
    }

    this.setStatus('requesting')

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      // Create audio context
      this.audioContext = new AudioContext()

      // Resume if suspended (required after user interaction)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream)

      // Create analyser
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = this.options.fftSize
      this.analyserNode.smoothingTimeConstant = this.options.smoothingTimeConstant

      // Connect source → analyser (NOT to destination - avoid feedback!)
      this.sourceNode.connect(this.analyserNode)

      // Initialize data arrays
      const bufferLength = this.analyserNode.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)
      this.normalizedDataArray = new Uint8Array(bufferLength)

      this.setStatus('active')
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Microphone access denied'

      if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
        this.setStatus('denied', 'Microphone access was denied. Please allow access in your browser settings.')
      } else {
        this.setStatus('error', message)
      }

      return false
    }
  }

  /**
   * Start noise floor calibration
   * Records ambient noise for the specified duration and calculates threshold
   */
  async startCalibration(): Promise<number> {
    if (!this.analyserNode || !this.dataArray) {
      throw new Error('Microphone not initialized. Call requestPermission first.')
    }

    this.setStatus('calibrating')

    const samples: number[] = []
    const startTime = Date.now()
    const duration = this.options.calibrationDuration

    return new Promise((resolve) => {
      const collectSample = () => {
        if (!this.analyserNode || !this.dataArray) {
          resolve(0)
          return
        }

        const elapsed = Date.now() - startTime

        if (elapsed >= duration) {
          // Calculate noise floor using 75th percentile
          // This handles occasional spikes better than average
          samples.sort((a, b) => a - b)
          const percentileIndex = Math.floor(samples.length * 0.75)
          this._noiseFloor = samples[percentileIndex] || 0
          this._isCalibrated = true

          // Save to localStorage
          this.saveCalibration()

          this.setStatus('active')
          resolve(this._noiseFloor)
          return
        }

        // Collect frequency data
        this.analyserNode.getByteFrequencyData(this.dataArray)

        // Calculate average level (normalized 0-1)
        const sum = this.dataArray.reduce((a, b) => a + b, 0)
        const avg = sum / this.dataArray.length / 255
        samples.push(avg)

        requestAnimationFrame(collectSample)
      }

      requestAnimationFrame(collectSample)
    })
  }

  /**
   * Get the AnalyserNode for direct visualization
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode
  }

  /**
   * Get raw frequency data
   */
  getFrequencyData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyserNode || !this.dataArray) return null
    this.analyserNode.getByteFrequencyData(this.dataArray)
    return this.dataArray
  }

  /**
   * Get frequency data normalized by noise floor
   * Subtracts noise floor and rescales to 0-255 range
   */
  getNormalizedFrequencyData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyserNode || !this.dataArray || !this.normalizedDataArray) {
      return null
    }

    this.analyserNode.getByteFrequencyData(this.dataArray)

    const noiseFloorValue = this._noiseFloor * 255
    const scale = 255 / (255 - noiseFloorValue)

    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = Math.max(0, this.dataArray[i] - noiseFloorValue) * scale
      this.normalizedDataArray[i] = Math.min(255, normalized)
    }

    return this.normalizedDataArray
  }

  /**
   * Get frequency band levels (bass, mid, high)
   * Returns normalized values 0-1
   */
  getFrequencyBands(): { bass: number; mid: number; high: number } {
    const data = this.getNormalizedFrequencyData()
    if (!data || data.length === 0) {
      return { bass: 0, mid: 0, high: 0 }
    }

    const length = data.length

    // Split into thirds (roughly: 0-85Hz, 85-500Hz, 500Hz+)
    const bassEnd = Math.floor(length * 0.1)
    const midEnd = Math.floor(length * 0.5)

    const bassSum = data.slice(0, bassEnd).reduce((a, b) => a + b, 0)
    const midSum = data.slice(bassEnd, midEnd).reduce((a, b) => a + b, 0)
    const highSum = data.slice(midEnd).reduce((a, b) => a + b, 0)

    return {
      bass: bassSum / bassEnd / 255,
      mid: midSum / (midEnd - bassEnd) / 255,
      high: highSum / (length - midEnd) / 255,
    }
  }

  /**
   * Beat detection based on bass frequency with configurable sensitivity
   */
  private lastBassLevel = 0
  private beatCooldown = 0

  detectBeat(): boolean {
    const now = Date.now()
    if (now < this.beatCooldown) {
      return false
    }

    const bands = this.getFrequencyBands()
    const bassJump = bands.bass - this.lastBassLevel
    this.lastBassLevel = bands.bass

    // Sensitivity affects threshold: higher sensitivity = lower threshold
    // sensitivity 0 = threshold 0.3, sensitivity 1 = threshold 0.05
    const threshold = 0.3 - (this.options.beatSensitivity * 0.25)
    const minBassLevel = 0.4 - (this.options.beatSensitivity * 0.2)

    // Detect sudden bass increase above threshold
    if (bassJump > threshold && bands.bass > minBassLevel) {
      this.beatCooldown = now + this.options.beatCooldownMs
      return true
    }

    return false
  }

  /**
   * Get current beat sensitivity (0-1)
   */
  getBeatSensitivity(): number {
    return this.options.beatSensitivity
  }

  /**
   * Set beat sensitivity (0-1, higher = more sensitive)
   */
  setBeatSensitivity(value: number): void {
    this.options.beatSensitivity = Math.max(0, Math.min(1, value))
  }

  /**
   * Clear saved calibration
   */
  clearCalibration(): void {
    this._noiseFloor = 0
    this._isCalibrated = false
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore errors
    }
    this.onStateChange?.(this.getState())
  }

  /**
   * Stop microphone and release resources
   */
  stop(): void {
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    // Disconnect nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
    }

    this.analyserNode = null
    this.dataArray = null
    this.normalizedDataArray = null

    this.setStatus('idle')
  }

  /**
   * Check if microphone is supported
   */
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }
}

// Singleton instance
let microphoneService: MicrophoneAudioService | null = null

/**
 * Get the singleton microphone audio service
 */
export function getMicrophoneAudioService(): MicrophoneAudioService {
  if (!microphoneService) {
    microphoneService = new MicrophoneAudioService()
  }
  return microphoneService
}

/**
 * Create a new microphone audio service instance
 * Use this if you need multiple independent instances
 */
export function createMicrophoneAudioService(
  options?: MicrophoneAudioOptions
): MicrophoneAudioService {
  return new MicrophoneAudioService(options)
}

export { MicrophoneAudioService }
