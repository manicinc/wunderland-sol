/**
 * Voice Provider Types
 * @module lib/voice/providers/types
 * 
 * Unified types for TTS (Text-to-Speech) and STT (Speech-to-Text) providers.
 */

// ============================================================================
// PROVIDER IDENTIFIERS
// ============================================================================

export type VoiceProviderType = 'browser' | 'elevenlabs' | 'openai'

export type TTSProvider = VoiceProviderType
export type STTProvider = 'browser' | 'whisper' | 'elevenlabs'

// ============================================================================
// TTS TYPES
// ============================================================================

export interface TTSVoice {
  id: string
  name: string
  language: string
  gender?: 'male' | 'female' | 'neutral'
  preview?: string // URL to voice preview
}

export interface TTSOptions {
  /** Voice ID to use */
  voiceId?: string
  /** Speech rate (0.5 - 2.0) */
  rate?: number
  /** Pitch (0.5 - 2.0) */
  pitch?: number
  /** Volume (0 - 1) */
  volume?: number
  /** Stability for ElevenLabs (0 - 1) */
  stability?: number
  /** Similarity boost for ElevenLabs (0 - 1) */
  similarityBoost?: number
}

export interface TTSResult {
  /** Audio blob */
  audio: Blob
  /** Audio duration in seconds */
  duration?: number
  /** Characters processed */
  characterCount: number
}

export interface TTSProviderInterface {
  /** Provider identifier */
  name: TTSProvider
  /** Display name for UI */
  displayName: string
  /** Description */
  description: string
  /** Check availability */
  isAvailable(): Promise<boolean>
  /** Get available voices */
  getVoices(): Promise<TTSVoice[]>
  /** Convert text to speech */
  speak(text: string, options?: TTSOptions): Promise<TTSResult>
  /** Estimated cost per 1000 characters (for paid services) */
  costPer1000Chars?: number
  /** Quality rating for UI (1-5) */
  qualityRating: number
}

// ============================================================================
// STT TYPES
// ============================================================================

export interface STTOptions {
  /** Language hint (ISO 639-1) */
  language?: string
  /** Enable word timestamps */
  timestamps?: boolean
  /** Enable speaker diarization */
  diarization?: boolean
}

export interface STTResult {
  /** Transcribed text */
  transcript: string
  /** Confidence score (0-1) */
  confidence?: number
  /** Audio duration in seconds */
  duration?: number
  /** Detected language */
  language?: string
  /** Word-level timestamps */
  words?: Array<{
    word: string
    start: number
    end: number
    confidence?: number
  }>
}

export interface STTProviderInterface {
  /** Provider identifier */
  name: STTProvider
  /** Display name for UI */
  displayName: string
  /** Description */
  description: string
  /** Check availability */
  isAvailable(): Promise<boolean>
  /** Transcribe audio */
  transcribe(audio: Blob, options?: STTOptions): Promise<STTResult>
  /** Estimated cost per minute (for paid services) */
  costPerMinute?: number
  /** Quality rating for UI (1-5) */
  qualityRating: number
  /** Supports real-time transcription */
  supportsRealtime: boolean
}

// ============================================================================
// PROVIDER INFO
// ============================================================================

export interface ProviderInfo {
  id: VoiceProviderType
  name: string
  description: string
  available: boolean
  reason?: string
  costInfo?: string
  qualityRating: number
  features: string[]
}

// ============================================================================
// COST TOOLTIPS
// ============================================================================

export const PROVIDER_COST_INFO: Record<VoiceProviderType, { tts?: string; stt?: string }> = {
  browser: {
    tts: 'Free - Uses browser built-in speech synthesis',
    stt: 'Free - Uses browser built-in speech recognition',
  },
  elevenlabs: {
    tts: '~$0.30 per 1,000 characters (varies by plan)',
    stt: '~$0.10 per minute (varies by plan)',
  },
  openai: {
    tts: '~$0.015 per 1,000 characters (TTS HD)',
    stt: '~$0.006 per minute (Whisper)',
  },
}

export const PROVIDER_QUALITY_INFO: Record<VoiceProviderType, { tts: number; stt: number }> = {
  browser: { tts: 2, stt: 2 },
  elevenlabs: { tts: 5, stt: 4 },
  openai: { tts: 4, stt: 5 },
}





