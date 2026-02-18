/**
 * VoiceNote Component - Interactive audio player for canvas
 * @module codex/ui/canvas/shapes/VoiceNoteShape/VoiceNoteComponent
 *
 * Features:
 * - Waveform visualization
 * - Play/pause/seek controls
 * - Progress indicator
 * - Transcription status with cancel
 * - Link to transcript navigation
 */

'use client'

import React, { useRef, useCallback, useEffect, memo, useState } from 'react'
import { HTMLContainer, track, useIsEditing, useEditor } from '@tldraw/tldraw'
import {
  Play,
  Pause,
  Mic,
  FileText,
  Link,
  Loader2,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import type { VoiceNoteShape } from '../types'
import { getShapeColors, formatDuration } from '../types'
import type { VoiceNoteShapeUtil } from './VoiceNoteShapeUtil'
import { WaveformCanvas } from './WaveformCanvas'
import { transcribeAudioUrl } from '@/lib/voice/transcriptionService'

interface VoiceNoteComponentProps {
  shape: VoiceNoteShape
  util: VoiceNoteShapeUtil
}

/**
 * Interactive audio player component for VoiceNoteShape
 */
export const VoiceNoteComponent = track(function VoiceNoteComponent({
  shape,
  util,
}: VoiceNoteComponentProps) {
  const editor = useEditor()
  const isEditing = useIsEditing(shape.id)
  const audioRef = useRef<HTMLAudioElement>(null!)

  const isDark = editor.user.getIsDarkMode()
  const colors = getShapeColors('voicenote', isDark)

  const {
    audioPath,
    duration,
    currentTime,
    isPlaying,
    waveformData,
    title,
    transcriptionStatus,
    linkedTranscriptId,
    transcriptText,
  } = shape.props

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Update shape props helper
  const updateProps = useCallback(
    (props: Partial<VoiceNoteShape['props']>) => {
      editor.updateShapes([
        {
          id: shape.id,
          type: 'voicenote',
          props,
        },
      ])
    },
    [editor, shape.id]
  )

  // Handle play
  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play()
      updateProps({ isPlaying: true })
    }
  }, [updateProps])

  // Handle pause
  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      updateProps({ isPlaying: false })
    }
  }, [updateProps])

  // Handle toggle play/pause
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause])

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      updateProps({ currentTime: audioRef.current.currentTime })
    }
  }, [updateProps])

  // Handle audio ended
  const handleEnded = useCallback(() => {
    updateProps({ isPlaying: false, currentTime: 0 })
  }, [updateProps])

  // Handle seek via waveform click
  const handleSeek = useCallback(
    (percentage: number) => {
      if (audioRef.current && duration > 0) {
        const newTime = (percentage / 100) * duration
        audioRef.current.currentTime = newTime
        updateProps({ currentTime: newTime })
      }
    },
    [duration, updateProps]
  )

  // AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  // Handle transcription actions
  const startTranscription = useCallback(async () => {
    if (!audioPath) {
      console.error('[VoiceNote] No audio path for transcription')
      return
    }

    // Cancel any existing transcription
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    updateProps({ transcriptionStatus: 'pending' })

    try {
      updateProps({ transcriptionStatus: 'processing' })

      const result = await transcribeAudioUrl(audioPath, {
        signal: abortControllerRef.current.signal,
        onProgress: (status) => {
          if (status === 'processing') {
            updateProps({ transcriptionStatus: 'processing' })
          }
        },
      })

      updateProps({
        transcriptionStatus: 'done',
        transcriptText: result.text,
      })

      console.log('[VoiceNote] Transcription complete:', result.text.slice(0, 100))
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[VoiceNote] Transcription cancelled')
        updateProps({ transcriptionStatus: 'cancelled' })
      } else {
        console.error('[VoiceNote] Transcription failed:', error)
        updateProps({ transcriptionStatus: 'error' })
      }
    } finally {
      abortControllerRef.current = null
    }
  }, [audioPath, updateProps])

  const cancelTranscription = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    updateProps({ transcriptionStatus: 'cancelled' })
  }, [updateProps])

  // Navigate to linked transcript
  const navigateToTranscript = useCallback(() => {
    if (linkedTranscriptId) {
      const transcriptShape = editor.getShape(linkedTranscriptId as any)
      if (transcriptShape) {
        editor.select(linkedTranscriptId as any)
        editor.zoomToSelection()
      }
    }
  }, [editor, linkedTranscriptId])

  // Sync audio element state with shape props
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Sync playback state
    if (isPlaying && audio.paused) {
      audio.play().catch(console.error)
    } else if (!isPlaying && !audio.paused) {
      audio.pause()
    }
  }, [isPlaying])

  // Render transcription status indicator
  const renderTranscriptionStatus = () => {
    switch (transcriptionStatus) {
      case 'idle':
      case 'cancelled':
        return (
          <button
            onClick={startTranscription}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: `${colors.accent}20`,
              color: colors.accent,
            }}
          >
            <FileText className="w-3 h-3" />
            Transcribe
          </button>
        )
      case 'pending':
      case 'processing':
        return (
          <button
            onClick={cancelTranscription}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: `${colors.accent}20`,
              color: colors.accent,
            }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{transcriptionStatus === 'pending' ? 'Queued' : 'Transcribing'}</span>
            <X className="w-3 h-3 ml-1 opacity-60 hover:opacity-100" />
          </button>
        )
      case 'done':
        return linkedTranscriptId ? (
          <button
            onClick={navigateToTranscript}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: `${colors.accent}20`,
              color: colors.accent,
            }}
          >
            <Link className="w-3 h-3" />
            View Transcript
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
          </button>
        ) : (
          <span
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
            style={{ color: colors.accent }}
          >
            <FileText className="w-3 h-3" />
            Transcribed
          </span>
        )
      case 'error':
        return (
          <button
            onClick={startTranscription}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: '#fef2f2',
              color: '#ef4444',
            }}
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )
      default:
        return null
    }
  }

  return (
    <HTMLContainer id={shape.id}>
      <div
        className="voice-note-card w-full h-full flex flex-col rounded-xl overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4" style={{ color: colors.accent }} />
            <span
              className="text-sm font-medium truncate max-w-[200px]"
              style={{ color: colors.text }}
            >
              {title || 'Voice Note'}
            </span>
          </div>
          <span className="text-xs tabular-nums" style={{ color: colors.text, opacity: 0.7 }}>
            {formatDuration(duration)}
          </span>
        </div>

        {/* Waveform */}
        <div className="flex-1 px-3 py-2 min-h-0">
          <WaveformCanvas
            data={waveformData}
            progress={progress}
            onSeek={handleSeek}
            accentColor={colors.accent}
            backgroundColor={colors.border}
            isEditing={isEditing}
          />
        </div>

        {/* Controls */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
            <button
              onClick={togglePlayback}
              className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
              style={{
                backgroundColor: colors.accent,
                color: 'white',
              }}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            {/* Time display */}
            <span
              className="text-xs tabular-nums"
              style={{ color: colors.text, opacity: 0.7 }}
            >
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          {/* Transcription status */}
          {renderTranscriptionStatus()}
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={audioPath}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPlay={() => updateProps({ isPlaying: true })}
          onPause={() => updateProps({ isPlaying: false })}
          preload="metadata"
        />

        {/* Inline transcript preview (if available and no linked shape) */}
        {transcriptText && !linkedTranscriptId && (
          <div
            className="px-3 py-2 text-xs line-clamp-2"
            style={{
              backgroundColor: `${colors.bg}`,
              borderTop: `1px solid ${colors.border}`,
              color: colors.text,
              opacity: 0.8,
            }}
          >
            "{transcriptText}"
          </div>
        )}
      </div>
    </HTMLContainer>
  )
})
