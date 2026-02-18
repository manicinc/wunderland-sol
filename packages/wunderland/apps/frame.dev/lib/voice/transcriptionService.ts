/**
 * Voice Transcription Service
 * @module lib/voice/transcriptionService
 *
 * Client-side service for audio transcription using OpenAI Whisper.
 */

import { getAPIKey } from '@/lib/config/apiKeyStorage'

export interface TranscriptionResult {
  text: string
  duration?: number
  language?: string
}

export interface TranscriptionOptions {
  signal?: AbortSignal
  onProgress?: (status: 'uploading' | 'processing' | 'complete') => void
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const { signal, onProgress } = options

  // Get API key
  const keyConfig = await getAPIKey('openai')
  if (!keyConfig) {
    throw new Error('OpenAI API key not configured. Please add it in Settings.')
  }

  onProgress?.('uploading')

  // Create form data
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  formData.append('apiKey', keyConfig.key)

  // Call transcription endpoint
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
    signal,
  })

  onProgress?.('processing')

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Transcription failed' }))
    throw new Error(error.error || 'Transcription failed')
  }

  const result = await response.json()
  onProgress?.('complete')

  return result
}

/**
 * Transcribe audio from a URL
 */
export async function transcribeAudioUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const { signal, onProgress } = options

  onProgress?.('uploading')

  // Fetch the audio file
  const audioResponse = await fetch(audioUrl, { signal })
  if (!audioResponse.ok) {
    throw new Error('Failed to fetch audio file')
  }

  const audioBlob = await audioResponse.blob()

  return transcribeAudio(audioBlob, { signal, onProgress })
}

/**
 * Check if transcription is available (API key configured)
 */
export async function isTranscriptionAvailable(): Promise<boolean> {
  const keyConfig = await getAPIKey('openai')
  return !!keyConfig
}
