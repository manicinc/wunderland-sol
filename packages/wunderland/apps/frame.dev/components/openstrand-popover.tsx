'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Github, Package, ExternalLink, Layers, GitBranch, Box, Download, X } from 'lucide-react'

const pages = [
  {
    id: 'overview',
    title: 'Built on OpenStrand',
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <span className="text-xl sm:text-2xl font-semibold tracking-tight">
            <span
              style={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              O
            </span>
            pen
            <span
              className="ml-0.5"
              style={{
                background: 'linear-gradient(135deg, #10B981, #22C55E, #A7F3D0)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              S
            </span>
            trand
          </span>
        </div>
        <p className="text-base body-text">
          OpenStrand is the universal knowledge schema protocol that makes your content AI-native. It combines the power of AI with local-first data ownership, adding an invisible intelligence layer to standard Markdown through YAML frontmatter, typed semantic relationships, and LLM instructions. 
          Build your second brain with knowledge graph visualization, multi-format import (20+ formats), and block-level organization—while keeping complete control of your information.
        </p>
        
        <div className="grid grid-cols-3 gap-4">
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            className="relative overflow-hidden text-center p-5 bg-gradient-to-br from-paper-50 to-paper-100 dark:from-ink-800 dark:to-ink-850 rounded-xl border border-ink-200/20 dark:border-white/5 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-frame-green/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Layers className="w-10 h-10 mx-auto mb-3 text-frame-green drop-shadow-md transition-transform duration-300 group-hover:scale-110" />
            <p className="text-sm font-bold text-ink-900 dark:text-paper-50">TypeScript everywhere</p>
            <p className="text-xs text-ink-600 dark:text-paper-400 mt-2 leading-relaxed">Fastify API, Next.js UI, and SDKs in one workspace</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            className="relative overflow-hidden text-center p-5 bg-gradient-to-br from-paper-50 to-paper-100 dark:from-ink-800 dark:to-ink-850 rounded-xl border border-ink-200/20 dark:border-white/5 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-frame-green/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <GitBranch className="w-10 h-10 mx-auto mb-3 text-frame-green drop-shadow-md transition-transform duration-300 group-hover:scale-110" />
            <p className="text-sm font-bold text-ink-900 dark:text-paper-50">Local-first knowledge graph</p>
            <p className="text-xs text-ink-600 dark:text-paper-400 mt-2 leading-relaxed">Prisma schema targets PostgreSQL or embedded PGlite</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            className="relative overflow-hidden text-center p-5 bg-gradient-to-br from-paper-50 to-paper-100 dark:from-ink-800 dark:to-ink-850 rounded-xl border border-ink-200/20 dark:border-white/5 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-frame-green/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Box className="w-10 h-10 mx-auto mb-3 text-frame-green drop-shadow-md transition-transform duration-300 group-hover:scale-110" />
            <p className="text-sm font-bold text-ink-900 dark:text-paper-50">Automation ready</p>
            <p className="text-xs text-ink-600 dark:text-paper-400 mt-2 leading-relaxed">Scripts & SDK bootstrap local, self-hosted, or cloud builds</p>
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-4">
          <motion.a 
            href="https://openstrand.ai"
            target="_blank" 
            rel="noopener noreferrer"
            className="relative inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-frame-green to-frame-green-dark rounded-xl shadow-[0_10px_30px_-10px_rgba(34,139,34,0.5)] hover:shadow-[0_15px_40px_-10px_rgba(34,139,34,0.6)] transition-all duration-300 group overflow-hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Download className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5" />
            <span className="relative z-10">Get Community Edition</span>
          </motion.a>
          <motion.a 
            href="https://openstrand.ai/signup" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-ink-900 dark:text-paper-100 bg-gradient-to-r from-paper-200 to-paper-300 dark:from-ink-800 dark:to-ink-700 rounded-xl border border-ink-200/30 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign Up Now
            <motion.span
              className="inline-block"
              initial={{ x: 0 }}
              whileHover={{ x: 3 }}
            >
              →
            </motion.span>
          </motion.a>
        </div>
      </div>
    )
  },
  {
    id: 'architecture',
    title: 'Architecture',
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm body-text">
            The OpenStrand slip-box is modelled as recursive strands linked by typed edges. Each strand carries content, 
            provenance, authorship, and visibility metadata; every relationship is captured through `StrandLinkType` 
            (<code className="font-mono text-xs">STRUCTURAL</code>, <code className="font-mono text-xs">CONCEPTUAL</code>, 
            <code className="font-mono text-xs">PLACEHOLDER</code>, etc.). Hierarchies guarantee a single structural parent per scope, 
            while still allowing cross-scope reuse, citations, and derivations.
          </p>
          <p className="text-sm body-text">
            Integrity is enforced by <code className="font-mono text-xs">StrandHierarchy</code> and <code className="font-mono text-xs">StrandVisibilityCache</code>. 
            Structure mutations travel through approval queues, background cascades, and optional Slack/email webhooks—keeping PKMS workflows auditable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ scale: 1.03, y: -2 }}
            className="p-5 bg-gradient-to-br from-paper-50/80 to-paper-100/80 dark:from-ink-800/70 dark:to-ink-850/70 rounded-xl backdrop-blur-sm border border-ink-200/10 dark:border-white/5 shadow-sm hover:shadow-md transition-all"
          >
            <p className="font-bold text-sm mb-2 text-ink-900 dark:text-paper-50">Collaborative strands</p>
            <p className="text-xs text-ink-600 dark:text-paper-400 leading-relaxed">
              Authorship, co-authoring, provenance, link justification, and approval states are first-class fields.
            </p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.03, y: -2 }}
            className="p-5 bg-gradient-to-br from-paper-50/80 to-paper-100/80 dark:from-ink-800/70 dark:to-ink-850/70 rounded-xl backdrop-blur-sm border border-ink-200/10 dark:border-white/5 shadow-sm hover:shadow-md transition-all"
          >
            <p className="font-bold text-sm mb-2 text-ink-900 dark:text-paper-50">Local ↔ Cloud symmetry</p>
            <p className="text-xs text-ink-600 dark:text-paper-400 leading-relaxed">
              PGlite fallback for offline builds, PostgreSQL for team deployments, same Prisma schema powering both.
            </p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.03, y: -2 }}
            className="p-5 bg-gradient-to-br from-paper-50/80 to-paper-100/80 dark:from-ink-800/70 dark:to-ink-850/70 rounded-xl backdrop-blur-sm border border-ink-200/10 dark:border-white/5 shadow-sm hover:shadow-md transition-all"
          >
            <p className="font-bold text-sm mb-2 text-ink-900 dark:text-paper-50">Automation-first scripts</p>
            <p className="text-xs text-ink-600 dark:text-paper-400 leading-relaxed">
              `start-local.sh` bootstraps the workspace, sets env flags, and runs API + App with workspace-aware installs.
            </p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.03, y: -2 }}
            className="p-5 bg-gradient-to-br from-paper-50/80 to-paper-100/80 dark:from-ink-800/70 dark:to-ink-850/70 rounded-xl backdrop-blur-sm border border-ink-200/10 dark:border-white/5 shadow-sm hover:shadow-md transition-all"
          >
            <p className="font-bold text-sm mb-2 text-ink-900 dark:text-paper-50">Open documentation</p>
            <p className="text-xs text-ink-600 dark:text-paper-400 leading-relaxed">
              Architecture, intelligent data pipeline, i18n system, packaging and deployment guides live in `docs/`.
            </p>
          </motion.div>
        </div>
      </div>
    )
  },
  {
    id: 'resources',
    title: 'Resources',
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <motion.a 
            href="https://github.com/framersai/openstrand" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="relative flex items-center gap-4 p-5 bg-gradient-to-br from-paper-50 to-paper-100 dark:from-ink-800 dark:to-ink-850 rounded-xl border border-ink-200/20 dark:border-white/5 hover:border-frame-green/30 dark:hover:border-frame-green/20 transition-all group overflow-hidden shadow-sm hover:shadow-lg"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-frame-green/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Github className="w-6 h-6 text-ink-600 dark:text-paper-300 group-hover:text-frame-green transition-colors duration-300" />
            <div className="flex-1">
              <p className="font-bold">
                <span
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >O</span>pen<span
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #22C55E, #A7F3D0)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >S</span>trand Core
              </p>
              <p className="text-sm text-ink-500 dark:text-paper-500 mt-0.5">github.com/framersai/openstrand</p>
            </div>
            <ExternalLink className="w-4 h-4 text-ink-400 group-hover:text-frame-green transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.a>
          
          <a href="https://npmjs.com/org/framers" target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-3 p-4 bg-paper-100 dark:bg-ink-800 rounded-lg hover:bg-paper-200 dark:hover:bg-ink-700 transition-all group">
            <Package className="w-6 h-6 text-red-600 group-hover:text-frame-green" />
            <div className="flex-1">
              <p className="font-semibold">NPM Packages</p>
              <p className="text-sm text-ink-500 dark:text-paper-500">@framers/openstrand</p>
            </div>
            <ExternalLink className="w-4 h-4 text-ink-400" />
          </a>

          <a href="https://openstrand.ai/docs" target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-3 p-4 bg-paper-100 dark:bg-ink-800 rounded-lg hover:bg-paper-200 dark:hover:bg-ink-700 transition-all group">
            <Layers className="w-6 h-6 text-frame-green group-hover:text-frame-green-dark" />
            <div className="flex-1">
              <p className="font-semibold">Documentation Hub</p>
              <p className="text-sm text-ink-500 dark:text-paper-500">Architecture, pipelines, packaging, deployment</p>
            </div>
            <ExternalLink className="w-4 h-4 text-ink-400" />
          </a>
          <div className="flex items-center gap-3 p-4 bg-paper-100 dark:bg-ink-800 rounded-lg">
            <a href="https://openstrand.ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <img src="/openstrand-logo.svg" alt="OpenStrand" className="h-6 w-auto dark:hidden" />
              <img src="/openstrand-logo-mono.svg" alt="OpenStrand" className="hidden h-6 w-auto dark:block" />
            </a>
            <div className="text-sm text-ink-600 dark:text-paper-400">AI-native knowledge infrastructure</div>
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-frame-green/10 to-frame-green-dark/10 rounded-lg">
          <p className="text-sm font-semibold mb-2">Join the Community</p>
          <p className="text-xs text-ink-600 dark:text-paper-400 mb-3">
            Get involved in shaping the future of distributed operating systems
          </p>
          <a 
            href="https://openstrand.ai/community" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-frame-green font-semibold hover:underline"
          >
            Join Discord Community
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        
        <div className="pt-4 border-t border-ink-200/20 dark:border-paper-200/10">
          <p className="text-xs text-center text-ink-500 dark:text-paper-500">
            MIT Licensed • Open Source • Community Driven
          </p>
        </div>
      </div>
    )
  }
]

