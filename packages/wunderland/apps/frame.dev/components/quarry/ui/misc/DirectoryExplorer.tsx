/**
 * Directory Explorer - Clean hierarchical file browser
 * @module codex/ui/DirectoryExplorer
 * 
 * @remarks
 * A true directory explorer with hierarchical navigation.
 * - Weaves get special styling with colored labels
 * - Looms show with folder icons
 * - Strands (files) listed cleanly
 * - No cards - just clean tree navigation
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Folder, FolderOpen, FileText, ChevronRight, 
  Layers, Box, File, Image as ImageIcon, 
  Code, FileJson, FileCode
} from 'lucide-react'
import type { GitHubFile, FileFilterScope } from '../../types'

interface DirectoryExplorerProps {
  /** Files in the current directory */
  files: GitHubFile[]
  /** Current directory path */
  currentPath: string
  /** Handle file/folder click */
  onItemClick: (item: GitHubFile) => void
  /** Current filter scope */
  filterScope?: FileFilterScope
  /** Current theme */
  theme?: string
}

// Weave color palettes
const WEAVE_COLORS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  frame: { 
    border: 'border-l-purple-500', 
    bg: 'bg-purple-50 dark:bg-purple-950/20', 
    text: 'text-purple-700 dark:text-purple-300',
    label: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
  },
  wiki: { 
    border: 'border-l-emerald-500', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
  },
  research: { 
    border: 'border-l-cyan-500', 
    bg: 'bg-cyan-50 dark:bg-cyan-950/20', 
    text: 'text-cyan-700 dark:text-cyan-300',
    label: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300'
  },
  default: { 
    border: 'border-l-amber-500', 
    bg: 'bg-amber-50 dark:bg-amber-950/20', 
    text: 'text-amber-700 dark:text-amber-300',
    label: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
  },
}

function getWeaveColor(name: string) {
  return WEAVE_COLORS[name.toLowerCase()] || WEAVE_COLORS.default
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'md':
    case 'mdx':
      return <FileText className="w-4 h-4 text-cyan-500" />
    case 'json':
    case 'yaml':
    case 'yml':
      return <FileJson className="w-4 h-4 text-amber-500" />
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-blue-500" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <ImageIcon className="w-4 h-4 text-pink-500" />
    default:
      return <File className="w-4 h-4 text-zinc-400" />
  }
}

/**
 * Clean directory explorer with hierarchical navigation
 */
export default function DirectoryExplorer({
  files,
  currentPath,
  onItemClick,
  filterScope = 'all',
  theme = 'light',
}: DirectoryExplorerProps) {
  const isDark = theme.includes('dark')
  
  // Sort: directories first, then files, alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  
  const directories = sortedFiles.filter(f => f.type === 'dir')
  const fileItems = sortedFiles.filter(f => f.type === 'file')
  
  // Determine folder level from path
  const getItemLevel = (item: GitHubFile) => {
    const parts = item.path.split('/')
    if (parts[0] === 'weaves') {
      if (parts.length === 2) return 'weave'
      if (parts.length >= 3 && item.type === 'dir') return 'loom'
    }
    return item.type === 'dir' ? 'folder' : 'strand'
  }
  
  const formatName = (name: string) => {
    return name
      .replace('.md', '')
      .replace('.mdx', '')
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Directory Header */}
      <div className={`
        sticky top-0 z-10 px-4 py-3 border-b backdrop-blur-sm
        ${isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/90 border-zinc-200'}
      `}>
        <div className="flex items-center gap-2 text-sm">
          <FolderOpen className="w-4 h-4 text-amber-500" />
          <span className="font-mono text-zinc-500 dark:text-zinc-400">
            /{currentPath || 'root'}
          </span>
          {filterScope !== 'all' && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
              {filterScope}
            </span>
          )}
        </div>
      </div>

      <div className="p-2">
        {/* Directories Section */}
        {directories.length > 0 && (
          <div className="mb-4">
            <div className={`
              px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `}>
              Directories
            </div>
            <div className="space-y-0.5">
              {directories.map((item, index) => {
                const level = getItemLevel(item)
                const isWeave = level === 'weave'
                const isLoom = level === 'loom'
                const weaveName = isWeave ? item.name : item.path.split('/')[1]
                const colors = isWeave ? getWeaveColor(item.name) : getWeaveColor(weaveName || '')
                
                return (
                  <motion.button
                    key={item.path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => onItemClick(item)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                      transition-all duration-150 group
                      ${isWeave 
                        ? `${colors.bg} ${colors.border} border-l-4 hover:shadow-md` 
                        : isLoom
                          ? 'hover:bg-amber-50 dark:hover:bg-amber-950/20 border-l-2 border-l-transparent hover:border-l-amber-400'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                      }
                    `}
                  >
                    {/* Icon */}
                    {isWeave ? (
                      <div className={`p-1.5 rounded-md ${colors.label}`}>
                        <Layers className="w-4 h-4" />
                      </div>
                    ) : isLoom ? (
                      <Box className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Folder className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                    )}
                    
                    {/* Name and Label */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={`
                        font-medium truncate
                        ${isWeave 
                          ? colors.text 
                          : isLoom
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
                        }
                      `}>
                        {formatName(item.name)}
                      </span>
                      
                      {/* Level Label */}
                      {isWeave && (
                        <span className={`
                          text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                          ${colors.label}
                        `}>
                          Weave
                        </span>
                      )}
                      {isLoom && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                          Loom
                        </span>
                      )}
                    </div>
                    
                    {/* Arrow */}
                    <ChevronRight className={`
                      w-4 h-4 transition-transform group-hover:translate-x-0.5
                      ${isWeave ? colors.text : 'text-zinc-400'}
                    `} />
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {/* Files Section */}
        {fileItems.length > 0 && (
          <div>
            <div className={`
              px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `}>
              Strands ({fileItems.length})
            </div>
            <div className="space-y-0.5">
              {fileItems.map((item, index) => (
                <motion.button
                  key={item.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (directories.length + index) * 0.02 }}
                  onClick={() => onItemClick(item)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                    transition-all duration-150 group
                    hover:bg-cyan-50 dark:hover:bg-cyan-950/20
                    border-l-2 border-l-transparent hover:border-l-cyan-400
                  `}
                >
                  {/* File Icon */}
                  {getFileIcon(item.name)}
                  
                  {/* Name */}
                  <span className="flex-1 min-w-0 truncate text-zinc-600 dark:text-zinc-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300">
                    {formatName(item.name)}
                  </span>
                  
                  {/* Extension Badge */}
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500">
                    {item.name.split('.').pop()?.toUpperCase() || 'FILE'}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {directories.length === 0 && fileItems.length === 0 && (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {filterScope !== 'all' 
                ? `No ${filterScope} items in this folder` 
                : 'This folder is empty'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

















