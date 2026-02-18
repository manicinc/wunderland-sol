'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  Bot, Check, ArrowRight, Code2,
  GitBranch, FileText, Network, Sparkles, Play, Search,
  Brain, GraduationCap, Tag
} from 'lucide-react'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

/**
 * TabbedInfoSection - Combined AI Integration, OpenStrand Protocol, and Tutorials
 * Provides smooth tab navigation between related content sections
 */

type TabId = 'ai-agents' | 'openstrand' | 'tutorials'

interface Tab {
  id: TabId
  label: string
  icon: typeof Bot
  description: string
}

const TABS: Tab[] = [
  {
    id: 'ai-agents',
    label: 'Your AI',
    icon: Bot,
    description: 'Use your existing AI tools',
  },
  {
    id: 'openstrand',
    label: 'OpenStrand',
    icon: Code2,
    description: 'The universal schema',
  },
  {
    id: 'tutorials',
    label: 'Learn',
    icon: GraduationCap,
    description: 'Interactive guides',
  },
]

const agents = [
  { name: 'Claude Code', logo: '/claude-icon.svg', desc: 'Anthropic AI assistant' },
  { name: 'Cursor', logo: '/cursor-icon.svg', desc: 'AI-powered editor' },
  { name: 'Gemini CLI', logo: '/gemini-icon.svg', desc: 'Google AI for terminal' },
  { name: 'GitHub Copilot', logo: '/copilot-icon.svg', desc: 'AI pair programmer' },
]

const tutorials = [
  { icon: Play, title: 'Getting Started', desc: 'Navigate your knowledge base', href: '#' },
  { icon: Search, title: 'Semantic Search', desc: 'Find by meaning, not keywords', href: '#' },
  { icon: Tag, title: 'Auto-Tagging', desc: 'Zero manual effort tagging', href: '#' },
  { icon: Network, title: 'Knowledge Graph', desc: 'Visualize connections', href: '#' },
  { icon: FileText, title: 'Creating Notes', desc: 'Create and organize content', href: '#' },
  { icon: Brain, title: 'Flashcards', desc: 'Spaced repetition learning', href: '#' },
]

