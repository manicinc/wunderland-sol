/**
 * OpenAI Voice Provider
 * @module lib/voice/providers/openai
 * 
 * High-quality TTS using OpenAI's TTS API and STT using Whisper.
 * Docs: https://platform.openai.com/docs/guides/text-to-speech
 */

import { getAPIKey, DEFAULT_BASE_URLS } from '@/lib/config/apiKeyStorage'
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
// CONSTANTS
// ============================================================================

const OPENAI_VOICES: TTSVoice[] = [
  { id: 'alloy', name: 'Alloy', language: 'en', gender: 'neutral' },
  { id: 'echo', name: 'Echo', language: 'en', gender: 'male' },
  { id: 'fable', name: 'Fable', language: 'en', gender: 'male' },
  { id: 'onyx', name: 'Onyx', language: 'en', gender: 'male' },
  { id: 'nova', name: 'Nova', language: 'en', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', language: 'en', gender: 'female' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getOpenAIConfig(): Promise<{ key: string; baseUrl: string } | null> {
  const config = await getAPIKey('openai')
  if (!config?.key) return null
  return {
    key: config.key,
    baseUrl: config.baseUrl || DEFAULT_BASE_URLS.openai,
  }
}

// ============================================================================
// TTS PROVIDER
// ============================================================================

export class OpenAITTSProvider implements TTSProviderInterface {
  name = 'openai' as const
  displayName = 'OpenAI TTS'
  description = 'Natural-sounding voices with fast generation'
  costPer1000Chars = 0.015
  qualityRating = 4

  async isAvailable(): Promise<boolean> {
    const config = await getOpenAIConfig()
    return !!config
  }

  async getVoices(): Promise<TTSVoice[]> {
    return OPENAI_VOICES
  }

  async speak(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const config = await getOpenAIConfig()
    if (!config) {
      throw new Error('OpenAI API key not configured')
    }

    const voiceId = options.voiceId || 'nova'
    const speed = options.rate ?? 1.0

    const response = await fetch(`${config.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: text,
        voice: voiceId,
        speed: Math.max(0.25, Math.min(4.0, speed)),
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`OpenAI TTS error: ${error.error?.message || response.statusText}`)
    }

    const audioBlob = await response.blob()

    return {
      audio: audioBlob,
      characterCount: text.length,
    }
  }
}

// ============================================================================
// STT PROVIDER (WHISPER)
// ============================================================================

export class OpenAISTTProvider implements STTProviderInterface {
  name = 'whisper' as const
  displayName = 'OpenAI Whisper'
  description = 'Industry-leading accuracy for transcription'
  costPerMinute = 0.006
  qualityRating = 5
  supportsRealtime = false

  async isAvailable(): Promise<boolean> {
    const config = await getOpenAIConfig()
    return !!config
  }

  async transcribe(audio: Blob, options: STTOptions = {}): Promise<STTResult> {
    const config = await getOpenAIConfig()
    if (!config) {
      throw new Error('OpenAI API key not configured')
    }

    const formData = new FormData()
    
    // Whisper expects specific file formats
    const filename = audio.type.includes('webm') ? 'audio.webm' : 'audio.mp3'
    formData.append('file', audio, filename)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    
    if (options.language) {
      formData.append('language', options.language)
    }
    
    if (options.timestamps) {
      formData.append('timestamp_granularities[]', 'word')
    }

    const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.key}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Whisper API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()

    return {
      transcript: data.text || '',
      duration: data.duration,
      language: data.language,
      words: data.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })),
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const openaiTTS = new OpenAITTSProvider()
export const openaiSTT = new OpenAISTTProvider()





