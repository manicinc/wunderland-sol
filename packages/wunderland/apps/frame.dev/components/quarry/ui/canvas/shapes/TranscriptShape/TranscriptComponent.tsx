/**
 * Transcript Component - Editable text card for canvas
 * @module codex/ui/canvas/shapes/TranscriptShape/TranscriptComponent
 *
 * Features:
 * - Rich text editing
 * - Auto-resize based on content
 * - Tag pills
 * - Link to voice note navigation
 */

'use client'

import React, { useCallback, useRef, useEffect, memo } from 'react'
import { HTMLContainer, track, useIsEditing, useEditor } from '@tldraw/tldraw'
import { FileText, Mic, Link, X, Plus, ExternalLink } from 'lucide-react'
import type { TranscriptShape } from '../types'
import { getShapeColors } from '../types'
import type { TranscriptShapeUtil } from './TranscriptShapeUtil'

interface TranscriptComponentProps {
  shape: TranscriptShape
  util: TranscriptShapeUtil
}

/**
 * Editable transcript card component
 */
export const TranscriptComponent = track(function TranscriptComponent({
  shape,
  util,
}: TranscriptComponentProps) {
  const editor = useEditor()
  const isEditing = useIsEditing(shape.id)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDark = editor.user.getIsDarkMode()
  const colors = getShapeColors('transcript', isDark)

  const { title, text, tags, linkedVoiceNoteId, timestamps } = shape.props

  // Update shape props helper
  const updateProps = useCallback(
    (props: Partial<TranscriptShape['props']>) => {
      editor.updateShapes([
        {
          id: shape.id,
          type: 'transcript',
          props,
        },
      ])
    },
    [editor, shape.id]
  )

  // Handle text change
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateProps({ text: e.target.value })
    },
    [updateProps]
  )

  // Handle title change
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateProps({ title: e.target.value })
    },
    [updateProps]
  )

  // Navigate to linked voice note
  const navigateToVoiceNote = useCallback(() => {
    if (linkedVoiceNoteId) {
      const voiceNoteShape = editor.getShape(linkedVoiceNoteId as any)
      if (voiceNoteShape) {
        editor.select(linkedVoiceNoteId as any)
        editor.zoomToSelection()
      }
    }
  }, [editor, linkedVoiceNoteId])

  // Add new tag
  const addTag = useCallback(() => {
    const newTag = prompt('Enter tag (without #):')
    if (newTag && newTag.trim()) {
      const cleanTag = newTag.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
      if (cleanTag && !tags.includes(cleanTag)) {
        updateProps({ tags: [...tags, cleanTag] })
      }
    }
  }, [tags, updateProps])

  // Remove tag
  const removeTag = useCallback(
    (tagToRemove: string) => {
      updateProps({ tags: tags.filter((t) => t !== tagToRemove) })
    },
    [tags, updateProps]
  )

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text, isEditing])

  // Focus textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  return (
    <HTMLContainer id={shape.id}>
      <div
        className="transcript-card w-full h-full flex flex-col rounded-xl overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="w-4 h-4 shrink-0" style={{ color: colors.accent }} />
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="flex-1 text-sm font-medium bg-transparent border-none outline-none min-w-0"
                style={{ color: colors.text }}
                placeholder="Transcript title..."
              />
            ) : (
              <span
                className="text-sm font-medium truncate"
                style={{ color: colors.text }}
              >
                {title || 'Transcript'}
              </span>
            )}
          </div>

          {/* Link to voice note */}
          {linkedVoiceNoteId && (
            <button
              onClick={navigateToVoiceNote}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors shrink-0"
              style={{
                backgroundColor: `${colors.accent}20`,
                color: colors.accent,
              }}
            >
              <Mic className="w-3 h-3" />
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 overflow-auto min-h-0">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              className="w-full h-full resize-none bg-transparent border-none outline-none text-sm leading-relaxed"
              style={{ color: colors.text }}
              placeholder="Enter transcript text..."
            />
          ) : (
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: colors.text }}
            >
              {text || (
                <span style={{ opacity: 0.5 }}>
                  No transcript text. Double-click to edit.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Tags */}
        <div
          className="flex flex-wrap items-center gap-1.5 px-3 py-2 shrink-0"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${colors.accent}20`,
                color: colors.accent,
              }}
            >
              #{tag}
              {isEditing && (
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:opacity-100 opacity-60 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {isEditing && (
            <button
              onClick={addTag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors"
              style={{
                border: `1px dashed ${colors.border}`,
                color: colors.text,
                opacity: 0.6,
              }}
            >
              <Plus className="w-3 h-3" />
              Add tag
            </button>
          )}

          {!isEditing && tags.length === 0 && (
            <span
              className="text-xs"
              style={{ color: colors.text, opacity: 0.5 }}
            >
              No tags
            </span>
          )}
        </div>

        {/* Timestamp markers (if available) */}
        {timestamps && timestamps.length > 0 && (
          <div
            className="px-3 py-2 shrink-0"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <div className="flex flex-wrap gap-2">
              {timestamps.slice(0, 5).map((ts, i) => (
                <button
                  key={i}
                  className="px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    backgroundColor: `${colors.accent}10`,
                    color: colors.accent,
                  }}
                  onClick={() => {
                    // Navigate to voice note and seek to timestamp
                    if (linkedVoiceNoteId) {
                      const voiceNote = editor.getShape(linkedVoiceNoteId as any)
                      if (voiceNote) {
                        editor.updateShapes([
                          {
                            id: linkedVoiceNoteId as any,
                            type: 'voicenote',
                            props: { currentTime: ts.time },
                          },
                        ])
                        editor.select(linkedVoiceNoteId as any)
                        editor.zoomToSelection()
                      }
                    }
                  }}
                >
                  {formatTimestamp(ts.time)}
                </button>
              ))}
              {timestamps.length > 5 && (
                <span
                  className="px-2 py-1 text-xs"
                  style={{ color: colors.text, opacity: 0.5 }}
                >
                  +{timestamps.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </HTMLContainer>
  )
})

/**
 * Format timestamp as MM:SS
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