export default function OpenStrandPopover() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  // ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <>
      <button
        className="text-xl md:text-2xl body-text font-light relative z-[100] group inline-flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setIsOpen(true)}
      >
        <span className="text-gray-500">∞</span>
        <span className="relative text-gray-800 dark:text-gray-100">
          The{' '}
          <span className="font-semibold tracking-wide">OS</span>{' '}
          for humans, the{' '}
          <Link
            href="/quarry"
            className="relative font-semibold"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="relative z-10 bg-gradient-to-r from-gray-700 via-gray-900 to-gray-600 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent group-hover:bg-[length:200%_100%] group-hover:bg-left">
              Codex
            </span>
            <span className="pointer-events-none absolute -bottom-1 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-600/70 to-transparent" />
          </Link>{' '}
          of humanity.
        </span>
        <span className="text-gray-500">∞</span>
      </button>

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {isOpen && (
                <>
                  {/* Backdrop - glass effect (always above window frame) */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[10000] backdrop-blur-md"
                    onClick={() => setIsOpen(false)}
                  />

                  {/* Modal - enhanced styling */}
                  <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.88, y: 40, rotateX: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                      exit={{
                        opacity: 0,
                        scale: 0.94,
                        y: 20,
                        filter: 'blur(8px)',
                        transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] }
                      }}
                      transition={{
                        type: 'spring',
                        duration: 0.5,
                        bounce: 0.15,
                        opacity: { duration: 0.3 }
                      }}
                      style={{
                        perspective: '1200px',
                        transformStyle: 'preserve-3d'
                      }}
                      className="pointer-events-auto relative w-full max-w-4xl h-[85vh] sm:h-[80vh] overflow-hidden rounded-[32px] bg-gradient-to-b from-paper-50 to-paper-100 dark:from-ink-900 dark:to-ink-950 flex flex-col shadow-[0_50px_120px_-30px_rgba(0,0,0,0.5),0_30px_60px_-30px_rgba(34,139,34,0.3)] dark:shadow-[0_50px_120px_-30px_rgba(0,0,0,0.8),0_30px_60px_-30px_rgba(34,139,34,0.2)] border border-ink-200/20 dark:border-white/10"
                    >
              {/* Header with gradient backdrop and logo */}
              <div className="relative p-4 sm:p-8 pb-4 sm:pb-6 border-b border-ink-200/20 dark:border-paper-200/10 bg-gradient-to-br from-paper-50/80 via-paper-100/60 to-paper-50/50 dark:from-ink-800/80 dark:via-ink-850/60 dark:to-ink-900/50 backdrop-blur-xl">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-frame-green/5 via-transparent to-frame-green-dark/5 pointer-events-none" />
                
                <div className="relative flex items-center justify-center">
                  <motion.a 
                    href="https://openstrand.ai" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <img src="/openstrand-logo.svg" alt="OpenStrand" className="h-12 w-auto dark:hidden drop-shadow-xl transition-transform duration-300 group-hover:drop-shadow-2xl" />
                    <img src="/openstrand-logo-gradient.svg" alt="OpenStrand" className="hidden h-12 w-auto dark:block drop-shadow-xl transition-transform duration-300 group-hover:drop-shadow-2xl" />
                  </motion.a>
                </div>
                <p className="text-center mt-3 text-sm text-ink-600 dark:text-paper-400">
                  AI-native knowledge infrastructure
                </p>
              </div>

              {/* Content Pages with enhanced styling */}
              <div className="relative p-6 sm:p-10 flex-1 min-h-0 overflow-y-auto">
                {/* Subtle pattern background */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="currentColor" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#dots)" />
                  </svg>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    className="relative z-10"
                  >
                    <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 heading-display text-ink-900 dark:text-paper-50">
                      {pages[currentPage].title}
                    </h3>
                    {pages[currentPage].content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Enhanced Navigation */}
              <div className="relative px-6 sm:px-10 pb-6 sm:pb-8 pt-4 border-t border-ink-200/10 dark:border-paper-200/5 bg-gradient-to-t from-paper-100/50 to-transparent dark:from-ink-900/50 dark:to-transparent">
                <div className="flex items-center justify-between">
                  <motion.button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    whileHover={{ scale: currentPage === 0 ? 1 : 1.1 }}
                    whileTap={{ scale: currentPage === 0 ? 1 : 0.9 }}
                    className={`p-2.5 rounded-xl transition-all backdrop-blur-sm ${
                      currentPage === 0 
                        ? 'opacity-30 cursor-not-allowed bg-paper-200/30 dark:bg-ink-800/30' 
                        : 'bg-paper-200/50 dark:bg-ink-800/50 hover:bg-paper-200/80 dark:hover:bg-ink-700/80 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>

                  {/* Page Dots with enhanced design */}
                  <div className="flex gap-3 items-center">
                    {pages.map((_, i) => (
                      <motion.button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="relative"
                      >
                        <motion.div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            i === currentPage 
                              ? 'w-10 bg-gradient-to-r from-frame-green to-frame-green-dark shadow-[0_0_20px_rgba(34,139,34,0.5)]' 
                              : 'w-2 bg-ink-300 dark:bg-ink-600 hover:bg-ink-400 dark:hover:bg-ink-500'
                          }`}
                          layoutId="pageIndicator"
                        />
                      </motion.button>
                    ))}
                  </div>

                  <motion.button
                    onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                    disabled={currentPage === pages.length - 1}
                    whileHover={{ scale: currentPage === pages.length - 1 ? 1 : 1.1 }}
                    whileTap={{ scale: currentPage === pages.length - 1 ? 1 : 0.9 }}
                    className={`p-2.5 rounded-xl transition-all backdrop-blur-sm ${
                      currentPage === pages.length - 1 
                        ? 'opacity-30 cursor-not-allowed bg-paper-200/30 dark:bg-ink-800/30' 
                        : 'bg-paper-200/50 dark:bg-ink-800/50 hover:bg-paper-200/80 dark:hover:bg-ink-700/80 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

                {/* Close button */}
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2.5 rounded-2xl bg-gradient-to-b from-paper-100 to-paper-200 dark:from-ink-800 dark:to-ink-900 border border-ink-200/30 dark:border-white/10 text-ink-700 dark:text-paper-100 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all backdrop-blur-sm group z-50"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close (ESC)"
                  title="Press ESC to close"
                >
                  <X className="w-5 h-5 transition-transform duration-300" />
                </motion.button>
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  )
}