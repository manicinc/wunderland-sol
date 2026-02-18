/**
 * Speech-to-Text Module
 * @module lib/stt
 *
 * Provides pluggable STT engines:
 * - Web Speech API (browser-native, free, offline-capable)
 * - OpenAI Whisper (high-quality, requires API key)
 */

// Types
export type { STTEngine, STTProvider, STTResult, STTEngineInfo, WhisperConfig, WebSpeechConfig } from './types'

// Providers
export { whisperProvider, createWhisperProvider } from './whisperSTT'
export { webSpeechProvider, createWebSpeechProvider, isWebSpeechAvailable, createRealtimeTranscription } from './webSpeechSTT'
export type { RealtimeTranscription } from './webSpeechSTT'

// Service
export {
  getSTTProvider,
  getSTTEngineInfo,
  getBestSTTEngine,
  transcribeAudio,
  transcribeWithBestEngine,
} from './sttService'
