/**
 * AI Hover Summary Component
 * @module codex/ui/reader/AIHoverSummary
 *
 * Tooltip showing AI-generated summary when hovering over a block summary.
 * Lazy-loads AI summary generation and caches results.
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  X,
  Lightbulb,
  Tag,
  Wand2,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface AIAnalysis {
  summary: string
  keyPoints: string[]
  entities: string[]
  confidence: number
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed'
  topics?: string[]
}

export interface AIHoverSummaryProps {
  /** Block ID for caching */
  blockId: string
  /** Original block content for analysis */
  blockContent: string
  /** Pre-computed AI summary if available */
  precomputedSummary?: string
  /** Position relative to trigger element */
  position: { x: number; y: number }
  /** Theme */
  theme?: string
  /** Whether the tooltip is visible */
  visible: boolean
  /** Callback when closing */
  onClose: () => void
  /** Optional: async function to generate AI summary */
  generateSummary?: (content: string) => Promise<AIAnalysis>
  /** Max width of tooltip */
  maxWidth?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   CACHE
═══════════════════════════════════════════════════════════════════════════ */

const summaryCache = new Map<string, AIAnalysis>()

/* ═══════════════════════════════════════════════════════════════════════════
   FALLBACK ANALYSIS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Simple extractive analysis when AI is not available
 */
function generateFallbackAnalysis(content: string): AIAnalysis {
  // Extract first sentences as summary
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const summary = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 2 ? '...' : '')
  
  // Extract potential key points (sentences with strong indicators)
  const keyPointIndicators = /\b(important|key|note|remember|must|should|always|never|first|second|third)\b/i
  const keyPoints = sentences
    .filter(s => keyPointIndicators.test(s))
    .slice(0, 3)
    .map(s => s.trim())
  
  // Extract potential entities (capitalized words that aren't sentence starts)
  const entityPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
  const entityMatches = content.match(entityPattern) || []
  const entities = [...new Set(entityMatches)].slice(0, 5)
  
  return {
    summary: summary || content.slice(0, 150) + '...',
    keyPoints: keyPoints.length > 0 ? keyPoints : ['Main concept from this section'],
    entities,
    confidence: 0.6, // Lower confidence for fallback
    sentiment: 'neutral',
    topics: [],
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AIHoverSummary({
  blockId,
  blockContent,
  precomputedSummary,
  position,
  theme = 'light',
  visible,
  onClose,
  generateSummary,
  maxWidth = 320,
}: AIHoverSummaryProps) {
  const isDark = theme?.includes('dark')
  const tooltipRef = useRef<HTMLDivElement>(null)
  
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Load or generate analysis
  useEffect(() => {
    if (!visible || !blockContent) return
    
    // Check cache first
    const cached = summaryCache.get(blockId)
    if (cached) {
      setAnalysis(cached)
      return
    }
    
    // If we have a precomputed summary, use it
    if (precomputedSummary) {
      const simpleAnalysis: AIAnalysis = {
        summary: precomputedSummary,
        keyPoints: [],
        entities: [],
        confidence: 0.9,
      }
      setAnalysis(simpleAnalysis)
      summaryCache.set(blockId, simpleAnalysis)
      return
    }
    
    // Generate analysis
    const fetchAnalysis = async () => {
      setLoading(true)
      setError(null)
      
      try {
        let result: AIAnalysis
        
        if (generateSummary) {
          result = await generateSummary(blockContent)
        } else {
          // Use fallback analysis
          await new Promise(resolve => setTimeout(resolve, 300)) // Simulate loading
          result = generateFallbackAnalysis(blockContent)
        }
        
        setAnalysis(result)
        summaryCache.set(blockId, result)
      } catch (err) {
        console.error('Failed to generate AI summary:', err)
        setError('Failed to generate summary')
        // Still show fallback
        const fallback = generateFallbackAnalysis(blockContent)
        setAnalysis(fallback)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnalysis()
  }, [visible, blockId, blockContent, precomputedSummary, generateSummary])

  // Copy summary to clipboard
  const handleCopy = useCallback(async () => {
    if (!analysis?.summary) return
    
    try {
      await navigator.clipboard.writeText(analysis.summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [analysis?.summary])

  // Regenerate summary
  const handleRegenerate = useCallback(async () => {
    if (!generateSummary || !blockContent) return
    
    setLoading(true)
    setError(null)
    summaryCache.delete(blockId)
    
    try {
      const result = await generateSummary(blockContent)
      setAnalysis(result)
      summaryCache.set(blockId, result)
    } catch (err) {
      setError('Failed to regenerate')
    } finally {
      setLoading(false)
    }
  }, [blockId, blockContent, generateSummary])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (visible) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      ref={tooltipRef}
      className={`
        fixed z-50 rounded-xl shadow-2xl border overflow-hidden
        animate-in fade-in zoom-in-95 duration-200
        ${isDark
          ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
          : 'bg-white border-zinc-200 text-zinc-900'
        }
      `}
      style={{
        left: position.x,
        top: position.y,
        maxWidth,
        transform: 'translateY(-100%)',
      }}
      role="tooltip"
      aria-label="AI Summary"
    >
      {/* Header */}
      <div className={`
        flex items-center gap-2 px-3 py-2 border-b
        ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50'}
      `}>
        <div className="flex items-center gap-1.5">
          <Wand2 className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          <span className="text-xs font-medium">AI Summary</span>
        </div>
        
        {analysis && (
          <div className={`
            ml-auto text-[10px] px-1.5 py-0.5 rounded-full
            ${analysis.confidence >= 0.8
              ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              : analysis.confidence >= 0.6
                ? isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-50 text-amber-700'
                : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-500'
            }
          `}>
            {Math.round(analysis.confidence * 100)}% confidence
          </div>
        )}
        
        <button
          onClick={onClose}
          className={`
            p-1 rounded transition-colors
            ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
          `}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            <span className="text-xs">Analyzing content...</span>
          </div>
        ) : error && !analysis ? (
          <div className="flex items-center gap-2 py-4 justify-center text-red-500">
            <span className="text-xs">{error}</span>
          </div>
        ) : analysis ? (
          <>
            {/* Summary */}
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {analysis.summary}
            </p>
            
            {/* Key points */}
            {analysis.keyPoints.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                  <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Key Points
                  </span>
                </div>
                <ul className="space-y-1">
                  {analysis.keyPoints.map((point, i) => (
                    <li key={i} className={`text-xs flex items-start gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <span className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${isDark ? 'bg-amber-400' : 'bg-amber-500'}`} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Entities */}
            {analysis.entities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analysis.entities.map((entity, i) => (
                  <span
                    key={i}
                    className={`
                      text-[10px] px-1.5 py-0.5 rounded-full
                      ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}
                    `}
                  >
                    {entity}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
      
      {/* Footer actions */}
      {analysis && (
        <div className={`
          flex items-center gap-1 px-3 py-2 border-t
          ${isDark ? 'border-zinc-700 bg-zinc-800/30' : 'border-zinc-100 bg-zinc-50/50'}
        `}>
          <button
            onClick={handleCopy}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors
              ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
            `}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          
          {generateSummary && (
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors
                ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  )
}

