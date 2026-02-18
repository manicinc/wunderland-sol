/**
 * RAG Answer Card - Perplexity-style Answer Display
 * @module codex/ui/RAGAnswerCard
 * 
 * @description
 * Displays AI-synthesized answers with inline citations and source cards.
 * Inspired by Perplexity's clean answer presentation.
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  FileText,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import type { RAGCitation, RAGSearchResult } from '@/lib/ai'

interface RAGAnswerCardProps {
  /** The RAG result to display */
  result: RAGSearchResult
  /** Whether the answer is still loading/streaming */
  isLoading?: boolean
  /** Click handler for citation sources */
  onSourceClick?: (path: string) => void
  /** Theme */
  isDark?: boolean
}

export default function RAGAnswerCard({
  result,
  isLoading = false,
  onSourceClick,
  isDark = false,
}: RAGAnswerCardProps) {
  const [showSources, setShowSources] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const { synthesizedAnswer } = result
  if (!synthesizedAnswer) return null
  
  const { answer, citations } = synthesizedAnswer
  
  // Parse answer to highlight citations
  const renderAnswer = () => {
    // Split by citation markers [n]
    const parts = answer.split(/(\[\d+\])/g)
    
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/)
      if (match) {
        const citationIndex = parseInt(match[1])
        const citation = citations.find(c => c.index === citationIndex)
        
        return (
          <button
            key={i}
            onClick={() => citation && onSourceClick?.(citation.path)}
            className={`
              inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded
              transition-colors mx-0.5 align-super
              ${isDark 
                ? 'bg-cyan-900/50 text-cyan-300 hover:bg-cyan-800/70' 
                : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
              }
            `}
            title={citation ? `${citation.title}` : `Source ${citationIndex}`}
          >
            {citationIndex}
          </button>
        )
      }
      return <span key={i}>{part}</span>
    })
  }
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl border overflow-hidden
        ${isDark 
          ? 'bg-gradient-to-br from-cyan-950/30 to-slate-900/50 border-cyan-800/50' 
          : 'bg-gradient-to-br from-cyan-50/80 to-white border-cyan-200'
        }
      `}
    >
      {/* Header */}
      <div className={`
        flex items-center justify-between px-4 py-3 border-b
        ${isDark ? 'border-cyan-800/30' : 'border-cyan-100'}
      `}>
        <div className="flex items-center gap-2">
          <div className={`
            p-1.5 rounded-lg
            ${isDark ? 'bg-cyan-500/20' : 'bg-cyan-100'}
          `}>
            <Sparkles className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          </div>
          <span className={`text-sm font-medium ${isDark ? 'text-cyan-200' : 'text-cyan-800'}`}>
            AI Answer
          </span>
          {isLoading && (
            <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
          )}
        </div>
        
        <button
          onClick={handleCopy}
          className={`
            p-1.5 rounded-lg transition-colors
            ${isDark 
              ? 'hover:bg-cyan-800/30 text-cyan-400' 
              : 'hover:bg-cyan-100 text-cyan-600'
            }
          `}
          title="Copy answer"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      
      {/* Answer Content */}
      <div className="px-4 py-4">
        <div className={`
          text-sm leading-relaxed whitespace-pre-wrap
          ${isDark ? 'text-gray-200' : 'text-gray-800'}
        `}>
          {renderAnswer()}
        </div>
      </div>
      
      {/* Sources Section */}
      {citations.length > 0 && (
        <div className={`border-t ${isDark ? 'border-cyan-800/30' : 'border-cyan-100'}`}>
          <button
            onClick={() => setShowSources(!showSources)}
            className={`
              w-full flex items-center justify-between px-4 py-2.5
              transition-colors
              ${isDark 
                ? 'hover:bg-cyan-900/20 text-gray-400' 
                : 'hover:bg-cyan-50 text-gray-600'
              }
            `}
          >
            <span className="text-xs font-medium uppercase tracking-wider">
              Sources ({citations.length})
            </span>
            {showSources ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          <AnimatePresence>
            {showSources && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {citations.map((citation) => (
                    <SourceCard
                      key={citation.index}
                      citation={citation}
                      onClick={() => onSourceClick?.(citation.path)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE CARD
═══════════════════════════════════════════════════════════════════════════ */

interface SourceCardProps {
  citation: RAGCitation
  onClick?: () => void
  isDark?: boolean
}

function SourceCard({ citation, onClick, isDark = false }: SourceCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-start gap-3 p-3 rounded-lg text-left
        transition-colors group
        ${isDark 
          ? 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50' 
          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
        }
      `}
    >
      {/* Index Badge */}
      <div className={`
        flex-shrink-0 w-6 h-6 rounded flex items-center justify-center
        text-xs font-bold
        ${isDark 
          ? 'bg-cyan-900/50 text-cyan-300' 
          : 'bg-cyan-100 text-cyan-700'
        }
      `}>
        {citation.index}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`
            text-sm font-medium truncate
            ${isDark ? 'text-gray-200' : 'text-gray-900'}
          `}>
            {citation.title}
          </span>
          <ExternalLink className={`
            w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
            ${isDark ? 'text-cyan-400' : 'text-cyan-600'}
          `} />
        </div>
        
        <p className={`
          text-xs mt-1 line-clamp-2
          ${isDark ? 'text-gray-400' : 'text-gray-600'}
        `}>
          {citation.snippet}
        </p>
        
        {/* Relevance Bar */}
        <div className="flex items-center gap-2 mt-2">
          <div className={`
            flex-1 h-1 rounded-full overflow-hidden
            ${isDark ? 'bg-slate-700' : 'bg-gray-200'}
          `}>
            <div 
              className="h-full bg-cyan-500 rounded-full"
              style={{ width: `${citation.relevance}%` }}
            />
          </div>
          <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {citation.relevance}%
          </span>
        </div>
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RAG MODE TOGGLE
═══════════════════════════════════════════════════════════════════════════ */

interface RAGModeToggleProps {
  mode: 'local' | 'rerank' | 'synthesize'
  onChange: (mode: 'local' | 'rerank' | 'synthesize') => void
  disabled?: boolean
  isLoading?: boolean
  isDark?: boolean
}

export function RAGModeToggle({
  mode,
  onChange,
  disabled = false,
  isLoading = false,
  isDark = false,
}: RAGModeToggleProps) {
  const modes = [
    { id: 'local' as const, label: 'Local', description: 'Semantic search only' },
    { id: 'rerank' as const, label: 'AI Rank', description: 'Re-rank by relevance' },
    { id: 'synthesize' as const, label: 'AI Answer', description: 'Generate answer' },
  ]
  
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
      {modes.map((m) => {
        const isActive = mode === m.id
        const isAI = m.id !== 'local'
        
        return (
          <button
            key={m.id}
            onClick={() => !disabled && onChange(m.id)}
            disabled={disabled && isAI}
            title={disabled && isAI ? 'Configure API keys to enable' : m.description}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
              transition-all
              ${isActive 
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : disabled && isAI
                  ? 'text-gray-400 cursor-not-allowed'
                  : isDark
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {isAI && (
              <Sparkles className={`w-3 h-3 ${isActive ? '' : 'opacity-50'}`} />
            )}
            {m.label}
            {isLoading && isActive && isAI && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
          </button>
        )
      })}
    </div>
  )
}

