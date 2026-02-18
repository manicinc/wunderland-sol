/**
 * Transcription Service Tests
 * @module __tests__/unit/lib/voice/transcriptionService.test
 *
 * Tests for voice transcription service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  TranscriptionResult,
  TranscriptionOptions,
} from '@/lib/voice/transcriptionService'

// Mock the API key storage module
vi.mock('@/lib/config/apiKeyStorage', () => ({
  getAPIKey: vi.fn(),
}))

describe('transcriptionService module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // TranscriptionResult type
  // ============================================================================

  describe('TranscriptionResult type', () => {
    it('has correct minimal structure', () => {
      const result: TranscriptionResult = {
        text: 'Hello world',
      }

      expect(result.text).toBe('Hello world')
      expect(result.duration).toBeUndefined()
      expect(result.language).toBeUndefined()
    })

    it('has correct full structure', () => {
      const result: TranscriptionResult = {
        text: 'Hello world',
        duration: 5.5,
        language: 'en',
      }

      expect(result.text).toBe('Hello world')
      expect(result.duration).toBe(5.5)
      expect(result.language).toBe('en')
    })
  })

  // ============================================================================
  // TranscriptionOptions type
  // ============================================================================

  describe('TranscriptionOptions type', () => {
    it('can be empty', () => {
      const options: TranscriptionOptions = {}
      expect(options.signal).toBeUndefined()
      expect(options.onProgress).toBeUndefined()
    })

    it('can have signal', () => {
      const controller = new AbortController()
      const options: TranscriptionOptions = {
        signal: controller.signal,
      }
      expect(options.signal).toBe(controller.signal)
    })

    it('can have progress callback', () => {
      const onProgress = vi.fn()
      const options: TranscriptionOptions = {
        onProgress,
      }
      expect(options.onProgress).toBe(onProgress)
    })
  })

  // ============================================================================
  // transcribeAudio
  // ============================================================================

  describe('transcribeAudio', () => {
    it('throws when no API key configured', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue(null)

      const { transcribeAudio } = await import('@/lib/voice/transcriptionService')
      const blob = new Blob(['audio'], { type: 'audio/webm' })

      await expect(transcribeAudio(blob)).rejects.toThrow(
        'OpenAI API key not configured'
      )
    })

    it('calls onProgress with uploading status', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue({ key: 'test-key', createdAt: Date.now() })

      // Mock fetch
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: 'transcribed text' }),
      }))

      const { transcribeAudio } = await import('@/lib/voice/transcriptionService')
      const blob = new Blob(['audio'], { type: 'audio/webm' })
      const onProgress = vi.fn()

      await transcribeAudio(blob, { onProgress })

      expect(onProgress).toHaveBeenCalledWith('uploading')
      expect(onProgress).toHaveBeenCalledWith('processing')
      expect(onProgress).toHaveBeenCalledWith('complete')
    })

    it('returns transcription result on success', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue({ key: 'test-key', createdAt: Date.now() })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          text: 'Hello world',
          duration: 5.5,
          language: 'en',
        }),
      }))

      const { transcribeAudio } = await import('@/lib/voice/transcriptionService')
      const blob = new Blob(['audio'], { type: 'audio/webm' })

      const result = await transcribeAudio(blob)

      expect(result.text).toBe('Hello world')
      expect(result.duration).toBe(5.5)
      expect(result.language).toBe('en')
    })

    it('throws on fetch error', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue({ key: 'test-key', createdAt: Date.now() })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'API error' }),
      }))

      const { transcribeAudio } = await import('@/lib/voice/transcriptionService')
      const blob = new Blob(['audio'], { type: 'audio/webm' })

      await expect(transcribeAudio(blob)).rejects.toThrow('API error')
    })

    it('uses default error message when response has no error', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue({ key: 'test-key', createdAt: Date.now() })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockRejectedValue(new Error('Parse error')),
      }))

      const { transcribeAudio } = await import('@/lib/voice/transcriptionService')
      const blob = new Blob(['audio'], { type: 'audio/webm' })

      await expect(transcribeAudio(blob)).rejects.toThrow('Transcription failed')
    })

    it('passes abort signal to fetch', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue({ key: 'test-key', createdAt: Date.now() })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: 'result' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const { transcribeAudio } = await import('@/lib/voice/transcriptionService')
      const blob = new Blob(['audio'], { type: 'audio/webm' })
      const controller = new AbortController()

      await transcribeAudio(blob, { signal: controller.signal })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/transcribe',
        expect.objectContaining({
          signal: controller.signal,
        })
      )
    })
  })

  // ============================================================================
  // transcribeAudioUrl
  // ============================================================================

  describe('transcribeAudioUrl', () => {
    it('fetches audio and transcribes it', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue({ key: 'test-key', createdAt: Date.now() })

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' })
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          blob: vi.fn().mockResolvedValue(mockBlob),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ text: 'transcribed' }),
        })
      vi.stubGlobal('fetch', mockFetch)

      const { transcribeAudioUrl } = await import('@/lib/voice/transcriptionService')
      const result = await transcribeAudioUrl('https://example.com/audio.webm')

      expect(result.text).toBe('transcribed')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/audio.webm',
        expect.anything()
      )
    })

    it('throws when audio fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
      }))

      const { transcribeAudioUrl } = await import('@/lib/voice/transcriptionService')

      await expect(
        transcribeAudioUrl('https://example.com/audio.webm')
      ).rejects.toThrow('Failed to fetch audio file')
    })

    it('calls onProgress with uploading status', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue({ key: 'test-key', createdAt: Date.now() })

      const mockBlob = new Blob(['audio'], { type: 'audio/webm' })
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          blob: vi.fn().mockResolvedValue(mockBlob),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ text: 'result' }),
        }))

      const { transcribeAudioUrl } = await import('@/lib/voice/transcriptionService')
      const onProgress = vi.fn()

      await transcribeAudioUrl('https://example.com/audio.webm', { onProgress })

      expect(onProgress).toHaveBeenCalledWith('uploading')
    })
  })

  // ============================================================================
  // isTranscriptionAvailable
  // ============================================================================

  describe('isTranscriptionAvailable', () => {
    it('returns true when API key is configured', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue({ key: 'test-key', createdAt: Date.now() })

      const { isTranscriptionAvailable } = await import('@/lib/voice/transcriptionService')
      const result = await isTranscriptionAvailable()

      expect(result).toBe(true)
    })

    it('returns false when API key is not configured', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue(null)

      const { isTranscriptionAvailable } = await import('@/lib/voice/transcriptionService')
      const result = await isTranscriptionAvailable()

      expect(result).toBe(false)
    })

    it('returns false when API key is undefined', async () => {
      const { getAPIKey } = await import('@/lib/config/apiKeyStorage')
      vi.mocked(getAPIKey).mockResolvedValue(undefined as any)

      const { isTranscriptionAvailable } = await import('@/lib/voice/transcriptionService')
      const result = await isTranscriptionAvailable()

      expect(result).toBe(false)
    })
  })
})
