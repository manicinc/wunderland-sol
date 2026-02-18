/**
 * Voice Transcription API
 * @module app/api/transcribe
 *
 * Uses OpenAI Whisper API for audio transcription.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface TranscriptionResponse {
  text: string
  duration?: number
  language?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const apiKey = formData.get('apiKey') as string | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/mp4']
    if (!validTypes.some((t) => audioFile.type.includes(t.split('/')[1]))) {
      return NextResponse.json(
        { error: `Invalid audio format: ${audioFile.type}. Supported: wav, mp3, webm, ogg, m4a` },
        { status: 400 }
      )
    }

    // Create form data for OpenAI
    const openaiFormData = new FormData()
    openaiFormData.append('file', audioFile)
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('response_format', 'verbose_json')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openaiFormData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      console.error('[Transcribe] OpenAI error:', error)
      return NextResponse.json(
        { error: error.error?.message || 'Transcription failed' },
        { status: response.status }
      )
    }

    const result = await response.json()

    const transcription: TranscriptionResponse = {
      text: result.text,
      duration: result.duration,
      language: result.language,
    }

    return NextResponse.json(transcription)
  } catch (error) {
    console.error('[Transcribe] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    )
  }
}
