'use client'

/**
 * BlockTagContributor
 * 
 * Component that allows users to suggest block tag changes
 * by generating a PR to the codex repository.
 * 
 * Workflow:
 * 1. User selects a block and suggests tag changes
 * 2. Component generates a diff of the frontmatter changes
 * 3. User previews the changes
 * 4. Component opens GitHub to create a PR with the changes
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  GitPullRequest, 
  Plus, 
  Minus, 
  Check, 
  X, 
  ExternalLink,
  AlertCircle,
  Copy,
  FileCode,
  Tag
} from 'lucide-react'
import type { StrandBlock, SuggestedTag } from '@/lib/blockDatabase'

// ============================================================================
// TYPES
// ============================================================================

interface BlockTagContributorProps {
  /** Current strand path (relative to codex repo) */
  strandPath: string
  /** Block to contribute tags for */
  block: StrandBlock
  /** Current theme */
  isDark: boolean
  /** Text size classes */
  textSizeClasses: Record<string, string>
  /** Callback when contribution is submitted */
  onSubmit?: (contribution: TagContribution) => void
  /** Callback to close the contributor */
  onClose?: () => void
}

export interface TagContribution {
  strandPath: string
  blockId: string
  addedTags: string[]
  removedTags: string[]
  acceptedSuggestions: string[]
  rejectedSuggestions: string[]
  reasoning?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CODEX_REPO = 'framersai/codex'
const CODEX_BRANCH = 'main'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate the frontmatter diff for a tag contribution
 */
function generateFrontmatterPatch(
  strandPath: string,
  blockId: string,
  contribution: TagContribution
): string {
  const lines: string[] = []
  
  lines.push(`# Block Tag Contribution`)
  lines.push(``)
  lines.push(`**Strand:** \`${strandPath}\``)
  lines.push(`**Block ID:** \`${blockId}\``)
  lines.push(``)
  
  if (contribution.addedTags.length > 0) {
    lines.push(`## Tags to Add`)
    for (const tag of contribution.addedTags) {
      lines.push(`- \`${tag}\``)
    }
    lines.push(``)
  }
  
  if (contribution.removedTags.length > 0) {
    lines.push(`## Tags to Remove`)
    for (const tag of contribution.removedTags) {
      lines.push(`- \`${tag}\``)
    }
    lines.push(``)
  }
  
  if (contribution.acceptedSuggestions.length > 0) {
    lines.push(`## Accepted Suggestions`)
    for (const tag of contribution.acceptedSuggestions) {
      lines.push(`- \`${tag}\``)
    }
    lines.push(``)
  }
  
  if (contribution.rejectedSuggestions.length > 0) {
    lines.push(`## Rejected Suggestions`)
    for (const tag of contribution.rejectedSuggestions) {
      lines.push(`- \`${tag}\``)
    }
    lines.push(``)
  }
  
  if (contribution.reasoning) {
    lines.push(`## Reasoning`)
    lines.push(contribution.reasoning)
  }
  
  return lines.join('\n')
}

/**
 * Generate GitHub issue URL for tag contribution
 */
function generateGitHubIssueUrl(
  strandPath: string,
  contribution: TagContribution
): string {
  const title = encodeURIComponent(`[Block Tags] ${strandPath} - ${contribution.blockId}`)
  const body = encodeURIComponent(generateFrontmatterPatch(strandPath, contribution.blockId, contribution))
  const labels = encodeURIComponent('block-tags,contribution')
  
  return `https://github.com/${CODEX_REPO}/issues/new?title=${title}&body=${body}&labels=${labels}`
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BlockTagContributor({
  strandPath,
  block,
  isDark,
  textSizeClasses,
  onSubmit,
  onClose
}: BlockTagContributorProps) {
  // Local state for tag changes
  const [addedTags, setAddedTags] = useState<string[]>([])
  const [removedTags, setRemovedTags] = useState<string[]>([])
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<string[]>([])
  const [rejectedSuggestions, setRejectedSuggestions] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Current tags (existing + added - removed)
  const currentTags = [
    ...(block.tags || []).filter(t => !removedTags.includes(t)),
    ...addedTags
  ]
  
  // Pending suggestions (not yet accepted or rejected)
  const pendingSuggestions = (block.suggestedTags || []).filter(
    st => !acceptedSuggestions.includes(st.tag) && !rejectedSuggestions.includes(st.tag)
  )
  
  // Has changes?
  const hasChanges = 
    addedTags.length > 0 || 
    removedTags.length > 0 || 
    acceptedSuggestions.length > 0 || 
    rejectedSuggestions.length > 0
  
  // Handlers
  const handleAddTag = useCallback(() => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !currentTags.includes(tag) && !addedTags.includes(tag)) {
      setAddedTags(prev => [...prev, tag])
      setNewTag('')
    }
  }, [newTag, currentTags, addedTags])
  
