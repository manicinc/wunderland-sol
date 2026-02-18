'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * CodexHeroAnimation - Animated book/codex opening effect
 * Hitchhiker's Guide inspired digital codex tablet aesthetic
 * Opens to reveal knowledge pages with strands flowing
 */
export function CodexHeroAnimation() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  // Auto-open the book after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 800)
    return () => clearTimeout(timer)
  }, [])

  // Cycle through pages
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % 3)
    }, 4000)
    return () => clearInterval(interval)
  }, [isOpen])

  const pages = [
    {
      title: 'Strand',
      subtitle: 'Atomic Knowledge Unit',
      content: 'id: "react-hooks-intro"\ntype: "concept"\nrelationships:\n  - requires: "javascript-basics"',
      color: 'sky',
    },
    {
      title: 'Loom',
      subtitle: 'Curated Module',
      content: 'strands: 24\npath: "React Fundamentals"\nprogress: 67%',
      color: 'cyan',
    },
    {
      title: 'Weave',
      subtitle: 'Knowledge Domain',
      content: 'looms: 8\nembeddings: ✓\nsync: github',
      color: 'emerald',
    },
  ]

  return (
    <div className="relative w-full max-w-md mx-auto perspective-1000">
      {/* Outer glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 blur-2xl"
        animate={{
          opacity: isOpen ? [0.3, 0.5, 0.3] : 0.2,
          scale: isOpen ? [1, 1.05, 1] : 0.95,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Book/Codex container */}
      <motion.div
        className="relative bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50"
        initial={{ rotateY: 0 }}
        animate={{ rotateY: isOpen ? 0 : -5 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Book spine accent */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b from-emerald-600 via-teal-600 to-cyan-600" />

        {/* Top bar - tablet header */}
        <div className="relative z-10 flex items-center justify-between px-5 py-3 bg-gray-900/80 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            {/* Fabric icon */}
            <svg width="24" height="24" viewBox="0 0 64 64" className="text-emerald-500">
              <defs>
                <linearGradient id="codex-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" />
                  <stop offset="100%" stopColor="rgb(20, 184, 166)" />
                </linearGradient>
              </defs>
              <rect x="10" y="8" width="44" height="6" rx="3" fill="currentColor" />
              <rect x="16" y="19" width="38" height="6" rx="3" fill="currentColor" opacity="0.7" />
              <rect x="10" y="30" width="44" height="6" rx="3" fill="currentColor" opacity="0.5" />
              <rect x="16" y="41" width="38" height="6" rx="3" fill="currentColor" opacity="0.35" />
              <rect x="10" y="52" width="44" height="6" rx="3" fill="currentColor" opacity="0.2" />
              <rect x="10" y="8" width="6" height="50" rx="3" fill="url(#codex-icon-grad)" />
            </svg>
            <span className="text-sm font-semibold text-white">FABRIC CODEX</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-teal-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500/60" />
          </div>
        </div>

        {/* Book pages container */}
        <div className="relative min-h-[280px] p-5">
          {/* Cover (when closed) */}
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, rotateY: -90 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 m-4 rounded-xl"
                style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
              >
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-5xl mb-3"
                  >
                    <svg width="64" height="64" viewBox="0 0 64 64" className="mx-auto text-emerald-500">
                      <defs>
                        <linearGradient id="cover-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="currentColor" />
                          <stop offset="100%" stopColor="rgb(6, 182, 212)" />
                        </linearGradient>
                      </defs>
                      <rect x="10" y="8" width="44" height="6" rx="3" fill="currentColor" />
                      <rect x="16" y="19" width="38" height="6" rx="3" fill="currentColor" opacity="0.7" />
                      <rect x="10" y="30" width="44" height="6" rx="3" fill="currentColor" opacity="0.5" />
                      <rect x="16" y="41" width="38" height="6" rx="3" fill="currentColor" opacity="0.35" />
                      <rect x="10" y="52" width="44" height="6" rx="3" fill="currentColor" opacity="0.2" />
                      <rect x="10" y="8" width="6" height="50" rx="3" fill="url(#cover-grad)" />
                    </svg>
                  </motion.div>
                  <p className="text-gray-400 text-sm">Opening...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Open book content */}
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="relative"
              >
                {/* Page header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <motion.h3
                      className={`text-xl font-bold ${
                        pages[currentPage].color === 'emerald'
                          ? 'text-emerald-400'
                          : pages[currentPage].color === 'cyan'
                          ? 'text-cyan-400'
                          : 'text-sky-400'
                      }`}
                    >
                      {pages[currentPage].title}
                    </motion.h3>
                    <p className="text-gray-500 text-sm">{pages[currentPage].subtitle}</p>
                  </div>
                  <div className="flex gap-1">
                    {pages.map((_, i) => (
                      <motion.div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i === currentPage ? 'bg-emerald-500' : 'bg-gray-600'
                        }`}
                        animate={{ scale: i === currentPage ? 1.2 : 1 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Code/content block */}
                <div className="bg-black/40 rounded-lg p-4 font-mono text-sm border border-gray-700/50">
                  <pre className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {pages[currentPage].content.split('\n').map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        {line.includes(':') ? (
                          <>
                            <span className="text-cyan-400">{line.split(':')[0]}:</span>
                            <span className="text-emerald-300">{line.split(':').slice(1).join(':')}</span>
                          </>
                        ) : (
                          line
                        )}
                      </motion.div>
                    ))}
                  </pre>
                </div>

                {/* Decorative strand visualization */}
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-cyan-500/50" />
                  <span className="text-xs text-gray-500">
                    {currentPage + 1} of {pages.length}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating strand particles */}
          {isOpen && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500/30 to-transparent"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: '10%',
                  }}
                  animate={{
                    y: [0, 100, 0],
                    opacity: [0, 0.5, 0],
                    rotate: [-5, 5, -5],
                  }}
                  transition={{
                    duration: 4 + i,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom navigation hints */}
        <div className="relative z-10 flex items-center justify-between px-5 py-3 bg-gray-900/80 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span>100% Offline</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>MIT Licensed</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Shadow underneath */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-black/20 blur-xl rounded-full" />
    </div>
  )
}

export default CodexHeroAnimation
