/**
 * Format Voice Note Tests
 * @module __tests__/unit/lib/media/formatVoiceNote.test
 *
 * Tests for voice note and image formatting utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatVoiceNote,
  formatImageNote,
  blobToBase64,
  type VoiceNoteOptions,
  type FormattedVoiceNote,
} from '@/lib/media/formatVoiceNote'

// Mock FileReader
class MockFileReader {
  result: string | null = null
  onloadend: (() => void) | null = null
  onerror: ((error: Error) => void) | null = null

  readAsDataURL(blob: Blob) {
    setTimeout(() => {
      this.result = `data:${blob.type};base64,mockBase64Data`
      this.onloadend?.()
    }, 0)
  }
}

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
const mockRevokeObjectURL = vi.fn()

describe('formatVoiceNote module', () => {
  beforeEach(() => {
    vi.stubGlobal('FileReader', MockFileReader)
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ============================================================================
  // blobToBase64
  // ============================================================================

  describe('blobToBase64', () => {
    it('converts blob to base64 data URL', async () => {
      const blob = new Blob(['test audio data'], { type: 'audio/webm' })
      const result = await blobToBase64(blob)

      expect(result).toContain('data:audio/webm;base64')
    })

    it('handles different MIME types', async () => {
      const blob = new Blob(['test'], { type: 'audio/mp3' })
      const result = await blobToBase64(blob)

      expect(result).toContain('audio/mp3')
    })

    it('rejects on FileReader error', async () => {
      class ErrorFileReader {
        onerror: ((error: Error) => void) | null = null

        readAsDataURL() {
          setTimeout(() => {
            this.onerror?.(new Error('Read failed'))
          }, 0)
        }
      }

      vi.stubGlobal('FileReader', ErrorFileReader)

      const blob = new Blob(['test'], { type: 'audio/webm' })
      await expect(blobToBase64(blob)).rejects.toThrow('Read failed')
    })

    it('rejects when result is not a string', async () => {
      class InvalidFileReader {
        result: ArrayBuffer | null = null
        onloadend: (() => void) | null = null

        readAsDataURL() {
          setTimeout(() => {
            this.result = new ArrayBuffer(8)
            this.onloadend?.()
          }, 0)
        }
      }

      vi.stubGlobal('FileReader', InvalidFileReader)

      const blob = new Blob(['test'], { type: 'audio/webm' })
      await expect(blobToBase64(blob)).rejects.toThrow('Failed to convert blob to base64')
    })
  })

  // ============================================================================
  // formatVoiceNote
  // ============================================================================

  describe('formatVoiceNote', () => {
    it('formats voice note with all options', async () => {
      const options: VoiceNoteOptions = {
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        transcript: 'Hello world',
        duration: 45,
        timestamp: new Date('2025-01-15T10:30:00'),
        embedBase64: true,
      }

      const result = await formatVoiceNote(options)

      expect(result.markdown).toContain('🎙️ **Voice Note**')
      expect(result.markdown).toContain('45s') // Under 60 seconds uses "Xs" format
      expect(result.markdown).toContain('_"Hello world"_')
      expect(result.markdown).toContain('<audio controls')
      expect(result.isEmbedded).toBe(true)
    })

    it('formats duration with minutes and seconds', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        duration: 125, // 2 minutes 5 seconds
      })

      expect(result.markdown).toContain('2:05')
    })

    it('formats duration under a minute as seconds only', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        duration: 30,
      })

      expect(result.markdown).toContain('30s')
    })

    it('handles zero duration', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        duration: 0,
      })

      expect(result.markdown).toContain('0s')
    })

    it('excludes transcript when not provided', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
      })

      expect(result.markdown).not.toContain('_"')
    })

    it('excludes empty transcript', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        transcript: '   ',
      })

      expect(result.markdown).not.toContain('_"')
    })

    it('uses blob URL when embedBase64 is false', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        embedBase64: false,
      })

      expect(result.isEmbedded).toBe(false)
      expect(result.audioUrl).toBe('blob:mock-url')
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('uses blob URL when file exceeds maxBase64Size', async () => {
      const largeBlob = new Blob(['x'.repeat(2000000)], { type: 'audio/webm' })

      const result = await formatVoiceNote({
        blob: largeBlob,
        embedBase64: true,
        maxBase64Size: 1000000, // 1MB limit
      })

      expect(result.isEmbedded).toBe(false)
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('uses linked file path when provided', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        linkedFilePath: '/assets/audio/note.webm',
      })

      expect(result.audioUrl).toBe('/assets/audio/note.webm')
      expect(result.isEmbedded).toBe(false)
      expect(result.markdown).toContain('[🔊 Play audio]')
      expect(result.markdown).not.toContain('<audio controls')
    })

    it('uses default timestamp when not provided', async () => {
      const before = new Date()
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
      })
      const after = new Date()

      // Should have a timestamp in the markdown
      expect(result.markdown).toMatch(/\d{4}/)
    })

    it('returns FormattedVoiceNote structure', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
      })

      expect(result).toHaveProperty('markdown')
      expect(result).toHaveProperty('audioUrl')
      expect(result).toHaveProperty('isEmbedded')
      expect(typeof result.markdown).toBe('string')
      expect(typeof result.audioUrl).toBe('string')
      expect(typeof result.isEmbedded).toBe('boolean')
    })

    it('wraps content in blockquote', async () => {
      const result = await formatVoiceNote({
        blob: new Blob(['audio'], { type: 'audio/webm' }),
      })

      const lines = result.markdown.trim().split('\n')
      lines.forEach((line) => {
        if (line.trim()) {
          expect(line.startsWith('>')).toBe(true)
        }
      })
    })
  })

  // ============================================================================
  // formatImageNote
  // ============================================================================

  describe('formatImageNote', () => {
    it('formats photo with correct emoji and label', async () => {
      const result = await formatImageNote({
        blob: new Blob(['image data'], { type: 'image/png' }),
        type: 'photo',
      })

      expect(result.markdown).toContain('📷 **Photo**')
      expect(result.markdown).toContain('![Photo]')
    })

    it('formats drawing with correct emoji and label', async () => {
      const result = await formatImageNote({
        blob: new Blob(['image data'], { type: 'image/png' }),
        type: 'drawing',
      })

      expect(result.markdown).toContain('🎨 **Drawing**')
      expect(result.markdown).toContain('![Drawing]')
    })

    it('embeds small images as base64', async () => {
      const smallBlob = new Blob(['small'], { type: 'image/png' })

      const result = await formatImageNote({
        blob: smallBlob,
        type: 'photo',
        embedBase64: true,
      })

      expect(result.isEmbedded).toBe(true)
      expect(result.imageUrl).toContain('data:')
    })

    it('uses blob URL for large images', async () => {
      const largeBlob = new Blob(['x'.repeat(3000000)], { type: 'image/png' })

      const result = await formatImageNote({
        blob: largeBlob,
        type: 'photo',
        embedBase64: true,
        maxBase64Size: 2000000,
      })

      expect(result.isEmbedded).toBe(false)
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('uses linked file path when provided', async () => {
      const result = await formatImageNote({
        blob: new Blob(['image'], { type: 'image/png' }),
        type: 'photo',
        linkedFilePath: '/assets/images/photo.png',
      })

      expect(result.imageUrl).toBe('/assets/images/photo.png')
      expect(result.isEmbedded).toBe(false)
    })

    it('formats timestamp correctly', async () => {
      const result = await formatImageNote({
        blob: new Blob(['image'], { type: 'image/png' }),
        type: 'photo',
        timestamp: new Date('2025-06-15T14:30:00'),
      })

      expect(result.markdown).toContain('Jun')
      expect(result.markdown).toContain('15')
      expect(result.markdown).toContain('2025')
    })

    it('uses default embedBase64 true', async () => {
      const result = await formatImageNote({
        blob: new Blob(['image'], { type: 'image/png' }),
        type: 'drawing',
      })

      expect(result.isEmbedded).toBe(true)
    })

    it('uses 2MB default maxBase64Size for images', async () => {
      // 1.5MB should be embedded (under 2MB default)
      const mediumBlob = new Blob(['x'.repeat(1500000)], { type: 'image/png' })

      const result = await formatImageNote({
        blob: mediumBlob,
        type: 'photo',
      })

      expect(result.isEmbedded).toBe(true)
    })

    it('returns correct structure', async () => {
      const result = await formatImageNote({
        blob: new Blob(['image'], { type: 'image/png' }),
        type: 'photo',
      })

      expect(result).toHaveProperty('markdown')
      expect(result).toHaveProperty('imageUrl')
      expect(result).toHaveProperty('isEmbedded')
    })
  })

  // ============================================================================
  // Type exports
  // ============================================================================

  describe('type exports', () => {
    it('VoiceNoteOptions type is properly structured', () => {
      const options: VoiceNoteOptions = {
        blob: new Blob([]),
        transcript: 'test',
        duration: 10,
        timestamp: new Date(),
        embedBase64: true,
        maxBase64Size: 1000,
        linkedFilePath: '/path/to/file',
      }

      expect(options.blob).toBeDefined()
      expect(options.transcript).toBe('test')
    })

    it('FormattedVoiceNote type is properly structured', () => {
      const result: FormattedVoiceNote = {
        markdown: '> test',
        audioUrl: 'blob:url',
        isEmbedded: false,
      }

      expect(result.markdown).toBe('> test')
      expect(result.audioUrl).toBe('blob:url')
      expect(result.isEmbedded).toBe(false)
    })
  })
})
