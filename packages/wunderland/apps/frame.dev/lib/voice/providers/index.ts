/**
 * Voice Provider Registry
 * @module lib/voice/providers
 * 
 * Unified registry for TTS and STT providers.
 * Supports browser-native, ElevenLabs, and OpenAI providers.
 */

// Types
export type {
  VoiceProviderType,
  TTSProvider,
  STTProvider,
  TTSVoice,
  TTSOptions,
  TTSResult,
  STTOptions,
  STTResult,
  TTSProviderInterface,
  STTProviderInterface,
  ProviderInfo,
} from './types'

export { PROVIDER_COST_INFO, PROVIDER_QUALITY_INFO } from './types'

// Providers
export { browserTTS, browserSTT, BrowserTTSProvider, BrowserSTTProvider, RealtimeSTTSession } from './browser'
export { elevenLabsTTS, elevenLabsSTT, ElevenLabsTTSProvider, ElevenLabsSTTProvider } from './elevenlabs'
export { openaiTTS, openaiSTT, OpenAITTSProvider, OpenAISTTProvider } from './openai'

import type {
  VoiceProviderType,
  TTSProviderInterface,
  STTProviderInterface,
  ProviderInfo,
} from './types'
import { PROVIDER_COST_INFO, PROVIDER_QUALITY_INFO } from './types'
import { browserTTS, browserSTT } from './browser'
import { elevenLabsTTS, elevenLabsSTT } from './elevenlabs'
import { openaiTTS, openaiSTT } from './openai'

// ============================================================================
// REGISTRIES
// ============================================================================

const ttsProviders: Record<VoiceProviderType, TTSProviderInterface> = {
  browser: browserTTS,
  elevenlabs: elevenLabsTTS,
  openai: openaiTTS,
}

const sttProviders: Record<VoiceProviderType, STTProviderInterface> = {
  browser: browserSTT,
  elevenlabs: elevenLabsSTT,
  openai: openaiSTT,
}

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get a TTS provider by type
 */
export function getTTSProvider(type: VoiceProviderType): TTSProviderInterface {
  return ttsProviders[type]
}

/**
 * Get an STT provider by type
 */
export function getSTTProvider(type: VoiceProviderType): STTProviderInterface {
  return sttProviders[type]
}

/**
 * Get all available TTS providers
 */
export async function getAvailableTTSProviders(): Promise<ProviderInfo[]> {
  const results: ProviderInfo[] = []

  for (const [id, provider] of Object.entries(ttsProviders)) {
    const available = await provider.isAvailable()
    const type = id as VoiceProviderType

    results.push({
      id: type,
      name: provider.displayName,
      description: provider.description,
      available,
      reason: available ? undefined : getUnavailableReason(type),
      costInfo: PROVIDER_COST_INFO[type]?.tts,
      qualityRating: PROVIDER_QUALITY_INFO[type]?.tts ?? 3,
      features: getProviderFeatures(type, 'tts'),
    })
  }

  return results
}

/**
 * Get all available STT providers
 */
export async function getAvailableSTTProviders(): Promise<ProviderInfo[]> {
  const results: ProviderInfo[] = []

  for (const [id, provider] of Object.entries(sttProviders)) {
    const available = await provider.isAvailable()
    const type = id as VoiceProviderType

    results.push({
      id: type,
      name: provider.displayName,
      description: provider.description,
      available,
      reason: available ? undefined : getUnavailableReason(type),
      costInfo: PROVIDER_COST_INFO[type]?.stt,
      qualityRating: PROVIDER_QUALITY_INFO[type]?.stt ?? 3,
      features: getProviderFeatures(type, 'stt'),
    })
  }

  return results
}

/**
 * Get the best available TTS provider
 */
export async function getBestTTSProvider(): Promise<VoiceProviderType> {
  // Prefer quality: ElevenLabs > OpenAI > Browser
  if (await elevenLabsTTS.isAvailable()) return 'elevenlabs'
  if (await openaiTTS.isAvailable()) return 'openai'
  return 'browser'
}

/**
 * Get the best available STT provider
 */
export async function getBestSTTProvider(): Promise<VoiceProviderType> {
  // Prefer quality: OpenAI (Whisper) > ElevenLabs > Browser
  if (await openaiSTT.isAvailable()) return 'openai'
  if (await elevenLabsSTT.isAvailable()) return 'elevenlabs'
  return 'browser'
}

// ============================================================================
// HELPERS
// ============================================================================

function getUnavailableReason(type: VoiceProviderType): string {
  switch (type) {
    case 'browser':
      return 'Browser speech API not supported'
    case 'elevenlabs':
      return 'ElevenLabs API key not configured'
    case 'openai':
      return 'OpenAI API key not configured'
    default:
      return 'Provider not available'
  }
}

function getProviderFeatures(type: VoiceProviderType, mode: 'tts' | 'stt'): string[] {
  const features: string[] = []

  switch (type) {
    case 'browser':
      features.push('Free', 'Offline-capable', 'No API key required')
      if (mode === 'stt') features.push('Real-time transcription')
      break
    case 'elevenlabs':
      features.push('Ultra-realistic voices', 'Emotion control', 'Voice cloning')
      if (mode === 'stt') features.push('Word timestamps')
      break
    case 'openai':
      features.push('High quality', 'Fast generation', 'Multilingual')
      if (mode === 'stt') features.push('Industry-leading accuracy', 'Word timestamps')
      break
  }

  return features
}

// ============================================================================
// SETTINGS STORAGE
// ============================================================================

const TTS_PROVIDER_KEY = 'voice-tts-provider'
const STT_PROVIDER_KEY = 'voice-stt-provider'

/**
 * Get saved TTS provider preference
 */
export function getSavedTTSProvider(): VoiceProviderType {
  if (typeof localStorage === 'undefined') return 'browser'
  const saved = localStorage.getItem(TTS_PROVIDER_KEY)
  if (saved && saved in ttsProviders) return saved as VoiceProviderType
  return 'browser'
}

/**
 * Save TTS provider preference
 */
export function saveTTSProvider(provider: VoiceProviderType): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TTS_PROVIDER_KEY, provider)
  }
}

/**
 * Get saved STT provider preference
 */
export function getSavedSTTProvider(): VoiceProviderType {
  if (typeof localStorage === 'undefined') return 'browser'
  const saved = localStorage.getItem(STT_PROVIDER_KEY)
  if (saved && saved in sttProviders) return saved as VoiceProviderType
  return 'browser'
}

/**
 * Save STT provider preference
 */
export function saveSTTProvider(provider: VoiceProviderType): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STT_PROVIDER_KEY, provider)
  }
}

/**
 * Get effective provider (saved preference or best available)
 */
export async function getEffectiveTTSProvider(): Promise<VoiceProviderType> {
  const saved = getSavedTTSProvider()
  const provider = ttsProviders[saved]
  if (await provider.isAvailable()) return saved
  return getBestTTSProvider()
}

/**
 * Get effective provider (saved preference or best available)
 */
export async function getEffectiveSTTProvider(): Promise<VoiceProviderType> {
  const saved = getSavedSTTProvider()
  const provider = sttProviders[saved]
  if (await provider.isAvailable()) return saved
  return getBestSTTProvider()
}





