'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, Copy, Check, X, Maximize2, Terminal } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'

interface CodeExample {
  title: string
  language: string
  code: string
  description?: string
}

interface CodePopoverProps {
  examples: CodeExample[]
  trigger: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function CodePopover({ examples, trigger, position = 'bottom' }: CodePopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedExample, setSelectedExample] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(examples[selectedExample].code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2'
      case 'left':
        return 'right-full mr-2 top-0'
      case 'right':
        return 'left-full ml-2 top-0'
      case 'bottom':
      default:
        return 'top-full mt-2'
    }
  }

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Fullscreen Overlay */}
            {isFullscreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setIsFullscreen(false)}
              />
            )}

            {/* Popover */}
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 10 : -10 }}
              transition={{ duration: 0.2 }}
              className={`absolute ${getPositionStyles()} ${
                isFullscreen
                  ? 'fixed inset-4 sm:inset-8 z-50'
                  : 'z-40 w-[500px] max-w-[90vw]'
              }`}
              style={
                isFullscreen
                  ? {
                      position: 'fixed',
                      top: '2rem',
                      left: '2rem',
                      right: '2rem',
                      bottom: '2rem',
                      width: 'auto',
                      maxWidth: 'none'
                    }
                  : {}
              }
            >
              <div className="holographic-card rounded-xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-glass-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-accent-primary" />
                      <h3 className="font-semibold">Code Examples</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 rounded-lg hover:bg-glass-surface transition-colors"
                        aria-label="Toggle fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-glass-surface transition-colors"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Example Tabs */}
                  {examples.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {examples.map((example, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedExample(index)}
                          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                            selectedExample === index
                              ? 'bg-accent-primary text-white'
                              : 'bg-glass-surface hover:bg-glass-border'
                          }`}
                        >
                          {example.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Code Content */}
                <div className={`${isFullscreen ? 'h-[calc(100%-120px)]' : 'max-h-[400px]'} overflow-auto`}>
                  {examples[selectedExample].description && (
                    <div className="p-4 bg-glass-surface border-b border-glass-border">
                      <p className="text-sm text-muted">
                        {examples[selectedExample].description}
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    {/* Copy Button */}
                    <button
                      onClick={copyToClipboard}
                      className="absolute top-4 right-4 p-2 rounded-lg bg-glass-surface hover:bg-glass-border transition-all z-10"
                      aria-label="Copy code"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Syntax Highlighted Code */}
                    <SyntaxHighlighter
                      language={examples[selectedExample].language}
                      style={isDark ? vscDarkPlus : vs}
                      customStyle={{
                        margin: 0,
                        padding: '1.5rem',
                        background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)',
                        fontSize: isFullscreen ? '14px' : '12px',
                        borderRadius: 0
                      }}
                      showLineNumbers={isFullscreen}
                    >
                      {examples[selectedExample].code}
                    </SyntaxHighlighter>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-glass-border bg-glass-surface">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">
                      Language: {examples[selectedExample].language}
                    </span>
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-accent-primary" />
                      <span className="text-xs">
                        Full syntax highlighting
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Inline code popover for feature cards
export function InlineCodePopover({ code, language = 'typescript' }: { code: string; language?: string }) {
  const [isHovered, setIsHovered] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="cursor-help border-b border-dotted border-accent-primary">
        <Code2 className="w-4 h-4 inline text-accent-primary" />
      </span>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
            style={{ minWidth: '300px' }}
          >
            <div className="holographic-card rounded-lg p-3">
              <SyntaxHighlighter
                language={language}
                style={isDark ? vscDarkPlus : vs}
                customStyle={{
                  margin: 0,
                  padding: '0.5rem',
                  background: 'transparent',
                  fontSize: '11px'
                }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}