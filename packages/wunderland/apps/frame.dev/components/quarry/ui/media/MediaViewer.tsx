/**
 * Media Viewer Component
 * @module codex/ui/MediaViewer
 * 
 * @remarks
 * Renders non-markdown files like images, videos, PDFs, GIFs with metadata
 */

'use client'

import React, { useState } from 'react'
import { FileText, Download, ExternalLink, Image as ImageIcon, Video, FileCode, File } from 'lucide-react'
import type { GitHubFile, StrandMetadata } from '../../types'

interface MediaViewerProps {
  file: GitHubFile
  metadata: StrandMetadata
}

/**
 * Detect file type from extension
 */
function getFileType(filename: string): {
  type: 'image' | 'video' | 'pdf' | 'audio' | 'code' | 'unknown'
  subtype?: string
} {
  const ext = filename.toLowerCase().split('.').pop() || ''
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp']
  const videoExts = ['mp4', 'webm', 'ogv', 'mov', 'avi']
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac']
  const codeExts = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'css', 'html', 'json', 'yaml', 'yml', 'toml', 'xml']
  
  if (imageExts.includes(ext)) return { type: 'image', subtype: ext }
  if (videoExts.includes(ext)) return { type: 'video', subtype: ext }
  if (audioExts.includes(ext)) return { type: 'audio', subtype: ext }
  if (ext === 'pdf') return { type: 'pdf' }
  if (codeExts.includes(ext)) return { type: 'code', subtype: ext }
  
  return { type: 'unknown', subtype: ext }
}

/**
 * Format file size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Media viewer for non-markdown files
 */
export default function MediaViewer({ file, metadata }: MediaViewerProps) {
  const [imageError, setImageError] = useState(false)
  const fileType = getFileType(file.name)
  const downloadUrl = file.download_url || file.url

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header with metadata */}
      <div className="bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {fileType.type === 'image' && <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            {fileType.type === 'video' && <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
            {fileType.type === 'pdf' && <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />}
            {fileType.type === 'code' && <FileCode className="w-6 h-6 text-green-600 dark:text-green-400" />}
            {fileType.type === 'unknown' && <File className="w-6 h-6 text-gray-600 dark:text-gray-400" />}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{file.name}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {fileType.subtype?.toUpperCase()} • {file.size ? formatBytes(file.size) : 'Unknown size'}
              </p>
            </div>
          </div>
          
          {downloadUrl && (
            <div className="flex gap-2">
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            </div>
          )}
        </div>

        {/* Auto-detected metadata */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Auto-detected Metadata
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {metadata.title && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Title:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{metadata.title}</span>
                </div>
              )}
              {metadata.tags && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Tags:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(Array.isArray(metadata.tags) ? metadata.tags : metadata.tags.split(',')).map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-xs">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media preview */}
      <div className="bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-700 p-4">
        {/* Images */}
        {fileType.type === 'image' && downloadUrl && !imageError && (
          <div className="flex items-center justify-center min-h-[400px] bg-gray-100 dark:bg-gray-900">
            <img
              src={downloadUrl}
              alt={file.name}
              className="max-w-full max-h-[800px] object-contain"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Videos */}
        {fileType.type === 'video' && downloadUrl && (
          <div className="flex items-center justify-center bg-black">
            <video
              controls
              className="max-w-full max-h-[600px]"
              preload="metadata"
            >
              <source src={downloadUrl} type={`video/${fileType.subtype}`} />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Audio */}
        {fileType.type === 'audio' && downloadUrl && (
          <div className="flex items-center justify-center py-12">
            <audio controls className="w-full max-w-xl">
              <source src={downloadUrl} type={`audio/${fileType.subtype}`} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        )}

        {/* PDFs */}
        {fileType.type === 'pdf' && downloadUrl && (
          <div className="w-full h-[800px]">
            <iframe
              src={`${downloadUrl}#view=FitH`}
              className="w-full h-full border-0"
              title={file.name}
            />
          </div>
        )}

        {/* Code files */}
        {fileType.type === 'code' && downloadUrl && (
          <div className="p-4 bg-gray-100 dark:bg-gray-900 font-mono text-sm overflow-x-auto">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Code preview coming soon. For now, please download or open in a new tab.
            </p>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Raw File
            </a>
          </div>
        )}

        {/* Unknown / Error */}
        {(fileType.type === 'unknown' || imageError) && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <File className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Preview not available
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
              This file type doesn't have a built-in preview. You can download it or open it in a new tab.
            </p>
            {downloadUrl && (
              <div className="flex gap-2">
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File path breadcrumb */}
      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
        <span className="opacity-50">Path:</span> {file.path}
      </div>
    </div>
  )
}

