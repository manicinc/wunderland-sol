/**
 * Repository Indicator Component
 * @module codex/ui/RepositoryIndicator
 * 
 * @remarks
 * Displays the current Codex content source with appropriate icon.
 * Shows local storage path or GitHub repository depending on mode.
 */

'use client'

import React from 'react'
import { Settings, Database, ExternalLink, HardDrive, FolderOpen, Cloud } from 'lucide-react'
import { REPO_CONFIG } from '../../constants'
import type { ContentSource } from '@/lib/content/types'

interface RepositoryIndicatorProps {
  /** Whether repo editing is enabled */
  allowEdit?: boolean
  /** Open repository settings */
  onEdit?: () => void
  /** Theme */
  theme?: string
  /** Compact mode (smaller) */
  compact?: boolean
  /** Content source info */
  contentSource?: ContentSource | null
  /** Display path for local storage */
  displayPath?: string
}

/**
 * Repository indicator with dynamic icon based on content source
 */
export default function RepositoryIndicator({
  allowEdit = false,
  onEdit,
  theme = 'light',
  compact = false,
  contentSource,
  displayPath,
}: RepositoryIndicatorProps) {
  const isTerminal = theme?.includes('terminal')
  const isSepia = theme?.includes('sepia')
  
  // Determine if using local storage or GitHub
  const isLocalMode = contentSource?.type === 'sqlite' || contentSource?.type === 'filesystem'
  const isGithubMode = contentSource?.type === 'github'
  
  // Get display info based on mode
  const displayLabel = isLocalMode 
    ? (displayPath ? truncatePath(displayPath) : 'Local Storage')
    : `${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}`
  
  const displaySubtitle = isLocalMode
    ? (displayPath ? 'Local Vault' : 'IndexedDB')
    : REPO_CONFIG.BRANCH
  
  const repoUrl = isGithubMode 
    ? `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}` 
    : undefined
  
  // Choose icon based on mode
  const SourceIcon = isLocalMode ? HardDrive : Cloud
  
  return (
    <div className={`
      flex items-center gap-2 
      ${compact ? 'p-1.5' : 'p-2'} 
      ${isTerminal 
        ? 'bg-black border border-green-500' 
        : isSepia 
        ? 'bg-amber-50 border border-amber-700'
        : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
      }
      rounded-lg
    `}>
      {/* Source Icon */}
      <SourceIcon 
        className={`
          ${compact ? 'w-4 h-4' : 'w-5 h-5'} 
          flex-shrink-0
          ${isTerminal 
            ? 'text-green-400' 
            : isSepia 
            ? 'text-amber-800' 
            : isLocalMode
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-gray-700 dark:text-gray-300'
          }
        `}
      />
      
      {/* Source Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {isLocalMode ? (
            <FolderOpen className={`
              ${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} 
              flex-shrink-0
              ${isTerminal ? 'text-green-500' : isSepia ? 'text-amber-700' : 'text-emerald-500 dark:text-emerald-400'}
            `} />
          ) : (
            <Database className={`
              ${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} 
              flex-shrink-0
              ${isTerminal ? 'text-green-500' : isSepia ? 'text-amber-700' : 'text-gray-500 dark:text-gray-400'}
            `} />
          )}
          
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                ${compact ? 'text-[9px]' : 'text-[10px]'} 
                font-mono font-semibold 
                hover:underline truncate
                ${isTerminal 
                  ? 'text-green-400 hover:text-green-300' 
                  : isSepia 
                  ? 'text-amber-900 hover:text-amber-800'
                  : 'text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400'
                }
              `}
              title={`${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}`}
            >
              {displayLabel}
            </a>
          ) : (
            <span
              className={`
                ${compact ? 'text-[9px]' : 'text-[10px]'} 
                font-mono font-semibold truncate
                ${isTerminal 
                  ? 'text-green-400' 
                  : isSepia 
                  ? 'text-amber-900'
                  : 'text-emerald-700 dark:text-emerald-300'
                }
              `}
              title={displayPath || 'Local Storage'}
            >
              {displayLabel}
            </span>
          )}
          
          {repoUrl && (
            <ExternalLink className={`
              ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} 
              flex-shrink-0 opacity-50
            `} />
          )}
        </div>
        <p className={`
          ${compact ? 'text-[8px]' : 'text-[9px]'} 
          ${isTerminal 
            ? 'text-green-600' 
            : isSepia 
            ? 'text-amber-700' 
            : isLocalMode
            ? 'text-emerald-600 dark:text-emerald-500'
            : 'text-gray-500 dark:text-gray-400'
          }
          uppercase tracking-wider
        `}>
          {displaySubtitle}
        </p>
      </div>
      
      {/* Edit Button (only if enabled) */}
      {allowEdit && onEdit && (
        <button
          onClick={onEdit}
          className={`
            ${compact ? 'p-1' : 'p-1.5'} 
            flex-shrink-0
            transition-all duration-200
            ${isTerminal
              ? 'bg-black border border-green-500 text-green-400 hover:bg-green-950'
              : isSepia
              ? 'bg-amber-100 border border-amber-700 text-amber-900 hover:bg-amber-200'
              : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
            rounded
          `}
          title="Change content source"
          aria-label="Edit content source settings"
        >
          <Settings className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </div>
  )
}

/**
 * Truncate a file path to show only the last portion
 */
function truncatePath(path: string, maxLength = 25): string {
  if (path.length <= maxLength) return path
  
  // Get the last folder name
  const parts = path.split(/[/\\]/)
  const lastFolder = parts[parts.length - 1] || parts[parts.length - 2] || path
  
  if (lastFolder.length <= maxLength) {
    return `.../${lastFolder}`
  }
  
  return `...${lastFolder.slice(-maxLength + 3)}`
}