export function TabbedInfoSection() {
  const [activeTab, setActiveTab] = useState<TabId>('ai-agents')
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const resolvePath = useQuarryPath()

  return (
    <section
      ref={sectionRef}
      id="learn-more"
      className="py-20 px-4 bg-gradient-to-b from-quarry-offwhite to-gray-50 dark:from-quarry-charcoal dark:to-quarry-charcoal-deep"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-3">
            Everything you need to{' '}
            <span className="text-quarry-green-700 dark:text-quarry-green-50">get started</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your notes, your AI tools, your way. No extra subscriptions needed.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex flex-wrap sm:flex-nowrap justify-center rounded-2xl p-1.5 bg-white dark:bg-quarry-charcoal-deep shadow-neuro-sm-light dark:shadow-neuro-sm-dark border border-gray-200/50 dark:border-white/5">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200
                    flex items-center gap-1.5 sm:gap-2
                    ${isActive
                      ? 'text-quarry-charcoal dark:text-quarry-offwhite'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-quarry-green-100 dark:bg-quarry-green-900/30 rounded-xl"
                      transition={{ type: 'spring', duration: 0.4 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-quarry-green-700 dark:text-quarry-green-400' : ''}`} />
                  <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'ai-agents' && (
            <motion.div
              key="ai-agents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AIAgentsContent />
            </motion.div>
          )}
          {activeTab === 'openstrand' && (
            <motion.div
              key="openstrand"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <OpenStrandContent />
            </motion.div>
          )}
          {activeTab === 'tutorials' && (
            <motion.div
              key="tutorials"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TutorialsContent />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

function AIAgentsContent() {
  return (
    <div className="grid lg:grid-cols-2 gap-10 items-center">
      {/* Left: Content */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Your Notes, Your AI.{' '}
          <span className="text-amber-500">No Extra Subscriptions.</span>
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Use the AI tools you already pay for. Claude Code, Cursor, Gemini CLI, and other AI assistants can directly read and edit your knowledge base.
        </p>

        <div className="space-y-3 mb-6">
          {[
            { icon: Check, color: 'emerald', title: 'Local Filesystem Mode', desc: 'Point AI agents directly to your weaves folder' },
            { icon: Check, color: 'cyan', title: 'Schema Documentation', desc: 'Bundled llms.txt explains structure' },
            { icon: Check, color: 'amber', title: 'Automatic Sync', desc: 'Changes appear instantly in Codex' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg bg-${item.color}-500/10`}>
                <item.icon className={`w-4 h-4 text-${item.color}-500`} />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Agent logos */}
        <div className="flex flex-wrap gap-4 mt-6">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{agent.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Terminal mockup */}
      <div className="rounded-2xl overflow-hidden bg-gray-900 dark:bg-black shadow-2xl border border-gray-800">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
          <Bot className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-gray-400 font-mono">claude-code session</span>
        </div>
        <div className="p-5 font-mono text-xs space-y-3">
          <div className="text-gray-500"># Point Claude to your knowledge base</div>
          <div>
            <span className="text-cyan-400">claude&gt;</span>{' '}
            <span className="text-white">Read the llms.txt file at ~/quarry/weaves/</span>
          </div>
          <div className="pl-4 text-gray-400 text-[10px] space-y-0.5">
            <div className="text-emerald-400">✓ Found OpenStrand schema documentation</div>
            <div className="text-emerald-400">✓ Understanding Fabric → Weave → Loom → Strand</div>
            <div className="text-emerald-400">✓ Loaded frontmatter schema reference</div>
          </div>
          <div>
            <span className="text-cyan-400">claude&gt;</span>{' '}
            <span className="text-white">Summarize my authentication notes</span>
          </div>
          <div className="pl-4 text-gray-400 text-[10px]">
            Found 3 strands in auth/:
            <br />• JWT patterns → session management
            <br />• OAuth2 → multi-provider setup
            <br />• RBAC → permission hierarchy...
          </div>
        </div>
      </div>
    </div>
  )
}

function OpenStrandContent() {
  const codeExample = `# OpenStrand Protocol Example
id: "550e8400-e29b-41d4-a716"
slug: "introduction-to-react"
version: "1.0.0"

# AI Agent Instructions
llm:
  tone: "educational"
  detail: "comprehensive"
  agentInstructions:
    traversal: "depth-first"
    citation: "always-source"

# Semantic Relationships
relationships:
  - target: "javascript-basics"
    type: "requires"
  - target: "react-hooks"
    type: "extends"`

  return (
    <div className="grid lg:grid-cols-2 gap-10 items-start">
      {/* Left: Code example */}
      <div className="rounded-2xl overflow-hidden bg-gray-900 dark:bg-black shadow-2xl border border-gray-800">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-gray-400 font-mono">strand.yml</span>
        </div>
        <pre className="p-5 font-mono text-xs text-gray-300 overflow-x-auto">
          {codeExample}
        </pre>
      </div>

      {/* Right: Content */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          The <span className="text-cyan-500">OpenStrand</span> Protocol
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Every Strand is born with the OpenStrand Protocol—a universal schema that makes your content AI-native. It teaches AI agents how to read, understand, and summarize your knowledge.
        </p>

        <div className="space-y-4">
          {[
            { icon: Sparkles, color: 'violet', title: 'AI-First Metadata', desc: 'Define how LLMs interpret, summarize, and present knowledge' },
            { icon: Network, color: 'cyan', title: 'Typed Relationships', desc: 'Define semantic connections like requires, extends, or contradicts' },
            { icon: GitBranch, color: 'emerald', title: 'Version Controlled', desc: 'Full history, branching, and collaborative editing via Git' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-${item.color}-500/10`}>
                <item.icon className={`w-4 h-4 text-${item.color}-500`} />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="https://github.com/framersai/openstrand"
          target="_blank"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Code2 className="w-4 h-4" />
          View OpenStrand on GitHub
        </Link>
      </div>
    </div>
  )
}

function TutorialsContent() {
  const resolvePath = useQuarryPath()

  return (
    <div>
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Learn Everything
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive guided tours help you master every feature
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tutorials.map((tutorial, i) => {
          const Icon = tutorial.icon
          return (
            <Link
              key={i}
              href={tutorial.href}
              className="group p-5 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-quarry-green-500 dark:hover:border-quarry-green-500 transition-all hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-quarry-green-100 dark:bg-quarry-green-900/30 group-hover:bg-quarry-green-200 dark:group-hover:bg-quarry-green-900/50 transition-colors">
                  <Icon className="w-5 h-5 text-quarry-green-700 dark:text-quarry-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{tutorial.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tutorial.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-quarry-green-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          )
        })}
      </div>

      <div className="text-center mt-8">
        <Link
          href={resolvePath('/quarry/app')}
          className="inline-flex items-center gap-2 text-quarry-green-700 dark:text-quarry-green-400 hover:text-quarry-green-600 dark:hover:text-quarry-green-300 font-medium"
        >
          Or explore on your own
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