  const handleRemoveAddedTag = useCallback((tag: string) => {
    setAddedTags(prev => prev.filter(t => t !== tag))
  }, [])
  
  const handleRemoveExistingTag = useCallback((tag: string) => {
    if (!removedTags.includes(tag)) {
      setRemovedTags(prev => [...prev, tag])
    }
  }, [removedTags])
  
  const handleUndoRemoveTag = useCallback((tag: string) => {
    setRemovedTags(prev => prev.filter(t => t !== tag))
  }, [])
  
  const handleAcceptSuggestion = useCallback((tag: string) => {
    setAcceptedSuggestions(prev => [...prev, tag])
    setRejectedSuggestions(prev => prev.filter(t => t !== tag))
  }, [])
  
  const handleRejectSuggestion = useCallback((tag: string) => {
    setRejectedSuggestions(prev => [...prev, tag])
    setAcceptedSuggestions(prev => prev.filter(t => t !== tag))
  }, [])
  
  const handleSubmit = useCallback(() => {
    const contribution: TagContribution = {
      strandPath,
      blockId: block.blockId,
      addedTags,
      removedTags,
      acceptedSuggestions,
      rejectedSuggestions,
      reasoning: reasoning.trim() || undefined
    }
    
    // Open GitHub issue
    const url = generateGitHubIssueUrl(strandPath, contribution)
    window.open(url, '_blank')
    
    onSubmit?.(contribution)
  }, [strandPath, block.blockId, addedTags, removedTags, acceptedSuggestions, rejectedSuggestions, reasoning, onSubmit])
  
