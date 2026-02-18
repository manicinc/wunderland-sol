'use client'

import { motion } from 'framer-motion'
import { Cpu, Check, GitBranch, Play } from 'lucide-react'

/**
 * AgentOS Workbench CTA Component
 * Promotes the desktop application for building and managing AgentOS experiences
 */
export function WorkbenchCTA() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-accent-primary)]/30 bg-gradient-to-br from-[var(--color-background-elevated)] to-[var(--color-background-glass)] p-8 sm:p-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--color-accent-primary)]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] shadow-lg">
                    <Cpu className="w-6 h-6 text-white" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                    MIT Licensed
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Open Source
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-[var(--color-text-primary)]">
                  AgentOS Workbench
                </h2>
                <p className="text-[var(--color-text-secondary)] text-lg mb-4">
                  The official desktop application for building, managing, and interacting with AgentOS experiences. 
                  Create powerful AI agents with a visual interface, test in real-time, and deploy anywhere.
                </p>
                <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Visual agent builder with drag-and-drop workflows
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Real-time testing and debugging tools
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    One-click deployment to cloud or local
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-4">
                <a
                  href="https://github.com/framersai/agentos-workbench"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
                >
                  <GitBranch className="w-5 h-5" />
                  View on GitHub
                </a>
                <a
                  href="https://github.com/framersai/agentos-workbench/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold border-2 border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/10 transition-all"
                >
                  <Play className="w-5 h-5" />
                  Download Latest
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
