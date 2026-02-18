/**
 * OpenAI Whisper STT Provider
 * @module lib/stt/whisperSTT
 *
 * Uses OpenAI's Whisper API for high-quality transcription.
 * Requires an OpenAI API key.
 */

import type { STTProvider, STTResult, WhisperConfig } from './types'
import { getAPIKey, DEFAULT_BASE_URLS } from '@/lib/config/apiKeyStorage'

/**
 * Create a Whisper STT provider
 */
export function createWhisperProvider(config?: Partial<WhisperConfig>): STTProvider {
  return {
    name: 'whisper',
    displayName: 'OpenAI Whisper',
    description: 'High-quality AI transcription (requires OpenAI API key)',

    async isAvailable(): Promise<boolean> {
      const apiKey = await getAPIKey('openai')
      return !!apiKey?.key
    },

    async transcribe(audio: Blob): Promise<STTResult> {
      const apiKeyConfig = await getAPIKey('openai')
      if (!apiKeyConfig?.key) {
        throw new Error('OpenAI API key not configured')
      }

      const baseUrl = apiKeyConfig.baseUrl || DEFAULT_BASE_URLS.openai
      const model = config?.model || 'whisper-1'
      const language = config?.language || 'en'
      const responseFormat = config?.responseFormat || 'verbose_json'

      // Create form data for the API request
      const formData = new FormData()

      // Whisper expects specific file formats - convert webm to a named file
      const filename = audio.type.includes('webm') ? 'audio.webm' : 'audio.mp3'
      formData.append('file', audio, filename)
      formData.append('model', model)
      formData.append('language', language)
      formData.append('response_format', responseFormat)

      if (config?.temperature !== undefined) {
        formData.append('temperature', config.temperature.toString())
      }

      const response = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKeyConfig.key}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error(`Whisper API error: ${error.error?.message || response.statusText}`)
      }

      const data = await response.json()

      // Handle verbose_json format
      if (responseFormat === 'verbose_json') {
        return {
          transcript: data.text || '',
          duration: data.duration,
          language: data.language,
        }
      }

      // Handle simple json format
      return {
        transcript: typeof data === 'string' ? data : data.text || '',
      }
    },
  }
}

/**
 * Default Whisper provider instance
 */
export const whisperProvider = createWhisperProvider()
