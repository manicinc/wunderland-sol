/**
 * Caption Display Component
 * @module codex/ui/canvas/shapes/AttachmentShape/CaptionDisplay
 *
 * Collapsible AI-generated caption display for AttachmentShape
 * Shows source badge and analysis status
 */

'use client'

import React, { useState } from 'react'
import { Sparkles, ChevronDown, Camera, Upload, Monitor, Loader2 } from 'lucide-react'
import type { ImageSourceType } from '@/lib/ai/types'

interface CaptionDisplayProps {
  /** AI-generated caption */
  caption?: string
  /** Image source type */
  sourceType?: ImageSourceType
  /** Analysis status */
  analysisStatus?: 'idle' | 'analyzing' | 'done' | 'error'
  /** Confidence score 0-1 */
  confidence?: number
}

/**
 * Get source icon and label
 */
function getSourceInfo(sourceType?: ImageSourceType): {
  icon: React.ReactNode
  label: string
  color: string
} {
  switch (sourceType) {
    case 'camera':
      return {
        icon: <Camera size={12} />,
        label: 'Camera',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      }
    case 'screenshot':
      return {
        icon: <Monitor size={12} />,
        label: 'Screenshot',
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      }
    case 'upload':
      return {
        icon: <Upload size={12} />,
        label: 'Upload',
        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      }
    default:
      return {
        icon: <Upload size={12} />,
        label: 'Image',
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      }
  }
}

/**
 * Caption Display Component
 * Collapsible section showing AI-generated caption with source badge
 */
export function CaptionDisplay({
  caption,
  sourceType,
  analysisStatus = 'idle',
  confidence,
}: CaptionDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Don't render if no caption and not analyzing
  if (!caption && analysisStatus !== 'analyzing') {
    return null
  }

  const sourceInfo = getSourceInfo(sourceType)

  return (
    <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Source Badge */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceInfo.color}`}
          >
            {sourceInfo.icon}
            <span>{sourceInfo.label}</span>
          </span>

          {/* Caption Indicator */}
          {analysisStatus === 'analyzing' ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              <span>Analyzing...</span>
            </div>
          ) : caption ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <Sparkles size={12} className="text-purple-500" />
              <span className="truncate">AI Caption</span>
              {confidence !== undefined && confidence > 0 && (
                <span className="text-[10px] text-gray-400">
                  ({Math.round(confidence * 100)}%)
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Expand/Collapse Icon */}
        {caption && (
          <ChevronDown
            size={14}
            className={`flex-shrink-0 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Caption Content - Expandable */}
      {isExpanded && caption && (
        <div className="mt-2 px-2 pb-1">
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            {caption}
          </p>
        </div>
      )}

      {/* Error State */}
      {analysisStatus === 'error' && (
        <div className="mt-1 px-2">
          <p className="text-xs text-red-600 dark:text-red-400">
            Analysis failed
          </p>
        </div>
      )}
    </div>
  )
}
