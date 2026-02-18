/**
 * File Filter Toggle Component
 * @module codex/ui/FileFilterToggle
 * 
 * @remarks
 * Compact toggle group for filtering files by scope:
 * - **Docs (MD)**: Markdown documentation files only
 * - **Docs + Media**: Markdown + all non-MD assets (images, audio, video, PDFs, JSON, YAML, etc.)
 * - **All Files**: Everything in the repository except .gitignore entries
 * 
 * Media is defined as any file that is NOT markdown — this includes images, videos, code, configs, etc.
 */

'use client'

import React from 'react'
import { FileText, Image, Files, FileCode, Film } from 'lucide-react'
import type { FileFilterScope } from '../../types'

interface FileFilterToggleProps {
  /** Current filter scope */
  value: FileFilterScope
  /** Change handler */
  onChange: (scope: FileFilterScope) => void
  /** Hide empty folders */
  hideEmptyFolders?: boolean
  /** Toggle hide empty folders */
  onToggleHideEmptyFolders?: () => void
  /** Optional class name */
  className?: string
  /** Compact mode for tighter layouts */
  compact?: boolean
}

/**
 * Toggle group for file filtering
 * 
 * @example
 * ```tsx
 * <FileFilterToggle
 *   value={filterScope}
 *   onChange={setFilterScope}
 * />
 * ```
 */
export default function FileFilterToggle({
  value,
  onChange,
  hideEmptyFolders = false,
  onToggleHideEmptyFolders,
  className = '',
  compact = false,
}: FileFilterToggleProps) {
  const options: Array<{
    value: FileFilterScope
    label: string
    icon: React.ComponentType<{ className?: string }>
    description: string
  }> = [
    {
      value: 'strands',
      label: 'Docs',
      icon: FileText,
      description: 'Markdown files (.md, .mdx)',
    },
    {
      value: 'text',
      label: 'Text',
      icon: FileCode,
      description: 'Text files (.txt, .json, .yaml, .xml)',
    },
    {
      value: 'images',
      label: 'Img',
      icon: Image,
      description: 'Images (.png, .jpg, .gif, .svg, .webp)',
    },
    {
      value: 'media',
      label: 'A/V',
      icon: Film,
      description: 'Audio/Video (.mp3, .mp4, .wav, .webm)',
    },
    {
      value: 'all',
      label: 'All',
      icon: Files,
      description: 'All files',
    },
  ]

  if (compact) {
    return (
      <div className={`flex items-center gap-0.5 ${className}`}>
        <div className="inline-flex border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 overflow-hidden rounded">
          {options.map((option) => {
            const Icon = option.icon
            const isActive = value === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`
                  p-0.5 xs:px-1 xs:py-0.5 sm:px-1.5 sm:py-1
                  text-[7px] xs:text-[8px] sm:text-[9px] font-medium
                  transition-all duration-200
                  border-r border-zinc-200 dark:border-zinc-700 last:border-r-0
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-inset
                  touch-manipulation
                  min-w-[20px] xs:min-w-[24px] min-h-[20px] xs:min-h-[24px]
                  ${
                    isActive
                      ? 'bg-cyan-500 dark:bg-cyan-600 text-white'
                      : 'bg-transparent text-zinc-700 dark:text-zinc-300'
                  }
                `}
                title={option.description}
                aria-label={`Filter by ${option.label}: ${option.description}`}
                aria-pressed={isActive}
              >
                {/* Icon only on very small screens, icon + label on sm+ */}
                <div className="flex items-center justify-center gap-0.5">
                  <Icon className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline whitespace-nowrap">{option.label}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Compact hide empty toggle */}
        {onToggleHideEmptyFolders && (
          <button
            onClick={onToggleHideEmptyFolders}
            className={`
              p-0.5 xs:px-1 xs:py-0.5 sm:px-1.5 sm:py-1
              text-[7px] xs:text-[8px] sm:text-[9px] rounded border
              transition-colors touch-manipulation
              min-w-[20px] xs:min-w-[24px] min-h-[20px] xs:min-h-[24px]
              ${hideEmptyFolders
                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }
            `}
            title="Hide empty folders"
          >
            ∅
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Responsive layout */}
      <div className="flex items-center gap-1 xs:gap-1.5">
        {/* Filter buttons */}
        <div className="inline-flex border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 overflow-hidden rounded">
          {options.map((option) => {
            const Icon = option.icon
            const isActive = value === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`
                  p-0.5 xs:px-1 xs:py-0.5 sm:px-1.5 sm:py-1
                  text-[7px] xs:text-[8px] sm:text-[9px] font-medium
                  transition-all duration-200
                  border-r border-zinc-200 dark:border-zinc-700 last:border-r-0
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-inset
                  touch-manipulation
                  min-w-[20px] xs:min-w-[24px] min-h-[20px] xs:min-h-[24px]
                  ${
                    isActive
                      ? 'bg-cyan-500 dark:bg-cyan-600 text-white'
                      : 'bg-transparent text-zinc-700 dark:text-zinc-300'
                  }
                `}
                title={option.description}
                aria-label={`Filter by ${option.label}: ${option.description}`}
                aria-pressed={isActive}
              >
                <div className="flex items-center justify-center gap-0.5">
                  <Icon className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline whitespace-nowrap">{option.label}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Hide Empty Folders toggle */}
        {onToggleHideEmptyFolders && (
          <button
            onClick={onToggleHideEmptyFolders}
            className={`
              p-0.5 xs:px-1 xs:py-0.5 sm:px-1.5 sm:py-1
              text-[7px] xs:text-[8px] sm:text-[9px] rounded border
              transition-colors touch-manipulation
              min-w-[20px] xs:min-w-[24px] min-h-[20px] xs:min-h-[24px]
              ${hideEmptyFolders
                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }
            `}
            title="Hide empty folders"
          >
            ∅
          </button>
        )}
      </div>
    </div>
  )
}
