/**
 * Semantic Search Info Popover
 * @module codex/ui/SemanticSearchInfoPopover
 * 
 * @remarks
 * Explains the current semantic search backend and performance to users.
 * Shows different content based on backend type (ORT/Transformers.js/Offline).
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, Zap, Sparkles, AlertCircle, Cpu, Gauge, HelpCircle, ExternalLink } from 'lucide-react'
import type { BackendStatus } from '@/lib/search/embeddingEngine'

interface SemanticSearchInfoPopoverProps {
  status: BackendStatus | null
  className?: string
  theme?: string
}

/**
 * Info popover explaining semantic search backends
 * 
 * Responsive:
 * - Desktop: Hover to show popover (tooltip-style)
 * - Mobile: Tap to toggle popover (bottom sheet on phones)
 */
export default function SemanticSearchInfoPopover({
  status,
  className = '',
  theme = 'light',
}: SemanticSearchInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Cancel any pending close when opening
  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setIsOpen(true)
  }

  // Delay close to allow moving to popover
  const handleClose = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const updatePosition = () => {
    if (!triggerRef.current || !popoverRef.current || window.innerWidth < 768) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    let x = triggerRect.right - popoverRect.width
    let y = triggerRect.bottom + 8

    // Adjust if off-screen
    x = Math.max(8, Math.min(x, viewport.width - popoverRect.width - 8))
    y = Math.max(8, Math.min(y, viewport.height - popoverRect.height - 8))

    setPosition({ x, y })
  }

  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
    }
    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  if (!status) return null

  const content = getContentForStatus(status)

  const popoverNode = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-[2000]"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover Content */}
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={handleOpen}
            onMouseLeave={handleClose}
            className={`
              z-[2001]
              max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0
              max-md:rounded-t-2xl max-md:shadow-2xl
              md:fixed md:w-80 md:rounded-lg md:shadow-xl
              ${isTerminal ? 'terminal-frame' : ''}
              ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
              border overflow-hidden
            `}
            style={
              typeof window !== 'undefined' && window.innerWidth >= 768
                ? { left: position.x, top: position.y }
                : undefined
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="md:hidden pt-2 pb-1 flex justify-center">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className={`
              px-4 py-3 border-b flex items-center gap-2
              ${isDark ? 'border-gray-700' : 'border-gray-200'}
            `}>
              {content.icon}
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{content.title}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {content.subtitle}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 max-md:max-h-[60vh] max-md:overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {content.description}
              </p>
              
              {/* Architecture Highlight */}
              {'architecture' in content && content.architecture && (
                <div className={`
                  p-3 rounded-lg border-2
                  ${isDark 
                    ? 'bg-gradient-to-br from-emerald-950/50 to-cyan-950/30 border-emerald-800/50' 
                    : 'bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200'
                  }
                `}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🏠</span>
                    <span className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      100% Client-Side Architecture
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span><strong>GitHub Pages</strong> — Static HTML/JS, no server</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span><strong>Local AI</strong> — Models run in WebAssembly</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span><strong>Pre-built Index</strong> — Embeddings computed at deploy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span><strong>Offline Ready</strong> — Works without internet (after load)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span><strong>Privacy-First</strong> — Queries never leave your device</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance indicator */}
              {content.performance && (
                <div className={`
                  p-3 rounded border
                  ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}
                `}>
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs font-semibold">Performance</span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {content.performance.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.label}:</span>
                        <span className="font-mono font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities */}
              {content.capabilities && (
                <div className={`
                  p-3 rounded border
                  ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}
                `}>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-semibold">Capabilities</span>
                  </div>
                  <div className="space-y-1">
                    {content.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${cap.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <span className={cap.enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500'}
                        >
                          {cap.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {content.tips && content.tips.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <HelpCircle className="w-3 h-3" />
                    <span>Tips</span>
                  </div>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {content.tips.map((tip, i) => (
                      <li key={i} className="flex gap-2">
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Learn More Link */}
              <a
                href="https://github.com/framersai/frame.dev/blob/master/apps/frame.dev/docs/SEMANTIC_SEARCH_ARCHITECTURE.md"
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  inline-flex items-center gap-1.5 text-xs font-medium
                  text-cyan-600 dark:text-cyan-400 hover:underline
                `}
              >
                <span>Learn more about the architecture</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Footer (mobile only) */}
            <div className={`
              md:hidden px-4 py-3 border-t
              ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}
            `}>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 px-4 rounded bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        className={`
          p-1.5 rounded-full transition-all
          min-w-[44px] min-h-[44px] flex items-center justify-center
          md:min-w-0 md:min-h-0 md:p-1
          ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}
          ${isOpen ? (isDark ? 'bg-gray-700' : 'bg-gray-200') : ''}
        `}
        aria-label="Semantic search info"
        aria-expanded={isOpen}
      >
        <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>

      {isMounted && createPortal(popoverNode, document.body)}
    </div>
  )
}

/**
 * Get content configuration based on backend status
 */
function getContentForStatus(status: BackendStatus): {
  title: string
  subtitle: string
  description: string
  icon: JSX.Element
  performance?: Array<{ label: string; value: string }>
  capabilities?: Array<{ label: string; enabled: boolean }>
  tips: string[]
  architecture?: string
} {
  // Common architecture explanation for all modes
  const architectureExplanation = `
🏠 **100% Client-Side** — No data leaves your browser. Everything runs locally:
• **GitHub Pages Hosted** — Static HTML/JS deployed on GitHub Pages
• **Pre-computed Embeddings** — Document vectors built at deploy time
• **Local Model Execution** — AI models run in WebAssembly/WebGPU
• **Zero Backend** — No server required, works offline after first load
• **Privacy-First** — Your queries never leave your device
  `.trim()

  if (status.type === 'ort') {
    const isGPU = status.provider === 'webgpu'
    const hasSIMD = status.provider.includes('simd')
    const hasThreads = status.provider.includes('threaded')

    return {
      title: 'ONNX Runtime Web',
      subtitle: status.deviceInfo,
      description: isGPU
        ? 'Using your GPU for lightning-fast semantic search. Your question is converted to a 384-dimensional vector and compared against pre-computed document embeddings—all in your browser.'
        : hasSIMD
        ? 'Using SIMD instructions for optimized CPU performance. All AI inference happens locally in WebAssembly—no server calls, no cloud processing.'
        : 'Using baseline WebAssembly for AI inference. Everything runs client-side on your device.',
      icon: <Zap className="w-5 h-5 text-emerald-500" />,
      performance: [
        { label: 'Embedding time', value: isGPU ? '50-80ms' : hasSIMD ? '120-180ms' : '180-250ms' },
        { label: 'Backend', value: status.provider.toUpperCase() },
        { label: 'Model', value: 'MiniLM-L6-v2 (23MB)' },
        { label: 'Dimensions', value: '384' },
      ],
      capabilities: [
        { label: 'WebGPU (GPU acceleration)', enabled: isGPU },
        { label: 'SIMD (vector instructions)', enabled: hasSIMD },
        { label: 'Multi-threading', enabled: hasThreads },
        { label: 'Offline capable (after load)', enabled: true },
      ],
      tips: isGPU
        ? [
            '🚀 Fastest config! GPU runs 2-4× faster than CPU.',
            '🔒 Privacy: All processing happens on your device.',
            '📴 Works offline after initial model download.',
          ]
        : [
            '🔒 Privacy: All processing happens on your device.',
            '📴 Works offline after initial model download.',
            hasSIMD ? '✓ SIMD acceleration active (30-60% faster).' : '⚠ SIMD unavailable—consider Chrome/Firefox.',
          ],
      architecture: architectureExplanation,
    }
  } else if (status.type === 'transformers') {
    return {
      title: 'Transformers.js',
      subtitle: 'CPU (Wasm) — Client-Side AI',
      description: 'Using Hugging Face Transformers.js for embeddings. The entire AI model runs in your browser using WebAssembly—no server required, no data leaves your device.',
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      performance: [
        { label: 'Embedding time', value: '180-250ms' },
        { label: 'Backend', value: 'WASM (CPU)' },
        { label: 'Model', value: 'MiniLM-L6-v2 (6MB)' },
        { label: 'Hosted on', value: 'GitHub Pages' },
      ],
      capabilities: [
        { label: 'Client-side processing', enabled: true },
        { label: 'No server required', enabled: true },
        { label: 'Privacy-preserving', enabled: true },
        { label: 'Offline capable', enabled: true },
      ],
      tips: [
        '🔒 Your questions never leave your browser.',
        '📴 Works offline after initial load.',
        '🌐 Deployed as static files on GitHub Pages.',
        '⚡ Embeddings pre-computed at build time.',
      ],
      architecture: architectureExplanation,
    }
  } else {
    return {
      title: 'Lexical Search (Fallback)',
      subtitle: 'Keyword-based • Still Offline!',
      description: 'Semantic embeddings unavailable, but keyword search still works. BM25 ranking runs entirely client-side using pre-built search indexes—still no server required!',
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      performance: [
        { label: 'Search type', value: 'BM25 (keywords)' },
        { label: 'Index size', value: '~100KB' },
        { label: 'Latency', value: '<10ms' },
      ],
      capabilities: [
        { label: 'Client-side processing', enabled: true },
        { label: 'No server required', enabled: true },
        { label: 'Semantic understanding', enabled: false },
        { label: 'Offline capable', enabled: true },
      ],
      tips: [
        '🔍 Use specific keywords for best results.',
        '🔒 Still 100% private—no data sent anywhere.',
        '📴 Works fully offline.',
        '💡 Semantic search needs WASM support (most modern browsers).',
      ],
      architecture: architectureExplanation,
    }
  }
}