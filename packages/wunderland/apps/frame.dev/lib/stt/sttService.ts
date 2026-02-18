/**
 * STT Service - Factory and utilities for speech-to-text
 * @module lib/stt/sttService
 */

import type { STTEngine, STTProvider, STTResult, STTEngineInfo } from './types'
import { whisperProvider } from './whisperSTT'
import { webSpeechProvider, isWebSpeechAvailable } from './webSpeechSTT'
import { getAPIKey } from '@/lib/config/apiKeyStorage'

/**
 * All available STT providers
 */
const providers: Record<STTEngine, STTProvider> = {
  'web-speech': webSpeechProvider,
  'whisper': whisperProvider,
}

/**
 * Get a specific STT provider
 */
export function getSTTProvider(engine: STTEngine): STTProvider {
  return providers[engine]
}

/**
 * Get info about all STT engines (for UI display)
 */
export async function getSTTEngineInfo(): Promise<STTEngineInfo[]> {
  const results: STTEngineInfo[] = []

  // Web Speech (always first as default)
  const webSpeechAvailable = isWebSpeechAvailable()
  results.push({
    engine: 'web-speech',
    displayName: 'Browser Speech',
    description: 'Free, works offline in supported browsers',
    available: webSpeechAvailable,
    reason: webSpeechAvailable ? undefined : 'Not supported in this browser',
  })

  // Whisper
  const openaiKey = await getAPIKey('openai')
  const whisperAvailable = !!openaiKey?.key
  results.push({
    engine: 'whisper',
    displayName: 'OpenAI Whisper',
    description: 'High-quality AI transcription',
    available: whisperAvailable,
    reason: whisperAvailable ? undefined : 'Requires OpenAI API key',
  })

  return results
}

/**
 * Get the best available STT engine
 * Prefers Whisper if available, falls back to Web Speech
 */
export async function getBestSTTEngine(): Promise<STTEngine> {
  const openaiKey = await getAPIKey('openai')
  if (openaiKey?.key) {
    return 'whisper'
  }

  if (isWebSpeechAvailable()) {
    return 'web-speech'
  }

  // Default to web-speech even if unavailable (will error on use)
  return 'web-speech'
}

/**
 * Transcribe audio using specified engine
 */
export async function transcribeAudio(
  audio: Blob,
  engine: STTEngine
): Promise<STTResult> {
  const provider = getSTTProvider(engine)
  return provider.transcribe(audio)
}

/**
 * Transcribe audio using the best available engine
 */
export async function transcribeWithBestEngine(audio: Blob): Promise<STTResult & { engine: STTEngine }> {
  const engine = await getBestSTTEngine()
  const result = await transcribeAudio(audio, engine)
  return { ...result, engine }
}
