/**
 * Plugin Repository Info Popover
 *
 * Shows information about the plugin repository, how to contribute,
 * and allows editing the repository URL when not in public access mode.
 *
 * @module codex/ui/PluginRepoInfoPopover
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Info,
  ExternalLink,
  Github,
  BookOpen,
  Users,
  AlertCircle,
  Settings2,
  Check,
  X,
  RefreshCw,
  Scale,
  Sparkles,
} from 'lucide-react'
import {
  getPluginRepoInfo,
  getEffectivePluginRepo,
  getEffectivePluginRegistryUrl,
  getEffectiveCodexRepo,
  saveStoredConfig,
  clearStoredConfig,
  isUsingOfficialRepos,
  type PluginRepoInfo,
} from '@/lib/config/repositoryConfig'
import { isPublicAccess } from '@/lib/config/publicAccess'

interface PluginRepoInfoPopoverProps {
  /** Theme */
  theme?: string
  /** Button size */
  size?: 'sm' | 'md'
}

export default function PluginRepoInfoPopover({
  theme = 'light',
  size = 'sm',
}: PluginRepoInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [repoInfo, setRepoInfo] = useState<PluginRepoInfo | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Editable fields
  const [editPluginRepo, setEditPluginRepo] = useState('')
  const [editRegistryUrl, setEditRegistryUrl] = useState('')
  const [editCodexRepo, setEditCodexRepo] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  
  const isDark = theme.includes('dark')
  const publicAccess = isPublicAccess()
  
  useEffect(() => {
    setMounted(true)
    setRepoInfo(getPluginRepoInfo())
    setEditPluginRepo(getEffectivePluginRepo())
    setEditRegistryUrl(getEffectivePluginRegistryUrl())
    setEditCodexRepo(getEffectiveCodexRepo())
  }, [])
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setShowSettings(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])
  
  const handleSave = () => {
    setSaveStatus('saving')
    
    const success = saveStoredConfig({
      pluginRepo: editPluginRepo,
      pluginRegistryUrl: editRegistryUrl,
      codexRepo: editCodexRepo,
    })
    
    if (success) {
      setSaveStatus('saved')
      setRepoInfo(getPluginRepoInfo())
      setTimeout(() => setSaveStatus('idle'), 2000)
    } else {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }
  
  const handleReset = () => {
    clearStoredConfig()
    setEditPluginRepo(getEffectivePluginRepo())
    setEditRegistryUrl(getEffectivePluginRegistryUrl())
    setEditCodexRepo(getEffectiveCodexRepo())
    setRepoInfo(getPluginRepoInfo())
  }
  
  if (!mounted || !repoInfo) return null
  
  const buttonRect = buttonRef.current?.getBoundingClientRect()
  
  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          rounded transition-colors flex items-center justify-center
          ${size === 'sm' ? 'p-1' : 'p-1.5'}
          ${isOpen
            ? 'bg-cyan-500 text-white'
            : isDark
              ? 'hover:bg-zinc-700 text-zinc-400'
              : 'hover:bg-zinc-100 text-zinc-500'
          }
        `}
        aria-label="Plugin repository info"
        title="About plugin repository"
      >
        <Info className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>
      
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && buttonRect && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`
                fixed z-[9999] w-80 rounded-lg shadow-xl border overflow-hidden
                ${isDark
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-white border-zinc-200'
                }
              `}
              style={{
                top: buttonRect.bottom + 8,
                left: Math.min(buttonRect.left, window.innerWidth - 340),
              }}
            >
              {/* Header */}
              <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-purple-500" />
                    <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Plugin Repository
                    </span>
                    {repoInfo.isOfficial && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-600 dark:text-purple-400">
                        Official
                      </span>
                    )}
                  </div>
                  
                  {!publicAccess && (
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className={`
                        p-1 rounded transition-colors
                        ${showSettings
                          ? 'bg-purple-500 text-white'
                          : isDark
                            ? 'hover:bg-zinc-700 text-zinc-400'
                            : 'hover:bg-zinc-200 text-zinc-500'
                        }
                      `}
                      title="Configure repositories"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && !publicAccess && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`p-3 border-b space-y-3 ${isDark ? 'border-zinc-700 bg-zinc-800/30' : 'border-zinc-100 bg-amber-50/50'}`}>
                      <div className="flex items-center gap-2 text-[10px] text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Custom registry configuration</span>
                      </div>
                      
                      {/* Plugin Repo */}
                      <div className="space-y-1">
                        <label className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Plugin Repository (org/repo)
                        </label>
                        <input
                          type="text"
                          value={editPluginRepo}
                          onChange={(e) => setEditPluginRepo(e.target.value)}
                          placeholder="framersai/quarry-plugins"
                          className={`
                            w-full px-2 py-1.5 text-xs rounded border
                            ${isDark
                              ? 'bg-zinc-900 border-zinc-600 text-zinc-200'
                              : 'bg-white border-zinc-300 text-zinc-800'
                            }
                            focus:outline-none focus:ring-1 focus:ring-purple-500
                          `}
                        />
                      </div>
                      
                      {/* Registry URL */}
                      <div className="space-y-1">
                        <label className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Registry JSON URL
                        </label>
                        <input
                          type="text"
                          value={editRegistryUrl}
                          onChange={(e) => setEditRegistryUrl(e.target.value)}
                          placeholder="https://..."
                          className={`
                            w-full px-2 py-1.5 text-xs rounded border
                            ${isDark
                              ? 'bg-zinc-900 border-zinc-600 text-zinc-200'
                              : 'bg-white border-zinc-300 text-zinc-800'
                            }
                            focus:outline-none focus:ring-1 focus:ring-purple-500
                          `}
                        />
                      </div>
                      
                      {/* Codex Repo */}
                      <div className="space-y-1">
                        <label className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Codex Source Repository (org/repo)
                        </label>
                        <input
                          type="text"
                          value={editCodexRepo}
                          onChange={(e) => setEditCodexRepo(e.target.value)}
                          placeholder="framersai/frame.dev"
                          className={`
                            w-full px-2 py-1.5 text-xs rounded border
                            ${isDark
                              ? 'bg-zinc-900 border-zinc-600 text-zinc-200'
                              : 'bg-white border-zinc-300 text-zinc-800'
                            }
                            focus:outline-none focus:ring-1 focus:ring-purple-500
                          `}
                        />
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saveStatus === 'saving'}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
                        >
                          {saveStatus === 'saving' ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : saveStatus === 'saved' ? (
                            <Check className="w-3 h-3" />
                          ) : saveStatus === 'error' ? (
                            <X className="w-3 h-3" />
                          ) : null}
                          {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
                        </button>
                        <button
                          onClick={handleReset}
                          className={`
                            px-2 py-1.5 rounded text-xs
                            ${isDark
                              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                              : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                            }
                            transition-colors
                          `}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Repo Link */}
                <a
                  href={repoInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${isDark
                      ? 'border-zinc-700 hover:border-purple-500/50 hover:bg-zinc-800'
                      : 'border-zinc-200 hover:border-purple-500/50 hover:bg-purple-50/50'
                    }
                  `}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {repoInfo.owner}/{repoInfo.name}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Official Quarry plugin registry
                    </div>
                  </div>
                  <ExternalLink className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                </a>
                
                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={repoInfo.contributingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      flex items-center gap-2 p-2 rounded text-xs font-medium transition-colors
                      ${isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }
                    `}
                  >
                    <Users className="w-3.5 h-3.5 text-green-500" />
                    Contribute
                  </a>
                  <a
                    href={repoInfo.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      flex items-center gap-2 p-2 rounded text-xs font-medium transition-colors
                      ${isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }
                    `}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                    Documentation
                  </a>
                  <a
                    href={repoInfo.issuesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      flex items-center gap-2 p-2 rounded text-xs font-medium transition-colors
                      ${isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }
                    `}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    Issues
                  </a>
                  <div
                    className={`
                      flex items-center gap-2 p-2 rounded text-xs font-medium
                      ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}
                    `}
                  >
                    <Scale className="w-3.5 h-3.5 text-purple-500" />
                    {repoInfo.license} License
                  </div>
                </div>
                
                {/* Info Text */}
                <div className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <p className="mb-2">
                    <Sparkles className="w-3 h-3 inline mr-1 text-purple-500" />
                    <strong>Build your own plugins!</strong> Quarry plugins are MIT licensed and open source. 
                    You can create, customize, and host your own plugin registry.
                  </p>
                  <p>
                    Follow the contributing guide to submit plugins to the official registry, 
                    or set up a custom registry URL for private/enterprise deployments.
                  </p>
                </div>
                
                {/* Public access notice */}
                {publicAccess && (
                  <div className={`
                    p-2 rounded text-[10px] flex items-start gap-2
                    ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'}
                  `}>
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>
                      Repository settings are locked in public access mode. 
                      Contact the administrator to change the plugin registry.
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

