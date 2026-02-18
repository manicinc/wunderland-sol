/**
 * Browser Voice Provider
 * @module lib/voice/providers/browser
 * 
 * Uses Web Speech API for free, offline-capable TTS and STT.
 */

import type {
  TTSProviderInterface,
  STTProviderInterface,
  TTSVoice,
  TTSOptions,
  TTSResult,
  STTOptions,
  STTResult,
} from './types'

// ============================================================================
// FEATURE DETECTION
// ============================================================================

export function isBrowserTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function isBrowserSTTAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

// ============================================================================
// TTS PROVIDER
// ============================================================================

export class BrowserTTSProvider implements TTSProviderInterface {
  name = 'browser' as const
  displayName = 'Browser TTS'
  description = 'Free, offline-capable speech synthesis'
  qualityRating = 2

  private cachedVoices: TTSVoice[] | null = null

  async isAvailable(): Promise<boolean> {
    return isBrowserTTSAvailable()
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (this.cachedVoices) return this.cachedVoices
    if (!isBrowserTTSAvailable()) return []

    return new Promise((resolve) => {
      const synth = window.speechSynthesis
      
      const loadVoices = () => {
        const voices = synth.getVoices()
        this.cachedVoices = voices.map((v) => ({
          id: v.voiceURI,
          name: v.name,
          language: v.lang,
          gender: guessGender(v.name),
        }))
        resolve(this.cachedVoices)
      }

      // Voices may not be loaded immediately
      if (synth.getVoices().length > 0) {
        loadVoices()
      } else {
        synth.onvoiceschanged = loadVoices
        // Fallback timeout
        setTimeout(() => {
          if (!this.cachedVoices) loadVoices()
        }, 1000)
      }
    })
  }

  async speak(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!isBrowserTTSAvailable()) {
      throw new Error('Browser TTS not available')
    }

    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis
      const utterance = new SpeechSynthesisUtterance(text)

      // Apply options
      if (options.voiceId) {
        const voices = synth.getVoices()
        const voice = voices.find((v) => v.voiceURI === options.voiceId)
        if (voice) utterance.voice = voice
      }

      utterance.rate = options.rate ?? 1.0
      utterance.pitch = options.pitch ?? 1.0
      utterance.volume = options.volume ?? 1.0

      // Track timing
      let startTime: number

      utterance.onstart = () => {
        startTime = Date.now()
      }

      utterance.onend = () => {
        const duration = (Date.now() - startTime) / 1000
        // Browser TTS doesn't provide audio blob directly
        // Return empty blob as placeholder
        resolve({
          audio: new Blob([], { type: 'audio/wav' }),
          duration,
          characterCount: text.length,
        })
      }

      utterance.onerror = (event) => {
        reject(new Error(`Browser TTS error: ${event.error}`))
      }

      synth.speak(utterance)
    })
  }

  /**
   * Speak directly without returning audio blob (more efficient for playback)
   */
  speakDirect(text: string, options: TTSOptions = {}): SpeechSynthesisUtterance | null {
    if (!isBrowserTTSAvailable()) return null

    const synth = window.speechSynthesis
    const utterance = new SpeechSynthesisUtterance(text)

    if (options.voiceId) {
      const voices = synth.getVoices()
      const voice = voices.find((v) => v.voiceURI === options.voiceId)
      if (voice) utterance.voice = voice
    }

    utterance.rate = options.rate ?? 1.0
    utterance.pitch = options.pitch ?? 1.0
    utterance.volume = options.volume ?? 1.0

    synth.speak(utterance)
    return utterance
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (isBrowserTTSAvailable()) {
      window.speechSynthesis.cancel()
    }
  }
}

// ============================================================================
// STT PROVIDER
// ============================================================================

export class BrowserSTTProvider implements STTProviderInterface {
  name = 'browser' as const
  displayName = 'Browser STT'
  description = 'Free, real-time speech recognition'
  qualityRating = 2
  supportsRealtime = true

  async isAvailable(): Promise<boolean> {
    return isBrowserSTTAvailable()
  }

  async transcribe(audio: Blob, options: STTOptions = {}): Promise<STTResult> {
    // Browser STT doesn't support file-based transcription
    // It only works with live microphone input
    throw new Error(
      'Browser STT only supports real-time transcription. Use createRealtimeTranscription() instead.'
    )
  }

  /**
   * Create a real-time transcription session
   */
  createRealtimeSession(options: STTOptions = {}): RealtimeSTTSession | null {
    if (!isBrowserSTTAvailable()) return null

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = options.language || 'en-US'

    return new RealtimeSTTSession(recognition)
  }
}

// ============================================================================
// REALTIME SESSION
// ============================================================================

export class RealtimeSTTSession {
  private recognition: SpeechRecognition
  private finalTranscript = ''
  private isRunning = false

  onTranscript: (final: string, interim: string) => void = () => {}
  onError: (error: Error) => void = () => {}
  onEnd: () => void = () => {}

  constructor(recognition: SpeechRecognition) {
    this.recognition = recognition
    this.setupHandlers()
  }

  private setupHandlers() {
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          this.finalTranscript += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      this.onTranscript(this.finalTranscript.trim(), interim)
    }

    this.recognition.onerror = (event) => {
      this.onError(new Error(`Speech recognition error: ${event.error}`))
    }

    this.recognition.onend = () => {
      if (this.isRunning) {
        // Auto-restart if still active
        try {
          this.recognition.start()
        } catch {
          this.isRunning = false
          this.onEnd()
        }
      } else {
        this.onEnd()
      }
    }
  }

  start(): void {
    if (this.isRunning) return
    this.finalTranscript = ''
    this.isRunning = true
    try {
      this.recognition.start()
    } catch (err) {
      this.isRunning = false
      this.onError(err as Error)
    }
  }

  stop(): void {
    this.isRunning = false
    try {
      this.recognition.stop()
    } catch {
      // Ignore
    }
  }

  getTranscript(): string {
    return this.finalTranscript.trim()
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function guessGender(name: string): 'male' | 'female' | 'neutral' {
  const lower = name.toLowerCase()
  const femaleNames = ['samantha', 'karen', 'victoria', 'susan', 'zira', 'hazel', 'fiona', 'moira']
  const maleNames = ['david', 'daniel', 'alex', 'tom', 'james', 'google uk english male']
  
  if (femaleNames.some((n) => lower.includes(n))) return 'female'
  if (maleNames.some((n) => lower.includes(n))) return 'male'
  if (lower.includes('female')) return 'female'
  if (lower.includes('male')) return 'male'
  return 'neutral'
}

// ============================================================================
// EXPORTS
// ============================================================================

export const browserTTS = new BrowserTTSProvider()
export const browserSTT = new BrowserSTTProvider()





