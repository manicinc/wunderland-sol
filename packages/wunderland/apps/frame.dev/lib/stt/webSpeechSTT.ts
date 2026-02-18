/**
 * Web Speech API STT Provider
 * @module lib/stt/webSpeechSTT
 *
 * Uses the browser's built-in Web Speech API for transcription.
 * Free, works offline in some browsers, but lower quality than Whisper.
 */

import type { STTProvider, STTResult, WebSpeechConfig } from './types'

// Web Speech API types (not in TypeScript by default)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event & { error?: string }) => void) | null
  onend: (() => void) | null
  onaudioend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

/**
 * Check if Web Speech API is available
 */
export function isWebSpeechAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/**
 * Create a Web Speech API provider
 */
export function createWebSpeechProvider(config?: Partial<WebSpeechConfig>): STTProvider {
  return {
    name: 'web-speech',
    displayName: 'Browser Speech',
    description: 'Free browser-based recognition (works offline)',

    async isAvailable(): Promise<boolean> {
      return isWebSpeechAvailable()
    },

    async transcribe(audio: Blob): Promise<STTResult> {
      // Web Speech API works with live audio streams, not blobs
      // For blob transcription, we need to play the audio and capture it
      // This is a limitation - Web Speech is best used for real-time capture

      return new Promise((resolve, reject) => {
        if (!isWebSpeechAvailable()) {
          reject(new Error('Web Speech API not available in this browser'))
          return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = config?.continuous ?? true
        recognition.interimResults = config?.interimResults ?? false
        recognition.lang = config?.language || 'en-US'

        let finalTranscript = ''
        let totalConfidence = 0
        let resultCount = 0

        // Create audio element to play the blob
        const audioUrl = URL.createObjectURL(audio)
        const audioElement = new Audio(audioUrl)

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript + ' '
              totalConfidence += result[0].confidence
              resultCount++
            }
          }
        }

        recognition.onerror = (event) => {
          audioElement.pause()
          URL.revokeObjectURL(audioUrl)
          reject(new Error(`Speech recognition error: ${event.error || 'unknown'}`))
        }

        recognition.onend = () => {
          audioElement.pause()
          URL.revokeObjectURL(audioUrl)
          resolve({
            transcript: finalTranscript.trim(),
            confidence: resultCount > 0 ? totalConfidence / resultCount : undefined,
          })
        }

        audioElement.onended = () => {
          // Give recognition a moment to process final audio
          setTimeout(() => {
            recognition.stop()
          }, 500)
        }

        audioElement.onerror = () => {
          recognition.abort()
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Failed to play audio for transcription'))
        }

        // Start recognition and play audio
        try {
          recognition.start()
          audioElement.play().catch((err) => {
            recognition.abort()
            URL.revokeObjectURL(audioUrl)
            reject(new Error(`Failed to play audio: ${err.message}`))
          })
        } catch (err) {
          URL.revokeObjectURL(audioUrl)
          reject(err)
        }
      })
    },
  }
}

/**
 * Real-time transcription helper for VoiceRecorder
 * This is used during live recording, not for blob transcription
 */
export interface RealtimeTranscription {
  start(): void
  stop(): void
  onTranscript: (final: string, interim: string) => void
  onError: (error: Error) => void
}

export function createRealtimeTranscription(
  config?: Partial<WebSpeechConfig>
): RealtimeTranscription | null {
  if (!isWebSpeechAvailable()) return null

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()

  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = config?.language || 'en-US'

  let finalTranscript = ''
  let isRunning = false

  const transcription: RealtimeTranscription = {
    onTranscript: () => {},
    onError: () => {},

    start() {
      if (isRunning) return
      finalTranscript = ''
      isRunning = true

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' '
          } else {
            interim += result[0].transcript
          }
        }
        this.onTranscript(finalTranscript.trim(), interim)
      }

      recognition.onerror = (event) => {
        this.onError(new Error(`Speech recognition error: ${event.error || 'unknown'}`))
      }

      recognition.onend = () => {
        // Auto-restart if still supposed to be running
        if (isRunning) {
          try {
            recognition.start()
          } catch {
            // Ignore - may already be running
          }
        }
      }

      try {
        recognition.start()
      } catch (err) {
        isRunning = false
        this.onError(err as Error)
      }
    },

    stop() {
      isRunning = false
      try {
        recognition.stop()
      } catch {
        // Ignore
      }
    },
  }

  return transcription
}

/**
 * Default Web Speech provider instance
 */
export const webSpeechProvider = createWebSpeechProvider()
