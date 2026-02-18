/**
 * Speech-to-Text Service Types
 * @module lib/stt/types
 */

/**
 * Available STT engines
 */
export type STTEngine = 'web-speech' | 'whisper'

/**
 * STT transcription result
 */
export interface STTResult {
  /** The transcribed text */
  transcript: string
  /** Confidence score (0-1) if available */
  confidence?: number
  /** Audio duration in seconds */
  duration?: number
  /** Language detected or used */
  language?: string
}

/**
 * STT provider interface
 */
export interface STTProvider {
  /** Engine identifier */
  name: STTEngine
  /** Display name for UI */
  displayName: string
  /** Transcribe audio blob */
  transcribe(audio: Blob): Promise<STTResult>
  /** Check if this provider is available (has required API keys, etc.) */
  isAvailable(): Promise<boolean>
  /** Description for UI */
  description: string
}

/**
 * Configuration for Whisper API
 */
export interface WhisperConfig {
  /** OpenAI API key */
  apiKey: string
  /** Model to use (default: whisper-1) */
  model?: string
  /** Language hint (ISO 639-1 code) */
  language?: string
  /** Response format */
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
  /** Temperature for sampling */
  temperature?: number
}

/**
 * Configuration for Web Speech API
 */
export interface WebSpeechConfig {
  /** Language for recognition (default: en-US) */
  language?: string
  /** Enable continuous recognition */
  continuous?: boolean
  /** Include interim results */
  interimResults?: boolean
}

/**
 * Engine availability info for UI
 */
export interface STTEngineInfo {
  engine: STTEngine
  displayName: string
  description: string
  available: boolean
  reason?: string // Why unavailable (e.g., "No API key configured")
}
