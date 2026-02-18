'use client'

import { motion } from 'framer-motion'
import { Book, Search, ChevronRight, ExternalLink } from 'lucide-react'
import CodexBookIcon from './codex-book-icon'

export default function FrameCodexBanner() {
  return (
    <>
      <motion.div
        className="relative w-full max-w-5xl mx-auto mt-12 mb-8 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {/* Gradient background with noise texture */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-frame-green/10 via-frame-green-dark/5 to-transparent blur-3xl" />
        
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-paper-50 to-paper-100 dark:from-ink-900 dark:to-ink-950 border border-ink-200/20 dark:border-white/10 shadow-2xl"
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Animated gradient overlay */}
          <motion.div
            className="absolute inset-0 opacity-50"
            initial={{ backgroundPosition: '0% 0%' }}
            animate={{ backgroundPosition: '100% 100%' }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
            style={{
              background: 'radial-gradient(circle at 20% 50%, rgba(34, 139, 34, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)',
              backgroundSize: '200% 200%'
            }}
          />

          {/* Glass morphism layer */}
          <div className="absolute inset-0 backdrop-blur-[2px] bg-white/5 dark:bg-black/5" />

          <div className="relative p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-8">
            {/* Left side - Book icon */}
            <div className="flex-shrink-0">
              <CodexBookIcon className="w-24 h-32 lg:w-32 lg:h-40" isOpen={false} />
            </div>

            {/* Center - Content */}
            <div className="flex-1 text-center lg:text-left">
              <motion.h2 
                className="text-3xl lg:text-4xl font-bold mb-4 heading-display"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="bg-gradient-to-r from-frame-green via-frame-green-dark to-frame-green bg-clip-text text-transparent">
                  Quarry Codex
                </span>
              </motion.h2>
              
              <motion.p
                className="text-lg text-ink-700 dark:text-paper-300 mb-6 leading-relaxed max-w-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                The codex of humanity with <strong>fully embedded AI</strong> — BERT, semantic search, and NLP
                running entirely client-side. No servers required. Host FREE on GitHub Pages.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <motion.a
                  href="/quarry/landing"
                  className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-frame-green to-frame-green-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Search className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Explore Codex</span>
                  <ChevronRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                </motion.a>

                <motion.a
                  href="/quarry/architecture"
                  className="group inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-paper-200 dark:bg-ink-800 hover:bg-paper-300 dark:hover:bg-ink-700 text-ink-900 dark:text-paper-100 font-semibold rounded-xl border border-ink-200/30 dark:border-white/10 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Book className="w-5 h-5" />
                  <span>View Architecture</span>
                  <ChevronRight className="w-4 h-4 transition-all duration-300 group-hover:translate-x-0.5" />
                </motion.a>
              </motion.div>

              {/* OpenStrand connection */}
              <motion.div
                className="mt-8 p-4 bg-gradient-to-r from-paper-100/50 to-paper-200/50 dark:from-ink-800/50 dark:to-ink-700/50 rounded-xl border border-ink-200/10 dark:border-white/5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm text-ink-600 dark:text-paper-400">
                  <strong className="text-ink-900 dark:text-paper-100">Powered by OpenStrand:</strong>{' '}
                  <a 
                    href="https://openstrand.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-frame-green hover:text-frame-green-dark transition-colors"
                  >
                    OpenStrand adds AI and server-side functionality
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {' '}                on top of the Quarry Codex, enabling intelligent knowledge management and processing.
                </p>
              </motion.div>

              {/* Technical integration details */}
              <motion.div
                className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="p-3 bg-gradient-to-br from-paper-100/30 to-paper-200/30 dark:from-ink-800/30 dark:to-ink-700/30 rounded-lg backdrop-blur-sm border border-ink-200/10 dark:border-white/5">
                  <p className="text-xs font-semibold text-ink-900 dark:text-paper-100 mb-1">Embedded Deep Learning</p>
                  <p className="text-xs text-ink-600 dark:text-paper-400">BERT + TextRank summarization in WebWorkers</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-paper-100/30 to-paper-200/30 dark:from-ink-800/30 dark:to-ink-700/30 rounded-lg backdrop-blur-sm border border-ink-200/10 dark:border-white/5">
                  <p className="text-xs font-semibold text-ink-900 dark:text-paper-100 mb-1">BYOK LLM Integration</p>
                  <p className="text-xs text-ink-600 dark:text-paper-400">Claude, GPT, Mistral, or local Ollama</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-paper-100/30 to-paper-200/30 dark:from-ink-800/30 dark:to-ink-700/30 rounded-lg backdrop-blur-sm border border-ink-200/10 dark:border-white/5">
                  <p className="text-xs font-semibold text-ink-900 dark:text-paper-100 mb-1">100% Client-Side</p>
                  <p className="text-xs text-ink-600 dark:text-paper-400">SQLite + PGlite, runs on GitHub Pages</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-paper-100/30 to-paper-200/30 dark:from-ink-800/30 dark:to-ink-700/30 rounded-lg backdrop-blur-sm border border-ink-200/10 dark:border-white/5">
                  <p className="text-xs font-semibold text-ink-900 dark:text-paper-100 mb-1">Password Protection</p>
                  <p className="text-xs text-ink-600 dark:text-paper-400">Lock screen, auto-lock, SHA-256 encryption</p>
                </div>
              </motion.div>
            </div>

            {/* Right side - Animated decoration (slow continuous rotation) */}
            <motion.div
              className="hidden lg:block flex-shrink-0"
              animate={{ rotate: 360 }}
              transition={{
                duration: 40,
                repeat: Infinity,
                ease: 'linear'
              }}
            >
              <div className="w-32 h-32 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-frame-green/20 to-frame-green-dark/20 blur-xl" />
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  style={{ filter: 'drop-shadow(0 4px 20px rgba(34, 139, 34, 0.3))' }}
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#codexGradient)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    fill="none"
                    stroke="url(#codexGradient)"
                    strokeWidth="1"
                    strokeDasharray="6 3"
                    opacity="0.4"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="20"
                    fill="none"
                    stroke="url(#codexGradient)"
                    strokeWidth="1"
                    strokeDasharray="2 6"
                    opacity="0.3"
                  />
                  <defs>
                    <linearGradient id="codexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#22C55E" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Subtle corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-3xl">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-frame-green/10 to-transparent rounded-full blur-2xl" />
          </div>
        </motion.div>
      </motion.div>

    </>
  )
}
