/**
 * Attachment Component - File preview for canvas
 * @module codex/ui/canvas/shapes/AttachmentShape/AttachmentComponent
 *
 * Features:
 * - Image thumbnail preview
 * - File icon for documents
 * - Download button
 * - File info display
 */

'use client'

import React, { useCallback, memo } from 'react'
import { HTMLContainer, track, useIsEditing, useEditor } from '@tldraw/tldraw'
import {
  File,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  Download,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import type { AttachmentShape } from '../types'
import { getShapeColors, formatFileSize, isImageMimeType, isAudioMimeType, isVideoMimeType } from '../types'
import type { AttachmentShapeUtil } from './AttachmentShapeUtil'
import { CaptionDisplay } from './CaptionDisplay'

interface AttachmentComponentProps {
  shape: AttachmentShape
  util: AttachmentShapeUtil
}

/**
 * File attachment card component
 */
export const AttachmentComponent = track(function AttachmentComponent({
  shape,
  util,
}: AttachmentComponentProps) {
  const editor = useEditor()
  const isEditing = useIsEditing(shape.id)
  const [copied, setCopied] = React.useState(false)

  const isDark = editor.user.getIsDarkMode()
  const colors = getShapeColors('attachment', isDark)

  const {
    fileName,
    filePath,
    mimeType,
    fileSize,
    thumbnailPath,
    dimensions,
    caption,
    sourceType,
    analysisMetadata,
    analysisStatus,
  } = shape.props

  const isImage = isImageMimeType(mimeType)
  const isAudio = isAudioMimeType(mimeType)
  const isVideo = isVideoMimeType(mimeType)

  // Handle download
  const handleDownload = useCallback(() => {
    if (filePath) {
      const link = document.createElement('a')
      link.href = filePath
      link.download = fileName
      link.click()
    }
  }, [filePath, fileName])

  // Handle open in new tab
  const handleOpen = useCallback(() => {
    if (filePath) {
      window.open(filePath, '_blank')
    }
  }, [filePath])

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    if (filePath) {
      await navigator.clipboard.writeText(filePath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [filePath])

  // Get file icon
  const FileIcon = () => {
    if (isImage) return <FileImage className="w-8 h-8" style={{ color: colors.accent }} />
    if (isAudio) return <FileAudio className="w-8 h-8" style={{ color: colors.accent }} />
    if (isVideo) return <FileVideo className="w-8 h-8" style={{ color: colors.accent }} />
    if (mimeType.includes('pdf') || mimeType.includes('text')) {
      return <FileText className="w-8 h-8" style={{ color: colors.accent }} />
    }
    return <File className="w-8 h-8" style={{ color: colors.accent }} />
  }

  return (
    <HTMLContainer id={shape.id}>
      <div
        className="attachment-card w-full h-full flex flex-col rounded-xl overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
        }}
      >
        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden">
          {isImage && (thumbnailPath || filePath) ? (
            <img
              src={thumbnailPath || filePath}
              alt={fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ boxShadow: `0 2px 8px ${colors.border}` }}
            />
          ) : isAudio ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.accent}20` }}
              >
                <FileIcon />
              </div>
              <audio
                src={filePath}
                controls
                className="w-full max-w-[180px]"
                style={{ height: 32 }}
              />
            </div>
          ) : isVideo ? (
            <video
              src={filePath}
              controls
              className="max-w-full max-h-full rounded-lg"
              style={{ boxShadow: `0 2px 8px ${colors.border}` }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${colors.accent}15` }}
            >
              <FileIcon />
            </div>
          )}
        </div>

        {/* Info section */}
        <div
          className="px-3 py-2 shrink-0"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          {/* Filename */}
          <p
            className="text-sm font-medium truncate"
            style={{ color: colors.text }}
            title={fileName}
          >
            {fileName || 'Unnamed file'}
          </p>

          {/* Meta info */}
          <div className="flex items-center justify-between mt-1">
            <span
              className="text-xs"
              style={{ color: colors.text, opacity: 0.7 }}
            >
              {formatFileSize(fileSize)}
              {dimensions && ` · ${dimensions.width}×${dimensions.height}`}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyLink}
                className="p-1 rounded transition-colors hover:opacity-80"
                title={copied ? 'Copied!' : 'Copy link'}
              >
                {copied ? (
                  <Check className="w-4 h-4" style={{ color: colors.accent }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: colors.text, opacity: 0.5 }} />
                )}
              </button>

              <button
                onClick={handleOpen}
                className="p-1 rounded transition-colors hover:opacity-80"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" style={{ color: colors.text, opacity: 0.5 }} />
              </button>

              <button
                onClick={handleDownload}
                className="p-1 rounded transition-colors hover:opacity-80"
                title="Download"
              >
                <Download className="w-4 h-4" style={{ color: colors.accent }} />
              </button>
            </div>
          </div>

          {/* AI Caption Display - Only for images */}
          {isImage && (
            <CaptionDisplay
              caption={caption}
              sourceType={sourceType}
              analysisStatus={analysisStatus}
              confidence={analysisMetadata?.captionConfidence}
            />
          )}
        </div>
      </div>
    </HTMLContainer>
  )
})
