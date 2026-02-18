/**
 * Node Configuration Editor - Edit weave/loom settings
 * @module codex/ui/NodeConfigEditor
 * 
 * @remarks
 * Modal for editing weave.yaml and loom.yaml configurations.
 * Supports local draft saving and GitHub PR publishing.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Save, Upload, Trash2, Eye, EyeOff, 
  Palette, Type, Image, Star, AlertCircle,
  Check, Loader2, GitPullRequest, ChevronDown
} from 'lucide-react'
import type { KnowledgeTreeNode, NodeVisualStyle } from '../../types'
import type { WeaveConfig, LoomConfig, NodeConfigDraft } from '../../lib/nodeConfig'
import {
  fetchNodeConfig,
  saveDraft,
  getDraft,
  deleteDraft,
  serializeConfigToYaml,
  createDefaultWeaveConfig,
  createDefaultLoomConfig,
} from '../../lib/nodeConfig'
import IconPicker from './IconPicker'
import DynamicIcon from '../common/DynamicIcon'

interface NodeConfigEditorProps {
  /** The node being edited */
  node: KnowledgeTreeNode
  /** Whether the modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Theme */
  theme?: string
  /** Callback after successful save/publish */
  onConfigUpdate?: (node: KnowledgeTreeNode, config: WeaveConfig | LoomConfig) => void
  /** GitHub PAT for PR creation */
  githubPat?: string
  /** Whether auto-merge is enabled */
  autoMerge?: boolean
}

type TabId = 'general' | 'style' | 'metadata' | 'preview'

