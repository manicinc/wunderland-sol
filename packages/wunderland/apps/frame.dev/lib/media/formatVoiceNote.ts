/**
 * Voice Note Formatting Utilities
 * @module lib/media/formatVoiceNote
 *
 * @description
 * Formats voice recordings into rich markdown with:
 * - Inline audio player (base64 or blob URL)
 * - Transcription text
 * - Duration and timestamp metadata
 */

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface VoiceNoteOptions {
  /** Audio blob */
  blob: Blob
  /** Transcription text (from speech recognition) */
  transcript?: string
  /** Duration in seconds */
  duration?: number
  /** Recording timestamp */
  timestamp?: Date
  /** Whether to embed as base64 (for small files) or use blob URL */
  embedBase64?: boolean
  /** Maximum size for base64 embedding (default: 1MB) */
  maxBase64Size?: number
  /** If set, use this file path instead of embedding (for linked mode) */
  linkedFilePath?: string
}

export interface FormattedVoiceNote {
  /** Markdown content */
  markdown: string
  /** Audio data URL (if base64) or blob URL */
  audioUrl: string
  /** Whether audio is embedded as base64 */
  isEmbedded: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Format duration as human-readable string
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) {
    return `${secs}s`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format timestamp as readable date/time
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Convert blob to base64 data URL
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Format a voice recording into rich markdown
 *
 * @example
 * ```ts
 * const { markdown } = await formatVoiceNote({
 *   blob: audioBlob,
 *   transcript: "Hello, this is a test recording",
 *   duration: 45,
 *   timestamp: new Date(),
 * })
 * // Returns markdown like:
 * // > 🎙️ **Voice Note** (0:45) - Dec 26, 2025
 * // >
 * // > _"Hello, this is a test recording"_
 * // >
 * // > <audio controls src="data:audio/webm;base64,..."></audio>
 * ```
 */
export async function formatVoiceNote({
  blob,
  transcript,
  duration = 0,
  timestamp = new Date(),
  embedBase64 = true,
  maxBase64Size = 1024 * 1024, // 1MB default
  linkedFilePath,
}: VoiceNoteOptions): Promise<FormattedVoiceNote> {
  // Decide whether to embed as base64 or use blob URL
  let audioUrl: string
  let isEmbedded: boolean

  if (linkedFilePath) {
    // Use linked file path
    audioUrl = linkedFilePath
    isEmbedded = false
  } else {
    const shouldEmbed = embedBase64 && blob.size <= maxBase64Size
    isEmbedded = shouldEmbed

    if (shouldEmbed) {
      audioUrl = await blobToBase64(blob)
    } else {
      audioUrl = URL.createObjectURL(blob)
    }
  }

  // Format the duration
  const durationStr = formatDuration(duration)

  // Format the timestamp
  const timestampStr = formatTimestamp(timestamp)

  // Build the markdown
  const lines: string[] = []

  // Header with emoji, duration, and timestamp
  lines.push(`> 🎙️ **Voice Note** (${durationStr}) - ${timestampStr}`)
  lines.push('>')

  // Transcription (if available)
  if (transcript && transcript.trim()) {
    // Wrap in italics and quotes for visual distinction
    lines.push(`> _"${transcript.trim()}"_`)
    lines.push('>')
  }

  // Audio player - use HTML audio tag for embedded, markdown link for file path
  if (linkedFilePath) {
    lines.push(`> [🔊 Play audio](${audioUrl})`)
  } else {
    lines.push(`> <audio controls src="${audioUrl}"></audio>`)
  }

  const markdown = '\n\n' + lines.join('\n') + '\n'

  return {
    markdown,
    audioUrl,
    isEmbedded,
  }
}

/**
 * Format an image/drawing into markdown
 */
export async function formatImageNote({
  blob,
  type,
  timestamp = new Date(),
  embedBase64 = true,
  maxBase64Size = 2 * 1024 * 1024, // 2MB for images
  linkedFilePath,
}: {
  blob: Blob
  type: 'photo' | 'drawing'
  timestamp?: Date
  embedBase64?: boolean
  maxBase64Size?: number
  linkedFilePath?: string
}): Promise<{ markdown: string; imageUrl: string; isEmbedded: boolean }> {
  let imageUrl: string
  let isEmbedded: boolean

  if (linkedFilePath) {
    // Use linked file path
    imageUrl = linkedFilePath
    isEmbedded = false
  } else {
    const shouldEmbed = embedBase64 && blob.size <= maxBase64Size
    isEmbedded = shouldEmbed

    if (shouldEmbed) {
      imageUrl = await blobToBase64(blob)
    } else {
      imageUrl = URL.createObjectURL(blob)
    }
  }

  const timestampStr = formatTimestamp(timestamp)
  const typeLabel = type === 'drawing' ? 'Drawing' : 'Photo'
  const emoji = type === 'drawing' ? '🎨' : '📷'

  const markdown = `\n\n> ${emoji} **${typeLabel}** - ${timestampStr}\n>\n> ![${typeLabel}](${imageUrl})\n`

  return {
    markdown,
    imageUrl,
    isEmbedded,
  }
}

export default formatVoiceNote
