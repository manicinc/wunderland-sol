/**
 * ElevenLabs Voice Provider
 * @module lib/voice/providers/elevenlabs
 * 
 * High-quality AI voice synthesis and transcription using ElevenLabs API.
 * Docs: https://elevenlabs.io/docs/api-reference
 */

import { getAPIKey } from '@/lib/config/apiKeyStorage'
import type {
  TTSProviderInterface,
  STTProviderInterface,
  TTSVoice,
  TTSOptions,
  TTSResult,
  STTOptions,
  STTResult,
} from './types'

const API_BASE = 'https://api.elevenlabs.io/v1'

// ============================================================================
// API TYPES
// ============================================================================

interface ElevenLabsVoice {
  voice_id: string
  name: string
  category: string
  labels: Record<string, string>
  preview_url: string
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getElevenLabsKey(): Promise<string | null> {
  const config = await getAPIKey('elevenlabs')
  return config?.key || null
}

// ============================================================================
// TTS PROVIDER
// ============================================================================

export class ElevenLabsTTSProvider implements TTSProviderInterface {
  name = 'elevenlabs' as const
  displayName = 'ElevenLabs'
  description = 'Ultra-realistic AI voices with emotion and style control'
  costPer1000Chars = 0.30
  qualityRating = 5

  private cachedVoices: TTSVoice[] | null = null

  async isAvailable(): Promise<boolean> {
    const key = await getElevenLabsKey()
    return !!key
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (this.cachedVoices) return this.cachedVoices

    const apiKey = await getElevenLabsKey()
    if (!apiKey) return []

    try {
      const response = await fetch(`${API_BASE}/voices`, {
        headers: { 'xi-api-key': apiKey },
      })

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }

      const data: ElevenLabsVoicesResponse = await response.json()

      this.cachedVoices = data.voices.map((v) => ({
        id: v.voice_id,
        name: v.name,
        language: v.labels?.language || 'en',
        gender: v.labels?.gender as 'male' | 'female' | undefined,
        preview: v.preview_url,
      }))

      return this.cachedVoices
    } catch (error) {
      console.error('[ElevenLabs] Failed to fetch voices:', error)
      return []
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const apiKey = await getElevenLabsKey()
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured')
    }

    // Get default voice if not specified
    let voiceId = options.voiceId
    if (!voiceId) {
      const voices = await this.getVoices()
      voiceId = voices[0]?.id || '21m00Tcm4TlvDq8ikWAM' // Rachel (default)
    }

    const response = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`ElevenLabs TTS error: ${error.detail?.message || response.statusText}`)
    }

    const audioBlob = await response.blob()

    return {
      audio: audioBlob,
      characterCount: text.length,
    }
  }
}

// ============================================================================
// STT PROVIDER
// ============================================================================

export class ElevenLabsSTTProvider implements STTProviderInterface {
  name = 'elevenlabs' as const
  displayName = 'ElevenLabs'
  description = 'AI-powered speech recognition with high accuracy'
  costPerMinute = 0.10
  qualityRating = 4
  supportsRealtime = false

  async isAvailable(): Promise<boolean> {
    const key = await getElevenLabsKey()
    return !!key
  }

  async transcribe(audio: Blob, options: STTOptions = {}): Promise<STTResult> {
    const apiKey = await getElevenLabsKey()
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured')
    }

    // ElevenLabs uses their speech-to-text endpoint
    const formData = new FormData()
    formData.append('audio', audio, 'audio.webm')
    
    if (options.language) {
      formData.append('language_code', options.language)
    }

    const response = await fetch(`${API_BASE}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`ElevenLabs STT error: ${error.detail?.message || response.statusText}`)
    }

    const data = await response.json()

    return {
      transcript: data.text || '',
      language: data.language_code,
      words: data.words?.map((w: any) => ({
        word: w.text,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const elevenLabsTTS = new ElevenLabsTTSProvider()
export const elevenLabsSTT = new ElevenLabsSTTProvider()