export default function NodeConfigEditor({
  node,
  isOpen,
  onClose,
  theme = 'light',
  onConfigUpdate,
  githubPat,
  autoMerge = false,
}: NodeConfigEditorProps) {
  const isDark = theme.includes('dark')
  const nodeType = node.level === 'weave' ? 'weave' : 'loom'
  
  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [originalConfig, setOriginalConfig] = useState<WeaveConfig | LoomConfig | null>(null)
  const [config, setConfig] = useState<WeaveConfig | LoomConfig>({})
  const [isDirty, setIsDirty] = useState(false)
  const [configExists, setConfigExists] = useState(false)
  
  // Load config on mount
  useEffect(() => {
    if (!isOpen) return
    
    async function loadConfig() {
      setLoading(true)
      setError(null)
      
      // Check for local draft first
      const draft = getDraft(node.path)
      if (draft) {
        setOriginalConfig(draft.original)
        setConfig(draft.edited)
        setIsDirty(draft.isDirty)
        setConfigExists(draft.original !== null)
        setLoading(false)
        return
      }
      
      // Fetch from GitHub
      try {
        const { config: fetchedConfig, exists } = await fetchNodeConfig(node.path, nodeType)
        setOriginalConfig(exists ? fetchedConfig : null)
        setConfig(exists ? fetchedConfig : (
          nodeType === 'weave' 
            ? createDefaultWeaveConfig(node.name) 
            : createDefaultLoomConfig(node.name)
        ))
        setConfigExists(exists)
        setIsDirty(false)
      } catch (err) {
        setError('Failed to load configuration')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    loadConfig()
  }, [isOpen, node.path, node.name, nodeType])
  
  // Update config field
  const updateConfig = useCallback(<K extends keyof (WeaveConfig & LoomConfig)>(
    key: K,
    value: (WeaveConfig & LoomConfig)[K]
  ) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: value }
      setIsDirty(JSON.stringify(updated) !== JSON.stringify(originalConfig))
      return updated
    })
  }, [originalConfig])
  
  // Update nested style field
  const updateStyle = useCallback(<K extends keyof NodeVisualStyle>(
    key: K,
    value: NodeVisualStyle[K]
  ) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        style: { ...prev.style, [key]: value }
      }
      setIsDirty(JSON.stringify(updated) !== JSON.stringify(originalConfig))
      return updated
    })
  }, [originalConfig])
  
  // Save draft locally
  const handleSaveDraft = useCallback(() => {
    setSaving(true)
    setError(null)
    
    try {
      saveDraft(node.path, nodeType, originalConfig, config)
      setSuccess('Draft saved locally')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Failed to save draft')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [node.path, nodeType, originalConfig, config])
  
  // Discard draft
  const handleDiscardDraft = useCallback(() => {
    deleteDraft(node.path)
    if (originalConfig) {
      setConfig(originalConfig)
    } else {
      setConfig(nodeType === 'weave' 
        ? createDefaultWeaveConfig(node.name) 
        : createDefaultLoomConfig(node.name))
    }
    setIsDirty(false)
    setSuccess('Draft discarded')
    setTimeout(() => setSuccess(null), 2000)
  }, [node.path, node.name, nodeType, originalConfig])
  
  // Publish to GitHub (create PR)
  const handlePublish = useCallback(async () => {
    if (!githubPat) {
      setError('GitHub Personal Access Token required for publishing. Set it in Settings.')
      return
    }
    
    setPublishing(true)
    setError(null)
    
    try {
      const yaml = serializeConfigToYaml(config)
      const configFileName = nodeType === 'weave' ? 'weave.yaml' : 'loom.yaml'
      const filePath = `${node.path}/${configFileName}`
      const branchName = `codex/update-${nodeType}-${node.name}-${Date.now()}`
      
      // Create branch, commit, and PR via GitHub API
      // This is a simplified implementation - production would use proper GitHub API calls
      const response = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubPat}`,
        },
        body: JSON.stringify({
          filePath,
          content: yaml,
          branchName,
          commitMessage: `Update ${nodeType} config for ${node.name}`,
          prTitle: `[Codex] Update ${nodeType}: ${config.name || node.name}`,
          prBody: `Updates configuration for ${nodeType} at \`${node.path}\`.\n\nChanges:\n${generateChangeSummary(originalConfig, config)}`,
          autoMerge,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create pull request')
      }
      
      const { prUrl } = await response.json()
      
      // Clear draft after successful publish
      deleteDraft(node.path)
      setOriginalConfig(config)
      setIsDirty(false)
      
      setSuccess(`Pull request created${autoMerge ? ' and auto-merged' : ''}!`)
      
      // Notify parent of update
      onConfigUpdate?.(node, config)
      
      // Open PR in new tab
      if (prUrl) {
        window.open(prUrl, '_blank')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }, [config, githubPat, node, nodeType, originalConfig, autoMerge, onConfigUpdate])
  
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`
            w-full max-w-2xl max-h-[85vh] overflow-hidden
            rounded-xl border shadow-2xl
            ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between px-4 py-3 border-b
            ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-lg
                ${nodeType === 'weave' 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }
              `}>
                <DynamicIcon name={config.style?.icon || (nodeType === 'weave' ? 'Layers' : 'Box')} className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Edit {nodeType === 'weave' ? 'Weave' : 'Loom'}
                </h2>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {node.path}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isDirty && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  Unsaved
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className={`
            flex gap-1 px-4 py-2 border-b overflow-x-auto
            ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
          `}>
            {(['general', 'style', 'metadata', 'preview'] as TabId[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                  ${activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto max-h-[50vh] p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'general' && (
                    <GeneralTab
                      config={config}
                      nodeType={nodeType}
                      updateConfig={updateConfig}
                      isDark={isDark}
                    />
                  )}
                  
                  {activeTab === 'style' && (
                    <StyleTab
                      config={config}
                      updateStyle={updateStyle}
                      theme={theme}
                      isDark={isDark}
                    />
                  )}
                  
                  {activeTab === 'metadata' && (
                    <MetadataTab
                      config={config}
                      nodeType={nodeType}
                      updateConfig={updateConfig}
                      isDark={isDark}
                    />
                  )}
                  
                  {activeTab === 'preview' && (
                    <PreviewTab
                      config={config}
                      nodeType={nodeType}
                      isDark={isDark}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          
          {/* Footer */}
          <div className={`
            flex items-center justify-between gap-3 px-4 py-3 border-t
            ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}
          `}>
            {/* Status Messages */}
            <div className="flex-1">
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-xs text-emerald-500">
                  <Check className="w-3.5 h-3.5" />
                  {success}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  onClick={handleDiscardDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard
                </button>
              )}
              
              <button
                onClick={handleSaveDraft}
                disabled={saving || !isDirty}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                  ${isDirty
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }
                `}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Draft
              </button>
              
              <button
                onClick={handlePublish}
                disabled={publishing || !isDirty || !githubPat}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                  ${isDirty && githubPat
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }
                `}
                title={!githubPat ? 'Set GitHub PAT in Settings to publish' : undefined}
              >
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitPullRequest className="w-3.5 h-3.5" />}
                Publish
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// === Tab Components ===

function GeneralTab({
  config,
  nodeType,
  updateConfig,
  isDark,
}: {
  config: WeaveConfig | LoomConfig
  nodeType: 'weave' | 'loom'
  updateConfig: <K extends keyof (WeaveConfig & LoomConfig)>(key: K, value: (WeaveConfig & LoomConfig)[K]) => void
  isDark: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Display Name
        </label>
        <input
          type="text"
          value={config.name || ''}
          onChange={(e) => updateConfig('name', e.target.value)}
          placeholder={`Enter ${nodeType} name...`}
          className={`
            w-full px-3 py-2 text-sm rounded-lg border
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
              : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
      </div>
      
      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Description
        </label>
        <textarea
          value={config.description || ''}
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder={`Brief description of this ${nodeType}...`}
          rows={3}
          className={`
            w-full px-3 py-2 text-sm rounded-lg border resize-none
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
              : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
      </div>
      
      {/* Order */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Sort Order
        </label>
        <input
          type="number"
          value={config.order ?? 0}
          onChange={(e) => updateConfig('order', parseInt(e.target.value) || 0)}
          className={`
            w-24 px-3 py-2 text-sm rounded-lg border
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100' 
              : 'bg-white border-zinc-300 text-zinc-900'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
        <p className="text-[10px] text-zinc-400">Lower numbers appear first</p>
      </div>
      
      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        {nodeType === 'weave' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(config as WeaveConfig).featured ?? false}
              onChange={(e) => updateConfig('featured' as keyof WeaveConfig, e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500/30"
            />
            <span className="text-xs text-zinc-700 dark:text-zinc-300">
              <Star className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
              Featured
            </span>
          </label>
        )}
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.hidden ?? false}
            onChange={(e) => updateConfig('hidden', e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500/30"
          />
          <span className="text-xs text-zinc-700 dark:text-zinc-300">
            <EyeOff className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
            Hidden
          </span>
        </label>
      </div>
    </div>
  )
}

function StyleTab({
  config,
  updateStyle,
  theme,
  isDark,
}: {
  config: WeaveConfig | LoomConfig
  updateStyle: <K extends keyof NodeVisualStyle>(key: K, value: NodeVisualStyle[K]) => void
  theme: string
  isDark: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Icon Picker */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Icon
        </label>
        <IconPicker
          value={config.style?.icon}
          onChange={(icon) => updateStyle('icon', icon)}
          theme={theme}
          size="md"
        />
      </div>
      
      {/* Emoji (alternative to icon) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Emoji (alternative to icon)
        </label>
        <input
          type="text"
          value={config.style?.emoji || ''}
          onChange={(e) => updateStyle('emoji', e.target.value.slice(0, 2))}
          placeholder="🎯"
          maxLength={2}
          className={`
            w-20 px-3 py-2 text-lg text-center rounded-lg border
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700' 
              : 'bg-white border-zinc-300'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
      </div>
      
      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Accent Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.style?.accentColor || '#3b82f6'}
              onChange={(e) => updateStyle('accentColor', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <input
              type="text"
              value={config.style?.accentColor || ''}
              onChange={(e) => updateStyle('accentColor', e.target.value)}
              placeholder="#3b82f6"
              className={`
                flex-1 px-3 py-2 text-sm rounded-lg border
                ${isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100' 
                  : 'bg-white border-zinc-300 text-zinc-900'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/30
              `}
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Background Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.style?.backgroundColor || '#ffffff'}
              onChange={(e) => updateStyle('backgroundColor', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <input
              type="text"
              value={config.style?.backgroundColor || ''}
              onChange={(e) => updateStyle('backgroundColor', e.target.value)}
              placeholder="#ffffff"
              className={`
                flex-1 px-3 py-2 text-sm rounded-lg border
                ${isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100' 
                  : 'bg-white border-zinc-300 text-zinc-900'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/30
              `}
            />
          </div>
        </div>
      </div>
      
      {/* Image URLs */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Thumbnail URL (64x64)
        </label>
        <input
          type="url"
          value={config.style?.thumbnail || ''}
          onChange={(e) => updateStyle('thumbnail', e.target.value)}
          placeholder="https://example.com/icon.png"
          className={`
            w-full px-3 py-2 text-sm rounded-lg border
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
              : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Cover Image URL
        </label>
        <input
          type="url"
          value={config.style?.coverImage || ''}
          onChange={(e) => updateStyle('coverImage', e.target.value)}
          placeholder="https://example.com/cover.jpg"
          className={`
            w-full px-3 py-2 text-sm rounded-lg border
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
              : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Background Image URL
        </label>
        <input
          type="url"
          value={config.style?.backgroundImage || ''}
          onChange={(e) => updateStyle('backgroundImage', e.target.value)}
          placeholder="https://example.com/bg.jpg"
          className={`
            w-full px-3 py-2 text-sm rounded-lg border
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
              : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
      </div>
      
      {/* Dark text toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.style?.darkText ?? false}
          onChange={(e) => updateStyle('darkText', e.target.checked)}
          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500/30"
        />
        <span className="text-xs text-zinc-700 dark:text-zinc-300">
          Use dark text (for light backgrounds)
        </span>
      </label>
    </div>
  )
}

function MetadataTab({
  config,
  nodeType,
  updateConfig,
  isDark,
}: {
  config: WeaveConfig | LoomConfig
  nodeType: 'weave' | 'loom'
  updateConfig: <K extends keyof (WeaveConfig & LoomConfig)>(key: K, value: (WeaveConfig & LoomConfig)[K]) => void
  isDark: boolean
}) {
  const metadata = config.metadata || {}
  
  const updateMetadata = <K extends string>(key: K, value: unknown) => {
    updateConfig('metadata' as keyof (WeaveConfig & LoomConfig), { ...metadata, [key]: value } as (WeaveConfig & LoomConfig)['metadata'])
  }
  
  return (
    <div className="space-y-4">
      {/* Author */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Author / Maintainer
        </label>
        <input
          type="text"
          value={metadata.author || ''}
          onChange={(e) => updateMetadata('author', e.target.value)}
          placeholder="Your name or handle"
          className={`
            w-full px-3 py-2 text-sm rounded-lg border
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
              : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
      </div>
      
      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={metadata.tags?.join(', ') || ''}
          onChange={(e) => updateMetadata('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
          placeholder="technology, programming, tutorial"
          className={`
            w-full px-3 py-2 text-sm rounded-lg border
            ${isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
              : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/30
          `}
        />
      </div>
      
      {/* Weave-specific: License */}
      {nodeType === 'weave' && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            License
          </label>
          <input
            type="text"
            value={(metadata as WeaveConfig['metadata'])?.license || ''}
            onChange={(e) => updateMetadata('license', e.target.value)}
            placeholder="MIT, CC-BY-4.0, etc."
            className={`
              w-full px-3 py-2 text-sm rounded-lg border
              ${isDark 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
                : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/30
            `}
          />
        </div>
      )}
      
      {/* Loom-specific: Difficulty */}
      {nodeType === 'loom' && (
        <>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Difficulty Level
            </label>
            <select
              value={(metadata as LoomConfig['metadata'])?.difficulty || 'beginner'}
              onChange={(e) => updateMetadata('difficulty', e.target.value)}
              className={`
                w-full px-3 py-2 text-sm rounded-lg border
                ${isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100' 
                  : 'bg-white border-zinc-300 text-zinc-900'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/30
              `}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Estimated Time (minutes)
            </label>
            <input
              type="number"
              value={(metadata as LoomConfig['metadata'])?.estimatedTime || ''}
              onChange={(e) => updateMetadata('estimatedTime', parseInt(e.target.value) || undefined)}
              placeholder="30"
              className={`
                w-24 px-3 py-2 text-sm rounded-lg border
                ${isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100' 
                  : 'bg-white border-zinc-300 text-zinc-900'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/30
              `}
            />
          </div>
        </>
      )}
      
      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        {nodeType === 'weave' && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Created
              </label>
              <input
                type="date"
                value={(metadata as WeaveConfig['metadata'])?.created || ''}
                onChange={(e) => updateMetadata('created', e.target.value)}
                className={`
                  w-full px-3 py-2 text-sm rounded-lg border
                  ${isDark 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100' 
                    : 'bg-white border-zinc-300 text-zinc-900'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/30
                `}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Last Updated
              </label>
              <input
                type="date"
                value={(metadata as WeaveConfig['metadata'])?.updated || ''}
                onChange={(e) => updateMetadata('updated', e.target.value)}
                className={`
                  w-full px-3 py-2 text-sm rounded-lg border
                  ${isDark 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100' 
                    : 'bg-white border-zinc-300 text-zinc-900'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/30
                `}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PreviewTab({
  config,
  nodeType,
  isDark,
}: {
  config: WeaveConfig | LoomConfig
  nodeType: 'weave' | 'loom'
  isDark: boolean
}) {
  const yaml = serializeConfigToYaml(config)
  
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Generated YAML ({nodeType}.yaml)
        </label>
        <pre className={`
          p-4 rounded-lg text-xs font-mono overflow-x-auto
          ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}
        `}>
          {yaml || '# Empty configuration'}
        </pre>
      </div>
      
      {/* Visual Preview */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Visual Preview
        </label>
        <div className={`
          p-4 rounded-lg border
          ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
        `}>
          <div 
            className="flex items-center gap-3 p-3 rounded-lg border"
            style={{
              backgroundColor: config.style?.backgroundColor,
              borderColor: config.style?.borderColor || (isDark ? '#3f3f46' : '#e4e4e7'),
            }}
          >
            {config.style?.emoji ? (
              <span className="text-2xl">{config.style.emoji}</span>
            ) : (
              <DynamicIcon 
                name={config.style?.icon || (nodeType === 'weave' ? 'Layers' : 'Box')} 
                className="w-6 h-6"
                style={{ color: config.style?.accentColor }}
              />
            )}
            <div>
              <h3 
                className="text-sm font-bold"
                style={{ color: config.style?.textColor || (config.style?.darkText ? '#18181b' : undefined) }}
              >
                {config.name || 'Untitled'}
              </h3>
              {config.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {config.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Generate a human-readable summary of config changes
 */
function generateChangeSummary(
  original: WeaveConfig | LoomConfig | null,
  updated: WeaveConfig | LoomConfig
): string {
  if (!original) {
    return '- Created new configuration'
  }
  
  const changes: string[] = []
  
  if (original.name !== updated.name) {
    changes.push(`- Name: "${original.name}" → "${updated.name}"`)
  }
  if (original.description !== updated.description) {
    changes.push(`- Description updated`)
  }
  if (JSON.stringify(original.style) !== JSON.stringify(updated.style)) {
    changes.push(`- Visual style updated`)
  }
  if (JSON.stringify(original.metadata) !== JSON.stringify(updated.metadata)) {
    changes.push(`- Metadata updated`)
  }
  
  return changes.length > 0 ? changes.join('\n') : '- Minor changes'
}


