  const handleCopyDiff = useCallback(async () => {
    const contribution: TagContribution = {
      strandPath,
      blockId: block.blockId,
      addedTags,
      removedTags,
      acceptedSuggestions,
      rejectedSuggestions,
      reasoning: reasoning.trim() || undefined
    }
    
    const diff = generateFrontmatterPatch(strandPath, contribution.blockId, contribution)
    await navigator.clipboard.writeText(diff)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [strandPath, block.blockId, addedTags, removedTags, acceptedSuggestions, rejectedSuggestions, reasoning])
  
  return (
    <div className={`
      rounded-lg border overflow-hidden
      ${isDark 
        ? 'bg-zinc-800/80 border-zinc-700' 
        : 'bg-white border-zinc-200'
      }
    `}>
      {/* Header */}
      <div className={`
        flex items-center justify-between px-3 py-2 border-b
        ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-50'}
      `}>
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 text-purple-500" />
          <span className={`${textSizeClasses.sm} font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
            Contribute Tags
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700`}
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-4">
        {/* Block Info */}
        <div className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Block: <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700">{block.blockId}</code>
          {block.headingText && (
            <span className="ml-2">"{block.headingText}"</span>
          )}
        </div>
        
        {/* Current Tags */}
        <div>
          <label className={`${textSizeClasses.xs} font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'} block mb-1.5`}>
            Current Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {currentTags.length === 0 && (
              <span className={`${textSizeClasses.xs} text-zinc-400 italic`}>No tags</span>
            )}
            {(block.tags || []).filter(t => !removedTags.includes(t)).map(tag => (
              <span
                key={tag}
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  ${textSizeClasses.xs}
                  ${isDark 
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' 
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }
                `}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
                <button
                  onClick={() => handleRemoveExistingTag(tag)}
                  className="ml-0.5 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {addedTags.map(tag => (
              <span
                key={`added-${tag}`}
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  ${textSizeClasses.xs}
                  ${isDark 
                    ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' 
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                  }
                `}
              >
                <Plus className="w-2.5 h-2.5" />
                {tag}
                <button
                  onClick={() => handleRemoveAddedTag(tag)}
                  className="ml-0.5 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          
          {/* Removed tags (with undo) */}
          {removedTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {removedTags.map(tag => (
                <span
                  key={`removed-${tag}`}
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full line-through opacity-60
                    ${textSizeClasses.xs}
                    ${isDark 
                      ? 'bg-red-900/30 text-red-400 border border-red-800/50' 
                      : 'bg-red-100 text-red-700 border border-red-200'
                    }
                  `}
                >
                  <Minus className="w-2.5 h-2.5" />
                  {tag}
                  <button
                    onClick={() => handleUndoRemoveTag(tag)}
                    className="ml-0.5 hover:text-emerald-500"
                    title="Undo remove"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Add New Tag */}
        <div>
          <label className={`${textSizeClasses.xs} font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'} block mb-1.5`}>
            Add New Tag
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              placeholder="Enter tag..."
              className={`
                flex-1 px-2 py-1.5 rounded border
                ${textSizeClasses.sm}
                ${isDark 
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder-zinc-500' 
                  : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                }
                focus:outline-none focus:ring-2 focus:ring-purple-500/30
              `}
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className={`
                px-3 py-1.5 rounded font-medium
                ${textSizeClasses.sm}
                ${newTag.trim()
                  ? 'bg-purple-600 text-white hover:bg-purple-500'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-700'
                }
              `}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Pending Suggestions */}
        {pendingSuggestions.length > 0 && (
          <div>
            <label className={`${textSizeClasses.xs} font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'} block mb-1.5`}>
              Review Suggestions
            </label>
            <div className="space-y-1.5">
              {pendingSuggestions.map(st => (
                <div
                  key={st.tag}
                  className={`
                    flex items-center justify-between p-2 rounded-lg
                    ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className={`
                      px-2 py-0.5 rounded-full
                      ${textSizeClasses.xs}
                      ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}
                    `}>
                      {st.tag}
                    </span>
                    <span className={`${textSizeClasses.xs} text-zinc-400`}>
                      {Math.round(st.confidence * 100)}% · {st.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAcceptSuggestion(st.tag)}
                      className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(st.tag)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Reasoning */}
        <div>
          <label className={`${textSizeClasses.xs} font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'} block mb-1.5`}>
            Reasoning (optional)
          </label>
          <textarea
            value={reasoning}
            onChange={e => setReasoning(e.target.value)}
            placeholder="Why are you suggesting these changes?"
            rows={2}
            className={`
              w-full px-2 py-1.5 rounded border resize-none
              ${textSizeClasses.sm}
              ${isDark 
                ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder-zinc-500' 
                : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
              }
              focus:outline-none focus:ring-2 focus:ring-purple-500/30
            `}
          />
        </div>
        
        {/* Preview Toggle */}
        <AnimatePresence>
          {showPreview && hasChanges && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`
                p-3 rounded-lg border
                ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
              `}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${textSizeClasses.xs} font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    <FileCode className="w-3 h-3 inline mr-1" />
                    Contribution Preview
                  </span>
                  <button
                    onClick={handleCopyDiff}
                    className={`
                      p-1 rounded
                      ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}
                    `}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                  </button>
                </div>
                <pre className={`
                  ${textSizeClasses.xs} overflow-auto max-h-32
                  ${isDark ? 'text-zinc-300' : 'text-zinc-700'}
                `}>
                  {generateFrontmatterPatch(strandPath, block.blockId, {
                    strandPath,
                    blockId: block.blockId,
                    addedTags,
                    removedTags,
                    acceptedSuggestions,
                    rejectedSuggestions,
                    reasoning
                  })}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer */}
      <div className={`
        flex items-center justify-between px-3 py-2 border-t
        ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}
      `}>
        <button
          onClick={() => setShowPreview(!showPreview)}
          disabled={!hasChanges}
          className={`
            ${textSizeClasses.xs} font-medium
            ${hasChanges 
              ? 'text-purple-600 hover:text-purple-500 dark:text-purple-400' 
              : 'text-zinc-400 cursor-not-allowed'
            }
          `}
        >
          {showPreview ? 'Hide Preview' : 'Preview Changes'}
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={!hasChanges}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium
            ${textSizeClasses.sm}
            ${hasChanges
              ? 'bg-purple-600 text-white hover:bg-purple-500'
              : 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-700'
            }
          `}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open GitHub Issue
        </button>
      </div>
    </div>
  )
}

